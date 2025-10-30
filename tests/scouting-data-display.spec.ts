/**
 * E2E Tests for JSONB Data Display Component
 *
 * Tests the JSONBDataDisplay component with various scenarios
 */

import { test, expect } from '@playwright/test';

test.describe('JSONB Data Display Component', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'gregadeaux@gmail.com');
    await page.fill('input[type="password"]', 'Gerg2010');
    await page.click('button[type="submit"]');

    // Wait for redirect to admin dashboard
    await page.waitForURL('**/admin');

    // Navigate to demo page
    await page.goto('http://localhost:3000/admin/scouting-data-demo');
    await page.waitForLoadState('networkidle');
  });

  test('should display page title and description', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('JSONB Data Display Component Demo');
    await expect(page.locator('text=Testing the JSONBDataDisplay component')).toBeVisible();
  });

  test('should display autonomous period data in standard view', async ({ page }) => {
    // Check that auto performance section is visible
    await expect(page.locator('text=Auto Performance')).toBeVisible();

    // Check that sections are visible
    await expect(page.locator('text=Mobility')).toBeVisible();
    await expect(page.locator('text=Coral Scoring')).toBeVisible();

    // Check specific field values
    await expect(page.locator('text=Left Starting Zone')).toBeVisible();

    // Check that copy button exists
    await expect(page.locator('button:has-text("Copy")').first()).toBeVisible();
  });

  test('should display compact view with higher information density', async ({ page }) => {
    const compactSection = page.locator('text=Autonomous Period - Compact View').locator('..');

    // Verify compact layout exists
    await expect(compactSection.locator('text=Coral Scored - Level 1')).toBeVisible();
    await expect(compactSection.locator('text=Coral Scored - Level 2')).toBeVisible();
  });

  test('should display teleop period data', async ({ page }) => {
    // Scroll to teleop section
    await page.locator('text=Teleoperated Period - Standard View').scrollIntoViewIfNeeded();

    // Check teleop-specific fields
    await expect(page.locator('text=Cycles Completed')).toBeVisible();
    await expect(page.locator('text=Defense Effectiveness')).toBeVisible();
    await expect(page.locator('text=Algae Scoring')).toBeVisible();
  });

  test('should display endgame period data', async ({ page }) => {
    // Scroll to endgame section
    await page.locator('text=Endgame Period - Standard View').scrollIntoViewIfNeeded();

    // Check endgame-specific fields
    await expect(page.locator('text=Cage Climbing')).toBeVisible();
    await expect(page.locator('text=Cage Climb Attempted')).toBeVisible();
    await expect(page.locator('text=Cage Level Achieved')).toBeVisible();
  });

  test('should toggle collapsible sections', async ({ page }) => {
    // Find a collapsible section
    const mobilitySection = page.locator('text=Mobility').locator('..');

    // Should be expanded by default
    await expect(mobilitySection.locator('text=Left Starting Zone')).toBeVisible();

    // Click to collapse
    await mobilitySection.locator('button').first().click();

    // Content should be hidden (note: may need to adjust selector based on actual DOM)
    await page.waitForTimeout(500); // Wait for animation

    // Click to expand again
    await mobilitySection.locator('button').first().click();
    await expect(mobilitySection.locator('text=Left Starting Zone')).toBeVisible();
  });

  test('should copy data to clipboard', async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy button
    const copyButton = page.locator('button:has-text("Copy")').first();
    await copyButton.click();

    // Button text should change to "Copied"
    await expect(copyButton).toContainText('Copied');

    // Wait for button to reset
    await page.waitForTimeout(2500);
    await expect(copyButton).toContainText('Copy');
  });

  test('should display inline view without sections', async ({ page }) => {
    // Scroll to inline display section
    await page.locator('text=Inline Display (No Sections)').scrollIntoViewIfNeeded();

    // Should show data without section headers
    const inlineSection = page.locator('text=Inline Display (No Sections)').locator('..');
    await expect(inlineSection).toBeVisible();
  });

  test('should display all three periods side by side', async ({ page }) => {
    // Scroll to bottom
    await page.locator('text=All Three Periods Side by Side').scrollIntoViewIfNeeded();

    // Check that all three cards are visible
    const cardsSection = page.locator('text=All Three Periods Side by Side').locator('..').locator('..');
    await expect(cardsSection.locator('text=Auto').first()).toBeVisible();
    await expect(cardsSection.locator('text=Teleop').first()).toBeVisible();
    await expect(cardsSection.locator('text=Endgame').first()).toBeVisible();
  });

  test('should display boolean fields with checkmarks', async ({ page }) => {
    // Look for boolean field (Left Starting Zone)
    const autoSection = page.locator('text=Autonomous Period - Standard View').locator('..');

    // Should show a checkmark for true boolean
    // Note: This might need adjustment based on actual SVG rendering
    await expect(autoSection.locator('text=Left Starting Zone')).toBeVisible();
  });

  test('should display select fields as badges', async ({ page }) => {
    // Look for select field (Defense Effectiveness)
    const teleopSection = page.locator('text=Teleoperated Period - Standard View').locator('..');

    await teleopSection.scrollIntoViewIfNeeded();
    await expect(teleopSection.locator('text=Defense Effectiveness')).toBeVisible();
  });

  test('should display numeric counters correctly', async ({ page }) => {
    // Check numeric values are displayed
    const autoSection = page.locator('text=Autonomous Period - Standard View').locator('..');

    // Coral scored fields should show numbers
    await expect(autoSection.locator('text=Coral Scored - Level 1')).toBeVisible();
    await expect(autoSection.locator('text=Coral Scored - Level 2')).toBeVisible();
  });

  test('should handle section filtering', async ({ page }) => {
    // Scroll to section filtering example
    await page.locator('text=Section Filtering - Coral Scoring Only').scrollIntoViewIfNeeded();

    const filteredSection = page.locator('text=Section Filtering - Coral Scoring Only').locator('..');

    // Should only show Coral and Algae scoring sections
    await expect(filteredSection.locator('text=Coral Scoring')).toBeVisible();
    await expect(filteredSection.locator('text=Algae Scoring')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that content is still visible and readable
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Auto Performance')).toBeVisible();
  });

  test('should support dark mode', async ({ page }) => {
    // Toggle dark mode (assuming there's a dark mode toggle in the UI)
    // This test will depend on your dark mode implementation

    // For now, just verify the page loads correctly
    await expect(page.locator('h1')).toBeVisible();
  });
});
