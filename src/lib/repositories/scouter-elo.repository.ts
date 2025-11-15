/**
 * Repository for scouter ELO rating data access
 * Handles CRUD operations for ELO ratings and history
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  ScouterRating,
  ScouterEloRatingRow,
  ScouterRatingHistory,
  ScouterEloHistoryRow,
  ELORatingUpdate,
  ELOHistoryEntry,
  HistoryQueryOptions,
  ScouterLeaderboardEntry,
} from '@/types/validation';
import {
  RepositoryError,
  EntityNotFoundError,
  DatabaseOperationError,
} from './base.repository';

/**
 * Scouter ELO Repository Interface
 */
export interface IScouterEloRepository {
  /**
   * Get current ELO rating for a scouter in a season
   */
  getCurrentRating(
    scouterId: string,
    seasonYear: number
  ): Promise<ScouterRating>;

  /**
   * Get ELO ratings for multiple scouters
   */
  getRatingsForScouters(
    scouterIds: string[],
    seasonYear: number
  ): Promise<Map<string, ScouterRating>>;

  /**
   * Update a scouter's ELO rating
   */
  updateRating(update: ELORatingUpdate): Promise<void>;

  /**
   * Create a history entry for an ELO change
   */
  createHistoryEntry(entry: ELOHistoryEntry): Promise<void>;

  /**
   * Create multiple history entries (batch)
   */
  createHistoryEntries(entries: ELOHistoryEntry[]): Promise<void>;

  /**
   * Get rating history for a scouter
   */
  getRatingHistory(
    scouterId: string,
    options?: HistoryQueryOptions
  ): Promise<ScouterRatingHistory[]>;

  /**
   * Get leaderboard for a season
   */
  getSeasonLeaderboard(
    seasonYear: number,
    limit?: number
  ): Promise<ScouterLeaderboardEntry[]>;

  /**
   * Get leaderboard for an event
   */
  getEventLeaderboard(
    eventKey: string,
    seasonYear: number,
    limit?: number
  ): Promise<ScouterLeaderboardEntry[]>;

  /**
   * Initialize rating for a new scouter
   */
  initializeRating(
    scouterId: string,
    seasonYear: number,
    initialRating?: number
  ): Promise<ScouterRating>;

  /**
   * Get top performers (highest accuracy)
   */
  getTopPerformers(
    seasonYear: number,
    limit?: number
  ): Promise<ScouterRating[]>;

  /**
   * Get rating trend (recent delta average)
   */
  getRatingTrend(
    scouterId: string,
    recentCount?: number
  ): Promise<number>;
}

/**
 * Scouter ELO Repository Implementation
 */
