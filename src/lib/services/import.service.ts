/**
 * Import Service - Orchestrates TBA data imports as background jobs
 *
 * This service is the core of the import functionality, managing:
 * - Import job lifecycle (create → process → complete)
 * - Data fetching from TBA API
 * - Merge strategy application
 * - Bulk database operations
 * - Progress tracking and error handling
 *
 * Architecture:
 * - startImport: Creates job and returns immediately (non-blocking)
 * - processImportJob: Executes the actual import (background worker)
 * - Handles partial failures gracefully (log warnings, continue processing)
 */

import type {
  ImportJob,
  ImportJobType,
  CreateImportJobInput,
  ImportError,
  ImportWarning,
} from '@/types/import-job';
import type { Team, MatchSchedule, Event } from '@/types';
import type { TBATeam, TBAMatch, TBAEvent } from '@/types/tba';
import type { ITBAApiService } from './tba-api.service';
import type { IImportJobRepository } from '@/lib/repositories/import-job.repository';
import type { ITeamRepository } from '@/lib/repositories/team.repository';
import type { IMatchRepository } from '@/lib/repositories/match.repository';
import type { IEventRepository } from '@/lib/repositories/event.repository';
import type {
  IMergeStrategy,
  TeamMergeStrategy,
  MatchMergeStrategy,
  EventMergeStrategy,
} from '@/lib/strategies/merge-strategies';
import { mapTBAEventType } from '@/lib/utils/tba';

/**
 * Options for starting an import
 */
export interface ImportOptions {
  importTeams: boolean;
  importMatches: boolean;
  importResults: boolean; // Match scores only
  forceRefresh?: boolean; // Skip conflict checking, always overwrite
  createdBy?: string; // User who initiated the import
}

/**
 * Detailed status of an import job
 */
export interface ImportJobStatus extends ImportJob {
  details: {
    phase: 'teams' | 'matches' | 'results' | 'complete' | 'error';
    currentItem?: string; // e.g., "frc930" or "2025txaus_qm1"
    warnings: string[];
    errors: string[];
  };
}

/**
 * Result of processing an import job
 */
export interface ImportProcessResult {
  success: boolean;
  teamsImported: number;
  matchesImported: number;
  resultsUpdated: number;
  warnings: ImportWarning[];
  errors: ImportError[];
}

/**
 * Import Service Interface
 */
export interface IImportService {
  /**
   * Start a new import job (non-blocking)
   * Creates the job in the database and returns immediately
   */
  startImport(eventKey: string, options: ImportOptions): Promise<ImportJob>;

  /**
   * Process an import job (blocking, called by background worker)
   * This is where the actual import work happens
   */
  processImportJob(jobId: string): Promise<ImportProcessResult>;

  /**
   * Get the current status of an import job with details
   */
  getImportStatus(jobId: string): Promise<ImportJobStatus>;

  /**
   * Cancel a pending or processing import job
   */
  cancelImport(jobId: string): Promise<void>;

  /**
   * Get all import jobs for an event
   */
  getEventImportHistory(eventKey: string): Promise<ImportJob[]>;
}

/**
 * Import Service Implementation
 */
export class ImportService implements IImportService {
  constructor(
    private readonly tbaApi: ITBAApiService,
    private readonly importJobRepo: IImportJobRepository,
    private readonly teamRepo: ITeamRepository,
    private readonly matchRepo: IMatchRepository,
    private readonly eventRepo: IEventRepository,
    private readonly teamMergeStrategy: TeamMergeStrategy,
    private readonly matchMergeStrategy: MatchMergeStrategy,
    private readonly eventMergeStrategy: EventMergeStrategy
  ) {}

  /**
   * Start a new import job
   */
  async startImport(eventKey: string, options: ImportOptions): Promise<ImportJob> {
    // Determine job type based on options
    let jobType: ImportJobType;
    if (options.importTeams && options.importMatches) {
      jobType = 'full';
    } else if (options.importResults) {
      jobType = 'results';
    } else if (options.importTeams) {
      jobType = 'teams';
    } else if (options.importMatches) {
      jobType = 'matches';
    } else {
      throw new Error('At least one import option must be enabled');
    }

    // Create the import job
    const input: CreateImportJobInput = {
      event_key: eventKey,
      job_type: jobType,
      created_by: options.createdBy,
    };

    const job = await this.importJobRepo.create(input);

    // Log import start
    this.log(`Import job created: ${job.job_id} for event ${eventKey}`, { jobType });

    return job;
  }

