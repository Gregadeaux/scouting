/**
 * Input Sanitization Utilities
 * Provides secure input validation and encoding for search queries
 * to prevent PostgREST injection attacks.
 */

/**
 * Sanitizes search input for use in PostgREST queries
 *
 * SECURITY: This function prevents PostgREST injection attacks by:
 * 1. Trimming whitespace and limiting length
 * 2. Validating against a whitelist regex (alphanumeric + safe punctuation)
 * 3. URL-encoding the sanitized input
 *
 * @param search - Raw user input from search parameter
 * @returns URL-encoded sanitized string, or null if input is empty/invalid
 * @throws Error if input contains forbidden characters
 *
 * @example
 * ```typescript
 * // Valid inputs:
 * sanitizeSearchInput("Team 930")        → "Team%20930"
 * sanitizeSearchInput("O'Brien")         → "O%27Brien"
 * sanitizeSearchInput("St. Louis")       → "St.%20Louis"
 * sanitizeSearchInput("Pre-K")           → "Pre-K"
 *
 * // Invalid inputs (throws error):
 * sanitizeSearchInput("Team%27OR%271")   → Error
 * sanitizeSearchInput("Team;DROP TABLE") → Error
 * sanitizeSearchInput("1' OR '1'='1")    → Error
 * ```
 */
export function sanitizeSearchInput(search: string): string | null {
  // Trim whitespace and limit length to prevent overflow attacks
  const sanitized = search.trim().substring(0, 100);

  // Return null for empty strings after trimming
  if (!sanitized) {
    return null;
  }

  // Whitelist validation: Only allow alphanumeric characters and safe punctuation
  // that commonly appears in team names, locations, and event names
  // Allowed: letters, numbers, spaces, hyphens, periods, apostrophes
  // Rejected: Special characters that could be used for injection (%, _, ;, etc.)
  if (!/^[a-zA-Z0-9\s\-.']+$/.test(sanitized)) {
    throw new Error(
      'Invalid search term: only alphanumeric characters, spaces, hyphens, periods, and apostrophes allowed'
    );
  }

  // URL-encode the sanitized input to safely embed in PostgREST queries
  // This ensures special characters don't get interpreted as PostgREST operators
  return encodeURIComponent(sanitized);
}

/**
 * Builds a PostgREST OR filter string for ilike pattern matching
 *
 * SECURITY: Uses sanitized search input with URL encoding
 *
 * @param fields - Array of field names to search
 * @param search - Raw user input (will be sanitized internally)
 * @returns PostgREST filter string or null if search is empty
 *
 * @example
 * ```typescript
 * buildSearchFilter(['name', 'email'], 'john')
 * // Returns: "name.ilike.*john*,email.ilike.*john*"
 *
 * buildSearchFilter(['team_name', 'city'], 'Team 930')
 * // Returns: "team_name.ilike.*Team%20930*,city.ilike.*Team%20930*"
 * ```
 */
export function buildSearchFilter(fields: string[], search: string): string | null {
  const sanitized = sanitizeSearchInput(search);

  if (!sanitized) {
    return null;
  }

  // Build OR filter with ilike pattern matching
  // PostgREST uses * for wildcards (not SQL's %)
  return fields.map(field => `${field}.ilike.*${sanitized}*`).join(',');
}

/**
 * Sanitizes numeric search input
 *
 * @param search - Raw user input that should be a number
 * @returns Parsed integer or null if not a valid number
 *
 * @example
 * ```typescript
 * sanitizeNumericSearch("930")    → 930
 * sanitizeNumericSearch("  42  ") → 42
 * sanitizeNumericSearch("abc")    → null
 * sanitizeNumericSearch("123.45") → 123
 * ```
 */
export function sanitizeNumericSearch(search: string): number | null {
  const trimmed = search.trim();
  const parsed = parseInt(trimmed, 10);

  return isNaN(parsed) ? null : parsed;
}
