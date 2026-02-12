/**
 * Championship-Level FRC Scouting System Type Definitions
 * Based on PostgreSQL + JSONB hybrid architecture
 *
 * Type Philosophy:
 * - Core entities use strongly-typed interfaces
 * - Season-specific data uses generic JSONB with year-specific subtypes
 * - Multi-scout consolidation types
 * - Offline sync support types
 */

// ============================================================================
// CORE ENTITY TYPES (Evergreen Data)
// ============================================================================

export interface Team {
  team_number: number;
  team_key: string;
  team_name: string;
  team_nickname?: string;
  city?: string;
  state_province?: string;
  country?: string;
  postal_code?: string;
  rookie_year?: number;
  website?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  event_key: string;
  event_name: string;
  event_code: string;
  year: number;
  event_type: EventType;
  district?: string;
  week?: number;
  city?: string;
  state_province?: string;
  country?: string;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  manual_schedule?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type EventType =
  | 'regional'
  | 'district'
  | 'district_championship'
  | 'championship_subdivision'
  | 'championship'
  | 'offseason';

/**
 * TBA Video metadata
 * Videos linked to matches from The Blue Alliance API
 */
export interface TBAVideo {
  key: string;
  type: 'youtube' | 'tba';
  url?: string;
}

export interface MatchSchedule {
  match_id: number;
  event_key: string;
  match_key: string;
  comp_level: CompLevel;
  set_number?: number;
  match_number: number;

  // Alliance composition
  red_1?: number;
  red_2?: number;
  red_3?: number;
  blue_1?: number;
  blue_2?: number;
  blue_3?: number;

  // Official results
  red_score?: number;
  blue_score?: number;
  winning_alliance?: 'red' | 'blue' | 'tie';

  // Timing
  scheduled_time?: string;
  actual_time?: string;
  post_result_time?: string;

  // TBA detailed data
  /**
   * Game-specific scoring breakdown from TBA API
   * Structure varies by year/game (e.g., 2025 Reefscape, 2024 Crescendo)
   * Contains alliance-specific scoring details, point breakdowns, fouls, etc.
   * Example: { red: { totalPoints: 150, autoPoints: 45, ... }, blue: { ... } }
   */
  score_breakdown?: Record<string, unknown>;

  /**
   * Array of video links associated with this match
   * Videos sourced from YouTube, TBA, and other platforms
   */
  videos?: TBAVideo[];

  created_at?: string;
  updated_at?: string;
}

export type CompLevel = 'qm' | 'ef' | 'qf' | 'sf' | 'f';

// ============================================================================
// SCOUTING SESSION TYPES (Live Session Sync)
// ============================================================================

export interface ScoutingSession {
  id: string;
  event_key: string;
  current_match_number: number;
  comp_level: CompLevel;
  session_data: Record<string, unknown>;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// SCOUTING DATA TYPES (Hybrid Structure)
// ============================================================================

/**
 * Match Scouting Observation
 * Generic JSONB fields (auto_performance, teleop_performance, endgame_performance)
 * are typed more specifically in season-specific type files
 */
export interface MatchScouting<
  TAutoPerf = JSONBData,
  TTeleopPerf = JSONBData,
  TEndgamePerf = JSONBData
> {
  id: string;
  match_id: number;
  match_key: string; // FK to match_schedule.match_key (NOT NULL)
  team_number: number;
  scout_name: string;
  scouter_id?: string; // FK to scouters.id (UUID) - replaces scout_name
  device_id?: string;

  // Universal fixed fields
  alliance_color: 'red' | 'blue';
  starting_position?: 1 | 2 | 3;

  // Universal reliability tracking
  robot_disconnected: boolean;
  robot_disabled: boolean;
  robot_tipped: boolean;
  foul_count: number;
  tech_foul_count: number;
  yellow_card: boolean;
  red_card: boolean;

  // Season-specific JSONB fields
  auto_performance: TAutoPerf;
  teleop_performance: TTeleopPerf;
  endgame_performance: TEndgamePerf;

  // Universal qualitative assessments (1-5 scale)
  defense_rating?: number;
  driver_skill_rating?: number;
  speed_rating?: number;

  // Free-form observations
  strengths?: string;
  weaknesses?: string;
  notes?: string;

  // Scout performance tracking
  confidence_level?: number;

  created_at?: string;
  updated_at?: string;
}

/**
 * Pit Scouting Data
 */
export interface PitScouting<TCapabilities = JSONBData, TAutoCapabilities = JSONBData> {
  id: string;
  team_number: number;
  event_key: string;

