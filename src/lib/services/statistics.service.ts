/**
 * Statistics Service
 * Calculates and manages aggregate team statistics from scouting data
 *
 * Features:
 * - Game-agnostic calculations
 * - Multi-scout consolidation with SPR weighting
 * - Outlier detection and handling
 * - Trend analysis over time
 * - Percentile rankings within events
 */

import type {
  AggregatedStatistics,
  MatchScouting,
  TeamStatistics,
  ScoutingSubmission,
  JSONBData,
  AutoPerformance2025,
  TeleopPerformance2025,
  EndgamePerformance2025,
} from '@/types';
import type { IStatisticsRepository } from '@/lib/repositories/statistics.repository';
import type { IScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import type { IMatchRepository } from '@/lib/repositories/match.repository';
import {
  consolidateMatchScoutingObservations,
  calculateScoutWeights,
  detectOutliers,
  calculateTrend,
  weightedAverage,
  type ConsolidatedMatchScouting,
} from '@/lib/supabase/consolidation';
import {
  calculateAutoPoints,
  calculateTeleopPoints,
  calculateEndgamePoints,
} from '@/types/season-2025';

/**
 * Statistics service interface
 */
export interface IStatisticsService {
  calculateTeamStatistics(
    teamNumber: number,
    eventKey?: string
  ): Promise<AggregatedStatistics>;

  calculateAllTeamStatistics(
    eventKey?: string
  ): Promise<Map<number, AggregatedStatistics>>;

  updateTeamStatistics(
    teamNumber: number,
    eventKey?: string
  ): Promise<void>;

  getTeamStatistics(
    teamNumber: number,
    eventKey?: string
  ): Promise<AggregatedStatistics | null>;

  getEventStatistics(
    eventKey: string
  ): Promise<AggregatedStatistics[]>;
}

/**
 * Statistics service implementation
 */
export class StatisticsService implements IStatisticsService {
  constructor(
    private readonly statsRepo: IStatisticsRepository,
    private readonly scoutingRepo: IScoutingDataRepository,
    private readonly matchRepo: IMatchRepository
  ) {}

  /**
   * Calculate comprehensive statistics for a single team
   */
  async calculateTeamStatistics(
    teamNumber: number,
    eventKey?: string
  ): Promise<AggregatedStatistics> {
    // Fetch all scouting data for the team
    const scoutingData = await this.scoutingRepo.findByTeam(
      teamNumber,
      eventKey
    );

    // Fetch match schedule to get expected matches
    const matches = await this.matchRepo.findByTeam(teamNumber, eventKey);
    const expectedMatches = matches.filter(m => m.comp_level === 'qm').length;

    // Group scouting data by match for consolidation
    const scoutingByMatch = new Map<number, MatchScouting[]>();
    for (const scout of scoutingData) {
      const matchId = scout.match_id;
      if (!scoutingByMatch.has(matchId)) {
        scoutingByMatch.set(matchId, []);
      }
      scoutingByMatch.get(matchId)!.push(scout);
    }

    // Consolidate multi-scout observations per match
    const consolidatedMatches = Array.from(scoutingByMatch.entries()).map(
      ([matchId, observations]) => {
        return consolidateMatchScoutingObservations(observations);
      }
    );

    // Calculate statistics from consolidated data
    const stats = this.calculateAggregateStats(
      consolidatedMatches,
      teamNumber,
      eventKey || null,
      expectedMatches
    );

    // Calculate trends over time
    const trends = this.calculateTrends(consolidatedMatches);
    stats.trends = trends;

    // Save to database
    await this.statsRepo.upsertStatistics(teamNumber, eventKey || null, stats);

    return stats;
  }

  /**
   * Calculate statistics for all teams in an event
   */
  async calculateAllTeamStatistics(
    eventKey?: string
  ): Promise<Map<number, AggregatedStatistics>> {
    const statsMap = new Map<number, AggregatedStatistics>();

    // Get all teams with scouting data
    const teams = await this.scoutingRepo.getTeamsWithData(eventKey);

    // Calculate stats for each team
    for (const teamNumber of teams) {
      try {
        const stats = await this.calculateTeamStatistics(teamNumber, eventKey);
        statsMap.set(teamNumber, stats);
      } catch (error) {
        console.error(
          `Error calculating statistics for team ${teamNumber}:`,
          error
        );
      }
    }

    // Calculate percentile rankings within the event
    if (eventKey && statsMap.size > 1) {
      this.calculatePercentileRankings(statsMap);

      // Update database with percentile rankings
      for (const [teamNumber, stats] of statsMap.entries()) {
        await this.statsRepo.upsertStatistics(teamNumber, eventKey, stats);
      }
    }

    return statsMap;
  }

  /**
   * Update statistics for a team (called when new scouting data arrives)
   */
  async updateTeamStatistics(
    teamNumber: number,
    eventKey?: string
  ): Promise<void> {
    // Check if recalculation is needed
    const lastCalculated = await this.statsRepo.getLastCalculatedTime(
      teamNumber,
      eventKey
    );

    const latestScoutingTime = await this.scoutingRepo.getLatestScoutingTime(
      teamNumber,
      eventKey
    );

    if (
      !lastCalculated ||
      !latestScoutingTime ||
      latestScoutingTime > lastCalculated
    ) {
      // Recalculate statistics
      await this.calculateTeamStatistics(teamNumber, eventKey);
    }
  }

  /**
   * Get cached statistics for a team
   */
  async getTeamStatistics(
    teamNumber: number,
    eventKey?: string
  ): Promise<AggregatedStatistics | null> {
    const stats = await this.statsRepo.findByTeam(teamNumber, eventKey);

    if (!stats || !stats.aggregated_metrics) {
      return null;
    }

    return stats.aggregated_metrics as AggregatedStatistics;
  }

  /**
   * Get statistics for all teams at an event
   */
  async getEventStatistics(eventKey: string): Promise<AggregatedStatistics[]> {
    const teamStats = await this.statsRepo.findByEvent(eventKey);

    return teamStats
      .map(ts => ts.aggregated_metrics as AggregatedStatistics)
      .filter(stats => stats !== null);
  }

  /**
   * Calculate aggregate statistics from consolidated match data
   */
  private calculateAggregateStats(
    consolidatedMatches: ConsolidatedMatchScouting[],
    teamNumber: number,
    eventKey: string | null,
    expectedMatches: number
  ): AggregatedStatistics {
    const matchesPlayed = consolidatedMatches.length;

    // Extract point values from each match
    const autoPoints: number[] = [];
    const teleopPoints: number[] = [];
    const endgamePoints: number[] = [];
    const cycleData: number[] = [];
    const defenseRatings: number[] = [];

    for (const match of consolidatedMatches) {
      // Calculate points for each period (game-specific)
      const auto = match.auto_performance;
      const teleop = match.teleop_performance;
      const endgame = match.endgame_performance;

      // Try to calculate points using current season's functions
      try {
        autoPoints.push(calculateAutoPoints(auto as unknown as AutoPerformance2025));
        teleopPoints.push(calculateTeleopPoints(teleop as unknown as TeleopPerformance2025));
        endgamePoints.push(calculateEndgamePoints(endgame as unknown as EndgamePerformance2025));
      } catch {
        // Fallback for generic calculation
        autoPoints.push(this.extractPoints(auto, 'auto'));
        teleopPoints.push(this.extractPoints(teleop, 'teleop'));
        endgamePoints.push(this.extractPoints(endgame, 'endgame'));
      }

      // Extract cycle data if available
      if (teleop.cycles_completed !== undefined && typeof teleop.cycles_completed === 'number') {
        cycleData.push(teleop.cycles_completed);
      }

      // Extract defense ratings
      if (match.defense_rating !== undefined) {
        defenseRatings.push(match.defense_rating);
      }
    }

    // Detect and filter outliers
    const autoOutliers = detectOutliers(autoPoints);
    const teleopOutliers = detectOutliers(teleopPoints);
    const endgameOutliers = detectOutliers(endgamePoints);

    // Filter out outliers for statistics
    const filteredAuto = autoPoints.filter((_, i) => !autoOutliers[i]);
    const filteredTeleop = teleopPoints.filter((_, i) => !teleopOutliers[i]);
    const filteredEndgame = endgamePoints.filter((_, i) => !endgameOutliers[i]);

    // Calculate statistics
    const autoStats = this.calculatePeriodStats(filteredAuto);
    const teleopStats = this.calculateTeleopStats(filteredTeleop, cycleData);
    const endgameStats = this.calculateEndgameStats(
      filteredEndgame,
      consolidatedMatches
    );

    // Calculate reliability metrics
    const reliability = this.calculateReliability(
      consolidatedMatches,
      defenseRatings,
      matchesPlayed,
      expectedMatches
    );

    return {
      schema_version: '1.0',
      team_number: teamNumber,
      event_key: eventKey,
      matches_played: matchesPlayed,
      matches_expected: expectedMatches,
      auto_stats: autoStats,
      teleop_stats: teleopStats,
      endgame_stats: endgameStats,
      reliability: reliability,
      trends: {
        direction: 'stable',
        confidence: 0.5,
      },
      last_calculated: new Date().toISOString(),
    };
  }

  /**
   * Calculate statistics for a period (auto/teleop)
   */
  private calculatePeriodStats(points: number[]): AggregatedStatistics['auto_stats'] {
    if (points.length === 0) {
      return {
        avg_points: 0,
        std_dev: 0,
        min: 0,
        max: 0,
        consistency_score: 0,
      };
    }

    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    const variance = points.reduce((sum, p) =>
      sum + Math.pow(p - avg, 2), 0) / points.length;
    const stdDev = Math.sqrt(variance);

    // Consistency score: lower CV (coefficient of variation) = higher consistency
    const cv = avg > 0 ? stdDev / avg : 1;
    const consistencyScore = Math.max(0, Math.min(100, 100 * (1 - cv)));

    return {
      avg_points: Math.round(avg * 100) / 100,
      std_dev: Math.round(stdDev * 100) / 100,
      min: Math.min(...points),
      max: Math.max(...points),
      consistency_score: Math.round(consistencyScore),
    };
  }

  /**
   * Calculate teleop-specific statistics
   */
  private calculateTeleopStats(
    points: number[],
    cycles: number[]
  ): AggregatedStatistics['teleop_stats'] {
    const baseStats = this.calculatePeriodStats(points);

    const avgCycles = cycles.length > 0
      ? cycles.reduce((a, b) => a + b, 0) / cycles.length
      : 0;

    // Assume 135 seconds for teleop, calculate average cycle time
    const teleopDuration = 135; // seconds
    const avgCycleTime = avgCycles > 0 ? teleopDuration / avgCycles : 0;

    // Efficiency score: points per cycle
    const efficiency = avgCycles > 0
      ? (baseStats.avg_points / avgCycles) * 10
      : 0;

    return {
      ...baseStats,
      avg_cycles: Math.round(avgCycles * 10) / 10,
      avg_cycle_time: Math.round(avgCycleTime * 10) / 10,
      efficiency_score: Math.min(100, Math.round(efficiency)),
    };
  }

  /**
   * Calculate endgame-specific statistics
   */
  private calculateEndgameStats(
    points: number[],
    matches: ConsolidatedMatchScouting[]
  ): AggregatedStatistics['endgame_stats'] {
    const avgPoints = points.length > 0
      ? points.reduce((a, b) => a + b, 0) / points.length
      : 0;

    // Calculate success rate (endgame points > 0)
    const successCount = points.filter(p => p > 0).length;
    const successRate = matches.length > 0
      ? (successCount / matches.length) * 100
      : 0;

    return {
      avg_points: Math.round(avgPoints * 100) / 100,
      success_rate: Math.round(successRate),
    };
  }

  /**
   * Calculate reliability metrics
   */
  private calculateReliability(
    matches: ConsolidatedMatchScouting[],
    defenseRatings: number[],
    matchesPlayed: number,
    expectedMatches: number
  ): AggregatedStatistics['reliability'] {
    const playedPercentage = expectedMatches > 0
      ? (matchesPlayed / expectedMatches) * 100
      : 0;

    // Calculate breakdown rate from disabled/disconnected matches
    const breakdowns = matches.filter(m =>
      m.robot_disabled || m.robot_disconnected || m.robot_tipped
    ).length;
    const breakdownRate = matchesPlayed > 0
      ? (breakdowns / matchesPlayed) * 100
      : 0;

    // Average defense rating
    const avgDefense = defenseRatings.length > 0
      ? defenseRatings.reduce((a, b) => a + b, 0) / defenseRatings.length
      : 5; // Default to middle rating

    return {
      played_percentage: Math.round(playedPercentage),
      breakdown_rate: Math.round(breakdownRate),
      defense_rating: Math.round(avgDefense * 10) / 10,
    };
  }

  /**
   * Calculate trends over time
   */
  private calculateTrends(
    matches: ConsolidatedMatchScouting[]
  ): AggregatedStatistics['trends'] {
    if (matches.length < 3) {
      return {
        direction: 'stable',
        confidence: 0.5,
      };
    }

    // Sort matches by match_id (chronological order)
    const sortedMatches = [...matches].sort((a, b) => {
      return a.match_id - b.match_id;
    });

    // Calculate total points for each match
    const totalPoints = sortedMatches.map(m => {
      const auto = calculateAutoPoints(m.auto_performance as unknown as AutoPerformance2025) || 0;
      const teleop = calculateTeleopPoints(m.teleop_performance as unknown as TeleopPerformance2025) || 0;
      const endgame = calculateEndgamePoints(m.endgame_performance as unknown as EndgamePerformance2025) || 0;
      return auto + teleop + endgame;
    });

    // Analyze trend
    return calculateTrend(totalPoints);
  }

  /**
   * Calculate percentile rankings within an event
   */
  private calculatePercentileRankings(
    statsMap: Map<number, AggregatedStatistics>
  ): void {
    const allStats = Array.from(statsMap.values());
    const count = allStats.length;

    // Extract scores for ranking
    const autoScores = allStats.map(s => s.auto_stats.avg_points).sort((a, b) => a - b);
    const teleopScores = allStats.map(s => s.teleop_stats.avg_points).sort((a, b) => a - b);
    const endgameScores = allStats.map(s => s.endgame_stats.avg_points).sort((a, b) => a - b);
    const totalScores = allStats.map(s =>
      s.auto_stats.avg_points +
      s.teleop_stats.avg_points +
      s.endgame_stats.avg_points
    ).sort((a, b) => a - b);

    // Calculate percentiles for each team
    for (const stats of statsMap.values()) {
      const autoRank = this.getPercentile(stats.auto_stats.avg_points, autoScores);
      const teleopRank = this.getPercentile(stats.teleop_stats.avg_points, teleopScores);
      const endgameRank = this.getPercentile(stats.endgame_stats.avg_points, endgameScores);
      const totalPoints = stats.auto_stats.avg_points +
                          stats.teleop_stats.avg_points +
                          stats.endgame_stats.avg_points;
      const overallRank = this.getPercentile(totalPoints, totalScores);

      stats.percentile_rankings = {
        auto: Math.round(autoRank),
        teleop: Math.round(teleopRank),
        endgame: Math.round(endgameRank),
        overall: Math.round(overallRank),
      };
    }
  }

  /**
   * Get percentile rank for a value in a sorted array
   */
  private getPercentile(value: number, sortedArray: number[]): number {
    const index = sortedArray.findIndex(v => v >= value);
    if (index === -1) return 100;
    return (index / sortedArray.length) * 100;
  }

  /**
   * Extract points from generic JSONB data
   * Fallback when season-specific functions aren't available
   */
  private extractPoints(data: JSONBData, period: string): number {
    // Look for common point field names
    const pointFields = ['points', 'total_points', `${period}_points`, 'score'];

    for (const field of pointFields) {
      if (typeof data[field] === 'number') {
        return data[field] as number;
      }
    }

    // Sum up any numeric fields that might be points
    let total = 0;
    for (const [key, value] of Object.entries(data)) {
      if (
        typeof value === 'number' &&
        !key.includes('time') &&
        !key.includes('rating') &&
        !key.includes('count')
      ) {
        total += value;
      }
    }

    return total;
  }
}

// Factory function to create service instance
export function createStatisticsService(
  statsRepo: IStatisticsRepository,
  scoutingRepo: IScoutingDataRepository,
  matchRepo: IMatchRepository
): IStatisticsService {
  return new StatisticsService(statsRepo, scoutingRepo, matchRepo);
}