# E2E Testing with Playwright

This document provides comprehensive guidance for writing and running end-to-end (E2E) tests using Playwright in the FRC Scouting System.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Best Practices](#best-practices)
- [Debugging](#debugging)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

Our E2E testing setup includes:

- **Playwright v1.56.1** - Modern browser automation framework
- **Multi-browser support** - Chrome, Firefox, and Safari (WebKit)
- **Video recording** - Automatic recording on test failures
- **Screenshots** - Captured on test failures for debugging
- **CI/CD integration** - Automated testing on push and pull requests
- **Parallel execution** - Fast test execution with 2 workers in CI

## Setup

### Prerequisites

- Node.js 20+ installed
- Project dependencies installed: `npm install`
- Playwright browsers installed: `npx playwright install --with-deps`

### Environment Variables

Create a `.env.local` file with your test environment configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Test Credentials

The test suite uses the following admin credentials:
- **Email**: gregadeaux@gmail.com
- **Password**: Gerg2010

These credentials are defined in `/tests/e2e/helpers/auth.ts`.

## Running Tests

### Run All Tests

```bash
# Run all E2E tests
npm run test:e2e

# Or using Playwright directly
npx playwright test
```

### Run Specific Browser

```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Safari only
npx playwright test --project=webkit
```

### Run Specific Test File

```bash
# Run authentication tests
npx playwright test auth.spec.ts

# Run event management tests
npx playwright test event-management.spec.ts

# Run match scouting tests
npx playwright test match-scouting.spec.ts
```

### Run Specific Test

```bash
# Run a specific test by name
npx playwright test -g "should successfully login"
```

### Run in Headed Mode (See Browser)

```bash
# Run with visible browser
npx playwright test --headed

# Run with UI mode (interactive)
npx playwright test --ui
```

### Run in Debug Mode

```bash
# Run with Playwright Inspector
npx playwright test --debug

# Debug specific test
npx playwright test --debug auth.spec.ts
```

## Writing Tests

### Test Structure

Tests are organized in `/tests/e2e/` with the following structure:

```
tests/e2e/
├── helpers/
│   └── auth.ts          # Authentication utilities
├── setup.ts             # Global fixtures and configuration
├── auth.spec.ts         # Authentication flow tests
├── event-management.spec.ts  # Event CRUD tests
└── match-scouting.spec.ts    # Match scouting form tests
```

### Basic Test Example

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup - runs before each test
    await loginAsAdmin(page);
  });

  test('should do something', async ({ page }) => {
    // Navigate to page
    await page.goto('/admin/feature');

    // Perform actions
    await page.click('button:has-text("Action")');

    // Assert results
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Using Authentication Helper

```typescript
import { loginAsAdmin, logout } from './helpers/auth';

test('admin feature test', async ({ page }) => {
  // Login as admin
  await loginAsAdmin(page);

  // Test admin features
  await page.goto('/admin/dashboard');
  await expect(page.locator('text=Dashboard')).toBeVisible();

  // Logout
  await logout(page);
});
```

### Using Authenticated Fixture

```typescript
import { test, expect } from './setup';

// Use authenticatedPage fixture for automatic login
test('admin feature', async ({ authenticatedPage }) => {
  // Already logged in as admin
  await authenticatedPage.goto('/admin/events');

  // Test your feature
  await expect(authenticatedPage.locator('h1')).toContainText('Events');
});
```

### Generating Unique Test Data

```typescript
import { generateUniqueTestData } from './setup';

test('create event', async ({ page }) => {
  const eventName = generateUniqueTestData('Test Event');
  const eventKey = generateUniqueTestData('test-event');

  await page.fill('input[name="name"]', eventName);
  await page.fill('input[name="key"]', eventKey);
  await page.click('button[type="submit"]');
});
```

## Test Structure

### Test Organization

- **Describe Blocks**: Group related tests
- **beforeEach**: Setup that runs before each test
- **afterEach**: Cleanup that runs after each test
- **Test Cases**: Individual test scenarios

```typescript
test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  test('scenario 1', async ({ page }) => {
    // Test
  });

  test('scenario 2', async ({ page }) => {
    // Test
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
  });
});
```

### Assertions

Use Playwright's built-in assertions:

```typescript
// Element visibility
await expect(page.locator('button')).toBeVisible();
await expect(page.locator('button')).toBeHidden();

// Text content
await expect(page.locator('h1')).toContainText('Dashboard');
await expect(page.locator('h1')).toHaveText('Dashboard');

// URL verification
await expect(page).toHaveURL(/.*\/admin/);

// Counts
await expect(page.locator('table tr')).toHaveCount(5);

// Attributes
await expect(page.locator('button')).toBeDisabled();
await expect(page.locator('button')).toBeEnabled();
```

## Best Practices

### 1. Use Explicit Waits

```typescript
// ✅ Good - explicit wait
await page.waitForSelector('button:has-text("Submit")');
await page.click('button:has-text("Submit")');

// ❌ Bad - arbitrary timeout
await page.waitForTimeout(3000);
await page.click('button:has-text("Submit")');
```

### 2. Use Stable Selectors

```typescript
// ✅ Good - stable selectors
await page.click('button[data-testid="submit-button"]');
await page.click('button[aria-label="Submit"]');
await page.click('button:has-text("Submit")');

// ❌ Bad - fragile selectors
await page.click('body > div > div > button:nth-child(3)');
```

### 3. Wait for Network Idle

```typescript
// Wait for page to fully load
await page.goto('/admin/events');
await page.waitForLoadState('networkidle');
```

### 4. Handle Dynamic Content

```typescript
// Wait for API response
await page.waitForResponse(response =>
  response.url().includes('/api/events') && response.status() === 200
);

// Wait for loading indicators to disappear
await page.waitForSelector('text=Loading...', { state: 'hidden' });
```

### 5. Make Tests Independent

Each test should:
- Set up its own test data
- Clean up after itself
- Not depend on other tests

```typescript
test.beforeEach(async ({ page }) => {
  // Fresh state for each test
  await clearStorage(page);
  await loginAsAdmin(page);
});
```

### 6. Use Page Object Model (Advanced)

For complex features, consider the Page Object Model:

```typescript
// pages/EventsPage.ts
export class EventsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin/events');
  }

  async createEvent(name: string, key: string) {
    await this.page.click('button:has-text("Create Event")');
    await this.page.fill('input[name="name"]', name);
    await this.page.fill('input[name="key"]', key);
    await this.page.click('button[type="submit"]');
  }
}

// In test
const eventsPage = new EventsPage(page);
await eventsPage.goto();
await eventsPage.createEvent('Test Event', 'test-event');
```

## Debugging

### View Test Results

After running tests:

```bash
# Open HTML report
npx playwright show-report
```

The report includes:
- Test results for all browsers
- Screenshots of failures
- Videos of failed tests
- Traces for debugging

### Debug Failed Tests

```bash
# Run in debug mode
npx playwright test --debug

# Debug specific test
npx playwright test --debug auth.spec.ts -g "should login"
```

### View Traces

```bash
# Open trace viewer
npx playwright show-trace test-results/*/trace.zip
```

### Screenshots and Videos

Failed tests automatically capture:
- **Screenshots**: `test-results/**/*.png`
- **Videos**: `test-results/**/*.webm`
- **Traces**: `test-results/**/trace.zip`

### Console Logs

View browser console logs:

```typescript
page.on('console', msg => console.log('Browser log:', msg.text()));
```

### Network Requests

Monitor network activity:

```typescript
page.on('request', request => console.log('Request:', request.url()));
page.on('response', response => console.log('Response:', response.url(), response.status()));
```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

### Workflow Configuration

Located at `.github/workflows/e2e.yml`:

- Runs on Ubuntu latest
- Tests all 3 browsers in parallel (matrix strategy)
- Uploads artifacts on failure
- Comments on PRs with results

### Required Secrets

Add these secrets in GitHub repository settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Viewing CI Results

1. Go to **Actions** tab in GitHub
2. Click on the workflow run
3. View test results for each browser
4. Download artifacts for failed tests

## Troubleshooting

### Tests Failing Locally but Passing in CI

**Cause**: Different environments or timing issues

**Solution**:
```bash
# Run in CI mode locally
CI=true npx playwright test

# Use consistent viewport
await page.setViewportSize({ width: 1280, height: 720 });
```

### Flaky Tests

**Cause**: Race conditions, timing issues

**Solution**:
- Use explicit waits instead of timeouts
- Wait for network idle: `await page.waitForLoadState('networkidle')`
- Wait for specific elements: `await page.waitForSelector()`
- Increase timeout for slow operations: `{ timeout: 30000 }`

### Authentication Issues

**Cause**: Session not persisting, cookies not set

**Solution**:
```typescript
// Ensure login completes
await page.waitForURL('**/admin', { timeout: 10000 });
await expect(page.locator('text=Dashboard')).toBeVisible();

// Check browser storage
const cookies = await page.context().cookies();
console.log('Cookies:', cookies);
```

### Element Not Found

**Cause**: Incorrect selector, timing issue

**Solution**:
```typescript
// Wait for element
await page.waitForSelector('button:has-text("Submit")', { timeout: 10000 });

// Use flexible selectors
const button = page.locator('button').filter({ hasText: /submit|save/i });
await button.click();
```

### Timeout Errors

**Cause**: Slow network, heavy operations

**Solution**:
```typescript
// Increase timeout for specific action
await page.goto('/admin/events', { timeout: 60000 });

// Increase timeout for assertion
await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
```

### Browser Not Installed

**Cause**: Playwright browsers not installed

**Solution**:
```bash
# Install all browsers
npx playwright install --with-deps

# Install specific browser
npx playwright install chromium --with-deps
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Playwright Test Configuration](https://playwright.dev/docs/test-configuration)

## Getting Help

If you encounter issues:

1. Check this documentation
2. Review test examples in `/tests/e2e/`
3. Run tests with `--debug` flag
4. Check Playwright documentation
5. Ask the team for help

---

**Last Updated**: 2025-10-30
**Playwright Version**: 1.56.1
**Node.js Version**: 20+
