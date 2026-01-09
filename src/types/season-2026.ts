/**
 * 2026 Season Type Definitions
 *
 * PLACEHOLDER FILE - UPDATE AFTER GAME REVEAL (January 10, 2026)
 *
 * This file contains stub types that will compile and allow the full pipeline
 * to be tested before the actual game mechanics are revealed. After the game
 * reveal, update the following:
 * - Game piece types and names
 * - Scoring location types
 * - Auto/Teleop/Endgame specific fields
 * - Point values
 * - Capability interfaces
 */

import { BasePerformanceData, MatchScouting, PitScouting } from './index';

// ============================================================================
// GAME PIECE & SCORING LOCATION TYPES (PLACEHOLDER)
// ============================================================================

/**
 * PLACEHOLDER: Update with actual game piece names after reveal
 * Example from 2025: 'coral' | 'algae'
 */
export type GamePieceType2026 = 'piece_a' | 'piece_b';

/**
 * PLACEHOLDER: Update with actual scoring locations after reveal
 * Example from 2025: 'L1' | 'L2' | 'L3' | 'L4'
 */
export type ScoringLocation2026 = 'low' | 'mid' | 'high';

/**
 * PLACEHOLDER: Update with actual endgame action types after reveal
 * Example from 2025: 'shallow' | 'deep' (for cage climbing)
 */
export type EndgameAction2026 = 'action_1' | 'action_2' | 'action_3';

/**
 * PLACEHOLDER: Update with actual pickup locations after reveal
 * Example from 2025: 'ground' | 'station' | 'reef' | 'lollipop'
 */
export type PickupLocation2026 = 'ground' | 'station';

// ============================================================================
// AUTONOMOUS PERIOD
// ============================================================================

export interface AutoPerformance2026 extends BasePerformanceData {
  schema_version: '2026.1';

  // Mobility (common across most FRC games)
  left_starting_zone: boolean;

  // PLACEHOLDER: Scoring fields - update after reveal
  // Example structure based on typical FRC games
  pieces_scored_low: number;
  pieces_scored_mid: number;
  pieces_scored_high: number;
  pieces_missed: number;

  // Preloaded piece tracking (common pattern)
  preloaded_piece_type?: GamePieceType2026;
  preloaded_piece_scored: boolean;

  // Notes
  notes?: string;
}

// ============================================================================
// TELEOPERATED PERIOD
// ============================================================================

export interface TeleopPerformance2026 extends BasePerformanceData {
  schema_version: '2026.1';

  // PLACEHOLDER: Scoring fields - update after reveal
  pieces_scored_low: number;
  pieces_scored_mid: number;
  pieces_scored_high: number;
  pieces_missed: number;

  // Cycle Tracking (common metric)
  cycles_completed: number;

  // Pickup Locations - PLACEHOLDER
  ground_pickups: number;
  station_pickups: number;

  // Defense (common fields)
  defense_time_seconds: number;
  defense_effectiveness?: 'none' | 'minimal' | 'moderate' | 'effective' | 'dominant';
  defended_by_opponent_seconds: number;

  // Penalties
  penalties_caused: number;

  // Notes
  notes?: string;
}

// ============================================================================
// ENDGAME PERIOD
// ============================================================================

export interface EndgamePerformance2026 extends BasePerformanceData {
  schema_version: '2026.1';

  // PLACEHOLDER: Endgame action - update after reveal
  // Could be climbing, parking, balancing, etc.
  endgame_attempted: boolean;
  endgame_successful: boolean;
  endgame_action_achieved?: EndgameAction2026;

  // Timing
  endgame_start_time_seconds?: number;
  endgame_completion_time_seconds?: number;

  // Calculated Points (for reference)
  endgame_points: number;

  // Cooperation
  cooperation_with_alliance?: string;

  // Notes
  notes?: string;
}

// ============================================================================
// PIT SCOUTING - ROBOT CAPABILITIES
// ============================================================================

export interface RobotCapabilities2026 {
  schema_version: '2026.1';

  // Game Piece Handling - PLACEHOLDER
  can_handle_piece_a: boolean;
  can_handle_piece_b: boolean;
  can_handle_both_simultaneously: boolean;
  preferred_game_piece?: GamePieceType2026;

  // Scoring Capabilities - PLACEHOLDER
  can_score: boolean;
  can_score_low: boolean;
  can_score_mid: boolean;
  can_score_high: boolean;
  max_scoring_location?: ScoringLocation2026;

  // Pickup Capabilities
  can_pickup_from_ground: boolean;
  can_pickup_from_station: boolean;
  pickup_mechanism_type?: string;

  // Cycle Performance
  estimated_cycle_time_seconds?: number;
  scoring_consistency?: 'low' | 'medium' | 'high';

  // Special Features
  has_vision_targeting: boolean;
  has_automated_scoring: boolean;
  programming_features?: string[];

  // Notes
  notes?: string;
}

export interface AutonomousCapabilities2026 {
  schema_version: '2026.1';

  // Autonomous Scoring
  auto_scoring_capability: boolean;
  auto_max_pieces: number;
  auto_preferred_starting_position?: 1 | 2 | 3;

  // Autonomous Features
  auto_uses_vision: boolean;
  auto_path_planning: boolean;
  auto_multi_piece_capable: boolean;

  // Reliability
  auto_success_rate_estimate?: number;
  auto_tested_at_competitions: boolean;

  // Strategy
  auto_strategy_description?: string;

  // Notes
  notes?: string;
}

export interface EndgameCapabilities2026 {
  schema_version: '2026.1';

