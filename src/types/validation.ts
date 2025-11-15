/**
 * Type definitions for the ELO-based Scouter Validation System
 *
 * This system validates scouter accuracy through multiple strategies:
 * - Consensus validation (compare vs other scouts)
 * - TBA validation (compare vs official alliance data)
 * - Manual validation (admin override)
 */

import type { TBAMatch } from './tba';

// ============================================================================
// VALIDATION STRATEGY TYPES
// ============================================================================

/**
 * Types of validation strategies available
 */
export type ValidationStrategyType = 'consensus' | 'tba' | 'manual';

/**
 * Validation outcome categories
 */
export type ValidationOutcome = 'exact_match' | 'close_match' | 'mismatch';

/**
 * ELO change outcome types
 */
export type ELOOutcome = 'gain' | 'neutral' | 'loss';

/**
 * Methods for calculating consensus values
 */
export type ConsensusMethod = 'mode' | 'weighted_average' | 'majority_vote' | 'median';

/**
 * Field types for comparison logic
 */
export type FieldType = 'boolean' | 'number' | 'string' | 'category';

// ============================================================================
// VALIDATION CONTEXT
// ============================================================================

/**
 * Context information for executing a validation strategy
 */
export interface ValidationContext {
  /** Event key (e.g., '2025casj') */
  eventKey: string;

  /** Match key (e.g., '2025casj_qm1') */
  matchKey?: string;

  /** Team number being validated */
  teamNumber?: number;

  /** Season year */
  seasonYear: number;

  /** Minimum number of scouts required for consensus (default: 3) */
  minScoutsRequired?: number;

  /** TBA match data for TBA validation strategy */
  tbaMatchData?: TBAMatch;

  /** Execution ID for grouping related validations */
  executionId?: string;
}

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

/**
 * Result of validating a single field for a single scouter
 */
export interface ValidationResult {
  /** Unique identifier for this validation result */
  validationId: string;

  /** Scouter being validated */
  scouterId: string;

  /** Match scouting entry ID (if applicable) */
  matchScoutingId?: string;

  /** Match key */
  matchKey: string;

  /** Team number */
  teamNumber: number;

  /** Event key */
  eventKey: string;

  /** Season year */
  seasonYear: number;

  // Field details
  /** Dot-notation path to field (e.g., 'auto_performance.coral_scored_L1') */
  fieldPath: string;

  /** Expected value (consensus or TBA) */
  expectedValue: unknown;

  /** Actual value submitted by scouter */
  actualValue: unknown;

  // Outcome
  /** Validation outcome category */
  outcome: ValidationOutcome;

  /** Numeric accuracy score (0.0 to 1.0, where 1.0 = perfect match) */
  accuracyScore: number;

  /** Confidence level of the validation source (0.0 to 1.0) */
  confidenceLevel?: number;

  // Metadata
  /** Type of validation strategy used */
  validationType: ValidationStrategyType;

  /** Name of validation strategy class */
  validationMethod: string;

  /** Execution ID grouping this with related validations */
  executionId: string;

  /** Additional notes or context */
  notes?: string;

  /** When this validation was performed */
  createdAt?: Date;
}

/**
 * Database row type for validation_results table
 */
export interface ValidationResultRow {
  id: string;
  validation_type: ValidationStrategyType;
  validation_method: string;
  execution_id: string;
  match_key: string;
  team_number: number;
  event_key: string;
  season_year: number;
  field_path: string;
  expected_value: unknown;
  actual_value: unknown;
  scouter_id: string;
  match_scouting_id?: string;
  validation_outcome: ValidationOutcome;
  accuracy_score: number;
  confidence_level?: number;
  notes?: string;
  created_at: string;
}

// ============================================================================
// CONSENSUS VALUES
// ============================================================================

/**
 * Consensus value calculated from multiple scouter observations
 */
export interface ConsensusValue {
  /** Field path */
  fieldPath: string;

  /** Consensus value */
  value: unknown;

  /** Method used to calculate consensus */
  method: ConsensusMethod;

  /** Number of scouts who contributed */
  scoutCount: number;

  /** Percentage of scouts who agreed with consensus (0-100) */
  agreementPercentage: number;

  /** Confidence level in this consensus (0.0 to 1.0) */
  confidenceLevel: number;

  /** Standard deviation (for numeric fields) */
  standardDeviation?: number;

  /** Number of outlier values excluded */
  outlierCount?: number;
}

/**
 * Database row type for validation_consensus table
 */
