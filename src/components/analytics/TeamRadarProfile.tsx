/**
 * Team Radar Profile Component
 *
 * Displays individual radar charts for top teams by selected metric.
 * Each team gets their own radar chart showing 6 metrics:
 * - OPR, CCWM, Auto, Teleop, Endgame, Reliability
 *
 * All metrics are normalized to 0-100 scale relative to event maximum.
 * Uses vibrant colors for better readability (blue, green, amber, red, violet).
 *
 * Related: SCOUT-90
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import type { TeamStatistics } from '@/types';

export type SortMetric = 'opr' | 'ccwm' | 'auto' | 'teleop' | 'endgame' | 'reliability';

interface TeamRadarProfileProps {
  eventKey: string;
  topTeamsCount?: number; // Default to 5
  sortBy?: SortMetric; // Default to 'opr'
  teams?: TeamStatistics[]; // Optional: provide pre-filtered teams instead of fetching all
  teamColors?: Record<number, string>; // Optional: map team numbers to colors (e.g., for alliance coloring)
}

interface RadarDataPoint {
  metric: string;
  value: number;
  fullValue: string; // Original value for display
}

// Vibrant colors for radar charts - each team gets a distinct color
const RADAR_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
];

// Metric display names
const METRIC_LABELS: Record<SortMetric, string> = {
  opr: 'OPR',
  ccwm: 'CCWM',
  auto: 'Auto Score',
  teleop: 'Teleop Score',
  endgame: 'Endgame Score',
  reliability: 'Reliability',
};

export function TeamRadarProfile({ eventKey, topTeamsCount = 5, sortBy = 'opr', teams, teamColors }: TeamRadarProfileProps) {
  const [teamStats, setTeamStats] = useState<TeamStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/event/${eventKey}`);
      const data = await response.json();

      if (data.success && data.data) {
        setTeamStats(data.data);
      } else {
        setError(data.error || 'Failed to load team statistics');
      }
    } catch (err) {
      console.error('[TeamRadarProfile] Error fetching data:', err);
      setError('Failed to load team statistics');
    } finally {
      setIsLoading(false);
    }
  }, [eventKey]);

  useEffect(() => {
    if (teams) {
      // Use provided teams array
      setTeamStats(teams);
      setIsLoading(false);
    } else {
      // Fetch all teams for event
      fetchTeamStats();
    }
  }, [eventKey, teams, fetchTeamStats]);

  // Get the value for a given metric from TeamStatistics
  const getMetricValue = (team: TeamStatistics, metric: SortMetric): number => {
    switch (metric) {
      case 'opr':
        return team.opr || 0;
      case 'ccwm':
        return team.ccwm || 0;
      case 'auto':
        return team.avg_auto_score || 0;
      case 'teleop':
        return team.avg_teleop_score || 0;
      case 'endgame':
        return team.avg_endgame_score || 0;
      case 'reliability':
        return team.reliability_score || 0;
    }
  };

  // Sort teams by selected metric
  const sortedTeams = [...teamStats]
    .sort((a, b) => getMetricValue(b, sortBy) - getMetricValue(a, sortBy))
    .slice(0, topTeamsCount);

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Loading team profiles...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive">
        <p className="text-destructive">{error}</p>
      </Card>
    );
  }

  if (teamStats.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No team statistics available for this event yet.
        </p>
      </Card>
    );
  }

  // Detect if component OPR data exists (2026+)
  const hasComponentOPR = teamStats.some(
    (t) => t.auto_opr != null || t.teleop_hub_opr != null || t.endgame_opr != null
  );

  // Calculate max values across ALL teams for normalization (not just top N)
  const maxOPR = Math.max(...teamStats.map(s => s.opr || 0), 1);
  const maxCCWM = Math.max(...teamStats.map(s => s.ccwm || 0), 1);
  const maxReliability = 100;

  // 2025 max values
  const maxAuto = Math.max(...teamStats.map(s => s.avg_auto_score || 0), 1);
  const maxTeleop = Math.max(...teamStats.map(s => s.avg_teleop_score || 0), 1);
  const maxEndgame = Math.max(...teamStats.map(s => s.avg_endgame_score || 0), 1);

  // 2026 max values
  const maxAutoOPR = Math.max(...teamStats.map(s => s.auto_opr || 0), 1);
  const maxTeleopOPR = Math.max(...teamStats.map(s => s.teleop_hub_opr || 0), 1);
  const maxEndgameOPR = Math.max(...teamStats.map(s => s.endgame_opr || 0), 1);

  // Prepare radar data for each team
  const prepareRadarData = (team: TeamStatistics): RadarDataPoint[] => {
    if (hasComponentOPR) {
      return [
        {
          metric: 'OPR',
          value: ((team.opr || 0) / maxOPR) * 100,
          fullValue: team.opr?.toFixed(1) || 'N/A',
        },
        {
          metric: 'CCWM',
          value: ((team.ccwm || 0) / maxCCWM) * 100,
          fullValue: team.ccwm?.toFixed(1) || 'N/A',
        },
        {
          metric: 'Auto OPR',
          value: ((team.auto_opr || 0) / maxAutoOPR) * 100,
          fullValue: team.auto_opr?.toFixed(1) || 'N/A',
        },
        {
          metric: 'Teleop OPR',
          value: ((team.teleop_hub_opr || 0) / maxTeleopOPR) * 100,
          fullValue: team.teleop_hub_opr?.toFixed(1) || 'N/A',
        },
        {
          metric: 'Endgame OPR',
          value: ((team.endgame_opr || 0) / maxEndgameOPR) * 100,
          fullValue: team.endgame_opr?.toFixed(1) || 'N/A',
        },
        {
          metric: 'Reliability',
          value: ((team.reliability_score || 0) / maxReliability) * 100,
          fullValue: `${team.reliability_score?.toFixed(0) || 'N/A'}%`,
        },
      ];
    }

    return [
      {
        metric: 'OPR',
        value: ((team.opr || 0) / maxOPR) * 100,
        fullValue: team.opr?.toFixed(1) || 'N/A',
      },
      {
        metric: 'CCWM',
        value: ((team.ccwm || 0) / maxCCWM) * 100,
        fullValue: team.ccwm?.toFixed(1) || 'N/A',
      },
      {
        metric: 'Auto',
        value: ((team.avg_auto_score || 0) / maxAuto) * 100,
        fullValue: team.avg_auto_score?.toFixed(1) || 'N/A',
      },
      {
        metric: 'Teleop',
        value: ((team.avg_teleop_score || 0) / maxTeleop) * 100,
        fullValue: team.avg_teleop_score?.toFixed(1) || 'N/A',
      },
      {
        metric: 'Endgame',
        value: ((team.avg_endgame_score || 0) / maxEndgame) * 100,
        fullValue: team.avg_endgame_score?.toFixed(1) || 'N/A',
      },
      {
        metric: 'Reliability',
        value: ((team.reliability_score || 0) / maxReliability) * 100,
        fullValue: `${team.reliability_score?.toFixed(0) || 'N/A'}%`,
      },
    ];
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {teams ? `Team Performance by ${METRIC_LABELS[sortBy]}` : `Top ${topTeamsCount} Teams by ${METRIC_LABELS[sortBy]}`}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Render individual radar chart for each team */}
        {sortedTeams.map((team, index) => {
          const radarData = prepareRadarData(team);
          const sortedMetricValue = getMetricValue(team, sortBy);

          // Use team-specific color if provided, otherwise use default colors
          const teamColor = teamColors?.[team.team_number] || RADAR_COLORS[index % RADAR_COLORS.length];
          const isRedAlliance = teamColor.includes('ef4444') || teamColor.includes('red');
          const isBlueAlliance = teamColor.includes('3b82f6') || teamColor.includes('blue');

          // Determine card styling based on alliance
          let cardClassName = "break-inside-avoid";
          if (isRedAlliance) {
            cardClassName += " border-red-500/50 bg-red-50/50 dark:bg-red-950/20";
          } else if (isBlueAlliance) {
            cardClassName += " border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20";
          }

          return (
            <Card key={team.team_number} className={cardClassName}>
              {/* Team Header */}
              <div className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">
                      Team {team.team_number}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Rank #{index + 1} by {METRIC_LABELS[sortBy]}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {sortBy === 'reliability'
                        ? `${sortedMetricValue.toFixed(0)}%`
                        : sortedMetricValue.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">{METRIC_LABELS[sortBy]}</div>
                  </div>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="flex items-center justify-center">
                <RadarChart
                  width={400}
                  height={270}
                  data={radarData}
                  className="mx-auto"
                >
                  <PolarGrid
                    className="stroke-muted"
                    stroke="#d1d5db"
                  />
                  <PolarAngleAxis
                    dataKey="metric"
                    className="text-xs font-medium"
                    tick={{ fill: '#374151' }}
                  />
                  <Radar
                    name={`Team ${team.team_number}`}
                    dataKey="value"
                    stroke={teamColor}
                    fill={teamColor}
                    fillOpacity={0.3}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </RadarChart>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
