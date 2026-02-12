/**
 * 2026 Season Type Definitions
 *
 * SIMPLIFIED SCOUTING APPROACH:
 * - Ball scoring is too fast to scout manually - TBA provides this data
 * - Scouts focus on: Climbs (auto/endgame), qualitative ratings, disabled tracking
 * - Target: <60 seconds per robot to complete scouting form
 *
 * Data Sources:
 * - TBA: Ball scores via webhooks, score_breakdown for OPR calculation
 * - Scouting: Climbs, ratings, disabled tracking
 */

import { BasePerformanceData, MatchScouting, PitScouting } from './index';

// ============================================================================
// ENUMS & TYPE LITERALS
// ============================================================================

/**
 * Climb levels available in the 2026 game
 * Auto only supports L1, endgame supports all levels
 */
export type ClimbLevel2026 = 'none' | 'L1' | 'L2' | 'L3';

/**
 * Climb position on the bar for coordination tracking
 */
export type ClimbPosition2026 = 'left' | 'center' | 'right';

/**
 * Reasons a robot may become disabled during a match
 */
export type DisabledReason2026 =
  | 'robot_died'
  | 'stuck_on_bump'
  | 'stuck_on_balls'
  | 'stuck_in_trench'
  | 'disabled_by_refs'
  | 'other';

/**
 * Rating scale labels for display
 */
export const RATING_LABELS_2026 = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
} as const;

// ============================================================================
// AUTONOMOUS PERIOD (15 seconds)
// ============================================================================

/**
 * Auto performance is simple: just track auto climb
 * Ball scoring is too fast and handled by TBA
 */
export interface AutoPerformance2026 extends BasePerformanceData {
  schema_version: '2026.1';

  /** Did the robot attempt to climb in auto? */
  auto_climb_attempted: boolean;

  /** Did the auto climb succeed? */
  auto_climb_success: boolean;

  /** Position on the bar (left/center/right) - for coordination */
  auto_climb_position?: ClimbPosition2026;

  /** Additional observations about auto performance */
  notes?: string;
}

// ============================================================================
// TELEOPERATED PERIOD (2:15)
// ============================================================================

/**
 * Teleop focuses on qualitative ratings rather than counting
 * Ball scoring is tracked via TBA webhooks
 */
export interface TeleopPerformance2026 extends BasePerformanceData {
  schema_version: '2026.1';

  /** How well did they score? (1-5 scale) */
  scoring_rating: number;

  /** How well did they feed balls to alliance partners? (1-5 scale) */
  feeding_rating: number;

  /** How effective was their defense? (1-5 scale) */
  defense_rating: number;

  /** How reliable/consistent was the robot? (1-5 scale) */
  reliability_rating: number;

  /** Additional observations about teleop performance */
  notes?: string;
}

// ============================================================================
// ENDGAME PERIOD (Last ~30 seconds)
// ============================================================================

/**
 * Endgame tracks climb attempts and disabled status
 */
export interface EndgamePerformance2026 extends BasePerformanceData {
  schema_version: '2026.1';

  /** Did the robot attempt to climb in endgame? */
  endgame_climb_attempted: boolean;

  /** What level did they attempt/achieve? */
  endgame_climb_level: ClimbLevel2026;

  /** Did the endgame climb succeed? */
  endgame_climb_success: boolean;

  /** Position on the bar (left/center/right) - for coordination */
  endgame_climb_position?: ClimbPosition2026;

  /** Was the robot disabled at any point during the match? */
  was_disabled: boolean;

  /** Why was the robot disabled? */
  disabled_reason?: DisabledReason2026;

  /** Additional details about the disability */
  disabled_notes?: string;

  /** Additional observations about endgame performance */
  notes?: string;
}

// ============================================================================
// PIT SCOUTING - ROBOT CAPABILITIES
// ============================================================================

/**
 * Robot capabilities for 2026 - focused on climb and general info
 * Ball scoring capabilities less important since TBA tracks actual performance
 */
export interface RobotCapabilities2026 {
  schema_version: '2026.1';

  /** Can the robot fit through the trench? (based on robot height) */
  can_fit_through_trench: boolean;

  /** Can the robot climb in auto? */
  can_auto_climb: boolean;

  /** Can the robot climb in endgame? */
  can_endgame_climb: boolean;

  /** Maximum climb level achievable */
  max_climb_level?: ClimbLevel2026;

  /** Preferred climb position */
  preferred_climb_position?: ClimbPosition2026;

  /** Estimated climb time in seconds */
  estimated_climb_time_seconds?: number;

  /** Can they feed balls effectively? */
  can_feed: boolean;

  /** Do they primarily play defense? */
  plays_defense: boolean;

  /** Drive train type */
  drive_train_type?: string;

  /** Special features or capabilities */
  special_features?: string;

  /** Additional notes */
  notes?: string;
}

/**
 * Autonomous capabilities for 2026
 */
export interface AutonomousCapabilities2026 {
  schema_version: '2026.1';

  /** Does the robot have an auto routine? */
  has_auto_routine: boolean;

  /** Can they auto climb? */
  auto_climb_capable: boolean;

  /** Preferred starting position (1/2/3) */
  preferred_starting_position?: 1 | 2 | 3;

  /** Estimated auto success rate (0-100) */
  auto_success_rate_estimate?: number;

