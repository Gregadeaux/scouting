/**
 * Calculated Contribution to Winning Margin (CCWM) Algorithm
 *
 * CCWM = OPR - DPR
 * Measures a team's net contribution to winning margin.
 *
 * Interpretation:
 * - Positive CCWM: Team contributes to winning (scores more than allows)
 * - Negative CCWM: Team detracts from winning (allows more than scores)
 * - Higher CCWM = Better overall team performance
 *
 * CCWM is often considered the most holistic single metric for team performance,
 * as it accounts for both offensive and defensive contributions.
 */

import type { OPRResult } from './opr';
import type { DPRResult } from './dpr';

/**
 * Individual team CCWM result
 */
export interface CCWMResult {
  teamNumber: number;
  opr: number;
  dpr: number;
  ccwm: number;
  matchesPlayed: number;
}

/**
 * Complete CCWM calculation result for an event
 */
export interface CCWMCalculationResult {
  eventKey: string;
  teams: CCWMResult[];
  calculatedAt: Date;
  statistics: {
    averageOPR: number;
    averageDPR: number;
    averageCCWM: number;
    medianCCWM: number;
    stdDevCCWM: number;
  };
}

/**
 * Calculate CCWM for all teams at an event
 *
 * CCWM = OPR - DPR
 * Measures net contribution to winning margin
 *
 * @param eventKey - Event key (e.g., "2025cafr")
 * @param oprResults - Calculated OPR values
 * @param dprResults - Calculated DPR values
 * @returns CCWM values for all teams
 * @throws Error if OPR and DPR results don't match
 */
export async function calculateCCWM(
  eventKey: string,
  oprResults: OPRResult[],
  dprResults: DPRResult[]
): Promise<CCWMCalculationResult> {
  // Validate inputs
  if (oprResults.length === 0 || dprResults.length === 0) {
    throw new Error('Cannot calculate CCWM without OPR and DPR results');
  }

  // Create a map of DPR results for quick lookup
  const dprMap = new Map(dprResults.map(d => [d.teamNumber, d]));

  // Calculate CCWM for each team
  const teams: CCWMResult[] = oprResults.map(opr => {
    const dpr = dprMap.get(opr.teamNumber);

    if (!dpr) {
      console.warn(`No DPR found for team ${opr.teamNumber}, using 0`);
    }

    const ccwm = opr.opr - (dpr?.dpr || 0);

    return {
      teamNumber: opr.teamNumber,
      opr: opr.opr,
      dpr: dpr?.dpr || 0,
      ccwm: Number(ccwm.toFixed(2)),
      matchesPlayed: opr.matchesPlayed,
    };
  });

  // Check for teams in DPR but not OPR (shouldn't happen, but be safe)
  dprResults.forEach(dpr => {
    if (!teams.find(t => t.teamNumber === dpr.teamNumber)) {
      console.warn(`Team ${dpr.teamNumber} has DPR but no OPR, adding with OPR=0`);
      teams.push({
        teamNumber: dpr.teamNumber,
        opr: 0,
        dpr: dpr.dpr,
        ccwm: Number((-dpr.dpr).toFixed(2)),
        matchesPlayed: dpr.matchesPlayed,
      });
    }
  });

  // Sort by CCWM descending (higher is better)
  teams.sort((a, b) => b.ccwm - a.ccwm);

  // Calculate statistics
  const statistics = calculateStatistics(teams);

  return {
    eventKey,
    teams,
    calculatedAt: new Date(),
    statistics,
  };
}

/**
 * Calculate statistical measures for CCWM results
 */
function calculateStatistics(teams: CCWMResult[]): CCWMCalculationResult['statistics'] {
  if (teams.length === 0) {
    return {
      averageOPR: 0,
      averageDPR: 0,
      averageCCWM: 0,
      medianCCWM: 0,
      stdDevCCWM: 0,
    };
  }

  // Calculate averages
  const sumOPR = teams.reduce((sum, t) => sum + t.opr, 0);
  const sumDPR = teams.reduce((sum, t) => sum + t.dpr, 0);
  const sumCCWM = teams.reduce((sum, t) => sum + t.ccwm, 0);

  const averageOPR = sumOPR / teams.length;
  const averageDPR = sumDPR / teams.length;
  const averageCCWM = sumCCWM / teams.length;

  // Calculate median CCWM
  const sortedCCWM = teams.map(t => t.ccwm).sort((a, b) => a - b);
  const medianCCWM = sortedCCWM.length % 2 === 0
    ? (sortedCCWM[sortedCCWM.length / 2 - 1] + sortedCCWM[sortedCCWM.length / 2]) / 2
    : sortedCCWM[Math.floor(sortedCCWM.length / 2)];

  // Calculate standard deviation
  const variance = teams.reduce((sum, t) => sum + Math.pow(t.ccwm - averageCCWM, 2), 0) / teams.length;
  const stdDevCCWM = Math.sqrt(variance);

  return {
    averageOPR: Number(averageOPR.toFixed(2)),
    averageDPR: Number(averageDPR.toFixed(2)),
    averageCCWM: Number(averageCCWM.toFixed(2)),
    medianCCWM: Number(medianCCWM.toFixed(2)),
    stdDevCCWM: Number(stdDevCCWM.toFixed(2)),
  };
}

