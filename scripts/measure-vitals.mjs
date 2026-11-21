/* global window, document -- referenced inside page.evaluate / addInitScript callbacks */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const PORT = 4174;
const TARGET_URL = process.env.VITALS_URL || `http://127.0.0.1:${PORT}/`;
const ASSERT_BUDGETS = process.argv.includes('--assert');

const TARGETS = {
  lcpMs: 2000,
  cls: 0.05,
  inpMs: 200,
};

async function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Wait for preview server
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Preview server did not respond at ${url} within ${timeoutMs}ms`);
}

async function run() {
  let serverProc = null;
  if (!process.env.VITALS_URL) {
    serverProc = spawn(
      'npx',
      ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
      { stdio: 'ignore' },
    );
    await waitForServer(TARGET_URL);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'no-preference',
    });

    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    // Mid-range mobile profile: 4x CPU slowdown + Slow 4G (1.6 Mbps / 750 Kbps / 150ms RTT)
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    let externalFontRequests = 0;
    let totalTransferBytes = 0;
    const resources = [];

    cdp.on('Network.responseReceived', (evt) => {
      const url = evt.response.url;
      if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
        externalFontRequests += 1;
      }
      resources.push({
        url,
        type: evt.type,
        status: evt.response.status,
      });
    });

    cdp.on('Network.loadingFinished', (evt) => {
      totalTransferBytes += evt.encodedDataLength || 0;
    });

    await page.addInitScript(() => {
      window.__vitals = {
        lcp: 0,
        lcpElement: '',
        cls: 0,
        interactions: [],
      };

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__vitals.lcp = entry.startTime;
          const el = entry.element;
          window.__vitals.lcpElement = el
            ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`
            : 'unknown';
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__vitals.cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId && entry.interactionId > 0) {
            window.__vitals.interactions.push({
              name: entry.name,
              duration: entry.duration,
              interactionId: entry.interactionId,
            });
          }
        }
      }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    });

    await page.goto(TARGET_URL, { waitUntil: 'load' });
    // Wait for fonts & initial entrance choreography to settle so LCP/CLS are captured completely
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(2200);

    // Trigger real interactive taps to measure INP (open field index, close it, open/close command palette)
    const indexBtn = page.getByRole('button', { name: /field index/i });
    const btnBox = await indexBtn.boundingBox();
    if (btnBox && btnBox.x + btnBox.width <= 395 && btnBox.y >= 0) {
      await indexBtn.click();
      await page.waitForTimeout(350);
      const closeBtn = page.getByRole('button', { name: /close \[esc\]/i });
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    } else {
      // Fallback tap if header button is off-viewport on narrow screens
      await page.getByRole('link', { name: 'Skip to the text' }).last().click();
      await page.waitForTimeout(300);
    }

    // Trigger a keyboard interaction (open + close command palette)
    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForTimeout(350);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const vitals = await page.evaluate(() => {
      const grouped = new Map();
      for (const item of window.__vitals.interactions) {
        const prev = grouped.get(item.interactionId) || 0;
        if (item.duration > prev) grouped.set(item.interactionId, item.duration);
      }
      const durations = Array.from(grouped.values()).sort((a, b) => b - a);
      return {
        lcpMs: Math.round(window.__vitals.lcp),
        lcpElement: window.__vitals.lcpElement,
        cls: Number(window.__vitals.cls.toFixed(4)),
        inpMs: Math.round(durations[0] ?? 0),
        interactionCount: durations.length,
      };
    });

    const summary = {
      url: TARGET_URL,
      profile: 'Mid-range Mobile (390x844, 4x CPU, Slow 4G 1.6Mbps / 150ms RTT, cold cache)',
      ...vitals,
      totalTransferKb: Number((totalTransferBytes / 1024).toFixed(1)),
      externalFontRequests,
    };

    console.log('\n=== Mid-Range Mobile Web Vitals ===');
    console.log(JSON.stringify(summary, null, 2));

    if (ASSERT_BUDGETS) {
      const failures = [];
      if (vitals.lcpMs >= TARGETS.lcpMs) {
        failures.push(`LCP ${vitals.lcpMs}ms >= target ${TARGETS.lcpMs}ms`);
      }
      if (vitals.cls >= TARGETS.cls) {
        failures.push(`CLS ${vitals.cls} >= target ${TARGETS.cls}`);
      }
      if (vitals.inpMs >= TARGETS.inpMs) {
        failures.push(`INP ${vitals.inpMs}ms >= target ${TARGETS.inpMs}ms`);
      }
      if (failures.length > 0) {
        console.error('\n✗ Performance budget failed:\n  - ' + failures.join('\n  - '));
        process.exitCode = 1;
      } else {
        console.log('\n✓ All Core Web Vitals within target budgets (LCP < 2.0s, CLS < 0.05, INP < 200ms).');
      }
    }
  } finally {
    await browser.close();
    if (serverProc) {
      serverProc.kill('SIGTERM');
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
