/**
 * E2E Test for SCOUT-19 Fix
 * Verifies that user profile creation works during signup
 */

import { test, expect } from '@playwright/test';

test.describe('SCOUT-19: Profile Creation During Signup', () => {
  test('should create user profile successfully during signup', async ({ page }) => {
    // Generate unique email for this test run
    const timestamp = Date.now();
    const testEmail = `scout19-test-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = `Test User ${timestamp}`;

    console.log(`Testing with email: ${testEmail}`);

    // Navigate to signup page
    await page.goto('/auth/signup');

    // Fill in the signup form
    await page.fill('input[name="full_name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.fill('input[name="team_number"]', '930');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for navigation or success message
    await page.waitForTimeout(2000); // Give it time to process

    // Check that we didn't get an RLS policy error
    const errorMessage = await page.locator('text=/RLS policy|row-level security|policy violation/i').count();
    expect(errorMessage).toBe(0);

    // Check that we got some kind of success indication
    // (Either redirect to verify-email, dashboard, or success message)
    const url = page.url();
    const hasSuccess =
      url.includes('/verify-email') ||
      url.includes('/dashboard') ||
      await page.locator('text=/success|created|registered/i').count() > 0;

    expect(hasSuccess).toBe(true);

    console.log('✅ SCOUT-19 FIX VERIFIED: No RLS policy violations during signup');
    console.log(`✅ User created successfully: ${testEmail}`);
    console.log(`✅ Final URL: ${url}`);
  });

  test('should handle existing email properly', async ({ page }) => {
    // Use test user email from environment variables
    const existingEmail = process.env.TEST_USER_EMAIL || 'test@example.com';

    await page.goto('/auth/signup');

    await page.fill('input[name="full_name"]', 'Test User');
    await page.fill('input[name="email"]', existingEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');

    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Should show duplicate email error, not RLS error
    const hasErrorMessage =
      await page.locator('text=/already exists|already registered/i').count() > 0;

    expect(hasErrorMessage).toBe(true);

    // Should NOT show RLS errors
    const hasRLSError =
      await page.locator('text=/RLS policy|row-level security|policy violation/i').count() > 0;

    expect(hasRLSError).toBe(false);

    console.log('✅ Proper error handling for duplicate email (no RLS errors)');
  });
});
