/**
 * OPR Service
 *
 * Handles calculation and management of OPR/DPR/CCWM metrics
 * This is separate from the general statistics service to focus specifically
 * on these championship-critical algorithms.
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateOPR as calculateOPRAlgorithm,
  validateOPRResults,
  type OPRResult,
  type OPRCalculationResult,
} from '@/lib/algorithms/opr';
import {
  calculateDPR as calculateDPRAlgorithm,
  validateDPRResults,
  type DPRResult,
  type DPRCalculationResult,
} from '@/lib/algorithms/dpr';
import {
  calculateCCWM as calculateCCWMAlgorithm,
  validateCCWMResults,
  generateAllianceRecommendations,
  type CCWMResult,
  type CCWMCalculationResult,
} from '@/lib/algorithms/ccwm';
import {
  createMatchRepository,
  type IMatchRepository,
} from '@/lib/repositories';
import { calculateAllComponentOPRs } from '@/lib/services/tba-attribution.service';

/**
 * OPR metrics including all three calculations
 */
export interface OPRMetrics {
  opr: OPRResult[];
  dpr: DPRResult[];
  ccwm: CCWMResult[];
  calculatedAt: Date;
  eventKey: string;
  totalMatches: number;
  warnings: string[];
}

/**
 * Team statistics row for database storage
 */
interface TeamStatisticsRow {
  team_number: number;
  event_key: string;
  opr: number | null;
  dpr: number | null;
  ccwm: number | null;
  matches_played_official: number;
  updated_at?: string;
}

/**
 * OPR Service Interface
 */
export interface IOPRService {
  /**
   * Calculate OPR/DPR/CCWM for all teams at an event
   */
  calculateOPRMetrics(eventKey: string): Promise<OPRMetrics>;

  /**
   * Get cached OPR values for an event
   */
  getOPRMetrics(eventKey: string): Promise<OPRMetrics | null>;

  /**
   * Get OPR history for a specific team
   */
  getTeamOPRHistory(teamNumber: number): Promise<OPRMetrics[]>;

  /**
   * Force recalculation of OPR metrics
   */
  recalculateOPRMetrics(eventKey: string): Promise<OPRMetrics>;

  /**
   * Get alliance recommendations based on CCWM
   */
  getAllianceRecommendations(eventKey: string): Promise<ReturnType<typeof generateAllianceRecommendations>>;
}

/**
 * OPR Service Implementation
 */
export class OPRService implements IOPRService {
  private client: SupabaseClient;
  private matchRepo: IMatchRepository;

  constructor(
    matchRepo?: IMatchRepository,
    client?: SupabaseClient
  ) {
    this.client = client || createServiceClient();
    this.matchRepo = matchRepo || createMatchRepository(this.client);
  }

  /**
   * Calculate OPR/DPR/CCWM for all teams at an event
   */
  async calculateOPRMetrics(eventKey: string): Promise<OPRMetrics> {
    console.log(`[OPRService] Calculating OPR metrics for event: ${eventKey}`);

    // Check if we have recent calculations (within last hour)
    const cached = await this.getCachedOPRMetrics(eventKey);
    if (cached && this.isCacheValid(cached.calculatedAt)) {
      console.log(`[OPRService] Using cached OPR metrics from ${cached.calculatedAt}`);
      return cached;
    }

    // Fetch completed matches
    const matches = await this.matchRepo.findByEventKey(eventKey);
    const completedMatches = matches.filter(
      m => m.red_score !== null && m.blue_score !== null
    );

    if (completedMatches.length === 0) {
      throw new Error(`No completed matches found for event ${eventKey}`);
    }

    console.log(`[OPRService] Found ${completedMatches.length} completed matches`);

    // Calculate OPR
    const oprResults = await calculateOPRAlgorithm(eventKey, completedMatches);
    const oprWarnings = validateOPRResults(oprResults);

    // Calculate DPR
    const dprResults = await calculateDPRAlgorithm(eventKey, completedMatches);
    const dprWarnings = validateDPRResults(dprResults);

    // Calculate CCWM
    const ccwmResults = await calculateCCWMAlgorithm(
      eventKey,
      oprResults.teams,
      dprResults.teams
    );
    const ccwmWarnings = validateCCWMResults(ccwmResults);

    // Combine all warnings
    const allWarnings = [
      ...oprResults.warnings,
      ...oprWarnings,
      ...dprResults.warnings,
      ...dprWarnings,
      ...ccwmWarnings,
    ];

    // Store results in team_statistics table
    await this.storeOPRResults(oprResults, dprResults, ccwmResults);

    const metrics: OPRMetrics = {
      opr: oprResults.teams,
      dpr: dprResults.teams,
      ccwm: ccwmResults.teams,
      calculatedAt: new Date(),
      eventKey,
      totalMatches: completedMatches.length,
      warnings: allWarnings,
    };

    console.log(`[OPRService] OPR calculation complete for ${oprResults.teams.length} teams`);
    return metrics;
  }