export interface ValidationConsensusRow {
  id: string;
  match_key: string;
  team_number: number;
  event_key: string;
  season_year: number;
  field_path: string;
  consensus_value: unknown;
  consensus_method: ConsensusMethod;
  scout_count: number;
  scouter_ids: string[];
  agreement_percentage: number;
  standard_deviation?: number;
  outlier_count: number;
  calculated_at: string;
  execution_id: string;
}

// ============================================================================
// ELO RATINGS
// ============================================================================

/**
 * Scouter's current ELO rating for a season
 */
export interface ScouterRating {
  /** Scouter ID */
  scouterId: string;

  /** Season year */
  seasonYear: number;

  /** Current ELO rating */
  currentElo: number;

  /** Peak ELO achieved this season */
  peakElo: number;

  /** Lowest ELO this season */
  lowestElo: number;

  /** Rating confidence (0.0 to 1.0) based on validation count */
  confidenceLevel: number;

  /** Total number of validations */
  totalValidations: number;

  /** Number of successful validations (exact or close match) */
  successfulValidations: number;

  /** Number of failed validations (mismatch) */
  failedValidations: number;

  /** When last validation occurred */
  lastValidationAt?: Date;

  /** When rating was created */
  createdAt: Date;

  /** When rating was last updated */
  updatedAt: Date;
}

/**
 * Database row type for scouter_elo_ratings table
 */
export interface ScouterEloRatingRow {
  id: string;
  scouter_id: string;
  season_year: number;
  current_elo: number;
  peak_elo: number;
  lowest_elo: number;
  confidence_level: number;
  total_validations: number;
  successful_validations: number;
  failed_validations: number;
  last_validation_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Historical ELO rating change entry
 */
export interface ScouterRatingHistory {
  /** Scouter ID */
  scouterId: string;

  /** ELO before change */
  eloBefore: number;

  /** ELO after change */
  eloAfter: number;

  /** Delta (can be positive or negative) */
  eloDelta: number;

  /** Validation that caused this change */
  validationId: string;

  /** Type of validation */
  validationType: ValidationStrategyType;

  /** Accuracy score that influenced the change */
  accuracyScore?: number;

  /** Outcome type */
  outcome: ELOOutcome;

  /** Match context */
  matchKey?: string;

  /** Team context */
  teamNumber?: number;

  /** Event context */
  eventKey?: string;

  /** When this change occurred */
  createdAt: Date;
}

/**
 * Database row type for scouter_elo_history table
 */
export interface ScouterEloHistoryRow {
  id: string;
  scouter_id: string;
  elo_before: number;
  elo_after: number;
  elo_delta: number;
  validation_id: string;
  validation_type: ValidationStrategyType;
  accuracy_score?: number;
  outcome: ELOOutcome;
  match_key?: string;
  team_number?: number;
  event_key?: string;
  created_at: string;
}

// ============================================================================
// VALIDATION STRATEGY INTERFACE
// ============================================================================

/**
 * Base interface for all validation strategies
 *
 * Implementations must be able to:
 * 1. Check if they can validate a given context
 * 2. Execute validation and return field-level results
 */
export interface IValidationStrategy {
  /** Human-readable strategy name */
  readonly name: string;

  /** Strategy type identifier */
  readonly type: ValidationStrategyType;

  /**
   * Check if this strategy can validate the given context
   * @param context - Validation context
   * @returns true if strategy can be applied
   */
  canValidate(context: ValidationContext): Promise<boolean>;

  /**
   * Execute validation for the given context
   * @param context - Validation context
   * @returns Array of field-level validation results
   */
  validate(context: ValidationContext): Promise<ValidationResult[]>;
}

// ============================================================================
// ELO CALCULATION
// ============================================================================

/**
 * Configuration for ELO rating calculator
 */
export interface ELOCalculatorConfig {
  /** K-factor (speed of rating change). Default: 32 */
  kFactor?: number;

  /** Default starting rating. Default: 1500 */
  defaultRating?: number;

  /** Minimum possible rating. Default: 0 */
  minRating?: number;

  /** Maximum possible rating. Default: 3000 */
  maxRating?: number;
}

/**
 * Result of ELO calculation
 */
export interface ELOCalculationResult {
  /** New ELO rating */
  newRating: number;

  /** Change in rating (can be positive or negative) */
  delta: number;

  /** Outcome category */
  outcome: ELOOutcome;

  /** Expected score (0.0 to 1.0) */
  expectedScore: number;

