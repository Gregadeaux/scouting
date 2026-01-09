/**
 * Defensive Power Rating (DPR) Calculation Algorithm
 *
 * DPR measures the average points a team's opponents score (defensive impact).
 * Lower DPR indicates better defense - the team allows fewer points.
 * Uses the same mathematical approach as OPR but with opponent scores.
 *
 * Mathematical approach:
 * - For each alliance, we use the OPPONENT's score
 * - Red alliance teams -> use blue_score
 * - Blue alliance teams -> use red_score
 * - Solve using least squares regression
 */

import * as math from 'mathjs';
import type { MatchSchedule } from '@/types';

/**
 * Individual team DPR result
 */
export interface DPRResult {
  teamNumber: number;
  dpr: number;
  matchesPlayed: number;
}

/**
 * Complete DPR calculation result for an event
 */
export interface DPRCalculationResult {
  eventKey: string;
  teams: DPRResult[];
  calculatedAt: Date;
  totalMatches: number;
  warnings: string[];
}

/**
 * Calculate DPR for all teams at an event
 *
 * DPR measures defensive impact (points allowed to opponents)
 * Uses opponent alliance scores instead of own alliance scores
 *
 * @param eventKey - Event key (e.g., "2025cafr")
 * @param matches - Array of completed matches with scores
 * @returns DPR values for all teams
 * @throws Error if insufficient data for calculation
 */
export async function calculateDPR(
  eventKey: string,
  matches: MatchSchedule[]
): Promise<DPRCalculationResult> {
  // 1. Filter completed matches (must have scores)
  const completedMatches = matches.filter(
    m => m.red_score !== null &&
      m.red_score !== undefined &&
      m.blue_score !== null &&
      m.blue_score !== undefined
  );

  if (completedMatches.length < 3) {
    throw new Error(`Insufficient matches for DPR calculation. Need at least 3 completed matches, found ${completedMatches.length}`);
  }

  // 2. Extract all unique team numbers
  const teams = extractUniqueTeams(completedMatches);
  const teamCount = teams.length;

  if (teamCount < 3) {
    throw new Error(`Insufficient teams for DPR calculation. Need at least 3 teams, found ${teamCount}`);
  }

  // 3. Build coefficient matrix A and opponent score vector b
  const { A, b } = buildMatricesForDPR(completedMatches, teams);

  // 4. Solve using least squares: A^T * A * x = A^T * b
  let dprValues: math.Matrix;
  const warnings: string[] = [];

  try {
    const AT = math.transpose(A);
    const ATA = math.multiply(AT, A) as math.Matrix;
    const ATb = math.multiply(AT, b) as math.Matrix;

    // Solve linear system
    dprValues = math.lusolve(ATA, ATb) as math.Matrix;
  } catch {
    // Handle singular matrix (use pseudo-inverse)
    warnings.push('Matrix was singular, using pseudo-inverse. Results may be less accurate.');
    const result = handleSingularMatrix(A, b, teams, eventKey, completedMatches);
    return result;
  }

  // 5. Format results
  const results: DPRResult[] = teams.map((teamNumber, index) => ({
    teamNumber,
    dpr: Number((dprValues.get([index, 0]) as number).toFixed(2)),
    matchesPlayed: countTeamMatches(completedMatches, teamNumber),
  }));

  // Sort by DPR ascending (lower is better for defense)
  results.sort((a, b) => a.dpr - b.dpr);

  return {
    eventKey,
    teams: results,
    calculatedAt: new Date(),
    totalMatches: completedMatches.length,
    warnings,
  };
}

/**
 * Extract all unique team numbers from matches
 */
function extractUniqueTeams(matches: MatchSchedule[]): number[] {
  const teamsSet = new Set<number>();

  matches.forEach(match => {
    // Add red alliance teams
    if (match.red_1) teamsSet.add(match.red_1);
    if (match.red_2) teamsSet.add(match.red_2);
    if (match.red_3) teamsSet.add(match.red_3);

    // Add blue alliance teams
    if (match.blue_1) teamsSet.add(match.blue_1);
    if (match.blue_2) teamsSet.add(match.blue_2);
    if (match.blue_3) teamsSet.add(match.blue_3);
  });

  return Array.from(teamsSet).sort((a, b) => a - b);
}

/**
 * Build coefficient matrix A and opponent score vector b for DPR
 *
 * Key difference from OPR: we use OPPONENT scores
 * - Red alliance teams -> use blue_score
 * - Blue alliance teams -> use red_score
 */
