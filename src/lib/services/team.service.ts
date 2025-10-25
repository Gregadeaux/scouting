/**
 * Team Service - Manages team data and analytics
 *
 * This service provides team information, statistics, and history.
 */

import type {
  Team,
  Event,
  MatchSchedule,
  MatchScouting,
  PitScouting,
} from '@/types';
import type { TBATeam } from '@/types/tba';
import type { ITBAApiService } from './tba-api.service';
import type { ITeamRepository } from '@/lib/repositories/team.repository';
import type { IEventRepository } from '@/lib/repositories/event.repository';
import type { IMatchRepository } from '@/lib/repositories/match.repository';
import type { IScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import type { TeamMergeStrategy } from '@/lib/strategies/merge-strategies';
import type {
  TeamDetail as TeamDetailMentor,
  TeamPhoto,
  TeamMatchSummary,
} from '@/types/team-detail';
import type { RobotCapabilities2025, AutonomousCapabilities2025 } from '@/types/season-2025';
import {
  calculateAutoPoints,
  calculateTeleopPoints,
  calculateEndgamePoints,
} from '@/types/season-2025';

/**
 * Detailed team information with history and analytics
 */
export interface TeamDetail extends Team {
  events: Event[]; // Events this team participated in
  match_history: MatchSchedule[]; // All matches for this team
  scouting_reports: {
    pit_scouting: PitScouting[];
    match_scouting: MatchScouting[];
  };
  statistics?: TeamStatistics;
}

/**
 * Team statistics across all events or for a specific event
 */
export interface TeamStatistics {
  total_matches: number;
  wins: number;
  losses: number;
  ties: number;
  win_percentage: number;

  // Scouting coverage
  matches_scouted: number;
  scouting_percentage: number;
  pit_scouting_count: number;

  // Performance averages (from scouting data)
  average_auto_points?: number;
  average_teleop_points?: number;
  average_endgame_points?: number;
  average_total_points?: number;

  // Qualitative ratings (1-5 scale)
  average_defense_rating?: number;
  average_driver_skill?: number;
  average_speed_rating?: number;

  // Reliability metrics
  disconnect_rate: number; // Percentage
  disabled_rate: number;
  tipped_rate: number;
  average_fouls: number;
  average_tech_fouls: number;
  yellow_card_count: number;
  red_card_count: number;

  // Confidence
  average_confidence_level: number;
}

/**
 * Team search result
 */
export interface TeamSearchResult {
  team_number: number;
  team_key: string;
  team_name: string;
  team_nickname?: string;
  rookie_year?: number;
  city?: string;
  state_province?: string;
  country?: string;
  events_count?: number; // Number of events in database
  latest_event?: string; // Most recent event key
}

/**
 * Team Service Interface
 */
export interface ITeamService {
  /**
   * Get all teams for an event
   */
  getTeamsByEvent(eventKey: string): Promise<Team[]>;

  /**
   * Get detailed team information
   */
  getTeamDetail(teamNumber: number, eventKey?: string): Promise<TeamDetail>;

  /**
   * Get simplified team detail for mentor view
   */
  getTeamDetailForMentor(teamNumber: number, eventKey: string): Promise<TeamDetailMentor>;

  /**
   * Get team statistics
   */
  getTeamStatistics(teamNumber: number, eventKey?: string): Promise<TeamStatistics>;

  /**
   * Update team information
   */
  updateTeam(teamNumber: number, updates: Partial<Team>): Promise<Team>;

  /**
   * Refresh team data from TBA
   */
  refreshTeamFromTBA(teamNumber: number): Promise<Team>;

  /**
   * Search teams by number, name, or location
   */
  searchTeams(query: string): Promise<TeamSearchResult[]>;

  /**
   * Get team's recent events
   */
  getTeamEvents(teamNumber: number, year?: number): Promise<Event[]>;
}

/**
 * Team Service Implementation
 */
export class TeamService implements ITeamService {
  constructor(
    private readonly tbaApi: ITBAApiService,
    private readonly teamRepo: ITeamRepository,
    private readonly eventRepo: IEventRepository,
    private readonly matchRepo: IMatchRepository,
    private readonly scoutingDataRepo: IScoutingDataRepository,
    private readonly teamMergeStrategy: TeamMergeStrategy
  ) {}

  /**
   * Get teams by event
   */
  async getTeamsByEvent(eventKey: string): Promise<Team[]> {
    return this.teamRepo.findByEventKey(eventKey);
  }

  /**
   * Get detailed team information
   */
  async getTeamDetail(teamNumber: number, eventKey?: string): Promise<TeamDetail> {
    // Get base team info
    const team = await this.teamRepo.findByTeamNumber(teamNumber);
    if (!team) {
      throw new Error(`Team ${teamNumber} not found`);
    }

    // Fetch related data in parallel
    const [events, allMatches, pitScouting, matchScouting] = await Promise.all([
      this.getTeamEvents(teamNumber, eventKey ? undefined : new Date().getFullYear()),
      eventKey
        ? this.matchRepo.findByEventKey(eventKey).then((matches) =>
            matches.filter((m) => this.isTeamInMatch(teamNumber, m))
          )
        : Promise.resolve([]), // TODO: Global team match history requires repository extension
      eventKey
        ? this.scoutingDataRepo.getPitScoutingByEvent(eventKey).then((all) =>
            all.filter((p) => p.team_number === teamNumber)
          )
        : Promise.resolve([]), // No global pit scouting query available
      eventKey
        ? this.scoutingDataRepo.getMatchScoutingByEvent(eventKey).then((all) =>
            all.filter((s) => s.team_number === teamNumber)
          )
        : Promise.resolve([]), // No global match scouting query available
    ]);

    // Calculate statistics
    const statistics = this.calculateStatistics(allMatches, matchScouting, pitScouting);

    return {
      ...team,
      events,
      match_history: allMatches,
      scouting_reports: {
        pit_scouting: pitScouting,
        match_scouting: matchScouting,
      },
      statistics,
    };
  }

  /**
   * Get simplified team detail for mentor view
   */
  async getTeamDetailForMentor(
    teamNumber: number,
    eventKey: string
  ): Promise<TeamDetailMentor> {
    // Get base team info
    const team = await this.teamRepo.findByTeamNumber(teamNumber);
    if (!team) {
      throw new Error(`Team ${teamNumber} not found`);
    }

    // Fetch event-specific data in parallel
    const [pitScoutingData, matchScoutingData] = await Promise.all([
      this.scoutingDataRepo
        .getPitScoutingByEvent(eventKey)
        .then((all) => all.filter((p) => p.team_number === teamNumber)),
      this.scoutingDataRepo
        .getMatchScoutingByEvent(eventKey)
        .then((all) => all.filter((s) => s.team_number === teamNumber)),
    ]);

    // Extract photos from pit scouting
    const photos = this.extractPhotosFromPitScouting(pitScoutingData);

    // Calculate match summary
    const matchSummary = this.calculateMatchSummary(matchScoutingData);

    // Get the latest pit scouting entry (if any)
    const latestPitScouting =
      pitScoutingData.length > 0
        ? (pitScoutingData[pitScoutingData.length - 1] as unknown as PitScouting<
            RobotCapabilities2025,
            AutonomousCapabilities2025
          >)
        : undefined;

    // Fetch the scout's name if pit scouting exists
    let scoutName: string | undefined;
    if (latestPitScouting && latestPitScouting.scouted_by) {
      scoutName = await this.getScoutName(latestPitScouting.scouted_by);
    }

    return {
      team,
      event_key: eventKey,
      pit_scouting: latestPitScouting,
      pit_scouting_by_name: scoutName,
      match_summary: matchSummary,
      photos,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Get team statistics
   */
  async getTeamStatistics(teamNumber: number, eventKey?: string): Promise<TeamStatistics> {
    // Get matches and scouting data
    const [allMatches, pitScouting, matchScouting] = await Promise.all([
      eventKey
        ? this.matchRepo.findByEventKey(eventKey).then((matches) =>
            matches.filter((m) => this.isTeamInMatch(teamNumber, m))
          )
        : Promise.resolve([]), // TODO: Global team match history requires repository extension
      eventKey
        ? this.scoutingDataRepo.getPitScoutingByEvent(eventKey).then((all) =>
            all.filter((p) => p.team_number === teamNumber)
          )
        : Promise.resolve([]), // No global pit scouting query available
      eventKey
        ? this.scoutingDataRepo.getMatchScoutingByEvent(eventKey).then((all) =>
            all.filter((s) => s.team_number === teamNumber)
          )
        : Promise.resolve([]), // No global match scouting query available
    ]);

    return this.calculateStatistics(allMatches, matchScouting, pitScouting);
  }

  /**
   * Update team information
   */
  async updateTeam(teamNumber: number, updates: Partial<Team>): Promise<Team> {
    const existing = await this.teamRepo.findByTeamNumber(teamNumber);
    if (!existing) {
      throw new Error(`Team ${teamNumber} not found`);
    }

    const updated = { ...existing, ...updates };
    await this.teamRepo.upsert(updated);

    this.log(`Updated team ${teamNumber}`, updates);
    return updated;
  }

  /**
   * Refresh team from TBA
   */
  async refreshTeamFromTBA(teamNumber: number): Promise<Team> {
    const teamKey = `frc${teamNumber}`;

    // Fetch from TBA
    const tbaTeam = await this.tbaApi.getTeam(teamKey);

    // Convert to our format
    const team = this.convertTBATeam(tbaTeam);

    // Merge with existing data
    const existing = await this.teamRepo.findByTeamNumber(teamNumber);
    const mergeResult = existing ? this.teamMergeStrategy.merge(existing, tbaTeam) : team;
    const merged = { ...team, ...mergeResult };

    // Save
    const saved = await this.teamRepo.upsert(merged);

    this.log(`Refreshed team ${teamNumber} from TBA`);
    return saved;
  }

  /**
   * Search teams
   */
  async searchTeams(query: string): Promise<TeamSearchResult[]> {
    // Try parsing as team number
    const teamNumber = parseInt(query, 10);
    if (!isNaN(teamNumber)) {
      const team = await this.teamRepo.findByTeamNumber(teamNumber);
      if (team) {
        return [await this.toSearchResult(team)];
      }
      return [];
    }

    // TODO: Text search requires repository extension
    // For now, return empty array for text queries
    this.log(`Text-based team search not yet supported: "${query}"`);
    return [];
  }

  /**
   * Get team's events
   */
  async getTeamEvents(teamNumber: number, year?: number): Promise<Event[]> {
    // TODO: Global team match history requires repository extension
    // For now, return empty array
    this.log(`Global team events lookup not yet supported for team ${teamNumber}`);
    return [];
  }

  /**
   * Check if team is in a match
   */
  private isTeamInMatch(teamNumber: number, match: MatchSchedule): boolean {
    return (
      match.red_1 === teamNumber ||
      match.red_2 === teamNumber ||
      match.red_3 === teamNumber ||
      match.blue_1 === teamNumber ||
      match.blue_2 === teamNumber ||
      match.blue_3 === teamNumber
    );
  }

  /**
   * Calculate team statistics
   */
  private calculateStatistics(
    matches: MatchSchedule[],
    matchScouting: MatchScouting[],
    pitScouting: PitScouting[]
  ): TeamStatistics {
    // Match record
    const playedMatches = matches.filter((m) => m.red_score != null);
    let wins = 0;
    let losses = 0;
    let ties = 0;

    for (const match of playedMatches) {
      if (match.winning_alliance === 'tie') {
        ties++;
      } else {
        const isRed = [match.red_1, match.red_2, match.red_3].some(
          (t) => t === matchScouting[0]?.team_number
        );
        const won =
          (isRed && match.winning_alliance === 'red') ||
          (!isRed && match.winning_alliance === 'blue');
        if (won) {
          wins++;
        } else {
          losses++;
        }
      }
    }

    const winPercentage = playedMatches.length > 0 ? (wins / playedMatches.length) * 100 : 0;

    // Scouting coverage
    const scoutingPercentage =
      playedMatches.length > 0 ? (matchScouting.length / playedMatches.length) * 100 : 0;

    // Reliability metrics
    const disconnectCount = matchScouting.filter((s) => s.robot_disconnected).length;
    const disabledCount = matchScouting.filter((s) => s.robot_disabled).length;
    const tippedCount = matchScouting.filter((s) => s.robot_tipped).length;

    const disconnectRate =
      matchScouting.length > 0 ? (disconnectCount / matchScouting.length) * 100 : 0;
    const disabledRate =
      matchScouting.length > 0 ? (disabledCount / matchScouting.length) * 100 : 0;
    const tippedRate =
      matchScouting.length > 0 ? (tippedCount / matchScouting.length) * 100 : 0;

    const totalFouls = matchScouting.reduce((sum, s) => sum + s.foul_count, 0);
    const totalTechFouls = matchScouting.reduce((sum, s) => sum + s.tech_foul_count, 0);
    const yellowCards = matchScouting.filter((s) => s.yellow_card).length;
    const redCards = matchScouting.filter((s) => s.red_card).length;

    const avgFouls = matchScouting.length > 0 ? totalFouls / matchScouting.length : 0;
    const avgTechFouls = matchScouting.length > 0 ? totalTechFouls / matchScouting.length : 0;

    // Qualitative ratings
    const defenseRatings = matchScouting.filter((s) => s.defense_rating != null);
    const driverRatings = matchScouting.filter((s) => s.driver_skill_rating != null);
    const speedRatings = matchScouting.filter((s) => s.speed_rating != null);
    const confidenceLevels = matchScouting.filter((s) => s.confidence_level != null);

    const avgDefense =
      defenseRatings.length > 0
        ? defenseRatings.reduce((sum, s) => sum + s.defense_rating!, 0) / defenseRatings.length
        : undefined;
    const avgDriver =
      driverRatings.length > 0
        ? driverRatings.reduce((sum, s) => sum + s.driver_skill_rating!, 0) / driverRatings.length
        : undefined;
    const avgSpeed =
      speedRatings.length > 0
        ? speedRatings.reduce((sum, s) => sum + s.speed_rating!, 0) / speedRatings.length
        : undefined;
    const avgConfidence =
      confidenceLevels.length > 0
        ? confidenceLevels.reduce((sum, s) => sum + s.confidence_level!, 0) / confidenceLevels.length
        : 0;

    return {
      total_matches: matches.length,
      wins,
      losses,
      ties,
      win_percentage: winPercentage,

      matches_scouted: matchScouting.length,
      scouting_percentage: scoutingPercentage,
      pit_scouting_count: pitScouting.length,

      disconnect_rate: disconnectRate,
      disabled_rate: disabledRate,
      tipped_rate: tippedRate,
      average_fouls: avgFouls,
      average_tech_fouls: avgTechFouls,
      yellow_card_count: yellowCards,
      red_card_count: redCards,

      average_defense_rating: avgDefense,
      average_driver_skill: avgDriver,
      average_speed_rating: avgSpeed,
      average_confidence_level: avgConfidence,
    };
  }

  /**
   * Convert team to search result
   */
  private async toSearchResult(team: Team): Promise<TeamSearchResult> {
    // Simplified version without global match lookup
    // TODO: Enhance when repository supports global team match queries
    return {
      team_number: team.team_number,
      team_key: team.team_key,
      team_name: team.team_name,
      team_nickname: team.team_nickname,
      rookie_year: team.rookie_year,
      city: team.city,
      state_province: team.state_province,
      country: team.country,
      events_count: undefined,
      latest_event: undefined,
    };
  }

  /**
   * Convert TBA Team to our format
   */
  private convertTBATeam(tbaTeam: TBATeam): Team {
    return {
      team_number: tbaTeam.team_number,
      team_key: tbaTeam.key,
      team_name: tbaTeam.name,
      team_nickname: tbaTeam.nickname ?? undefined,
      city: tbaTeam.city ?? undefined,
      state_province: tbaTeam.state_prov ?? undefined,
      country: tbaTeam.country ?? undefined,
      postal_code: tbaTeam.postal_code ?? undefined,
      rookie_year: tbaTeam.rookie_year ?? undefined,
      website: tbaTeam.website ?? undefined,
    };
  }

  /**
   * Extract photos from pit scouting data
   */
  private extractPhotosFromPitScouting(pitScoutingData: PitScouting[]): TeamPhoto[] {
    const photos: TeamPhoto[] = [];

    for (const pitData of pitScoutingData) {
      if (pitData.photo_urls && pitData.photo_urls.length > 0) {
        for (const url of pitData.photo_urls) {
          photos.push({
            id: `${pitData.id}_${url}`,
            url,
            caption: undefined,
            uploaded_at: pitData.scouted_at || pitData.created_at || new Date().toISOString(),
            uploaded_by: pitData.scouted_by,
          });
        }
      }
    }

    return photos;
  }

  /**
   * Calculate match summary from match scouting data
   */
  private calculateMatchSummary(matchScoutingData: MatchScouting[]): TeamMatchSummary | undefined {
    if (matchScoutingData.length === 0) {
      return undefined;
    }

    let totalAutoPoints = 0;
    let totalTeleopPoints = 0;
    let totalEndgamePoints = 0;
    let reliabilityCount = 0;

    for (const match of matchScoutingData) {
      // Calculate points using season-specific functions
      try {
        totalAutoPoints += calculateAutoPoints(match.auto_performance as AutoPerformance2025);
        totalTeleopPoints += calculateTeleopPoints(match.teleop_performance as TeleopPerformance2025);
        totalEndgamePoints += calculateEndgamePoints(match.endgame_performance as EndgamePerformance2025);

        // Calculate reliability (no disconnects, disables, or tips)
        if (!match.robot_disconnected && !match.robot_disabled && !match.robot_tipped) {
          reliabilityCount++;
        }
      } catch (error) {
        // If calculation fails, skip this match
        this.log(`Error calculating points for match ${match.id}:`, error);
      }
    }

    const matchCount = matchScoutingData.length;
    const avgAutoPoints = totalAutoPoints / matchCount;
    const avgTeleopPoints = totalTeleopPoints / matchCount;
    const avgEndgamePoints = totalEndgamePoints / matchCount;
    const avgTotalPoints = avgAutoPoints + avgTeleopPoints + avgEndgamePoints;
    const reliabilityScore = (reliabilityCount / matchCount) * 100;

    return {
      matches_played: matchCount,
      avg_auto_points: Math.round(avgAutoPoints * 10) / 10,
      avg_teleop_points: Math.round(avgTeleopPoints * 10) / 10,
      avg_endgame_points: Math.round(avgEndgamePoints * 10) / 10,
      avg_total_points: Math.round(avgTotalPoints * 10) / 10,
      reliability_score: Math.round(reliabilityScore * 10) / 10,
    };
  }

  /**
   * Get scout name from user profile
   */
  private async getScoutName(userId: string): Promise<string | undefined> {
    try {
      // Access the Supabase client through the repository
      // Since we can't directly access the private client, we'll create a new service client
      const { createServiceClient } = await import('@/lib/supabase/server');
      const supabase = createServiceClient();

      const { data: scoutProfile } = await supabase
        .from('user_profiles')
        .select('full_name, display_name, email')
        .eq('id', userId)
        .single();

      if (scoutProfile) {
        return scoutProfile.display_name || scoutProfile.full_name || scoutProfile.email;
      }
    } catch (error) {
      this.log(`Error fetching scout name for user ${userId}:`, error);
    }
    return undefined;
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: unknown): void {
    console.log(`[TeamService] ${message}`, data || '');
  }
}

/**
 * Factory function to create Team Service
 */
export function createTeamService(
  tbaApi: ITBAApiService,
  teamRepo: ITeamRepository,
  eventRepo: IEventRepository,
  matchRepo: IMatchRepository,
  scoutingDataRepo: IScoutingDataRepository,
  teamMergeStrategy: TeamMergeStrategy
): ITeamService {
  return new TeamService(
    tbaApi,
    teamRepo,
    eventRepo,
    matchRepo,
    scoutingDataRepo,
    teamMergeStrategy
  );
}
