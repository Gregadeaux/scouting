/**
 * Pick List Generation Algorithm
 *
 * Multi-Criteria Decision Analysis (MCDA) for ranking teams for alliance selection.
 *
 * Algorithm Overview:
 * 1. Normalize all metrics to 0-1 scale (DPR is inverted - lower is better)
 * 2. Apply weighted sum: score = Σ(weight_i × normalized_metric_i)
 * 3. Rank teams by composite score
 * 4. Extract strengths/weaknesses from patterns
 *
 * Based on Team 1678's pick list methodology with enhancements for:
 * - Multiple metric types (objective and subjective)
 * - Reliability tracking
 * - Qualitative scout observations
 */

import type {
  PickListWeights,
  PickListTeam,
  NormalizedMetric,
  TeamNormalization,
} from '@/types/picklist';

/**
 * Raw team data for pick list calculation
 * Sourced from team_statistics and match_scouting tables
 */
export interface RawTeamData {
  teamNumber: number;
  teamName?: string;
  teamNickname?: string;
  matchesPlayed: number;
  opr: number;
  dpr: number;
  ccwm: number;
  avgTotalScore?: number;
  avgAutoScore?: number;
  avgTeleopScore?: number;
  avgEndgameScore?: number;
  reliabilityScore?: number;
  avgDefenseRating?: number;
  avgDriverSkill?: number;
  avgSpeedRating?: number;
  notes?: string;
}

/**
 * Normalize a single metric to 0-1 scale
 *
 * @param value - Value to normalize
 * @param min - Minimum value in dataset
 * @param max - Maximum value in dataset
 * @param invert - If true, invert the scale (for metrics where lower is better like DPR)
 * @returns Normalized metric result
 */
export function normalizeMetric(
  value: number,
  min: number,
  max: number,
  invert: boolean = false
): NormalizedMetric {
  const range = max - min;

  // Handle edge case where all values are the same
  if (range === 0) {
    return {
      original: value,
      normalized: 0.5, // Middle value if no variance
      min,
      max,
      range: 0,
    };
  }

  // Standard min-max normalization
  let normalized = (value - min) / range;

  // Invert if specified (for metrics where lower is better)
  if (invert) {
    normalized = 1 - normalized;
  }

  // Clamp to [0, 1] to handle any floating point issues
  normalized = Math.max(0, Math.min(1, normalized));

  return {
    original: value,
    normalized: Number(normalized.toFixed(4)),
    min,
    max,
    range,
  };
}

/**
 * Normalize all metrics for a set of teams
 *
 * @param teams - Raw team data
 * @returns Map of team number to normalized metrics
 */
