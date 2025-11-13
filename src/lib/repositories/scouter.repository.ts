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
import { buildSearchFilter } from '@/lib/utils/input-sanitization';

/**
 * Experience level for scouters (matches database schema)
 */
export type ExperienceLevel = 'rookie' | 'intermediate' | 'veteran';

/**
 * Preferred role for scouters
 */
export type PreferredRole = 'match_scouting' | 'pit_scouting' | 'both';

/**
 * Extended Scouter type with additional fields
 */
export interface ExtendedScouter extends Scouter {
  user_id: string; // Link to user_profiles (required)
  experience_level: ExperienceLevel;
  preferred_role?: PreferredRole;
  certifications: string[]; // Array of certification types (stored as JSONB)
  total_matches_scouted: number;
  total_events_attended: number;
  availability_notes?: string;
  user_profiles?: {
    email?: string;
    full_name?: string;
    display_name?: string;
  } | null;
}

/**
 * Scouter creation input
 */
export interface CreateScouterInput {
  user_id: string; // Required - reference to auth.users
  team_number?: number; // Optional - primary team affiliation
  experience_level?: ExperienceLevel; // Defaults to 'rookie'
  preferred_role?: PreferredRole;
  certifications?: string[];
  availability_notes?: string;
}

/**
 * Scouter update input
 */
export interface UpdateScouterInput {
  team_number?: number | null;
  experience_level?: ExperienceLevel;
  preferred_role?: PreferredRole | null;
  certifications?: string[];
  availability_notes?: string;
}

/**
 * Query options specific to scouters
 */
export interface ScouterQueryOptions extends QueryOptions {
  search?: string; // Search by user email or full_name
  experience_level?: ExperienceLevel;
  team_number?: number;
  certification?: string;
  preferred_role?: PreferredRole;
}

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
  count(options?: Omit<ScouterQueryOptions, 'limit' | 'offset'>): Promise<number>;
  incrementMatchesCount(id: string): Promise<void>;
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
      let query = this.client.from('scouters').select(`
        *,
        user_profiles!inner (
          email,
          full_name,
          display_name
        )
      `);

      // Apply filters
      if (options?.experience_level) {
        query = query.eq('experience_level', options.experience_level);
      }

      if (options?.team_number) {
        query = query.eq('team_number', options.team_number);
      }

      if (options?.preferred_role) {
        query = query.eq('preferred_role', options.preferred_role);
      }

      // Certification filter (JSONB array contains)
      if (options?.certification) {
        query = query.contains('certifications', [options.certification]);
      }

      // SECURE: Search by user email or full_name (via join) using input sanitization
      if (options?.search) {
        try {
          // Search in the joined user_profiles table
          const textFilter = buildSearchFilter(
            ['user_profiles.email', 'user_profiles.full_name'],
            options.search
          );
          if (textFilter) {
            query = query.or(textFilter);
          }
        } catch (error) {
          // Sanitization failed - throw error to caller
          throw new DatabaseOperationError(
            'find all scouters',
            error instanceof Error ? error : new Error('Invalid search input')
          );
        }
      }

      // Sorting
      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection === 'asc',
        });
      } else {
        // Default order by full_name from user_profiles
        query = query.order('user_profiles(full_name)', { ascending: true });
      }

      // Pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 100) - 1
        );
      }

      const { data, error } = await query;

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
          user_profiles!inner (
            email,
            full_name,
            display_name
          )
        `)
        .eq('team_number', teamNumber)
        .order('user_profiles(full_name)', { ascending: true });

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
          user_profiles!inner (
            email,
            full_name,
            display_name
          )
        `)
        .eq('experience_level', level)
        .order('total_matches_scouted', { ascending: false });

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
      if (!data.user_id) {
        throw new RepositoryError('user_id is required for create');
      }

      const scouterData = {
        user_id: data.user_id,
        team_number: data.team_number ?? null,
        experience_level: data.experience_level ?? 'rookie',
        preferred_role: data.preferred_role ?? null,
        certifications: data.certifications ?? [],
        availability_notes: data.availability_notes ?? null,
      };

      const { data: scouter, error } = await this.client
        .from('scouters')
        .insert(scouterData)
        .select(`
          *,
          user_profiles!inner (
            email,
            full_name,
            display_name
          )
        `)
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
        .update({
          team_number: data.team_number ?? undefined,
          experience_level: data.experience_level ?? undefined,
          preferred_role: data.preferred_role ?? undefined,
          certifications: data.certifications ?? undefined,
          availability_notes: data.availability_notes ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          user_profiles!inner (
            email,
            full_name,
            display_name
          )
        `)
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
      let query = this.client
        .from('scouters')
        .select('id', { count: 'exact', head: true });

      // Apply same filters as findAll
      if (options?.experience_level) {
        query = query.eq('experience_level', options.experience_level);
      }

      if (options?.team_number) {
        query = query.eq('team_number', options.team_number);
      }

      if (options?.preferred_role) {
        query = query.eq('preferred_role', options.preferred_role);
      }

      if (options?.certification) {
        query = query.contains('certifications', [options.certification]);
      }

      // SECURE: Apply search filter using input sanitization utility
      if (options?.search) {
        try {
          const textFilter = buildSearchFilter(
            ['user_profiles.email', 'user_profiles.full_name'],
            options.search
          );
          if (textFilter) {
            query = query.or(textFilter);
          }
        } catch (error) {
          // Sanitization failed - throw error to caller
          throw new DatabaseOperationError(
            'count scouters',
            error instanceof Error ? error : new Error('Invalid search input')
          );
        }
      }

      const { count, error } = await query;

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

      const { error } = await this.client
        .from('scouters')
        .update({
          total_matches_scouted: (existing.total_matches_scouted || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (filters?.experience_level) {
        query = query.eq('experience_level', filters.experience_level);
      }

      if (filters?.preferred_role) {
        query = query.eq('preferred_role', filters.preferred_role);
      }
      throw new DatabaseOperationError('increment matches count', error);
    }
  }
}

/**
 * Factory function for dependency injection
 */
export function createScouterRepository(client?: SupabaseClient): IScouterRepository {
  return new ScouterRepository(client);
}
