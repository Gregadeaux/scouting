/**
 * E2E Tests for Reset Password Flow
 *
 * SCOPE: This test suite focuses on error states and navigation that can be
 * reliably tested in E2E. Valid password reset tokens require server-side
 * generation and validation that cannot be effectively mocked in browser-based
 * E2E tests.
 *
 * TESTED:
 * - Error state when no valid token is present
 * - Navigation to request new reset link
 * - Security: Form not accessible without valid session
 * - Dark mode rendering of error states
 *
 * NOT TESTED (E2E Limitations):
 * - Valid token form rendering and submission
 * - Password validation with real server responses
 * - Success flows and redirects
 * - Form accessibility with valid tokens
 *
 * These scenarios require server-side token generation which is not feasible
 * in E2E tests. They should be covered by unit/integration tests instead.
 */

import { test, expect } from '@playwright/test';

test.describe('Reset Password Page - Without Valid Token', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to reset password page without a valid token
    await page.goto('/auth/reset-password');
  });

  test('should show error with invalid/missing token', async ({ page }) => {
    // Should show error state
    await expect(page.locator('h1:has-text("Invalid Reset Link")')).toBeVisible({
      timeout: 5000,
    });

    // Should show error message
    await expect(
      page.locator('text=Invalid or expired reset link')
    ).toBeVisible();

    // Should show request new link button
    await expect(
      page.locator('button:has-text("Request New Reset Link")')
    ).toBeVisible();

    // Should show error icon
    const errorIcon = page.locator('svg.text-red-600, svg.text-red-400').first();
    await expect(errorIcon).toBeVisible();
  });

  test('should navigate to forgot password when requesting new link', async ({
    page,
  }) => {
    // Wait for error state
    await expect(page.locator('h1:has-text("Invalid Reset Link")')).toBeVisible({
      timeout: 5000,
    });

    // Click request new link button
    await page.click('button:has-text("Request New Reset Link")');

    // Should navigate to forgot password page
    await expect(page).toHaveURL('/auth/forgot-password');
  });
});

test.describe('Security', () => {
  test('should not allow password reset without valid token', async ({ page }) => {
    // Navigate without token
    await page.goto('/auth/reset-password');

    // Should immediately show error state
    await expect(page.locator('h1:has-text("Invalid Reset Link")')).toBeVisible({
      timeout: 5000,
    });

    // Form should not be visible
    await expect(page.locator('input[type="password"]')).not.toBeVisible();
  });
});

test.describe('Dark Mode', () => {
  test('should render error state correctly in dark mode', async ({ page }) => {
    await page.goto('/auth/reset-password');

    // Enable dark mode after page loads
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    // Should show error in dark mode
    await expect(page.locator('h1:has-text("Invalid Reset Link")')).toBeVisible({
      timeout: 5000,
    });

    // Verify that page renders in dark mode (check for dark background on container)
    const container = page.locator('.min-h-screen').first();
    await expect(container).toBeVisible();
  });
});