  /**
   * Process an import job - THE CORE IMPORT LOGIC
   */
  async processImportJob(jobId: string): Promise<ImportProcessResult> {
    const result: ImportProcessResult = {
      success: false,
      teamsImported: 0,
      matchesImported: 0,
      resultsUpdated: 0,
      warnings: [],
      errors: [],
    };

    try {
      // Get the job
      const job = await this.importJobRepo.findById(jobId);
      if (!job) {
        throw new Error(`Import job ${jobId} not found`);
      }

      // Check if job is already processing or completed
      if (job.status === 'processing') {
        throw new Error(`Import job ${jobId} is already processing`);
      }
      if (job.status === 'completed') {
        this.log(`Import job ${jobId} already completed`, { job });
        return result;
      }
      if (job.status === 'cancelled') {
        throw new Error(`Import job ${jobId} was cancelled`);
      }

      // Update status to processing
      await this.importJobRepo.updateStatus(jobId, 'processing');
      this.log(`Processing import job ${jobId}`, { eventKey: job.event_key, jobType: job.job_type });

      // Fetch event first to validate it exists
      let event: Event;
      try {
        const tbaEvent = await this.tbaApi.getEvent(job.event_key);
        event = this.convertTBAEvent(tbaEvent);

        // Merge and save event
        const existingEvent = await this.eventRepo.findByEventKey(job.event_key);
        const mergedEvent = existingEvent
          ? this.eventMergeStrategy.merge(existingEvent, tbaEvent)
          : event;
        await this.eventRepo.upsert(mergedEvent);
      } catch (error) {
        const errorMsg = `Failed to fetch event ${job.event_key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        this.log(errorMsg, error);
        await this.importJobRepo.markFailed(jobId, errorMsg);
        result.errors.push({
          item_key: job.event_key,
          error_type: 'api_error',
          message: errorMsg,
        });
        return result;
      }

      // Import teams if requested
      if (job.job_type === 'teams' || job.job_type === 'full') {
        try {
          result.teamsImported = await this.importTeams(job);
        } catch (error) {
          const errorMsg = `Failed to import teams: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.log(errorMsg, error);
          result.errors.push({
            item_key: job.event_key,
            error_type: 'api_error',
            message: errorMsg,
          });
          // Continue to matches if this is a full import
        }
      }

      // Import matches if requested
      if (job.job_type === 'matches' || job.job_type === 'full') {
        try {
          result.matchesImported = await this.importMatches(job);
        } catch (error) {
          const errorMsg = `Failed to import matches: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.log(errorMsg, error);
          result.errors.push({
            item_key: job.event_key,
            error_type: 'api_error',
            message: errorMsg,
          });
        }
      }

      // Update results only if requested
      if (job.job_type === 'results') {
        try {
          result.resultsUpdated = await this.updateMatchResults(job);
        } catch (error) {
          const errorMsg = `Failed to update results: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.log(errorMsg, error);
          result.errors.push({
            item_key: job.event_key,
            error_type: 'api_error',
            message: errorMsg,
          });
        }
      }

      // Determine final status
      const hasErrors = result.errors.length > 0;
      const hasSuccess = result.teamsImported > 0 || result.matchesImported > 0 || result.resultsUpdated > 0;

      if (hasSuccess && !hasErrors) {
        result.success = true;
        await this.importJobRepo.markCompleted(jobId);
        this.log(`Import job ${jobId} completed successfully`, result);
      } else if (hasSuccess && hasErrors) {
        result.success = true; // Partial success
        await this.importJobRepo.markCompleted(jobId);
        // Log warnings for partial success
        for (const error of result.errors) {
          await this.importJobRepo.addWarning(jobId, `${error.error_type}: ${error.message}`);
        }
        this.log(`Import job ${jobId} completed with errors`, result);
      } else {
        result.success = false;
        await this.importJobRepo.markFailed(jobId, result.errors[0]?.message || 'Import failed');
        this.log(`Import job ${jobId} failed`, result);
      }

      return result;
    } catch (error) {
      // Unexpected error
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Import job ${jobId} failed with unexpected error`, error);

      await this.importJobRepo.markFailed(jobId, errorMsg);

      result.errors.push({
        item_key: jobId,
        error_type: 'unknown',
        message: errorMsg,
      });

      return result;
    }
  }

  /**
   * Import teams for an event
   */
  private async importTeams(job: ImportJob): Promise<number> {
    this.log(`Importing teams for event ${job.event_key}`);

    // Fetch teams from TBA
    const tbaTeams = await this.tbaApi.getEventTeams(job.event_key);
    const totalItems = tbaTeams.length;
    let processedItems = 0;

    // Update progress
    await this.importJobRepo.updateProgress(job.job_id, {
      total_items: totalItems,
      processed_items: 0,
      progress_percent: 0,
    });

    // Process teams in batches
    const batchSize = 50;
    const teams: Partial<Team>[] = [];

    for (const tbaTeam of tbaTeams) {
      try {
        // Convert TBA team to our format
        const team = this.convertTBATeam(tbaTeam);

        // Get existing team if any
        const existing = await this.teamRepo.findByTeamNumber(team.team_number);

        // Merge using strategy (returns Partial, so use converted team as base)
        const mergeResult = existing ? this.teamMergeStrategy.merge(existing, tbaTeam) : team;
        const merged = { ...team, ...mergeResult } as Partial<Team>;

        // IMPORTANT: Remove team_key - it's auto-generated by the database
        // If we're updating an existing team, the merge may include it
        delete merged.team_key;
        delete merged.created_at;
        delete merged.updated_at;

        teams.push(merged);

        processedItems++;

        // Update progress periodically
        if (processedItems % 10 === 0 || processedItems === totalItems) {
          await this.importJobRepo.updateProgress(job.job_id, {
            total_items: totalItems,
            processed_items: processedItems,
            progress_percent: Math.round((processedItems / totalItems) * 100),
          });
        }
      } catch (error) {
        this.log(`Failed to process team ${tbaTeam.key}`, error);
        // Continue processing other teams
      }
    }

    // Bulk upsert all teams
    if (teams.length > 0) {
      const upserted = await this.teamRepo.bulkUpsert(teams);
      this.log(`Imported ${upserted.length} teams for event ${job.event_key}`);

      // Also populate event_teams junction table (links teams to events)
      // This allows teams to be visible before match schedule is published
      try {
        const eventTeamsData = upserted.map(team => ({
          event_key: job.event_key,
          team_number: team.team_number,
        }));

        // Use direct Supabase client for event_teams junction table
        // Note: We don't have a dedicated repository for this junction table
        const { createServiceClient } = await import('@/lib/supabase/server');
        const supabase = createServiceClient();
        const { error } = await supabase
          .from('event_teams')
          .upsert(eventTeamsData, {
            onConflict: 'event_key,team_number',
            ignoreDuplicates: false,
          });

        if (error) {
          this.log(`Warning: Failed to populate event_teams junction table: ${error.message}`);
          // Don't fail the import, just log the warning
        } else {
          this.log(`Populated event_teams for ${eventTeamsData.length} teams`);
        }
      } catch (error) {
        this.log(`Warning: Failed to populate event_teams junction table`, error);
        // Don't fail the import
      }

      return upserted.length;
    }

    return 0;
  }

  /**
   * Import matches for an event
   */
  private async importMatches(job: ImportJob): Promise<number> {
    this.log(`Importing matches for event ${job.event_key}`);

    // Fetch matches from TBA
    const tbaMatches = await this.tbaApi.getEventMatches(job.event_key);
    const totalItems = tbaMatches.length;
    let processedItems = 0;

    // Update progress
    await this.importJobRepo.updateProgress(job.job_id, {
      total_items: totalItems,
      processed_items: 0,
      progress_percent: 0,
    });

    // Process matches
    const matches: Partial<MatchSchedule>[] = [];

    for (const tbaMatch of tbaMatches) {
      try {
        // Convert TBA match to our format
        const match = this.convertTBAMatch(tbaMatch, job.event_key);

        // Get existing match if any
        const existing = await this.matchRepo.findByMatchKey(match.match_key);

        // Merge using strategy (returns Partial, so use converted match as base)
        const mergeResult = existing ? this.matchMergeStrategy.merge(existing, tbaMatch) : match;
        const merged = { ...match, ...mergeResult };

        matches.push(merged);

        processedItems++;

        // Update progress periodically
        if (processedItems % 10 === 0 || processedItems === totalItems) {
          await this.importJobRepo.updateProgress(job.job_id, {
            total_items: totalItems,
            processed_items: processedItems,
            progress_percent: Math.round((processedItems / totalItems) * 100),
          });
        }
      } catch (error) {
        this.log(`Failed to process match ${tbaMatch.key}`, error);
        // Continue processing other matches
      }
    }

    // Bulk upsert all matches
    if (matches.length > 0) {
      const upserted = await this.matchRepo.bulkUpsert(matches);
      this.log(`Imported ${upserted.length} matches for event ${job.event_key}`);
      return upserted.length;
    }

    return 0;
  }

  /**
   * Update match results (scores) only
   */
  private async updateMatchResults(job: ImportJob): Promise<number> {
    this.log(`Updating match results for event ${job.event_key}`);

    // Fetch matches from TBA
    const tbaMatches = await this.tbaApi.getEventMatches(job.event_key);
    let updatedCount = 0;

    for (const tbaMatch of tbaMatches) {
      try {
        // Only update if match has scores
        if (tbaMatch.alliances?.red?.score != null && tbaMatch.alliances?.blue?.score != null) {
          const redScore = tbaMatch.alliances.red.score;
          const blueScore = tbaMatch.alliances.blue.score;

          await this.matchRepo.updateScores(tbaMatch.key, redScore, blueScore);
          updatedCount++;
        }
      } catch (error) {
        this.log(`Failed to update results for match ${tbaMatch.key}`, error);
        // Continue processing other matches
      }
    }

    this.log(`Updated results for ${updatedCount} matches`);
    return updatedCount;
  }

  /**
   * Get detailed status of an import job
   */
  async getImportStatus(jobId: string): Promise<ImportJobStatus> {
    const job = await this.importJobRepo.findById(jobId);
    if (!job) {
      throw new Error(`Import job ${jobId} not found`);
    }

    // Determine current phase
    let phase: ImportJobStatus['details']['phase'] = 'complete';
    if (job.status === 'processing') {
      if (job.job_type === 'teams') {
        phase = 'teams';
      } else if (job.job_type === 'matches') {
        phase = 'matches';
      } else if (job.job_type === 'results') {
        phase = 'results';
      } else if (job.job_type === 'full') {
        // Determine based on progress
        if (job.progress_percent < 50) {
          phase = 'teams';
        } else {
          phase = 'matches';
        }
      }
    } else if (job.status === 'failed') {
      phase = 'error';
    }

    return {
      ...job,
      details: {
        phase,
        warnings: [], // Could be extended to fetch from a warnings table
        errors: job.error_message ? [job.error_message] : [],
      },
    };
  }

  /**
   * Cancel an import job
   */
  async cancelImport(jobId: string): Promise<void> {
    const job = await this.importJobRepo.findById(jobId);
    if (!job) {
      throw new Error(`Import job ${jobId} not found`);
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error(`Cannot cancel ${job.status} job`);
    }

    await this.importJobRepo.updateStatus(jobId, 'cancelled');
    this.log(`Import job ${jobId} cancelled`);
  }

  /**
   * Get import history for an event
   */
  async getEventImportHistory(eventKey: string): Promise<ImportJob[]> {
    return this.importJobRepo.findByEventKey(eventKey);
  }

  /**
   * Convert TBA Event to our Event format
   */
  private convertTBAEvent(tbaEvent: TBAEvent): Event {
    return {
      event_key: tbaEvent.key,
      event_name: tbaEvent.name,
      event_code: tbaEvent.event_code,
      year: tbaEvent.year,
      event_type: mapTBAEventType(tbaEvent.event_type),
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
   * Convert TBA Team to our Team format
   * Note: team_key is auto-generated by the database, so we don't include it
   */
  private convertTBATeam(tbaTeam: TBATeam): Omit<Team, 'team_key' | 'created_at' | 'updated_at'> {
    // Truncate strings to match database constraints
    const truncate = (str: string | null | undefined, maxLength: number): string | undefined => {
      if (!str) return undefined;
      return str.length > maxLength ? str.substring(0, maxLength) : str;
    };

    return {
      team_number: tbaTeam.team_number,
      // team_key is GENERATED ALWAYS in the database, don't include it
      team_name: truncate(tbaTeam.name, 255) || `Team ${tbaTeam.team_number}`, // Fallback if empty after truncate
      team_nickname: truncate(tbaTeam.nickname, 100),
      city: truncate(tbaTeam.city, 100),
      state_province: truncate(tbaTeam.state_prov, 50),
      country: truncate(tbaTeam.country, 50),
      postal_code: truncate(tbaTeam.postal_code, 20),
      rookie_year: tbaTeam.rookie_year ?? undefined,
      website: truncate(tbaTeam.website, 255),
    };
  }

  /**
   * Convert TBA Match to our MatchSchedule format
   */
  private convertTBAMatch(tbaMatch: TBAMatch, eventKey: string): Omit<MatchSchedule, 'match_id'> {
    const redTeams = tbaMatch.alliances.red.team_keys.map((key) =>
      parseInt(key.replace('frc', ''), 10)
    );
    const blueTeams = tbaMatch.alliances.blue.team_keys.map((key) =>
      parseInt(key.replace('frc', ''), 10)
    );

    // Calculate winning alliance from scores
    let winningAlliance: 'red' | 'blue' | 'tie' | undefined = undefined;
    if (tbaMatch.alliances.red.score != null && tbaMatch.alliances.blue.score != null) {
      const redScore = tbaMatch.alliances.red.score;
      const blueScore = tbaMatch.alliances.blue.score;
      winningAlliance = redScore > blueScore ? 'red' : blueScore > redScore ? 'blue' : 'tie';
    }

    return {
      // match_id will be auto-generated by database
      event_key: eventKey,
      match_key: tbaMatch.key,
      comp_level: tbaMatch.comp_level as MatchSchedule["comp_level"],
      set_number: tbaMatch.set_number ?? undefined,
      match_number: tbaMatch.match_number,
      red_1: redTeams[0],
      red_2: redTeams[1],
      red_3: redTeams[2],
      blue_1: blueTeams[0],
      blue_2: blueTeams[1],
      blue_3: blueTeams[2],
      red_score: tbaMatch.alliances.red.score ?? undefined,
      blue_score: tbaMatch.alliances.blue.score ?? undefined,
      winning_alliance: winningAlliance,
      scheduled_time: tbaMatch.time ? new Date(tbaMatch.time * 1000).toISOString() : undefined,
      actual_time: tbaMatch.actual_time
        ? new Date(tbaMatch.actual_time * 1000).toISOString()
        : undefined,
      post_result_time: tbaMatch.post_result_time
        ? new Date(tbaMatch.post_result_time * 1000).toISOString()
        : undefined,
    };
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: unknown): void {
    console.log(`[ImportService] ${message}`, data || '');
  }
}

/**
 * Factory function to create Import Service
 */
export function createImportService(
  tbaApi: ITBAApiService,
  importJobRepo: IImportJobRepository,
  teamRepo: ITeamRepository,
  matchRepo: IMatchRepository,
  eventRepo: IEventRepository,
  teamMergeStrategy: TeamMergeStrategy,
  matchMergeStrategy: MatchMergeStrategy,
  eventMergeStrategy: EventMergeStrategy
): IImportService {
  return new ImportService(
    tbaApi,
    importJobRepo,
    teamRepo,
    matchRepo,
    eventRepo,
    teamMergeStrategy,
    matchMergeStrategy,
    eventMergeStrategy
  );
}