  /**
   * Get cached OPR values for an event
   */
  async getOPRMetrics(eventKey: string): Promise<OPRMetrics | null> {
    return await this.getCachedOPRMetrics(eventKey);
  }

  /**
   * Get OPR history for a specific team across all events
   */
  async getTeamOPRHistory(teamNumber: number): Promise<OPRMetrics[]> {
    try {
      const { data, error } = await this.client
        .from('team_statistics')
        .select('*')
        .eq('team_number', teamNumber)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[OPRService] Error fetching team OPR history:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group by event and format
      const eventMap = new Map<string, typeof data>();
      data.forEach(row => {
        const existing = eventMap.get(row.event_key) || [];
        existing.push(row);
        eventMap.set(row.event_key, existing);
      });

      const results: OPRMetrics[] = [];
      for (const [eventKey, rows] of eventMap.entries()) {
        const metrics: OPRMetrics = {
          opr: rows.filter(r => r.opr !== null).map(r => ({
            teamNumber: r.team_number,
            opr: r.opr!,
            matchesPlayed: r.matches_played_official || 0,
          })),
          dpr: rows.filter(r => r.dpr !== null).map(r => ({
            teamNumber: r.team_number,
            dpr: r.dpr!,
            matchesPlayed: r.matches_played_official || 0,
          })),
          ccwm: rows.filter(r => r.ccwm !== null).map(r => ({
            teamNumber: r.team_number,
            opr: r.opr || 0,
            dpr: r.dpr || 0,
            ccwm: r.ccwm!,
            matchesPlayed: r.matches_played_official || 0,
          })),
          calculatedAt: new Date(rows[0].updated_at || Date.now()),
          eventKey,
          totalMatches: 0,
          warnings: [],
        };
        results.push(metrics);
      }

      return results;
    } catch (error) {
      console.error('[OPRService] Error fetching team OPR history:', error);
      throw error;
    }
  }

  /**
   * Force recalculation of OPR metrics (bypasses cache)
   */
  async recalculateOPRMetrics(eventKey: string): Promise<OPRMetrics> {
    // Clear cache by setting a very old timestamp
    await this.clearOPRCache(eventKey);

    // Recalculate
    return this.calculateOPRMetrics(eventKey);
  }

  /**
   * Calculate component OPR values (auto, teleop hub, endgame, total hub)
   * from TBA score_breakdown data. Stores results in team_statistics.
   */
  async calculateComponentOPRMetrics(eventKey: string): Promise<void> {
    console.log(`[OPRService] Calculating component OPR for event: ${eventKey}`);

    const matches = await this.matchRepo.findByEventKey(eventKey);
    const matchesWithBreakdown = matches.filter(
      m => m.score_breakdown !== null && m.score_breakdown !== undefined
    );

    if (matchesWithBreakdown.length < 3) {
      console.log(`[OPRService] Not enough matches with score_breakdown (${matchesWithBreakdown.length}), skipping component OPR`);
      return;
    }

    const componentOPRs = await calculateAllComponentOPRs(eventKey, matchesWithBreakdown);

    // Store component OPR values -- merge with existing team_statistics rows
    const allTeams = new Set<number>([
      ...componentOPRs.autoOPR.keys(),
      ...componentOPRs.teleopHubOPR.keys(),
      ...componentOPRs.endgameOPR.keys(),
      ...componentOPRs.totalHubOPR.keys(),
    ]);

    for (const teamNumber of allTeams) {
      const { error } = await this.client
        .from('team_statistics')
        .upsert({
          team_number: teamNumber,
          event_key: eventKey,
          auto_opr: componentOPRs.autoOPR.get(teamNumber) ?? null,
          teleop_hub_opr: componentOPRs.teleopHubOPR.get(teamNumber) ?? null,
          endgame_opr: componentOPRs.endgameOPR.get(teamNumber) ?? null,
          total_hub_opr: componentOPRs.totalHubOPR.get(teamNumber) ?? null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'team_number,event_key',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`[OPRService] Error storing component OPR for team ${teamNumber}:`, error);
      }
    }

    console.log(`[OPRService] Stored component OPR for ${allTeams.size} teams`);
  }

