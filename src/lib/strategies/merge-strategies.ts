/**
 * Merge strategies for TBA import operations
 * Defines how to merge TBA data with local database records
 */

import type { Team, Event, EventType, MatchSchedule } from '@/types';
import type { TBATeam, TBAEvent, TBAMatch } from '@/types/tba';

/**
 * Generic merge strategy interface
 */
export interface IMergeStrategy<TLocal, TTBA> {
  merge(local: TLocal | null, tba: TTBA): Partial<TLocal>;
}

/**
 * Team Merge Strategy
 * Strategy: TBA is source of truth for official data,
 * but preserve any local customizations (notes, custom_data)
 */
export class TeamMergeStrategy implements IMergeStrategy<Team, TBATeam> {
  merge(local: Team | null, tba: TBATeam): Partial<Team> {
    return {
      team_number: tba.team_number,
      team_key: tba.key,
      team_name: tba.nickname || tba.name,
      team_nickname: tba.nickname,
      city: tba.city || local?.city,
      state_province: tba.state_prov || local?.state_province,
      country: tba.country || local?.country,
      postal_code: tba.postal_code || local?.postal_code,
      rookie_year: tba.rookie_year || local?.rookie_year,
      website: tba.website || local?.website,
      // Note: If we had notes/custom_data fields, we'd preserve them here:
      // notes: local?.notes,
      // custom_data: local?.custom_data,
    };
  }
}

/**
 * Event Merge Strategy
 * Strategy: TBA is source of truth for all event data
 */
export class EventMergeStrategy implements IMergeStrategy<Event, TBAEvent> {
  merge(local: Event | null, tba: TBAEvent): Partial<Event> {
    return {
      event_key: tba.key,
      event_name: tba.name,
      event_code: tba.event_code,
      year: tba.year,
      event_type: this.mapEventType(tba.event_type),
      district: tba.district?.abbreviation || undefined,
      week: tba.week || undefined,
      city: tba.city,
      state_province: tba.state_prov,
      country: tba.country,
      start_date: tba.start_date,
      end_date: tba.end_date,
      // Preserve website from local if TBA doesn't have it
      // website: tba.website || local?.website,
    };
  }

  /**
   * Map TBA event type codes to our EventType enum
   * See: https://www.thebluealliance.com/apidocs/v3
   */
  private mapEventType(tbaEventType: number): EventType {
    const mapping: Record<number, EventType> = {
      0: 'regional',
      1: 'district',
      2: 'district_championship',
      3: 'championship_subdivision',
      4: 'championship',
      5: 'district_championship', // District Championship Division
      6: 'offseason', // Festival of Champions
      99: 'offseason',
      100: 'offseason', // Preseason
    };
    return mapping[tbaEventType] || 'offseason';
  }
}

/**
 * Match Merge Strategy
 * Strategy: TBA is source of truth for schedule and scores,
 * never touch scouting data (it's in a separate table)
 */
export class MatchMergeStrategy implements IMergeStrategy<MatchSchedule, TBAMatch> {
  merge(local: MatchSchedule | null, tba: TBAMatch): Partial<MatchSchedule> {
    // Determine winning alliance
    let winningAlliance: 'red' | 'blue' | 'tie' | undefined;
    if (tba.alliances.red.score >= 0 && tba.alliances.blue.score >= 0) {
      if (tba.alliances.red.score > tba.alliances.blue.score) {
        winningAlliance = 'red';
      } else if (tba.alliances.blue.score > tba.alliances.red.score) {
        winningAlliance = 'blue';
      } else {
        winningAlliance = 'tie';
      }
    }

    return {
      match_key: tba.key,
      event_key: tba.event_key,
      comp_level: tba.comp_level,
      set_number: tba.set_number || undefined,
      match_number: tba.match_number,

      // Alliance composition
      red_1: this.extractTeamNumber(tba.alliances.red.team_keys[0]),
      red_2: this.extractTeamNumber(tba.alliances.red.team_keys[1]),
      red_3: this.extractTeamNumber(tba.alliances.red.team_keys[2]),
      blue_1: this.extractTeamNumber(tba.alliances.blue.team_keys[0]),
      blue_2: this.extractTeamNumber(tba.alliances.blue.team_keys[1]),
      blue_3: this.extractTeamNumber(tba.alliances.blue.team_keys[2]),

      // Scores (only if match has been played)
      red_score: tba.alliances.red.score >= 0 ? tba.alliances.red.score : undefined,
      blue_score: tba.alliances.blue.score >= 0 ? tba.alliances.blue.score : undefined,
      winning_alliance: winningAlliance,

      // Timing information
      scheduled_time: tba.time ? this.unixToISO(tba.time) : undefined,
      actual_time: tba.actual_time ? this.unixToISO(tba.actual_time) : undefined,
      post_result_time: tba.post_result_time ? this.unixToISO(tba.post_result_time) : undefined,
    };
  }

  /**
   * Extract team number from team key (e.g., "frc930" -> 930)
   */
  private extractTeamNumber(teamKey: string): number | undefined {
    if (!teamKey) return undefined;
    const match = teamKey.match(/frc(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Convert Unix timestamp to ISO string
   */
  private unixToISO(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString();
  }
}

/**
 * Factory functions for creating merge strategies
 */
export function createTeamMergeStrategy(): TeamMergeStrategy {
  return new TeamMergeStrategy();
}

export function createEventMergeStrategy(): EventMergeStrategy {
  return new EventMergeStrategy();
}

export function createMatchMergeStrategy(): MatchMergeStrategy {
  return new MatchMergeStrategy();
}

/**
 * Default merge strategies export
 */
export const MergeStrategies = {
  team: new TeamMergeStrategy(),
  event: new EventMergeStrategy(),
  match: new MatchMergeStrategy(),
} as const;
