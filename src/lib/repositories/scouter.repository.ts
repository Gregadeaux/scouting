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
 * Experience level for scouters
 */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Extended Scouter type with additional fields
 */
export interface ExtendedScouter extends Scouter {
  user_id?: string; // Link to user_profiles
  experience_level?: ExperienceLevel;
  certifications?: string[]; // Array of certification types (stored as JSONB)
  matches_scouted?: number;
  reliability_score?: number; // 0-100
  preferred_position?: 'red1' | 'red2' | 'red3' | 'blue1' | 'blue2' | 'blue3';
  notes?: string;
}

/**
 * Scouter creation input
 */
export interface CreateScouterInput {
  user_id?: string;
  scout_name: string;
  team_affiliation?: number;
  role?: 'lead' | 'scout' | 'admin';
  email?: string;
  phone?: string;
  experience_level?: ExperienceLevel;
  certifications?: string[];
  preferred_position?: string;
  notes?: string;
  active?: boolean;
}

/**
 * Scouter update input
 */
export interface UpdateScouterInput {
  scout_name?: string;
  team_affiliation?: number;
  role?: 'lead' | 'scout' | 'admin';
  email?: string;
  phone?: string;
  experience_level?: ExperienceLevel;
  certifications?: string[];
  preferred_position?: string;
  notes?: string;
  active?: boolean;
  matches_scouted?: number;
  reliability_score?: number;
}

/**
 * Query options specific to scouters
 */
export interface ScouterQueryOptions extends QueryOptions {
  search?: string; // Search by name, email
  experience_level?: ExperienceLevel;
  team_number?: number;
  certification?: string;
  role?: 'lead' | 'scout' | 'admin';
  active?: boolean;
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
  updateReliabilityScore(id: string, score: number): Promise<void>;
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
        user_profiles!left (
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
        query = query.eq('team_affiliation', options.team_number);
      }

      if (options?.role) {
        query = query.eq('role', options.role);
      }

      if (options?.active !== undefined) {
        query = query.eq('active', options.active);
      }

      // Certification filter (JSONB array contains)
      if (options?.certification) {
        query = query.contains('certifications', [options.certification]);
      }

      // Search by scout name or email (via join)
      if (options?.search) {
        // Note: This requires a more complex query with OR conditions
        // For now, we'll search by scout_name only
        query = query.ilike('scout_name', `%${options.search}%`);
      }

      // Sorting
      if (options?.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection === 'asc',
        });
      } else {
        // Default order by scout_name
        query = query.order('scout_name', { ascending: true });
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
        .select('*')
        .eq('team_affiliation', teamNumber)
        .order('scout_name', { ascending: true });

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
        .select('*')
        .eq('experience_level', level)
        .order('reliability_score', { ascending: false });

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
      if (!data.scout_name) {
        throw new RepositoryError('scout_name is required for create');
      }

      const scouterData = {
        ...data,
        active: data.active !== undefined ? data.active : true,
        matches_scouted: 0,
        reliability_score: 50, // Start with neutral score
      };

      const { data: created, error } = await this.client
        .from('scouters')
        .insert(scouterData)
        .select()
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
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
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
      let query = this.client.from('scouters').select('*', { count: 'exact', head: true });

      // Apply same filters as findAll
      if (options?.experience_level) {
        query = query.eq('experience_level', options.experience_level);
      }

      if (options?.team_number) {
        query = query.eq('team_affiliation', options.team_number);
      }

      if (options?.role) {
        query = query.eq('role', options.role);
      }

      if (options?.active !== undefined) {
        query = query.eq('active', options.active);
      }

      if (options?.certification) {
        query = query.contains('certifications', [options.certification]);
      }

      if (options?.search) {
        query = query.ilike('scout_name', `%${options.search}%`);
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
          matches_scouted: (existing.matches_scouted || 0) + 1,
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

  /**
   * Update reliability score (0-100)
   */
  async updateReliabilityScore(id: string, score: number): Promise<void> {
    try {
      if (score < 0 || score > 100) {
        throw new RepositoryError('Reliability score must be between 0 and 100');
      }

      const existing = await this.findById(id);
      if (!existing) {
        throw new EntityNotFoundError('Scouter', id);
      }

      const { error } = await this.client
        .from('scouters')
        .update({
          reliability_score: score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new DatabaseOperationError('update reliability score', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('update reliability score', error);
    }
  }
}

/**
 * Factory function for dependency injection
 */
export function createScouterRepository(client?: SupabaseClient): IScouterRepository {
  return new ScouterRepository(client);
}
