/**
 * Form Interaction Test Helpers
 *
 * Provides utilities for filling forms, submitting, and validating in E2E tests
 */

import { Page, Locator } from '@playwright/test';

/**
 * Fill a form with provided data
 * Automatically detects input type and fills appropriately
 *
 * @param page - Playwright page instance
 * @param data - Object with field names as keys and values to fill
 * @returns Promise that resolves when all fields are filled
 *
 * @example
 * ```typescript
 * await fillForm(page, {
 *   email: 'user@example.com',
 *   password: 'password123',
 *   full_name: 'Test User',
 *   team_number: '930',
 * });
 * ```
 */
export async function fillForm(
  page: Page,
  data: Record<string, string | number | boolean>
): Promise<void> {
  for (const [fieldName, value] of Object.entries(data)) {
    const input = page.locator(`input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`);

    // Check if input exists
    if (await input.count() === 0) {
      console.warn(`Field "${fieldName}" not found in form`);
      continue;
    }

    // Get input type
    const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
    const inputType = await input.getAttribute('type');

    // Fill based on input type
    if (tagName === 'select') {
      await input.selectOption(String(value));
    } else if (inputType === 'checkbox') {
      const shouldCheck = Boolean(value);
      if (shouldCheck) {
        await input.check();
      } else {
        await input.uncheck();
      }
    } else if (inputType === 'radio') {
      if (value) {
        await page.locator(`input[name="${fieldName}"][value="${value}"]`).check();
      }
    } else {
      await input.fill(String(value));
    }
  }
}

/**
 * Submit a form
 *
 * @param page - Playwright page instance
 * @param formSelector - Optional form selector (defaults to first form)
 * @returns Promise that resolves when form is submitted
 *
 * @example
 * ```typescript
 * await submitForm(page);
 * await submitForm(page, '#signup-form');
 * ```
 */
export async function submitForm(
  page: Page,
  formSelector?: string
): Promise<void> {
  const selector = formSelector || 'form';
  const submitButton = page.locator(`${selector} button[type="submit"]`);
  await submitButton.click();
}

/**
 * Expect a form validation error for a specific field
 *
 * @param page - Playwright page instance
 * @param field - Field name or identifier
 * @param message - Expected error message (can be partial match)
 * @returns Promise that resolves when error is found
 *
 * @example
 * ```typescript
 * await expectFormError(page, 'email', 'Email is required');
 * await expectFormError(page, 'password', 'Password must be at least');
 * ```
 */
export async function expectFormError(
  page: Page,
  field: string,
  message: string
): Promise<Locator> {
  // Try multiple patterns for error messages
  const patterns = [
    // Error next to field
    `[data-field="${field}"] + .error, [data-field="${field}"] ~ .error`,
    // Error as sibling
    `input[name="${field}"] + .error, input[name="${field}"] ~ .error`,
    // Error in parent container
    `.field-${field} .error`,
    // Generic error containing field name
    `.error:has-text("${field}")`,
    // Error containing message
    `.error:has-text("${message}")`,
    // Any visible error
    `text=/${message}/i`,
  ];

  for (const pattern of patterns) {
    const errorElement = page.locator(pattern);
    const count = await errorElement.count();
    if (count > 0) {
      return errorElement.first();
    }
  }

  // Fallback: just find any element with the message
  return page.locator(`text=/${message}/i`);
}

/**
 * Disable HTML5 form validation
 * Useful for testing custom validation logic
 *
 * @param page - Playwright page instance
 * @param formSelector - Optional form selector (defaults to all forms)
 * @returns Promise that resolves when validation is disabled
 *
 * @example
 * ```typescript
 * await disableHtml5Validation(page);
 * await disableHtml5Validation(page, '#signup-form');
 * ```
 */
export async function disableHtml5Validation(
  page: Page,
  formSelector: string = 'form'
): Promise<void> {
  await page.evaluate((selector) => {
    const forms = document.querySelectorAll(selector);
    forms.forEach((form) => {
      if (form instanceof HTMLFormElement) {
        form.noValidate = true;
      }
    });
  }, formSelector);
}

/**
 * Clear a form field
 *
 * @param page - Playwright page instance
 * @param fieldName - Field name
 * @returns Promise that resolves when field is cleared
 *
 * @example
 * ```typescript
 * await clearFormField(page, 'email');
 * ```
 */
