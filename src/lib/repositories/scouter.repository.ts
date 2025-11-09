/**
 * Repository for scouter data access
 * Handles CRUD operations for scouters (scout management)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type { Scouter } from '@/types/admin';
import type { QueryOptions } from './base.repository';
import {
  RepositoryError,
  EntityNotFoundError,
  DatabaseOperationError,
} from './base.repository';

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
  findById(id: string): Promise<ExtendedScouter | null>;
  findByUserId(userId: string): Promise<ExtendedScouter | null>;
  findAll(options?: ScouterQueryOptions): Promise<ExtendedScouter[]>;
  findByTeamNumber(teamNumber: number): Promise<ExtendedScouter[]>;
  findByExperienceLevel(level: ExperienceLevel): Promise<ExtendedScouter[]>;
  create(data: CreateScouterInput): Promise<ExtendedScouter>;
  update(id: string, data: UpdateScouterInput): Promise<ExtendedScouter>;
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
   * Find scouter by ID
   */
  async findById(id: string): Promise<ExtendedScouter | null> {
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

      return data as ExtendedScouter;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find scouter by id', error);
    }
  }

  /**
   * Find scouter by user ID
   */
  async findByUserId(userId: string): Promise<ExtendedScouter | null> {
    try {
      const { data, error } = await this.client
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

      return data as ExtendedScouter;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find scouter by user id', error);
    }
  }

  /**
   * Find all scouters with optional filtering, search, and pagination
   */
  async findAll(options?: ScouterQueryOptions): Promise<ExtendedScouter[]> {
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

      // Search by user email or full_name (via join)
      if (options?.search) {
        // Search in the joined user_profiles table
        query = query.or(
          `user_profiles.email.ilike.%${options.search}%,user_profiles.full_name.ilike.%${options.search}%`
        );
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
        throw new DatabaseOperationError('find all scouters', error);
      }

      return (data || []) as ExtendedScouter[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find all scouters', error);
    }
  }

  /**
   * Find scouters by team number
   */
  async findByTeamNumber(teamNumber: number): Promise<ExtendedScouter[]> {
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

      return (data || []) as ExtendedScouter[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find scouters by team', error);
    }
  }

  /**
   * Find scouters by experience level
   */
  async findByExperienceLevel(level: ExperienceLevel): Promise<ExtendedScouter[]> {
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
        .eq('experience_level', level)
        .order('total_matches_scouted', { ascending: false });

      if (error) {
        throw new DatabaseOperationError('find scouters by experience level', error);
      }

      return (data || []) as ExtendedScouter[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find scouters by experience level', error);
    }
  }

  /**
   * Create a new scouter
   */
  async create(data: CreateScouterInput): Promise<ExtendedScouter> {
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

      const { data: created, error } = await this.client
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

      if (!created) {
        throw new RepositoryError('Failed to create scouter - no data returned');
      }

      return created as ExtendedScouter;
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
  async update(id: string, data: UpdateScouterInput): Promise<ExtendedScouter> {
    try {
      // Verify scouter exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new EntityNotFoundError('Scouter', id);
      }

      const { data: updated, error } = await this.client
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

      if (!updated) {
        throw new RepositoryError('Failed to update scouter - no data returned');
      }

      return updated as ExtendedScouter;
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

      const { error } = await this.client
        .from('scouters')
        .delete()
        .eq('id', id);

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
   * Count scouters with optional filtering
   */
  async count(options?: Omit<ScouterQueryOptions, 'limit' | 'offset'>): Promise<number> {
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

      if (options?.search) {
        query = query.or(
          `user_profiles.email.ilike.%${options.search}%,user_profiles.full_name.ilike.%${options.search}%`
        );
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

  /**
   * Increment matches scouted counter
   */
  async incrementMatchesCount(id: string): Promise<void> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new EntityNotFoundError('Scouter', id);
      }

      const { error } = await this.client
        .from('scouters')
        .update({
          total_matches_scouted: (existing.total_matches_scouted || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new DatabaseOperationError('increment matches count', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
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
