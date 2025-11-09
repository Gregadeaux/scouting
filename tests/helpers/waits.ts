/**
 * Wait Condition Test Helpers
 *
 * Provides utilities for waiting on specific conditions in E2E tests
 */

import { Page } from '@playwright/test';

/**
 * Wait for an API response matching a URL pattern
 *
 * @param page - Playwright page instance
 * @param urlPattern - URL pattern to match (string or RegExp)
 * @param statusCode - Optional expected status code (default: any 2xx)
 * @returns Promise that resolves with the response
 *
 * @example
 * ```typescript
 * await waitForApiResponse(page, '/api/admin/events');
 * await waitForApiResponse(page, /api\/admin\/teams\/\d+/, 200);
 * ```
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  statusCode?: number
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      const matches = typeof urlPattern === 'string'
        ? url.includes(urlPattern)
        : urlPattern.test(url);

      if (!matches) return false;

      if (statusCode !== undefined) {
        return response.status() === statusCode;
      }

      // Accept any 2xx status code
      return response.status() >= 200 && response.status() < 300;
    },
    { timeout: 10000 }
  );
}

/**
 * Wait for a toast notification to appear
 *
 * @param page - Playwright page instance
 * @param message - Optional expected message (can be partial match)
 * @param timeout - Optional timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when toast appears
 *
 * @example
 * ```typescript
 * await waitForToast(page);
 * await waitForToast(page, 'Successfully saved');
 * await waitForToast(page, 'Error', 3000);
 * ```
 */
export async function waitForToast(
  page: Page,
  message?: string,
  timeout: number = 5000
): Promise<void> {
  let selector = '[role="alert"], .toast, [data-testid="toast"]';

  if (message) {
    selector = `${selector}:has-text("${message}")`;
  }

  await page.locator(selector).waitFor({
    state: 'visible',
    timeout,
  });
}

/**
 * Wait for a specific element to appear
 *
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param timeout - Optional timeout in milliseconds (default: 10000)
 * @returns Promise that resolves when element appears
 *
 * @example
 * ```typescript
 * await waitForElement(page, '.data-table');
 * await waitForElement(page, 'h1:has-text("Events")', 5000);
 * ```
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<void> {
  await page.locator(selector).waitFor({
    state: 'visible',
    timeout,
  });
}

/**
 * Wait for a modal to appear
 *
 * @param page - Playwright page instance
 * @param title - Optional expected modal title
 * @param timeout - Optional timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when modal appears
 *
 * @example
 * ```typescript
 * await waitForModal(page);
 * await waitForModal(page, 'Edit Team');
 * ```
 */
export async function waitForModal(
  page: Page,
  title?: string,
  timeout: number = 5000
): Promise<void> {
  let selector = '[role="dialog"], .modal, [data-testid="modal"]';

  if (title) {
    selector = `${selector}:has-text("${title}")`;
  }

  await page.locator(selector).waitFor({
    state: 'visible',
    timeout,
  });
}

/**
 * Wait for all loading indicators to disappear
 *
 * @param page - Playwright page instance
 * @param timeout - Optional timeout in milliseconds (default: 10000)
 * @returns Promise that resolves when loading is complete
 *
 * @example
 * ```typescript
 * await waitForLoadingToComplete(page);
 * ```
 */
export async function waitForLoadingToComplete(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  const loadingSelectors = [
    '[data-testid="loading"]',
    '.loading',
    '.spinner',
    '[role="progressbar"]',
    '.loading-spinner',
  ];

  for (const selector of loadingSelectors) {
    await page.locator(selector).waitFor({
      state: 'hidden',
      timeout: 1000,
    }).catch(() => {
      // Ignore if selector doesn't exist
    });
  }
}

/**
 * Wait for a table to load data
 * Waits for table body to have at least one row
 *
 * @param page - Playwright page instance
 * @param minRows - Minimum number of rows expected (default: 1)
 * @param timeout - Optional timeout in milliseconds (default: 10000)
 * @returns Promise that resolves when table has data
 *
 * @example
 * ```typescript
 * await waitForTableData(page);
 * await waitForTableData(page, 5); // Wait for at least 5 rows
 * ```
 */
export async function waitForTableData(
  page: Page,
  minRows: number = 1,
  timeout: number = 10000
): Promise<void> {
  await page.waitForFunction(
    (min) => {
      const rows = document.querySelectorAll('table tbody tr');
      return rows.length >= min;
    },
    minRows,
    { timeout }
  );
}

/**
 * Wait for a navigation to complete
 *
 * @param page - Playwright page instance
 * @param expectedUrl - Expected URL pattern (string or RegExp)
 * @param timeout - Optional timeout in milliseconds (default: 10000)
 * @returns Promise that resolves when navigation completes
 *
 * @example
 * ```typescript
 * await waitForNavigation(page, '/admin/events');
 * await waitForNavigation(page, /\/admin\/events\/\d+/);
 * ```
 */
export async function waitForNavigation(
  page: Page,
  expectedUrl: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await page.waitForURL(expectedUrl, { timeout });
}

/**
 * Wait for network to be idle
 *
 * @param page - Playwright page instance
 * @param timeout - Optional timeout in milliseconds (default: 10000)
 * @returns Promise that resolves when network is idle
 *
 * @example
 * ```typescript
 * await waitForNetworkIdle(page);
 * ```
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for a specific timeout
 * Useful for waiting for animations or debounced actions
 *
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after timeout
 *
 * @example
 * ```typescript
 * await wait(1000); // Wait 1 second
 * ```
 */
export async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for element to be stable (not moving/animating)
 *
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param timeout - Optional timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when element is stable
 *
 * @example
 * ```typescript
 * await waitForElementStable(page, '.modal');
 * ```
 */
export async function waitForElementStable(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });

  // Wait for element to stop moving (check position twice with delay)
  let previousBox = await element.boundingBox();
  await wait(100);
  let currentBox = await element.boundingBox();

  const startTime = Date.now();
  while (
    previousBox && currentBox &&
    (previousBox.x !== currentBox.x || previousBox.y !== currentBox.y) &&
    Date.now() - startTime < timeout
  ) {
    await wait(100);
    previousBox = currentBox;
    currentBox = await element.boundingBox();
  }
}

/**
 * Wait for a condition with custom predicate
 *
 * @param page - Playwright page instance
 * @param predicate - Function that returns true when condition is met
 * @param timeout - Optional timeout in milliseconds (default: 10000)
 * @param pollInterval - Optional interval between checks in ms (default: 100)
 * @returns Promise that resolves when condition is met
 *
 * @example
 * ```typescript
 * await waitForCondition(
 *   page,
 *   async () => {
 *     const count = await page.locator('.item').count();
 *     return count > 5;
 *   }
 * );
 * ```
 */
export async function waitForCondition(
  page: Page,
  predicate: () => Promise<boolean>,
  timeout: number = 10000,
  pollInterval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await predicate()) {
      return;
    }
    await wait(pollInterval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}
