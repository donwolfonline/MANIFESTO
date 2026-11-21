import { spawn } from 'node:child_process';
import http from 'node:http';
import { chromium } from '@playwright/test';

const PORT = 4176;
const ORIGIN = `http://127.0.0.1:${PORT}`;

function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server returned ${res.statusCode}`));
        } else {
          setTimeout(check, 250);
        }
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(
            new Error(
              `Preview server did not respond at ${url} within ${timeoutMs}ms`,
            ),
          );
        } else {
          setTimeout(check, 250);
        }
      });
    };
    check();
  });
}

async function run() {
  const server = spawn(
    'npx',
    [
      'vite',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(PORT),
      '--strictPort',
    ],
    { stdio: 'ignore', shell: process.platform === 'win32' },
  );

  try {
    await waitForServer(`${ORIGIN}/`);
    const browser = await chromium.launch({ headless: true });

    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      await page.goto(`${ORIGIN}/`, { waitUntil: 'networkidle' });

      // Ensure Service Worker is active and controlling the page
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      // Reload once so navigator.serviceWorker.controller is active for all fetches
      await page.reload({ waitUntil: 'networkidle' });

      // 1. Chromium / Lighthouse PWA Manifest & Installability Audit via CDP
      const [{ url: manifestUrl, errors: manifestParseErrors, data: rawManifest }, { installabilityErrors }] =
        await Promise.all([
          cdp.send('Page.getAppManifest'),
          cdp.send('Page.getInstallabilityErrors'),
        ]);

      const parsedManifest = rawManifest ? JSON.parse(rawManifest) : null;

      // 2. Check HTML meta tags required by Lighthouse PWA / Mobile audits
      const metaAudit = await page.evaluate(() => {
        const doc = globalThis.document;
        const themeColor = doc
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute('content');
        const viewport = doc
          .querySelector('meta[name="viewport"]')
          ?.getAttribute('content');
        const appleTouchIcon = doc
          .querySelector('link[rel="apple-touch-icon"]')
          ?.getAttribute('href');
        const hasController = Boolean(navigator.serviceWorker?.controller);
        return { themeColor, viewport, appleTouchIcon, hasController };
      });

      // 3. Check Cache Storage (Static cache-first + Content network-first)
      const cacheReport = await page.evaluate(async () => {
        const cacheStorage = globalThis.caches;
        const keys = await cacheStorage.keys();
        const staticCacheKey = keys.find((k) => k.includes('static'));
        const contentCacheKey = keys.find((k) => k.includes('content'));

        const staticEntries = staticCacheKey
          ? (await (await cacheStorage.open(staticCacheKey)).keys()).map(
              (r) => new URL(r.url).pathname,
            )
          : [];
        const contentEntries = contentCacheKey
          ? (await (await cacheStorage.open(contentCacheKey)).keys()).map(
              (r) => new URL(r.url).pathname,
            )
          : [];

        return {
          keys,
          staticCount: staticEntries.length,
          contentCount: contentEntries.length,
          hasOfflineHtml: staticEntries.includes('/offline.html'),
          hasIcons:
            staticEntries.includes('/icons/icon-192.png') &&
            staticEntries.includes('/icons/icon-512.png'),
          hasHashedBundle: staticEntries.some((p) => p.startsWith('/assets/')),
          hasRootContent: contentEntries.includes('/'),
        };
      });

      // 4. Test Offline Mode:
      //    a) Uncached navigation falls back to /offline.html (styled like 404)
      await context.setOffline(true);
      await page.goto(`${ORIGIN}/unvisited-route-while-offline`, {
        waitUntil: 'domcontentloaded',
      });
      const offlineHeading = await page
        .getByRole('heading', { level: 1 })
        .textContent();
      const offlinePrincipleVisible = await page
        .getByRole('region', { name: /random principle/i })
        .isVisible();

      //    b) Cached home page (/) still loads offline from Service Worker cache
      await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded' });
      const cachedHomeLoadedOffline = await page.evaluate(() =>
        Boolean(globalThis.document.querySelector('#root')),
      );

      await context.setOffline(false);

      const report = {
        manifestUrl,
        shortName: parsedManifest?.short_name,
        display: parsedManifest?.display,
        iconCount: parsedManifest?.icons?.length ?? 0,
        hasMaskableIcon: Boolean(
          parsedManifest?.icons?.some((i) => i.purpose === 'maskable'),
        ),
        manifestParseErrors,
        installabilityErrors,
        metaAudit,
        cacheReport,
        offlineFallback: {
          heading: offlineHeading?.trim(),
          randomPrincipleCardVisible: offlinePrincipleVisible,
          cachedHomeLoadedOffline,
        },
      };

      console.log('\n=== Lighthouse & Chromium PWA Verification Report ===');
      console.log(JSON.stringify(report, null, 2));

      const failures = [];
      if (!manifestUrl.endsWith('/manifest.webmanifest')) {
        failures.push('Manifest URL not linked at /manifest.webmanifest');
      }
      if (manifestParseErrors.length > 0) {
        failures.push(
          `Manifest parse errors: ${JSON.stringify(manifestParseErrors)}`,
        );
      }
      if (installabilityErrors.length > 0) {
        failures.push(
          `Chromium PWA installability errors: ${JSON.stringify(installabilityErrors)}`,
        );
      }
      if (!metaAudit.hasController) {
        failures.push('Service Worker is not controlling the page');
      }
      if (metaAudit.themeColor !== '#201e1f') {
        failures.push(`Expected theme-color #201e1f, got ${metaAudit.themeColor}`);
      }
      if (!metaAudit.appleTouchIcon) {
        failures.push('Missing apple-touch-icon link');
      }
      if (!cacheReport.hasOfflineHtml || !cacheReport.hasHashedBundle) {
        failures.push(
          'Static cache missing precached /offline.html or cache-first /assets/* bundle',
        );
      }
      if (!cacheReport.hasRootContent) {
        failures.push('Network-first content cache did not store / document');
      }
      if (
        !offlineHeading?.toLowerCase().includes('network connection offline') ||
        !offlinePrincipleVisible
      ) {
        failures.push('Offline fallback page did not render 404-styled view');
      }
      if (!cachedHomeLoadedOffline) {
        failures.push('Cached home route failed to load while offline');
      }

      if (failures.length > 0) {
        console.error('\n✗ PWA verification failed:');
        for (const f of failures) console.error(`  - ${f}`);
        process.exitCode = 1;
      } else {
        console.log(
          '\n✓ All Lighthouse & Chromium PWA installability, cache-first, network-first, and offline checks passed.',
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
