/**
 * 2025 Reefscape Season-Specific Type Definitions
 *
 * Game Elements:
 * - Coral (PVC pipes) - scored on Reef levels (L1-L4), picked from ground or station
 * - Algae (inflatable balls) - scored in Barge or Processor during teleop, picked from ground/reef/lollipops
 * - Reef structures with levels L1, L2, L3, L4
 * - Processors for Algae scoring
 * - Lollipops for Algae pickup
 * - Endgame: Cage climbing (shallow or deep)
 *
 * Corrected game mechanics based on official rules
 */

import { BasePerformanceData, MatchScouting, PitScouting } from './index';

// ============================================================================
// GAME PIECE & SCORING LOCATION TYPES
// ============================================================================

export type GamePieceType = 'coral' | 'algae';

export type ReefLevel = 'L1' | 'L2' | 'L3' | 'L4';

export type CageLevel = 'shallow' | 'deep';

export type CoralPickupLocation = 'ground' | 'station';

export type AlgaePickupLocation = 'ground' | 'reef' | 'lollipop';

export type AlgaeScoringLocation = 'barge' | 'processor';

// ============================================================================
// AUTONOMOUS PERIOD (15 seconds)
// ============================================================================

export interface AutoPerformance2025 extends BasePerformanceData {
  schema_version: '2025.1';

  // Mobility
  left_starting_zone: boolean;

  // Coral Scoring (by reef level)
  coral_scored_L1: number;
  coral_scored_L2: number;
  coral_scored_L3: number;
  coral_scored_L4: number;
  coral_missed: number;

  // Preloaded piece tracking
  preloaded_piece_type?: GamePieceType;
  preloaded_piece_scored: boolean;

  // Notes
  notes?: string;
}

// ============================================================================
// TELEOPERATED PERIOD (2:15)
// ============================================================================

export interface TeleopPerformance2025 extends BasePerformanceData {
  schema_version: '2025.1';

  // Coral Scoring (by reef level)
  coral_scored_L1: number;
  coral_scored_L2: number;
  coral_scored_L3: number;
  coral_scored_L4: number;
  coral_missed: number;

  // Algae Scoring (teleop only)
  algae_scored_barge: number;
  algae_scored_processor: number;
  algae_missed: number;

  // Cycle Tracking
  cycles_completed: number;

  // Pickup Locations - Coral
  ground_pickup_coral: number;
  station_pickup_coral: number;

  // Pickup Locations - Algae (can be picked from ground, reef, or lollipops)
  ground_pickup_algae: number;
  reef_pickup_algae: number;
  lollipop_pickup_algae: number;

  // Defense
  defense_time_seconds: number;
  defense_effectiveness?: 'none' | 'minimal' | 'moderate' | 'effective' | 'dominant';
  defended_by_opponent_seconds: number;

  // Penalties
  penalties_caused: number;

  // Notes
  notes?: string;
}

// ============================================================================
// ENDGAME PERIOD (Last 30 seconds)
// ============================================================================

export interface EndgamePerformance2025 extends BasePerformanceData {
  schema_version: '2025.1';

  // Cage Climbing (only endgame activity)
  cage_climb_attempted: boolean;
  cage_climb_successful: boolean;
  cage_level_achieved?: CageLevel; // 'shallow' or 'deep'

  // Timing
  endgame_start_time_seconds?: number; // When did they start endgame (120-150)
  endgame_completion_time_seconds?: number; // How long did it take

  // Calculated Points (for reference)
  endgame_points: number;

  // Cooperation
  cooperation_with_alliance?: string; // Notes about alliance coordination

  // Notes
  notes?: string;
}

// ============================================================================
// PIT SCOUTING - ROBOT CAPABILITIES
// ============================================================================

export interface RobotCapabilities2025 {
  schema_version: '2025.1';

  // Game Piece Handling
  can_handle_coral: boolean;
  can_handle_algae: boolean;
  can_handle_both_simultaneously: boolean;
  preferred_game_piece?: GamePieceType;

  // Coral Scoring Capabilities
  can_score_coral: boolean;
  can_score_L1: boolean;
  can_score_L2: boolean;
  can_score_L3: boolean;
  can_score_L4: boolean;
  max_reef_level?: ReefLevel;

  // Algae Scoring Capabilities
  can_score_algae: boolean;
  can_score_algae_barge: boolean;
  can_score_algae_processor: boolean;

  // Pickup Capabilities
  can_pickup_from_ground: boolean;
  can_pickup_from_station: boolean;
  pickup_mechanism_type?: string; // 'roller', 'claw', 'intake', etc.

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

export interface AutonomousCapabilities2025 {
  schema_version: '2025.1';

  // Autonomous Scoring
  auto_scoring_capability: boolean;
  auto_max_coral_pieces: number;
  auto_preferred_starting_position?: 1 | 2 | 3;

  // Autonomous Features
  auto_uses_vision: boolean;
  auto_path_planning: boolean;
  auto_multi_piece_capable: boolean;

  // Reliability
  auto_success_rate_estimate?: number; // 0-100 percentage
  auto_tested_at_competitions: boolean;

  // Strategy
  auto_strategy_description?: string;

  // Notes
  notes?: string;
}

export interface EndgameCapabilities2025 {
  schema_version: '2025.1';

  // Cage Climbing
  can_climb_cage: boolean;
  max_cage_level?: CageLevel; // 'shallow' or 'deep'

  // Reliability
  endgame_success_rate_estimate?: number; // 0-100 percentage
  endgame_time_estimate_seconds?: number;

  // Strategy
  endgame_preference?: 'shallow' | 'deep' | 'situational';