  /**
   * Get alliance recommendations based on CCWM
   */
  async getAllianceRecommendations(eventKey: string): Promise<ReturnType<typeof generateAllianceRecommendations>> {
    const metrics = await this.calculateOPRMetrics(eventKey);

    const ccwmResults: CCWMCalculationResult = {
      eventKey,
      teams: metrics.ccwm,
      calculatedAt: metrics.calculatedAt,
      statistics: this.calculateCCWMStatistics(metrics.ccwm),
    };

    return generateAllianceRecommendations(ccwmResults);
  }

  /**
   * Store OPR results in the database
   * IMPORTANT: Uses read-modify-write pattern to preserve existing statistics
   * calculated by StatisticsService (avg scores, reliability, etc.)
   */
  private async storeOPRResults(
    oprResults: OPRCalculationResult,
    dprResults: DPRCalculationResult,
    ccwmResults: CCWMCalculationResult
  ): Promise<void> {
    try {
      // Create a map for quick lookup
      const dprMap = new Map(dprResults.teams.map(t => [t.teamNumber, t]));
      const ccwmMap = new Map(ccwmResults.teams.map(t => [t.teamNumber, t]));

      // Fetch existing statistics for this event to preserve StatisticsService data
      const { data: existingStats, error: fetchError } = await this.client
        .from('team_statistics')
        .select('*')
        .eq('event_key', oprResults.eventKey);

      if (fetchError) {
        console.error('[OPRService] Error fetching existing stats:', fetchError);
        // Continue anyway - we'll create new rows if they don't exist
      }

      // Create map of existing stats by team number
      const existingStatsMap = new Map(
        (existingStats || []).map(stat => [stat.team_number, stat])
      );

      // Prepare upsert data - merge with existing stats
      const updates: TeamStatisticsRow[] = oprResults.teams.map(opr => {
        const dpr = dprMap.get(opr.teamNumber);
        const ccwm = ccwmMap.get(opr.teamNumber);
        const existing = existingStatsMap.get(opr.teamNumber);

        return {
          team_number: opr.teamNumber,
          event_key: oprResults.eventKey,
          // New OPR values
          opr: opr.opr,
          dpr: dpr?.dpr || null,
          ccwm: ccwm?.ccwm || null,
          matches_played_official: opr.matchesPlayed,
          // Preserve existing StatisticsService values
          avg_auto_score: existing?.avg_auto_score ?? null,
          avg_teleop_score: existing?.avg_teleop_score ?? null,
          avg_endgame_score: existing?.avg_endgame_score ?? null,
          reliability_score: existing?.reliability_score ?? null,
          matches_scouted: existing?.matches_scouted ?? null,
          aggregated_metrics: existing?.aggregated_metrics ?? null,
          updated_at: new Date().toISOString(),
        };
      });

      // Batch upsert to team_statistics
      for (const update of updates) {
        const { error } = await this.client
          .from('team_statistics')
          .upsert(update, {
            onConflict: 'team_number,event_key',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error('[OPRService] Error storing OPR for team', update.team_number, error);
        }
      }

      console.log(`[OPRService] Stored OPR metrics for ${updates.length} teams (preserving existing stats)`);
    } catch (error) {
      console.error('[OPRService] Error storing OPR results:', error);
      throw error;
    }
  }

  /**
   * Get cached metrics from the database
   */
  private async getCachedOPRMetrics(eventKey: string): Promise<OPRMetrics | null> {
    try {
      const { data, error } = await this.client
        .from('team_statistics')
        .select('*')
        .eq('event_key', eventKey)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[OPRService] Error fetching cached metrics:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Check if any have OPR values
      const hasOPR = data.some(row => row.opr !== null && row.opr !== undefined);
      if (!hasOPR) {
        return null;
      }

      // Convert database rows to OPRMetrics
      const metrics: OPRMetrics = {
        opr: data.filter(r => r.opr !== null).map(r => ({
          teamNumber: r.team_number,
          opr: r.opr!,
          matchesPlayed: r.matches_played_official || 0,
        })),
        dpr: data.filter(r => r.dpr !== null).map(r => ({
          teamNumber: r.team_number,
          dpr: r.dpr!,
          matchesPlayed: r.matches_played_official || 0,
        })),
        ccwm: data.filter(r => r.ccwm !== null).map(r => ({
          teamNumber: r.team_number,
          opr: r.opr || 0,
          dpr: r.dpr || 0,
          ccwm: r.ccwm!,
          matchesPlayed: r.matches_played_official || 0,
        })),
        calculatedAt: new Date(data[0].updated_at || Date.now()),
        eventKey,
        totalMatches: 0,
        warnings: [],
      };

      return metrics;
    } catch (error) {
      console.error('[OPRService] Error fetching cached metrics:', error);
      return null;
    }
  }

  /**
   * Check if cached data is still valid (within last hour)
   */
  private isCacheValid(calculatedAt: Date): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return calculatedAt > oneHourAgo;
  }

