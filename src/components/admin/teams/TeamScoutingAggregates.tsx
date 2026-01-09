/**
 * TeamScoutingAggregates Component
 * Displays aggregate statistics for a team's scouting data at an event
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Minus } from 'lucide-react';
import type { TeamScoutingAggregates } from '@/types/admin';

interface TeamScoutingAggregatesProps {
  aggregates: TeamScoutingAggregates;
  teamNumber: number;
  eventKey: string;
}

/**
 * Calculate trend based on comparing first half vs second half of matches
 * Returns: 'up' | 'down' | 'neutral'
 */
function calculateTrend(firstHalfAvg: number, secondHalfAvg: number): 'up' | 'down' | 'neutral' {
  const threshold = 0.1; // 10% change threshold
  const percentChange = firstHalfAvg === 0 ? 0 : (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

  if (percentChange > threshold) return 'up';
  if (percentChange < -threshold) return 'down';
  return 'neutral';
}

/**
 * Get badge color based on data quality
 */
function getQualityColor(quality: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (quality) {
    case 'complete':
      return 'success';
    case 'partial':
      return 'warning';
    case 'issues':
      return 'danger';
    default:
      return 'default';
  }
}

export function TeamScoutingAggregates({
  aggregates,
  teamNumber: _teamNumber,
  eventKey: _eventKey,
}: TeamScoutingAggregatesProps) {
  // For trend calculation, we would need access to individual match data
  // For now, we'll show a neutral trend (this could be enhanced later)
  const TrendIcon = Minus;
  const trendColor = 'text-gray-600';

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Performance Summary</h3>
          <div className="flex items-center gap-2">
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
            <span className="text-sm text-gray-600">
              {aggregates.total_matches} {aggregates.total_matches === 1 ? 'match' : 'matches'} scouted
            </span>
          </div>
        </div>

        {/* Average Points Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Auto</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {aggregates.avg_auto_points.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">avg points</div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Teleop</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {aggregates.avg_teleop_points.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">avg points</div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Endgame</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {aggregates.avg_endgame_points.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">avg points</div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {aggregates.avg_total_points.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">avg points</div>
          </div>
        </div>

        {/* Data Quality Distribution */}
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Data Quality
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(aggregates.data_quality_distribution).map(([quality, count]) => (
              <Badge key={quality} variant={getQualityColor(quality)}>
                {quality}: {count}
              </Badge>
            ))}
            {Object.keys(aggregates.data_quality_distribution).length === 0 && (
              <span className="text-sm text-gray-500">No quality data available</span>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {aggregates.complete_entries} complete {aggregates.complete_entries === 1 ? 'entry' : 'entries'} out of {aggregates.total_matches}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
