/**
 * Pick List Service
 *
 * Generates ranked pick lists for alliance selection using OPR, DPR, CCWM,
 * scouting observations, and reliability metrics.
 *
 * Features:
 * - Pre-built strategies (BALANCED, OFFENSIVE, DEFENSIVE, RELIABLE)
 * - Custom strategy support
 * - CSV export
 * - Team picked status tracking
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PickList,
  PickListTeam,
  PickListStrategy,
  PickListWeights,
  PickListOptions,
  PickListMetadata,
} from '@/types/picklist';
import {
  rankTeams,
  validateWeights,
  calculatePickListStatistics,
  type RawTeamData,
} from '@/lib/algorithms/picklist';

/**
 * Pre-built pick list strategies
 */
export const PICK_LIST_STRATEGIES: Record<string, PickListStrategy> = {
  BALANCED: {
    id: 'BALANCED',
    name: 'Balanced',
    description: 'Equal emphasis on all metrics for well-rounded teams',
    weights: {
      opr: 0.15,
      dpr: 0.10,
      ccwm: 0.25, // CCWM is most important in balanced
      autoScore: 0.10,
      teleopScore: 0.10,
      endgameScore: 0.10,
      reliability: 0.10,
      driverSkill: 0.05,
      defenseRating: 0.03,
      speedRating: 0.02,
    },
  },

  OFFENSIVE: {
    id: 'OFFENSIVE',
    name: 'Offensive',
    description: 'Prioritizes scoring ability and offensive output',
    weights: {
      opr: 0.30, // High weight on offensive output
      dpr: 0.05,
      ccwm: 0.20,
      autoScore: 0.15, // Strong auto is offensive advantage
      teleopScore: 0.15, // High teleop scoring
      endgameScore: 0.05,
      reliability: 0.05,
      driverSkill: 0.03,
      defenseRating: 0.01,
      speedRating: 0.01,
    },
  },

  DEFENSIVE: {
    id: 'DEFENSIVE',
    name: 'Defensive',
    description: 'Prioritizes defensive capability and reliability',
    weights: {
      opr: 0.10,
      dpr: 0.30, // High weight on defense (low DPR)
      ccwm: 0.15,
      autoScore: 0.05,
      teleopScore: 0.05,
      endgameScore: 0.15, // Endgame often defensive
      reliability: 0.15, // Defensive teams must be reliable
      driverSkill: 0.03,
      defenseRating: 0.01,
      speedRating: 0.01,
    },
  },

  RELIABLE: {
    id: 'RELIABLE',
    name: 'Reliable',
    description: 'Prioritizes consistency and reliability over peak performance',
    weights: {
      opr: 0.10,
      dpr: 0.10,
      ccwm: 0.20,
      autoScore: 0.10,
      teleopScore: 0.10,
      endgameScore: 0.15, // Consistent endgame is critical
      reliability: 0.20, // Highest weight on reliability
      driverSkill: 0.03,
      defenseRating: 0.01,
      speedRating: 0.01,
    },
  },
};

/**
 * Pick List Service Interface
 */
export interface IPickListService {
  /**
   * Generate pick list for an event using a pre-built strategy
   */
  generatePickList(
    eventKey: string,
    strategyId: string,
    options?: PickListOptions
  ): Promise<PickList>;

  /**
   * Generate pick list with custom weights
   */
  generateCustomPickList(
    eventKey: string,
    weights: PickListWeights,
    options?: PickListOptions
  ): Promise<PickList>;

  /**
   * Mark a team as picked in alliance selection
   */
  markTeamAsPicked(pickList: PickList, teamNumber: number): PickList;

  /**
   * Export pick list to CSV string
   */
  exportToCSV(pickList: PickList): string;

  /**
   * Get available strategies
   */
  getStrategies(): PickListStrategy[];
}

/**
 * Pick List Service Implementation
 */
export class PickListService implements IPickListService {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  /**
   * Generate pick list for an event using a pre-built strategy
   */
  async generatePickList(
    eventKey: string,
    strategyId: string,
    options?: PickListOptions
  ): Promise<PickList> {
    console.log(`[PickListService] Generating pick list for ${eventKey} with strategy ${strategyId}`);

    // Validate strategy exists
    const strategy = PICK_LIST_STRATEGIES[strategyId];
    if (!strategy) {
      throw new Error(
        `Unknown strategy: ${strategyId}. Available: ${Object.keys(PICK_LIST_STRATEGIES).join(', ')}`
      );
    }

    return this.generateCustomPickList(eventKey, strategy.weights, options, strategy);
  }

