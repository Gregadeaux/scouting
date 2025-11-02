# Testing Guide

## Overview

This project uses **Vitest** for unit and integration testing, and **Playwright** for end-to-end (E2E) testing. This guide covers how to write, run, and maintain tests.

---

## Test Stack

- **Vitest** - Fast unit test framework with native ESM support
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom matchers for DOM assertions
- **@testing-library/user-event** - User interaction simulation
- **happy-dom** - Fast DOM simulation (alternative: jsdom)
- **Playwright** - E2E browser automation
- **Vitest UI** - Interactive test UI
- **v8** - Code coverage tool

---

## Running Tests

### Unit & Integration Tests (Vitest)

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with UI (interactive browser interface)
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/scouting-data-display.spec.ts
```

### All Tests

```bash
# Run unit tests first, then E2E
npm test && npm run test:e2e
```

---

## Test Structure

### Directory Organization

```
tests/
├── __mocks__/              # Mock factories
│   └── supabase.ts         # Supabase client mocks
├── setup.ts                # Global test setup
├── lib/                    # Unit tests for library code
│   ├── supabase/
│   │   └── validation.test.ts
│   └── repositories/
│       └── team.repository.test.ts
├── components/             # Component tests
│   └── ui/
│       └── Button.test.tsx
└── *.spec.ts               # Playwright E2E tests
```

### File Naming Conventions

- **Unit tests**: `*.test.ts` or `*.test.tsx`
- **E2E tests**: `*.spec.ts`
- **Mocks**: `*.ts` in `__mocks__/` directory

---

## Writing Tests

### 1. Unit Tests (Functions & Services)

**Example: Testing validation functions**

```typescript
import { describe, it, expect } from 'vitest';
import { validateAutoPerformance2025 } from '@/lib/supabase/validation';

describe('validateAutoPerformance2025', () => {
  it('should validate correct data', () => {
    const validData = {
      schema_version: '2025.1',
      left_starting_zone: true,
      coral_level_1: 2,
      // ... other fields
    };

    const result = validateAutoPerformance2025(validData);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid schema version', () => {
    const invalidData = {
      schema_version: '2024.1', // Wrong version
      left_starting_zone: true,
    };

    const result = validateAutoPerformance2025(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

### 2. Repository Tests (Database Layer)

**Example: Testing repository with mocked Supabase**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TeamRepository } from '@/lib/repositories/team.repository';
import { createMockSupabaseClient, asMockSupabaseClient } from '../../__mocks__/supabase';

describe('TeamRepository', () => {
  let repository: TeamRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient({ data: mockTeam });
    repository = new TeamRepository(asMockSupabaseClient(mockClient));
  });

  it('should find team by number', async () => {
    const team = await repository.findByTeamNumber(930);

    expect(team).toBeDefined();
    expect(team?.team_number).toBe(930);
    expect(mockClient.from).toHaveBeenCalledWith('teams');
  });
});
```

### 3. Component Tests (React)

**Example: Testing Button component**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click Me</Button>);

    expect(screen.getByRole('button')).toHaveTextContent('Click Me');
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick} disabled>Disabled</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

### 4. E2E Tests (Playwright)

**Example: Testing full user flow**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Scouting Data Display', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('**/admin');
  });

  test('should display data correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/scouting-data-demo');

    await expect(page.locator('h1')).toContainText('JSONB Data Display');
    await expect(page.locator('text=Auto Performance')).toBeVisible();
  });
});
```

---

## Mocking Patterns

### Mocking Supabase Client

**Using the mock factory:**

```typescript
import { createMockSupabaseClient, asMockSupabaseClient } from '../__mocks__/supabase';

// Basic mock with data
const mockClient = createMockSupabaseClient({
  data: { id: '123', name: 'Test' },
});

// Mock with error
const mockClient = createMockSupabaseClient({
  data: null,
  error: new Error('Database error'),
});

// Mock with count
const mockClient = createMockSupabaseClient({
  data: [],
  count: 150,
});

// Use in repository
const repository = new TeamRepository(asMockSupabaseClient(mockClient));
```

### Mocking Next.js Router

Already configured in `tests/setup.ts`:

```typescript
// Use in tests
import { useRouter } from 'next/navigation';

// Router is automatically mocked
// Access mock in tests:
const router = useRouter();
expect(router.push).toHaveBeenCalledWith('/dashboard');
```

### Mocking Environment Variables

Already configured in `tests/setup.ts`:

```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
```

### Mocking Dates/Time

```typescript
import { mockDate, restoreDate } from '../setup';

it('should use mocked date', () => {
  mockDate('2025-01-15T12:00:00Z');

  const now = new Date();
  expect(now.toISOString()).toBe('2025-01-15T12:00:00.000Z');

  restoreDate();
});
```

---

## Testing Best Practices

### 1. Test Organization

- **Describe blocks**: Group related tests
- **Clear test names**: Use "should ..." pattern
- **Arrange-Act-Assert**: Structure tests clearly

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', () => {
      // Arrange
      const userData = { name: 'John', email: 'john@example.com' };

      // Act
      const user = createUser(userData);

      // Assert
      expect(user).toBeDefined();
      expect(user.name).toBe('John');
    });
  });
});
```

### 2. Test Independence

- Each test should be independent
- Use `beforeEach` to reset state
- Don't rely on test execution order

```typescript
describe('Counter', () => {
  let counter: Counter;

  beforeEach(() => {
    counter = new Counter(); // Fresh instance for each test
  });

  it('should start at zero', () => {
    expect(counter.value).toBe(0);
  });

  it('should increment', () => {
    counter.increment();
    expect(counter.value).toBe(1);
  });
});
```

### 3. Test Coverage Goals

- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

**Viewing Coverage:**

```bash
npm run test:coverage
# Opens: coverage/index.html
```

### 4. What to Test

**✅ DO Test:**

- Public API functions
- User interactions
- Edge cases and error handling
- Data validation
- Component rendering
- Business logic

**❌ DON'T Test:**

- Third-party libraries
- Implementation details
- Internal private methods (test through public API)
- Trivial getters/setters

### 5. Test Data

**Use mock data from `__mocks__/supabase.ts`:**

```typescript
import { mockTeam, mockEvent, mockAutoPerformance2025 } from '../../__mocks__/supabase';

