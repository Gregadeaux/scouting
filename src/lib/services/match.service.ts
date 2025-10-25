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
   * Get next scheduled match for an event
   */
  getNextMatch(eventKey: string): Promise<MatchSchedule | null>;

  /**
   * Get current/most recent match for an event
   */
  getCurrentMatch(eventKey: string): Promise<MatchSchedule | null>;
}

/**
 * Match Service Implementation
 */
export class MatchService implements IMatchService {
  constructor(
    private readonly matchRepo: IMatchRepository,
    private readonly teamRepo: ITeamRepository,
    private readonly scoutingDataRepo: IScoutingDataRepository
  ) {}

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
    winningAlliance?: 'red' | 'blue' | 'tie'
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
  private log(message: string, data?: any): void {
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
