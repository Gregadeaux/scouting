/**
 * Repository for scouter data access
 * Handles CRUD operations for FRC scouters
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  Scouter,
  ScouterWithUser,
  ScouterWithStats,
  CreateScouterInput,
  UpdateScouterInput,
  ScouterFilters,
} from '@/types';
import {
  RepositoryError,
  EntityNotFoundError,
  DatabaseOperationError,
} from './base.repository';

/**
 * Scouter Repository Interface
 */
export interface IScouterRepository {
  findAll(filters?: ScouterFilters): Promise<ScouterWithUser[]>;
  findById(id: string): Promise<Scouter | null>;
  findByUserId(userId: string): Promise<Scouter | null>;
  findByTeam(teamNumber: number): Promise<ScouterWithUser[]>;
  findWithStats(): Promise<ScouterWithStats[]>;
  create(data: CreateScouterInput): Promise<Scouter>;
  update(id: string, data: UpdateScouterInput): Promise<Scouter>;
  delete(id: string): Promise<void>;
  updateStats(userId: string, matchesIncrement: number, eventsIncrement: number): Promise<void>;
  count(filters?: ScouterFilters): Promise<number>;
}

/**
 * Scouter Repository Implementation
 */
export class ScouterRepository implements IScouterRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  /**
   * Find all scouters with optional filtering
   * Returns scouters joined with user profile information
   */
  async findAll(filters?: ScouterFilters): Promise<ScouterWithUser[]> {
    try {
      let query = this.client
        .from('scouters')
        .select(`
          *,
          user_profiles:user_id (
            email,
            full_name,
            display_name
          ),
          teams:team_number (
            team_name,
            team_nickname
          )
        `);

      // Apply filters
      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters?.team_number) {
        query = query.eq('team_number', filters.team_number);
      }

      if (filters?.experience_level) {
        query = query.eq('experience_level', filters.experience_level);
      }

      if (filters?.preferred_role) {
        query = query.eq('preferred_role', filters.preferred_role);
      }

      if (filters?.has_certification) {
        query = query.contains('certifications', [filters.has_certification]);
      }

      if (filters?.min_matches_scouted) {
        query = query.gte('total_matches_scouted', filters.min_matches_scouted);
      }

      if (filters?.min_events_attended) {
        query = query.gte('total_events_attended', filters.min_events_attended);
      }

      // Search by name or email (requires user profile join)
      if (filters?.search) {
        // Note: This is a simplified search. For better performance with large datasets,
        // consider using PostgreSQL full-text search or a dedicated search service
        const searchTerm = `%${filters.search}%`;
        query = query.or(
          `user_profiles.full_name.ilike.${searchTerm},user_profiles.display_name.ilike.${searchTerm},user_profiles.email.ilike.${searchTerm}`
        );
      }

      // Sorting
      if (filters?.sort_by) {
        const sortColumn = {
          name: 'user_profiles.full_name',
          experience: 'experience_level',
          matches: 'total_matches_scouted',
          events: 'total_events_attended',
          created_at: 'created_at',
        }[filters.sort_by];

        query = query.order(sortColumn, {
          ascending: filters.sort_order === 'asc',
        });
      } else {
        // Default sort by name
        query = query.order('user_profiles.full_name', { ascending: true });
      }

      // Pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 50) - 1
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseOperationError('find all scouters', error);
      }

      // Transform the nested response to flat ScouterWithUser objects
      return (data || []).map((row: Record<string, unknown>) => {
        const user = row.user_profiles as Record<string, unknown> | null;
        const team = row.teams as Record<string, unknown> | null;

        return {
          ...row,
          email: user?.email as string,
          full_name: user?.full_name as string | null,
          display_name: user?.display_name as string | null,
          team_name: team?.team_name as string | undefined,
          team_nickname: team?.team_nickname as string | undefined,
        } as ScouterWithUser;
      });
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find all scouters', error);
    }
  }

  /**
   * Find scouter by ID
   */
  async findById(id: string): Promise<Scouter | null> {
    try {
      const { data, error } = await this.client
        .from('scouters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // Not found is expected, not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new DatabaseOperationError('find scouter by id', error);
      }

      return data as Scouter;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find scouter by id', error);
    }
  }

  /**
   * Find scouter by user ID
   * One-to-one relationship: each user can only have one scouter profile
   */
  async findByUserId(userId: string): Promise<Scouter | null> {
    try {
      const { data, error} = await this.client
        .from('scouters')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Not found is expected, not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new DatabaseOperationError('find scouter by user id', error);
      }

      return data as Scouter;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find scouter by user id', error);
    }
  }

  /**
   * Find all scouters for a specific team
   */
  async findByTeam(teamNumber: number): Promise<ScouterWithUser[]> {
    try {
      const { data, error } = await this.client
        .from('scouters')
        .select(`
          *,
          user_profiles:user_id (
            email,
            full_name,
            display_name
          ),
          teams:team_number (
            team_name,
            team_nickname
          )
        `)
        .eq('team_number', teamNumber)
        .order('experience_level', { ascending: false }); // Veterans first

      if (error) {
        throw new DatabaseOperationError('find scouters by team', error);
      }

      // Transform the nested response
      return (data || []).map((row: Record<string, unknown>) => {
        const user = row.user_profiles as Record<string, unknown> | null;
        const team = row.teams as Record<string, unknown> | null;

        return {
          ...row,
          email: user?.email as string,
          full_name: user?.full_name as string | null,
          display_name: user?.display_name as string | null,
          team_name: team?.team_name as string | undefined,
          team_nickname: team?.team_nickname as string | undefined,
        } as ScouterWithUser;
      });
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find scouters by team', error);
    }
  }

  /**
   * Find scouters with performance statistics
   * Includes metrics from current season
   */
  async findWithStats(): Promise<ScouterWithStats[]> {
    try {
      // Get current year for filtering
      const currentYear = new Date().getFullYear();

      // Complex query that joins scouters with their performance metrics
      // Note: This requires aggregating data from match_scouting table
      const { data, error } = await this.client
        .from('scouters')
        .select(`
          *,
          user_profiles:user_id (
            email,
            full_name,
            display_name
          ),
          teams:team_number (
            team_name,
            team_nickname
          ),
          match_scouting (
            created_at,
            confidence_level
          )
        `);

      if (error) {
        throw new DatabaseOperationError('find scouters with stats', error);
      }

      // Transform and calculate statistics
      return (data || []).map((row: Record<string, unknown>) => {
        const user = row.user_profiles as Record<string, unknown> | null;
        const team = row.teams as Record<string, unknown> | null;
        const scoutingRecords = (row.match_scouting as Array<Record<string, unknown>>) || [];

        // Calculate current season stats
        const currentSeasonRecords = scoutingRecords.filter((record) => {
          const createdAt = new Date(record.created_at as string);
          return createdAt.getFullYear() === currentYear;
        });

        // Calculate average confidence level
        const confidenceLevels = scoutingRecords
          .map((r) => r.confidence_level as number | null)
          .filter((c): c is number => c !== null);
        const avgConfidence =
          confidenceLevels.length > 0
            ? confidenceLevels.reduce((sum, c) => sum + c, 0) / confidenceLevels.length
            : undefined;

        // Find first and last scouting dates
        const dates = scoutingRecords
          .map((r) => new Date(r.created_at as string))
          .sort((a, b) => a.getTime() - b.getTime());

        return {
          ...row,
          email: user?.email as string,
          full_name: user?.full_name as string | null,
          display_name: user?.display_name as string | null,
          team_name: team?.team_name as string | undefined,
          team_nickname: team?.team_nickname as string | undefined,
          current_season_matches: currentSeasonRecords.length,
          current_season_events: 0, // TODO: Calculate unique events
          avg_confidence_level: avgConfidence,
          data_accuracy_score: undefined, // TODO: Implement accuracy calculation
          last_scouting_date: dates.length > 0 ? dates[dates.length - 1].toISOString() : undefined,
          first_scouting_date: dates.length > 0 ? dates[0].toISOString() : undefined,
        } as ScouterWithStats;
      });
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find scouters with stats', error);
    }
  }

  /**
   * Create a new scouter
   */
  async create(data: CreateScouterInput): Promise<Scouter> {
    try {
      // Validate that user_id exists
      const { data: user, error: userError } = await this.client
        .from('user_profiles')
        .select('id')
        .eq('id', data.user_id)
        .single();

      if (userError || !user) {
        throw new RepositoryError(
          `User with ID ${data.user_id} not found`,
          'USER_NOT_FOUND'
        );
      }

      // Check if scouter already exists for this user
      const existing = await this.findByUserId(data.user_id);
      if (existing) {
        throw new RepositoryError(
          `Scouter profile already exists for user ${data.user_id}`,
          'DUPLICATE_SCOUTER'
        );
      }

      // Prepare insert data with defaults
      const insertData = {
        user_id: data.user_id,
        team_number: data.team_number ?? null,
        experience_level: data.experience_level,
        preferred_role: data.preferred_role ?? null,
        certifications: data.certifications ?? [],
        availability_notes: data.availability_notes ?? null,
        total_matches_scouted: 0,
        total_events_attended: 0,
      };

      const { data: scouter, error } = await this.client
        .from('scouters')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new DatabaseOperationError('create scouter', error);
      }

      if (!scouter) {
        throw new RepositoryError('Failed to create scouter - no data returned');
      }

      return scouter as Scouter;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('create scouter', error);
    }
  }

  /**
   * Update an existing scouter
   */
  async update(id: string, data: UpdateScouterInput): Promise<Scouter> {
    try {
      // Verify scouter exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new EntityNotFoundError('Scouter', id);
      }

      const { data: scouter, error } = await this.client
        .from('scouters')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new DatabaseOperationError('update scouter', error);
      }

      if (!scouter) {
        throw new RepositoryError('Failed to update scouter - no data returned');
      }

      return scouter as Scouter;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('update scouter', error);
    }
  }

  /**
   * Delete a scouter
   */
  async delete(id: string): Promise<void> {
    try {
      // Verify scouter exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new EntityNotFoundError('Scouter', id);
      }

      const { error } = await this.client.from('scouters').delete().eq('id', id);

      if (error) {
        throw new DatabaseOperationError('delete scouter', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('delete scouter', error);
    }
  }

  /**
   * Update scouter activity statistics
   * Increments match and event counters
   */
  async updateStats(
    userId: string,
    matchesIncrement: number = 0,
    eventsIncrement: number = 0
  ): Promise<void> {
    try {
      const scouter = await this.findByUserId(userId);
      if (!scouter) {
        throw new EntityNotFoundError('Scouter', `user_id=${userId}`);
      }

      const { error } = await this.client
        .from('scouters')
        .update({
          total_matches_scouted: scouter.total_matches_scouted + matchesIncrement,
          total_events_attended: scouter.total_events_attended + eventsIncrement,
        })
        .eq('id', scouter.id);

      if (error) {
        throw new DatabaseOperationError('update scouter stats', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('update scouter stats', error);
    }
  }

  /**
   * Count total scouters with optional filters
   */
  async count(filters?: ScouterFilters): Promise<number> {
    try {
      let query = this.client.from('scouters').select('*', { count: 'exact', head: true });

      // Apply same filters as findAll
      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters?.team_number) {
        query = query.eq('team_number', filters.team_number);
      }

      if (filters?.experience_level) {
        query = query.eq('experience_level', filters.experience_level);
      }

      if (filters?.preferred_role) {
        query = query.eq('preferred_role', filters.preferred_role);
      }

      if (filters?.has_certification) {
        query = query.contains('certifications', [filters.has_certification]);
      }

      if (filters?.min_matches_scouted) {
        query = query.gte('total_matches_scouted', filters.min_matches_scouted);
      }

      if (filters?.min_events_attended) {
        query = query.gte('total_events_attended', filters.min_events_attended);
      }

      const { count, error } = await query;

      if (error) {
        throw new DatabaseOperationError('count scouters', error);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('count scouters', error);
    }
  }
}

/**
 * Factory function for dependency injection
 */
export function createScouterRepository(client?: SupabaseClient): IScouterRepository {
  return new ScouterRepository(client);
}
