import { test, expect } from '@playwright/test';

test.describe('Offline Match Scouting', () => {
  test('should queue submission when offline and sync when reconnected', async ({ page, context }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'gregadeaux@gmail.com');
    await page.fill('input[name="password"]', 'Gerg2010');
    await page.click('button[type="submit"]');

    // Wait for redirect to admin
    await page.waitForURL('**/admin', { timeout: 10000 });

    // Navigate to match scouting
    await page.goto('/match-scouting');
    await page.waitForSelector('h1:has-text("Match Scouting")');

    // Select an event (assuming there are events in the test database)
    // EventSelector component has label "Select Event"
    await page.waitForSelector('text=Select Event', { timeout: 10000 });
    const eventSelect = page.locator('label:has-text("Select Event") + select');
    await eventSelect.waitFor({ state: 'visible', timeout: 10000 });
    const eventOptions = await eventSelect.locator('option').count();

    if (eventOptions > 1) {
      // Select the first real event (not the placeholder)
      await eventSelect.selectOption({ index: 1 });

      // Wait for matches to load
      await page.waitForTimeout(1000);

      // Select a match if available
      // MatchSelector component has label "Select Match"
      const matchSelect = page.locator('label:has-text("Select Match") + select');
      await matchSelect.waitFor({ state: 'visible', timeout: 10000 });
      const matchOptions = await matchSelect.locator('option').count();

      if (matchOptions > 1) {
        await matchSelect.selectOption({ index: 1 });

        // Wait for teams to load
        await page.waitForTimeout(1000);

        // Select a team
        const teamButtons = page.locator('button[data-team-number]');
        const teamCount = await teamButtons.count();

        if (teamCount > 0) {
          await teamButtons.first().click();

          // Now go offline
          await context.setOffline(true);

          // Wait for React to detect offline status
          await page.waitForTimeout(1000);

          // Verify offline banner appears (there are 2 instances - one in banner, one in form)
          await expect(page.locator('text=You are offline').first()).toBeVisible({ timeout: 10000 });

          // Fill in some basic form data
          // Auto performance section
          await page.locator('input[name="left_starting_zone"]').check();
          await page.locator('button:has-text("Coral L1") >> nth=0').click(); // Increment counter

          // Submit the form
          await page.click('button:has-text("Submit Match Data")');

          // Verify queued message
          await expect(page.locator('text=Saved offline - will sync when connected')).toBeVisible({ timeout: 5000 });

          // Verify sync indicator shows 1 pending
          await expect(page.locator('text=1 pending submission')).toBeVisible({ timeout: 5000 });

          // Go back online
          await context.setOffline(false);

          // Wait for auto-sync (should happen within a few seconds)
          await page.waitForTimeout(5000);

          // Verify sync indicator is gone (no pending submissions)
          await expect(page.locator('text=pending submission')).toHaveCount(0, { timeout: 10000 });

          // Verify offline banners are gone (should be 0 instances)
          await expect(page.locator('text=You are offline')).toHaveCount(0);
        }
      }
    }
  });

  test('should show offline banner and allow manual sync', async ({ page, context }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'gregadeaux@gmail.com');
    await page.fill('input[name="password"]', 'Gerg2010');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');

    // Go to match scouting
    await page.goto('/match-scouting');
    await page.waitForSelector('h1:has-text("Match Scouting")');

    // Go offline
    await context.setOffline(true);

    // Wait for React to detect offline status
    await page.waitForTimeout(1000);

    // Verify offline banner (there are 2 instances - one in banner, one in form - check the first)
    await expect(page.locator('text=You are offline').first()).toBeVisible({ timeout: 10000 });

    // Go back online
    await context.setOffline(false);

    // Wait for React to detect online status
    await page.waitForTimeout(1000);

    // Verify banner disappears (count should be 0)
    await expect(page.locator('text=You are offline')).toHaveCount(0, { timeout: 5000 });
  });

  test('should cache match schedules for offline use', async ({ page, context }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'gregadeaux@gmail.com');
    await page.fill('input[name="password"]', 'Gerg2010');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');

    // Go to match scouting
    await page.goto('/match-scouting');

    // Select an event while online to cache it
    await page.waitForSelector('text=Select Event', { timeout: 10000 });
    const eventSelect = page.locator('label:has-text("Select Event") + select');
    await eventSelect.waitFor({ state: 'visible', timeout: 10000 });
    const eventOptions = await eventSelect.locator('option').count();

    if (eventOptions > 1) {
      await eventSelect.selectOption({ index: 1 });

      // Wait for matches to load (this caches them)
      await page.waitForTimeout(2000);

      // Count matches while online
      const matchSelect = page.locator('label:has-text("Select Match") + select');
      await matchSelect.waitFor({ state: 'visible', timeout: 10000 });
      const onlineMatchCount = await matchSelect.locator('option').count();

      // Go offline
      await context.setOffline(true);

      // Reload the page
      await page.reload();

      // Wait for page to load
      await page.waitForSelector('h1:has-text("Match Scouting")');

      // Wait for React to detect offline status
      await page.waitForTimeout(1000);

      // Select the same event
      const eventSelectOffline = page.locator('label:has-text("Select Event") + select');
      await eventSelectOffline.waitFor({ state: 'visible', timeout: 10000 });
      await eventSelectOffline.selectOption({ index: 1 });

      // Wait a moment
      await page.waitForTimeout(1000);

      // Verify matches are still available from cache
      const matchSelectOffline = page.locator('label:has-text("Select Match") + select');
      await matchSelectOffline.waitFor({ state: 'visible', timeout: 10000 });
      const offlineMatchCount = await matchSelectOffline.locator('option').count();
      expect(offlineMatchCount).toBe(onlineMatchCount);
    }
  });
});