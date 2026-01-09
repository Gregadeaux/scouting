/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Scouter Validation Service
 *
 * Main orchestrator for the ELO-based validation system. Coordinates validation
 * strategies, ELO calculations, and persistence to provide a complete validation pipeline.
 *
 * Responsibilities:
 * - Execute validation strategies (Consensus, TBA, Manual)
 * - Calculate and update ELO ratings
 * - Persist validation results and consensus values
 * - Provide query methods for ratings and leaderboards
 * - Handle batch processing for event-wide validations
 *
 * @see IScouterValidationService for interface documentation
 */

import type {
  ValidationContext,
  ValidationResult,
  ValidationStrategyType,
  IValidationStrategy,
  ELOUpdateSummary,
  ValidationExecutionSummary,
  ScouterRating,
  ScouterRatingHistory,
  HistoryQueryOptions,
  ScouterLeaderboard,
  ELOOutcome,
  ELOHistoryEntry,
  ValidationQueryOptions,
} from '@/types/validation';
import type { MatchSchedule } from '@/types';
import { ELORatingCalculator } from '@/lib/algorithms/elo-calculator';
import type { IScouterEloRepository } from '@/lib/repositories/scouter-elo.repository';
import type { IValidationResultRepository } from '@/lib/repositories/validation-result.repository';
import type { IValidationConsensusRepository } from '@/lib/repositories/validation-consensus.repository';
import type { IMatchRepository } from '@/lib/repositories/match.repository';
import { ValidationError } from '@/types/validation';

/**
 * Scouter Validation Service Interface
 */
export interface IScouterValidationService {
  /**
   * Validate all matches in an event using specified strategies
   *
   * @param eventKey - Event key (e.g., '2025casj')
   * @param strategyTypes - Validation strategies to use (defaults to all available)
   * @returns Execution summary with results and ELO updates
   */
  validateEvent(
    eventKey: string,
    strategyTypes?: ValidationStrategyType[]
  ): Promise<ValidationExecutionSummary>;

  /**
   * Validate a single match using specified strategies
   *
   * @param matchKey - Match key (e.g., '2025casj_qm1')
   * @param strategyTypes - Validation strategies to use (defaults to all available)
   * @returns Execution summary with results and ELO updates
   */
  validateMatch(
    matchKey: string,
    strategyTypes?: ValidationStrategyType[]
  ): Promise<ValidationExecutionSummary>;

  /**
   * Get current ELO rating for a scouter
   *
   * @param scouterId - Scouter ID
   * @param seasonYear - Season year
   * @returns Current rating or default rating if not found
   */
  getScouterRating(scouterId: string, seasonYear: number): Promise<ScouterRating>;

  /**
   * Get ELO rating history for a scouter
   *
   * @param scouterId - Scouter ID
   * @param options - Query options (filters, pagination, ordering)
   * @returns Array of rating history entries
   */
  getScouterRatingHistory(
    scouterId: string,
    options?: HistoryQueryOptions
  ): Promise<ScouterRatingHistory[]>;

  /**
   * Get leaderboard for an event
   *
   * @param eventKey - Event key
   * @param seasonYear - Season year
   * @param limit - Maximum number of entries (default: 50)
   * @returns Event leaderboard
   */
  getEventLeaderboard(
    eventKey: string,
    seasonYear: number,
    limit?: number
  ): Promise<ScouterLeaderboard>;

  /**
   * Get leaderboard for a season
   *
   * @param seasonYear - Season year
   * @param limit - Maximum number of entries (default: 50)
   * @returns Season leaderboard
   */
  getSeasonLeaderboard(seasonYear: number, limit?: number): Promise<ScouterLeaderboard>;

  /**
   * Get validation results for a scouter
   *
   * @param scouterId - Scouter ID
   * @param options - Query options (filters, pagination, ordering)
   * @returns Array of validation results
   */
  getScouterValidations(
    scouterId: string,
    options?: ValidationQueryOptions
  ): Promise<ValidationResult[]>;

  /**
   * Get validation results for a match
   *
   * @param matchKey - Match key
   * @returns Array of validation results for all teams in match
   */
  getMatchValidations(matchKey: string): Promise<ValidationResult[]>;
}

/**
 * Scouter Validation Service Implementation
 */
export class ScouterValidationService implements IScouterValidationService {
  constructor(
    private readonly strategies: Map<ValidationStrategyType, IValidationStrategy>,
    private readonly eloCalculator: ELORatingCalculator,
    private readonly scouterEloRepo: IScouterEloRepository,
    private readonly validationResultRepo: IValidationResultRepository,
    private readonly consensusRepo: IValidationConsensusRepository,
    private readonly matchRepo: IMatchRepository
  ) { }

