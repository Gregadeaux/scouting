/**
 * Type definitions for Event Detail views and analytics
 */

import type { Team, MatchSchedule, Event } from './index';

/**
 * Complete event details including teams, matches, and coverage statistics
 */
export interface EventDetail {
  event: EventInfo;
  teams: Team[];
  matches: MatchWithScoutingStatus[];
  coverage: ScoutingCoverageStats;
}

/**
 * Extended event information
 */
export interface EventInfo extends Event {
  // Additional computed fields
  total_teams?: number;
  total_matches?: number;
  current_match?: string; // Current match being played
  next_match?: string; // Next scheduled match
  is_active?: boolean; // Whether event is currently happening
  tba_last_modified?: string; // Last time TBA data was updated
}

/**
 * Match schedule with scouting status overlay
 */
export interface MatchWithScoutingStatus extends MatchSchedule {
  scouting_status: {
    red_1: boolean; // Has match scouting data for red alliance position 1
    red_2: boolean;
    red_3: boolean;
    blue_1: boolean;
    blue_2: boolean;
    blue_3: boolean;
  };
  scout_count: number; // Total number of scouts who recorded this match
  consolidation_available: boolean; // Whether multi-scout data can be consolidated
}

/**
 * Scouting coverage statistics for an event
 */
export interface ScoutingCoverageStats {
  // Match scouting coverage
  total_matches: number;
  matches_played: number; // Matches that have been played
  matches_scouted: number; // Matches with at least one scout report
  matches_fully_scouted: number; // Matches with all 6 robots scouted
  scouting_percentage: number; // matches_scouted / matches_played * 100
  full_coverage_percentage: number; // matches_fully_scouted / matches_played * 100

  // Team coverage
  total_teams: number;
  teams_with_pit_scouting: number;
  teams_with_match_scouting: number;
  teams_with_both: number; // Teams with both pit and match scouting
  pit_scouting_percentage: number;
  match_scouting_percentage: number;

  // Scout performance
  unique_scouts: number; // Number of unique scout names
  average_scouts_per_match: number;
  scouts_per_match: {
    [matchKey: string]: number; // How many scouts recorded data for this match
  };

  // Data quality metrics
  high_confidence_reports: number; // Reports with confidence_level >= 4
  low_confidence_reports: number; // Reports with confidence_level <= 2
  reports_with_notes: number; // Reports that include notes
  average_confidence_level: number;

  // Coverage by match type
  coverage_by_comp_level: {
    qm: { total: number; scouted: number; percentage: number };
    ef?: { total: number; scouted: number; percentage: number };
    qf?: { total: number; scouted: number; percentage: number };
    sf?: { total: number; scouted: number; percentage: number };
    f?: { total: number; scouted: number; percentage: number };
  };
}

/**
 * Team performance summary at an event
 */
export interface TeamEventSummary {
  team_number: number;
  team_name: string;

  // Match record
  matches_played: number;
  wins: number;
  losses: number;
  ties: number;
  ranking?: number; // Current event ranking

  // Scouting coverage
  matches_scouted: number;
  pit_scouted: boolean;
  average_scout_confidence: number;

  // Performance metrics (aggregated from scouting data)
  average_auto_points?: number;
  average_teleop_points?: number;
  average_endgame_points?: number;
  average_total_points?: number;

  // Qualitative ratings (1-5 scale averages)
  average_defense_rating?: number;
  average_driver_skill?: number;
  average_speed_rating?: number;

  // Reliability
  disconnect_rate: number; // Percentage of matches with disconnects
  disabled_rate: number;
  tipped_rate: number;
  average_fouls: number;
  average_tech_fouls: number;
}

/**
 * Match-by-match team performance
 */
export interface TeamMatchHistory {
  team_number: number;
  event_key: string;
  matches: Array<{
    match_key: string;
    comp_level: string;
    match_number: number;
    alliance_color: 'red' | 'blue';
    alliance_position: 1 | 2 | 3;
    result?: 'win' | 'loss' | 'tie';
    alliance_score?: number;
    opponent_score?: number;
    scouted: boolean;
    scout_reports: number; // Number of scouts who recorded this match
    // Summary metrics from consolidated data
    auto_points?: number;
    teleop_points?: number;
    endgame_points?: number;
    total_points?: number;
  }>;
}

/**
 * Event timeline entry
 */
export interface EventTimelineEntry {
  timestamp: string;
  type: 'match_played' | 'match_scouted' | 'pit_scouted' | 'import_started' | 'import_completed' | 'import_failed';
  match_key?: string;
  team_number?: number;
  scout_name?: string;
  details?: string;
}

/**
 * Data freshness information
 */
export interface DataFreshness {
  event_key: string;

  // TBA data freshness
  tba_last_updated?: string; // When we last fetched from TBA
  tba_data_timestamp?: string; // TBA's last modified timestamp
  tba_sync_needed: boolean; // Whether TBA has newer data

  // Local data timestamps
  last_match_scouted?: string;
  last_pit_scouted?: string;
  last_consolidation?: string; // When multi-scout data was last consolidated

  // Import job status
  active_import_job?: {
    job_id: string;
    job_type: string;
    status: string;
    progress_percent: number;
  };

  last_successful_import?: {
    job_id: string;
    completed_at: string;
    items_imported: number;
  };
}

/**
 * Filter options for event detail views
 */
export interface EventDetailFilters {
  // Team filters
  team_numbers?: number[]; // Show only specific teams

  // Match filters
  comp_level?: string[]; // Show only specific competition levels
  scouting_status?: 'all' | 'scouted' | 'not_scouted' | 'partial';

  // Time filters
  matches_after?: string; // ISO timestamp
  matches_before?: string;

  // Coverage filters
  min_scout_reports?: number; // Minimum number of scout reports per match
  min_confidence_level?: number; // Minimum confidence level

  // Sorting
  sort_by?: 'match_number' | 'time' | 'scouting_coverage' | 'team_number';
  sort_direction?: 'asc' | 'desc';
}

/**
 * Aggregated event statistics
 */
export interface EventStatistics {
  event_key: string;

  // Match statistics
  total_matches: number;
  qualification_matches: number;
  playoff_matches: number;
  matches_completed: number;

  // Scoring statistics (from TBA data)
  highest_match_score?: number;
  average_match_score?: number;
  average_winning_margin?: number;

  // Scouting statistics
  total_scout_reports: number;
  unique_scouts: number;
  reports_per_match: number;
  reports_per_team: number;

  // Data quality
  high_quality_reports: number; // High confidence, includes notes
  medium_quality_reports: number;
  low_quality_reports: number;
}