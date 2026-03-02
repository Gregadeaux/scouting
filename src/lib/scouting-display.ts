/**
 * Scouting Display Utilities
 *
 * Shared formatting helpers for displaying scouting data across
 * admin and analytics components.
 */

/**
 * Format a 2026 rating value for display.
 * Returns "N/A" for 0 (not applicable), the numeric value otherwise,
 * or a fallback string if the value is null/undefined.
 */
export function formatRatingDisplay(rating: number | null | undefined, fallback = '-'): string {
  if (rating == null) return fallback;
  if (rating === 0) return 'N/A';
  return String(rating);
}

/**
 * Format a 2026 rating value with a denominator for detail views (e.g., "3/5").
 * Returns "N/A" for 0, "{value}/5" otherwise.
 */
export function formatRatingWithScale(rating: number | null | undefined, scale = 5, fallback = '-'): string {
  if (rating == null) return fallback;
  if (rating === 0) return 'N/A';
  return `${rating}/${scale}`;
}

/**
 * Format shooting time in seconds to a human-readable string.
 * Returns "-" for null/zero values, "M:SS" for >= 60s, "{s}s" otherwise.
 */
export function formatShootingTime(seconds: number | null | undefined): string {
  if (seconds == null || seconds === 0) return '-';
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(0).padStart(2, '0')}`;
  }
  return `${seconds.toFixed(1)}s`;
}