  /** Actual score (0.0 to 1.0) */
  actualScore: number;
}

/**
 * Update to apply to a scouter's ELO rating
 */
export interface ELORatingUpdate {
  /** Scouter ID */
  scouterId: string;

  /** Event or season context */
  eventKey?: string;
  seasonYear: number;

  /** New rating value */
  newRating: number;

  /** Rating change */
  delta: number;

  /** Number of validations processed in this update */
  validationCount: number;

  /** Number of successful validations (accuracy >= 0.75) */
  successCount?: number;

  /** Number of failed validations (accuracy < 0.75) */
  failureCount?: number;

  /** Execution ID */
  executionId: string;
}

/**
 * Entry to add to ELO history
 */
export interface ELOHistoryEntry {
  scouterId: string;
  validationId: string;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
  outcome: ELOOutcome;
  accuracyScore?: number;
  matchKey?: string;
  teamNumber?: number;
  eventKey?: string;
}

// ============================================================================
// SERVICE LAYER TYPES
// ============================================================================

/**
 * Summary of a validation execution
 */
export interface ValidationExecutionSummary {
  /** Unique execution ID */
  executionId: string;

  /** Event validated */
  eventKey: string;

  /** Total number of field-level validations performed */
  totalValidations: number;

  /** Number of unique scouters affected */
  scoutersAffected: number;

  /** Breakdown by validation strategy */
  strategyBreakdown: Map<ValidationStrategyType, number>;

  /** Summary of ELO updates */
  eloUpdates: ELOUpdateSummary[];

  /** Execution metadata */
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

/**
 * Summary of ELO updates for a single scouter
 */
export interface ELOUpdateSummary {
  scouterId: string;
  oldRating: number;
  newRating: number;
  delta: number;
  validationsProcessed: number;
  averageAccuracy?: number;
}

/**
 * Query options for fetching ELO history
 */
export interface HistoryQueryOptions {
  /** Limit number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Filter by event */
  eventKey?: string;

  /** Filter by validation type */
  validationType?: ValidationStrategyType;

  /** Filter by date range */
  startDate?: Date;
  endDate?: Date;

  /** Order by field */
  orderBy?: 'created_at' | 'elo_delta';

  /** Order direction */
  orderDirection?: 'asc' | 'desc';
}

/**
 * Query options for fetching validation results
 */
export interface ValidationQueryOptions {
  /** Limit number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Filter by match */
  matchKey?: string;

  /** Filter by event */
  eventKey?: string;

  /** Filter by validation type */
  validationType?: ValidationStrategyType;

  /** Filter by outcome */
  outcome?: ValidationOutcome;

  /** Filter by field path */
  fieldPath?: string;

  /** Order by field */
  orderBy?: 'created_at' | 'accuracy_score';

  /** Order direction */
  orderDirection?: 'asc' | 'desc';
}

/**
 * Leaderboard entry for a scouter
 */
export interface ScouterLeaderboardEntry {
  /** Rank (1-indexed) */
  rank: number;

  /** Scouter info */
  scouterId: string;
  scouterName: string;

  /** ELO rating */
  currentElo: number;
  peakElo: number;

  /** Performance stats */
  totalValidations: number;
  successfulValidations: number;
  successRate: number; // 0-100

  /** Confidence */
  confidenceLevel: number;

  /** Recent trend (positive = improving, negative = declining) */
  recentTrend?: number;
}

/**
 * Event leaderboard
 */
export interface ScouterLeaderboard {
  eventKey: string;
  seasonYear: number;
  entries: ScouterLeaderboardEntry[];
  generatedAt: Date;
}

// ============================================================================
// FIELD COMPARISON
// ============================================================================

/**
 * Configuration for field comparison
 */
export interface FieldComparisonConfig {
  /** Field path */
  fieldPath: string;

  /** Field type */
  fieldType: FieldType;

  /** Tolerance for numeric comparison */
  numericTolerance?: number;

  /** Weight of this field in overall accuracy (0.0 to 1.0) */
  weight?: number;
}

/**
 * Result of comparing two field values
 */
export interface FieldComparisonResult {
  /** Field path */
  fieldPath: string;

  /** Expected value */
  expectedValue: unknown;

  /** Actual value */
  actualValue: unknown;

  /** Match quality (0.0 to 1.0) */
  matchScore: number;

  /** Outcome category */
  outcome: ValidationOutcome;

  /** Human-readable explanation */
  explanation?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * ELO calculation error
 */
export class ELOCalculationError extends Error {
  constructor(
    message: string,
    public readonly scouterId: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ELOCalculationError';
  }
}
