/**
 * Navigation Test Helpers
 *
 * Provides utilities for navigating between pages in E2E tests
 */

import { Page } from '@playwright/test';

/**
 * Navigate to admin dashboard
 *
 * @param page - Playwright page instance
 * @param subpath - Optional subpath within admin (e.g., 'events', 'teams')
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await navigateToAdmin(page); // Navigate to /admin
 * await navigateToAdmin(page, 'events'); // Navigate to /admin/events
 * ```
 */
export async function navigateToAdmin(
  page: Page,
  subpath?: string
): Promise<void> {
  const path = subpath ? `/admin/${subpath}` : '/admin';
  await page.goto(path);
  await waitForPageLoad(page);
}

/**
 * Navigate to pit scouting page
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await navigateToPitScouting(page);
 * ```
 */
export async function navigateToPitScouting(page: Page): Promise<void> {
  await page.goto('/scouting/pit');
  await waitForPageLoad(page);
}

/**
 * Navigate to match scouting page
 *
 * @param page - Playwright page instance
 * @param matchId - Optional match ID to navigate directly to a match
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await navigateToMatchScouting(page);
 * await navigateToMatchScouting(page, '2025txaus_qm1');
 * ```
 */
export async function navigateToMatchScouting(
  page: Page,
  matchId?: string
): Promise<void> {
  const path = matchId ? `/scouting/match/${matchId}` : '/scouting/match';
  await page.goto(path);
  await waitForPageLoad(page);
}

/**
 * Navigate to events page
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await navigateToEvents(page);
 * ```
 */
export async function navigateToEvents(page: Page): Promise<void> {
  await navigateToAdmin(page, 'events');
}

/**
 * Navigate to teams page
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await navigateToTeams(page);
 * ```
 */
export async function navigateToTeams(page: Page): Promise<void> {
  await navigateToAdmin(page, 'teams');
}

/**
 * Navigate to matches page
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await navigateToMatches(page);
 * ```
 */
export async function navigateToMatches(page: Page): Promise<void> {
  await navigateToAdmin(page, 'matches');
}

/**
 * Navigate to users page
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await navigateToUsers(page);
 * ```
 */
export async function navigateToUsers(page: Page): Promise<void> {
  await navigateToAdmin(page, 'users');
}

/**
 * Navigate to event detail page
 *
 * @param page - Playwright page instance
 * @param eventKey - Event key (e.g., '2025txaus')
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await navigateToEventDetail(page, '2025txaus');
 * ```
 */
export async function navigateToEventDetail(
  page: Page,
  eventKey: string
): Promise<void> {
  await page.goto(`/admin/events/${eventKey}`);
  await waitForPageLoad(page);
}

/**
 * Navigate to team detail page
 *
 * @param page - Playwright page instance
 * @param teamNumber - Team number
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await navigateToTeamDetail(page, 930);
 * ```
 */
export async function navigateToTeamDetail(
  page: Page,
  teamNumber: number
): Promise<void> {
  await page.goto(`/admin/teams/${teamNumber}`);
  await waitForPageLoad(page);
}

/**
 * Wait for page to finish loading
 * Waits for network idle and any loading indicators to disappear
 *
 * @param page - Playwright page instance
 * @param timeout - Optional timeout in milliseconds (default: 10000)
 * @returns Promise that resolves when page is loaded
 *
 * @example
 * ```typescript
 * await waitForPageLoad(page);
 * await waitForPageLoad(page, 5000);
 * ```
 */
export async function waitForPageLoad(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout });

  // Wait for any loading spinners to disappear
  const loadingIndicators = page.locator('[data-testid="loading"], .loading, .spinner');
  await loadingIndicators.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
    // Ignore if no loading indicators exist
  });
}

/**
 * Navigate using sidebar menu
 * Useful for testing navigation flows
 *
 * @param page - Playwright page instance
 * @param menuItemText - Text of the menu item to click
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await navigateViaSidebar(page, 'Events');
 * await navigateViaSidebar(page, 'Teams');
 * ```
 */
export async function navigateViaSidebar(
  page: Page,
  menuItemText: string
): Promise<void> {
  // Click the sidebar menu item
  const menuItem = page.locator(`nav a:has-text("${menuItemText}"), nav button:has-text("${menuItemText}")`);
  await menuItem.click();
  await waitForPageLoad(page);
}

/**
 * Go back in browser history
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await goBack(page);
 * ```
 */
export async function goBack(page: Page): Promise<void> {
  await page.goBack();
  await waitForPageLoad(page);
}

/**
 * Go forward in browser history
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when navigation is complete
 *
 * @example
 * ```typescript
 * await goForward(page);
 * ```
 */
export async function goForward(page: Page): Promise<void> {
  await page.goForward();
  await waitForPageLoad(page);
}

/**
 * Reload the current page
 *
 * @param page - Playwright page instance
 * @returns Promise that resolves when page is reloaded
 *
 * @example
 * ```typescript
 * await reloadPage(page);
 * ```
 */
export async function reloadPage(page: Page): Promise<void> {
  await page.reload();
  await waitForPageLoad(page);
}