export class ScouterEloRepository implements IScouterEloRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  async getCurrentRating(
    scouterId: string,
    seasonYear: number
  ): Promise<ScouterRating> {
    try {
      const { data, error } = await this.client
        .from('scouter_elo_ratings')
        .select('*')
        .eq('scouter_id', scouterId)
        .eq('season_year', seasonYear)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rating found - initialize with default
          return await this.initializeRating(scouterId, seasonYear);
        }
        throw new DatabaseOperationError(
          `Failed to fetch ELO rating: ${error.message}`,
          error
        );
      }

      return this.mapRowToRating(data);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get current rating', error);
    }
  }

  async getRatingsForScouters(
    scouterIds: string[],
    seasonYear: number
  ): Promise<Map<string, ScouterRating>> {
    try {
      const { data, error } = await this.client
        .from('scouter_elo_ratings')
        .select('*')
        .in('scouter_id', scouterIds)
        .eq('season_year', seasonYear);

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch ELO ratings: ${error.message}`,
          error
        );
      }

      const ratingsMap = new Map<string, ScouterRating>();

      for (const row of data || []) {
        ratingsMap.set(row.scouter_id, this.mapRowToRating(row));
      }

      // Initialize ratings for scouters not found
      for (const scouterId of scouterIds) {
        if (!ratingsMap.has(scouterId)) {
          const rating = await this.initializeRating(scouterId, seasonYear);
          ratingsMap.set(scouterId, rating);
        }
      }

      return ratingsMap;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get ratings for scouters', error);
    }
  }

  async updateRating(update: ELORatingUpdate): Promise<void> {
    try {
      // Get current rating to update peak/lowest
      const current = await this.getCurrentRating(update.scouterId, update.seasonYear);

      const newPeakElo = Math.max(current.peakElo, update.newRating);
      const newLowestElo = Math.min(current.lowestElo, update.newRating);

      // Use provided success/failure counts if available, otherwise fall back to delta-based calculation
      const successIncrement = update.successCount ?? (update.delta >= 0 ? update.validationCount : 0);
      const failIncrement = update.failureCount ?? (update.delta < 0 ? update.validationCount : 0);

      // Calculate new total validations
      const newTotalValidations = current.totalValidations + update.validationCount;

      // Calculate confidence level based on validation count (logarithmic growth)
      // Formula: min(0.95, 0.50 + 0.45 * (log(count + 1) / log(100)))
      const newConfidence = Math.min(
        0.95,
        0.50 + 0.45 * (Math.log(newTotalValidations + 1) / Math.log(100))
      );

      const { error } = await this.client
        .from('scouter_elo_ratings')
        .update({
          current_elo: update.newRating,
          peak_elo: newPeakElo,
          lowest_elo: newLowestElo,
          total_validations: newTotalValidations,
          successful_validations: current.successfulValidations + successIncrement,
          failed_validations: current.failedValidations + failIncrement,
          confidence_level: newConfidence,
          last_validation_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('scouter_id', update.scouterId)
        .eq('season_year', update.seasonYear);

      if (error) {
        throw new DatabaseOperationError(
          `Failed to update ELO rating: ${error.message}`,
          error
        );
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to update rating', error);
    }
  }

  async createHistoryEntry(entry: ELOHistoryEntry): Promise<void> {
    try {
      const { error } = await this.client
        .from('scouter_elo_history')
        .insert({
          scouter_id: entry.scouterId,
          elo_before: entry.eloBefore,
          elo_after: entry.eloAfter,
          elo_delta: entry.eloDelta,
          validation_id: entry.validationId,
          validation_type: this.getValidationTypeFromValidationId(entry.validationId),
          accuracy_score: entry.accuracyScore,
          outcome: entry.outcome,
          match_key: entry.matchKey,
          team_number: entry.teamNumber,
          event_key: entry.eventKey,
        });

      if (error) {
        throw new DatabaseOperationError(
          `Failed to create history entry: ${error.message}`,
          error
        );
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to create history entry', error);
    }
  }

  async createHistoryEntries(entries: ELOHistoryEntry[]): Promise<void> {
    if (entries.length === 0) return;

    try {
      const rows = entries.map((entry) => ({
        scouter_id: entry.scouterId,
        elo_before: entry.eloBefore,
        elo_after: entry.eloAfter,
        elo_delta: entry.eloDelta,
        validation_id: entry.validationId,
        validation_type: this.getValidationTypeFromValidationId(entry.validationId),
        accuracy_score: entry.accuracyScore,
        outcome: entry.outcome,
        match_key: entry.matchKey,
        team_number: entry.teamNumber,
        event_key: entry.eventKey,
      }));

      const { error } = await this.client.from('scouter_elo_history').insert(rows);

      if (error) {
        throw new DatabaseOperationError(
          `Failed to create history entries: ${error.message}`,
          error
        );
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to create history entries', error);
    }
  }

  async getRatingHistory(
    scouterId: string,
    options?: HistoryQueryOptions
  ): Promise<ScouterRatingHistory[]> {
    try {
      let query = this.client
        .from('scouter_elo_history')
        .select('*')
        .eq('scouter_id', scouterId);

      // Apply filters
      if (options?.eventKey) {
        query = query.eq('event_key', options.eventKey);
      }

      if (options?.validationType) {
        query = query.eq('validation_type', options.validationType);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      // Apply ordering
      const orderBy = options?.orderBy || 'created_at';
      const orderDirection = options?.orderDirection || 'desc';
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch rating history: ${error.message}`,
          error
        );
      }

      return (data || []).map(this.mapHistoryRowToHistory);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get rating history', error);
    }
  }

  async getSeasonLeaderboard(
    seasonYear: number,
    limit: number = 50
  ): Promise<ScouterLeaderboardEntry[]> {
    try {
      // Fetch all ratings for the season (we'll sort in memory)
      const { data, error } = await this.client
        .from('scouter_elo_ratings')
        .select(`
          *,
          scouters!inner(
            id,
            user_id
          )
        `)
        .eq('season_year', seasonYear);

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch leaderboard: ${error.message}`,
          error
        );
      }

      // Sort by confidence-weighted score (current_elo * confidence_level)
      // This favors proven scouters with more validations
      const sorted = (data || []).sort((a, b) => {
        const scoreA = a.current_elo * a.confidence_level;
        const scoreB = b.current_elo * b.confidence_level;
        return scoreB - scoreA; // Descending
      });

      // Apply limit after sorting
      const limited = sorted.slice(0, limit);

      return await this.mapToLeaderboardEntries(limited);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get season leaderboard', error);
    }
  }

  async getEventLeaderboard(
    eventKey: string,
    seasonYear: number,
    limit: number = 50
  ): Promise<ScouterLeaderboardEntry[]> {
    try {
      // Get scouters who participated in this event
      // Need to join with match_schedule to filter by event_key since match_scouting only has match_key
      // Specify match_key relationship explicitly since there are multiple FKs
      const { data: eventScouters, error: scoutersError } = await this.client
        .from('match_scouting')
        .select(`
          scouter_id,
          match_schedule!match_scouting_match_key_fkey(event_key)
        `)
        .eq('match_schedule.event_key', eventKey)
        .not('scouter_id', 'is', null);

      if (scoutersError) {
        throw new DatabaseOperationError(
          `Failed to fetch event scouters: ${scoutersError.message}`,
          scoutersError
        );
      }

      const scouterIds = [
        ...new Set((eventScouters || []).map((s) => s.scouter_id).filter(Boolean)),
      ];

      if (scouterIds.length === 0) {
        return [];
      }

      const { data, error } = await this.client
        .from('scouter_elo_ratings')
        .select(`
          *,
          scouters!inner(
            id,
            user_id,
            user_profiles(
              display_name,
              full_name
            )
          )
        `)
        .in('scouter_id', scouterIds)
        .eq('season_year', seasonYear)
        .order('current_elo', { ascending: false })
        .limit(limit);

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch event leaderboard: ${error.message}`,
          error
        );
      }

      return await this.mapToLeaderboardEntries(data || []);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get event leaderboard', error);
    }
  }

  async initializeRating(
    scouterId: string,
    seasonYear: number,
    initialRating: number = 1500
  ): Promise<ScouterRating> {
    try {
      const { data, error } = await this.client
        .from('scouter_elo_ratings')
        .insert({
          scouter_id: scouterId,
          season_year: seasonYear,
          current_elo: initialRating,
          peak_elo: initialRating,
          lowest_elo: initialRating,
          confidence_level: 0.5,
          total_validations: 0,
          successful_validations: 0,
          failed_validations: 0,
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseOperationError(
          `Failed to initialize rating: ${error.message}`,
          error
        );
      }

      return this.mapRowToRating(data);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to initialize rating', error);
    }
  }

  async getTopPerformers(
    seasonYear: number,
    limit: number = 10
  ): Promise<ScouterRating[]> {
    try {
      const { data, error } = await this.client
        .from('scouter_elo_ratings')
        .select('*')
        .eq('season_year', seasonYear)
        .gte('total_validations', 10) // Minimum validations to qualify
        .order('current_elo', { ascending: false })
        .limit(limit);

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch top performers: ${error.message}`,
          error
        );
      }

      return (data || []).map(this.mapRowToRating);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get top performers', error);
    }
  }

  async getRatingTrend(
    scouterId: string,
    recentCount: number = 10
  ): Promise<number> {
    try {
      const { data, error } = await this.client
        .from('scouter_elo_history')
        .select('elo_delta')
        .eq('scouter_id', scouterId)
        .order('created_at', { ascending: false })
        .limit(recentCount);

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch rating trend: ${error.message}`,
          error
        );
      }

      if (!data || data.length === 0) {
        return 0;
      }

      const totalDelta = data.reduce((sum, entry) => sum + entry.elo_delta, 0);
      return totalDelta / data.length;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get rating trend', error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private mapRowToRating(row: ScouterEloRatingRow): ScouterRating {
    return {
      scouterId: row.scouter_id,
      seasonYear: row.season_year,
      currentElo: Number(row.current_elo),
      peakElo: Number(row.peak_elo),
      lowestElo: Number(row.lowest_elo),
      confidenceLevel: Number(row.confidence_level),
      totalValidations: row.total_validations,
      successfulValidations: row.successful_validations,
      failedValidations: row.failed_validations,
      lastValidationAt: row.last_validation_at ? new Date(row.last_validation_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapHistoryRowToHistory(row: ScouterEloHistoryRow): ScouterRatingHistory {
    return {
      scouterId: row.scouter_id,
      eloBefore: Number(row.elo_before),
      eloAfter: Number(row.elo_after),
      eloDelta: Number(row.elo_delta),
      validationId: row.validation_id,
      validationType: row.validation_type,
      accuracyScore: row.accuracy_score ? Number(row.accuracy_score) : undefined,
      outcome: row.outcome,
      matchKey: row.match_key,
      teamNumber: row.team_number,
      eventKey: row.event_key,
      createdAt: new Date(row.created_at),
    };
  }

  private async mapToLeaderboardEntries(
    rows: any[]
  ): Promise<ScouterLeaderboardEntry[]> {
    const entries: ScouterLeaderboardEntry[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rating = this.mapRowToRating(row);

      // Get scouter name - for now use scouter_id since we don't have user_profiles join
      // TODO: Add a name field to scouters table or query auth.users metadata
      const scouterName = row.scouter_id || 'Unknown Scouter';

      const successRate =
        rating.totalValidations > 0
          ? (rating.successfulValidations / rating.totalValidations) * 100
          : 0;

      const recentTrend = await this.getRatingTrend(rating.scouterId, 5);

      entries.push({
        rank: i + 1,
        scouterId: rating.scouterId,
        scouterName,
        currentElo: rating.currentElo,
        peakElo: rating.peakElo,
        totalValidations: rating.totalValidations,
        successfulValidations: rating.successfulValidations,
        successRate,
        confidenceLevel: rating.confidenceLevel,
        recentTrend,
      });
    }

    return entries;
  }

  private getValidationTypeFromValidationId(validationId: string): string {
    // This is a placeholder - in reality, we'll fetch from validation_results
    // For now, return 'consensus' as default
    return 'consensus';
  }
}

/**
 * Factory function to create repository with service client
 */
export function createScouterEloRepository(): IScouterEloRepository {
  return new ScouterEloRepository();
}