function buildMatricesForDPR(
  matches: MatchSchedule[],
  teams: number[]
): { A: math.Matrix; b: math.Matrix } {
  const teamIndexMap = new Map(teams.map((t, i) => [t, i]));
  const teamCount = teams.length;

  const A: number[][] = [];
  const b: number[] = [];

  matches.forEach(match => {
    // Red alliance row (using BLUE score for DPR)
    const redRow = new Array(teamCount).fill(0);

    // Mark teams in red alliance
    if (match.red_1) {
      const index = teamIndexMap.get(match.red_1);
      if (index !== undefined) redRow[index] = 1;
    }
    if (match.red_2) {
      const index = teamIndexMap.get(match.red_2);
      if (index !== undefined) redRow[index] = 1;
    }
    if (match.red_3) {
      const index = teamIndexMap.get(match.red_3);
      if (index !== undefined) redRow[index] = 1;
    }

    A.push(redRow);
    b.push(match.blue_score!); // Use opponent (blue) score for red teams

    // Blue alliance row (using RED score for DPR)
    const blueRow = new Array(teamCount).fill(0);

    // Mark teams in blue alliance
    if (match.blue_1) {
      const index = teamIndexMap.get(match.blue_1);
      if (index !== undefined) blueRow[index] = 1;
    }
    if (match.blue_2) {
      const index = teamIndexMap.get(match.blue_2);
      if (index !== undefined) blueRow[index] = 1;
    }
    if (match.blue_3) {
      const index = teamIndexMap.get(match.blue_3);
      if (index !== undefined) blueRow[index] = 1;
    }

    A.push(blueRow);
    b.push(match.red_score!); // Use opponent (red) score for blue teams
  });

  return {
    A: math.matrix(A),
    b: math.matrix(b.map(v => [v])), // Column vector
  };
}

/**
 * Count how many matches a team has played
 */
function countTeamMatches(matches: MatchSchedule[], teamNumber: number): number {
  return matches.filter(m =>
    m.red_1 === teamNumber ||
    m.red_2 === teamNumber ||
    m.red_3 === teamNumber ||
    m.blue_1 === teamNumber ||
    m.blue_2 === teamNumber ||
    m.blue_3 === teamNumber
  ).length;
}

/**
 * Handle singular matrix case using Moore-Penrose pseudo-inverse
 */
function handleSingularMatrix(
  A: math.Matrix,
  b: math.Matrix,
  teams: number[],
  eventKey: string,
  matches: MatchSchedule[]
): DPRCalculationResult {
  // Use pseudo-inverse (Moore-Penrose inverse)
  const Apinv = math.pinv(A as unknown as math.MathType) as math.Matrix;
  const dprValues = math.multiply(Apinv, b) as math.Matrix;

  const results: DPRResult[] = teams.map((teamNumber, index) => ({
    teamNumber,
    dpr: Number((dprValues.get([index, 0]) as number).toFixed(2)),
    matchesPlayed: countTeamMatches(matches, teamNumber),
  }));

  // Sort by DPR ascending (lower is better)
  results.sort((a, b) => a.dpr - b.dpr);

  return {
    eventKey,
    teams: results,
    calculatedAt: new Date(),
    totalMatches: matches.length,
    warnings: ['Matrix was singular, used pseudo-inverse. Results may be less accurate.'],
  };
}

/**
 * Validate DPR results for sanity
 *
 * @param results - DPR calculation results
 * @returns Array of validation warnings
 */
export function validateDPRResults(results: DPRCalculationResult): string[] {
  const warnings: string[] = [];

  // Check for negative DPR values (very unusual)
  const negativeDPRTeams = results.teams.filter(t => t.dpr < 0);
  if (negativeDPRTeams.length > 0) {
    warnings.push(
      `${negativeDPRTeams.length} teams have negative DPR values. ` +
      `This should not happen and indicates data issues.`
    );
  }

  // Check for extremely high DPR values (> 200 is concerning)
  const highDPRTeams = results.teams.filter(t => t.dpr > 200);
  if (highDPRTeams.length > 0) {
    warnings.push(
      `${highDPRTeams.length} teams have DPR values over 200. ` +
      `This indicates very poor defense and should be verified.`
    );
  }

  // Check for teams with very few matches
  const lowMatchTeams = results.teams.filter(t => t.matchesPlayed < 3);
  if (lowMatchTeams.length > 0) {
    warnings.push(
      `${lowMatchTeams.length} teams have played fewer than 3 matches. ` +
      `DPR values may be less reliable for these teams.`
    );
  }

  // Check if average DPR roughly equals average score
  const avgDPR = results.teams.reduce((sum, t) => sum + t.dpr, 0) / results.teams.length;
  if (avgDPR < 10 || avgDPR > 150) {
    warnings.push(
      `Average DPR is ${avgDPR.toFixed(2)}, which seems unusual. ` +
      `Typical values range from 30-100 depending on the game.`
    );
  }

  return warnings;
}