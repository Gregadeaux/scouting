/**
 * Season Detection Utilities
 *
 * Provides functions to determine which season's types, defaults, and
 * configuration to use based on event year.
 *
 * This enables the match scouting form to dynamically select the correct
 * season-specific data structures.
 */

import type { BasePerformanceData } from '@/types';

// Import 2025 types and defaults
import type {
  AutoPerformance2025,
  TeleopPerformance2025,
  EndgamePerformance2025,
} from '@/types/season-2025';
import {
  DEFAULT_AUTO_PERFORMANCE_2025,
  DEFAULT_TELEOP_PERFORMANCE_2025,
  DEFAULT_ENDGAME_PERFORMANCE_2025,
} from '@/types/season-2025';

// Import 2026 types and defaults
import type {
  AutoPerformance2026,
  TeleopPerformance2026,
  EndgamePerformance2026,
} from '@/types/season-2026';
import {
  DEFAULT_AUTO_PERFORMANCE_2026,
  DEFAULT_TELEOP_PERFORMANCE_2026,
  DEFAULT_ENDGAME_PERFORMANCE_2026,
} from '@/types/season-2026';

// ============================================================================
// Supported Seasons
// ============================================================================

export type SupportedSeason = 2025 | 2026;

export const SUPPORTED_SEASONS: SupportedSeason[] = [2025, 2026];

export const CURRENT_SEASON: SupportedSeason = 2025; // Update when 2026 starts

/**
 * Check if a year is a supported season
 */
export function isSupportedSeason(year: number): year is SupportedSeason {
  return SUPPORTED_SEASONS.includes(year as SupportedSeason);
}

// ============================================================================
// Season-Specific Type Unions
// ============================================================================

export type AutoPerformance = AutoPerformance2025 | AutoPerformance2026;
export type TeleopPerformance = TeleopPerformance2025 | TeleopPerformance2026;
export type EndgamePerformance = EndgamePerformance2025 | EndgamePerformance2026;

// ============================================================================
// Default Values by Season
// ============================================================================

interface SeasonDefaults {
  auto: BasePerformanceData;
  teleop: BasePerformanceData;
  endgame: BasePerformanceData;
}

const SEASON_DEFAULTS: Record<SupportedSeason, SeasonDefaults> = {
  2025: {
    auto: DEFAULT_AUTO_PERFORMANCE_2025,
    teleop: DEFAULT_TELEOP_PERFORMANCE_2025,
    endgame: DEFAULT_ENDGAME_PERFORMANCE_2025,
  },
  2026: {
    auto: DEFAULT_AUTO_PERFORMANCE_2026,
    teleop: DEFAULT_TELEOP_PERFORMANCE_2026,
    endgame: DEFAULT_ENDGAME_PERFORMANCE_2026,
  },
};

/**
 * Get default performance values for a season
 */
export function getSeasonDefaults(year: number): SeasonDefaults {
  if (isSupportedSeason(year)) {
    return SEASON_DEFAULTS[year];
  }
  // Fall back to current season for unsupported years
  console.warn(`Unsupported season ${year}, falling back to ${CURRENT_SEASON}`);
  return SEASON_DEFAULTS[CURRENT_SEASON];
}

/**
 * Get default auto performance for a season
 */
export function getDefaultAutoPerformance(year: number): AutoPerformance {
  if (year === 2026) {
    return DEFAULT_AUTO_PERFORMANCE_2026;
  }
  return DEFAULT_AUTO_PERFORMANCE_2025;
}

/**
 * Get default teleop performance for a season
 */
export function getDefaultTeleopPerformance(year: number): TeleopPerformance {
  if (year === 2026) {
    return DEFAULT_TELEOP_PERFORMANCE_2026;
  }
  return DEFAULT_TELEOP_PERFORMANCE_2025;
}

/**
 * Get default endgame performance for a season
 */
export function getDefaultEndgamePerformance(year: number): EndgamePerformance {
  if (year === 2026) {
    return DEFAULT_ENDGAME_PERFORMANCE_2026;
  }
  return DEFAULT_ENDGAME_PERFORMANCE_2025;
}

// ============================================================================
// Event Year Extraction
// ============================================================================

/**
 * Extract the year from an event key
 * Event keys are formatted as: {year}{event_code}
 * Example: "2025caph" -> 2025
 */
export function getYearFromEventKey(eventKey: string): number {
  const match = eventKey.match(/^(\d{4})/);
  if (match) {
    return parseInt(match[1], 10);
  }
  // Default to current season if parsing fails
  console.warn(`Could not parse year from event key: ${eventKey}`);
  return CURRENT_SEASON;
}

/**
 * Get the season from an event key
 */
export function getSeasonFromEventKey(eventKey: string): SupportedSeason {
  const year = getYearFromEventKey(eventKey);
  if (isSupportedSeason(year)) {
    return year;
  }
  return CURRENT_SEASON;
}

// ============================================================================
// Schema Version Detection
// ============================================================================

/**
 * Get the schema version string for a season
 */
export function getSchemaVersion(year: number): string {
  return `${year}.1`;
}

/**
 * Extract the year from a schema version
 * Schema versions are formatted as: {year}.{minor}
 * Example: "2025.1" -> 2025
 */
export function getYearFromSchemaVersion(schemaVersion: string): number {
  const match = schemaVersion.match(/^(\d{4})\./);
  if (match) {
    return parseInt(match[1], 10);
  }
  return CURRENT_SEASON;
}
