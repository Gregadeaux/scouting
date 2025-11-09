/**
 * Test Helpers Demo
 *
 * Demonstrates usage of the test helper utilities
 */

import { test, expect } from '@playwright/test';
import {
  // Authentication
  loginAsAdmin,
  loginAsUser,
  logout,
  ensureAuthenticated,
  clearAuthState,

  // Navigation
  navigateToAdmin,
  navigateToEvents,
  waitForPageLoad,

  // Forms
  fillForm,
  submitForm,
  expectFormError,
  disableHtml5Validation,

  // Waits
  waitForToast,
  waitForElement,
  waitForTableData,

  // Generators
  generateTestEmail,
  generateTestUser,
  generateTestTeam,

  // Assertions
  expectUrl,
  expectAuthenticated,
  expectToastMessage,
  expectElementVisible,
} from '../helpers';

test.describe('Test Helpers Demo', () => {
  test('authentication helpers work correctly', async ({ page }) => {
    // Clear any existing auth state
    await clearAuthState(page);

    // Login as admin using helper
    await loginAsAdmin(page);

    // Verify we're authenticated
    await expectAuthenticated(page);

    // Verify we're on a non-auth page
    await expect(page).toHaveURL(/\/(?!auth)/);

    // Logout
    await logout(page);

    // Verify we're back on login page
    await expectUrl(page, /\/auth\/login/);
  });

  test('navigation helpers work correctly', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to admin dashboard
    await navigateToAdmin(page);
    await expectUrl(page, '/admin');

    // Navigate to events page
    await navigateToEvents(page);
    await expectUrl(page, '/admin/events');
    await expectElementVisible(page, 'h1:has-text("Events")');
  });

  test('form helpers work correctly', async ({ page }) => {
    await page.goto('/auth/signup');

    // Disable HTML5 validation
    await disableHtml5Validation(page);

    // Fill form using helper
    const testEmail = generateTestEmail();
    await fillForm(page, {
      email: testEmail,
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      full_name: 'Test User',
      team_number: '930',
    });

    // Submit form
    await submitForm(page);

    // Wait for redirect
    await waitForPageLoad(page);
  });

  test('wait helpers work correctly', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToEvents(page);

    // Wait for table to load
    await waitForTableData(page, 1);

    // Verify table has data
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('generator helpers work correctly', async ({ page }) => {
    // Generate test data
    const email = generateTestEmail('demo');
    const user = generateTestUser('admin');
    const team = generateTestTeam(930);

    // Verify generated data structure
    expect(email).toMatch(/^demo-\d+-\d+@example\.com$/);
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('password');
    expect(user).toHaveProperty('role', 'admin');
    expect(team).toHaveProperty('team_number', 930);
    expect(team).toHaveProperty('team_name');
  });

  test('assertion helpers work correctly', async ({ page }) => {
    await loginAsAdmin(page);

    // Test URL assertion
    await expectUrl(page, /\/(?!auth)/);

    // Test authentication assertion
    await expectAuthenticated(page);

    // Navigate and test element visibility
    await navigateToEvents(page);
    await expectElementVisible(page, 'h1');
  });

  test('combined helper usage', async ({ page }) => {
    // 1. Setup: Generate test data
    const testUser = generateTestUser('scouter');

    // 2. Authentication: Clear state and login
    await clearAuthState(page);
    await loginAsAdmin(page);
    await expectAuthenticated(page);

    // 3. Navigation: Go to admin
    await navigateToAdmin(page, 'events');
    await expectUrl(page, '/admin/events');

    // 4. Wait for data to load
    await waitForElement(page, 'h1:has-text("Events")');
    await waitForPageLoad(page);

    // 5. Assertions: Verify page state
    await expectElementVisible(page, 'table');
  });
});