export function normalizeAllMetrics(
  teams: RawTeamData[]
): Map<number, TeamNormalization> {
  if (teams.length === 0) {
    return new Map();
  }

  // Extract all metric values and find min/max
  const metrics = {
    opr: teams.map(t => t.opr),
    dpr: teams.map(t => t.dpr),
    ccwm: teams.map(t => t.ccwm),
    autoScore: teams.map(t => t.avgAutoScore || 0),
    teleopScore: teams.map(t => t.avgTeleopScore || 0),
    endgameScore: teams.map(t => t.avgEndgameScore || 0),
    reliability: teams.map(t => t.reliabilityScore || 100), // Default to perfect if not provided
    driverSkill: teams.map(t => t.avgDriverSkill || 3), // Default to middle if not rated
    defenseRating: teams.map(t => t.avgDefenseRating || 3),
    speedRating: teams.map(t => t.avgSpeedRating || 3),
  };

  // Calculate min/max for each metric
  const ranges = {
    opr: { min: Math.min(...metrics.opr), max: Math.max(...metrics.opr) },
    dpr: { min: Math.min(...metrics.dpr), max: Math.max(...metrics.dpr) },
    ccwm: { min: Math.min(...metrics.ccwm), max: Math.max(...metrics.ccwm) },
    autoScore: { min: Math.min(...metrics.autoScore), max: Math.max(...metrics.autoScore) },
    teleopScore: { min: Math.min(...metrics.teleopScore), max: Math.max(...metrics.teleopScore) },
    endgameScore: { min: Math.min(...metrics.endgameScore), max: Math.max(...metrics.endgameScore) },
    reliability: { min: Math.min(...metrics.reliability), max: Math.max(...metrics.reliability) },
    driverSkill: { min: Math.min(...metrics.driverSkill), max: Math.max(...metrics.driverSkill) },
    defenseRating: { min: Math.min(...metrics.defenseRating), max: Math.max(...metrics.defenseRating) },
    speedRating: { min: Math.min(...metrics.speedRating), max: Math.max(...metrics.speedRating) },
  };

  // Normalize each team
  const normalizedMap = new Map<number, TeamNormalization>();

  teams.forEach(team => {
    const normalized: TeamNormalization = {
      teamNumber: team.teamNumber,
      opr: normalizeMetric(team.opr, ranges.opr.min, ranges.opr.max, false),
      dpr: normalizeMetric(team.dpr, ranges.dpr.min, ranges.dpr.max, true), // Invert: lower DPR is better
      ccwm: normalizeMetric(team.ccwm, ranges.ccwm.min, ranges.ccwm.max, false),
      autoScore: normalizeMetric(team.avgAutoScore || 0, ranges.autoScore.min, ranges.autoScore.max, false),
      teleopScore: normalizeMetric(team.avgTeleopScore || 0, ranges.teleopScore.min, ranges.teleopScore.max, false),
      endgameScore: normalizeMetric(team.avgEndgameScore || 0, ranges.endgameScore.min, ranges.endgameScore.max, false),
      reliability: normalizeMetric(team.reliabilityScore || 100, ranges.reliability.min, ranges.reliability.max, false),
      driverSkill: normalizeMetric(team.avgDriverSkill || 3, ranges.driverSkill.min, ranges.driverSkill.max, false),
      defenseRating: normalizeMetric(team.avgDefenseRating || 3, ranges.defenseRating.min, ranges.defenseRating.max, false),
      speedRating: normalizeMetric(team.avgSpeedRating || 3, ranges.speedRating.min, ranges.speedRating.max, false),
    };

    normalizedMap.set(team.teamNumber, normalized);
  });

  return normalizedMap;
}

/**
 * Calculate composite score for a team using weighted metrics
 *
 * @param normalized - Normalized metrics for the team
 * @param weights - Weight configuration
 * @returns Composite score (0-1 scale)
 */
export function calculateCompositeScore(
  normalized: TeamNormalization,
  weights: PickListWeights
): number {
  const score =
    weights.opr * normalized.opr.normalized +
    weights.dpr * normalized.dpr.normalized +
    weights.ccwm * normalized.ccwm.normalized +
    weights.autoScore * normalized.autoScore.normalized +
    weights.teleopScore * normalized.teleopScore.normalized +
    weights.endgameScore * normalized.endgameScore.normalized +
    weights.reliability * normalized.reliability.normalized +
    weights.driverSkill * normalized.driverSkill.normalized +
    weights.defenseRating * normalized.defenseRating.normalized +
    weights.speedRating * normalized.speedRating.normalized;

  // Normalize by sum of weights for interpretability
  const weightSum =
    weights.opr +
    weights.dpr +
    weights.ccwm +
    weights.autoScore +
    weights.teleopScore +
    weights.endgameScore +
    weights.reliability +
    weights.driverSkill +
    weights.defenseRating +
    weights.speedRating;

  const normalizedScore = weightSum > 0 ? score / weightSum : 0;

  return Number(normalizedScore.toFixed(4));
}

/**
 * Extract strengths from a team's normalized metrics
 * Identifies metrics that are significantly above average (top 30%)
 *
 * @param normalized - Normalized metrics for the team
 * @param threshold - Percentile threshold (default 0.7 = top 30%)
 * @returns Array of strength descriptions
 */
