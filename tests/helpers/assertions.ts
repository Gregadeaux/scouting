/**
 * Assertion Test Helpers
 *
 * Provides custom assertion utilities for E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Expect page URL to match a pattern
 *
 * @param page - Playwright page instance
 * @param url - Expected URL (string or RegExp)
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectUrl(page, '/admin/events');
 * await expectUrl(page, /\/admin\/events\/\d+/);
 * ```
 */
export async function expectUrl(page: Page, url: string | RegExp): Promise<void> {
  await expect(page).toHaveURL(url);
}

/**
 * Expect user to be authenticated
 * Checks for auth indicators in the page
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectAuthenticated(page);
 * ```
 */
export async function expectAuthenticated(page: Page): Promise<void> {
  // Check for authenticated user indicators
  const hasAuthIndicator = await page.evaluate(() => {
    // Check for Supabase auth in localStorage
    const authData = localStorage.getItem('supabase.auth.token');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return !!parsed.currentSession?.access_token;
      } catch {
        return false;
      }
    }

    // Check for auth cookie
    return document.cookie.includes('sb-access-token') ||
           document.cookie.includes('supabase-auth-token');
  });

  expect(hasAuthIndicator).toBe(true);

  // Also check that we're not on login/signup pages
  const currentUrl = page.url();
  expect(currentUrl).not.toMatch(/\/auth\/(login|signup)/);
}

/**
 * Expect user to NOT be authenticated
 * Checks that no auth indicators exist
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectUnauthenticated(page);
 * ```
 */
export async function expectUnauthenticated(page: Page): Promise<void> {
  const hasAuthIndicator = await page.evaluate(() => {
    // Check for Supabase auth in localStorage
    const authData = localStorage.getItem('supabase.auth.token');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return !!parsed.currentSession?.access_token;
      } catch {
        return false;
      }
    }

    // Check for auth cookie
    return document.cookie.includes('sb-access-token') ||
           document.cookie.includes('supabase-auth-token');
  });

  expect(hasAuthIndicator).toBe(false);
}

/**
 * Expect toast message to be visible
 *
 * @param page - Playwright page instance
 * @param message - Expected toast message (can be partial match)
 * @param type - Optional toast type ('success', 'error', 'info', 'warning')
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectToastMessage(page, 'Successfully saved');
 * await expectToastMessage(page, 'Error occurred', 'error');
 * ```
 */
export async function expectToastMessage(
  page: Page,
  message: string,
  type?: 'success' | 'error' | 'info' | 'warning'
): Promise<void> {
  let selector = '[role="alert"], .toast, [data-testid="toast"]';

  if (type) {
    selector = `${selector}[data-type="${type}"], ${selector}.toast-${type}`;
  }

  const toast = page.locator(`${selector}:has-text("${message}")`);
  await expect(toast).toBeVisible({ timeout: 5000 });
}

/**
 * Expect element to be visible
 *
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param timeout - Optional timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectElementVisible(page, '.data-table');
 * await expectElementVisible(page, 'h1:has-text("Events")', 10000);
 * ```
 */
export async function expectElementVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

/**
 * Expect element to have specific text
 *
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param text - Expected text (can be RegExp)
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectElementText(page, 'h1', 'Events');
 * await expectElementText(page, '.error', /email is required/i);
 * ```
 */
export async function expectElementText(
  page: Page,
  selector: string,
  text: string | RegExp
): Promise<void> {
  await expect(page.locator(selector)).toHaveText(text);
}

/**
 * Expect table to have specific number of rows
 *
 * @param page - Playwright page instance
 * @param count - Expected row count (can be object with min/max)
 * @param tableSelector - Optional table selector (default: 'table tbody tr')
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectTableRowCount(page, 5);
 * await expectTableRowCount(page, { min: 1, max: 10 });
 * await expectTableRowCount(page, 3, '#events-table tbody tr');
 * ```
 */
