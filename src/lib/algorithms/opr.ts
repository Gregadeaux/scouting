/**
 * Offensive Power Rating (OPR) Calculation Algorithm
 *
 * OPR is a statistical measure that predicts a team's average point contribution
 * to their alliance score. It uses linear algebra (least squares regression) to solve
 * a system of equations based on actual match results.
 *
 * Mathematical approach:
 * - For each match: alliance_score = team1_OPR + team2_OPR + team3_OPR
 * - Build coefficient matrix A and score vector b
 * - Solve using least squares: A^T * A * x = A^T * b
 *
 * References:
 * - https://www.thebluealliance.com/opr
 * - Caleb Sykes OPR methodology
 */

import * as math from 'mathjs';
import type { MatchSchedule } from '@/types';

/**
 * Individual team OPR result
 */
export interface OPRResult {
  teamNumber: number;
  opr: number;
  matchesPlayed: number;
}

/**
 * Complete OPR calculation result for an event
 */
export interface OPRCalculationResult {
  eventKey: string;
  teams: OPRResult[];
  calculatedAt: Date;
  totalMatches: number;
  warnings: string[];
}

/**
 * Calculate OPR for all teams at an event
 *
 * @param eventKey - Event key (e.g., "2025cafr")
 * @param matches - Array of completed matches with scores
 * @returns OPR values for all teams
 * @throws Error if insufficient data for calculation
 */
