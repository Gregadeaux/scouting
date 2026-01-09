/**
 * Performance Trends Component
 *
 * Shows match-by-match performance trends for selected teams.
 * Uses Recharts for visualizations.
 *
 * Related: SCOUT-7
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceTrendsProps {
  eventKey: string;
  selectedTeams: number[];
}

interface MatchData {
  matchNumber: number;
  totalScore: number;
  autoScore: number;
  teleopScore: number;
  endgameScore: number;
}

interface TeamTrend {
  teamNumber: number;
  matches: MatchData[];
}

const TEAM_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
];

export function PerformanceTrends({ eventKey, selectedTeams }: PerformanceTrendsProps) {
  const [teamTrends, setTeamTrends] = useState<TeamTrend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [metric, setMetric] = useState<'totalScore' | 'autoScore' | 'teleopScore' | 'endgameScore'>('totalScore');

  const fetchTrends = useCallback(async () => {
    setIsLoading(true);

    try {
      const promises = selectedTeams.map(async (teamNumber) => {
        const response = await fetch(`/api/analytics/team/${teamNumber}?eventKey=${eventKey}`);
        const data = await response.json();

        if (data.success && data.data) {
          return {
            teamNumber,
            matches: data.data.matches || [],
          };
        }
        return null;
      });

      const results = await Promise.all(promises);
      setTeamTrends(results.filter((r): r is TeamTrend => r !== null));
    } catch (error) {
      console.error('[PerformanceTrends] Error fetching trends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventKey, selectedTeams]);

  useEffect(() => {
    if (selectedTeams.length > 0) {
      fetchTrends();
    } else {
      setTeamTrends([]);
    }
  }, [eventKey, selectedTeams, fetchTrends]);

  if (selectedTeams.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Select teams from the leaderboard to view performance trends
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Loading trends...</span>
        </div>
      </Card>
    );
  }

  // Combine data for chart
  const maxMatches = Math.max(...teamTrends.map(t => t.matches.length), 0);
  const chartData = Array.from({ length: maxMatches }, (_, i) => {
    const dataPoint: Record<string, string | number> = { match: `M${i + 1}` };

    teamTrends.forEach((trend) => {
      const match = trend.matches[i];
      if (match) {
        dataPoint[`team${trend.teamNumber}`] = match[metric];
      }
    });

    return dataPoint;
  });

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Performance Trends</h3>

        {/* Metric Selector */}
        <div className="flex gap-2 flex-wrap">
          <MetricButton
            label="Total Score"
            active={metric === 'totalScore'}
            onClick={() => setMetric('totalScore')}
          />
          <MetricButton
            label="Auto"
            active={metric === 'autoScore'}
            onClick={() => setMetric('autoScore')}
          />
          <MetricButton
            label="Teleop"
            active={metric === 'teleopScore'}
            onClick={() => setMetric('teleopScore')}
          />
          <MetricButton
            label="Endgame"
            active={metric === 'endgameScore'}
            onClick={() => setMetric('endgameScore')}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="match"
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem'
              }}
            />
            <Legend />
            {teamTrends.map((trend, index) => (
              <Line
                key={trend.teamNumber}
                type="monotone"
                dataKey={`team${trend.teamNumber}`}
                stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                strokeWidth={2}
                name={`Team ${trend.teamNumber}`}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

interface MetricButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function MetricButton({ label, active, onClick }: MetricButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded-md transition-colors ${active
        ? 'bg-primary text-primary-foreground'
        : 'bg-secondary hover:bg-secondary/80'
        }`}
    >
      {label}
    </button>
  );
}
