/**
 * Match Service - Handles match scheduling and scouting assignments
 *
 * This service manages match data, scouting assignments, and score updates.
 */

import type {
  MatchSchedule,
  Team,
  MatchScouting,
} from '@/types';
import type { MatchWithScoutingStatus } from '@/types/event-detail';
import type { MatchListOptions, MatchWithDetails, MatchListResult } from '@/types/admin';
import type { IMatchRepository } from '@/lib/repositories/match.repository';
import type { ITeamRepository } from '@/lib/repositories/team.repository';
import type { IScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';

/**
 * Filter options for matches
 */
export interface MatchFilters {
  compLevel?: string | string[];
  showScoutedOnly?: boolean;
  showUnscoutedOnly?: boolean;
  teamNumber?: number; // Filter matches involving a specific team
  hasScores?: boolean; // Only show matches with scores
  scheduledAfter?: string; // ISO timestamp
  scheduledBefore?: string;
}

/**
 * Scout assignment for a match
 */
export interface ScoutAssignment {
  teamNumber: number;
  scoutName: string;
  allianceColor: 'red' | 'blue';
  position: 1 | 2 | 3;
}

/**
 * Match detail with full team information and scouting data
 */
export interface MatchDetail extends MatchWithScoutingStatus {
  teams_detail: {
    red_1?: Team;
    red_2?: Team;
    red_3?: Team;
    blue_1?: Team;
    blue_2?: Team;
    blue_3?: Team;
  };
  scouting_data: MatchScouting[];
}

/**
 * Match Service Interface
 */
export interface IMatchService {
  /**
   * Get matches for an event with optional filters
   */
  getMatchesForEvent(eventKey: string, filters?: MatchFilters): Promise<MatchWithScoutingStatus[]>;

  /**
   * Get detailed information about a specific match
   */
  getMatchDetail(matchKey: string): Promise<MatchDetail>;

  /**
   * Update match scores (from TBA or manual entry)
   */
  updateMatchScores(
    matchKey: string,
    redScore: number,
    blueScore: number,
    winningAlliance?: 'red' | 'blue' | 'tie'
  ): Promise<MatchSchedule>;

  /**
   * Get all matches for a specific team
   */
  getTeamMatches(teamNumber: number, eventKey?: string): Promise<MatchSchedule[]>;

  /**
   * Get recent matches for a team (most recent first)
   * Used to show team's recent performance in match detail view
   */
  getTeamRecentMatches(teamNumber: number, limit?: number): Promise<MatchSchedule[]>;

  /**
   * Get next scheduled match for an event
   */
  getNextMatch(eventKey: string): Promise<MatchSchedule | null>;

  /**
   * Get current/most recent match for an event
   */
  getCurrentMatch(eventKey: string): Promise<MatchSchedule | null>;

  /**
   * List matches with filtering, sorting, and pagination
   * Used for the admin matches list page
   */
  listMatches(options: MatchListOptions): Promise<MatchListResult>;
}

/**
 * Match Service Implementation
 */
export class MatchService implements IMatchService {
  constructor(
    private readonly matchRepo: IMatchRepository,
    private readonly teamRepo: ITeamRepository,
    private readonly scoutingDataRepo: IScoutingDataRepository
  ) { }

  /**
   * Get matches with filters
   */
  async getMatchesForEvent(
    eventKey: string,
    filters?: MatchFilters
  ): Promise<MatchWithScoutingStatus[]> {
    // Fetch all matches for event
    let matches = await this.matchRepo.findByEventKey(eventKey);

    // Apply filters
    if (filters) {
      matches = await this.applyFilters(matches, filters);
    }

    // Add scouting status to each match
    const matchesWithStatus = await Promise.all(
      matches.map(async (match) => {
        const scoutingStatus = await this.getMatchScoutingStatus(match);
        const scoutingDataForMatch = await this.scoutingDataRepo.getMatchScoutingByMatch(match.match_key);
        const scoutCount = scoutingDataForMatch.length;

        return {
          ...match,
          scouting_status: scoutingStatus,
          scout_count: scoutCount,
          consolidation_available: scoutCount > 1,
        };
      })
    );

    return matchesWithStatus;
  }

  /**
   * Get detailed match information
   */
  async getMatchDetail(matchKey: string): Promise<MatchDetail> {
    const match = await this.matchRepo.findByMatchKey(matchKey);
    if (!match) {
      throw new Error(`Match ${matchKey} not found`);
    }

    // Fetch all team details in parallel
    const [red1, red2, red3, blue1, blue2, blue3, scoutingData] = await Promise.all([
      match.red_1 ? this.teamRepo.findByTeamNumber(match.red_1) : Promise.resolve(undefined),
      match.red_2 ? this.teamRepo.findByTeamNumber(match.red_2) : Promise.resolve(undefined),
      match.red_3 ? this.teamRepo.findByTeamNumber(match.red_3) : Promise.resolve(undefined),
      match.blue_1 ? this.teamRepo.findByTeamNumber(match.blue_1) : Promise.resolve(undefined),
      match.blue_2 ? this.teamRepo.findByTeamNumber(match.blue_2) : Promise.resolve(undefined),
      match.blue_3 ? this.teamRepo.findByTeamNumber(match.blue_3) : Promise.resolve(undefined),
      this.scoutingDataRepo.getMatchScoutingByMatch(match.match_key),
    ]);

    const scoutCount = scoutingData.length;

    // Get scouting status
    const scoutingStatus = await this.getMatchScoutingStatus(match);

    return {
      ...match,
      scouting_status: scoutingStatus,
      scout_count: scoutCount,
      consolidation_available: scoutCount > 1,
      teams_detail: {
        red_1: red1 || undefined,
        red_2: red2 || undefined,
        red_3: red3 || undefined,
        blue_1: blue1 || undefined,
        blue_2: blue2 || undefined,
        blue_3: blue3 || undefined,
      },
      scouting_data: scoutingData,
    };
  }

  /**
   * Update match scores
   */
  async updateMatchScores(
    matchKey: string,
    redScore: number,
    blueScore: number,
    _winningAlliance?: 'red' | 'blue' | 'tie'
  ): Promise<MatchSchedule> {
    // Repository calculates winning alliance automatically
    await this.matchRepo.updateScores(matchKey, redScore, blueScore);
    this.log(`Updated scores for match ${matchKey}`, { redScore, blueScore });

    // Fetch and return updated match
    const updated = await this.matchRepo.findByMatchKey(matchKey);
    if (!updated) {
      throw new Error(`Match ${matchKey} not found after update`);
    }

    return updated;
  }

  /**
   * Get all matches for a team
   */
  async getTeamMatches(teamNumber: number, eventKey?: string): Promise<MatchSchedule[]> {
    if (eventKey) {
      // Get matches for specific event
      const allMatches = await this.matchRepo.findByEventKey(eventKey);
      return allMatches.filter(
        (m) =>
          m.red_1 === teamNumber ||
          m.red_2 === teamNumber ||
          m.red_3 === teamNumber ||
          m.blue_1 === teamNumber ||
          m.blue_2 === teamNumber ||
          m.blue_3 === teamNumber
      );
    } else {
      // TODO: Global team match history requires repository extension
      // For now, return empty array when no event context
      this.log(`Global team match history not yet supported for team ${teamNumber}`);
      return [];
    }
  }

  /**
   * Get next scheduled match
   */
  async getNextMatch(eventKey: string): Promise<MatchSchedule | null> {
    const matches = await this.matchRepo.findByEventKey(eventKey);

    // Filter to unplayed matches with scheduled times
    const upcomingMatches = matches
      .filter((m) => !m.actual_time && m.red_score == null && m.scheduled_time)
      .sort((a, b) => {
        const timeA = new Date(a.scheduled_time!).getTime();
        const timeB = new Date(b.scheduled_time!).getTime();
        return timeA - timeB;
      });

    return upcomingMatches[0] || null;
  }

  /**
   * Get current or most recent match
   */
  async getCurrentMatch(eventKey: string): Promise<MatchSchedule | null> {
    const matches = await this.matchRepo.findByEventKey(eventKey);

    // Get played matches sorted by time (most recent first)
    const playedMatches = matches
      .filter((m) => m.actual_time || m.red_score != null)
      .sort((a, b) => {
        const timeA = new Date(a.actual_time || a.scheduled_time || 0).getTime();
        const timeB = new Date(b.actual_time || b.scheduled_time || 0).getTime();
        return timeB - timeA; // Descending order
      });

    // Check if the most recent match was very recent (within last 15 minutes)
    const mostRecent = playedMatches[0];
    if (mostRecent) {
      const matchTime = new Date(mostRecent.actual_time || mostRecent.scheduled_time || 0);
      const now = new Date();
      const minutesAgo = (now.getTime() - matchTime.getTime()) / 1000 / 60;

      if (minutesAgo <= 15) {
        return mostRecent;
      }
    }

    // Otherwise, check if there's a match happening now
    const now = new Date();
    const currentMatch = matches.find((m) => {
      if (!m.scheduled_time) return false;
      const scheduledTime = new Date(m.scheduled_time);
      const diff = (now.getTime() - scheduledTime.getTime()) / 1000 / 60;
      // Match is considered "current" if it started within the last 10 minutes
      // and hasn't been marked as completed
      return diff >= 0 && diff <= 10 && !m.actual_time && m.red_score == null;
    });

    return currentMatch || mostRecent || null;
  }

  /**
   * Get recent matches for a team (most recent first)
   * Used to show team's recent performance in match detail view
   */
  async getTeamRecentMatches(teamNumber: number, limit: number = 5): Promise<MatchSchedule[]> {
    // We need to query the database directly since we need to search across all events
    // Note: This requires using the Supabase client directly as the repository
    // doesn't have a findByTeamNumber method yet
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = createServiceClient();

    // Query matches where the team appears in any alliance position
    const { data, error } = await supabase
      .from('match_schedule')
      .select('*')
      .or(
        `red_1.eq.${teamNumber},red_2.eq.${teamNumber},red_3.eq.${teamNumber},` +
        `blue_1.eq.${teamNumber},blue_2.eq.${teamNumber},blue_3.eq.${teamNumber}`
      )
      .not('actual_time', 'is', null) // Only matches that have been played
      .order('actual_time', { ascending: false }) // Most recent first
      .limit(limit);

    if (error) {
      this.log(`Error fetching recent matches for team ${teamNumber}`, error);
      throw new Error(`Failed to fetch recent matches for team ${teamNumber}`);
    }

    // If no matches with actual_time, fall back to scheduled_time
    if (!data || data.length === 0) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('match_schedule')
        .select('*')
        .or(
          `red_1.eq.${teamNumber},red_2.eq.${teamNumber},red_3.eq.${teamNumber},` +
          `blue_1.eq.${teamNumber},blue_2.eq.${teamNumber},blue_3.eq.${teamNumber}`
        )
        .not('red_score', 'is', null) // Only matches with scores
        .order('scheduled_time', { ascending: false }) // Most recent first
        .limit(limit);

      if (fallbackError) {
        this.log(`Error fetching fallback matches for team ${teamNumber}`, fallbackError);
        return [];
      }

      return (fallbackData || []) as MatchSchedule[];
    }

    return (data || []) as MatchSchedule[];
  }

  /**
   * List matches with filtering, sorting, and pagination
   */
  async listMatches(options: MatchListOptions): Promise<MatchListResult> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = createServiceClient();

    const limit = options.limit || 50;
    const offset = ((options.page || 1) - 1) * limit;
    const sortBy = options.sortBy || 'match_number';
    const sortOrder = options.sortOrder || 'asc';

    // Build query
    let query = supabase
      .from('match_schedule')
      .select(`
        *,
        events!inner(event_name)
      `, { count: 'exact' });

    // Apply search filter
    if (options.search) {
      query = query.ilike('match_key', `%${options.search}%`);
    }

    // Apply event filter
    if (options.eventKey) {
      query = query.eq('event_key', options.eventKey);
    }

    // Apply comp level filter
    if (options.compLevel && options.compLevel !== 'all') {
      query = query.eq('comp_level', options.compLevel);
    }

    // Apply team number filter
    if (options.teamNumber) {
      query = query.or(
        `red_1.eq.${options.teamNumber},red_2.eq.${options.teamNumber},red_3.eq.${options.teamNumber},` +
        `blue_1.eq.${options.teamNumber},blue_2.eq.${options.teamNumber},blue_3.eq.${options.teamNumber}`
      );
    }

    // Apply date range filters
    if (options.dateFrom) {
      query = query.gte('scheduled_time', options.dateFrom);
    }

    if (options.dateTo) {
      query = query.lte('scheduled_time', options.dateTo);
    }

    // Apply sorting
    if (sortBy === 'event_name') {
      query = query.order('event_name', { ascending: sortOrder === 'asc', foreignTable: 'events' });
    } else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: matches, error, count } = await query;

    if (error) {
      this.log(`Error fetching matches list`, error);
      throw new Error('Failed to fetch matches');
    }

    // Get scouting coverage for all matches
    const matchKeys = (matches || []).map(m => m.match_key);
    const scoutingCoverage = await this.getScoutingCoverageForMatches(matchKeys);

    // Transform matches with details
    const matchesWithDetails: MatchWithDetails[] = (matches || []).map(match => {
      const coverage = scoutingCoverage[match.match_key];
      const scoutedTeams = coverage?.scouted_positions || 0;
      const totalTeams = coverage?.total_positions || 6; // Always 6 teams per match
      const percentage = Math.round((scoutedTeams / totalTeams) * 100);

      // Apply scouting status filter after calculation
      const status = scoutedTeams === 6 ? 'complete' : scoutedTeams > 0 ? 'partial' : 'none';

      return {
        match_key: match.match_key,
        event_key: match.event_key,
        event_name: match.events?.event_name,
        comp_level: match.comp_level,
        set_number: match.set_number,
        match_number: match.match_number,
        red_1: match.red_1,
        red_2: match.red_2,
        red_3: match.red_3,
        blue_1: match.blue_1,
        blue_2: match.blue_2,
        blue_3: match.blue_3,
        red_score: match.red_score,
        blue_score: match.blue_score,
        winning_alliance: match.winning_alliance,
        scheduled_time: match.scheduled_time,
        actual_time: match.actual_time,
        created_at: match.created_at,
        updated_at: match.updated_at,
        scouting_coverage: {
          scouted_teams: scoutedTeams,
          total_teams: totalTeams,
          percentage,
          status,
        },
      };
    });

    // Filter by scouting status if specified
    let filteredMatches = matchesWithDetails;
    if (options.scoutingStatus && options.scoutingStatus !== 'all') {
      filteredMatches = matchesWithDetails.filter(m => m.scouting_coverage.status === options.scoutingStatus);
    }

    return {
      data: filteredMatches,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    };
  }

  /**
   * Get scouting coverage for multiple matches
   */
  private async getScoutingCoverageForMatches(matchKeys: string[]): Promise<Record<string, { total_positions: number; scouted_positions: number; positions: { red_1: boolean; red_2: boolean; red_3: boolean; blue_1: boolean; blue_2: boolean; blue_3: boolean } }>> {
    if (matchKeys.length === 0) return {};

    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = createServiceClient();

    const { data: scoutingData, error } = await supabase
      .from('match_scouting')
      .select('match_key, team_number, alliance_color')
      .in('match_key', matchKeys);

    if (error) {
      this.log('Error fetching scouting coverage', error);
      return {};
    }

    // Get match details to know team positions
    const { data: matches, error: matchError } = await supabase
      .from('match_schedule')
      .select('match_key, red_1, red_2, red_3, blue_1, blue_2, blue_3')
      .in('match_key', matchKeys);

    if (matchError) {
      this.log('Error fetching match details', matchError);
      return {};
    }

    const coverage: Record<string, { total_positions: number; scouted_positions: number; positions: { red_1: boolean; red_2: boolean; red_3: boolean; blue_1: boolean; blue_2: boolean; blue_3: boolean } }> = {};

    for (const match of (matches || [])) {
      const matchScouting = (scoutingData || []).filter(s => s.match_key === match.match_key);

      const positions = {
        red_1: false,
        red_2: false,
        red_3: false,
        blue_1: false,
        blue_2: false,
        blue_3: false,
      };

      for (const scout of matchScouting) {
        if (scout.alliance_color === 'red') {
          if (scout.team_number === match.red_1) positions.red_1 = true;
          if (scout.team_number === match.red_2) positions.red_2 = true;
          if (scout.team_number === match.red_3) positions.red_3 = true;
        } else if (scout.alliance_color === 'blue') {
          if (scout.team_number === match.blue_1) positions.blue_1 = true;
          if (scout.team_number === match.blue_2) positions.blue_2 = true;
          if (scout.team_number === match.blue_3) positions.blue_3 = true;
        }
      }

      const scoutedCount = Object.values(positions).filter(v => v).length;

      coverage[match.match_key] = {
        total_positions: 6,
        scouted_positions: scoutedCount,
        positions,
      };
    }

    return coverage;
  }

  /**
   * Apply filters to matches
   */
  private async applyFilters(
    matches: MatchSchedule[],
    filters: MatchFilters
  ): Promise<MatchSchedule[]> {
    let filtered = matches;

    // Filter by competition level
    if (filters.compLevel) {
      const levels = Array.isArray(filters.compLevel) ? filters.compLevel : [filters.compLevel];
      filtered = filtered.filter((m) => levels.includes(m.comp_level));
    }

    // Filter by team
    if (filters.teamNumber) {
      filtered = filtered.filter(
        (m) =>
          m.red_1 === filters.teamNumber ||
          m.red_2 === filters.teamNumber ||
          m.red_3 === filters.teamNumber ||
          m.blue_1 === filters.teamNumber ||
          m.blue_2 === filters.teamNumber ||
          m.blue_3 === filters.teamNumber
      );
    }

    // Filter by score presence
    if (filters.hasScores !== undefined) {
      if (filters.hasScores) {
        filtered = filtered.filter((m) => m.red_score != null && m.blue_score != null);
      } else {
        filtered = filtered.filter((m) => m.red_score == null && m.blue_score == null);
      }
    }

    // Filter by scheduled time
    if (filters.scheduledAfter) {
      const afterTime = new Date(filters.scheduledAfter).getTime();
      filtered = filtered.filter((m) => {
        if (!m.scheduled_time) return false;
        return new Date(m.scheduled_time).getTime() >= afterTime;
      });
    }

    if (filters.scheduledBefore) {
      const beforeTime = new Date(filters.scheduledBefore).getTime();
      filtered = filtered.filter((m) => {
        if (!m.scheduled_time) return false;
        return new Date(m.scheduled_time).getTime() <= beforeTime;
      });
    }

    // Filter by scouting status
    if (filters.showScoutedOnly || filters.showUnscoutedOnly) {
      // Need to check scouting data for each match
      const scoutingStatusPromises = filtered.map(async (m) => {
        const scoutingData = await this.scoutingDataRepo.getMatchScoutingByMatch(m.match_key);
        return { match: m, hasScouting: scoutingData.length > 0 };
      });

      const matchesWithScoutingStatus = await Promise.all(scoutingStatusPromises);

      if (filters.showScoutedOnly) {
        filtered = matchesWithScoutingStatus.filter((m) => m.hasScouting).map((m) => m.match);
      }

      if (filters.showUnscoutedOnly) {
        filtered = matchesWithScoutingStatus.filter((m) => !m.hasScouting).map((m) => m.match);
      }
    }

    return filtered;
  }

  /**
   * Get scouting status for a match
   */
  private async getMatchScoutingStatus(match: MatchSchedule): Promise<
    MatchWithScoutingStatus['scouting_status']
  > {
    const status = {
      red_1: false,
      red_2: false,
      red_3: false,
      blue_1: false,
      blue_2: false,
      blue_3: false,
    };

    // Get all scouting data for this match
    const scoutingData = await this.scoutingDataRepo.getMatchScoutingByMatch(match.match_key);

    // Mark positions as scouted
    for (const data of scoutingData) {
      if (data.alliance_color === 'red') {
        if (data.team_number === match.red_1) status.red_1 = true;
        if (data.team_number === match.red_2) status.red_2 = true;
        if (data.team_number === match.red_3) status.red_3 = true;
      } else if (data.alliance_color === 'blue') {
        if (data.team_number === match.blue_1) status.blue_1 = true;
        if (data.team_number === match.blue_2) status.blue_2 = true;
        if (data.team_number === match.blue_3) status.blue_3 = true;
      }
    }

    return status;
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: unknown): void {
    console.log(`[MatchService] ${message}`, data || '');
  }
}

/**
 * Factory function to create Match Service
 */
export function createMatchService(
  matchRepo: IMatchRepository,
  teamRepo: ITeamRepository,
  scoutingDataRepo: IScoutingDataRepository
): IMatchService {
  return new MatchService(matchRepo, teamRepo, scoutingDataRepo);
}