  /**
   * Validate all matches in an event
   */
  async validateEvent(
    eventKey: string,
    strategyTypes?: ValidationStrategyType[]
  ): Promise<ValidationExecutionSummary> {
    const startTime = Date.now();
    const executionId = crypto.randomUUID();
    const results: ValidationResult[] = [];
    const errors: Array<{ matchKey: string; teamNumber: number; error: string }> = [];

    console.log(`[ScouterValidationService] Starting event validation: ${eventKey}`);
    console.log(`[ScouterValidationService] Execution ID: ${executionId}`);

    try {
      // 1. Get all matches for the event
      const matches = await this.matchRepo.findByEventKey(eventKey);

      if (matches.length === 0) {
        console.warn(`[ScouterValidationService] No matches found for event: ${eventKey}`);
        return this.createEmptySummary(executionId, eventKey, startTime);
      }

      console.log(`[ScouterValidationService] Found ${matches.length} matches to validate`);

      // 2. Process matches in batches
      const batchSize = 10;
      for (let i = 0; i < matches.length; i += batchSize) {
        const batch = matches.slice(i, i + batchSize);
        console.log(
          `[ScouterValidationService] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matches.length / batchSize)}`
        );

        // Process each match in the batch
        for (const match of batch) {
          const matchResults = await this.validateSingleMatch(
            match,
            executionId,
            strategyTypes,
            errors
          );
          results.push(...matchResults);
        }
      }

      console.log(
        `[ScouterValidationService] Completed validation. Total results: ${results.length}`
      );

      // 3. Persist all validation results
      if (results.length > 0) {
        console.log(`[ScouterValidationService] Persisting ${results.length} validation results`);
        await this.validationResultRepo.createBatch(results);
      }

      // 4. Update ELO ratings
      const eloUpdates = await this.updateELORatings(results, executionId);

      // 5. Build and return summary
      const completedAt = Date.now();
      const summary: ValidationExecutionSummary = {
        executionId,
        eventKey,
        totalValidations: results.length,
        scoutersAffected: new Set(results.map((r) => r.scouterId)).size,
        strategyBreakdown: this.summarizeByStrategy(results),
        eloUpdates,
        startedAt: new Date(startTime),
        completedAt: new Date(completedAt),
        durationMs: completedAt - startTime,
      };

      console.log(
        `[ScouterValidationService] Validation complete. Duration: ${summary.durationMs}ms`
      );

      if (errors.length > 0) {
        console.warn(
          `[ScouterValidationService] Encountered ${errors.length} errors during validation:`,
          errors
        );
      }

      return summary;
    } catch (error) {
      console.error('[ScouterValidationService] Event validation failed:', error);
      throw new ValidationError(
        `Failed to validate event ${eventKey}`,
        'EVENT_VALIDATION_FAILED',
        { eventKey, error: String(error) }
      );
    }
  }

  /**
   * Validate a single match
   */
  async validateMatch(
    matchKey: string,
    strategyTypes?: ValidationStrategyType[]
  ): Promise<ValidationExecutionSummary> {
    const startTime = Date.now();
    const executionId = crypto.randomUUID();
    const errors: Array<{ matchKey: string; teamNumber: number; error: string }> = [];

    console.log(`[ScouterValidationService] Starting match validation: ${matchKey}`);
    console.log(`[ScouterValidationService] Execution ID: ${executionId}`);

    try {
      // 1. Get match
      const match = await this.matchRepo.findByMatchKey(matchKey);

      if (!match) {
        throw new ValidationError(
          `Match not found: ${matchKey}`,
          'MATCH_NOT_FOUND',
          { matchKey }
        );
      }

      // 2. Validate match
      const results = await this.validateSingleMatch(match, executionId, strategyTypes, errors);

      console.log(`[ScouterValidationService] Generated ${results.length} validation results`);

      // 3. Persist results
      if (results.length > 0) {
        await this.validationResultRepo.createBatch(results);
      }

      // 4. Update ELO ratings
      const eloUpdates = await this.updateELORatings(results, executionId);

      // 5. Build and return summary
      const completedAt = Date.now();
      const summary: ValidationExecutionSummary = {
        executionId,
        eventKey: match.event_key,
        totalValidations: results.length,
        scoutersAffected: new Set(results.map((r) => r.scouterId)).size,
        strategyBreakdown: this.summarizeByStrategy(results),
        eloUpdates,
        startedAt: new Date(startTime),
        completedAt: new Date(completedAt),
        durationMs: completedAt - startTime,
      };

      console.log(
        `[ScouterValidationService] Match validation complete. Duration: ${summary.durationMs}ms`
      );

      if (errors.length > 0) {
        console.warn(
          `[ScouterValidationService] Encountered ${errors.length} errors during validation:`,
          errors
        );
      }

      return summary;
    } catch (error) {
      console.error('[ScouterValidationService] Match validation failed:', error);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ValidationError(
        `Failed to validate match ${matchKey}`,
        'MATCH_VALIDATION_FAILED',
        { matchKey, error: String(error) }
      );
    }
  }

