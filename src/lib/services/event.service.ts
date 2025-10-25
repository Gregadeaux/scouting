/**
 * Event Service - Provides event detail data for UI
 *
 * This service aggregates data from multiple repositories to provide
 * comprehensive event information including teams, matches, and scouting coverage.
 */

import type {
  Event,
  Team,
  MatchSchedule,
} from '@/types';
import type {
  EventDetail,
  EventInfo,
  MatchWithScoutingStatus,
  ScoutingCoverageStats,
  TeamEventSummary,
  DataFreshness,
} from '@/types/event-detail';
import type { TBAEvent } from '@/types/tba';
import type { ITBAApiService } from './tba-api.service';
import type { IEventRepository } from '@/lib/repositories/event.repository';
import type { ITeamRepository } from '@/lib/repositories/team.repository';
import type { IMatchRepository } from '@/lib/repositories/match.repository';
import type { IScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import type { IImportJobRepository } from '@/lib/repositories/import-job.repository';
import type { EventMergeStrategy } from '@/lib/strategies/merge-strategies';

/**
 * Event Service Interface
 */
export interface IEventService {
  /**
   * Get complete event details with teams, matches, and coverage stats
   */
  getEventDetail(eventKey: string): Promise<EventDetail>;

  /**
   * Get scouting coverage statistics for an event
   */
  getEventCoverageStats(eventKey: string): Promise<ScoutingCoverageStats>;

  /**
   * Get team performance summaries for an event
   */
  getTeamSummaries(eventKey: string): Promise<TeamEventSummary[]>;

  /**
   * Get data freshness information
   */
  getDataFreshness(eventKey: string): Promise<DataFreshness>;

  /**
   * Refresh event data from TBA
   */
  refreshEventFromTBA(eventKey: string): Promise<Event>;

  /**
   * Get all events for a year
   */
  getEventsByYear(year: number): Promise<Event[]>;

  /**
   * Import and create an event from The Blue Alliance
   * Fetches event details from TBA and creates it in the database
   */
  importEventFromTBA(eventKey: string): Promise<Event>;
}

/**
 * Event Service Implementation
 */
export class EventService implements IEventService {
  constructor(
    private readonly tbaApi: ITBAApiService,
    private readonly eventRepo: IEventRepository,
    private readonly teamRepo: ITeamRepository,
    private readonly matchRepo: IMatchRepository,
    private readonly scoutingDataRepo: IScoutingDataRepository,
    private readonly importJobRepo: IImportJobRepository,
    private readonly eventMergeStrategy: EventMergeStrategy
  ) {}

  /**
   * Get complete event detail
   */
  async getEventDetail(eventKey: string): Promise<EventDetail> {
    // Fetch all data in parallel for performance
    const [event, teams, matches, coverage] = await Promise.all([
      this.getEventInfo(eventKey),
      this.teamRepo.findByEventKey(eventKey),
      this.getMatchesWithScoutingStatus(eventKey),
      this.getEventCoverageStats(eventKey),
    ]);

    return {
      event,
      teams,
      matches,
      coverage,
    };
  }

  /**
   * Get event info with computed fields
   */
  private async getEventInfo(eventKey: string): Promise<EventInfo> {
    const event = await this.eventRepo.findByEventKey(eventKey);
    if (!event) {
      throw new Error(`Event ${eventKey} not found`);
    }

    // Get counts
    const [teams, matches] = await Promise.all([
      this.teamRepo.findByEventKey(eventKey),
      this.matchRepo.findByEventKey(eventKey),
    ]);

    // Determine if event is currently active
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const isActive = now >= startDate && now <= endDate;

    // Find current and next match
    const sortedMatches = matches
      .filter((m) => m.scheduled_time)
      .sort((a, b) => new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime());

    let currentMatch: string | undefined;
    let nextMatch: string | undefined;

    if (isActive) {
      const playedMatches = sortedMatches.filter((m) => m.actual_time || m.red_score != null);
      const upcomingMatches = sortedMatches.filter((m) => !m.actual_time && m.red_score == null);

      if (playedMatches.length > 0) {
        currentMatch = playedMatches[playedMatches.length - 1].match_key;
      }
      if (upcomingMatches.length > 0) {
        nextMatch = upcomingMatches[0].match_key;
      }
    }

    return {
      ...event,
      total_teams: teams.length,
      total_matches: matches.length,
      current_match: currentMatch,
      next_match: nextMatch,
      is_active: isActive,
      tba_last_modified: event.updated_at,
    };
  }

  /**
   * Get matches with scouting status overlay
   */
  private async getMatchesWithScoutingStatus(
    eventKey: string
  ): Promise<MatchWithScoutingStatus[]> {
    const matches = await this.matchRepo.findByEventKey(eventKey);

    // Get scouting status for all matches
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
   * Get scouting status for a single match
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
   * Get scouting coverage statistics
   */
  async getEventCoverageStats(eventKey: string): Promise<ScoutingCoverageStats> {
    // Fetch all necessary data in parallel
    const [matches, allScoutingData, teams, pitScoutingData] = await Promise.all([
      this.matchRepo.findByEventKey(eventKey),
      this.scoutingDataRepo.getMatchScoutingByEvent(eventKey),
      this.teamRepo.findByEventKey(eventKey),
      this.scoutingDataRepo.getPitScoutingByEvent(eventKey),
    ]);

    // Calculate match coverage
    const matchesPlayed = matches.filter((m) => m.red_score != null || m.actual_time != null).length;
    const matchesScouted = new Set(allScoutingData.map((d) => d.match_id)).size;

    // Count fully scouted matches (all 6 robots scouted)
    const matchScoutCounts = new Map<number, Set<number>>();
    for (const data of allScoutingData) {
      if (!matchScoutCounts.has(data.match_id)) {
        matchScoutCounts.set(data.match_id, new Set());
      }
      matchScoutCounts.get(data.match_id)!.add(data.team_number);
    }
    const matchesFullyScouted = Array.from(matchScoutCounts.values()).filter(
      (teams) => teams.size === 6
    ).length;

    // Calculate team coverage
    const teamsWithMatchScouting = new Set(allScoutingData.map((d) => d.team_number));
    const teamsWithPitScouting = new Set(pitScoutingData.map((d) => d.team_number));
    const teamsWithBoth = new Set(
      [...teamsWithMatchScouting].filter((t) => teamsWithPitScouting.has(t))
    );

    // Scout performance metrics
    const uniqueScouts = new Set(allScoutingData.map((d) => d.scout_name));
    const reportsWithNotes = allScoutingData.filter((d) => d.notes && d.notes.trim().length > 0).length;
    const highConfidenceReports = allScoutingData.filter((d) => (d.confidence_level ?? 0) >= 4).length;
    const lowConfidenceReports = allScoutingData.filter((d) => (d.confidence_level ?? 0) <= 2).length;

    const totalConfidence = allScoutingData.reduce((sum, d) => sum + (d.confidence_level ?? 0), 0);
    const averageConfidence = allScoutingData.length > 0 ? totalConfidence / allScoutingData.length : 0;

    // Scouts per match
    const scoutsPerMatch: Record<string, number> = {};
    const matchKeyMap = new Map<number, string>();
    matches.forEach((m) => matchKeyMap.set(m.match_id, m.match_key));

    for (const [matchId, scoutedTeams] of matchScoutCounts) {
      const matchKey = matchKeyMap.get(matchId);
      if (matchKey) {
        scoutsPerMatch[matchKey] = scoutedTeams.size;
      }
    }

    const averageScoutsPerMatch =
      matchesScouted > 0
        ? Object.values(scoutsPerMatch).reduce((sum, count) => sum + count, 0) / matchesScouted
        : 0;

    // Coverage by comp level
    const coverageByCompLevel = this.calculateCoverageByCompLevel(matches, allScoutingData);

    return {
      total_matches: matches.length,
      matches_played: matchesPlayed,
      matches_scouted: matchesScouted,
      matches_fully_scouted: matchesFullyScouted,
      scouting_percentage: matchesPlayed > 0 ? (matchesScouted / matchesPlayed) * 100 : 0,
      full_coverage_percentage: matchesPlayed > 0 ? (matchesFullyScouted / matchesPlayed) * 100 : 0,

      total_teams: teams.length,
      teams_with_pit_scouting: teamsWithPitScouting.size,
      teams_with_match_scouting: teamsWithMatchScouting.size,
      teams_with_both: teamsWithBoth.size,
      pit_scouting_percentage: teams.length > 0 ? (teamsWithPitScouting.size / teams.length) * 100 : 0,
      match_scouting_percentage: teams.length > 0 ? (teamsWithMatchScouting.size / teams.length) * 100 : 0,

      unique_scouts: uniqueScouts.size,
      average_scouts_per_match: averageScoutsPerMatch,
      scouts_per_match: scoutsPerMatch,

      high_confidence_reports: highConfidenceReports,
      low_confidence_reports: lowConfidenceReports,
      reports_with_notes: reportsWithNotes,
      average_confidence_level: averageConfidence,

      coverage_by_comp_level: coverageByCompLevel,
    };
  }

  /**
   * Calculate coverage by competition level
   */
  private calculateCoverageByCompLevel(
    matches: MatchSchedule[],
    scoutingData: unknown[]
  ): ScoutingCoverageStats['coverage_by_comp_level'] {
    const scoutedMatchIds = new Set(scoutingData.map((d) => d.match_id));

    const levels = ['qm', 'ef', 'qf', 'sf', 'f'] as const;
    const coverage: Record<string, unknown> = {};

    for (const level of levels) {
      const levelMatches = matches.filter((m) => m.comp_level === level);
      if (levelMatches.length === 0) continue;

      const playedMatches = levelMatches.filter((m) => m.red_score != null || m.actual_time != null);
      const scoutedMatches = levelMatches.filter((m) => scoutedMatchIds.has(m.match_id));

      coverage[level] = {
        total: levelMatches.length,
        scouted: scoutedMatches.length,
        percentage: playedMatches.length > 0 ? (scoutedMatches.length / playedMatches.length) * 100 : 0,
      };
    }

    return coverage;
  }

  /**
   * Get team summaries for an event
   */
  async getTeamSummaries(eventKey: string): Promise<TeamEventSummary[]> {
    const [teams, matches, scoutingData, pitScouting] = await Promise.all([
      this.teamRepo.findByEventKey(eventKey),
      this.matchRepo.findByEventKey(eventKey),
      this.scoutingDataRepo.getMatchScoutingByEvent(eventKey),
      this.scoutingDataRepo.getPitScoutingByEvent(eventKey),
    ]);

    const summaries: TeamEventSummary[] = teams.map((team) => {
      // Find all matches for this team
      const teamMatches = matches.filter(
        (m) =>
          m.red_1 === team.team_number ||
          m.red_2 === team.team_number ||
          m.red_3 === team.team_number ||
          m.blue_1 === team.team_number ||
          m.blue_2 === team.team_number ||
          m.blue_3 === team.team_number
      );

      const playedMatches = teamMatches.filter((m) => m.red_score != null);

      // Calculate wins/losses/ties
      let wins = 0;
      let losses = 0;
      let ties = 0;

      for (const match of playedMatches) {
        const isRed =
          match.red_1 === team.team_number ||
          match.red_2 === team.team_number ||
          match.red_3 === team.team_number;

        if (match.winning_alliance === 'tie') {
          ties++;
        } else if ((isRed && match.winning_alliance === 'red') || (!isRed && match.winning_alliance === 'blue')) {
          wins++;
        } else {
          losses++;
        }
      }

      // Scouting coverage
      const teamScoutingData = scoutingData.filter((d) => d.team_number === team.team_number);
      const hasPitScouting = pitScouting.some((p) => p.team_number === team.team_number);

      const totalConfidence = teamScoutingData.reduce((sum, d) => sum + (d.confidence_level ?? 0), 0);
      const avgConfidence = teamScoutingData.length > 0 ? totalConfidence / teamScoutingData.length : 0;

      // Calculate reliability metrics
      const disconnectRate = teamScoutingData.length > 0
        ? (teamScoutingData.filter((d) => d.robot_disconnected).length / teamScoutingData.length) * 100
        : 0;
      const disabledRate = teamScoutingData.length > 0
        ? (teamScoutingData.filter((d) => d.robot_disabled).length / teamScoutingData.length) * 100
        : 0;
      const tippedRate = teamScoutingData.length > 0
        ? (teamScoutingData.filter((d) => d.robot_tipped).length / teamScoutingData.length) * 100
        : 0;

      const totalFouls = teamScoutingData.reduce((sum, d) => sum + d.foul_count, 0);
      const totalTechFouls = teamScoutingData.reduce((sum, d) => sum + d.tech_foul_count, 0);
      const avgFouls = teamScoutingData.length > 0 ? totalFouls / teamScoutingData.length : 0;
      const avgTechFouls = teamScoutingData.length > 0 ? totalTechFouls / teamScoutingData.length : 0;

      // Calculate qualitative ratings
      const defenseRatings = teamScoutingData.filter((d) => d.defense_rating != null);
      const driverRatings = teamScoutingData.filter((d) => d.driver_skill_rating != null);
      const speedRatings = teamScoutingData.filter((d) => d.speed_rating != null);

      const avgDefense = defenseRatings.length > 0
        ? defenseRatings.reduce((sum, d) => sum + d.defense_rating!, 0) / defenseRatings.length
        : undefined;
      const avgDriver = driverRatings.length > 0
        ? driverRatings.reduce((sum, d) => sum + d.driver_skill_rating!, 0) / driverRatings.length
        : undefined;
      const avgSpeed = speedRatings.length > 0
        ? speedRatings.reduce((sum, d) => sum + d.speed_rating!, 0) / speedRatings.length
        : undefined;

      return {
        team_number: team.team_number,
        team_name: team.team_nickname || team.team_name,
        matches_played: playedMatches.length,
        wins,
        losses,
        ties,
        matches_scouted: teamScoutingData.length,
        pit_scouted: hasPitScouting,
        average_scout_confidence: avgConfidence,
        average_defense_rating: avgDefense,
        average_driver_skill: avgDriver,
        average_speed_rating: avgSpeed,
        disconnect_rate: disconnectRate,
        disabled_rate: disabledRate,
        tipped_rate: tippedRate,
        average_fouls: avgFouls,
        average_tech_fouls: avgTechFouls,
      };
    });

    return summaries;
  }

  /**
   * Get data freshness information
   */
  async getDataFreshness(eventKey: string): Promise<DataFreshness> {
    const [event, scoutingData, pitScouting, importJobs] = await Promise.all([
      this.eventRepo.findByEventKey(eventKey),
      this.scoutingDataRepo.getMatchScoutingByEvent(eventKey),
      this.scoutingDataRepo.getPitScoutingByEvent(eventKey),
      this.importJobRepo.findByEventKey(eventKey),
    ]);

    if (!event) {
      throw new Error(`Event ${eventKey} not found`);
    }

    // Find most recent match scouting
    const matchScoutingTimes = scoutingData
      .map((d) => d.created_at)
      .filter((t): t is string => t != null)
      .sort()
      .reverse();
    const lastMatchScouted = matchScoutingTimes[0];

    // Find most recent pit scouting
    const pitScoutingTimes = pitScouting
      .map((d) => d.scouted_at || d.created_at)
      .filter((t): t is string => t != null)
      .sort()
      .reverse();
    const lastPitScouted = pitScoutingTimes[0];

    // Find active import job
    const activeJob = importJobs.find((j) => j.status === 'processing' || j.status === 'pending');

    // Find last successful import
    const successfulJobs = importJobs
      .filter((j) => j.status === 'completed')
      .sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime());
    const lastSuccessfulImport = successfulJobs[0];

    return {
      event_key: eventKey,
      tba_last_updated: event.updated_at,
      tba_sync_needed: false, // Could be enhanced with TBA's last_modified header
      last_match_scouted: lastMatchScouted,
      last_pit_scouted: lastPitScouted,
      active_import_job: activeJob
        ? {
            job_id: activeJob.job_id,
            job_type: activeJob.job_type,
            status: activeJob.status,
            progress_percent: activeJob.progress_percent,
          }
        : undefined,
      last_successful_import: lastSuccessfulImport
        ? {
            job_id: lastSuccessfulImport.job_id,
            completed_at: lastSuccessfulImport.completed_at!,
            items_imported: lastSuccessfulImport.processed_items,
          }
        : undefined,
    };
  }

  /**
   * Refresh event from TBA
   */
  async refreshEventFromTBA(eventKey: string): Promise<Event> {
    // Fetch from TBA
    const tbaEvent = await this.tbaApi.getEvent(eventKey);

    // Convert to our format
    const event = this.convertTBAEvent(tbaEvent);

    // Merge with existing data
    const existing = await this.eventRepo.findByEventKey(eventKey);
    const merged = existing ? this.eventMergeStrategy.merge(existing, tbaEvent) : event;

    // Save
    const saved = await this.eventRepo.upsert(merged);

    return saved;
  }

  /**
   * Get events by year
   */
  async getEventsByYear(year: number): Promise<Event[]> {
    return this.eventRepo.findByYear(year);
  }

  /**
   * Import and create an event from The Blue Alliance
   */
  async importEventFromTBA(eventKey: string): Promise<Event> {
    try {
      // Fetch event from TBA
      const tbaEvent = await this.tbaApi.getEvent(eventKey);

      // Check if event already exists
      const existing = await this.eventRepo.findByEventKey(eventKey);

      if (existing) {
        // If exists, use merge strategy to update
        const merged = this.eventMergeStrategy.merge(existing, tbaEvent);
        this.log(`Updating existing event: ${eventKey}`);
        return await this.eventRepo.upsert(merged);
      }

      // Convert TBA event to our format using merge strategy
      const eventData = this.eventMergeStrategy.merge(null, tbaEvent);

      this.log(`Importing new event: ${eventKey}`);
      // Create the event
      return await this.eventRepo.upsert(eventData);
    } catch (error: unknown) {
      if (error.name === 'TBAApiError') {
        throw error;
      }
      throw new Error(`Failed to import event from TBA: ${error.message}`);
    }
  }

  /**
   * Convert TBA Event to our format
   */
  private convertTBAEvent(tbaEvent: TBAEvent): Event {
    return {
      event_key: tbaEvent.key,
      event_name: tbaEvent.name,
      event_code: tbaEvent.event_code,
      year: tbaEvent.year,
      event_type: tbaEvent.event_type as any,
      district: tbaEvent.district?.key,
      week: tbaEvent.week ?? undefined,
      city: tbaEvent.city ?? undefined,
      state_province: tbaEvent.state_prov ?? undefined,
      country: tbaEvent.country ?? undefined,
      start_date: tbaEvent.start_date,
      end_date: tbaEvent.end_date,
    };
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: unknown): void {
    console.log(`[EventService] ${message}`, data || '');
  }
}

/**
 * Factory function to create Event Service
 */
export function createEventService(
  tbaApi: ITBAApiService,
  eventRepo: IEventRepository,
  teamRepo: ITeamRepository,
  matchRepo: IMatchRepository,
  scoutingDataRepo: IScoutingDataRepository,
  importJobRepo: IImportJobRepository,
  eventMergeStrategy: EventMergeStrategy
): IEventService {
  return new EventService(
    tbaApi,
    eventRepo,
    teamRepo,
    matchRepo,
    scoutingDataRepo,
    importJobRepo,
    eventMergeStrategy
  );
}
