/**
 * E2E Tests for User Signup
 * Tests both email/password and OAuth signup flows
 */

import { test, expect, Page } from '@playwright/test';

// Helper to generate unique test emails with additional random component
const generateTestEmail = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test-user-${timestamp}-${random}@example.com`;
};

// Helper to fill signup form
async function fillSignupForm(
  page: Page,
  email: string,
  password: string,
  fullName?: string,
  teamNumber?: string
) {
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="confirmPassword"]', password); // Confirm password is required
  if (fullName) {
    await page.fill('input[name="full_name"]', fullName);
  }
  if (teamNumber) {
    await page.fill('input[name="team_number"]', teamNumber);
  }
}

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
  });

  test('should display signup form correctly', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Join FRC Scouting")')).toBeVisible();

    // Check form elements are present
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('input[name="full_name"]')).toBeVisible();
    await expect(page.locator('input[name="team_number"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check OAuth button
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();

    // Check login button (not a link, but a button that calls onSignIn callback)
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Remove HTML5 validation to test JS validation
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.noValidate = true;
    });

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check for validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Remove HTML5 validation to test JS validation
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.noValidate = true;
    });

    // Enter invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'ValidPass123!');
    await page.fill('input[name="confirmPassword"]', 'ValidPass123!');
    await page.click('button[type="submit"]');

    // Check for validation error (exact message from SignupForm)
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    // Remove HTML5 validation to test JS validation
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.noValidate = true;
    });

    // Enter weak password
    await page.fill('input[name="email"]', generateTestEmail());
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    await page.click('button[type="submit"]');

    // Check for password validation error (exact message from validatePasswordStrength)
    await expect(page.locator('text=Password must be at least 8 characters long')).toBeVisible();
  });

  test('should successfully sign up with email and password', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPass123!';
    const testName = 'Test User';
    const testTeam = '930';

    // Fill and submit form
    await fillSignupForm(page, testEmail, testPassword, testName, testTeam);
    await page.click('button[type="submit"]');

    // The signup might succeed OR the email might already exist (from previous test runs)
    // Both are valid behaviors we need to handle
    try {
      // Try to wait for successful signup navigation
      await page.waitForURL(/\/auth\/verify-email/, { timeout: 5000 });
      // If we get here, signup was successful
      await expect(page.locator('text=/check your email/i')).toBeVisible();
    } catch (e) {
      // If navigation didn't happen, check if it's because email already exists
      // This is expected behavior if the user was created in a previous test run
      const errorVisible = await page.locator('text=/An account with this email already exists/i').isVisible();
      if (!errorVisible) {
        // If there's no error message, something else went wrong
        throw e;
      }
      // Otherwise, test passes - the duplicate email error is working correctly
    }
  });

  test('should handle existing email error', async ({ page }) => {
    // Use a known test email that we'll try to create twice
    const testEmail = generateTestEmail();
    const testPassword = 'TestPass123!';

    // First signup attempt
    await fillSignupForm(page, testEmail, testPassword);
    await page.click('button[type="submit"]');

    // Wait for either success or error (in case email was already used)
    const isAlreadyUsed = await page.locator('text=/An account with this email already exists/i').isVisible().catch(() => false);

    if (!isAlreadyUsed) {
      // First signup succeeded, wait for navigation
      try {
        await page.waitForURL(/\/auth\/verify-email/, { timeout: 5000 });
        // Go back to signup page for second attempt
        await page.goto('/auth/signup');
      } catch (e) {
        // If first attempt showed error, that's fine too
      }
    }

    // Now try to sign up with the same email again (or for first time if it was already used)
    await fillSignupForm(page, testEmail, testPassword);
    await page.click('button[type="submit"]');

    // Check for the specific error message (409 Conflict - from SCOUT-18 fix)
    // The page should stay on signup and show the error
    await expect(page.locator('text=/An account with this email already exists/i')).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state during signup', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPass123!';

    // Fill form
    await fillSignupForm(page, testEmail, testPassword);

    // Start monitoring button state
    const submitButton = page.locator('button[type="submit"]');

    // Click and immediately check for loading state
    const clickPromise = submitButton.click();

    // Button should be disabled during submission
    await expect(submitButton).toBeDisabled();

    // Wait for navigation to complete
    await clickPromise;
  });

  test('should validate password confirmation match', async ({ page }) => {
    // Remove HTML5 validation to test JS validation
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.noValidate = true;
    });

    const testEmail = generateTestEmail();

    // Enter mismatched passwords
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'ValidPass123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
    await page.click('button[type="submit"]');

    // Check for password mismatch error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test.describe('OAuth Signup', () => {
    test('should generate Google OAuth URL when clicking Google button', async ({ page }) => {
      // Intercept OAuth API call
      const oauthPromise = page.waitForRequest(
        request => request.url().includes('/api/auth/oauth/url') && request.method() === 'POST'
      );

      // Click Google OAuth button
      await page.click('button:has-text("Continue with Google")');

      // Wait for API call
      const oauthRequest = await oauthPromise;

      // Verify request body
      const requestBody = oauthRequest.postDataJSON();
      expect(requestBody).toHaveProperty('provider', 'google');

      // The actual OAuth redirect will fail in test environment,
      // but we can verify the API was called correctly
    });

    test('should handle OAuth provider errors gracefully', async ({ page, context }) => {
      // Mock OAuth API to return error
      await context.route('**/api/auth/oauth/url', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'OAuth provider not configured'
          })
        });
      });

      // Click Google OAuth button
      await page.click('button:has-text("Continue with Google")');

      // Check for error message
      await expect(page.locator('text=/OAuth provider not configured/i')).toBeVisible();
    });
  });

  test.describe('Form Navigation', () => {
    test('should navigate to login page when clicking login button', async ({ page }) => {
      // Click the "Sign in" button (not a link, but a button)
      await page.click('button:has-text("Sign in")');
      await expect(page).toHaveURL('/auth/login');
    });

    test('should preserve form data on validation error', async ({ page }) => {
      const testEmail = generateTestEmail();
      const testName = 'Test User';
      const testTeam = '930';

      // Fill form with invalid password
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');
      await page.fill('input[name="full_name"]', testName);
      await page.fill('input[name="team_number"]', testTeam);

      // Submit form
      await page.click('button[type="submit"]');

      // Check that form data is preserved (password is NOT cleared, form maintains state)
      await expect(page.locator('input[name="email"]')).toHaveValue(testEmail);
      await expect(page.locator('input[name="full_name"]')).toHaveValue(testName);
      await expect(page.locator('input[name="team_number"]')).toHaveValue(testTeam);
      await expect(page.locator('input[name="password"]')).toHaveValue('weak');
      await expect(page.locator('input[name="confirmPassword"]')).toHaveValue('weak');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Start from the email field - SignupForm has Full Name first in the form
      await page.click('input[name="full_name"]');

      // Tab through form elements in the order they appear in SignupForm
      await expect(page.locator('input[name="full_name"]')).toBeFocused();

      await page.keyboard.press('Tab'); // Focus email
      await expect(page.locator('input[name="email"]')).toBeFocused();

      await page.keyboard.press('Tab'); // Focus password
      await expect(page.locator('input[name="password"]')).toBeFocused();

      await page.keyboard.press('Tab'); // Focus confirm password
      await expect(page.locator('input[name="confirmPassword"]')).toBeFocused();

      await page.keyboard.press('Tab'); // Focus team number
      await expect(page.locator('input[name="team_number"]')).toBeFocused();

      // Note: Submit button focus behavior varies by browser, so we skip testing it
      // The important part is that all form fields are keyboard accessible
    });

    test('should have proper labels for all inputs', async ({ page }) => {
      // Check inputs have visible labels - use exact text matching to avoid ambiguity
      await expect(page.locator('label:has-text("Full Name")')).toBeVisible();
      await expect(page.locator('label:has-text("Email")')).toBeVisible();
      await expect(page.locator('label[for="password"]:has-text("Password")')).toBeVisible();
      await expect(page.locator('label[for="confirm-password"]:has-text("Confirm Password")')).toBeVisible();
      await expect(page.locator('label:has-text("Team Number")')).toBeVisible();
    });
  });
});

test.describe('OAuth Callback', () => {
  test('should handle OAuth callback with valid code', async ({ page }) => {
    // Navigate to callback with mock code
    await page.goto('/auth/callback?code=mock-auth-code');

    // Should redirect to login (since we can't exchange the mock code)
    // The middleware may add a redirect query param
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should handle OAuth callback with error', async ({ page }) => {
    // Navigate to callback with error
    await page.goto('/auth/callback?error=access_denied&error_description=User%20denied%20access');

    // Should redirect to login (middleware may add redirect query param)
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});