export async function calculateOPR(
  eventKey: string,
  matches: MatchSchedule[]
): Promise<OPRCalculationResult> {
  // 1. Filter completed matches (must have scores)
  const completedMatches = matches.filter(
    m => m.red_score !== null &&
      m.red_score !== undefined &&
      m.blue_score !== null &&
      m.blue_score !== undefined
  );

  if (completedMatches.length < 3) {
    throw new Error(`Insufficient matches for OPR calculation. Need at least 3 completed matches, found ${completedMatches.length}`);
  }

  // 2. Extract all unique team numbers
  const teams = extractUniqueTeams(completedMatches);
  const teamCount = teams.length;

  if (teamCount < 3) {
    throw new Error(`Insufficient teams for OPR calculation. Need at least 3 teams, found ${teamCount}`);
  }

  // 3. Build coefficient matrix A and score vector b
  const { A, b } = buildMatrices(completedMatches, teams);

  // 4. Solve using least squares: A^T * A * x = A^T * b
  let oprValues: math.Matrix;
  const warnings: string[] = [];

  try {
    const AT = math.transpose(A);
    const ATA = math.multiply(AT, A) as math.Matrix;
    const ATb = math.multiply(AT, b) as math.Matrix;

    // Solve linear system
    oprValues = math.lusolve(ATA, ATb) as math.Matrix;
  } catch {
    // Handle singular matrix (use pseudo-inverse)
    warnings.push('Matrix was singular, using pseudo-inverse. Results may be less accurate.');
    const result = handleSingularMatrix(A, b, teams, eventKey, completedMatches);
    return result;
  }

  // 5. Format results
  const results: OPRResult[] = teams.map((teamNumber, index) => ({
    teamNumber,
    opr: Number((oprValues.get([index, 0]) as number).toFixed(2)),
    matchesPlayed: countTeamMatches(completedMatches, teamNumber),
  }));

  // Sort by OPR descending
  results.sort((a, b) => b.opr - a.opr);

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
 * Build coefficient matrix A and score vector b
 *
 * Each row represents an alliance in a match
 * Each column represents a team
 * A[i][j] = 1 if team j is in alliance i, 0 otherwise
 * b[i] = score of alliance i
 */
function buildMatrices(
  matches: MatchSchedule[],
  teams: number[]
): { A: math.Matrix; b: math.Matrix } {
  const teamIndexMap = new Map(teams.map((t, i) => [t, i]));
  const teamCount = teams.length;

  const A: number[][] = [];
  const b: number[] = [];

  matches.forEach(match => {
    // Red alliance row
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
    b.push(match.red_score!);

    // Blue alliance row
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
    b.push(match.blue_score!);
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
 *
 * This can happen when:
 * - Not enough match diversity (teams always play together)
 * - New teams with very few matches
 * - Mathematical edge cases in the data
 */
function handleSingularMatrix(
  A: math.Matrix,
  b: math.Matrix,
  teams: number[],
  eventKey: string,
  matches: MatchSchedule[]
): OPRCalculationResult {
  // Use pseudo-inverse (Moore-Penrose inverse)
  // This provides the least-squares solution even for singular matrices
  const Apinv = math.pinv(A as unknown as math.MathType) as math.Matrix;
  const oprValues = math.multiply(Apinv, b) as math.Matrix;

  const results: OPRResult[] = teams.map((teamNumber, index) => ({
    teamNumber,
    opr: Number((oprValues.get([index, 0]) as number).toFixed(2)),
    matchesPlayed: countTeamMatches(matches, teamNumber),
  }));

  // Sort by OPR descending
  results.sort((a, b) => b.opr - a.opr);

  return {
    eventKey,
    teams: results,
    calculatedAt: new Date(),
    totalMatches: matches.length,
    warnings: ['Matrix was singular, used pseudo-inverse. Results may be less accurate.'],
  };
}

/**
 * Calculate Component OPR using a custom score extractor
 *
 * This reuses the same linear algebra approach as calculateOPR but accepts
 * a callback to extract sub-scores (e.g., auto points, teleop hub points)
 * instead of using the total match score.
 *
 * @param eventKey - Event key
 * @param matches - Array of completed matches
 * @param scoreExtractor - Function that extracts the relevant score for an alliance.
 *   Return null to skip a match (e.g., if score_breakdown is missing).
 * @returns OPR values for each team based on the extracted sub-score
 */
export async function calculateComponentOPR(
  eventKey: string,
  matches: MatchSchedule[],
  scoreExtractor: (match: MatchSchedule, alliance: 'red' | 'blue') => number | null
): Promise<OPRCalculationResult> {
  // Filter to matches where both alliances have extractable scores
  const validMatches = matches.filter(m => {
    const redScore = scoreExtractor(m, 'red');
    const blueScore = scoreExtractor(m, 'blue');
    return redScore !== null && blueScore !== null;
  });

  if (validMatches.length < 3) {
    throw new Error(
      `Insufficient matches for component OPR. Need at least 3 valid matches, found ${validMatches.length}`
    );
  }

  const teams = extractUniqueTeams(validMatches);
  if (teams.length < 3) {
    throw new Error(
      `Insufficient teams for component OPR. Need at least 3 teams, found ${teams.length}`
    );
  }

  const { A, b } = buildMatricesWithExtractor(validMatches, teams, scoreExtractor);

  let oprValues: math.Matrix;
  const warnings: string[] = [];

  try {
    const AT = math.transpose(A);
    const ATA = math.multiply(AT, A) as math.Matrix;
    const ATb = math.multiply(AT, b) as math.Matrix;
    oprValues = math.lusolve(ATA, ATb) as math.Matrix;
  } catch {
    warnings.push('Matrix was singular, using pseudo-inverse. Results may be less accurate.');
    const Apinv = math.pinv(A as unknown as math.MathType) as math.Matrix;
    oprValues = math.multiply(Apinv, b) as math.Matrix;
  }

  const results: OPRResult[] = teams.map((teamNumber, index) => ({
    teamNumber,
    opr: Number((oprValues.get([index, 0]) as number).toFixed(2)),
    matchesPlayed: countTeamMatches(validMatches, teamNumber),
  }));

  results.sort((a, b) => b.opr - a.opr);

  return {
    eventKey,
    teams: results,
    calculatedAt: new Date(),
    totalMatches: validMatches.length,
    warnings,
  };
}

/**
 * Build coefficient matrix A and score vector b using a custom score extractor.
 * Same structure as buildMatrices but uses the extractor callback for scores.
 */
function buildMatricesWithExtractor(
  matches: MatchSchedule[],
  teams: number[],
  scoreExtractor: (match: MatchSchedule, alliance: 'red' | 'blue') => number | null
): { A: math.Matrix; b: math.Matrix } {
  const teamIndexMap = new Map(teams.map((t, i) => [t, i]));
  const teamCount = teams.length;

  const A: number[][] = [];
  const b: number[] = [];

  matches.forEach(match => {
    const redScore = scoreExtractor(match, 'red');
    const blueScore = scoreExtractor(match, 'blue');

    if (redScore !== null) {
      const redRow = new Array(teamCount).fill(0);

      if (match.red_1) {
        const idx = teamIndexMap.get(match.red_1);
        if (idx !== undefined) redRow[idx] = 1;
      }
      if (match.red_2) {
        const idx = teamIndexMap.get(match.red_2);
        if (idx !== undefined) redRow[idx] = 1;
      }
      if (match.red_3) {
        const idx = teamIndexMap.get(match.red_3);
        if (idx !== undefined) redRow[idx] = 1;
      }

      A.push(redRow);
      b.push(redScore);
    }

    if (blueScore !== null) {
      const blueRow = new Array(teamCount).fill(0);

      if (match.blue_1) {
        const idx = teamIndexMap.get(match.blue_1);
        if (idx !== undefined) blueRow[idx] = 1;
      }
      if (match.blue_2) {
        const idx = teamIndexMap.get(match.blue_2);
        if (idx !== undefined) blueRow[idx] = 1;
      }
      if (match.blue_3) {
        const idx = teamIndexMap.get(match.blue_3);
        if (idx !== undefined) blueRow[idx] = 1;
      }

      A.push(blueRow);
      b.push(blueScore);
    }
  });

  return {
    A: math.matrix(A),
    b: math.matrix(b.map(v => [v])),
  };
}

/**
 * Validate OPR results for sanity
 *
 * @param results - OPR calculation results
 * @returns Array of validation warnings
 */
export function validateOPRResults(results: OPRCalculationResult): string[] {
  const warnings: string[] = [];

  // Check for negative OPR values (unusual but possible)
  const negativeOPRTeams = results.teams.filter(t => t.opr < 0);
  if (negativeOPRTeams.length > 0) {
    warnings.push(
      `${negativeOPRTeams.length} teams have negative OPR values. ` +
      `This is unusual and may indicate data quality issues.`
    );
  }

  // Check for extremely high OPR values (> 200 is very rare)
  const highOPRTeams = results.teams.filter(t => t.opr > 200);
  if (highOPRTeams.length > 0) {
    warnings.push(
      `${highOPRTeams.length} teams have OPR values over 200. ` +
      `This is extremely high and should be verified.`
    );
  }

  // Check for teams with very few matches
  const lowMatchTeams = results.teams.filter(t => t.matchesPlayed < 3);
  if (lowMatchTeams.length > 0) {
    warnings.push(
      `${lowMatchTeams.length} teams have played fewer than 3 matches. ` +
      `OPR values may be less reliable for these teams.`
    );
  }

  return warnings;
}