export function extractStrengths(
  normalized: TeamNormalization,
  threshold: number = 0.7
): string[] {
  const strengths: string[] = [];

  if (normalized.opr.normalized >= threshold) {
    strengths.push('High offensive output (OPR)');
  }
  if (normalized.dpr.normalized >= threshold) {
    strengths.push('Strong defense (low DPR)');
  }
  if (normalized.ccwm.normalized >= threshold) {
    strengths.push('Excellent net contribution (CCWM)');
  }
  if (normalized.autoScore.normalized >= threshold) {
    strengths.push('Consistent autonomous performance');
  }
  if (normalized.teleopScore.normalized >= threshold) {
    strengths.push('High teleop scoring');
  }
  if (normalized.endgameScore.normalized >= threshold) {
    strengths.push('Reliable endgame performance');
  }
  if (normalized.reliability.normalized >= 0.9) {
    strengths.push('Extremely reliable robot');
  }
  if (normalized.driverSkill.normalized >= threshold) {
    strengths.push('Skilled drivers');
  }
  if (normalized.defenseRating.normalized >= threshold) {
    strengths.push('Good defensive play');
  }
  if (normalized.speedRating.normalized >= threshold) {
    strengths.push('Fast cycle times');
  }

  return strengths;
}

/**
 * Extract weaknesses from a team's normalized metrics
 * Identifies metrics that are significantly below average (bottom 30%)
 *
 * @param normalized - Normalized metrics for the team
 * @param threshold - Percentile threshold (default 0.3 = bottom 30%)
 * @returns Array of weakness descriptions
 */
export function extractWeaknesses(
  normalized: TeamNormalization,
  threshold: number = 0.3
): string[] {
  const weaknesses: string[] = [];

  if (normalized.opr.normalized <= threshold) {
    weaknesses.push('Lower offensive output');
  }
  if (normalized.dpr.normalized <= threshold) {
    weaknesses.push('Defense needs improvement (high DPR)');
  }
  if (normalized.ccwm.normalized <= threshold) {
    weaknesses.push('Low net contribution');
  }
  if (normalized.autoScore.normalized <= threshold) {
    weaknesses.push('Inconsistent autonomous');
  }
  if (normalized.endgameScore.normalized <= threshold) {
    weaknesses.push('Unreliable endgame');
  }
  if (normalized.reliability.normalized <= 0.7) {
    weaknesses.push('Reliability concerns');
  }
  if (normalized.driverSkill.normalized <= threshold) {
    weaknesses.push('Driver skill could improve');
  }
  if (normalized.speedRating.normalized <= threshold) {
    weaknesses.push('Slower cycle times');
  }

  return weaknesses;
}

/**
 * Generate pick list teams with rankings
 *
 * @param rawTeams - Raw team data
 * @param weights - Weight configuration
 * @param minMatches - Minimum matches played to be included
 * @returns Ranked pick list teams
 */
export function rankTeams(
  rawTeams: RawTeamData[],
  weights: PickListWeights,
  minMatches: number = 5
): PickListTeam[] {
  // Filter teams by minimum matches
  const filteredTeams = rawTeams.filter(t => t.matchesPlayed >= minMatches);

  if (filteredTeams.length === 0) {
    return [];
  }

  // Normalize all metrics
  const normalizedMap = normalizeAllMetrics(filteredTeams);

  // Calculate composite scores
  const teamsWithScores: PickListTeam[] = filteredTeams.map(team => {
    const normalized = normalizedMap.get(team.teamNumber);
    if (!normalized) {
      throw new Error(`Normalization failed for team ${team.teamNumber}`);
    }

    const compositeScore = calculateCompositeScore(normalized, weights);
    const strengths = extractStrengths(normalized);
    const weaknesses = extractWeaknesses(normalized);

    return {
      teamNumber: team.teamNumber,
      teamName: team.teamName,
      teamNickname: team.teamNickname,
      matchesPlayed: team.matchesPlayed,
      opr: team.opr,
      dpr: team.dpr,
      ccwm: team.ccwm,
      avgTotalScore: team.avgTotalScore,
      avgAutoScore: team.avgAutoScore,
      avgTeleopScore: team.avgTeleopScore,
      avgEndgameScore: team.avgEndgameScore,
      reliabilityScore: team.reliabilityScore,
      avgDefenseRating: team.avgDefenseRating,
      avgDriverSkill: team.avgDriverSkill,
      avgSpeedRating: team.avgSpeedRating,
      compositeScore,
      rank: 0, // Will be assigned after sorting
      normalizedScore: compositeScore,
      strengths,
      weaknesses,
      picked: false,
      notes: team.notes,
    };
  });

  // Sort by composite score descending (highest first)
  teamsWithScores.sort((a, b) => b.compositeScore - a.compositeScore);

  // Assign ranks
  teamsWithScores.forEach((team, index) => {
    team.rank = index + 1;
  });

  return teamsWithScores;
}

