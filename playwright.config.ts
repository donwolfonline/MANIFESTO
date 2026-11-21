import { defineConfig, devices } from '@playwright/test';

export const RESPONSIVE_PROJECT_NAMES = [
  'iphone-se',
  'iphone-15',
  'pixel-7',
  'galaxy-fold-unfolded',
  'ipad-mini',
  'ipad-pro-landscape',
  'laptop-1366x768',
  'desktop-1920x1080',
  'desktop-2560x1440',
] as const;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/playwright-report.json' }],
    ['html', { open: 'never' }],
  ],
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    reducedMotion: 'no-preference',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    /* Core cross-engine E2E specs */
    {
      name: 'chromium',
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
    },
    {
      name: 'firefox',
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices['Desktop Firefox'], reducedMotion: 'reduce' },
    },
    {
      name: 'webkit',
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices['Desktop Safari'], reducedMotion: 'reduce' },
    },

    /* 9 Responsive Device & Viewport Projects */
    {
      name: 'iphone-se',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['iPhone SE (3rd gen)'],
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'iphone-15',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['iPhone 15'],
        viewport: { width: 393, height: 852 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'pixel-7',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'galaxy-fold-unfolded',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['Galaxy Z Fold 6'],
        hasTouch: true,
      },
    },
    {
      name: 'ipad-mini',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['iPad Mini'],
      },
    },
    {
      name: 'ipad-pro-landscape',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['iPad Pro 11 landscape'],
      },
    },
    {
      name: 'laptop-1366x768',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: 'desktop-1920x1080',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'desktop-2560x1440',
      testMatch: /responsive\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
      },
    },
  ],
});
