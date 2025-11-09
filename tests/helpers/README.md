# Test Helpers

Reusable utilities for E2E testing with Playwright. These helpers reduce code duplication and make tests more readable and maintainable.

## Installation

Import helpers in your test files:

```typescript
import {
  loginAsAdmin,
  navigateToAdmin,
  fillForm,
  waitForToast,
  generateTestEmail,
  expectAuthenticated
} from '../helpers';
```

Or import from specific helper modules:

```typescript
import { loginAsAdmin, logout } from '../helpers/auth';
import { navigateToAdmin } from '../helpers/navigation';
```

## Authentication Helpers (`auth.ts`)

### Login Functions

```typescript
// Login with specific credentials
await loginAsUser(page, 'user@example.com', 'password123');

// Login as admin (uses default credentials)
await loginAsAdmin(page);

// Login as scouter
await loginAsScouter(page);

// Logout
await logout(page);
```

### Session Management

```typescript
// Ensure user is authenticated (login if needed)
await ensureAuthenticated(page);
await ensureAuthenticated(page, 'custom@email.com', 'password');

// Ensure user is NOT authenticated (logout if needed)
await ensureUnauthenticated(page);

// Get current user info
const user = await getCurrentUser(page);
if (user) {
  console.log(user.email, user.role);
}

// Clear all auth state
await clearAuthState(page);

// Wait for auth redirect
await waitForAuthRedirect(page);
await waitForAuthRedirect(page, '/admin');
```

### Default Credentials

```typescript
ADMIN_CREDENTIALS = {
  email: 'gregadeaux@gmail.com',
  password: 'Gerg2010'
}

SCOUTER_CREDENTIALS = {
  email: 'test-scouter@example.com',
  password: 'TestScouter123!'
}
```

## Navigation Helpers (`navigation.ts`)

```typescript
// Navigate to admin pages
await navigateToAdmin(page);
await navigateToAdmin(page, 'events'); // /admin/events
await navigateToEvents(page);
await navigateToTeams(page);
await navigateToMatches(page);
await navigateToUsers(page);

// Navigate to scouting pages
await navigateToPitScouting(page);
await navigateToMatchScouting(page);
await navigateToMatchScouting(page, '2025txaus_qm1');

// Navigate to detail pages
await navigateToEventDetail(page, '2025txaus');
await navigateToTeamDetail(page, 930);

// Wait for page to load
await waitForPageLoad(page);
await waitForPageLoad(page, 5000); // custom timeout

// Navigate via sidebar
await navigateViaSidebar(page, 'Events');

// Browser history
await goBack(page);
await goForward(page);
await reloadPage(page);
```

## Form Helpers (`forms.ts`)

### Filling Forms

```typescript
// Fill entire form with data object
await fillForm(page, {
  email: 'user@example.com',
  password: 'password123',
  full_name: 'Test User',
  team_number: '930',
  is_active: true, // checkboxes
});

// Submit form
await submitForm(page);
await submitForm(page, '#signup-form'); // specific form

// Clear field
await clearFormField(page, 'email');

// Get field value
const email = await getFormFieldValue(page, 'email');
```

### Field-Specific Helpers

```typescript
// Checkboxes
await checkCheckbox(page, 'left_starting_zone');
await uncheckCheckbox(page, 'left_starting_zone');

// Dropdowns
await selectDropdownOption(page, 'alliance', 'red');

// Counters
await incrementCounter(page, 'coral_scored', 5);
await decrementCounter(page, 'coral_scored', 2);
```

### Validation

```typescript
// Disable HTML5 validation (test JS validation)
await disableHtml5Validation(page);
await disableHtml5Validation(page, '#my-form');

// Expect validation error
await expectFormError(page, 'email', 'Email is required');

// Wait for submission to complete
await submitForm(page);
await waitForFormSubmission(page);
```

## Wait Helpers (`waits.ts`)

```typescript
// Wait for API response
await waitForApiResponse(page, '/api/admin/events');
await waitForApiResponse(page, /api\/teams\/\d+/, 200);

// Wait for toast notification
await waitForToast(page);
await waitForToast(page, 'Successfully saved');

// Wait for modal
await waitForModal(page);
await waitForModal(page, 'Edit Team');

// Wait for element
await waitForElement(page, '.data-table');
await waitForElement(page, 'h1:has-text("Events")', 10000);

// Wait for loading to complete
await waitForLoadingToComplete(page);

// Wait for table data
await waitForTableData(page);
await waitForTableData(page, 5); // at least 5 rows

// Wait for navigation
await waitForNavigation(page, '/admin/events');
await waitForNavigation(page, /\/admin\/events\/\d+/);

// Wait for network idle
await waitForNetworkIdle(page);

// Simple timeout
await wait(1000); // 1 second

// Wait for element to be stable (animations done)
await waitForElementStable(page, '.modal');

// Custom condition
await waitForCondition(page, async () => {
  const count = await page.locator('.item').count();
  return count > 5;
});
```

## Data Generators (`generators.ts`)

### User Data

```typescript
// Generate unique email
const email = generateTestEmail();
// Returns: test-user-1699999999999-1234@example.com

const adminEmail = generateTestEmail('admin');
// Returns: admin-1699999999999-5678@example.com

// Generate user object
const user = generateTestUser('admin');
// { email, password, full_name, role, team_number? }

const scouter = generateTestUser('scouter');
const mentor = generateTestUser('mentor');
```

### Team & Event Data

```typescript
// Generate team
const team = generateTestTeam(930);
const randomTeam = generateTestTeam();

// Generate event
const event = generateTestEvent(2025);
const currentYearEvent = generateTestEvent();

// Generate unique IDs
const teamNumber = generateUniqueTeamNumber();
const eventKey = generateUniqueEventKey(2025);
```