  /**
   * Generate pick list with custom weights
   */
  async generateCustomPickList(
    eventKey: string,
    weights: PickListWeights,
    options: PickListOptions = {},
    strategy?: PickListStrategy
  ): Promise<PickList> {
    console.log(`[PickListService] Generating custom pick list for ${eventKey}`);

    // Validate weights
    const validation = validateWeights(weights);
    const warnings: string[] = [...validation.warnings];

    if (!validation.valid) {
      console.warn('[PickListService] Weight validation warnings:', warnings);
    }

    // Set default options
    const minMatches = options.minMatches ?? 5;
    const includePicked = options.includePicked ?? false;

    // Fetch event info
    const { data: event, error: eventError } = await this.client
      .from('events')
      .select('event_key, event_name, year')
      .eq('event_key', eventKey)
      .single();

    if (eventError || !event) {
      throw new Error(`Event not found: ${eventKey}`);
    }

    // Fetch team statistics with team names
    const rawTeams = await this.fetchTeamData(eventKey);

    if (rawTeams.length === 0) {
      throw new Error(
        `No team statistics found for event ${eventKey}. ` +
          `Have you calculated OPR/DPR/CCWM for this event?`
      );
    }

    console.log(`[PickListService] Found ${rawTeams.length} teams with statistics`);

    // Fetch scouting notes for qualitative insights
    const scoutingNotes = await this.fetchScoutingNotes(eventKey);

    // Merge notes into raw teams
    rawTeams.forEach(team => {
      const notes = scoutingNotes.get(team.teamNumber);
      if (notes) {
        team.notes = notes;
      }
    });

    // Count teams filtered out
    const totalTeams = rawTeams.length;
    const teamsBeforeFilter = rawTeams.length;
    const teamsFiltered = rawTeams.filter(t => t.matchesPlayed < minMatches).length;

    // Generate rankings
    const rankedTeams = rankTeams(rawTeams, weights, minMatches);

    if (rankedTeams.length === 0) {
      warnings.push(
        `No teams met the minimum matches criteria (${minMatches} matches). ` +
          `Consider lowering the threshold.`
      );
    }

    // Calculate statistics
    const stats = calculatePickListStatistics(rankedTeams);

    // Create metadata
    const metadata: PickListMetadata = {
      ...stats,
      teamsFiltered,
      warnings,
    };

    // Create strategy if not provided (custom strategy)
    const finalStrategy: PickListStrategy = strategy || {
      id: 'CUSTOM',
      name: 'Custom Strategy',
      description: 'User-defined custom weight configuration',
      weights,
    };

    const pickList: PickList = {
      eventKey,
      eventName: event.event_name,
      year: event.year,
      teams: rankedTeams,
      strategy: finalStrategy,
      generatedAt: new Date(),
      totalTeams,
      minMatchesFilter: minMatches,
      metadata,
    };

    console.log(
      `[PickListService] Pick list generated with ${rankedTeams.length} teams (${teamsFiltered} filtered out)`
    );

    return pickList;
  }

  /**
   * Mark a team as picked in alliance selection
   */
  markTeamAsPicked(pickList: PickList, teamNumber: number): PickList {
    const updatedTeams = pickList.teams.map(team =>
      team.teamNumber === teamNumber ? { ...team, picked: true } : team
    );

    return {
      ...pickList,
      teams: updatedTeams,
    };
  }

