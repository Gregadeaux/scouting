/**
 * Statistics Repository
 * Manages team_statistics table for aggregated analytics
 */

import { createClient } from '@/lib/supabase/server';
import type { AggregatedStatistics, TeamStatistics } from '@/types';

/**
 * Statistics repository interface
 */
export interface IStatisticsRepository {
  findByTeam(
    teamNumber: number,
    eventKey?: string
  ): Promise<TeamStatistics | null>;

  findByEvent(
    eventKey: string
  ): Promise<TeamStatistics[]>;

  upsertStatistics(
    teamNumber: number,
    eventKey: string | null,
    stats: AggregatedStatistics
  ): Promise<TeamStatistics>;

  bulkUpsertStatistics(
    statistics: Array<{
      teamNumber: number;
      eventKey: string | null;
      stats: AggregatedStatistics;
    }>
  ): Promise<TeamStatistics[]>;

  deleteStatistics(
    teamNumber: number,
    eventKey?: string
  ): Promise<void>;

  getLastCalculatedTime(
    teamNumber: number,
    eventKey?: string
  ): Promise<Date | null>;
}

/**
 * Statistics repository implementation
 */
export class StatisticsRepository implements IStatisticsRepository {
  /**
   * Find statistics for a specific team and optionally event
   */
  async findByTeam(
    teamNumber: number,
    eventKey?: string
  ): Promise<TeamStatistics | null> {
    const supabase = await createClient();

    const query = supabase
      .from('team_statistics')
      .select('*')
      .eq('team_number', teamNumber);

    if (eventKey) {
      query.eq('event_key', eventKey);
    } else {
      query.is('event_key', null);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching team statistics:', error);
      throw error;
    }

    return data as TeamStatistics;
  }

  /**
   * Find all statistics for an event
   */
  async findByEvent(eventKey: string): Promise<TeamStatistics[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('team_statistics')
      .select('*')
      .eq('event_key', eventKey)
      .order('overall_rank', { ascending: true });

    if (error) {
      console.error('Error fetching event statistics:', error);
      throw error;
    }

    return data as TeamStatistics[];
  }

  /**
   * Upsert statistics for a team
   */
  async upsertStatistics(
    teamNumber: number,
    eventKey: string | null,
    stats: AggregatedStatistics
  ): Promise<TeamStatistics> {
    const supabase = await createClient();

    // Map AggregatedStatistics to TeamStatistics table structure
    const teamStats: Partial<TeamStatistics> = {
      team_number: teamNumber,
      event_key: eventKey || undefined,

      // Match counts
      matches_scouted: stats.matches_played,
      matches_played_official: stats.matches_expected,

      // Average scores
      avg_total_score: stats.auto_stats.avg_points +
                       stats.teleop_stats.avg_points +
                       stats.endgame_stats.avg_points,
      avg_auto_score: stats.auto_stats.avg_points,
      avg_teleop_score: stats.teleop_stats.avg_points,
      avg_endgame_score: stats.endgame_stats.avg_points,

      // Success rates
      endgame_success_rate: stats.endgame_stats.success_rate,
      reliability_score: 100 - stats.reliability.breakdown_rate,

      // Qualitative averages
      avg_defense_rating: stats.reliability.defense_rating,

      // Store full stats in JSONB column
      aggregated_metrics: stats,

      // Calculation metadata
      last_calculated_at: stats.last_calculated,
      calculation_method: 'SPR-weighted consolidation v1.0',
    };

    const { data, error } = await supabase
      .from('team_statistics')
      .upsert(teamStats, {
        onConflict: eventKey
          ? 'team_number,event_key'
          : 'team_number',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting team statistics:', error);
      throw error;
    }

    return data as TeamStatistics;
  }

  /**
   * Bulk upsert statistics
   */
  async bulkUpsertStatistics(
    statistics: Array<{
      teamNumber: number;
      eventKey: string | null;
      stats: AggregatedStatistics;
    }>
  ): Promise<TeamStatistics[]> {
    const supabase = await createClient();

    // Map all statistics to database format
    const teamStatsList = statistics.map(({ teamNumber, eventKey, stats }) => ({
      team_number: teamNumber,
      event_key: eventKey || undefined,

      // Match counts
      matches_scouted: stats.matches_played,
      matches_played_official: stats.matches_expected,

      // Average scores
      avg_total_score: stats.auto_stats.avg_points +
                       stats.teleop_stats.avg_points +
                       stats.endgame_stats.avg_points,
      avg_auto_score: stats.auto_stats.avg_points,
      avg_teleop_score: stats.teleop_stats.avg_points,
      avg_endgame_score: stats.endgame_stats.avg_points,

      // Success rates
      endgame_success_rate: stats.endgame_stats.success_rate,
      reliability_score: 100 - stats.reliability.breakdown_rate,

      // Qualitative averages
      avg_defense_rating: stats.reliability.defense_rating,

      // Store full stats in JSONB column
      aggregated_metrics: stats as unknown as Record<string, unknown>,

      // Calculation metadata
      last_calculated_at: stats.last_calculated,
      calculation_method: 'SPR-weighted consolidation v1.0',
    }));

    const { data, error } = await supabase
      .from('team_statistics')
      .upsert(teamStatsList, {
        onConflict: 'team_number,event_key',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Error bulk upserting team statistics:', error);
      throw error;
    }

    return data as TeamStatistics[];
  }

  /**
   * Delete statistics for a team
   */
  async deleteStatistics(
    teamNumber: number,
    eventKey?: string
  ): Promise<void> {
    const supabase = await createClient();

    const query = supabase
      .from('team_statistics')
      .delete()
      .eq('team_number', teamNumber);

    if (eventKey) {
      query.eq('event_key', eventKey);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting team statistics:', error);
      throw error;
    }
  }

  /**
   * Get the last calculated time for a team's statistics
   */
  async getLastCalculatedTime(
    teamNumber: number,
    eventKey?: string
  ): Promise<Date | null> {
    const stats = await this.findByTeam(teamNumber, eventKey);

    if (!stats || !stats.last_calculated_at) {
      return null;
    }

    return new Date(stats.last_calculated_at);
  }
}

// Factory function to create repository instance
export function createStatisticsRepository(): IStatisticsRepository {
  return new StatisticsRepository();
}

// Export singleton instance
export const statisticsRepository = new StatisticsRepository();