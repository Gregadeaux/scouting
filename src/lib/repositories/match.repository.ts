/**
 * Repository for match schedule data access
 * Handles CRUD operations for FRC matches
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type { MatchSchedule } from '@/types';
import type { QueryOptions } from './base.repository';
import {
  RepositoryError,
  EntityNotFoundError,
  DatabaseOperationError,
} from './base.repository';

/**
 * Match-specific query options
 */
export interface MatchQueryOptions extends QueryOptions {
  compLevel?: string; // Filter by comp_level (qm, qf, sf, f)
  includeScoutingStatus?: boolean; // Join with match_scouting data
}

/**
 * Scouting coverage report for a match
 */
export interface ScoutingCoverageByMatch {
  [matchKey: string]: {
    total_positions: number; // Always 6 (3 red + 3 blue)
    scouted_positions: number; // How many have match_scouting entries
    positions: {
      red_1: boolean;
      red_2: boolean;
      red_3: boolean;
      blue_1: boolean;
      blue_2: boolean;
      blue_3: boolean;
    };
  };
}

/**
 * Match Repository Interface
 */
export interface IMatchRepository {
  findByMatchKey(matchKey: string): Promise<MatchSchedule | null>;
  findByEventKey(eventKey: string, options?: MatchQueryOptions): Promise<MatchSchedule[]>;
  findByTeam(teamNumber: number, eventKey?: string): Promise<MatchSchedule[]>;
  upsert(match: Partial<MatchSchedule>): Promise<MatchSchedule>;
  bulkUpsert(matches: Partial<MatchSchedule>[]): Promise<MatchSchedule[]>;
  updateScores(matchKey: string, redScore: number, blueScore: number): Promise<void>;
  getScoutingCoverage(eventKey: string): Promise<ScoutingCoverageByMatch>;
  count(eventKey?: string): Promise<number>;
}

/**
 * Match Repository Implementation
 */
