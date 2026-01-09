/**
 * Consensus Validation Strategy
 *
 * Validates scouter accuracy by comparing their submitted values against
 * consensus values calculated from ALL scouts who observed the same team
 * in the same match.
 *
 * Implementation Details:
 * - Uses existing consolidation logic from consolidation.ts
 * - Compares each field individually (auto_performance, teleop_performance, endgame_performance)
 * - Requires minimum 3 scouts (configurable)
 * - Handles boolean (exact match), numeric (scaled distance), and category (exact match) fields
 *
 * @see /src/lib/supabase/consolidation.ts - Consolidation algorithms
 * @see /src/types/validation.ts - Interface definitions
 */

import type {
  IValidationStrategy,
  ValidationContext,
  ValidationResult,
  ValidationOutcome,
  ValidationStrategyType,
  ConsensusValue,
  ConsensusMethod,
  FieldType,
} from '@/types/validation';
import type { MatchScouting, JSONBData } from '@/types';
import { ValidationError } from '@/types/validation';
import { ScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import { consolidatePerformanceData } from '@/lib/supabase/consolidation';
import { ELORatingCalculator } from '@/lib/algorithms/elo-calculator';

/**
 * Consensus Validation Strategy
 *
 * Validates scouters by comparing their observations against the consolidated
 * consensus from all scouts who observed the same match/team.
 */
export class ConsensusValidationStrategy implements IValidationStrategy {
  readonly name = 'Consensus Validation';
  readonly type: ValidationStrategyType = 'consensus';

  private repository: ScoutingDataRepository;
  private eloCalculator: ELORatingCalculator;

  constructor(
    repository?: ScoutingDataRepository,
    eloCalculator?: ELORatingCalculator
  ) {
    this.repository = repository || new ScoutingDataRepository();
    this.eloCalculator = eloCalculator || new ELORatingCalculator();
  }

  /**
   * Check if this strategy can validate the given context
   *
   * Requirements:
   * - matchKey must be provided
   * - teamNumber must be provided
   * - Minimum scouts threshold (default 3)
   *
   * @param context - Validation context
   * @returns true if strategy can be applied
   */
  async canValidate(context: ValidationContext): Promise<boolean> {
    // Must have match key and team number
    if (!context.matchKey || !context.teamNumber) {
      return false;
    }

    try {
      // Get all scouting observations for this match/team
      const observations = await this.repository.getMatchScoutingByMatch(
        context.matchKey
      );

      // Filter to this specific team
      const teamObservations = observations.filter(
        (obs) => obs.team_number === context.teamNumber
      );

      // Check if we meet minimum scout requirement
      const minScouts = context.minScoutsRequired ?? 3;
      return teamObservations.length >= minScouts;
    } catch (error) {
      console.error('Error checking if consensus validation can be applied:', error);
      return false;
    }
  }

  /**
   * Execute validation for the given context
   *
   * Process:
   * 1. Fetch all scout observations for match/team
   * 2. Calculate consensus values using consolidation logic
   * 3. Compare each scout against consensus
   * 4. Generate ValidationResult for each field for each scout
   *
   * @param context - Validation context
   * @returns Array of field-level validation results
   */
  async validate(context: ValidationContext): Promise<ValidationResult[]> {
    const { matchKey, teamNumber, eventKey, seasonYear } = context;

    // Validate required fields
    if (!matchKey) {
      throw new ValidationError(
        'matchKey is required for consensus validation',
        'MISSING_MATCH_KEY'
      );
    }

    if (!teamNumber) {
      throw new ValidationError(
        'teamNumber is required for consensus validation',
        'MISSING_TEAM_NUMBER'
      );
    }

    if (!eventKey) {
      throw new ValidationError(
        'eventKey is required for consensus validation',
        'MISSING_EVENT_KEY'
      );
    }

    if (!seasonYear) {
      throw new ValidationError(
        'seasonYear is required for consensus validation',
        'MISSING_SEASON_YEAR'
      );
    }

    // Get all observations for this match/team
    const allObservations = await this.repository.getMatchScoutingByMatch(matchKey);
    const observations = allObservations.filter(
      (obs) => obs.team_number === teamNumber
    );

    // Check minimum scouts requirement
    const minScouts = context.minScoutsRequired ?? 3;
    if (observations.length < minScouts) {
      throw new ValidationError(
        `Insufficient scouts: found ${observations.length}, minimum required ${minScouts}`,
        'INSUFFICIENT_SCOUTS',
        { found: observations.length, required: minScouts }
      );
    }

    // Calculate consensus values using consolidation logic
    const consensusAuto = consolidatePerformanceData(
      observations.map((obs) => obs.auto_performance)
    );
    const consensusTeleop = consolidatePerformanceData(
      observations.map((obs) => obs.teleop_performance)
    );
    const consensusEndgame = consolidatePerformanceData(
      observations.map((obs) => obs.endgame_performance)
    );

    // Generate validation results for each scout
    const results: ValidationResult[] = [];

    for (const observation of observations) {
      // Validate auto_performance fields
      const autoResults = this.validatePeriodFields(
        'auto_performance',
        observation.auto_performance,
        consensusAuto,
        observation,
        context
      );
      results.push(...autoResults);

      // Validate teleop_performance fields
      const teleopResults = this.validatePeriodFields(
        'teleop_performance',
        observation.teleop_performance,
        consensusTeleop,
        observation,
        context
      );
      results.push(...teleopResults);

      // Validate endgame_performance fields
      const endgameResults = this.validatePeriodFields(
        'endgame_performance',
        observation.endgame_performance,
        consensusEndgame,
        observation,
        context
      );
      results.push(...endgameResults);
    }

    return results;
  }

  /**
   * Validate all fields in a period (auto/teleop/endgame)
   *
   * @param periodName - Name of the period (e.g., 'auto_performance')
   * @param actualData - Scout's actual data
   * @param consensusData - Consensus data
   * @param observation - Full match scouting observation
   * @param context - Validation context
   * @returns Array of validation results for this period
   */
  private validatePeriodFields(
    periodName: string,
    actualData: JSONBData,
    consensusData: JSONBData,
    observation: MatchScouting,
    context: ValidationContext
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Skip if no data
    if (!actualData || !consensusData) {
      return results;
    }

    // Get all unique field keys from both actual and consensus
    const allKeys = new Set<string>([
      ...Object.keys(actualData),
      ...Object.keys(consensusData),
    ]);

    // Skip metadata fields
    const skipFields = ['schema_version', 'notes'];

    for (const fieldKey of allKeys) {
      // Skip metadata fields
      if (skipFields.includes(fieldKey)) {
        continue;
      }

      const fieldPath = `${periodName}.${fieldKey}`;
      const expectedValue = consensusData[fieldKey];
      const actualValue = actualData[fieldKey];

      // Skip if expected value is missing (field not observed by consensus)
      if (expectedValue === null || expectedValue === undefined) {
        continue;
      }

      // Calculate accuracy score
      const accuracyScore = this.compareFieldValues(expectedValue, actualValue);

      // Determine outcome category
      const outcome = this.determineOutcome(accuracyScore);

      // Generate validation result
      results.push({
        validationId: crypto.randomUUID(),
        scouterId: observation.scout_name, // Using scout_name as scouter_id
        matchScoutingId: observation.id,
        matchKey: context.matchKey!,
        teamNumber: context.teamNumber!,
        eventKey: context.eventKey!,
        seasonYear: context.seasonYear!,
        fieldPath,
        expectedValue,
        actualValue,
        outcome,
        accuracyScore,
        confidenceLevel: this.calculateConsensusConfidence(
          observation,
          allKeys.size
        ),
        validationType: 'consensus',
        validationMethod: 'ConsensusValidationStrategy',
        executionId: context.executionId || crypto.randomUUID(),
      });
    }

    return results;
  }

  /**
   * Compare two field values and return accuracy score (0.0 to 1.0)
   *
   * Logic:
   * - Boolean: exact match only (1.0 or 0.0)
   * - Number: scaled distance (1.0 for exact, decreasing with difference)
   * - Category/String: exact match only (1.0 or 0.0)
   *
   * @param expected - Expected value (consensus)
   * @param actual - Actual value (scout's observation)
   * @returns Accuracy score (0.0 to 1.0)
   */
  private compareFieldValues(expected: unknown, actual: unknown): number {
    // Handle null/undefined
    if (actual === null || actual === undefined) {
      return expected === null || expected === undefined ? 1.0 : 0.0;
    }

    // Determine field type and compare accordingly
    const fieldType = this.inferFieldType(expected);

    switch (fieldType) {
      case 'boolean':
        return this.compareBooleanField(expected as boolean, actual as boolean);

      case 'number':
        return this.compareNumericField(expected as number, actual as number);

      case 'string':
      case 'category':
        return this.compareCategoryField(expected, actual);

      default:
        // Unknown type, treat as category
        return expected === actual ? 1.0 : 0.0;
    }
  }

  /**
   * Compare boolean fields (exact match only)
   */
  private compareBooleanField(expected: boolean, actual: boolean): number {
    return expected === actual ? 1.0 : 0.0;
  }

  /**
   * Compare numeric fields (scaled distance)
   *
   * Scoring:
   * - Exact match: 1.0
   * - Off by 1: 0.8
   * - Off by 2: 0.6
   * - Further: scaled by relative difference
   *
   * @param expected - Expected numeric value
   * @param actual - Actual numeric value
   * @returns Accuracy score (0.0 to 1.0)
   */
  private compareNumericField(expected: number, actual: number): number {
    // Handle non-numeric values
    if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
      return expected === actual ? 1.0 : 0.0;
    }

    const diff = Math.abs(expected - actual);

    // Exact match
    if (diff === 0) {
      return 1.0;
    }

    // Off by 1
    if (diff === 1) {
      return 0.8;
    }

    // Off by 2
    if (diff === 2) {
      return 0.6;
    }

    // Further differences: scale based on relative magnitude
    // Use max of expected/actual/1 to avoid division by zero
    const magnitude = Math.max(Math.abs(expected), Math.abs(actual), 1);
    const relativeDiff = diff / magnitude;

    // Scale from 0.6 down to 0.0
    // If relative diff is 1.0 (100% off), score is 0.0
    // If relative diff is 0.5 (50% off), score is 0.3
    return Math.max(0, 0.6 * (1 - relativeDiff));
  }

  /**
   * Compare category/string fields (exact match only)
   */
  private compareCategoryField(expected: unknown, actual: unknown): number {
    // String comparison (case-sensitive)
    if (typeof expected === 'string' && typeof actual === 'string') {
      return expected === actual ? 1.0 : 0.0;
    }

    // General equality check
    return expected === actual ? 1.0 : 0.0;
  }

  /**
   * Infer field type from value
   *
   * @param value - Field value
   * @returns Field type
   */
  private inferFieldType(value: unknown): FieldType {
    if (typeof value === 'boolean') {
      return 'boolean';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return 'number';
    }

    if (typeof value === 'string') {
      return 'string';
    }

    // Default to category for other types
    return 'category';
  }

  /**
   * Determine validation outcome from accuracy score
   *
   * Categories:
   * - exact_match: 1.0 (100% accurate)
   * - close_match: 0.7 - 0.99 (good but not perfect)
   * - mismatch: 0.0 - 0.69 (incorrect)
   *
   * @param accuracyScore - Accuracy score (0.0 to 1.0)
   * @returns Validation outcome category
   */
  private determineOutcome(accuracyScore: number): ValidationOutcome {
    if (accuracyScore === 1.0) {
      return 'exact_match';
    }

    if (accuracyScore >= 0.7) {
      return 'close_match';
    }

    return 'mismatch';
  }

  /**
   * Calculate confidence level for consensus validation
   *
   * Confidence depends on:
   * - Number of scouts observing
   * - Consistency among scouts (not yet implemented)
   *
   * @param observation - Match scouting observation
   * @param fieldCount - Number of fields validated
   * @returns Confidence level (0.0 to 1.0)
   */
  private calculateConsensusConfidence(
    observation: MatchScouting,
    fieldCount: number
  ): number {
    // For now, use a simple confidence based on field count
    // More fields validated = higher confidence
    // This can be enhanced with scout reliability scores later

    if (fieldCount === 0) {
      return 0.5; // Default confidence
    }

    // Logarithmic confidence growth
    // 10 fields = 0.7, 30 fields = 0.85, 100+ fields = 0.95
    return Math.min(0.95, 0.5 + 0.45 * (Math.log(fieldCount + 1) / Math.log(100)));
  }

  /**
   * Calculate consensus value metadata for a field
   *
   * This can be used to store consensus values in the validation_consensus table.
   *
   * @param fieldPath - Field path
   * @param consensusValue - Consensus value
   * @param observations - All observations
   * @returns Consensus value metadata
   */
  calculateConsensusMetadata(
    fieldPath: string,
    consensusValue: unknown,
    observations: MatchScouting[]
  ): ConsensusValue {
    const fieldKey = fieldPath.split('.').pop() || fieldPath;

    // Extract values from observations
    const values: unknown[] = [];
    for (const obs of observations) {
      const periodName = fieldPath.split('.')[0];
      const periodData = obs[periodName as keyof MatchScouting] as JSONBData;

      if (periodData && periodData[fieldKey] !== null && periodData[fieldKey] !== undefined) {
        values.push(periodData[fieldKey]);
      }
    }

    // Calculate agreement percentage
    const matchingValues = values.filter((v) => v === consensusValue).length;
    const agreementPercentage = values.length > 0 ? (matchingValues / values.length) * 100 : 0;

    // Determine consensus method based on field type
    const fieldType = this.inferFieldType(consensusValue);
    let method: ConsensusMethod;
    switch (fieldType) {
      case 'boolean':
        method = 'majority_vote';
        break;
      case 'number':
        method = 'median';
        break;
      case 'string':
      case 'category':
        method = 'mode';
        break;
      default:
        method = 'mode';
    }

    // Calculate standard deviation for numeric fields
    let standardDeviation: number | undefined;
    if (fieldType === 'number') {
      const numericValues = values.filter((v) => typeof v === 'number') as number[];
      if (numericValues.length > 1) {
        const mean =
          numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        const variance =
          numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          numericValues.length;
        standardDeviation = Math.sqrt(variance);
      }
    }

    // Calculate confidence level
    const confidenceLevel = Math.min(
      0.95,
      0.5 + 0.45 * (Math.log(values.length + 1) / Math.log(10))
    );

    return {
      fieldPath,
      value: consensusValue,
      method,
      scoutCount: values.length,
      agreementPercentage: Math.round(agreementPercentage * 10) / 10,
      confidenceLevel,
      standardDeviation,
      outlierCount: 0, // TODO: Implement outlier detection
    };
  }
}

/**
 * Factory function for dependency injection
 */
export function createConsensusValidationStrategy(
  repository?: ScoutingDataRepository,
  eloCalculator?: ELORatingCalculator
): ConsensusValidationStrategy {
  return new ConsensusValidationStrategy(repository, eloCalculator);
}