/**
 * Validate pick list weights
 * Ensures all weights are non-negative and sum is reasonable
 *
 * @param weights - Weight configuration to validate
 * @returns Validation result with warnings
 */
export function validateWeights(weights: PickListWeights): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for negative weights
  Object.entries(weights).forEach(([key, value]) => {
    if (value < 0) {
      warnings.push(`Negative weight for ${key}: ${value}`);
    }
  });

  // Check sum of weights
  const sum =
    weights.opr +
    weights.dpr +
    weights.ccwm +
    weights.autoScore +
    weights.teleopScore +
    weights.endgameScore +
    weights.reliability +
    weights.driverSkill +
    weights.defenseRating +
    weights.speedRating;

  if (sum === 0) {
    warnings.push('All weights are zero - pick list will be meaningless');
  } else if (sum < 0.5 || sum > 2.0) {
    warnings.push(
      `Weight sum is ${sum.toFixed(2)} - recommended range is 0.5 to 2.0 for interpretability`
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Calculate statistics for a pick list
 *
 * @param teams - Ranked pick list teams
 * @returns Statistics object
 */
export function calculatePickListStatistics(teams: PickListTeam[]): {
  avgCompositeScore: number;
  medianCompositeScore: number;
  stdDevCompositeScore: number;
  avgOPR: number;
  avgDPR: number;
  avgCCWM: number;
} {
  if (teams.length === 0) {
    return {
      avgCompositeScore: 0,
      medianCompositeScore: 0,
      stdDevCompositeScore: 0,
      avgOPR: 0,
      avgDPR: 0,
      avgCCWM: 0,
    };
  }

  // Average composite score
  const sumComposite = teams.reduce((sum, t) => sum + t.compositeScore, 0);
  const avgCompositeScore = sumComposite / teams.length;

  // Median composite score
  const sortedScores = teams.map(t => t.compositeScore).sort((a, b) => a - b);
  const medianCompositeScore =
    sortedScores.length % 2 === 0
      ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
      : sortedScores[Math.floor(sortedScores.length / 2)];

  // Standard deviation of composite scores
  const variance =
    teams.reduce((sum, t) => sum + Math.pow(t.compositeScore - avgCompositeScore, 2), 0) /
    teams.length;
  const stdDevCompositeScore = Math.sqrt(variance);

  // Average OPR, DPR, CCWM
  const sumOPR = teams.reduce((sum, t) => sum + t.opr, 0);
  const sumDPR = teams.reduce((sum, t) => sum + t.dpr, 0);
  const sumCCWM = teams.reduce((sum, t) => sum + t.ccwm, 0);

  return {
    avgCompositeScore: Number(avgCompositeScore.toFixed(4)),
    medianCompositeScore: Number(medianCompositeScore.toFixed(4)),
    stdDevCompositeScore: Number(stdDevCompositeScore.toFixed(4)),
    avgOPR: Number((sumOPR / teams.length).toFixed(2)),
    avgDPR: Number((sumDPR / teams.length).toFixed(2)),
    avgCCWM: Number((sumCCWM / teams.length).toFixed(2)),
  };
}
