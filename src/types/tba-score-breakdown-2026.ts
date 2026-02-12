/**
 * TBA Score Breakdown Types for the 2026 FRC Season
 *
 * Defines TypeScript interfaces matching the TBA score_breakdown JSONB
 * stored in match_schedule. Includes utility functions for:
 * - Safely extracting typed alliance breakdowns from JSONB
 * - Mapping per-robot tower levels to specific teams via station position
 * - Converting tower level strings to point values
 */

import { SEASON_2026_POINT_VALUES } from './season-2026';

// ============================================================================
// HUB SCORING (alliance-level — needs OPR for per-team attribution)
// ============================================================================

export interface HubScore2026 {
  autoCount: number;
  autoPoints: number;
  transitionCount: number;
  transitionPoints: number;
  shift1Count: number;
  shift1Points: number;
  shift2Count: number;
  shift2Points: number;
  shift3Count: number;
  shift3Points: number;
  shift4Count: number;
  shift4Points: number;
  endgameCount: number;
  endgamePoints: number;
  teleopCount: number;
  teleopPoints: number;
  totalCount: number;
  totalPoints: number;
}

// ============================================================================
// TOWER LEVELS (per-robot — directly attributable to teams)
// ============================================================================

export type TowerLevel = 'None' | 'Level1' | 'Level2' | 'Level3';

// ============================================================================
// ALLIANCE BREAKDOWN
// ============================================================================

export interface TBAScoreBreakdown2026Alliance {
  // Per-robot tower levels (auto)
  autoTowerRobot1: TowerLevel;
  autoTowerRobot2: TowerLevel;
  autoTowerRobot3: TowerLevel;
  // Per-robot tower levels (endgame)
  endGameTowerRobot1: TowerLevel;
  endGameTowerRobot2: TowerLevel;
  endGameTowerRobot3: TowerLevel;
  // Auto points
  autoTowerPoints: number;
  totalAutoPoints: number;
  // Hub scoring (alliance-level)
  hubScore: HubScore2026;
  // Teleop & endgame points
  totalTeleopPoints: number;
  endGameTowerPoints: number;
  totalTowerPoints: number;
  // Bonuses
  energizedAchieved: boolean;
  superchargedAchieved: boolean;
  traversalAchieved: boolean;
  // Fouls
  minorFoulCount: number;
  majorFoulCount: number;
  g206Penalty: boolean;
  // Points
  adjustPoints: number;
  foulPoints: number;
  rp: number;
  totalPoints: number;
}

export interface TBAScoreBreakdown2026 {
  red: TBAScoreBreakdown2026Alliance;
  blue: TBAScoreBreakdown2026Alliance;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely extract a typed alliance breakdown from JSONB score_breakdown.
 * Returns null if the data is missing or malformed.
 */
export function extractAllianceBreakdown(
  scoreBreakdown: Record<string, unknown> | null | undefined,
  alliance: 'red' | 'blue'
): TBAScoreBreakdown2026Alliance | null {
  if (!scoreBreakdown) return null;

  const raw = scoreBreakdown[alliance];
  if (!raw || typeof raw !== 'object') return null;

  // Basic shape check — verify hubScore exists
  const allianceData = raw as Record<string, unknown>;
  if (!allianceData.hubScore || typeof allianceData.hubScore !== 'object') {
    return null;
  }

  return raw as unknown as TBAScoreBreakdown2026Alliance;
}

/**
 * Get the tower level for a specific robot position (1-3) in a given period.
 * Robot position maps to alliance station: robot1 = station 1, etc.
 */
export function getTeamTowerLevel(
  breakdown: TBAScoreBreakdown2026Alliance,
  robotPosition: 1 | 2 | 3,
  period: 'auto' | 'endgame'
): TowerLevel {
  const key = period === 'auto'
    ? `autoTowerRobot${robotPosition}` as const
    : `endGameTowerRobot${robotPosition}` as const;
  return breakdown[key] ?? 'None';
}

/**
 * Convert a TowerLevel string to its point value for a given period.
 */
export function towerLevelToPoints(
  level: TowerLevel,
  period: 'auto' | 'endgame'
): number {
  if (level === 'None') return 0;

  if (period === 'auto') {
    // Auto only supports L1
    return level === 'Level1' ? SEASON_2026_POINT_VALUES.auto.climb_L1 : 0;
  }

  // Endgame supports L1-L3
  switch (level) {
    case 'Level1':
      return SEASON_2026_POINT_VALUES.endgame.climb_L1;
    case 'Level2':
      return SEASON_2026_POINT_VALUES.endgame.climb_L2;
    case 'Level3':
      return SEASON_2026_POINT_VALUES.endgame.climb_L3;
    default:
      return 0;
  }
}

/**
 * Determine the robot position (1-3) for a team number within an alliance.
 * Uses the match_schedule red_1/2/3 or blue_1/2/3 columns.
 */
export function getRobotPosition(
  allianceTeams: { pos1?: number | null; pos2?: number | null; pos3?: number | null },
  teamNumber: number
): 1 | 2 | 3 | null {
  if (allianceTeams.pos1 === teamNumber) return 1;
  if (allianceTeams.pos2 === teamNumber) return 2;
  if (allianceTeams.pos3 === teamNumber) return 3;
  return null;
}

/**
 * Extract hub score counts from a breakdown, returning a flat object
 * suitable for boxplot data.
 */
export function extractHubCounts(breakdown: TBAScoreBreakdown2026Alliance): {
  autoCount: number;
  transitionCount: number;
  shift1Count: number;
  shift2Count: number;
  shift3Count: number;
  shift4Count: number;
  endgameCount: number;
  totalCount: number;
} {
  const hs = breakdown.hubScore;
  return {
    autoCount: hs?.autoCount ?? 0,
    transitionCount: hs?.transitionCount ?? 0,
    shift1Count: hs?.shift1Count ?? 0,
    shift2Count: hs?.shift2Count ?? 0,
    shift3Count: hs?.shift3Count ?? 0,
    shift4Count: hs?.shift4Count ?? 0,
    endgameCount: hs?.endgameCount ?? 0,
    totalCount: hs?.totalCount ?? 0,
  };
}