it('should process team data', () => {
  const result = processTeam(mockTeam);
  expect(result).toBeDefined();
});
```

### 6. Async Testing

**Always use async/await:**

```typescript
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

**Don't forget to await user events:**

```typescript
it('should handle click', async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button'));
  // assertions...
});
```

---

## Common Testing Patterns

### Testing Form Submissions

```typescript
it('should submit form with valid data', async () => {
  const handleSubmit = vi.fn();
  const user = userEvent.setup();

  render(<MyForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.type(screen.getByLabelText('Email'), 'john@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    email: 'john@example.com',
  });
});
```

### Testing Error States

```typescript
it('should display error message on failure', async () => {
  const error = new Error('Network error');
  mockClient = createMockSupabaseClient({ data: null, error });

  const { result } = renderHook(() => useData());

  await waitFor(() => {
    expect(result.current.error).toBe(error);
  });
});
```

### Testing Loading States

```typescript
it('should show loading state', () => {
  render(<DataComponent />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### Testing Conditional Rendering

```typescript
it('should render differently based on props', () => {
  const { rerender } = render(<Component isOpen={false} />);
  expect(screen.queryByText('Content')).not.toBeInTheDocument();

  rerender(<Component isOpen={true} />);
  expect(screen.getByText('Content')).toBeInTheDocument();
});
```

---

## Debugging Tests

### 1. Using `screen.debug()`

```typescript
it('should render correctly', () => {
  render(<MyComponent />);

  // Print current DOM
  screen.debug();

  // Print specific element
  screen.debug(screen.getByRole('button'));
});
```

### 2. Using Vitest UI

```bash
npm run test:ui
```

Opens a browser interface where you can:
- See test results in real-time
- Filter and search tests
- View test execution timeline
- Inspect failures

### 3. Running Single Test

```typescript
// Use .only to run just this test
it.only('should run only this test', () => {
  // ...
});

// Use .skip to skip a test
it.skip('should skip this test', () => {
  // ...
});
```

### 4. Verbose Output

```bash
npm test -- --reporter=verbose
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
```

---

## Troubleshooting

### Tests Failing Locally But Passing in CI

- Check for environment-specific issues
- Ensure clean state between tests
- Check for timezone/locale differences

### "Cannot find module" Errors

- Verify path aliases in `vitest.config.ts` match `tsconfig.json`
- Ensure imports use `@/` prefix for absolute imports

### Timeout Errors

```typescript
// Increase timeout for slow tests
it('should handle slow operation', async () => {
  // Test code...
}, 30000); // 30 seconds
```

### Mock Not Working

```typescript
// Ensure you're calling vi.clearAllMocks() in beforeEach
beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro)
- [Playwright Documentation](https://playwright.dev/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

---

## Coverage Reports

After running `npm run test:coverage`, open:

```
coverage/index.html
```

This shows:
- Overall coverage percentages
- Per-file coverage
- Uncovered lines highlighted in red
- Clickable file navigation

---

## Quick Reference

### Common Matchers

```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toStrictEqual(expected);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(3.5);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3);

// Strings
expect(value).toMatch(/pattern/);
expect(value).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// Exceptions
expect(() => throwError()).toThrow();
expect(() => throwError()).toThrow(Error);
expect(() => throwError()).toThrow('error message');

// Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();

// DOM (jest-dom)
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveClass('className');
expect(element).toHaveTextContent('text');
expect(element).toHaveAttribute('attr', 'value');
```

### Common Queries

```typescript
// By role (preferred)
screen.getByRole('button', { name: /submit/i });

// By label text
screen.getByLabelText('Email');

// By placeholder
screen.getByPlaceholderText('Enter email');

// By text
screen.getByText('Hello World');

// By test ID
screen.getByTestId('custom-element');

// Query variants:
// getBy* - throws if not found
// queryBy* - returns null if not found
// findBy* - async, waits for element
```

---

**Last Updated**: 2025-10-29