  // Notes
  notes?: string;
}

// ============================================================================
// TYPED MATCH SCOUTING FOR 2025
// ============================================================================

/**
 * Fully-typed Match Scouting entry for 2025 Reefscape
 * Usage: MatchScouting2025 instead of generic MatchScouting
 */
export type MatchScouting2025 = MatchScouting<
  AutoPerformance2025,
  TeleopPerformance2025,
  EndgamePerformance2025
>;

/**
 * Fully-typed Pit Scouting entry for 2025 Reefscape
 */
export type PitScouting2025 = PitScouting<
  RobotCapabilities2025 & {
    endgame_capabilities?: EndgameCapabilities2025;
  },
  AutonomousCapabilities2025
>;

// ============================================================================
// FORM HELPERS & DEFAULTS
// ============================================================================

/**
 * Default/empty autonomous performance for form initialization
 */
export const DEFAULT_AUTO_PERFORMANCE_2025: AutoPerformance2025 = {
  schema_version: '2025.1',
  left_starting_zone: false,
  coral_scored_L1: 0,
  coral_scored_L2: 0,
  coral_scored_L3: 0,
  coral_scored_L4: 0,
  coral_missed: 0,
  preloaded_piece_scored: false,
};

/**
 * Default/empty teleop performance for form initialization
 */
export const DEFAULT_TELEOP_PERFORMANCE_2025: TeleopPerformance2025 = {
  schema_version: '2025.1',
  coral_scored_L1: 0,
  coral_scored_L2: 0,
  coral_scored_L3: 0,
  coral_scored_L4: 0,
  coral_missed: 0,
  algae_scored_barge: 0,
  algae_scored_processor: 0,
  algae_missed: 0,
  cycles_completed: 0,
  ground_pickup_coral: 0,
  station_pickup_coral: 0,
  ground_pickup_algae: 0,
  reef_pickup_algae: 0,
  lollipop_pickup_algae: 0,
  defense_time_seconds: 0,
  defended_by_opponent_seconds: 0,
  penalties_caused: 0,
};

/**
 * Default/empty endgame performance for form initialization
 */
export const DEFAULT_ENDGAME_PERFORMANCE_2025: EndgamePerformance2025 = {
  schema_version: '2025.1',
  cage_climb_attempted: false,
  cage_climb_successful: false,
  endgame_points: 0,
};

// ============================================================================
// SCORING CALCULATIONS
// ============================================================================

/**
 * Point values for 2025 Reefscape
 * NOTE: These are estimates - update with official game manual values
 */
export const REEFSCAPE_POINT_VALUES = {
  auto: {
    mobility: 3,
    coral_L1: 3,
    coral_L2: 4,
    coral_L3: 6,
    coral_L4: 7,
  },
  teleop: {
    coral_L1: 2,
    coral_L2: 3,
    coral_L3: 4,
    coral_L4: 5,
    algae_barge: 3,
    algae_processor: 4,
  },
  endgame: {
    cage_shallow: 6,
    cage_deep: 12,
  },
} as const;

/**
 * Calculate total autonomous points from auto performance
 */
export function calculateAutoPoints(auto: AutoPerformance2025): number {
  const { auto: points } = REEFSCAPE_POINT_VALUES;

  let total = 0;

  // Mobility
  if (auto.left_starting_zone) {
    total += points.mobility;
  }

  // Coral scoring by level
  total += auto.coral_scored_L1 * points.coral_L1;
  total += auto.coral_scored_L2 * points.coral_L2;
  total += auto.coral_scored_L3 * points.coral_L3;
  total += auto.coral_scored_L4 * points.coral_L4;

  return total;
}

/**
 * Calculate total teleop points from teleop performance
 */
export function calculateTeleopPoints(teleop: TeleopPerformance2025): number {
  const { teleop: points } = REEFSCAPE_POINT_VALUES;

  let total = 0;

  // Coral scoring by level
  total += teleop.coral_scored_L1 * points.coral_L1;
  total += teleop.coral_scored_L2 * points.coral_L2;
  total += teleop.coral_scored_L3 * points.coral_L3;
  total += teleop.coral_scored_L4 * points.coral_L4;

  // Algae scoring
  total += teleop.algae_scored_barge * points.algae_barge;
  total += teleop.algae_scored_processor * points.algae_processor;

  return total;
}

/**
 * Calculate total endgame points from endgame performance
 */
export function calculateEndgamePoints(endgame: EndgamePerformance2025): number {
  const { endgame: points } = REEFSCAPE_POINT_VALUES;

  let total = 0;

  // Cage climbing
  if (endgame.cage_climb_successful) {
    if (endgame.cage_level_achieved === 'shallow') {
      total += points.cage_shallow;
    } else if (endgame.cage_level_achieved === 'deep') {
      total += points.cage_deep;
    }
  }

  return total;
}

/**
 * Calculate total match points from all periods
 */
export function calculateTotalMatchPoints(
  auto: AutoPerformance2025,
  teleop: TeleopPerformance2025,
  endgame: EndgamePerformance2025
): number {
  return calculateAutoPoints(auto) + calculateTeleopPoints(teleop) + calculateEndgamePoints(endgame);
}

/**
 * Calculate total coral scored on reef (all levels)
 */
export function getTotalCoralScored(
  data: AutoPerformance2025 | TeleopPerformance2025
): number {
  return data.coral_scored_L1 + data.coral_scored_L2 + data.coral_scored_L3 + data.coral_scored_L4;
}

/**
 * Get highest reef level achieved
 */
export function getHighestReefLevel(
  data: AutoPerformance2025 | TeleopPerformance2025
): ReefLevel | null {
  if (data.coral_scored_L4 > 0) return 'L4';
  if (data.coral_scored_L3 > 0) return 'L3';
  if (data.coral_scored_L2 > 0) return 'L2';
  if (data.coral_scored_L1 > 0) return 'L1';
  return null;
}