/**
 * Get top N teams by CCWM (useful for alliance selection)
 *
 * @param results - CCWM calculation results
 * @param n - Number of teams to return
 * @param minMatches - Minimum matches played to be considered
 * @returns Top N teams by CCWM
 */
export function getTopTeamsByCCWM(
  results: CCWMCalculationResult,
  n: number = 8,
  minMatches: number = 5
): CCWMResult[] {
  return results.teams
    .filter(t => t.matchesPlayed >= minMatches)
    .slice(0, n);
}

/**
 * Identify teams with strong defense (low DPR relative to field)
 *
 * @param results - CCWM calculation results
 * @param threshold - How many standard deviations below average DPR
 * @returns Teams with exceptional defense
 */
export function getDefensiveTeams(
  results: CCWMCalculationResult,
  threshold: number = 1
): CCWMResult[] {
  const avgDPR = results.statistics.averageDPR;

  // Calculate DPR standard deviation
  const dprValues = results.teams.map(t => t.dpr);
  const dprVariance = dprValues.reduce((sum, dpr) => sum + Math.pow(dpr - avgDPR, 2), 0) / dprValues.length;
  const dprStdDev = Math.sqrt(dprVariance);

  // Find teams with DPR significantly below average (good defense)
  const dprThreshold = avgDPR - (threshold * dprStdDev);
  return results.teams.filter(t => t.dpr < dprThreshold);
}

/**
 * Identify balanced teams (good OPR and DPR)
 *
 * @param results - CCWM calculation results
 * @param oprPercentile - Minimum OPR percentile (e.g., 0.7 = top 30%)
 * @param dprPercentile - Maximum DPR percentile (e.g., 0.3 = bottom 30%)
 * @returns Balanced teams
 */
export function getBalancedTeams(
  results: CCWMCalculationResult,
  oprPercentile: number = 0.7,
  dprPercentile: number = 0.3
): CCWMResult[] {
  const sortedByOPR = [...results.teams].sort((a, b) => b.opr - a.opr);
  const sortedByDPR = [...results.teams].sort((a, b) => a.dpr - b.dpr);

  const oprThresholdIndex = Math.floor(sortedByOPR.length * oprPercentile);
  const dprThresholdIndex = Math.floor(sortedByDPR.length * dprPercentile);

  const minOPR = sortedByOPR[oprThresholdIndex]?.opr || 0;
  const maxDPR = sortedByDPR[dprThresholdIndex]?.dpr || Infinity;

  return results.teams.filter(t => t.opr >= minOPR && t.dpr <= maxDPR);
}

/**
 * Generate alliance selection recommendations
 *
 * @param results - CCWM calculation results
 * @returns Categorized team recommendations
 */
export function generateAllianceRecommendations(results: CCWMCalculationResult): {
  firstPicks: CCWMResult[];
  secondPicks: CCWMResult[];
  defensivePicks: CCWMResult[];
  balancedPicks: CCWMResult[];
} {
  // First picks: Top CCWM teams with sufficient matches
  const firstPicks = getTopTeamsByCCWM(results, 8, 5);

  // Second picks: Next tier of CCWM teams
  const secondPicks = results.teams
    .filter(t => t.matchesPlayed >= 5)
    .slice(8, 24);

  // Defensive picks: Teams with exceptional defense
  const defensivePicks = getDefensiveTeams(results, 1.5);

  // Balanced picks: Teams good at both offense and defense
  const balancedPicks = getBalancedTeams(results, 0.6, 0.4);

  return {
    firstPicks,
    secondPicks,
    defensivePicks,
    balancedPicks,
  };
}

/**
 * Validate CCWM results for sanity
 *
 * @param results - CCWM calculation results
 * @returns Array of validation warnings
 */
export function validateCCWMResults(results: CCWMCalculationResult): string[] {
  const warnings: string[] = [];

  // Check if average CCWM is near zero (should be for a balanced field)
  const avgCCWM = results.statistics.averageCCWM;
  if (Math.abs(avgCCWM) > 10) {
    warnings.push(
      `Average CCWM is ${avgCCWM.toFixed(2)}, expected near 0. ` +
      `This may indicate calculation issues or an imbalanced field.`
    );
  }

  // Check for extreme CCWM values
  const extremeTeams = results.teams.filter(t => Math.abs(t.ccwm) > 100);
  if (extremeTeams.length > 0) {
    warnings.push(
      `${extremeTeams.length} teams have CCWM magnitude over 100. ` +
      `These extreme values should be verified.`
    );
  }

  // Check consistency between OPR, DPR, and CCWM
  results.teams.forEach(team => {
    const calculatedCCWM = team.opr - team.dpr;
    if (Math.abs(calculatedCCWM - team.ccwm) > 0.1) {
      warnings.push(
        `Team ${team.teamNumber}: CCWM (${team.ccwm}) doesn't match OPR (${team.opr}) - DPR (${team.dpr})`
      );
    }
  });

  return warnings;
}