/**
 * ELO Rating Calculator
 *
 * Implements the ELO rating system for scouter accuracy validation.
 * Based on the traditional chess ELO formula with adaptations for scouting accuracy.
 *
 * Formula:
 * - Expected Score: E = 1 / (1 + 10^((opponentRating - rating)/400))
 * - New Rating: R' = R + K * (S - E)
 *
 * Where:
 * - R = current rating
 * - K = K-factor (controls speed of rating change)
 * - S = actual score (0.0 to 1.0 based on accuracy)
 * - E = expected score
 *
 * @see https://en.wikipedia.org/wiki/Elo_rating_system
 */

import type {
  ELOCalculatorConfig,
  ELOCalculationResult,
  ELOOutcome,
  ValidationOutcome,
} from '@/types/validation';

/**
 * Default configuration for ELO calculator
 */
const DEFAULT_CONFIG: Required<ELOCalculatorConfig> = {
  kFactor: 32,
  defaultRating: 1500,
  minRating: 0,
  maxRating: 3000,
};

/**
 * ELO Rating Calculator
 *
 * Pure calculation class with no external dependencies.
 * Thread-safe and immutable.
 */
export class ELORatingCalculator {
  private readonly config: Required<ELOCalculatorConfig>;

  constructor(config?: ELOCalculatorConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Calculate new ELO rating based on validation outcome
   *
   * @param currentRating - Scouter's current ELO rating
   * @param accuracyScore - Accuracy score from validation (0.0 to 1.0)
   * @param opponentRating - Rating of the "opponent" (consensus/TBA, typically 1500)
   * @returns Calculation result with new rating and delta
   */
  calculateNewRating(
    currentRating: number,
    accuracyScore: number,
    opponentRating: number = this.config.defaultRating
  ): ELOCalculationResult {
    // Validate inputs
    if (accuracyScore < 0 || accuracyScore > 1) {
      throw new Error(`Accuracy score must be between 0 and 1, got ${accuracyScore}`);
    }

    if (currentRating < 0) {
      throw new Error(`Current rating cannot be negative, got ${currentRating}`);
    }

    // Calculate expected score: E = 1 / (1 + 10^((opponent - rating)/400))
    const expectedScore = this.calculateExpectedScore(currentRating, opponentRating);

    // Actual score is the accuracy score
    const actualScore = accuracyScore;

    // Calculate rating change: delta = K * (S - E)
    const delta = this.config.kFactor * (actualScore - expectedScore);

    // Calculate new rating: R' = R + delta
    let newRating = currentRating + delta;

    // Clamp rating to valid range
    newRating = Math.max(this.config.minRating, Math.min(this.config.maxRating, newRating));

    // Determine outcome category
    const outcome = this.determineOutcome(delta, accuracyScore);

    return {
      newRating,
      delta,
      outcome,
      expectedScore,
      actualScore,
    };
  }

  /**
   * Calculate expected score for a matchup
   *
   * @param rating - Current rating
   * @param opponentRating - Opponent rating
   * @returns Expected score (0.0 to 1.0)
   */
  private calculateExpectedScore(rating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
  }

  /**
   * Determine outcome category based on delta and accuracy
   *
   * @param delta - Rating change
   * @param accuracyScore - Accuracy score
   * @returns Outcome category
   */
  private determineOutcome(delta: number, _accuracyScore: number): ELOOutcome {
    // Positive delta = rating increased = gain
    if (delta > 0.5) {
      return 'gain';
    }

    // Negative delta = rating decreased = loss
    if (delta < -0.5) {
      return 'loss';
    }

    // Small delta = neutral
    return 'neutral';
  }

  /**
   * Convert validation outcome to accuracy score
   *
   * This provides a mapping from categorical outcomes to numeric scores.
   *
   * @param outcome - Validation outcome category
   * @returns Accuracy score (0.0 to 1.0)
   */
  outcomeToAccuracyScore(outcome: ValidationOutcome): number {
    switch (outcome) {
      case 'exact_match':
        return 1.0; // Perfect accuracy
      case 'close_match':
        return 0.7; // Good but not perfect
      case 'mismatch':
        return 0.0; // Incorrect
    }
  }

  /**
   * Calculate average accuracy score from multiple validation outcomes
   *
   * @param accuracyScores - Array of accuracy scores
   * @returns Average accuracy score
   */
  calculateAverageAccuracy(accuracyScores: number[]): number {
    if (accuracyScores.length === 0) {
      return 0;
    }

    const sum = accuracyScores.reduce((acc, score) => acc + score, 0);
    return sum / accuracyScores.length;
  }

  /**
   * Calculate weighted average accuracy score
   *
   * Useful when different fields have different importance.
   *
   * @param scores - Array of [accuracyScore, weight] tuples
   * @returns Weighted average accuracy score
   */
  calculateWeightedAccuracy(scores: Array<[number, number]>): number {
    if (scores.length === 0) {
      return 0;
    }

    let totalWeight = 0;
    let weightedSum = 0;

    for (const [score, weight] of scores) {
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Calculate confidence level based on number of validations
   *
   * Confidence increases logarithmically with validation count:
   * - 0 validations = 0.50 confidence
   * - 10 validations = 0.70 confidence
   * - 30 validations = 0.80 confidence
   * - 100+ validations = 0.95 confidence
   *
   * @param validationCount - Number of validations
   * @returns Confidence level (0.0 to 1.0)
   */
  calculateConfidence(validationCount: number): number {
    if (validationCount < 0) {
      throw new Error('Validation count cannot be negative');
    }

    // Logarithmic confidence growth
    return Math.min(
      0.95,
      0.50 + 0.45 * (Math.log(validationCount + 1) / Math.log(100))
    );
  }

  /**
   * Predict expected rating change for a given accuracy
   *
   * Useful for UI to show "potential gain/loss" before validation.
   *
   * @param currentRating - Current ELO rating
   * @param expectedAccuracy - Expected accuracy (0.0 to 1.0)
   * @returns Predicted delta
   */
  predictDelta(currentRating: number, expectedAccuracy: number): number {
    const expectedScore = this.calculateExpectedScore(
      currentRating,
      this.config.defaultRating
    );
    return this.config.kFactor * (expectedAccuracy - expectedScore);
  }

  /**
   * Get the K-factor used by this calculator
   */
  get kFactor(): number {
    return this.config.kFactor;
  }

  /**
   * Get the default rating used by this calculator
   */
  get defaultRating(): number {
    return this.config.defaultRating;
  }

  /**
   * Get the rating range used by this calculator
   */
  get ratingRange(): { min: number; max: number } {
    return {
      min: this.config.minRating,
      max: this.config.maxRating,
    };
  }
}

/**
 * Create an ELO calculator with default configuration (K=32)
 */
export function createDefaultELOCalculator(): ELORatingCalculator {
  return new ELORatingCalculator();
}

/**
 * Create an ELO calculator with custom K-factor
 *
 * Common K-factors:
 * - 40: Provisional (new scouters, first ~30 matches)
 * - 32: Regular (standard scouters)
 * - 20: Veteran (experienced scouters, 100+ matches)
 * - 16: Master (elite scouters, 200+ matches)
 *
 * @param kFactor - K-factor value
 */
export function createELOCalculator(kFactor: number): ELORatingCalculator {
  return new ELORatingCalculator({ kFactor });
}

/**
 * Rank thresholds for scouter tiers
 *
 * These can be used to display badges/titles based on ELO rating.
 */
export const ELO_RANK_THRESHOLDS = {
  diamond: 2000,
  platinum: 1700,
  gold: 1400,
  silver: 1100,
  bronze: 800,
  unranked: 0,
} as const;

export type ELORank = keyof typeof ELO_RANK_THRESHOLDS;

/**
 * Get rank name for a given ELO rating
 *
 * @param elo - ELO rating
 * @returns Rank name
 */
export function getELORank(elo: number): ELORank {
  if (elo >= ELO_RANK_THRESHOLDS.diamond) return 'diamond';
  if (elo >= ELO_RANK_THRESHOLDS.platinum) return 'platinum';
  if (elo >= ELO_RANK_THRESHOLDS.gold) return 'gold';
  if (elo >= ELO_RANK_THRESHOLDS.silver) return 'silver';
  if (elo >= ELO_RANK_THRESHOLDS.bronze) return 'bronze';
  return 'unranked';
}

/**
 * Get progress to next rank
 *
 * @param elo - Current ELO rating
 * @returns Progress percentage (0-100) and next rank
 */
export function getProgressToNextRank(
  elo: number
): { progress: number; nextRank: ELORank | null; pointsNeeded: number } {
  const currentRank = getELORank(elo);

  // Find next rank threshold
  const ranks: ELORank[] = ['diamond', 'platinum', 'gold', 'silver', 'bronze', 'unranked'];
  const currentIndex = ranks.indexOf(currentRank);

  if (currentIndex === 0) {
    // Already at highest rank
    return { progress: 100, nextRank: null, pointsNeeded: 0 };
  }

  const nextRank = ranks[currentIndex - 1];
  const nextThreshold = ELO_RANK_THRESHOLDS[nextRank];
  const currentThreshold = ELO_RANK_THRESHOLDS[currentRank];

  const pointsNeeded = nextThreshold - elo;
  const progress = ((elo - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

  return {
    progress: Math.max(0, Math.min(100, progress)),
    nextRank,
    pointsNeeded: Math.max(0, pointsNeeded),
  };
}