  // PLACEHOLDER: Endgame capability - update after reveal
  can_perform_endgame: boolean;
  max_endgame_action?: EndgameAction2026;

  // Reliability
  endgame_success_rate_estimate?: number;
  endgame_time_estimate_seconds?: number;

  // Strategy
  endgame_preference?: EndgameAction2026 | 'situational';

  // Notes
  notes?: string;
}

// ============================================================================
// TYPED MATCH SCOUTING FOR 2026
// ============================================================================

/**
 * Fully-typed Match Scouting entry for 2026 season
 */
export type MatchScouting2026 = MatchScouting<
  AutoPerformance2026,
  TeleopPerformance2026,
  EndgamePerformance2026
>;

/**
 * Fully-typed Pit Scouting entry for 2026 season
 */
export type PitScouting2026 = PitScouting<
  RobotCapabilities2026 & {
    endgame_capabilities?: EndgameCapabilities2026;
  },
  AutonomousCapabilities2026
>;

// ============================================================================
// FORM HELPERS & DEFAULTS
// ============================================================================

/**
 * Default/empty autonomous performance for form initialization
 */
export const DEFAULT_AUTO_PERFORMANCE_2026: AutoPerformance2026 = {
  schema_version: '2026.1',
  left_starting_zone: false,
  pieces_scored_low: 0,
  pieces_scored_mid: 0,
  pieces_scored_high: 0,
  pieces_missed: 0,
  preloaded_piece_scored: false,
};

/**
 * Default/empty teleop performance for form initialization
 */
export const DEFAULT_TELEOP_PERFORMANCE_2026: TeleopPerformance2026 = {
  schema_version: '2026.1',
  pieces_scored_low: 0,
  pieces_scored_mid: 0,
  pieces_scored_high: 0,
  pieces_missed: 0,
  cycles_completed: 0,
  ground_pickups: 0,
  station_pickups: 0,
  defense_time_seconds: 0,
  defended_by_opponent_seconds: 0,
  penalties_caused: 0,
};

/**
 * Default/empty endgame performance for form initialization
 */
export const DEFAULT_ENDGAME_PERFORMANCE_2026: EndgamePerformance2026 = {
  schema_version: '2026.1',
  endgame_attempted: false,
  endgame_successful: false,
  endgame_points: 0,
};

// ============================================================================
// SCORING CALCULATIONS (PLACEHOLDER - UPDATE AFTER REVEAL)
// ============================================================================

/**
 * PLACEHOLDER: Point values for 2026 season
 * Update with official game manual values after reveal
 */
export const SEASON_2026_POINT_VALUES = {
  auto: {
    mobility: 3, // Typical FRC mobility points
    piece_low: 2,
    piece_mid: 4,
    piece_high: 6,
  },
  teleop: {
    piece_low: 1,
    piece_mid: 2,
    piece_high: 4,
  },
  endgame: {
    action_1: 3,
    action_2: 6,
    action_3: 12,
  },
} as const;

/**
 * Calculate total autonomous points from auto performance
 */
export function calculateAutoPoints2026(auto: AutoPerformance2026): number {
  const { auto: points } = SEASON_2026_POINT_VALUES;

  let total = 0;

  // Mobility
  if (auto.left_starting_zone) {
    total += points.mobility;
  }

  // Scoring
  total += auto.pieces_scored_low * points.piece_low;
  total += auto.pieces_scored_mid * points.piece_mid;
  total += auto.pieces_scored_high * points.piece_high;

  return total;
}

/**
 * Calculate total teleop points from teleop performance
 */
export function calculateTeleopPoints2026(teleop: TeleopPerformance2026): number {
  const { teleop: points } = SEASON_2026_POINT_VALUES;

  let total = 0;

  // Scoring
  total += teleop.pieces_scored_low * points.piece_low;
  total += teleop.pieces_scored_mid * points.piece_mid;
  total += teleop.pieces_scored_high * points.piece_high;

  return total;
}

/**
 * Calculate total endgame points from endgame performance
 */
export function calculateEndgamePoints2026(endgame: EndgamePerformance2026): number {
  const { endgame: points } = SEASON_2026_POINT_VALUES;

  let total = 0;

  // Endgame action
  if (endgame.endgame_successful && endgame.endgame_action_achieved) {
    switch (endgame.endgame_action_achieved) {
      case 'action_1':
        total += points.action_1;
        break;
      case 'action_2':
        total += points.action_2;
        break;
      case 'action_3':
        total += points.action_3;
        break;
    }
  }

  return total;
}

/**
 * Calculate total match points from all periods
 */
export function calculateTotalMatchPoints2026(
  auto: AutoPerformance2026,
  teleop: TeleopPerformance2026,
  endgame: EndgamePerformance2026
): number {
  return (
    calculateAutoPoints2026(auto) +
    calculateTeleopPoints2026(teleop) +
    calculateEndgamePoints2026(endgame)
  );
}

/**
 * Get total pieces scored across all locations
 */
export function getTotalPiecesScored2026(
  data: AutoPerformance2026 | TeleopPerformance2026
): number {
  return data.pieces_scored_low + data.pieces_scored_mid + data.pieces_scored_high;
}

/**
 * Get highest scoring location achieved
 */
export function getHighestScoringLocation2026(
  data: AutoPerformance2026 | TeleopPerformance2026
): ScoringLocation2026 | null {
  if (data.pieces_scored_high > 0) return 'high';
  if (data.pieces_scored_mid > 0) return 'mid';
  if (data.pieces_scored_low > 0) return 'low';
  return null;
}
