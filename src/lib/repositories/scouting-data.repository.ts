/**
 * Repository for scouting data access
 * Provides read and write access to match and pit scouting data
 * Used for coverage statistics, reporting, and pit scouting management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type { MatchScouting, PitScouting, JSONBData } from '@/types';
import type {
  ScoutingListOptions,
  ScoutingEntryWithDetails,
  ScoutingListResult,
  PreviewMetrics,
  MatchScoutingData,
  MatchScoutingMetadata,
  TeamScoutingAggregates,
} from '@/types/admin';
import {
  calculateAutoPoints,
  calculateTeleopPoints,
  calculateEndgamePoints,
  type AutoPerformance2025,
  type TeleopPerformance2025,
  type EndgamePerformance2025,
} from '@/types/season-2025';
import {
  RepositoryError,
  DatabaseOperationError,
} from './base.repository';

/**
 * Type for database row with just team_number
 */
interface TeamNumberRow {
  team_number: number;
}

/**
 * Type for match scouting entry with JSONB performance data and joined tables
 */
interface MatchScoutingEntry {
  id?: string;
  match_key?: string;
  team_number?: number;
  scout_name?: string;
  auto_performance?: JSONBData;
  teleop_performance?: JSONBData;
  endgame_performance?: JSONBData;
  overall_performance?: JSONBData;
  scout_metadata?: JSONBData;
  event_key?: string;
  created_at?: string;
  updated_at?: string;
  teams?: {
    team_name?: string;
  };
  match_schedule?: {
    event_key?: string;
    comp_level?: string;
    match_number?: number;
    events?: {
      event_name?: string;
    };
  };
  [key: string]: unknown;
}

/**
 * Match schedule row type with alliance composition
 */