export async function clearFormField(
  page: Page,
  fieldName: string
): Promise<void> {
  const input = page.locator(`input[name="${fieldName}"], textarea[name="${fieldName}"]`);
  await input.clear();
}

/**
 * Get form field value
 *
 * @param page - Playwright page instance
 * @param fieldName - Field name
 * @returns Promise that resolves with field value
 *
 * @example
 * ```typescript
 * const email = await getFormFieldValue(page, 'email');
 * ```
 */
export async function getFormFieldValue(
  page: Page,
  fieldName: string
): Promise<string> {
  const input = page.locator(`input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`);
  return await input.inputValue();
}

/**
 * Increment a counter field
 *
 * @param page - Playwright page instance
 * @param fieldName - Field name or counter label
 * @param times - Number of times to increment (default: 1)
 * @returns Promise that resolves when counter is incremented
 *
 * @example
 * ```typescript
 * await incrementCounter(page, 'coral_scored', 5);
 * ```
 */
export async function incrementCounter(
  page: Page,
  fieldName: string,
  times: number = 1
): Promise<void> {
  // Look for increment button
  const incrementButton = page.locator(
    `button[data-counter="${fieldName}"][data-action="increment"], ` +
    `button[aria-label="Increment ${fieldName}"], ` +
    `[data-testid="${fieldName}-increment"]`
  );

  for (let i = 0; i < times; i++) {
    await incrementButton.click();
  }
}

/**
 * Decrement a counter field
 *
 * @param page - Playwright page instance
 * @param fieldName - Field name or counter label
 * @param times - Number of times to decrement (default: 1)
 * @returns Promise that resolves when counter is decremented
 *
 * @example
 * ```typescript
 * await decrementCounter(page, 'coral_scored', 2);
 * ```
 */
export async function decrementCounter(
  page: Page,
  fieldName: string,
  times: number = 1
): Promise<void> {
  // Look for decrement button
  const decrementButton = page.locator(
    `button[data-counter="${fieldName}"][data-action="decrement"], ` +
    `button[aria-label="Decrement ${fieldName}"], ` +
    `[data-testid="${fieldName}-decrement"]`
  );

  for (let i = 0; i < times; i++) {
    await decrementButton.click();
  }
}

/**
 * Select a dropdown option
 *
 * @param page - Playwright page instance
 * @param selectName - Select field name
 * @param optionValue - Option value or label to select
 * @returns Promise that resolves when option is selected
 *
 * @example
 * ```typescript
 * await selectDropdownOption(page, 'alliance', 'red');
 * await selectDropdownOption(page, 'event', '2025txaus');
 * ```
 */
export async function selectDropdownOption(
  page: Page,
  selectName: string,
  optionValue: string
): Promise<void> {
  const select = page.locator(`select[name="${selectName}"]`);
  await select.selectOption(optionValue);
}

/**
 * Check a checkbox
 *
 * @param page - Playwright page instance
 * @param fieldName - Checkbox field name
 * @returns Promise that resolves when checkbox is checked
 *
 * @example
 * ```typescript
 * await checkCheckbox(page, 'left_starting_zone');
 * ```
 */
export async function checkCheckbox(
  page: Page,
  fieldName: string
): Promise<void> {
  const checkbox = page.locator(`input[type="checkbox"][name="${fieldName}"]`);
  await checkbox.check();
}

/**
 * Uncheck a checkbox
 *
 * @param page - Playwright page instance
 * @param fieldName - Checkbox field name
 * @returns Promise that resolves when checkbox is unchecked
 *
 * @example
 * ```typescript
 * await uncheckCheckbox(page, 'left_starting_zone');
 * ```
 */
export async function uncheckCheckbox(
  page: Page,
  fieldName: string
): Promise<void> {
  const checkbox = page.locator(`input[type="checkbox"][name="${fieldName}"]`);
  await checkbox.uncheck();
}

/**
 * Wait for form submission to complete
 * Useful for async form submissions
 *
 * @param page - Playwright page instance
 * @param timeout - Optional timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when submission completes
 *
 * @example
 * ```typescript
 * await submitForm(page);
 * await waitForFormSubmission(page);
 * ```
 */
export async function waitForFormSubmission(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  // Wait for submit button to be re-enabled (indicates submission complete)
  await page.locator('button[type="submit"]:not([disabled])').waitFor({
    state: 'visible',
    timeout,
  }).catch(() => {
    // Ignore timeout - submission may have caused navigation
  });
}
