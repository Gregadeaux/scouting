/**
 * Global E2E Test Setup and Fixtures
 *
 * This file contains global setup/teardown and custom fixtures
 * for Playwright E2E tests.
 */

import { test as base, expect, Page } from '@playwright/test';
import { loginAsAdmin, clearStorage } from './helpers/auth';

/**
 * Custom test fixtures that extend Playwright's base test
 *
 * Available fixtures:
 * - authenticatedPage: Page with admin user already logged in
 */
type CustomFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<CustomFixtures>({
  /**
   * Authenticated page fixture
   * Automatically logs in as admin before each test
   *
   * @example
   * ```typescript
   * test('admin feature', async ({ authenticatedPage }) => {
   *   // Already logged in as admin
   *   await authenticatedPage.goto('/admin/events');
   * });
   * ```
   */
  authenticatedPage: async ({ page }, use) => {
    // Login before the test
    await loginAsAdmin(page);

    // Provide the authenticated page to the test
    await use(page);

    // Cleanup after the test (optional)
    await clearStorage(page);
  },
});

// Re-export expect for convenience
export { expect };

/**
 * Global test configuration
 */
export const TEST_CONFIG = {
  // Default timeouts
  timeouts: {
    short: 5000,
    medium: 10000,
    long: 30000,
  },

  // Test data
  testData: {
    // Sample event data
    event: {
      name: 'E2E Test Event',
      key: 'e2e-test-event',
      year: 2025,
      startDate: '2025-03-01',
      endDate: '2025-03-03',
    },

    // Sample team data
    team: {
      number: 9999,
      nickname: 'E2E Test Team',
      name: 'E2E Test Team Name',
      city: 'Test City',
      state: 'CA',
      country: 'USA',
    },
  },
} as const;

/**
 * Helper to generate unique test data
 * Useful for creating unique entities that won't conflict with existing data
 *
 * @param prefix - Prefix for the unique value
 * @returns Unique string with timestamp
 */
export function generateUniqueTestData(prefix: string): string {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}`;
}

/**
 * Helper to wait for API response
 *
 * @param page - Playwright page object
 * @param urlPattern - URL pattern to wait for
 * @param method - HTTP method (GET, POST, etc.)
 * @returns Promise that resolves with the response
 */
export async function waitForApiResponse(
  page: any,
  urlPattern: string | RegExp,
  method: string = 'GET'
) {
  return page.waitForResponse(
    (response: any) =>
      response.url().includes(urlPattern) && response.request().method() === method
  );
}

/**
 * Helper to wait for navigation and network idle
 *
 * @param page - Playwright page object
 * @param url - URL to navigate to
 */
export async function navigateAndWait(page: any, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/**
 * Helper to check if element is in viewport
 *
 * @param page - Playwright page object
 * @param selector - CSS selector
 * @returns Promise<boolean> - true if element is in viewport
 */
export async function isInViewport(page: any, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((element: Element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  });
}