interface MatchScheduleRow {
  match_key: string;
  event_key: string;
  comp_level: string;
  match_number: number;
  red_1?: number;
  red_2?: number;
  red_3?: number;
  blue_1?: number;
  blue_2?: number;
  blue_3?: number;
}

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

  // List operations for admin
  listScoutingEntries(options: ScoutingListOptions): Promise<ScoutingListResult>;
  deleteMatchScouting(id: string): Promise<void>;

  // Statistics support
  findByTeam(teamNumber: number, eventKey?: string): Promise<MatchScouting[]>;
  getTeamsWithData(eventKey?: string): Promise<number[]>;
  getLatestScoutingTime(teamNumber: number, eventKey?: string): Promise<Date | null>;

  // Match scouting data display (SCOUT-36)
  getScoutingByMatchWithDetails(
    matchKey: string,
    options?: { eventKey?: string; teamNumber?: number; alliance?: 'red' | 'blue' }
  ): Promise<{ data: MatchScoutingData; metadata: MatchScoutingMetadata }>;

  // Team scouting data display (SCOUT-37)
  getScoutingByTeamWithDetails(
    teamNumber: number,
    eventKey: string,
    options?: {
      sortBy?: 'match_number' | 'created_at' | 'total_points';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      page?: number;
    }
  ): Promise<{
    data: ScoutingEntryWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      has_more: boolean;
    };
    aggregates: TeamScoutingAggregates;
  }>;

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
   * Query by joining through match_schedule via match_key FK
   */
  async getMatchScoutingByEvent(eventKey: string): Promise<MatchScouting[]> {
    try {
      const { data, error } = await this.client
        .from('match_scouting')
        .select(`
          *,
          match_schedule!match_scouting_match_key_fkey(event_key)
        `)
        .eq('match_schedule.event_key', eventKey)
        .order('match_key', { ascending: true })
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
   * Query directly by match_key
   */
  async getMatchScoutingByMatch(matchKey: string): Promise<MatchScouting[]> {
    try {
      const { data, error } = await this.client
        .from('match_scouting')
        .select('*')
        .eq('match_key', matchKey)
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
        .select('*, match_schedule!match_scouting_match_id_fkey!inner(event_key)', { count: 'exact', head: true })
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

  /**
   * Find all match scouting data for a team
   * @param teamNumber - Team number
   * @param eventKey - Optional event key to filter by
   * @returns Array of match scouting entries
   */
  async findByTeam(teamNumber: number, eventKey?: string): Promise<MatchScouting[]> {
    try {
      let query = this.client
        .from('match_scouting')
        .select('*')
        .eq('team_number', teamNumber);

      if (eventKey) {
        // Join through match_schedule to filter by event
        // Specify foreign key constraint to disambiguate (two FK relationships exist)
        query = this.client
          .from('match_scouting')
          .select(`
            *,
            match_schedule!match_scouting_match_id_fkey!inner (
              event_key
            )
          `)
          .eq('team_number', teamNumber)
          .eq('match_schedule.event_key', eventKey);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) {
        throw new DatabaseOperationError('find match scouting by team', error);
      }

      return (data || []) as MatchScouting[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find match scouting by team', error);
    }
  }

  /**
   * Get list of teams that have scouting data
   * @param eventKey - Optional event key to filter by
   * @returns Array of unique team numbers
   */
  async getTeamsWithData(eventKey?: string): Promise<number[]> {
    try {
      const { data, error } = eventKey
        ? await this.client
            .from('match_scouting')
            .select(`
              team_number,
              match_schedule!match_scouting_match_id_fkey!inner (
                event_key
              )
            `)
            .eq('match_schedule.event_key', eventKey)
        : await this.client
            .from('match_scouting')
            .select('team_number');

      if (error) {
        throw new DatabaseOperationError('get teams with data', error);
      }

      // Extract unique team numbers
      const teamNumbers = new Set<number>();
      (data || []).forEach((row: TeamNumberRow) => {
        if (row.team_number) {
          teamNumbers.add(row.team_number);
        }
      });

      return Array.from(teamNumbers).sort((a, b) => a - b);
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('get teams with data', error);
    }
  }

  /**
   * Get the latest scouting timestamp for a team
   * @param teamNumber - Team number
   * @param eventKey - Optional event key to filter by
   * @returns Latest scouting time or null if no data
   */
  async getLatestScoutingTime(teamNumber: number, eventKey?: string): Promise<Date | null> {
    try {
      const { data, error } = eventKey
        ? await this.client
            .from('match_scouting')
            .select(`
              updated_at,
              match_schedule!inner (
                event_key
              )
            `)
            .eq('team_number', teamNumber)
            .eq('match_schedule.event_key', eventKey)
            .order('updated_at', { ascending: false })
            .limit(1)
        : await this.client
            .from('match_scouting')
            .select('updated_at')
            .eq('team_number', teamNumber)
            .order('updated_at', { ascending: false })
            .limit(1);

      if (error) {
        throw new DatabaseOperationError('get latest scouting time', error);
      }

      if (!data || data.length === 0) {
        return null;
      }

      return new Date(data[0].updated_at);
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('get latest scouting time', error);
    }
  }

  /**
   * List match scouting entries with filters and pagination
   * @param options - Query options including filters, pagination, and sort
   * @returns Paginated list of scouting entries with details
   */
  async listScoutingEntries(options: ScoutingListOptions): Promise<ScoutingListResult> {
    const { page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    try {
      // Build query with joins to teams and events
      // Note: Uses match_key FK after migration 009 is applied
      let query = this.client
        .from('match_scouting')
        .select(`
          *,
          teams!match_scouting_team_number_fkey(team_name),
          match_schedule!match_scouting_match_key_fkey(
            event_key,
            comp_level,
            match_number,
            events!match_schedule_event_key_fkey(event_name)
          )
        `, { count: 'exact' });

      // Apply filters
      if (options.eventKey) {
        // Filter by event_key through the match_schedule join
        query = query.eq('match_schedule.event_key', options.eventKey);
      }
      if (options.teamNumber) {
        query = query.eq('team_number', options.teamNumber);
      }
      if (options.scoutName) {
        query = query.ilike('scout_name', `%${options.scoutName}%`);
      }
      if (options.matchKey) {
        query = query.eq('match_key', options.matchKey);
      }
      if (options.dateFrom) {
        query = query.gte('created_at', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('created_at', options.dateTo);
      }

      // Search (team number or scout name)
      if (options.search) {
        // If search is a number, search by team
        const searchNum = parseInt(options.search);
        if (!isNaN(searchNum)) {
          query = query.eq('team_number', searchNum);
        } else {
          // Otherwise search by scout name
          query = query.ilike('scout_name', `%${options.search}%`);
        }
      }

      // Apply sorting and pagination
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) {
        throw new DatabaseOperationError('list scouting entries', error);
      }

      // Calculate preview metrics and data quality for each entry
      const enrichedData = (data || []).map((entry: MatchScoutingEntry) => {
        const preview = this.calculatePreviewMetrics(entry);
        const quality = this.assessDataQuality(entry);

        return {
          ...entry,
          team_name: entry.teams?.team_name,
          event_name: entry.match_schedule?.events?.event_name,
          event_key: entry.event_key || entry.match_schedule?.event_key,
          match_number: entry.match_schedule?.match_number,
          comp_level: entry.match_schedule?.comp_level,
          preview_metrics: preview,
          data_quality: quality,
        } as ScoutingEntryWithDetails;
      });

      return {
        data: enrichedData,
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
        },
      };
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('list scouting entries', error);
    }
  }

  /**
   * Calculate preview metrics from JSONB performance data
   */
  private calculatePreviewMetrics(entry: MatchScoutingEntry): PreviewMetrics {
    let auto_points = 0;
    let teleop_points = 0;
    let endgame_points = 0;

    try {
      // Calculate auto points if data exists
      if (entry.auto_performance && typeof entry.auto_performance === 'object') {
        auto_points = calculateAutoPoints(entry.auto_performance as unknown as AutoPerformance2025);
      }

      // Calculate teleop points if data exists
      if (entry.teleop_performance && typeof entry.teleop_performance === 'object') {
        teleop_points = calculateTeleopPoints(entry.teleop_performance as unknown as TeleopPerformance2025);
      }

      // Calculate endgame points if data exists
      if (entry.endgame_performance && typeof entry.endgame_performance === 'object') {
        endgame_points = calculateEndgamePoints(entry.endgame_performance as unknown as EndgamePerformance2025);
      }
    } catch (error) {
      console.error('Error calculating preview metrics:', error);
    }

    return {
      auto_points,
      teleop_points,
      endgame_points,
      total_points: auto_points + teleop_points + endgame_points,
    };
  }

  /**
   * Assess data quality based on completeness and validity
   */
  private assessDataQuality(entry: MatchScoutingEntry): 'complete' | 'partial' | 'issues' {
    // Check if all required periods exist
    const hasAuto = entry.auto_performance && Object.keys(entry.auto_performance).length > 1;
    const hasTeleop = entry.teleop_performance && Object.keys(entry.teleop_performance).length > 1;
    const hasEndgame = entry.endgame_performance && Object.keys(entry.endgame_performance).length > 1;

    // All periods present with data
    if (hasAuto && hasTeleop && hasEndgame) {
      // Check for suspicious values (e.g., unrealistic scoring)
      const metrics = this.calculatePreviewMetrics(entry);

      // If total points are suspiciously high (>200) or 0, mark as issues
      if (metrics.total_points > 200 || metrics.total_points === 0) {
        return 'issues';
      }

      return 'complete';
    }

    // Some periods missing
    if (hasAuto || hasTeleop || hasEndgame) {
      return 'partial';
    }

    // No useful data
    return 'issues';
  }

  /**
   * Get scouting data for a specific match with details, grouped by alliance
   * @param matchKey - Match key
   * @param options - Optional filters for eventKey, teamNumber, or alliance
   * @returns Match scouting data grouped by alliance with metadata
   * @throws DatabaseOperationError if query fails
   */
  async getScoutingByMatchWithDetails(
    matchKey: string,
    options?: { eventKey?: string; teamNumber?: number; alliance?: 'red' | 'blue' }
  ): Promise<{ data: MatchScoutingData; metadata: MatchScoutingMetadata }> {
    try {
      // First, get the match schedule to determine alliance composition
      const { data: matchSchedule, error: scheduleError } = await this.client
        .from('match_schedule')
        .select('match_key, event_key, comp_level, match_number, red_1, red_2, red_3, blue_1, blue_2, blue_3')
        .eq('match_key', matchKey)
        .maybeSingle();

      if (scheduleError) {
        throw new DatabaseOperationError('get match schedule', scheduleError);
      }

      if (!matchSchedule) {
        // Return empty data if match not found
        return {
          data: {
            match_key: matchKey,
            red_alliance: [],
            blue_alliance: [],
            by_team: {},
          },
          metadata: {
            total_entries: 0,
            teams_scouted: 0,
            coverage_percentage: 0,
          },
        };
      }

      // Get all scouting entries for this match
      let query = this.client
        .from('match_scouting')
        .select(`
          *,
          teams!match_scouting_team_number_fkey(team_name),
          match_schedule!match_scouting_match_key_fkey(
            event_key,
            comp_level,
            match_number,
            events!match_schedule_event_key_fkey(event_name)
          )
        `)
        .eq('match_key', matchKey);

      // Apply optional filters
      if (options?.eventKey) {
        query = query.eq('match_schedule.event_key', options.eventKey);
      }
      if (options?.teamNumber) {
        query = query.eq('team_number', options.teamNumber);
      }

      const { data, error } = await query.order('team_number', { ascending: true });

      if (error) {
        throw new DatabaseOperationError('get scouting by match', error);
      }

      // Calculate preview metrics and enrich data
      const enrichedEntries = (data || []).map((entry: MatchScoutingEntry) => {
        const preview = this.calculatePreviewMetrics(entry);
        const quality = this.assessDataQuality(entry);

        return {
          ...entry,
          team_name: entry.teams?.team_name,
          event_name: entry.match_schedule?.events?.event_name,
          event_key: entry.event_key || entry.match_schedule?.event_key,
          match_number: entry.match_schedule?.match_number,
          comp_level: entry.match_schedule?.comp_level,
          preview_metrics: preview,
          data_quality: quality,
        } as ScoutingEntryWithDetails;
      });

      // Group by alliance using match schedule data
      const schedule = matchSchedule as MatchScheduleRow;
      const redTeams = [schedule.red_1, schedule.red_2, schedule.red_3].filter((t): t is number => t !== null && t !== undefined);
      const blueTeams = [schedule.blue_1, schedule.blue_2, schedule.blue_3].filter((t): t is number => t !== null && t !== undefined);

      const redAlliance = enrichedEntries.filter(entry => redTeams.includes(entry.team_number));
      const blueAlliance = enrichedEntries.filter(entry => blueTeams.includes(entry.team_number));

      // Filter by alliance if specified
      let finalRedAlliance = redAlliance;
      let finalBlueAlliance = blueAlliance;
      if (options?.alliance === 'red') {
        finalBlueAlliance = [];
      } else if (options?.alliance === 'blue') {
        finalRedAlliance = [];
      }

      // Create by_team map
      const byTeam: Record<number, ScoutingEntryWithDetails[]> = {};
      enrichedEntries.forEach(entry => {
        if (!byTeam[entry.team_number]) {
          byTeam[entry.team_number] = [];
        }
        byTeam[entry.team_number].push(entry);
      });

      // Calculate metadata
      const uniqueTeams = new Set(enrichedEntries.map(e => e.team_number));
      const totalTeamsInMatch = redTeams.length + blueTeams.length;
      const coverage = totalTeamsInMatch > 0 ? (uniqueTeams.size / totalTeamsInMatch) * 100 : 0;

      return {
        data: {
          match_key: matchKey,
          red_alliance: finalRedAlliance,
          blue_alliance: finalBlueAlliance,
          by_team: byTeam,
        },
        metadata: {
          total_entries: enrichedEntries.length,
          teams_scouted: uniqueTeams.size,
          coverage_percentage: Math.round(coverage * 10) / 10, // Round to 1 decimal place
        },
      };
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('get scouting by match with details', error);
    }
  }

  /**
   * Get scouting data for a specific team across all matches at an event
   * @param teamNumber - Team number
   * @param eventKey - Event key (required)
   * @param options - Optional sorting and pagination
   * @returns Team scouting data with pagination and aggregates
   * @throws DatabaseOperationError if query fails
   */
  async getScoutingByTeamWithDetails(
    teamNumber: number,
    eventKey: string,
    options?: {
      sortBy?: 'match_number' | 'created_at' | 'total_points';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      page?: number;
    }
  ): Promise<{
    data: ScoutingEntryWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      has_more: boolean;
    };
    aggregates: TeamScoutingAggregates;
  }> {
    const { sortBy = 'match_number', sortOrder = 'asc', limit = 50, page = 1 } = options || {};
    const offset = (page - 1) * limit;

    try {
      // Build query for scouting entries with count
      let dataQuery = this.client
        .from('match_scouting')
        .select(`
          *,
          teams!match_scouting_team_number_fkey(team_name),
          match_schedule!match_scouting_match_key_fkey!inner(
            event_key,
            comp_level,
            match_number,
            events!match_schedule_event_key_fkey(event_name)
          )
        `, { count: 'exact' })
        .eq('team_number', teamNumber)
        .eq('match_schedule.event_key', eventKey);

      // Apply sorting (only created_at can be sorted in database)
      // match_number and total_points will be sorted in-memory after enrichment
      if (sortBy === 'created_at') {
        dataQuery = dataQuery.order('created_at', { ascending: sortOrder === 'asc' });
      } else {
        // Default to created_at for database query, will sort in-memory later
        dataQuery = dataQuery.order('created_at', { ascending: true });
      }

      // Get paginated data
      const { data, error, count } = await dataQuery.range(offset, offset + limit - 1);

      if (error) {
        throw new DatabaseOperationError('get scouting by team', error);
      }

      const total = count || 0;

      // Calculate preview metrics and enrich data
      let enrichedEntries = (data || []).map((entry: MatchScoutingEntry) => {
        const preview = this.calculatePreviewMetrics(entry);
        const quality = this.assessDataQuality(entry);

        return {
          ...entry,
          team_name: entry.teams?.team_name,
          event_name: entry.match_schedule?.events?.event_name,
          event_key: entry.event_key || entry.match_schedule?.event_key,
          match_number: entry.match_schedule?.match_number,
          comp_level: entry.match_schedule?.comp_level,
          preview_metrics: preview,
          data_quality: quality,
        } as ScoutingEntryWithDetails;
      });

      // Sort in-memory for match_number and total_points
      if (sortBy === 'match_number') {
        enrichedEntries = enrichedEntries.sort((a, b) => {
          const diff = (a.match_number || 0) - (b.match_number || 0);
          return sortOrder === 'asc' ? diff : -diff;
        });
      } else if (sortBy === 'total_points') {
        enrichedEntries = enrichedEntries.sort((a, b) => {
          const diff = a.preview_metrics.total_points - b.preview_metrics.total_points;
          return sortOrder === 'asc' ? diff : -diff;
        });
      }

      // Calculate aggregates from all entries (not just paginated)
      const { data: allData, error: allError } = await this.client
        .from('match_scouting')
        .select(`
          *,
          match_schedule!match_scouting_match_key_fkey(event_key, match_number)
        `)
        .eq('team_number', teamNumber)
        .eq('match_schedule.event_key', eventKey);

      if (allError) {
        throw new DatabaseOperationError('get all team scouting for aggregates', allError);
      }

      // Calculate aggregates
      const allEntries = (allData || []).map((entry: MatchScoutingEntry) => {
        const preview = this.calculatePreviewMetrics(entry);
        const quality = this.assessDataQuality(entry);
        return { ...entry, preview_metrics: preview, data_quality: quality };
      });

      const uniqueMatches = new Set(allEntries.map(e => e.match_key));
      const completeEntries = allEntries.filter(e => e.data_quality === 'complete').length;

      const avgAutoPoints = allEntries.length > 0
        ? allEntries.reduce((sum, e) => sum + (e.preview_metrics?.auto_points || 0), 0) / allEntries.length
        : 0;

      const avgTeleopPoints = allEntries.length > 0
        ? allEntries.reduce((sum, e) => sum + (e.preview_metrics?.teleop_points || 0), 0) / allEntries.length
        : 0;

      const avgEndgamePoints = allEntries.length > 0
        ? allEntries.reduce((sum, e) => sum + (e.preview_metrics?.endgame_points || 0), 0) / allEntries.length
        : 0;

      const avgTotalPoints = allEntries.length > 0
        ? allEntries.reduce((sum, e) => sum + (e.preview_metrics?.total_points || 0), 0) / allEntries.length
        : 0;

      // Data quality distribution
      const qualityDistribution: Record<string, number> = {
        complete: 0,
        partial: 0,
        issues: 0,
      };

      allEntries.forEach(entry => {
        if (entry.data_quality) {
          qualityDistribution[entry.data_quality] = (qualityDistribution[entry.data_quality] || 0) + 1;
        }
      });

      return {
        data: enrichedEntries,
        pagination: {
          page,
          limit,
          total,
          has_more: total > offset + limit,
        },
        aggregates: {
          total_matches: uniqueMatches.size,
          avg_auto_points: Math.round(avgAutoPoints * 10) / 10,
          avg_teleop_points: Math.round(avgTeleopPoints * 10) / 10,
          avg_endgame_points: Math.round(avgEndgamePoints * 10) / 10,
          avg_total_points: Math.round(avgTotalPoints * 10) / 10,
          complete_entries: completeEntries,
          data_quality_distribution: qualityDistribution,
        },
      };
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('get scouting by team with details', error);
    }
  }

  /**
   * Delete a match scouting entry
   * @param id - Match scouting entry ID
   * @throws DatabaseOperationError if deletion fails
   */
  async deleteMatchScouting(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('match_scouting')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DatabaseOperationError('delete match scouting', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('delete match scouting', error);
    }
  }
}

/**
 * Factory function for dependency injection
 */
export function createScoutingDataRepository(client?: SupabaseClient): IScoutingDataRepository {
  return new ScoutingDataRepository(client);
}
