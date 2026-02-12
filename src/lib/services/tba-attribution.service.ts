/**
 * TBA Data Attribution Service
 *
 * Combines two complementary approaches for per-team data from TBA:
 * 1. Direct attribution: Per-robot tower data (autoTowerRobot1/2/3, endGameTowerRobot1/2/3)
 *    maps to teams via alliance station positions.
 * 2. OPR estimation: Alliance-level hub scoring needs OPR decomposition for per-team attribution.
 */

import type { MatchSchedule } from '@/types';
import {
  extractAllianceBreakdown,
  getTeamTowerLevel,
  towerLevelToPoints,
  extractHubCounts,
  type TowerLevel,
  type TBAScoreBreakdown2026Alliance,
} from '@/types/tba-score-breakdown-2026';
import { calculateComponentOPR, type OPRResult } from '@/lib/algorithms/opr';

/**
 * Per-team per-match TBA attributed data
 */
export interface TeamMatchTBAData {
  teamNumber: number;
  matchNumber: number;
  matchKey: string;
  alliance: 'red' | 'blue';
  robotPosition: 1 | 2 | 3;
  // Direct attribution (per-robot tower data)
  autoTowerLevel: TowerLevel;
  endgameTowerLevel: TowerLevel;
  autoTowerPoints: number;
  endgameTowerPoints: number;
  // Alliance-level hub counts (for boxplots)
  hubCounts: {
    autoCount: number;
    transitionCount: number;
    shift1Count: number;
    shift2Count: number;
    shift3Count: number;
    shift4Count: number;
    endgameCount: number;
    totalCount: number;
  };
}

/**
 * Aggregated TBA stats for a team at an event
 */
export interface TeamTBAStats {
  teamNumber: number;
  matchesWithData: number;
  avgAutoTowerPoints: number;
  avgEndgameTowerPoints: number;
  autoClimbRate: number;
  endgameClimbRate: number;
  // Component OPR estimates
  autoOPR?: number;
  teleopHubOPR?: number;
  endgameOPR?: number;
  totalHubOPR?: number;
}

/**
 * Attribute per-robot data from TBA score_breakdown to specific teams.
 * Uses alliance station positions (match_schedule.red_1/2/3, blue_1/2/3)
 * to map autoTowerRobot{N} and endGameTowerRobot{N} to teams.
 */
export function attributePerRobotData(
  matches: MatchSchedule[]
): TeamMatchTBAData[] {
  const results: TeamMatchTBAData[] = [];

  for (const match of matches) {
    const scoreBreakdown = match.score_breakdown as Record<string, unknown> | null;
    if (!scoreBreakdown) continue;

    for (const alliance of ['red', 'blue'] as const) {
      const breakdown = extractAllianceBreakdown(scoreBreakdown, alliance);
      if (!breakdown) continue;

      const hubCounts = extractHubCounts(breakdown);
      const teamPositions = getAllianceTeams(match, alliance);

      for (const { teamNumber, position } of teamPositions) {
        if (!teamNumber) continue;

        const autoLevel = getTeamTowerLevel(breakdown, position, 'auto');
        const endgameLevel = getTeamTowerLevel(breakdown, position, 'endgame');

        results.push({
          teamNumber,
          matchNumber: match.match_number,
          matchKey: match.match_key,
          alliance,
          robotPosition: position,
          autoTowerLevel: autoLevel,
          endgameTowerLevel: endgameLevel,
          autoTowerPoints: towerLevelToPoints(autoLevel, 'auto'),
          endgameTowerPoints: towerLevelToPoints(endgameLevel, 'endgame'),
          hubCounts,
        });
      }
    }
  }

  return results;
}

/**
 * Calculate component OPR values from TBA score breakdowns.
 * Returns per-team OPR estimates for auto, teleop hub, endgame, and total hub.
 */
