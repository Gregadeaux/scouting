/**
 * Repository for season configuration data access
 * Handles CRUD operations for the season_config table
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  SeasonConfig,
  SeasonConfigListItem,
  SeasonConfigUpdate,
} from '@/types';
import {
  RepositoryError,
  EntityNotFoundError,
  DatabaseOperationError,
} from './base.repository';

/**
 * Columns to select for list view (excludes large JSONB schema fields)
 */
const LIST_COLUMNS = `
  year,
  game_name,
  game_description,
  match_duration_seconds,
  auto_duration_seconds,
  teleop_duration_seconds,
  kickoff_date,
  championship_start_date,
  championship_end_date,
  created_at,
  updated_at
`;

/**
 * Season Config Repository Interface
 */
export interface ISeasonConfigRepository {
  findAll(): Promise<SeasonConfigListItem[]>;
  findByYear(year: number): Promise<SeasonConfig | null>;
  update(year: number, data: SeasonConfigUpdate): Promise<SeasonConfig>;
}

/**
 * Season Config Repository Implementation
 */
export class SeasonConfigRepository implements ISeasonConfigRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  /**
   * Find all season configurations (list view, excludes schemas)
   */
  async findAll(): Promise<SeasonConfigListItem[]> {
    try {
      const { data, error } = await this.client
        .from('season_config')
        .select(LIST_COLUMNS)
        .order('year', { ascending: false });

      if (error) {
        throw new DatabaseOperationError('find all season configs', error);
      }

      return (data || []) as SeasonConfigListItem[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find all season configs', error);
    }
  }

  /**
   * Find season configuration by year (includes full schemas)
   */
  async findByYear(year: number): Promise<SeasonConfig | null> {
    try {
      const { data, error } = await this.client
        .from('season_config')
        .select('*')
        .eq('year', year)
        .single();

      if (error) {
        // Not found is expected, not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new DatabaseOperationError('find season config by year', error);
      }

      return data as SeasonConfig;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find season config by year', error);
    }
  }

  /**
   * Update season configuration metadata
   * Note: Schema updates should be done via migrations/code
   */
  async update(year: number, data: SeasonConfigUpdate): Promise<SeasonConfig> {
    try {
      // Verify season exists
      const existing = await this.findByYear(year);
      if (!existing) {
        throw new EntityNotFoundError('SeasonConfig', year.toString());
      }

      const { data: updated, error } = await this.client
        .from('season_config')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('year', year)
        .select('*')
        .single();

      if (error) {
        throw new DatabaseOperationError('update season config', error);
      }

      if (!updated) {
        throw new RepositoryError('Failed to update season config - no data returned');
      }

      return updated as SeasonConfig;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('update season config', error);
    }
  }
}

/**
 * Factory function for dependency injection
 */
export function createSeasonConfigRepository(
  client?: SupabaseClient
): ISeasonConfigRepository {
  return new SeasonConfigRepository(client);
}