  // Fixed physical characteristics
  drive_train?: string;
  drive_motors?: string;
  programming_language?: string;
  robot_weight_lbs?: number;
  height_inches?: number;
  width_inches?: number;
  length_inches?: number;

  // Year-specific capabilities (JSONB)
  robot_capabilities?: TCapabilities;
  autonomous_capabilities?: TAutoCapabilities;

  // Media and documentation
  photo_urls?: string[];
  robot_features?: string;
  team_strategy?: string;
  preferred_starting_position?: number;

  // Interview notes
  team_goals?: string;
  team_comments?: string;
  scouting_notes?: string;

  // Metadata
  scouted_by: string;
  scouted_at?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// CONFIGURATION & METADATA TYPES
// ============================================================================

// SeasonConfig types are exported from season-config.ts via the wildcard export at the end of this file

// ============================================================================
// ANALYTICS & STATISTICS TYPES
// ============================================================================

export interface TeamStatistics {
  id: string;
  team_number: number;
  event_key?: string; // Made optional for season-wide stats

  // Match counts
  matches_scouted: number;
  matches_played_official: number;

  // Average scores
  avg_total_score?: number;
  avg_auto_score?: number;
  avg_teleop_score?: number;
  avg_endgame_score?: number;

  // Calculated ratings (Team 1678 methodology)
  opr?: number; // Offensive Power Rating
  dpr?: number; // Defensive Power Rating
  ccwm?: number; // Calculated Contribution to Winning Margin

  // Success rates (0-100 percentage)
  endgame_success_rate?: number;
  auto_mobility_rate?: number;
  reliability_score?: number;

  // Qualitative averages
  avg_defense_rating?: number;
  avg_driver_skill?: number;
  avg_speed_rating?: number;

  // Component OPR (from TBA score_breakdown, 2026+)
  auto_opr?: number;
  teleop_hub_opr?: number;
  endgame_opr?: number;
  total_hub_opr?: number;

  // Pick list rankings
  first_pick_ability?: number;
  second_pick_ability?: number;
  overall_rank?: number;

  // Full aggregated statistics (JSONB)
  aggregated_metrics?: AggregatedStatistics;

  // Calculation metadata
  last_calculated_at?: string;
  calculation_method: string;

  created_at?: string;
  updated_at?: string;
}

/**
 * Consolidated Match Data View
 * Aggregates multiple scout observations for a single team in a single match
 */
export interface ConsolidatedMatchData {
  match_id: number;
  team_number: number;
  alliance_color: 'red' | 'blue';
  event_key: string;
  year: number;

  // Scout count
  scout_count: number;

  // Majority vote booleans
  robot_disconnected: boolean;
  robot_disabled: boolean;
  robot_tipped: boolean;

  // Averaged counts
  avg_foul_count: number;
  avg_tech_foul_count: number;

  // Averaged ratings
  avg_defense_rating?: number;
  avg_driver_skill?: number;
  avg_speed_rating?: number;

  // JSONB aggregations (array of all scout observations)
  all_auto_data: JSONBData[];
  all_teleop_data: JSONBData[];
  all_endgame_data: JSONBData[];

  // Combined notes
  combined_notes: string;
  scouts: string; // Comma-separated list of scout names

  // Timing
  last_updated: string;
}

// ============================================================================
// OFFLINE SYNC TYPES
// ============================================================================

export interface SyncQueueItem {
  id: string;
  device_id: string;
  data_type: string;
  data_payload: JSONBData;

  // Sync status
  sync_status: SyncStatus;
  sync_error?: string;
  retry_count: number;

  // Timing
  created_at: string;
  synced_at?: string;

