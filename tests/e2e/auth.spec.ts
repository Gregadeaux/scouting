/**
 * E2E Tests for Authentication Flow
 *
 * Tests the complete authentication lifecycle including:
 * - Login with valid credentials
 * - Dashboard access after login
 * - Session persistence
 * - Logout functionality
 * - Login form validation
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, logout, TEST_CREDENTIALS, clearStorage } from './helpers/auth';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state before each test
    await clearStorage(page);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');

    // Verify we're on the login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    await expect(page.locator('h1, h2').filter({ hasText: /log in|sign in/i })).toBeVisible();

    // Fill in login form
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);

    // Submit login form
    await page.click('button[type="submit"]');

    // Should redirect to admin dashboard
    await page.waitForURL('**/admin', { timeout: 10000 });

    // Verify we're logged in by checking for dashboard elements
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to admin dashboard after login', async ({ page }) => {
    // Login using helper
    await loginAsAdmin(page);

    // Verify we're on the admin dashboard
    await expect(page).toHaveURL(/.*\/admin/);

    // Check for common dashboard elements
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Check for navigation items
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should display error message with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message (adjust selector based on your error display)
    await expect(
      page.locator('text=/Invalid credentials|incorrect|failed/i')
    ).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });

  test('should validate required email field', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit with empty email
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Check for HTML5 validation or custom error
    const emailInput = page.locator('input[type="email"]');
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );

    // Should have validation message or custom error
    expect(validationMessage).toBeTruthy();
  });

  test('should validate required password field', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit with empty password
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.click('button[type="submit"]');

    // Check for HTML5 validation or custom error
    const passwordInput = page.locator('input[type="password"]');
    const validationMessage = await passwordInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );

    // Should have validation message or custom error
    expect(validationMessage).toBeTruthy();
  });

  test('should persist session after page reload', async ({ page }) => {
    // Login
    await loginAsAdmin(page);

    // Verify logged in
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be logged in
    await expect(page).toHaveURL(/.*\/admin/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should successfully logout', async ({ page }) => {
    // Login first
    await loginAsAdmin(page);

    // Verify logged in
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Perform logout
    await logout(page);

    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/auth\/login/, { timeout: 10000 });
  });

  test('should require authentication for admin routes', async ({ page }) => {
    // Try to access admin route without logging in
    await page.goto('/admin/events');

    // Should redirect to login page
    await page.waitForURL(/.*\/auth\/login/, { timeout: 10000 });

    // Verify we're on login page
    await expect(page.locator('h1, h2').filter({ hasText: /log in|sign in/i })).toBeVisible();
  });

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);

    // Click submit and immediately check for loading state
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Button should show loading state or be disabled
    // (adjust based on your UI implementation)
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    const hasLoadingText = await submitButton.textContent().then(
      text => text?.includes('Loading') || text?.includes('...')
    );

    // At least one should be true
    expect(isDisabled || hasLoadingText).toBeTruthy();
  });

  test('should handle multiple login attempts correctly', async ({ page }) => {
    await page.goto('/auth/login');

    // First failed attempt
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Second failed attempt
    await page.fill('input[type="email"]', 'wrong2@example.com');
    await page.fill('input[type="password"]', 'wrongpassword2');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Successful attempt
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Should successfully login
    await page.waitForURL('**/admin', { timeout: 10000 });
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});
