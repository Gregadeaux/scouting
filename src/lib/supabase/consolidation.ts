/**
 * Multi-Scout Data Consolidation
 *
 * Implements Team 1678-style consolidation algorithms:
 * - Majority voting for booleans
 * - Weighted averaging for numeric values
 * - Scout Performance Rating (SPR) calculations
 *
 * Based on: https://www.chiefdelphi.com/t/1678-match-data-collection-consolidation/166417
 */

import type { MatchScouting, JSONBData, ScoutingSubmission } from '@/types';

// ============================================================================
// SCOUT PERFORMANCE TRACKING
// ============================================================================

export interface ScoutPerformanceRating {
  scout_name: string;
  total_observations: number;
  accuracy_score: number; // 0-1 scale, based on agreement with other scouts
  reliability_score: number; // 0-1 scale, based on consistency
  weight: number; // Calculated weight for averaging (0-1)
}

/**
 * Calculate Scout Performance Rating (SPR)
 * Based on:
 * 1. Agreement with other scouts (inter-rater reliability)
 * 2. Consistency over time
 * 3. Outlier frequency
 * Returns: 0.5 to 1.5 (1.0 = average scout)
 */
export function calculateScoutPerformanceRating(
  scoutName: string,
  historicalData: ScoutingSubmission[]
): number {
  if (historicalData.length === 0) return 1.0;

  const scoutData = historicalData.filter(d => d.scout_name === scoutName);
  if (scoutData.length === 0) return 1.0;

  // Calculate agreement score (how often this scout agrees with others)
  const agreementScores = scoutData
    .map(d => d.agreement_score || 0.5)
    .filter(score => score > 0);
  const avgAgreement = agreementScores.length > 0
    ? agreementScores.reduce((a, b) => a + b, 0) / agreementScores.length
    : 0.5;

  // Calculate consistency score (standard deviation of accuracy over time)
  const accuracyScores = scoutData
    .map(d => d.accuracy_score || 0.5)
    .filter(score => score > 0);

  let consistency = 1.0;
  if (accuracyScores.length > 1) {
    const mean = accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length;
    const variance = accuracyScores.reduce((sum, score) =>
      sum + Math.pow(score - mean, 2), 0) / accuracyScores.length;
    const stdDev = Math.sqrt(variance);
    consistency = Math.max(0, 1 - stdDev); // Lower std dev = higher consistency
  }

  // Calculate outlier penalty (how often scout's data is an outlier)
  const outlierRate = scoutData.filter(d =>
    d.accuracy_score && d.accuracy_score < 0.3
  ).length / scoutData.length;
  const outlierPenalty = 1 - (outlierRate * 0.5); // Max 50% penalty for outliers

  // Combine factors
  const spr = avgAgreement * 0.4 + consistency * 0.3 + outlierPenalty * 0.3;

  // Scale to 0.5 - 1.5 range
  return 0.5 + spr;
}

/**
 * Calculate scout weights based on historical performance
 * Uses Scout Performance Rating (SPR) for weighting
 */
export function calculateScoutWeights(
  scoutNames: string[],
  historicalData?: ScoutingSubmission[]
): Record<string, number> {
  const weights: Record<string, number> = {};

  if (!historicalData || historicalData.length === 0) {
    // Equal weights if no historical data
    for (const name of scoutNames) {
      weights[name] = 1.0;
    }
    return weights;
  }

  // Calculate SPR for each scout
  for (const name of scoutNames) {
    weights[name] = calculateScoutPerformanceRating(name, historicalData);
  }

  return weights;
}

// ============================================================================
// CONSOLIDATION ALGORITHMS
// ============================================================================

/**
 * Majority voting for boolean values
 * If tie, defaults to false (conservative approach)
 */
export function majorityVote(values: boolean[]): boolean {
  if (values.length === 0) return false;

  const trueCount = values.filter((v) => v === true).length;
  const falseCount = values.filter((v) => v === false).length;

  return trueCount > falseCount;
}

