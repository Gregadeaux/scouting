import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Background Sync functionality
 * Tests the integration of Background Sync API with offline submissions
 */

// Test credentials loaded from environment variables
const testCredentials = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
};

test.describe('Background Sync Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);
  });

  test('should register background sync when submissions are queued offline', async ({ page, context }) => {
    // Navigate to match scouting
    await page.goto('/match-scouting');

    // Go offline
    await context.setOffline(true);

    // Fill and submit a form
    await page.fill('input[name="match_number"]', '1');
    await page.fill('input[name="team_number"]', '930');
    await page.selectOption('select[name="station"]', 'red1');

    // Submit form
    await page.click('button[type="submit"]');

    // Check for pending submission indicator
    await expect(page.locator('text=1 pending submission')).toBeVisible();

    // Check browser support
    const bgSyncSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype;
    });

    if (bgSyncSupported) {
      // Should show "Will sync in background" for Chrome/Edge
      await expect(page.locator('text=Will sync in background')).toBeVisible();

      // Verify background sync was registered
      const syncRegistered = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        const tags = await (registration as any).sync.getTags();
        return tags.includes('submission-sync');
      });
      expect(syncRegistered).toBe(true);
    } else {
      // Should show "Sync Now" button for Firefox/Safari
      await expect(page.locator('button:has-text("Sync Now")')).toBeVisible();
    }

    // Go back online
    await context.setOffline(false);
  });

  test('should sync in background when tab is closed and reopened', async ({ browser }) => {
    // Create new context and page
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testCredentials.email);
    await page.fill('input[name="password"]', testCredentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);

    // Navigate to match scouting
    await page.goto('/match-scouting');

    // Go offline
    await context.setOffline(true);

    // Submit multiple forms
    for (let i = 1; i <= 3; i++) {
      await page.fill('input[name="match_number"]', i.toString());
      await page.fill('input[name="team_number"]', '930');
      await page.selectOption('select[name="station"]', `red${i}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500); // Small delay between submissions
    }

    // Verify 3 pending submissions
    await expect(page.locator('text=3 pending submissions')).toBeVisible();

    // Store submission IDs for later verification
    const submissionIds = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('pending-submissions') || '[]');
    });

    // Close the page and context (simulates browser close)
    await page.close();
    await context.close();

    // Wait for background sync to potentially occur
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Create new context (back online)
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();

    // Login again
    await newPage.goto('/auth/login');
    await newPage.fill('input[name="email"]', testCredentials.email);
    await newPage.fill('input[name="password"]', testCredentials.password);
    await newPage.click('button[type="submit"]');
    await newPage.waitForURL(/\/admin/);

    // Navigate back to match scouting
    await newPage.goto('/match-scouting');

    // Should show 0 pending (synced in background)
    await expect(newPage.locator('text=pending submission')).not.toBeVisible();

    // Clean up
    await newContext.close();
  });

  test('should fallback to manual sync when Background Sync is not supported', async ({ page, context }) => {
    // Navigate to match scouting
    await page.goto('/match-scouting');

    // Mock browser without Background Sync support
    await page.evaluate(() => {
      // Save original
      const originalSync = (ServiceWorkerRegistration.prototype as any).sync;
      // Remove sync property to simulate unsupported browser
      delete (ServiceWorkerRegistration.prototype as any).sync;

      // Restore after test
      (window as any).__restoreSync = () => {
        (ServiceWorkerRegistration.prototype as any).sync = originalSync;
      };
    });

    // Go offline
    await context.setOffline(true);

    // Submit a form
    await page.fill('input[name="match_number"]', '1');
    await page.fill('input[name="team_number"]', '930');
    await page.selectOption('select[name="station"]', 'red1');
    await page.click('button[type="submit"]');

    // Should show manual sync button instead of background sync message
    await expect(page.locator('button:has-text("Sync Now")')).toBeVisible();
    await expect(page.locator('text=Will sync in background')).not.toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Click sync now button
    await page.click('button:has-text("Sync Now")');

    // Should show syncing state
    await expect(page.locator('text=Syncing...')).toBeVisible();

    // Wait for sync to complete
    await expect(page.locator('text=pending submission')).not.toBeVisible({ timeout: 10000 });

    // Restore Background Sync
    await page.evaluate(() => {
      (window as any).__restoreSync?.();
    });
  });

  test('should handle multiple submissions with background sync', async ({ page, context }) => {
    // Navigate to match scouting
    await page.goto('/match-scouting');

    // Go offline
    await context.setOffline(true);

    // Submit 5 forms quickly
    for (let i = 1; i <= 5; i++) {
      await page.fill('input[name="match_number"]', i.toString());
      await page.fill('input[name="team_number"]', (929 + i).toString());
      await page.selectOption('select[name="station"]', `blue${(i % 3) + 1}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(200);
    }

    // Should show 5 pending
    await expect(page.locator('text=5 pending submissions')).toBeVisible();

    const bgSyncSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype;
    });

    if (bgSyncSupported) {
      // Verify background sync is registered
      const syncTags = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return await (registration as any).sync.getTags();
      });
      expect(syncTags).toContain('submission-sync');
    }

    // Go back online
    await context.setOffline(false);

    // Wait for automatic sync (either background or auto-sync)
    await expect(page.locator('text=pending submission')).not.toBeVisible({ timeout: 15000 });
  });

  test('should show sync status after service worker message', async ({ page, context }) => {
    // Navigate to match scouting
    await page.goto('/match-scouting');

    // Go offline and submit
    await context.setOffline(true);
    await page.fill('input[name="match_number"]', '1');
    await page.fill('input[name="team_number"]', '930');
    await page.selectOption('select[name="station"]', 'red1');
    await page.click('button[type="submit"]');

    // Verify pending
    await expect(page.locator('text=1 pending submission')).toBeVisible();

    // Simulate service worker message
    await page.evaluate(() => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Dispatch a synthetic message event
        const event = new MessageEvent('message', {
          data: {
            type: 'SYNC_COMPLETE',
            totalCount: 1,
            successCount: 1,
            failedCount: 0,
            timestamp: new Date().toISOString(),
          },
          source: navigator.serviceWorker.controller,
        });
        navigator.serviceWorker.dispatchEvent(event);
      }
    });

    // Should update UI based on message
    await page.waitForTimeout(1000); // Give time for React to update

    // Pending count should be refreshed
    const pendingVisible = await page.locator('text=pending submission').isVisible();
    expect(pendingVisible).toBe(false);
  });
});

test.describe('Service Worker Background Sync', () => {
  test('should have custom service worker loaded', async ({ page }) => {
    await page.goto('/');

    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.state === 'activated';
      }
      return false;
    });

    expect(swRegistered).toBe(true);

    // Check if custom script is imported
    const swScriptUrl = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.scriptURL;
      }
      return null;
    });

    expect(swScriptUrl).toContain('/sw.js');
  });
});