### Scouting Data

```typescript
// Match scouting payload
const matchData = generateMatchScoutingPayload({
  team_number: 930,
  match_key: '2025txaus_qm1',
  auto_performance: {
    coral_scored_l1: 3,
  },
});

// Pit scouting payload
const pitData = generatePitScoutingPayload({
  team_number: 930,
  event_key: '2025txaus',
  robot_capabilities: {
    drivetrain_type: 'mecanum',
  },
});
```

### Utility Generators

```typescript
// Random string
const str = generateRandomString(8);

// Random date
const date = generateRandomDate(
  new Date('2025-01-01'),
  new Date('2025-12-31')
);

// Array of items
const teams = generateArray(generateTestTeam, 5);
const users = generateArray(() => generateTestUser('scouter'), 10);
```

## Assertion Helpers (`assertions.ts`)

### URL & Authentication

```typescript
// URL assertions
await expectUrl(page, '/admin/events');
await expectUrl(page, /\/admin\/events\/\d+/);

// Auth assertions
await expectAuthenticated(page);
await expectUnauthenticated(page);
```

### Element Assertions

```typescript
// Visibility
await expectElementVisible(page, '.data-table');
await expectElementVisible(page, 'h1:has-text("Events")', 10000);

// Text content
await expectElementText(page, 'h1', 'Events');
await expectElementText(page, '.error', /email is required/i);

// Attributes
await expectElementAttribute(page, 'button', 'disabled', '');
await expectElementAttribute(page, 'a', 'href', '/admin');

// State
await expectElementEnabled(page, 'button[type="submit"]');
await expectElementDisabled(page, 'button[type="submit"]');

// CSS classes
await expectElementHasClass(page, '.button', 'active');

// Count
await expectElementCount(page, '.item', 5);
await expectElementCount(page, '.item', { min: 1, max: 10 });
```

### Form & Table Assertions

```typescript
// Form field values
await expectFormFieldValue(page, 'email', 'user@example.com');

// Checkboxes
await expectCheckboxChecked(page, 'left_starting_zone');
await expectCheckboxUnchecked(page, 'left_starting_zone');

// Table rows
await expectTableRowCount(page, 5);
await expectTableRowCount(page, { min: 1, max: 10 });
await expectTableRowCount(page, 3, '#events-table tbody tr');
```

### Notifications

```typescript
// Toast messages
await expectToastMessage(page, 'Successfully saved');
await expectToastMessage(page, 'Error occurred', 'error');
```

### Page Metadata

```typescript
// Page title
await expectPageTitle(page, 'FRC Scouting - Events');
await expectPageTitle(page, /Events/);
```

## Usage Examples

### Complete Login Flow

```typescript
test('user can login and navigate', async ({ page }) => {
  // Clear any existing auth
  await clearAuthState(page);

  // Login as admin
  await loginAsAdmin(page);

  // Verify authentication
  await expectAuthenticated(page);
  await expectUrl(page, /\/(?!auth)/);

  // Navigate and verify
  await navigateToEvents(page);
  await expectUrl(page, '/admin/events');
  await expectElementVisible(page, 'h1:has-text("Events")');
});
```

### Form Submission

```typescript
test('user can signup', async ({ page }) => {
  await page.goto('/auth/signup');
  await disableHtml5Validation(page);

  const testEmail = generateTestEmail();
  await fillForm(page, {
    email: testEmail,
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    full_name: 'Test User',
    team_number: '930',
  });

  await submitForm(page);
  await waitForNavigation(page, /\/auth\/verify-email/);
  await expectElementVisible(page, 'text=/check your email/i');
});
```

### Data Loading

```typescript
test('events table loads data', async ({ page }) => {
  await loginAsAdmin(page);
  await navigateToEvents(page);

  // Wait for data
  await waitForTableData(page, 1);
  await waitForLoadingToComplete(page);

  // Verify
  await expectTableRowCount(page, { min: 1 });
  await expectElementVisible(page, 'table');
});
```

### Error Handling

```typescript
test('form shows validation errors', async ({ page }) => {
  await page.goto('/auth/signup');
  await disableHtml5Validation(page);

  // Submit empty form
  await submitForm(page);

  // Check for errors
  await expectFormError(page, 'email', 'Email is required');
  await expectFormError(page, 'password', 'Password is required');
});
```

## Best Practices

1. **Use helpers consistently** - Don't mix helper functions with raw Playwright calls
2. **Combine helpers** - Chain multiple helpers for complex flows
3. **Add timeouts** - Adjust timeouts for slower operations
4. **Generate unique data** - Use generators to avoid conflicts
5. **Clear state** - Always clear auth state at test start if needed
6. **Wait properly** - Use appropriate wait helpers instead of arbitrary delays

## Contributing

When adding new helpers:

1. Add JSDoc comments with examples
2. Export from the specific module (auth.ts, forms.ts, etc.)
3. Re-export from index.ts
4. Update this README with usage examples
5. Run type-check: `npm run type-check`

## Related Files

- `/tests/helpers/auth.ts` - Authentication utilities
- `/tests/helpers/navigation.ts` - Navigation utilities
- `/tests/helpers/forms.ts` - Form interaction utilities
- `/tests/helpers/waits.ts` - Wait condition utilities
- `/tests/helpers/generators.ts` - Test data generators
- `/tests/helpers/assertions.ts` - Custom assertions
- `/tests/helpers/index.ts` - Central export point
- `/tests/e2e/helpers-demo.spec.ts` - Demo test file