  /** Description of auto strategy */
  auto_strategy_description?: string;

  /** Additional notes */
  notes?: string;
}

/**
 * Endgame-specific capabilities
 */
export interface EndgameCapabilities2026 {
  schema_version: '2026.1';

  /** Can the robot climb? */
  can_climb: boolean;

  /** Maximum climb level */
  max_climb_level?: ClimbLevel2026;

  /** Estimated success rate (0-100) */
  climb_success_rate_estimate?: number;

  /** Estimated time to climb in seconds */
  climb_time_estimate_seconds?: number;

  /** Strategy preference */
  climb_strategy?: 'early' | 'late' | 'situational';

  /** Additional notes */
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
  auto_climb_attempted: false,
  auto_climb_success: false,
};

/**
 * Default/empty teleop performance for form initialization
 * Ratings default to 3 (Average) to encourage scouts to adjust
 */
export const DEFAULT_TELEOP_PERFORMANCE_2026: TeleopPerformance2026 = {
  schema_version: '2026.1',
  scoring_rating: 3,
  feeding_rating: 3,
  defense_rating: 3,
  reliability_rating: 3,
};

/**
 * Default/empty endgame performance for form initialization
 */
export const DEFAULT_ENDGAME_PERFORMANCE_2026: EndgamePerformance2026 = {
  schema_version: '2026.1',
  endgame_climb_attempted: false,
  endgame_climb_level: 'none',
  endgame_climb_success: false,
  was_disabled: false,
};

/**
 * Default/empty robot capabilities for 2026 pit scouting form initialization
 */
export const DEFAULT_ROBOT_CAPABILITIES_2026: RobotCapabilities2026 = {
  schema_version: '2026.1',
  can_fit_through_trench: false,
  can_auto_climb: false,
  can_endgame_climb: false,
  can_feed: false,
  plays_defense: false,
};

// ============================================================================
// POINT VALUES (For reference - actual scoring from TBA)
// ============================================================================

/**
 * Point values for 2026 season
 * These are estimates - auto/teleop ball scoring comes from TBA
 * We only calculate climb points from scouting data
 */
export const SEASON_2026_POINT_VALUES = {
  auto: {
    climb_L1: 6, // Auto climb bonus
  },
  endgame: {
    climb_L1: 3,
    climb_L2: 6,
    climb_L3: 12,
  },
} as const;

// ============================================================================
// SCORING CALCULATIONS (Climb only - balls from TBA)
// ============================================================================

/**
 * Calculate auto climb points
 */
export function calculateAutoClimbPoints2026(auto: AutoPerformance2026): number {
  if (auto.auto_climb_success) {
    return SEASON_2026_POINT_VALUES.auto.climb_L1;
  }
  return 0;
}

/**
 * Calculate endgame climb points
 */
export function calculateEndgameClimbPoints2026(endgame: EndgamePerformance2026): number {
  if (!endgame.endgame_climb_success) {
    return 0;
  }

  const { endgame: points } = SEASON_2026_POINT_VALUES;

  switch (endgame.endgame_climb_level) {
    case 'L1':
      return points.climb_L1;
    case 'L2':
      return points.climb_L2;
    case 'L3':
      return points.climb_L3;
    default:
      return 0;
  }
}

/**
 * Calculate total scouted points (climbs only)
 * Ball scoring points come from TBA data, not scouting
 */
export function calculateScoutedPoints2026(
  auto: AutoPerformance2026,
  endgame: EndgamePerformance2026
): number {
  return calculateAutoClimbPoints2026(auto) + calculateEndgameClimbPoints2026(endgame);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get average rating across all teleop categories
 */
export function getAverageRating2026(teleop: TeleopPerformance2026): number {
  const ratings = [
    teleop.scoring_rating,
    teleop.feeding_rating,
    teleop.defense_rating,
    teleop.reliability_rating,
  ];
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

/**
 * Check if a robot had any climb success
 */
export function hadAnyClimbSuccess2026(
  auto: AutoPerformance2026,
  endgame: EndgamePerformance2026
): boolean {
  return auto.auto_climb_success || endgame.endgame_climb_success;
}

/**
 * Get the highest climb level achieved
 */
export function getHighestClimbLevel2026(endgame: EndgamePerformance2026): ClimbLevel2026 {
  if (!endgame.endgame_climb_success) {
    return 'none';
  }
  return endgame.endgame_climb_level;
}

/**
 * Format climb position for display
 */
export function formatClimbPosition2026(position?: ClimbPosition2026): string {
  if (!position) return 'Unknown';
  return position.charAt(0).toUpperCase() + position.slice(1);
}

/**
 * Format climb level for display
 */
export function formatClimbLevel2026(level: ClimbLevel2026): string {
  if (level === 'none') return 'None';
  return level; // L1, L2, L3 are already formatted
}

/**
 * Format disabled reason for display
 */
export function formatDisabledReason2026(reason?: DisabledReason2026): string {
  if (!reason) return 'Unknown';

  const labels: Record<DisabledReason2026, string> = {
    robot_died: 'Robot Died',
    stuck_on_bump: 'Stuck on Bump',
    stuck_on_balls: 'Stuck on Balls',
    stuck_in_trench: 'Stuck in Trench',
    disabled_by_refs: 'Disabled by Refs',
    other: 'Other',
  };

  return labels[reason];
}