/**
 * Weighted average for numeric values
 * Filters out null/undefined values
 */
export function weightedAverage(
  values: (number | null | undefined)[],
  weights: number[]
): number {
  const validPairs: Array<[number, number]> = [];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const weight = weights[i] || 1.0;

    if (value !== null && value !== undefined && !isNaN(value)) {
      validPairs.push([value, weight]);
    }
  }

  if (validPairs.length === 0) return 0;

  const weightedSum = validPairs.reduce((sum, [val, weight]) => sum + val * weight, 0);
  const totalWeight = validPairs.reduce((sum, [_, weight]) => sum + weight, 0);

  return weightedSum / totalWeight;
}

/**
 * Mode (most common value) for categorical data
 * Returns the most frequently occurring value
 */
export function mode<T>(values: T[]): T | null {
  if (values.length === 0) return null;

  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  let maxCount = 0;
  let modeValue: T | null = null;

  for (const [value, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      modeValue = value;
    }
  }

  return modeValue;
}

// ============================================================================
// OUTLIER DETECTION
// ============================================================================

/**
 * Detect outliers using IQR (Interquartile Range) method
 * Returns array of booleans where true = outlier
 */
export function detectOutliersIQR(values: number[]): boolean[] {
  if (values.length < 4) {
    // Need at least 4 values for IQR
    return values.map(() => false);
  }

  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(values.length * 0.25);
  const q3Index = Math.floor(values.length * 0.75);

  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return values.map(v => v < lowerBound || v > upperBound);
}

/**
 * Detect outliers using Z-score method
 * Returns array of booleans where true = outlier
 */
export function detectOutliersZScore(values: number[], threshold: number = 3): boolean[] {
  if (values.length < 2) {
    return values.map(() => false);
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) =>
    sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    // All values are the same
    return values.map(() => false);
  }

  return values.map(v => Math.abs((v - mean) / stdDev) > threshold);
}

/**
 * Generic outlier detection
 */
