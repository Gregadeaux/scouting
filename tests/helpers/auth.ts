/**
 * Authentication Test Helpers
 *
 * Provides utilities for authentication flows in E2E tests including:
 * - Login with different user roles
 * - Logout functionality
 * - Session state checks
 * - Authentication utilities
 */

import { Page } from '@playwright/test';

/**
 * Default admin credentials for testing
 * Loaded from environment variables (.env.test)
 *
 * Setup: Copy .env.test.example to .env.test and update with actual credentials
 */
export const ADMIN_CREDENTIALS = {
  email: process.env.TEST_ADMIN_EMAIL || process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_ADMIN_PASSWORD || process.env.TEST_USER_PASSWORD || 'TestPassword123!',
} as const;

/**
 * Default test scouter credentials
 * Loaded from environment variables (.env.test)
 *
 * Falls back to admin credentials if scouter credentials not set
 */
export const SCOUTER_CREDENTIALS = {
  email: process.env.TEST_SCOUTER_EMAIL || process.env.TEST_USER_EMAIL || 'test-scouter@example.com',
  password: process.env.TEST_SCOUTER_PASSWORD || process.env.TEST_USER_PASSWORD || 'TestScouter123!',
} as const;

/**
 * Login with email and password credentials
 *
 * @param page - Playwright page instance
 * @param email - User email address
 * @param password - User password
 * @returns Promise that resolves when login is complete
 *
 * @example
 * ```typescript
 * await loginAsUser(page, 'user@example.com', 'password123');
 * ```
 */
export async function loginAsUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), {
    timeout: 10000,
  });
}

/**
 * Login as admin user using default credentials
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when login is complete
 *
 * @example
 * ```typescript
 * await loginAsAdmin(page);
 * ```
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAsUser(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
}

/**
 * Login as scouter user using default test credentials
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when login is complete
 *
 * @example
 * ```typescript
 * await loginAsScouter(page);
 * ```
 */
export async function loginAsScouter(page: Page): Promise<void> {
  await loginAsUser(page, SCOUTER_CREDENTIALS.email, SCOUTER_CREDENTIALS.password);
}

/**
 * Logout current user
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when logout is complete
 *
 * @example
 * ```typescript
 * await logout(page);
 * ```
 */
export async function logout(page: Page): Promise<void> {
  // Click logout button in navigation or profile menu
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")');

  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
  } else {
    // Try navigation menu
    const menuButton = page.locator('button[aria-label="Menu"]');
    if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuButton.click();
      await page.locator('button:has-text("Logout"), button:has-text("Sign out")').click();
    }
  }

  // Wait for redirect to login page
  await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
}

/**
 * Ensure user is authenticated, logging in if necessary
 *
 * @param page - Playwright page instance
 * @param email - Optional email (defaults to admin)
 * @param password - Optional password (defaults to admin)
 * @returns Promise that resolves when authentication is confirmed
 *
 * @example
 * ```typescript
 * await ensureAuthenticated(page);
 * await ensureAuthenticated(page, 'user@example.com', 'password');
 * ```
 */
export async function ensureAuthenticated(
  page: Page,
  email?: string,
  password?: string
): Promise<void> {
  const isAuthenticated = await checkAuthenticationStatus(page);

  if (!isAuthenticated) {
    const loginEmail = email || ADMIN_CREDENTIALS.email;
    const loginPassword = password || ADMIN_CREDENTIALS.password;
    await loginAsUser(page, loginEmail, loginPassword);
  }
}

/**
 * Ensure user is NOT authenticated, logging out if necessary
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when user is confirmed logged out
 *
 * @example
 * ```typescript
 * await ensureUnauthenticated(page);
 * ```
 */
export async function ensureUnauthenticated(page: Page): Promise<void> {
  const isAuthenticated = await checkAuthenticationStatus(page);

  if (isAuthenticated) {
    await logout(page);
  }
}

/**
 * Get current user information from the page context
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves with user object or null if not authenticated
 *
 * @example
 * ```typescript
 * const user = await getCurrentUser(page);
 * if (user) {
 *   console.log(`Logged in as ${user.email}`);
 * }
 * ```
 */
export async function getCurrentUser(page: Page): Promise<{
  id?: string;
  email?: string;
  role?: string;
} | null> {
  try {
    // Try to get user from localStorage or cookies
    const user = await page.evaluate(() => {
      // Check localStorage for Supabase auth
      const authData = localStorage.getItem('supabase.auth.token');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          return parsed.currentSession?.user || null;
        } catch {
          return null;
        }
      }
      return null;
    });

    return user;
  } catch {
    return null;
  }
}

/**
 * Check if user is currently authenticated
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves with true if authenticated, false otherwise
 *
 * @example
 * ```typescript
 * const isLoggedIn = await checkAuthenticationStatus(page);
 * ```
 */
export async function checkAuthenticationStatus(page: Page): Promise<boolean> {
  try {
    // Check for auth cookie or localStorage
    const hasAuth = await page.evaluate(() => {
      // Check Supabase auth in localStorage
      const authData = localStorage.getItem('supabase.auth.token');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          return !!parsed.currentSession?.access_token;
        } catch {
          return false;
        }
      }

      // Fallback: check for auth cookie
      return document.cookie.includes('sb-access-token') ||
             document.cookie.includes('supabase-auth-token');
    });

    return hasAuth;
  } catch {
    return false;
  }
}

/**
 * Clear all authentication state (cookies, localStorage, sessionStorage)
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when auth state is cleared
 *
 * @example
 * ```typescript
 * await clearAuthState(page);
 * ```
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear cookies (by setting them to expire)
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  });

  // Also clear context cookies
  await page.context().clearCookies();
}

/**
 * Wait for authentication redirect to complete
 * Useful after login/logout to ensure navigation has finished
 *
 * @param page - Playwright page instance
 * @param expectedPath - Optional expected path to navigate to
 * @param timeout - Optional timeout in milliseconds (default: 10000)
 * @returns Promise that resolves when redirect is complete
 *
 * @example
 * ```typescript
 * await waitForAuthRedirect(page, '/admin');
 * ```
 */
export async function waitForAuthRedirect(
  page: Page,
  expectedPath?: string,
  timeout: number = 10000
): Promise<void> {
  if (expectedPath) {
    await page.waitForURL(expectedPath, { timeout });
  } else {
    // Wait for any navigation away from auth pages
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout });
  }
}