  /**
   * Clear cached metrics for an event
   */
  private async clearOPRCache(eventKey: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('team_statistics')
        .update({
          opr: null,
          dpr: null,
          ccwm: null,
        })
        .eq('event_key', eventKey);

      if (error) {
        console.error('[OPRService] Error clearing cache:', error);
      }
    } catch (error) {
      console.error('[OPRService] Error clearing cache:', error);
    }
  }

  /**
   * Calculate statistics for CCWM results
   */
  private calculateCCWMStatistics(teams: CCWMResult[]): CCWMCalculationResult['statistics'] {
    if (teams.length === 0) {
      return {
        averageOPR: 0,
        averageDPR: 0,
        averageCCWM: 0,
        medianCCWM: 0,
        stdDevCCWM: 0,
      };
    }

    const sumOPR = teams.reduce((sum, t) => sum + t.opr, 0);
    const sumDPR = teams.reduce((sum, t) => sum + t.dpr, 0);
    const sumCCWM = teams.reduce((sum, t) => sum + t.ccwm, 0);

    const averageOPR = sumOPR / teams.length;
    const averageDPR = sumDPR / teams.length;
    const averageCCWM = sumCCWM / teams.length;

    const sortedCCWM = teams.map(t => t.ccwm).sort((a, b) => a - b);
    const medianCCWM = sortedCCWM.length % 2 === 0
      ? (sortedCCWM[sortedCCWM.length / 2 - 1] + sortedCCWM[sortedCCWM.length / 2]) / 2
      : sortedCCWM[Math.floor(sortedCCWM.length / 2)];

    const variance = teams.reduce((sum, t) => sum + Math.pow(t.ccwm - averageCCWM, 2), 0) / teams.length;
    const stdDevCCWM = Math.sqrt(variance);

    return {
      averageOPR: Number(averageOPR.toFixed(2)),
      averageDPR: Number(averageDPR.toFixed(2)),
      averageCCWM: Number(averageCCWM.toFixed(2)),
      medianCCWM: Number(medianCCWM.toFixed(2)),
      stdDevCCWM: Number(stdDevCCWM.toFixed(2)),
    };
  }
}

/**
 * Factory function to create OPR Service
 */
export function createOPRService(
  matchRepo?: IMatchRepository,
  client?: SupabaseClient
): IOPRService {
  return new OPRService(matchRepo, client);
}

/**
 * Singleton instance
 */
let oprServiceInstance: IOPRService | null = null;

/**
 * Get singleton OPR Service instance
 */
export function getOPRService(
  matchRepo?: IMatchRepository,
  client?: SupabaseClient
): IOPRService {
  if (!oprServiceInstance) {
    oprServiceInstance = createOPRService(matchRepo, client);
  }
  return oprServiceInstance;
}