export function detectOutliers<T extends number>(
  values: T[],
  method: 'iqr' | 'zscore' = 'iqr'
): boolean[] {
  if (method === 'zscore') {
    return detectOutliersZScore(values);
  } else {
    return detectOutliersIQR(values);
  }
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Calculate trend using linear regression
 * Returns the trend direction and confidence level
 */
export function calculateTrend(
  values: number[],
  timestamps?: Date[]
): { direction: 'improving' | 'stable' | 'declining'; confidence: number } {
  if (values.length < 3) {
    return { direction: 'stable', confidence: 0.5 };
  }

  // Create x values (time indices or actual timestamps)
  const xValues = timestamps
    ? timestamps.map(t => t.getTime())
    : values.map((_, i) => i);

  // Calculate means
  const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
  const yMean = values.reduce((a, b) => a + b, 0) / values.length;

  // Calculate slope using linear regression
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < values.length; i++) {
    numerator += (xValues[i] - xMean) * (values[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }

  if (denominator === 0) {
    return { direction: 'stable', confidence: 0.5 };
  }

  const slope = numerator / denominator;

  // Calculate R-squared for confidence
  const yPredicted = xValues.map(x => slope * (x - xMean) + yMean);
  const ssRes = values.reduce((sum, y, i) =>
    sum + Math.pow(y - yPredicted[i], 2), 0);
  const ssTot = values.reduce((sum, y) =>
    sum + Math.pow(y - yMean, 2), 0);

  const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

  // Normalize slope to determine significance
  const normalizedSlope = slope / (yMean || 1);

  // Determine direction based on slope
  let direction: 'improving' | 'stable' | 'declining';
  if (Math.abs(normalizedSlope) < 0.05) {
    direction = 'stable';
  } else if (normalizedSlope > 0) {
    direction = 'improving';
  } else {
    direction = 'declining';
  }

  return {
    direction,
    confidence: Math.max(0, Math.min(1, rSquared))
  };
}

// ============================================================================
// JSONB CONSOLIDATION
// ============================================================================

/**
 * Consolidate numeric fields from multiple JSONB objects
 * Uses weighted averaging
 */
export function consolidateJSONBNumbers(
  objects: JSONBData[],
  field: string,
  weights: number[]
): number {
  const values = objects.map((obj) => obj[field] as number);
  return Math.round(weightedAverage(values, weights));
}

/**
 * Consolidate boolean fields from multiple JSONB objects
 * Uses majority voting
 */
export function consolidateJSONBBooleans(objects: JSONBData[], field: string): boolean {
  const values = objects.map((obj) => obj[field] as boolean);
  return majorityVote(values);
}

/**
 * Consolidate categorical fields from multiple JSONB objects
 * Uses mode (most common value)
 */
export function consolidateJSONBCategories<T = string>(
  objects: JSONBData[],
  field: string
): T | null {
  const values = objects.map((obj) => obj[field] as T).filter((v) => v !== null && v !== undefined);
  return mode(values);
}

/**
 * Consolidate entire JSONB performance objects
 * Automatically detects field types and applies appropriate consolidation
 */
export function consolidatePerformanceData(
  observations: JSONBData[],
  scoutWeights?: number[]
): JSONBData {
  if (observations.length === 0) return {};
  if (observations.length === 1) return observations[0];

  const weights = scoutWeights || observations.map(() => 1.0);
  const consolidated: JSONBData = {};

  // Get all unique keys across all observations
  const allKeys = new Set<string>();
  for (const obj of observations) {
    Object.keys(obj).forEach((key) => allKeys.add(key));
  }

  // Consolidate each field
  for (const key of allKeys) {
    const firstValue = observations[0][key];

    // Preserve schema_version and notes specially
    if (key === 'schema_version') {
      consolidated[key] = firstValue;
      continue;
    }

    if (key === 'notes') {
      // Combine all notes
      const notes = observations
        .map((obj) => obj[key])
        .filter((n) => n)
        .join(' | ');
      consolidated[key] = notes;
      continue;
    }

    // Determine type and consolidate
    if (typeof firstValue === 'boolean') {
      consolidated[key] = consolidateJSONBBooleans(observations, key);
    } else if (typeof firstValue === 'number') {
      consolidated[key] = consolidateJSONBNumbers(observations, key, weights);
    } else if (typeof firstValue === 'string') {
      consolidated[key] = consolidateJSONBCategories<string>(observations, key);
    } else {
      // For complex types, just use the first non-null value
      const firstNonNull = observations.find((obj) => obj[key] != null)?.[key];
      if (firstNonNull !== undefined) {
        consolidated[key] = firstNonNull;
      }
    }
  }

  return consolidated;
}

// ============================================================================
// MATCH SCOUTING CONSOLIDATION
// ============================================================================

export interface ConsolidatedMatchScouting {
  match_id: number;
  match_key: string; // FK to match_schedule.match_key
  team_number: number;
  alliance_color: 'red' | 'blue';
  scout_count: number;
  scouts: string[];

  // Consolidated fixed fields
  starting_position?: number;
  robot_disconnected: boolean;
  robot_disabled: boolean;
  robot_tipped: boolean;
  foul_count: number;
  tech_foul_count: number;
  yellow_card: boolean;
  red_card: boolean;

  // Consolidated JSONB fields
  auto_performance: JSONBData;
  teleop_performance: JSONBData;
  endgame_performance: JSONBData;

  // Consolidated ratings
  defense_rating?: number;
  driver_skill_rating?: number;
  speed_rating?: number;

  // Combined qualitative data
  strengths?: string;
  weaknesses?: string;
  notes?: string;
}

/**
 * Consolidate multiple match scouting observations into a single record
 * Implements Team 1678-style consolidation algorithms
 */
export function consolidateMatchScoutingObservations(
  observations: MatchScouting[]
): ConsolidatedMatchScouting {
  if (observations.length === 0) {
    throw new Error('No observations to consolidate');
  }

  // Get scout weights (equal weights for now)
  const scoutNames = observations.map((o) => o.scout_name);
  const weights = calculateScoutWeights(scoutNames);
  const weightArray = scoutNames.map((name) => weights[name]);

  const first = observations[0];

  // Consolidate boolean fields using majority vote
  const booleanFields = [
    'robot_disconnected',
    'robot_disabled',
    'robot_tipped',
    'yellow_card',
    'red_card',
  ];
  const consolidatedBooleans: Record<string, boolean> = {};

  for (const field of booleanFields) {
    const values = observations.map((o) => o[field as keyof MatchScouting] as boolean);
    consolidatedBooleans[field] = majorityVote(values);
  }

  // Consolidate numeric fields using weighted average
  const numericFields = [
    'foul_count',
    'tech_foul_count',
    'defense_rating',
    'driver_skill_rating',
    'speed_rating',
    'starting_position',
  ];
  const consolidatedNumbers: Record<string, number | undefined> = {};

  for (const field of numericFields) {
    const values = observations.map((o) => o[field as keyof MatchScouting] as number | undefined);
    const avg = weightedAverage(values, weightArray);
    consolidatedNumbers[field] = avg > 0 ? Math.round(avg) : undefined;
  }

  // Consolidate JSONB performance data
  const autoPerformance = consolidatePerformanceData(
    observations.map((o) => o.auto_performance),
    weightArray
  );
  const teleopPerformance = consolidatePerformanceData(
    observations.map((o) => o.teleop_performance),
    weightArray
  );
  const endgamePerformance = consolidatePerformanceData(
    observations.map((o) => o.endgame_performance),
    weightArray
  );

  // Combine text fields
  const combineText = (field: keyof MatchScouting): string => {
    return observations
      .map((o) => o[field])
      .filter((v) => v)
      .join(' | ');
  };

  return {
    match_id: first.match_id,
    match_key: first.match_key,
    team_number: first.team_number,
    alliance_color: first.alliance_color,
    scout_count: observations.length,
    scouts: scoutNames,

    // Consolidated fixed fields
    starting_position: consolidatedNumbers.starting_position,
    robot_disconnected: consolidatedBooleans.robot_disconnected,
    robot_disabled: consolidatedBooleans.robot_disabled,
    robot_tipped: consolidatedBooleans.robot_tipped,
    foul_count: Math.round(consolidatedNumbers.foul_count || 0),
    tech_foul_count: Math.round(consolidatedNumbers.tech_foul_count || 0),
    yellow_card: consolidatedBooleans.yellow_card,
    red_card: consolidatedBooleans.red_card,

    // Consolidated JSONB
    auto_performance: autoPerformance,
    teleop_performance: teleopPerformance,
    endgame_performance: endgamePerformance,

    // Consolidated ratings
    defense_rating: consolidatedNumbers.defense_rating,
    driver_skill_rating: consolidatedNumbers.driver_skill_rating,
    speed_rating: consolidatedNumbers.speed_rating,

    // Combined text
    strengths: combineText('strengths'),
    weaknesses: combineText('weaknesses'),
    notes: combineText('notes'),
  };
}

/**
 * Get consolidated data for a specific team in a specific match
 * Queries the database and consolidates multiple scout observations
 */
export async function getConsolidatedMatchData(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>,
  matchId: number,
  teamNumber: number
): Promise<ConsolidatedMatchScouting | null> {
  const { data, error } = await supabase
    .from('match_scouting')
    .select('*')
    .eq('match_id', matchId)
    .eq('team_number', teamNumber);

  if (error || !data || data.length === 0) {
    return null;
  }

  return consolidateMatchScoutingObservations(data);
}