export async function calculateAllComponentOPRs(
  eventKey: string,
  matches: MatchSchedule[]
): Promise<{
  autoOPR: Map<number, number>;
  teleopHubOPR: Map<number, number>;
  endgameOPR: Map<number, number>;
  totalHubOPR: Map<number, number>;
}> {
  const extractScore = (
    m: MatchSchedule,
    alliance: 'red' | 'blue',
    extractor: (b: TBAScoreBreakdown2026Alliance) => number
  ): number | null => {
    const breakdown = extractAllianceBreakdown(
      m.score_breakdown as Record<string, unknown> | null,
      alliance
    );
    if (!breakdown) return null;
    return extractor(breakdown);
  };

  const toMap = (results: OPRResult[]): Map<number, number> =>
    new Map(results.map(r => [r.teamNumber, r.opr]));

  // Calculate each component OPR in parallel
  const [autoResult, teleopHubResult, endgameResult, totalHubResult] = await Promise.all([
    calculateComponentOPR(eventKey, matches, (m, a) =>
      extractScore(m, a, b => b.totalAutoPoints)
    ).catch(() => null),
    calculateComponentOPR(eventKey, matches, (m, a) =>
      extractScore(m, a, b => b.hubScore?.teleopPoints ?? 0)
    ).catch(() => null),
    calculateComponentOPR(eventKey, matches, (m, a) =>
      extractScore(m, a, b => b.endGameTowerPoints)
    ).catch(() => null),
    calculateComponentOPR(eventKey, matches, (m, a) =>
      extractScore(m, a, b => b.hubScore?.totalPoints ?? 0)
    ).catch(() => null),
  ]);

  return {
    autoOPR: autoResult ? toMap(autoResult.teams) : new Map(),
    teleopHubOPR: teleopHubResult ? toMap(teleopHubResult.teams) : new Map(),
    endgameOPR: endgameResult ? toMap(endgameResult.teams) : new Map(),
    totalHubOPR: totalHubResult ? toMap(totalHubResult.teams) : new Map(),
  };
}

/**
 * Aggregate TBA data into per-team summary stats
 */
export function aggregateTeamTBAStats(
  matchData: TeamMatchTBAData[],
  componentOPRs?: {
    autoOPR: Map<number, number>;
    teleopHubOPR: Map<number, number>;
    endgameOPR: Map<number, number>;
    totalHubOPR: Map<number, number>;
  }
): TeamTBAStats[] {
  const teamMap = new Map<number, TeamMatchTBAData[]>();

  for (const data of matchData) {
    const existing = teamMap.get(data.teamNumber) || [];
    existing.push(data);
    teamMap.set(data.teamNumber, existing);
  }

  const stats: TeamTBAStats[] = [];

  for (const [teamNumber, matches] of teamMap) {
    const count = matches.length;
    const avgAutoTower = matches.reduce((s, m) => s + m.autoTowerPoints, 0) / count;
    const avgEndgameTower = matches.reduce((s, m) => s + m.endgameTowerPoints, 0) / count;
    const autoClimbs = matches.filter(m => m.autoTowerLevel !== 'None').length;
    const endgameClimbs = matches.filter(m => m.endgameTowerLevel !== 'None').length;

    stats.push({
      teamNumber,
      matchesWithData: count,
      avgAutoTowerPoints: Math.round(avgAutoTower * 100) / 100,
      avgEndgameTowerPoints: Math.round(avgEndgameTower * 100) / 100,
      autoClimbRate: Math.round((autoClimbs / count) * 100),
      endgameClimbRate: Math.round((endgameClimbs / count) * 100),
      autoOPR: componentOPRs?.autoOPR.get(teamNumber),
      teleopHubOPR: componentOPRs?.teleopHubOPR.get(teamNumber),
      endgameOPR: componentOPRs?.endgameOPR.get(teamNumber),
      totalHubOPR: componentOPRs?.totalHubOPR.get(teamNumber),
    });
  }

  return stats.sort((a, b) => (b.totalHubOPR ?? 0) - (a.totalHubOPR ?? 0));
}

// --- Helpers ---

function getAllianceTeams(
  match: MatchSchedule,
  alliance: 'red' | 'blue'
): { teamNumber: number | null; position: 1 | 2 | 3 }[] {
  if (alliance === 'red') {
    return [
      { teamNumber: match.red_1 ?? null, position: 1 },
      { teamNumber: match.red_2 ?? null, position: 2 },
      { teamNumber: match.red_3 ?? null, position: 3 },
    ];
  }
  return [
    { teamNumber: match.blue_1 ?? null, position: 1 },
    { teamNumber: match.blue_2 ?? null, position: 2 },
    { teamNumber: match.blue_3 ?? null, position: 3 },
  ];
}
