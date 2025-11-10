/**
 * Authentication Helpers for E2E Tests
 *
 * Provides reusable authentication utilities for Playwright tests.
 * Handles login, logout, and session management.
 */

import { Page, expect } from '@playwright/test';

/**
 * Test credentials for admin user
 * Loaded from environment variables (.env.test)
 *
 * Setup: Copy .env.test.example to .env.test and update with actual credentials
 */
export const TEST_CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
} as const;

/**
 * Login as admin user
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when login is complete
 *
 * @example
 * ```typescript
 * test('admin dashboard', async ({ page }) => {
 *   await loginAsAdmin(page);
 *   // Now on admin dashboard
 * });
 * ```
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  // Navigate to login page
  await page.goto('/auth/login');

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
  await page.fill('input[type="password"]', TEST_CREDENTIALS.password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to admin dashboard
  await page.waitForURL('**/admin', { timeout: 10000 });

  // Verify we're logged in by checking for admin UI elements
  await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
}

/**
 * Logout current user
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when logout is complete
 *
 * @example
 * ```typescript
 * test('logout', async ({ page }) => {
 *   await loginAsAdmin(page);
 *   await logout(page);
 *   // Now on login page
 * });
 * ```
 */
export async function logout(page: Page): Promise<void> {
  // Look for user menu or logout button
  // This may need adjustment based on your UI structure
  const userMenuButton = page.locator('button:has-text("gregadeaux"), button:has-text("Admin")').first();

  if (await userMenuButton.isVisible()) {
    await userMenuButton.click();

    // Wait for dropdown menu
    await page.waitForTimeout(300);

    // Click logout option
    const logoutButton = page.locator('text=Logout, text=Sign Out').first();
    await logoutButton.click();

    // Wait for redirect to login page
    await page.waitForURL('**/auth/login', { timeout: 10000 });
  }
}

/**
 * Check if user is currently logged in
 *
 * @param page - Playwright page object
 * @returns Promise<boolean> - true if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for admin UI elements
    const adminElement = page.locator('text=Dashboard');
    return await adminElement.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Navigate to admin section
 *
 * @param page - Playwright page object
 * @param section - Admin section to navigate to (e.g., 'events', 'teams', 'matches')
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * test('events page', async ({ page }) => {
 *   await loginAsAdmin(page);
 *   await navigateToAdminSection(page, 'events');
 * });
 * ```
 */
export async function navigateToAdminSection(
  page: Page,
  section: 'events' | 'teams' | 'matches' | 'users' | 'scouting-data'
): Promise<void> {
  // Click on sidebar navigation
  const navLink = page.locator(`a[href*="/admin/${section}"]`).first();
  await navLink.click();

  // Wait for navigation
  await page.waitForURL(`**/admin/${section}**`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for admin page to be fully loaded
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when page is loaded
 */
export async function waitForAdminPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Wait for any loading spinners to disappear
  await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 5000 }).catch(() => {
    // Ignore if no loading indicator exists
  });
}

/**
 * Clear browser storage and cookies
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when storage is cleared
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.context().clearCookies();

  // Only try to clear storage if page has a valid context
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch (e) {
        // localStorage may not be accessible in some contexts
        console.warn('Could not clear localStorage:', e);
      }
      try {
        sessionStorage.clear();
      } catch (e) {
        // sessionStorage may not be accessible in some contexts
        console.warn('Could not clear sessionStorage:', e);
      }
    });
  } catch (e) {
    // If evaluate fails (e.g., no page loaded yet), just skip storage clearing
    // Cookies have already been cleared above
  }
}