export class MatchRepository implements IMatchRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  /**
   * Find match by match key
   */
  async findByMatchKey(matchKey: string): Promise<MatchSchedule | null> {
    try {
      const { data, error } = await this.client
        .from('match_schedule')
        .select('*')
        .eq('match_key', matchKey)
        .single();

      if (error) {
        // Not found is expected, not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new DatabaseOperationError('find match by key', error);
      }

      return data as MatchSchedule;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find match by key', error);
    }
  }

  /**
   * Find matches by event key
   */
  async findByEventKey(
    eventKey: string,
    options?: MatchQueryOptions
  ): Promise<MatchSchedule[]> {
    try {
      let query = this.client
        .from('match_schedule')
        .select('*')
        .eq('event_key', eventKey);

      // Filter by comp_level if specified
      if (options?.compLevel) {
        query = query.eq('comp_level', options.compLevel);
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection === 'asc',
        });
      } else {
        // Default order: comp_level, then match_number
        query = query
          .order('comp_level', { ascending: true })
          .order('match_number', { ascending: true });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseOperationError('find matches by event', error);
      }

      return (data || []) as MatchSchedule[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find matches by event', error);
    }
  }

  /**
   * Find matches by team number
   * @param teamNumber - Team number to search for
   * @param eventKey - Optional event key to filter by
   * @returns Array of matches the team participates in
   */
  async findByTeam(teamNumber: number, eventKey?: string): Promise<MatchSchedule[]> {
    try {
      let query = this.client
        .from('match_schedule')
        .select('*')
        .or(
          `red_1.eq.${teamNumber},red_2.eq.${teamNumber},red_3.eq.${teamNumber},` +
          `blue_1.eq.${teamNumber},blue_2.eq.${teamNumber},blue_3.eq.${teamNumber}`
        );

      if (eventKey) {
        query = query.eq('event_key', eventKey);
      }

      const { data, error } = await query
        .order('scheduled_time', { ascending: true })
        .order('comp_level', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) {
        throw new DatabaseOperationError('find matches by team', error);
      }

      return (data || []) as MatchSchedule[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find matches by team', error);
    }
  }

  /**
   * Upsert a single match
   */
  async upsert(match: Partial<MatchSchedule>): Promise<MatchSchedule> {
    try {
      if (!match.match_key) {
        throw new RepositoryError('match_key is required for upsert');
      }

      const { data, error } = await this.client
        .from('match_schedule')
        .upsert(match, {
          onConflict: 'match_key',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseOperationError('upsert match', error);
      }

      if (!data) {
        throw new RepositoryError('Failed to upsert match - no data returned');
      }

      return data as MatchSchedule;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('upsert match', error);
    }
  }

  /**
   * Bulk upsert matches (transactional)
   */
  async bulkUpsert(matches: Partial<MatchSchedule>[]): Promise<MatchSchedule[]> {
    try {
      if (matches.length === 0) {
        return [];
      }

      // Validate all matches have match_key
      for (const match of matches) {
        if (!match.match_key) {
          throw new RepositoryError('All matches must have match_key for bulk upsert');
        }
      }

      const { data, error } = await this.client
        .from('match_schedule')
        .upsert(matches, {
          onConflict: 'match_key',
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error('[MatchRepository] Bulk upsert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new DatabaseOperationError('bulk upsert matches', error);
      }

      return (data || []) as MatchSchedule[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('bulk upsert matches', error);
    }
  }

  /**
   * Update match scores
   */
  async updateScores(matchKey: string, redScore: number, blueScore: number): Promise<void> {
    try {
      // Determine winning alliance
      let winningAlliance: 'red' | 'blue' | 'tie';
      if (redScore > blueScore) {
        winningAlliance = 'red';
      } else if (blueScore > redScore) {
        winningAlliance = 'blue';
      } else {
        winningAlliance = 'tie';
      }

      const { error } = await this.client
        .from('match_schedule')
        .update({
          red_score: redScore,
          blue_score: blueScore,
          winning_alliance: winningAlliance,
          updated_at: new Date().toISOString(),
        })
        .eq('match_key', matchKey);

      if (error) {
        throw new DatabaseOperationError('update match scores', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('update match scores', error);
    }
  }

  /**
   * Get scouting coverage for all matches in an event
   */
  async getScoutingCoverage(eventKey: string): Promise<ScoutingCoverageByMatch> {
    try {
      // Get all matches for the event
      const matches = await this.findByEventKey(eventKey);

      // Get all match scouting entries for the event
      const { data: scoutingData, error: scoutingError } = await this.client
        .from('match_scouting')
        .select('match_key, team_number')
        .eq('event_key', eventKey);

      if (scoutingError) {
        throw new DatabaseOperationError('get scouting coverage', scoutingError);
      }

      // Build coverage map
      const coverage: ScoutingCoverageByMatch = {};

      for (const match of matches) {
        const matchKey = match.match_key;

        // Initialize positions
        const positions = {
          red_1: false,
          red_2: false,
          red_3: false,
          blue_1: false,
          blue_2: false,
          blue_3: false,
        };

        // Check which positions have been scouted
        const scoutedTeams = new Set(
          (scoutingData || [])
            .filter((s: { match_key: string }) => s.match_key === matchKey)
            .map((s: { team_number: number }) => s.team_number)
        );

        if (match.red_1 && scoutedTeams.has(match.red_1)) positions.red_1 = true;
        if (match.red_2 && scoutedTeams.has(match.red_2)) positions.red_2 = true;
        if (match.red_3 && scoutedTeams.has(match.red_3)) positions.red_3 = true;
        if (match.blue_1 && scoutedTeams.has(match.blue_1)) positions.blue_1 = true;
        if (match.blue_2 && scoutedTeams.has(match.blue_2)) positions.blue_2 = true;
        if (match.blue_3 && scoutedTeams.has(match.blue_3)) positions.blue_3 = true;

        const scoutedCount = Object.values(positions).filter((v) => v).length;

        coverage[matchKey] = {
          total_positions: 6,
          scouted_positions: scoutedCount,
          positions,
        };
      }

      return coverage;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('get scouting coverage', error);
    }
  }

  /**
   * Count matches (optionally filtered by event)
   */
  async count(eventKey?: string): Promise<number> {
    try {
      let query = this.client.from('match_schedule').select('*', { count: 'exact', head: true });

      if (eventKey) {
        query = query.eq('event_key', eventKey);
      }

      const { count, error } = await query;

      if (error) {
        throw new DatabaseOperationError('count matches', error);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('count matches', error);
    }
  }
}

/**
 * Factory function for dependency injection
 */
export function createMatchRepository(client?: SupabaseClient): IMatchRepository {
  return new MatchRepository(client);
}
