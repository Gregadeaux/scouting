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

import type { MatchScouting, JSONBData } from '@/types';

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
 * Calculate scout performance ratings based on historical data
 * This would typically query historical scouting data to calculate accuracy
 *
 * For now, returns equal weights (1.0) for all scouts
 * TODO: Implement actual SPR calculation based on historical agreement
 */
export function calculateScoutWeights(
  scoutNames: string[]
): Record<string, number> {
  const weights: Record<string, number> = {};

  // Equal weights for now (each scout has weight 1.0)
  // In production, calculate based on historical performance
  for (const name of scoutNames) {
    weights[name] = 1.0;
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
  supabase: any,
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
