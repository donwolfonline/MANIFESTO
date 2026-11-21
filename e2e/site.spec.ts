import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './a11y';

const ALL_ROUTES: { path: string; expectedHeading: RegExp }[] = [
  { path: '/', expectedHeading: /working_copy\.md/i },
  { path: '/terminal', expectedHeading: /\/terminal|working_copy/i },
  { path: '/bug-museum', expectedHeading: /bug museum/i },
  { path: '/commit-log', expectedHeading: /commit/i },
  { path: '/delete', expectedHeading: /delete|deleting/i },
  { path: '/playground', expectedHeading: /generative playground/i },
  { path: '/wall', expectedHeading: /engineer’s wall/i },
  { path: '/admin', expectedHeading: /moderation|admin/i },
  { path: '/shelf', expectedHeading: /shelf|bookshelf/i },
  { path: '/today', expectedHeading: /.+/i },
  { path: '/focus', expectedHeading: /quiet focus room/i },
  { path: '/naming', expectedHeading: /name things for 2am/i },
  { path: '/privacy', expectedHeading: /privacy notes/i },
  {
    path: '/notes/principles/write-the-pull-request-description-before-hitting-submit',
    expectedHeading: /write the pull request description/i,
  },
];

function attachErrorCollector(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  return { consoleErrors, pageErrors };
}

test.describe('Core site flows & accessibility', () => {
  test('home page loads, "Skip to the text" works, and passes axe-core', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachErrorCollector(page);

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const skipLink = page.getByRole('link', { name: 'Skip to the text' }).first();
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
    await skipLink.press('Enter');

    await expect(page).toHaveURL(/#read$/);
    await expect(page.locator('#read')).toBeInViewport();

    await expectNoSeriousA11yViolations(page, '/');
    expect(consoleErrors, `Console errors on /: ${consoleErrors.join('; ')}`).toEqual([]);
    expect(pageErrors, `Page errors on /: ${pageErrors.join('; ')}`).toEqual([]);
  });

  for (const route of ALL_ROUTES) {
    test(`route ${route.path} renders without console errors and passes axe-core`, async ({
      page,
    }) => {
      const { consoleErrors, pageErrors } = attachErrorCollector(page);

      // Stub serverless /api/wall when previewing static dist/ so the browser does not log a 404
      if (route.path === '/wall') {
        await page.route('**/api/wall', async (reqRoute) => {
          await reqRoute.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: [
                {
                  id: 'e2e-wall-1',
                  principle:
                    'Write tests that explain why a change broke, not just that it broke.',
                  author: 'maya_k',
                  country_flag: '🇨🇦',
                  author_url: null,
                  status: 'approved',
                  likes: 12,
                  created_at: '2026-11-18T14:20:00Z',
                },
              ],
            }),
          });
        });
      }

      await page.goto(route.path);
      await expect(page.locator('main')).toBeVisible();

      // Wait briefly for lazy routes & first paint to settle before axe audit
      const h1 = page.getByRole('heading', { level: 1 }).first();
      if ((await h1.count()) > 0) {
        await expect(h1).toBeVisible();
      }

      await expectNoSeriousA11yViolations(page, route.path);

      expect(
        consoleErrors,
        `Console errors on ${route.path}: ${consoleErrors.join('; ')}`,
      ).toEqual([]);
      expect(
        pageErrors,
        `Uncaught page errors on ${route.path}: ${pageErrors.join('; ')}`,
      ).toEqual([]);
    });
  }

  test('terminal accepts a command and renders output', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorCollector(page);

    await page.goto('/terminal');
    const input = page.getByRole('textbox', { name: /terminal command input/i });
    await expect(input).toBeVisible();

    await input.fill('whoami');
    await input.press('Enter');

    await expect(
      page.getByRole('log', { name: /terminal output/i }),
    ).toContainText('working-engineer (uid=1000)');

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('command palette opens with Cmd/Ctrl+K and jumps to a page', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachErrorCollector(page);

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.keyboard.press('ControlOrMeta+k');

    const dialog = page.getByRole('dialog', { name: /command palette/i });
    await expect(dialog).toBeVisible();

    const combobox = dialog.getByRole('combobox');
    await combobox.fill('shelf');
    await combobox.press('Enter');

    await expect(page).toHaveURL(/\/shelf$/);
    await expect(dialog).toBeHidden();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Wall submission shows a pending message', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorCollector(page);

    await page.route('**/api/wall', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Received—pending moderation before appearing publicly.',
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    });

    await page.goto('/wall');
    await page
      .getByLabel(/your one-line principle/i)
      .fill('Write tests that explain why a change broke, not just that it broke.');
    await page.getByLabel(/name or handle/i).fill('playwright_runner');
    await page.getByRole('button', { name: /submit note/i }).click();

    await expect(page.getByRole('status')).toContainText(/pending/i);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('404 page appears for a bad URL, passes axe-core, and returns home', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachErrorCollector(page);

    await page.goto('/this-principle-does-not-exist');
    await expect(
      page.getByRole('heading', { level: 1, name: /error: principle not found/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('region', { name: /random principle/i }),
    ).toBeVisible();

    await expectNoSeriousA11yViolations(page, '/this-principle-does-not-exist');

    await page.getByRole('button', { name: /go home/i }).click();
    await expect(page).toHaveURL(/\/$/);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('reading mode hides chrome and Night, Paper, and Sepia themes all pass axe-core contrast checks', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachErrorCollector(page);

    await page.goto(
      '/notes/principles/write-the-pull-request-description-before-hitting-submit',
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const toggle = page.getByRole('switch', { name: /reading mode/i });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    for (const themeName of ['Paper', 'Sepia', 'Night']) {
      await page
        .getByRole('group', { name: /reading color theme/i })
        .getByRole('button', { name: themeName, exact: true })
        .click();
      await expectNoSeriousA11yViolations(
        page,
        `/notes/principles (theme=${themeName})`,
      );
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('PWA manifest, icons, service worker, offline fallback page, and update toast work and pass axe-core', async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachErrorCollector(page);

    // 1. Web App Manifest & Icons
    const manifestRes = await page.request.get('/manifest.webmanifest');
    expect(manifestRes.status()).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.name).toContain('WORKING_COPY.md');
    expect(manifest.short_name).toBe('WORKING_COPY');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

    for (const icon of manifest.icons) {
      const iconRes = await page.request.get(icon.src);
      expect(iconRes.status(), `Icon ${icon.src} should return 200`).toBe(200);
    }

    // 2. Service Worker registration & Update Available toast
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg.active?.scriptURL.endsWith('/sw.js'));
    });
    expect(swRegistered).toBe(true);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('pwa:update-available', {
          detail: { versionLabel: 'v1.0.2-e2e' },
        }),
      );
    });

    const toast = page.getByRole('status', {
      name: /service worker update available/i,
    });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('v1.0.2-e2e');
    await expectNoSeriousA11yViolations(page, '/ (with PWA update toast)');

    await toast.getByRole('button', { name: /later/i }).click();
    await expect(toast).toBeHidden();

    // 3. Offline fallback page styled like the 404 page
    await page.goto('/offline.html');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /error: network connection offline/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('region', { name: /random principle/i }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page, '/offline.html');

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
