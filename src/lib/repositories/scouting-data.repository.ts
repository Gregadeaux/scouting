/**
 * Repository for scouting data access
 * Provides read and write access to match and pit scouting data
 * Used for coverage statistics, reporting, and pit scouting management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type { MatchScouting, PitScouting } from '@/types';
import {
  RepositoryError,
  DatabaseOperationError,
} from './base.repository';

/**
 * Scouting Data Repository Interface
 */
export interface IScoutingDataRepository {
  // Read operations
  getMatchScoutingByEvent(eventKey: string): Promise<MatchScouting[]>;
  getMatchScoutingByMatch(matchKey: string): Promise<MatchScouting[]>;
  getPitScoutingByEvent(eventKey: string): Promise<PitScouting[]>;
  countMatchScoutingByEvent(eventKey: string): Promise<number>;
  countPitScoutingByEvent(eventKey: string): Promise<number>;

  // Pit scouting write operations
  createPitScouting(data: Omit<PitScouting, 'id' | 'created_at' | 'updated_at'>): Promise<PitScouting>;
  updatePitScouting(id: string, data: Partial<PitScouting>): Promise<PitScouting>;
  deletePitScouting(id: string): Promise<void>;

  // Pit scouting queries
  findPitScoutingByTeamAndEvent(teamNumber: number, eventKey: string): Promise<PitScouting | null>;
  getPitScoutingById(id: string): Promise<PitScouting | null>;
}

/**
 * Scouting Data Repository Implementation
 */
export class ScoutingDataRepository implements IScoutingDataRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  /**
   * Get all match scouting entries for an event
   * Joins through match_schedule to filter by event_key
   */
  async getMatchScoutingByEvent(eventKey: string): Promise<MatchScouting[]> {
    try {
      const { data, error } = await this.client
        .from('match_scouting')
        .select(`
          *,
          match_schedule!inner (
            event_key,
            match_key
          )
        `)
        .eq('match_schedule.event_key', eventKey)
        .order('match_id', { ascending: true })
        .order('team_number', { ascending: true });

      if (error) {
        throw new DatabaseOperationError('get match scouting by event', error);
      }

      return (data || []) as MatchScouting[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('get match scouting by event', error);
    }
  }

  /**
   * Get all match scouting entries for a specific match
   * Joins through match_schedule to find by match_key
   */
  async getMatchScoutingByMatch(matchKey: string): Promise<MatchScouting[]> {
    try {
      const { data, error } = await this.client
        .from('match_scouting')
        .select(`
          *,
          match_schedule!inner (
            match_key
          )
        `)
        .eq('match_schedule.match_key', matchKey)
        .order('team_number', { ascending: true });

      if (error) {
        throw new DatabaseOperationError('get match scouting by match', error);
      }

      return (data || []) as MatchScouting[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('get match scouting by match', error);
    }
  }

  /**
   * Get all pit scouting entries for an event
   */
  async getPitScoutingByEvent(eventKey: string): Promise<PitScouting[]> {
    try {
      const { data, error } = await this.client
        .from('pit_scouting')
        .select('*')
        .eq('event_key', eventKey)
        .order('team_number', { ascending: true });

      if (error) {
        throw new DatabaseOperationError('get pit scouting by event', error);
      }

      return (data || []) as PitScouting[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('get pit scouting by event', error);
    }
  }

  /**
   * Count match scouting entries for an event
   * Joins through match_schedule to filter by event_key
   */
  async countMatchScoutingByEvent(eventKey: string): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('match_scouting')
        .select('*, match_schedule!inner(event_key)', { count: 'exact', head: true })
        .eq('match_schedule.event_key', eventKey);

      if (error) {
        throw new DatabaseOperationError('count match scouting by event', error);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('count match scouting by event', error);
    }
  }

  /**
   * Count pit scouting entries for an event
   */
  async countPitScoutingByEvent(eventKey: string): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('pit_scouting')
        .select('*', { count: 'exact', head: true })
        .eq('event_key', eventKey);

      if (error) {
        throw new DatabaseOperationError('count pit scouting by event', error);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('count pit scouting by event', error);
    }
  }

  /**
   * Create a new pit scouting entry
   * @param data - Pit scouting data without id, created_at, updated_at
   * @returns Created pit scouting entry
   * @throws DatabaseOperationError if creation fails
   */
  async createPitScouting(data: Omit<PitScouting, 'id' | 'created_at' | 'updated_at'>): Promise<PitScouting> {
    try {
      const { data: result, error } = await this.client
        .from('pit_scouting')
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new DatabaseOperationError('create pit scouting', error);
      }

      if (!result) {
        throw new DatabaseOperationError('create pit scouting', new Error('No data returned'));
      }

      return result as PitScouting;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('create pit scouting', error);
    }
  }

  /**
   * Update an existing pit scouting entry
   * @param id - Pit scouting entry ID
   * @param data - Partial pit scouting data to update
   * @returns Updated pit scouting entry
   * @throws DatabaseOperationError if update fails or entry not found
   */
  async updatePitScouting(id: string, data: Partial<PitScouting>): Promise<PitScouting> {
    try {
      const { data: result, error } = await this.client
        .from('pit_scouting')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new DatabaseOperationError('update pit scouting', error);
      }

      if (!result) {
        throw new DatabaseOperationError('update pit scouting', new Error('Entry not found'));
      }

      return result as PitScouting;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('update pit scouting', error);
    }
  }

  /**
   * Delete a pit scouting entry
   * @param id - Pit scouting entry ID
   * @throws DatabaseOperationError if deletion fails
   */
  async deletePitScouting(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('pit_scouting')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DatabaseOperationError('delete pit scouting', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('delete pit scouting', error);
    }
  }

  /**
   * Find pit scouting entry by team number and event
   * @param teamNumber - Team number
   * @param eventKey - Event key
   * @returns Pit scouting entry or null if not found
   * @throws DatabaseOperationError if query fails
   */
  async findPitScoutingByTeamAndEvent(teamNumber: number, eventKey: string): Promise<PitScouting | null> {
    try {
      const { data, error } = await this.client
        .from('pit_scouting')
        .select('*')
        .eq('team_number', teamNumber)
        .eq('event_key', eventKey)
        .maybeSingle();

      if (error) {
        throw new DatabaseOperationError('find pit scouting by team and event', error);
      }

      return data as PitScouting | null;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find pit scouting by team and event', error);
    }
  }

  /**
   * Get pit scouting entry by ID
   * @param id - Pit scouting entry ID
   * @returns Pit scouting entry or null if not found
   * @throws DatabaseOperationError if query fails
   */
  async getPitScoutingById(id: string): Promise<PitScouting | null> {
    try {
      const { data, error } = await this.client
        .from('pit_scouting')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new DatabaseOperationError('get pit scouting by id', error);
      }

      return data as PitScouting | null;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('get pit scouting by id', error);
    }
  }
}

/**
 * Factory function for dependency injection
 */
export function createScoutingDataRepository(client?: SupabaseClient): IScoutingDataRepository {
  return new ScoutingDataRepository(client);
}
