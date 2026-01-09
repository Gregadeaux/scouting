/**
 * Season Configuration Types
 * Types for the season_config database table
 */

/**
 * Full season configuration with all fields
 * Matches the season_config database table
 */
export interface SeasonConfig {
  year: number;
  game_name: string;
  game_description?: string;

  // JSONB schemas for validation
  auto_schema?: Record<string, unknown>;
  teleop_schema?: Record<string, unknown>;
  endgame_schema?: Record<string, unknown>;
  capabilities_schema?: Record<string, unknown>;

  // Match timing (in seconds)
  match_duration_seconds: number;
  auto_duration_seconds: number;
  teleop_duration_seconds: number;

  // Important dates (ISO date strings)
  kickoff_date?: string;
  championship_start_date?: string;
  championship_end_date?: string;

  // Documentation links
  rules_manual_url?: string;
  game_animation_url?: string;

  // Notes
  notes?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

/**
 * Season configuration for list view (excludes large schema objects)
 */
export interface SeasonConfigListItem {
  year: number;
  game_name: string;
  game_description?: string;
  match_duration_seconds: number;
  auto_duration_seconds: number;
  teleop_duration_seconds: number;
  kickoff_date?: string;
  championship_start_date?: string;
  championship_end_date?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fields that can be updated via the admin UI
 * Note: Schemas should be updated via code for type safety
 */
export interface SeasonConfigUpdate {
  game_name?: string;
  game_description?: string;
  kickoff_date?: string;
  championship_start_date?: string;
  championship_end_date?: string;
  rules_manual_url?: string;
  game_animation_url?: string;
  notes?: string;
}

/**
 * Season status based on dates
 */
export type SeasonStatus = 'upcoming' | 'active' | 'past';

/**
 * Get the status of a season based on current date
 */
export function getSeasonStatus(config: SeasonConfigListItem): SeasonStatus {
  const now = new Date();

  if (config.kickoff_date) {
    const kickoff = new Date(config.kickoff_date);
    if (now < kickoff) {
      return 'upcoming';
    }
  }

  if (config.championship_end_date) {
    const championshipEnd = new Date(config.championship_end_date);
    if (now > championshipEnd) {
      return 'past';
    }
  }

  return 'active';
}
