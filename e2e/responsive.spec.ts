import { expect, test, type Page } from '@playwright/test';

const RESPONSIVE_ROUTES = [
  '/',
  '/commit-log',
  '/bug-museum',
  '/shelf',
  '/naming',
  '/playground',
  '/delete',
  '/today',
  '/focus',
  '/terminal',
  '/wall',
  '/privacy',
] as const;

function routeToSnapshotKey(route: string): string {
  return route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-');
}

async function stubExternalApisAndPreloader(page: Page) {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem('manifesto_preloader_seen_v1', 'true');
    } catch {
      // Ignore storage restriction
    }
  });

  await page.route('**/api/wall', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'wall-resp-1',
            principle:
              'Write tests that explain why a change broke, not just that it broke.',
            author: 'maya_k',
            country_flag: '🇨🇦',
            author_url: null,
            status: 'approved',
            likes: 12,
            created_at: '2026-11-18T14:20:00Z',
          },
          {
            id: 'wall-resp-2',
            principle:
              'Delete dead flags the same week the migration finishes.',
            author: 'fred',
            country_flag: '🇺🇸',
            author_url: null,
            status: 'approved',
            likes: 7,
            created_at: '2026-11-19T09:10:00Z',
          },
        ],
      }),
    });
  });
}

test.describe('Responsive layout, interaction, a11y & visual snapshot matrix', () => {
  for (const route of RESPONSIVE_ROUTES) {
    test(`[${route}] layout, header, tap targets, focus order, Field Index, reduced-motion, and screenshot`, async ({
      page,
    }, testInfo) => {
      const vp = page.viewportSize();
      const projectLabel = `${testInfo.project.name} (${vp?.width ?? '?'}x${vp?.height ?? '?'})`;

      await stubExternalApisAndPreloader(page);
      await page.goto(route, { waitUntil: 'networkidle' });

      // Wait for page shell (on sub-routes) and primary content heading or main landmark
      if (route !== '/') {
        await expect(page.getByTestId('page-shell')).toBeVisible();
      }
      await expect(page.locator('main').first()).toBeVisible();
      const firstH1 = page.locator('h1').first();
      if ((await firstH1.count()) > 0) {
        await expect(firstH1).toBeVisible();
      }

      // 1. Zero horizontal overflow on any route
      const overflowAudit = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect
        .soft(
          overflowAudit.scrollWidth,
          `${projectLabel} route ${route}: horizontal overflow (${overflowAudit.scrollWidth}px > ${overflowAudit.innerWidth}px)`,
        )
        .toBeLessThanOrEqual(overflowAudit.innerWidth + 1);

      // 2. Active sticky/fixed header never overlaps items inside itself or overlaps the top hero/intro heading
      const headerAudit = await page.evaluate(() => {
        const header =
          document.querySelector<HTMLElement>('[data-testid="pageshell-header"]') ??
          document.querySelector<HTMLElement>('header:not(.pageshell-body header)');
        if (!header) {
          return { found: false, overlapsInsideHeader: [], coversHeading: false };
        }

        const headerRect = header.getBoundingClientRect();
        const visibleButtons = Array.from(
          header.querySelectorAll<HTMLElement>('a, button'),
        ).filter((el) => {
          const s = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return (
            s.display !== 'none' &&
            s.visibility !== 'hidden' &&
            r.width > 0 &&
            r.height > 0
          );
        });

        const overlapsInsideHeader: string[] = [];
        for (let i = 0; i < visibleButtons.length - 1; i++) {
          const a = visibleButtons[i].getBoundingClientRect();
          const b = visibleButtons[i + 1].getBoundingClientRect();
          const verticalOverlap = a.top < b.bottom - 2 && b.top < a.bottom - 2;
          const horizontalOverlap = a.right > b.left + 2 && b.right > a.left + 2;
          if (verticalOverlap && horizontalOverlap) {
            overlapsInsideHeader.push(
              `"${visibleButtons[i].textContent?.trim()}" overlaps "${visibleButtons[i + 1].textContent?.trim()}"`,
            );
          }
        }

        const headingTarget =
          document.querySelector<HTMLElement>('[data-testid="hero-meta-row"]') ??
          document.querySelector<HTMLElement>('[data-testid="pageshell-intro"]') ??
          document.querySelector<HTMLElement>('main h1');
        const headingRect = headingTarget?.getBoundingClientRect();
        const isFixedHeader = window.getComputedStyle(header).position === 'fixed';
        const coversHeading = Boolean(
          isFixedHeader &&
            headingRect &&
            headerRect.bottom > headingRect.top + 4 &&
            headerRect.top <= 4,
        );

        return {
          found: true,
          overlapsInsideHeader,
          coversHeading,
          headerBottom: Math.round(headerRect.bottom),
          targetTop: headingRect ? Math.round(headingRect.top) : null,
        };
      });

      expect
        .soft(
          headerAudit.found,
          `${projectLabel} route ${route}: expected visible header`,
        )
        .toBe(true);
      expect
        .soft(
          headerAudit.overlapsInsideHeader,
          `${projectLabel} route ${route}: header children overlap: ${headerAudit.overlapsInsideHeader.join('; ')}`,
        )
        .toEqual([]);
      expect
        .soft(
          headerAudit.coversHeading,
          `${projectLabel} route ${route}: fixed header bottom (${headerAudit.headerBottom}) overlaps first content (${headerAudit.targetTop})`,
        )
        .toBe(false);

      // 3. Field Index opens and closes cleanly
      const indexTrigger = page
        .locator(
          '[data-testid="field-index-trigger"], [data-testid="pageshell-index-trigger"]',
        )
        .first();
      if ((await indexTrigger.count()) > 0 && (await indexTrigger.isVisible())) {
        await indexTrigger.click();
        const overlay = page.getByTestId('field-index-overlay');
        await expect.soft(overlay, `${projectLabel} route ${route}: Field Index did not open`).toBeVisible();
        await page.keyboard.press('Escape');
        await expect.soft(overlay, `${projectLabel} route ${route}: Field Index did not close on Escape`).toBeHidden();
      }

      // 4. Touch devices: verify all visible interactive tap targets are >= 44x44px
      const isCoarseViewport = Boolean(
        testInfo.project.use.hasTouch ||
          testInfo.project.use.isMobile ||
          (vp && vp.width <= 1024 && testInfo.project.name !== 'laptop-1366x768'),
      );
      if (isCoarseViewport) {
        const undersizedTargets = await page.evaluate(() => {
          const candidates = Array.from(
            document.querySelectorAll<HTMLElement>(
              'a, button, [role="button"], input:not([type="hidden"]), select',
            ),
          );
          const failures: string[] = [];
          for (const el of candidates) {
            const style = window.getComputedStyle(el);
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              el.closest('.sr-only') ||
              el.closest('[aria-hidden="true"]')
            ) {
              continue;
            }
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            // Inline prose links inside paragraphs are exempt per WCAG 2.5.5, check buttons, nav links & controls
            const isInlineProseLink =
              el.tagName === 'A' &&
              Boolean(el.closest('p, li, blockquote')) &&
              !el.closest('header, nav');
            if (isInlineProseLink) continue;

            if (rect.width < 43.5 || rect.height < 43.5) {
              const label =
                el.getAttribute('aria-label') ||
                el.getAttribute('data-testid') ||
                el.textContent?.trim().slice(0, 28) ||
                el.tagName;
              failures.push(
                `${el.tagName.toLowerCase()}[${label}] (${Math.round(rect.width)}x${Math.round(rect.height)})`,
              );
            }
          }
          return failures;
        });

        expect
          .soft(
            undersizedTargets,
            `${projectLabel} route ${route}: tap targets < 44x44px: ${undersizedTargets.slice(0, 8).join(', ')}`,
          )
          .toEqual([]);
      }

      // 5. Logical keyboard focus order across initial focusable controls
      const focusOrderAudit = await page.evaluate(() => {
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => {
          const s = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return (
            s.display !== 'none' &&
            s.visibility !== 'hidden' &&
            r.width > 0 &&
            r.height > 0 &&
            !el.hasAttribute('aria-hidden')
          );
        });

        const positiveTabIndexes = focusable
          .filter((el) => el.tabIndex > 0)
          .map((el) => el.tagName + ':' + el.tabIndex);

        const jumps: string[] = [];
        for (let i = 1; i < Math.min(focusable.length, 15); i++) {
          const prev = focusable[i - 1].getBoundingClientRect();
          const curr = focusable[i].getBoundingClientRect();
          // Flag large backwards upward jump outside separate landmarks
          if (
            curr.top + 180 < prev.top &&
            !focusable[i].closest('aside, nav')
          ) {
            jumps.push(
              `idx ${i - 1}->${i}: ${Math.round(prev.top)} -> ${Math.round(curr.top)}`,
            );
          }
        }
        return { positiveTabIndexes, jumps };
      });

      expect
        .soft(
          focusOrderAudit.positiveTabIndexes,
          `${projectLabel} route ${route}: positive tabindex breaks DOM focus order`,
        )
        .toEqual([]);
      expect
        .soft(
          focusOrderAudit.jumps,
          `${projectLabel} route ${route}: illogical vertical focus jumps: ${focusOrderAudit.jumps.join('; ')}`,
        )
        .toEqual([]);

      // 6. Reduced motion is respected cleanly (duration tokens drop to ~0ms, animations disabled)
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const reducedCheck = await page.evaluate(() => {
        const rootStyle = window.getComputedStyle(document.documentElement);
        return {
          matchesQuery: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches,
          durationFast: rootStyle.getPropertyValue('--duration-fast').trim(),
        };
      });
      expect
        .soft(
          reducedCheck.matchesQuery,
          `${projectLabel} route ${route}: prefers-reduced-motion media query active`,
        )
        .toBe(true);
      expect
        .soft(
          reducedCheck.durationFast,
          `${projectLabel} route ${route}: expected --duration-fast to reduce to 0.01ms`,
        )
        .toMatch(/^(0?\.01ms|0s)$/);
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      // 7. Screenshot comparison per route & breakpoint (pause animations cleanly before capture)
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect
        .soft(
          page,
          `${projectLabel} route ${route}: screenshot mismatch`,
        )
        .toHaveScreenshot(
          `${testInfo.project.name}--${routeToSnapshotKey(route)}.png`,
          {
            fullPage: false,
            animations: 'disabled',
            maxDiffPixelRatio: 0.04,
          },
        );
    });
  }
});
