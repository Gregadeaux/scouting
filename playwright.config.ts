import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced Playwright Configuration for E2E Testing
 *
 * Features:
 * - Multi-browser support (Chrome, Firefox, Safari)
 * - Video recording on failure
 * - Screenshots on failure
 * - JSON reporter for CI
 * - Trace collection on retry
 * - Parallel execution optimization
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // E2E tests directory
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only - 2 retries for flaky test resilience */
  retries: process.env.CI ? 2 : 0,

  /* Configure parallel execution */
  workers: process.env.CI ? 2 : undefined, // 2 workers in CI for faster execution

  /* Maximum time one test can run for */
  timeout: 30 * 1000, // 30 seconds per test

  /* Maximum time expect() should wait for the condition to be met */
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },

  /* Reporter configuration - HTML for local, JSON for CI */
  reporter: process.env.CI
    ? [
        ['json', { outputFile: 'playwright-report/results.json' }],
        ['html', { open: 'never' }],
        ['list'],
      ]
    : [
        ['html', { open: 'on-failure' }],
        ['list'],
      ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Record video only on failure to save disk space */
    video: 'retain-on-failure',

    /* Take screenshots only on failure */
    screenshot: 'only-on-failure',

    /* Maximum time for actions like click, fill, etc. */
    actionTimeout: 10 * 1000,

    /* Maximum time for page.goto() */
    navigationTimeout: 30 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    /* Mobile testing configurations (optional - uncomment to enable) */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 13'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // Use dev:pwa for E2E tests to enable service worker in development
    command: 'npm run dev:pwa',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore', // Don't log dev server output during tests
    stderr: 'pipe', // Show only errors
    env: {
      ENABLE_PWA_DEV: 'true',
    },
  },
});