  // Conflict resolution
  conflicts?: JSONBData;
  resolved_by?: string;
  resolution_notes?: string;
}

export type SyncStatus = 'pending' | 'processing' | 'synced' | 'failed' | 'conflict';

// ============================================================================
// GENERIC JSONB & UTILITY TYPES
// ============================================================================

/**
 * Generic JSONB data type
 * Use this for untyped JSONB columns
 * For season-specific typing, create specific interfaces (see season-2025.ts)
 */
export type JSONBData = Record<string, unknown>;

/**
 * Base structure for season-specific JSONB data
 * All season-specific performance data should include a schema_version
 */
export interface BasePerformanceData {
  schema_version: string;
  notes?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// ============================================================================
// QUERY FILTER TYPES
// ============================================================================

export interface MatchScoutingFilters {
  match_id?: number;
  team_number?: number;
  event_key?: string;
  scout_name?: string;
  alliance_color?: 'red' | 'blue';
  limit?: number;
  offset?: number;
}

export interface TeamStatisticsFilters {
  team_number?: number;
  event_key?: string;
  year?: number;
  min_matches?: number;
  sort_by?: 'opr' | 'dpr' | 'ccwm' | 'first_pick_ability';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ============================================================================
// FORM & SUBMISSION TYPES
// ============================================================================

/**
 * Match scouting form submission (before database insert)
 */
export interface MatchScoutingSubmission<
  TAutoPerf = JSONBData,
  TTeleopPerf = JSONBData,
  TEndgamePerf = JSONBData
> {
  match_id: number;
  team_number: number;
  scout_name: string;
  device_id?: string;
  alliance_color: 'red' | 'blue';
  starting_position?: 1 | 2 | 3;
  robot_disconnected?: boolean;
  robot_disabled?: boolean;
  robot_tipped?: boolean;
  foul_count?: number;
  tech_foul_count?: number;
  yellow_card?: boolean;
  red_card?: boolean;
  auto_performance: TAutoPerf;
  teleop_performance: TTeleopPerf;
  endgame_performance: TEndgamePerf;
  defense_rating?: number;
  driver_skill_rating?: number;
  speed_rating?: number;
  strengths?: string;
  weaknesses?: string;
  notes?: string;
  confidence_level?: number;
}

/**
 * Pit scouting form submission
 */
export interface PitScoutingSubmission<TCapabilities = JSONBData, TAutoCapabilities = JSONBData> {
  team_number: number;
  event_key: string;
  drive_train?: string;
  drive_motors?: string;
  programming_language?: string;
  robot_weight_lbs?: number;
  height_inches?: number;
  width_inches?: number;
  length_inches?: number;
  robot_capabilities?: TCapabilities;
  autonomous_capabilities?: TAutoCapabilities;
  photo_urls?: string[];
  robot_features?: string;
  team_strategy?: string;
  preferred_starting_position?: number;
  team_goals?: string;
  team_comments?: string;
  scouting_notes?: string;
  scouted_by: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// AGGREGATED STATISTICS TYPES
// ============================================================================

export interface AggregatedStatistics {
  schema_version: string;
  team_number: number;
  event_key: string | null;
  matches_played: number;
  matches_expected: number;

  // Auto statistics
  auto_stats: {
    avg_points: number;
    std_dev: number;
    min: number;
    max: number;
    consistency_score: number; // 0-100
  };

  // Teleop statistics
  teleop_stats: {
    avg_points: number;
    std_dev: number;
    avg_cycles: number;
    avg_cycle_time: number;
    efficiency_score: number; // 0-100
  };

  // Endgame statistics
  endgame_stats: {
    avg_points: number;
    success_rate: number; // 0-100
  };

  // Reliability metrics
  reliability: {
    played_percentage: number; // 0-100
    breakdown_rate: number; // 0-100
    defense_rating: number; // 0-10
  };

  // Trends
  trends: {
    direction: 'improving' | 'stable' | 'declining';
    confidence: number; // 0-1
  };

  // Rankings (within event)
  percentile_rankings?: {
    auto: number; // 0-100 (higher = better)
    teleop: number;
    endgame: number;
    overall: number;
  };

  last_calculated: string; // ISO timestamp
}

// Scout performance for multi-scout consolidation
export interface ScoutingSubmission {
  scout_name: string;
  timestamp: string;
  match_key?: string;
  team_number: number;
  data_type: 'match' | 'pit';
  accuracy_score?: number; // 0-1
  agreement_score?: number; // 0-1
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// This allows importing everything with: import * as ScoutingTypes from '@/types'
export type * from './season-2025';
export type * from './season-2026';
export type * from './season-config';
export type * from './auth';
export type * from './team-detail';
export type * from './scouter';
export type * from './validation';
export type * from './scouting-session';
export { getSeasonStatus } from './season-config';
export {
  ALL_STATION_KEYS,
  createDefaultOrchestrationState,
  parseStationKey,
  stationLabel,
  isOrchestrationState,
  getOrchestration,
} from './scouting-session';
