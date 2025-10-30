/**
 * Repository for team data access
 * Handles CRUD operations for FRC teams
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type { Team, MatchSchedule } from '@/types';
import type { QueryOptions } from './base.repository';
import {
  RepositoryError,
  EntityNotFoundError,
  DatabaseOperationError,
} from './base.repository';

/**
 * Team Repository Interface
 */
export interface ITeamRepository {
  findByTeamNumber(teamNumber: number): Promise<Team | null>;
  findByEventKey(eventKey: string): Promise<Team[]>;
  findAll(options?: QueryOptions): Promise<Team[]>;
  upsert(team: Partial<Team>): Promise<Team>;
  bulkUpsert(teams: Partial<Team>[]): Promise<Team[]>;
  updateFromTBA(teamNumber: number, tbaData: Partial<Team>): Promise<Team>;
  count(): Promise<number>;
}

/**
 * Team Repository Implementation
 */
export class TeamRepository implements ITeamRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  /**
   * Find team by team number
   */
  async findByTeamNumber(teamNumber: number): Promise<Team | null> {
    try {
      const { data, error } = await this.client
        .from('teams')
        .select('*')
        .eq('team_number', teamNumber)
        .single();

      if (error) {
        // Not found is expected, not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new DatabaseOperationError('find team by number', error);
      }

      return data as Team;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find team by number', error);
    }
  }

  /**
   * Find teams attending a specific event
   * Tries event_teams table first (preferred - available before match schedule)
   * Falls back to deriving from match_schedule if event_teams is empty
   */
  async findByEventKey(eventKey: string): Promise<Team[]> {
    try {
      // First try event_teams table (preferred - available before match schedule)
      const { data: eventTeams, error: eventTeamsError } = await this.client
        .from('event_teams')
        .select(`
          team_number,
          teams (*)
        `)
        .eq('event_key', eventKey);

      // If event_teams has data, use it
      if (!eventTeamsError && eventTeams && eventTeams.length > 0) {
        // Type assertion needed because Supabase-js doesn't properly infer nested relation types
        type EventTeamRow = {
          team_number: number;
          teams: Team | null;
        };

        const teams = (eventTeams as unknown as EventTeamRow[])
          .map((row) => row.teams)
          .filter((team): team is Team => team !== null);

        return teams;
      }

      // Fallback: derive teams from match schedule (for events imported before event_teams table)
      const { data: matches, error: matchError } = await this.client
        .from('match_schedule')
        .select('red_1, red_2, red_3, blue_1, blue_2, blue_3')
        .eq('event_key', eventKey);

      if (matchError) {
        throw new DatabaseOperationError('find teams by event', matchError);
      }

      // Extract unique team numbers from all alliance positions
      const teamNumbers = new Set<number>();
      (matches || []).forEach((match: Pick<MatchSchedule, 'red_1' | 'red_2' | 'red_3' | 'blue_1' | 'blue_2' | 'blue_3'>) => {
        if (match.red_1) teamNumbers.add(match.red_1);
        if (match.red_2) teamNumbers.add(match.red_2);
        if (match.red_3) teamNumbers.add(match.red_3);
        if (match.blue_1) teamNumbers.add(match.blue_1);
        if (match.blue_2) teamNumbers.add(match.blue_2);
        if (match.blue_3) teamNumbers.add(match.blue_3);
      });

      // Return empty array if no teams found
      if (teamNumbers.size === 0) {
        return [];
      }

      // Fetch team details for all unique team numbers
      const { data: teams, error: teamError } = await this.client
        .from('teams')
        .select('*')
        .in('team_number', Array.from(teamNumbers));

      if (teamError) {
        throw new DatabaseOperationError('find teams by event', teamError);
      }

      return (teams || []) as Team[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find teams by event', error);
    }
  }

  /**
   * Find all teams with optional query parameters
   */
  async findAll(options?: QueryOptions): Promise<Team[]> {
    try {
      let query = this.client.from('teams').select('*');

      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection === 'asc',
        });
      } else {
        // Default order by team number
        query = query.order('team_number', { ascending: true });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseOperationError('find all teams', error);
      }

      return (data || []) as Team[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find all teams', error);
    }
  }

  /**
   * Upsert a single team
   * Uses INSERT ... ON CONFLICT (team_number) DO UPDATE
   */
  async upsert(team: Partial<Team>): Promise<Team> {
    try {
      if (!team.team_number) {
        throw new RepositoryError('team_number is required for upsert');
      }

      const { data, error } = await this.client
        .from('teams')
        .upsert(team, {
          onConflict: 'team_number',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseOperationError('upsert team', error);
      }

      if (!data) {
        throw new RepositoryError('Failed to upsert team - no data returned');
      }

      return data as Team;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('upsert team', error);
    }
  }

  /**
   * Bulk upsert teams (transactional)
   */
  async bulkUpsert(teams: Partial<Team>[]): Promise<Team[]> {
    try {
      if (teams.length === 0) {
        return [];
      }

      // Validate all teams have team_number
      for (const team of teams) {
        if (!team.team_number) {
          throw new RepositoryError('All teams must have team_number for bulk upsert');
        }
      }

      console.log(`[TeamRepository] Attempting to upsert ${teams.length} teams`);
      console.log('[TeamRepository] Sample team data:', teams[0]);
      console.log('[TeamRepository] Has team_key?', 'team_key' in teams[0], teams[0].team_key);

      const { data, error } = await this.client
        .from('teams')
        .upsert(teams, {
          onConflict: 'team_number',
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error('[TeamRepository] Bulk upsert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new DatabaseOperationError('bulk upsert teams', error);
      }

      return (data || []) as Team[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('bulk upsert teams', error);
    }
  }

  /**
   * Update team from TBA data
   * Preserves local-only fields (notes, custom_data)
   */
  async updateFromTBA(teamNumber: number, tbaData: Partial<Team>): Promise<Team> {
    try {
      // Get existing team to preserve local fields
      const existingTeam = await this.findByTeamNumber(teamNumber);

      // Merge TBA data with local data
      const mergedTeam: Partial<Team> = {
        ...tbaData,
        team_number: teamNumber, // Ensure team_number is set
      };

      // If team exists, preserve local-only fields
      if (existingTeam) {
        // Note: We don't have notes or custom_data in the current schema
        // but this pattern would preserve them if they existed
        // This is where merge strategy would be applied
      }

      return await this.upsert(mergedTeam);
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('update team from TBA', error);
    }
  }

  /**
   * Count total teams
   */
  async count(): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('teams')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw new DatabaseOperationError('count teams', error);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('count teams', error);
    }
  }
}

/**
 * Factory function for dependency injection
 */
export function createTeamRepository(client?: SupabaseClient): ITeamRepository {
  return new TeamRepository(client);
}
