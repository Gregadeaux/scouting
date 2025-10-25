import React from 'react';
import { Trophy, Target, Zap, Award, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { TeamMatchSummary } from '@/types/team-detail';

interface MatchPerformanceSummaryProps {
  summary?: TeamMatchSummary;
}

/**
 * MatchPerformanceSummary Component
 *
 * Displays aggregated match performance statistics in a grid of stat cards.
 * Color-codes reliability score (green >80, yellow 60-80, red <60).
 *
 * @example
 * ```tsx
 * <MatchPerformanceSummary summary={teamMatchSummary} />
 * ```
 */
export function MatchPerformanceSummary({ summary }: MatchPerformanceSummaryProps) {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No match data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine reliability color class
  const getReliabilityColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  };

  const stats = [
    {
      icon: BarChart3,
      label: 'Matches Played',
      value: summary.matches_played,
      color: 'text-gray-600 dark:text-gray-400',
    },
    {
      icon: Zap,
      label: 'Avg Auto Points',
      value: summary.avg_auto_points.toFixed(1),
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: Target,
      label: 'Avg Teleop Points',
      value: summary.avg_teleop_points.toFixed(1),
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: Award,
      label: 'Avg Endgame Points',
      value: summary.avg_endgame_points.toFixed(1),
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      icon: Trophy,
      label: 'Avg Total Points',
      value: summary.avg_total_points.toFixed(1),
      color: 'text-frc-blue',
    },
    {
      icon: TrendingUp,
      label: 'Reliability Score',
      value: `${summary.reliability_score}%`,
      color: getReliabilityColor(summary.reliability_score),
    },
  ];

  // Add win rate if available
  if (summary.win_rate !== undefined && summary.win_rate !== null) {
    stats.push({
      icon: Trophy,
      label: 'Win Rate',
      value: `${(summary.win_rate * 100).toFixed(1)}%`,
      color: 'text-green-600 dark:text-green-400',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match Performance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {stat.label}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