  /**
   * Export pick list to CSV string
   */
  exportToCSV(pickList: PickList): string {
    const headers = [
      'Rank',
      'Team',
      'Team Name',
      'Nickname',
      'Score',
      'OPR',
      'DPR',
      'CCWM',
      'Matches',
      'Avg Auto',
      'Avg Teleop',
      'Avg Endgame',
      'Reliability %',
      'Driver Skill',
      'Defense',
      'Speed',
      'Strengths',
      'Weaknesses',
      'Picked',
    ];

    const rows = pickList.teams.map(team => [
      team.rank.toString(),
      team.teamNumber.toString(),
      team.teamName || '',
      team.teamNickname || '',
      team.compositeScore.toFixed(4),
      team.opr.toFixed(2),
      team.dpr.toFixed(2),
      team.ccwm.toFixed(2),
      team.matchesPlayed.toString(),
      team.avgAutoScore?.toFixed(1) || 'N/A',
      team.avgTeleopScore?.toFixed(1) || 'N/A',
      team.avgEndgameScore?.toFixed(1) || 'N/A',
      team.reliabilityScore?.toFixed(0) || 'N/A',
      team.avgDriverSkill?.toFixed(1) || 'N/A',
      team.avgDefenseRating?.toFixed(1) || 'N/A',
      team.avgSpeedRating?.toFixed(1) || 'N/A',
      team.strengths.join('; '),
      team.weaknesses.join('; '),
      team.picked ? 'Yes' : 'No',
    ]);

    // Build CSV
    const csvLines = [
      `# Pick List: ${pickList.eventName || pickList.eventKey}`,
      `# Strategy: ${pickList.strategy.name}`,
      `# Generated: ${pickList.generatedAt.toISOString()}`,
      `# Total Teams: ${pickList.totalTeams}, Ranked: ${pickList.teams.length}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => this.escapeCSVCell(cell)).join(',')),
    ];

    return csvLines.join('\n');
  }

  /**
   * Get available strategies
   */
  getStrategies(): PickListStrategy[] {
    return Object.values(PICK_LIST_STRATEGIES);
  }

  /**
   * Fetch team data from database
   */
  private async fetchTeamData(eventKey: string): Promise<RawTeamData[]> {
    // Join team_statistics with teams table for names
    const { data, error } = await this.client
      .from('team_statistics')
      .select(
        `
        team_number,
        matches_played_official,
        opr,
        dpr,
        ccwm,
        avg_total_score,
        avg_auto_score,
        avg_teleop_score,
        avg_endgame_score,
        reliability_score,
        avg_defense_rating,
        avg_driver_skill,
        avg_speed_rating,
        teams:team_number (
          team_name,
          team_nickname
        )
      `
      )
      .eq('event_key', eventKey)
      .not('opr', 'is', null) // Must have OPR calculated
      .not('dpr', 'is', null) // Must have DPR calculated
      .not('ccwm', 'is', null); // Must have CCWM calculated

    if (error) {
      console.error('[PickListService] Error fetching team data:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform to RawTeamData
    const rawTeams: RawTeamData[] = data.map(row => {
      // Handle the teams relation (can be array or single object)
      const teams = Array.isArray(row.teams) ? row.teams[0] : row.teams;

      return {
        teamNumber: row.team_number,
        teamName: teams?.team_name,
        teamNickname: teams?.team_nickname,
        matchesPlayed: row.matches_played_official || 0,
        opr: row.opr!,
        dpr: row.dpr!,
        ccwm: row.ccwm!,
        avgTotalScore: row.avg_total_score ?? undefined,
        avgAutoScore: row.avg_auto_score ?? undefined,
        avgTeleopScore: row.avg_teleop_score ?? undefined,
        avgEndgameScore: row.avg_endgame_score ?? undefined,
        reliabilityScore: row.reliability_score ?? undefined,
        avgDefenseRating: row.avg_defense_rating ?? undefined,
        avgDriverSkill: row.avg_driver_skill ?? undefined,
        avgSpeedRating: row.avg_speed_rating ?? undefined,
      };
    });

    return rawTeams;
  }

  /**
   * Fetch aggregated scouting notes for teams at an event
   */
  private async fetchScoutingNotes(eventKey: string): Promise<Map<number, string>> {
    const { data, error } = await this.client
      .from('match_scouting')
      .select('team_number, notes, strengths, weaknesses')
      .eq('match_key', eventKey)
      .not('notes', 'is', null);

    if (error) {
      console.error('[PickListService] Error fetching scouting notes:', error);
      return new Map();
    }

    if (!data || data.length === 0) {
      return new Map();
    }

    // Aggregate notes by team
    const notesMap = new Map<number, string[]>();

    data.forEach(row => {
      const existing = notesMap.get(row.team_number) || [];

      if (row.strengths) {
        existing.push(`Strengths: ${row.strengths}`);
      }
      if (row.weaknesses) {
        existing.push(`Weaknesses: ${row.weaknesses}`);
      }
      if (row.notes) {
        existing.push(row.notes);
      }

      notesMap.set(row.team_number, existing);
    });

    // Join notes for each team
    const finalMap = new Map<number, string>();
    notesMap.forEach((notes, teamNumber) => {
      finalMap.set(teamNumber, notes.join(' | '));
    });

    return finalMap;
  }

  /**
   * Escape a CSV cell (handle commas, quotes, newlines)
   */
  private escapeCSVCell(cell: string): string {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }
}

/**
 * Factory function to create Pick List Service
 */
export function createPickListService(client?: SupabaseClient): IPickListService {
  return new PickListService(client);
}

/**
 * Singleton instance
 */
let pickListServiceInstance: IPickListService | null = null;

/**
 * Get singleton Pick List Service instance
 */
export function getPickListService(client?: SupabaseClient): IPickListService {
  if (!pickListServiceInstance) {
    pickListServiceInstance = createPickListService(client);
  }
  return pickListServiceInstance;
}