export async function expectTableRowCount(
  page: Page,
  count: number | { min?: number; max?: number },
  tableSelector: string = 'table tbody tr'
): Promise<void> {
  const rows = page.locator(tableSelector);

  if (typeof count === 'number') {
    await expect(rows).toHaveCount(count);
  } else {
    const actualCount = await rows.count();

    if (count.min !== undefined) {
      expect(actualCount).toBeGreaterThanOrEqual(count.min);
    }

    if (count.max !== undefined) {
      expect(actualCount).toBeLessThanOrEqual(count.max);
    }
  }
}

/**
 * Expect form field to have specific value
 *
 * @param page - Playwright page instance
 * @param fieldName - Field name
 * @param value - Expected value
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectFormFieldValue(page, 'email', 'user@example.com');
 * ```
 */
export async function expectFormFieldValue(
  page: Page,
  fieldName: string,
  value: string
): Promise<void> {
  const input = page.locator(`input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`);
  await expect(input).toHaveValue(value);
}

/**
 * Expect element to have specific attribute
 *
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param attribute - Attribute name
 * @param value - Expected attribute value (can be RegExp)
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectElementAttribute(page, 'button', 'disabled', '');
 * await expectElementAttribute(page, 'a', 'href', '/admin');
 * ```
 */
export async function expectElementAttribute(
  page: Page,
  selector: string,
  attribute: string,
  value: string | RegExp
): Promise<void> {
  await expect(page.locator(selector)).toHaveAttribute(attribute, value);
}

/**
 * Expect element to be enabled
 *
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectElementEnabled(page, 'button[type="submit"]');
 * ```
 */
export async function expectElementEnabled(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeEnabled();
}

/**
 * Expect element to be disabled
 *
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectElementDisabled(page, 'button[type="submit"]');
 * ```
 */
export async function expectElementDisabled(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeDisabled();
}

/**
 * Expect element to have specific CSS class
 *
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param className - Expected class name
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectElementHasClass(page, '.button', 'active');
 * ```
 */
export async function expectElementHasClass(
  page: Page,
  selector: string,
  className: string
): Promise<void> {
  await expect(page.locator(selector)).toHaveClass(new RegExp(className));
}

/**
 * Expect element count to match
 *
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param count - Expected count (can be object with min/max)
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectElementCount(page, '.item', 5);
 * await expectElementCount(page, '.item', { min: 1, max: 10 });
 * ```
 */
export async function expectElementCount(
  page: Page,
  selector: string,
  count: number | { min?: number; max?: number }
): Promise<void> {
  const elements = page.locator(selector);

  if (typeof count === 'number') {
    await expect(elements).toHaveCount(count);
  } else {
    const actualCount = await elements.count();

    if (count.min !== undefined) {
      expect(actualCount).toBeGreaterThanOrEqual(count.min);
    }

    if (count.max !== undefined) {
      expect(actualCount).toBeLessThanOrEqual(count.max);
    }
  }
}

/**
 * Expect checkbox to be checked
 *
 * @param page - Playwright page instance
 * @param fieldName - Checkbox field name
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectCheckboxChecked(page, 'left_starting_zone');
 * ```
 */
export async function expectCheckboxChecked(
  page: Page,
  fieldName: string
): Promise<void> {
  const checkbox = page.locator(`input[type="checkbox"][name="${fieldName}"]`);
  await expect(checkbox).toBeChecked();
}

/**
 * Expect checkbox to NOT be checked
 *
 * @param page - Playwright page instance
 * @param fieldName - Checkbox field name
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectCheckboxUnchecked(page, 'left_starting_zone');
 * ```
 */
export async function expectCheckboxUnchecked(
  page: Page,
  fieldName: string
): Promise<void> {
  const checkbox = page.locator(`input[type="checkbox"][name="${fieldName}"]`);
  await expect(checkbox).not.toBeChecked();
}

/**
 * Expect page title to match
 *
 * @param page - Playwright page instance
 * @param title - Expected title (can be RegExp)
 * @returns Promise that resolves when assertion passes
 *
 * @example
 * ```typescript
 * await expectPageTitle(page, 'FRC Scouting - Events');
 * await expectPageTitle(page, /Events/);
 * ```
 */
export async function expectPageTitle(
  page: Page,
  title: string | RegExp
): Promise<void> {
  await expect(page).toHaveTitle(title);
}