  /**
   * Get current ELO rating for a scouter
   */
  async getScouterRating(scouterId: string, seasonYear: number): Promise<ScouterRating> {
    try {
      return await this.scouterEloRepo.getCurrentRating(scouterId, seasonYear);
    } catch (error) {
      console.error('[ScouterValidationService] Failed to get scouter rating:', error);
      throw new ValidationError(
        'Failed to get scouter rating',
        'GET_RATING_FAILED',
        { scouterId, seasonYear, error: String(error) }
      );
    }
  }

  /**
   * Get ELO rating history for a scouter
   */
  async getScouterRatingHistory(
    scouterId: string,
    options?: HistoryQueryOptions
  ): Promise<ScouterRatingHistory[]> {
    try {
      return await this.scouterEloRepo.getRatingHistory(scouterId, options);
    } catch (error) {
      console.error('[ScouterValidationService] Failed to get rating history:', error);
      throw new ValidationError(
        'Failed to get rating history',
        'GET_HISTORY_FAILED',
        { scouterId, error: String(error) }
      );
    }
  }

  /**
   * Get leaderboard for an event
   */
  async getEventLeaderboard(
    eventKey: string,
    seasonYear: number,
    limit: number = 50
  ): Promise<ScouterLeaderboard> {
    try {
      const entries = await this.scouterEloRepo.getEventLeaderboard(eventKey, seasonYear, limit);

      return {
        eventKey,
        seasonYear,
        entries,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('[ScouterValidationService] Failed to get event leaderboard:', error);
      throw new ValidationError(
        'Failed to get event leaderboard',
        'GET_LEADERBOARD_FAILED',
        { eventKey, seasonYear, error: String(error) }
      );
    }
  }

  /**
   * Get leaderboard for a season
   */
  async getSeasonLeaderboard(seasonYear: number, limit: number = 50): Promise<ScouterLeaderboard> {
    try {
      const entries = await this.scouterEloRepo.getSeasonLeaderboard(seasonYear, limit);

      return {
        eventKey: 'season',
        seasonYear,
        entries,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('[ScouterValidationService] Failed to get season leaderboard:', error);
      throw new ValidationError(
        'Failed to get season leaderboard',
        'GET_LEADERBOARD_FAILED',
        { seasonYear, error: String(error) }
      );
    }
  }

  /**
   * Get validation results for a scouter
   */
  async getScouterValidations(
    scouterId: string,
    options?: ValidationQueryOptions
  ): Promise<ValidationResult[]> {
    try {
      return await this.validationResultRepo.findByScouter(scouterId, options);
    } catch (error) {
      console.error('[ScouterValidationService] Failed to get scouter validations:', error);
      throw new ValidationError(
        'Failed to get scouter validations',
        'GET_VALIDATIONS_FAILED',
        { scouterId, error: String(error) }
      );
    }
  }

  /**
   * Get validation results for a match
   */
  async getMatchValidations(matchKey: string): Promise<ValidationResult[]> {
    try {
      return await this.validationResultRepo.findByMatch(matchKey);
    } catch (error) {
      console.error('[ScouterValidationService] Failed to get match validations:', error);
      throw new ValidationError(
        'Failed to get match validations',
        'GET_VALIDATIONS_FAILED',
        { matchKey, error: String(error) }
      );
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate a single match using all applicable strategies
   */
  private async validateSingleMatch(
    match: MatchSchedule,
    executionId: string,
    strategyTypes: ValidationStrategyType[] | undefined,
    errors: Array<{ matchKey: string; teamNumber: number; error: string }>
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Get teams from match (filter nulls)
    const teams = [
      match.red_1,
      match.red_2,
      match.red_3,
      match.blue_1,
      match.blue_2,
      match.blue_3,
    ].filter((t): t is number => t !== null && t !== undefined);

    // Validate each team
    for (const teamNumber of teams) {
      try {
        const teamResults = await this.validateTeamInMatch(
          match,
          teamNumber,
          executionId,
          strategyTypes
        );
        results.push(...teamResults);
      } catch (error) {
        console.error(
          `[ScouterValidationService] Failed to validate team ${teamNumber} in match ${match.match_key}:`,
          error
        );
        errors.push({
          matchKey: match.match_key,
          teamNumber,
          error: String(error),
        });
        // Continue processing other teams
      }
    }

    return results;
  }

  /**
   * Validate a single team in a match using all applicable strategies
   */
  private async validateTeamInMatch(
    match: MatchSchedule,
    teamNumber: number,
    executionId: string,
    strategyTypes?: ValidationStrategyType[]
  ): Promise<ValidationResult[]> {
    // Extract year from event_key (format: {year}{event_code}, e.g., '2025casj')
    const seasonYear = parseInt(match.event_key.substring(0, 4), 10);

    const context: ValidationContext = {
      eventKey: match.event_key,
      matchKey: match.match_key,
      teamNumber,
      seasonYear,
      executionId,
      minScoutsRequired: 3,
    };

    const results: ValidationResult[] = [];
    const strategies = this.getStrategies(strategyTypes);

    for (const strategy of strategies) {
      try {
        // Check if strategy can validate this context
        const canValidate = await strategy.canValidate(context);

        if (!canValidate) {
          console.log(
            `[ScouterValidationService] Strategy '${strategy.name}' cannot validate ${match.match_key} team ${teamNumber}`
          );
          continue;
        }

        // Execute strategy
        console.log(
          `[ScouterValidationService] Running strategy '${strategy.name}' for ${match.match_key} team ${teamNumber}`
        );
        const strategyResults = await strategy.validate(context);
        results.push(...strategyResults);

        console.log(
          `[ScouterValidationService] Strategy '${strategy.name}' generated ${strategyResults.length} results`
        );
      } catch (error) {
        console.error(
          `[ScouterValidationService] Strategy '${strategy.name}' failed for ${match.match_key} team ${teamNumber}:`,
          error
        );
        // Continue with other strategies
      }
    }

    return results;
  }

  /**
   * Update ELO ratings for all scouters in validation results
   */
  private async updateELORatings(
    results: ValidationResult[],
    executionId: string
  ): Promise<ELOUpdateSummary[]> {
    if (results.length === 0) {
      return [];
    }

    console.log(`[ScouterValidationService] Updating ELO ratings for ${results.length} results`);

    // Group results by scouter
    const byScout = new Map<string, ValidationResult[]>();
    for (const result of results) {
      if (!byScout.has(result.scouterId)) {
        byScout.set(result.scouterId, []);
      }
      byScout.get(result.scouterId)!.push(result);
    }

    console.log(`[ScouterValidationService] Updating ratings for ${byScout.size} scouters`);

    const updates: ELOUpdateSummary[] = [];

    // Update each scouter
    for (const [scouterId, scouterResults] of byScout.entries()) {
      try {
        const update = await this.updateScouterELO(scouterId, scouterResults, executionId);
        updates.push(update);
      } catch (error) {
        console.error(
          `[ScouterValidationService] Failed to update ELO for scouter ${scouterId}:`,
          error
        );
        // Continue with other scouters
      }
    }

    console.log(`[ScouterValidationService] Successfully updated ${updates.length} scouter ratings`);

    return updates;
  }

  /**
   * Update ELO rating for a single scouter
   */
  private async updateScouterELO(
    scouterId: string,
    scouterResults: ValidationResult[],
    executionId: string
  ): Promise<ELOUpdateSummary> {
    // Get starting rating
    const currentRating = await this.scouterEloRepo.getCurrentRating(
      scouterId,
      scouterResults[0].seasonYear
    );

    const startingElo = currentRating.currentElo;
    const historyEntries: ELOHistoryEntry[] = [];

    // Apply ELO update for EACH validation result individually
    // This ensures someone with 20 validations gets 20 ELO updates, not just 1
    for (const result of scouterResults) {
      // Convert validation outcome to ELO accuracy score
      // This ensures mismatch = 0.0, close_match = 0.7, exact_match = 1.0
      const eloAccuracyScore = this.eloCalculator.outcomeToAccuracyScore(result.outcome);

      // Calculate new ELO based on this single validation
      const calculation = this.eloCalculator.calculateNewRating(
        currentRating.currentElo,
        eloAccuracyScore
      );

      // Count this validation as success or failure based on outcome
      // mismatch = failure (0.0), close_match and exact_match = success (>= 0.7)
      const isSuccess = eloAccuracyScore >= 0.7;

      // Update rating in database (one validation at a time)
      await this.scouterEloRepo.updateRating({
        scouterId,
        seasonYear: result.seasonYear,
        newRating: calculation.newRating,
        delta: calculation.delta,
        validationCount: 1,
        successCount: isSuccess ? 1 : 0,
        failureCount: isSuccess ? 0 : 1,
        executionId,
      });

      // Record history for this validation
      historyEntries.push({
        scouterId,
        validationId: result.validationId,
        eloBefore: currentRating.currentElo,
        eloAfter: calculation.newRating,
        eloDelta: calculation.delta,
        outcome: this.determineOutcome(eloAccuracyScore),
        accuracyScore: eloAccuracyScore,
        matchKey: result.matchKey,
        teamNumber: result.teamNumber,
        eventKey: result.eventKey,
      });

      // Update current rating for next iteration
      currentRating.currentElo = calculation.newRating;
    }

    // Persist history entries
    await this.scouterEloRepo.createHistoryEntries(historyEntries);

    // Calculate summary stats
    const finalElo = currentRating.currentElo;
    const totalDelta = finalElo - startingElo;
    const avgAccuracy =
      scouterResults.reduce((sum, r) => sum + r.accuracyScore, 0) / scouterResults.length;

    return {
      scouterId,
      oldRating: startingElo,
      newRating: finalElo,
      delta: totalDelta,
      validationsProcessed: scouterResults.length,
      averageAccuracy: avgAccuracy,
    };
  }

  /**
   * Determine ELO outcome based on accuracy score
   */
  private determineOutcome(accuracyScore: number): ELOOutcome {
    if (accuracyScore >= 0.8) {
      return 'gain';
    }
    if (accuracyScore >= 0.5) {
      return 'neutral';
    }
    return 'loss';
  }

  /**
   * Get strategies to use for validation
   */
  private getStrategies(types?: ValidationStrategyType[]): IValidationStrategy[] {
    if (!types || types.length === 0) {
      // Return all strategies
      return Array.from(this.strategies.values());
    }

    // Return requested strategies
    return types.map((type) => this.strategies.get(type)).filter((s): s is IValidationStrategy => s !== undefined);
  }

  /**
   * Summarize results by strategy type
   */
  private summarizeByStrategy(
    results: ValidationResult[]
  ): Map<ValidationStrategyType, number> {
    const breakdown = new Map<ValidationStrategyType, number>();

    for (const result of results) {
      breakdown.set(result.validationType, (breakdown.get(result.validationType) || 0) + 1);
    }

    return breakdown;
  }

  /**
   * Create empty summary for events with no matches
   */
  private createEmptySummary(
    executionId: string,
    eventKey: string,
    startTime: number
  ): ValidationExecutionSummary {
    const completedAt = Date.now();
    return {
      executionId,
      eventKey,
      totalValidations: 0,
      scoutersAffected: 0,
      strategyBreakdown: new Map(),
      eloUpdates: [],
      startedAt: new Date(startTime),
      completedAt: new Date(completedAt),
      durationMs: completedAt - startTime,
    };
  }
}

import { createScouterEloRepository } from '@/lib/repositories/scouter-elo.repository';
import { createValidationResultRepository } from '@/lib/repositories/validation-result.repository';
import { createValidationConsensusRepository } from '@/lib/repositories/validation-consensus.repository';
import { createMatchRepository } from '@/lib/repositories/match.repository';

/**
 * Factory function to create ScouterValidationService with dependencies
 *
 * Note: This is a placeholder. In production, you should inject dependencies
 * from your dependency injection container or create them explicitly.
 *
 * @param dependencies - Optional dependencies to override defaults
 * @returns Configured service instance
 */
export function createScouterValidationService(dependencies?: {
  strategies?: Map<ValidationStrategyType, IValidationStrategy>;
  eloCalculator?: ELORatingCalculator;
  scouterEloRepo?: IScouterEloRepository;
  validationResultRepo?: IValidationResultRepository;
  consensusRepo?: IValidationConsensusRepository;
  matchRepo?: IMatchRepository;
}): IScouterValidationService {
  // Use provided dependencies or create defaults
  const strategies = dependencies?.strategies || new Map();
  const eloCalculator = dependencies?.eloCalculator || new ELORatingCalculator();

  const scouterEloRepo = dependencies?.scouterEloRepo || createScouterEloRepository();
  const validationResultRepo =
    dependencies?.validationResultRepo || createValidationResultRepository();
  const consensusRepo = dependencies?.consensusRepo || createValidationConsensusRepository();
  const matchRepo = dependencies?.matchRepo || createMatchRepository();

  return new ScouterValidationService(
    strategies,
    eloCalculator,
    scouterEloRepo,
    validationResultRepo,
    consensusRepo,
    matchRepo
  );
}
