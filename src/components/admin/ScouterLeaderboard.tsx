'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Trophy, Award, Medal, Shield, Star } from 'lucide-react';
import type { ScouterLeaderboardEntry } from '@/types/validation';
import { getELORank, type ELORank } from '@/lib/algorithms/elo-calculator';

interface ScouterLeaderboardProps {
  entries: ScouterLeaderboardEntry[];
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * Get rank badge configuration
 */
function getRankBadge(rank: ELORank): {
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'secondary' | 'success' | 'warning';
  color: string;
} {
  switch (rank) {
    case 'diamond':
      return {
        label: 'Diamond',
        icon: <Trophy className="w-4 h-4" />,
        variant: 'default',
        color: 'text-blue-400'
      };
    case 'platinum':
      return {
        label: 'Platinum',
        icon: <Award className="w-4 h-4" />,
        variant: 'secondary',
        color: 'text-gray-400'
      };
    case 'gold':
      return {
        label: 'Gold',
        icon: <Medal className="w-4 h-4" />,
        variant: 'warning',
        color: 'text-yellow-500'
      };
    case 'silver':
      return {
        label: 'Silver',
        icon: <Shield className="w-4 h-4" />,
        variant: 'secondary',
        color: 'text-gray-300'
      };
    case 'bronze':
      return {
        label: 'Bronze',
        icon: <Star className="w-4 h-4" />,
        variant: 'secondary',
        color: 'text-orange-700'
      };
    case 'unranked':
      return {
        label: 'Unranked',
        icon: <Star className="w-4 h-4" />,
        variant: 'secondary',
        color: 'text-gray-500'
      };
  }
}

/**
 * Get trend indicator
 */
function getTrendIndicator(trend: number): React.ReactNode {
  if (trend > 0) {
    return (
      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
        <TrendingUp className="w-4 h-4" />
        <span className="text-sm font-medium">+{trend.toFixed(0)}</span>
      </span>
    );
  } else if (trend < 0) {
    return (
      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
        <TrendingDown className="w-4 h-4" />
        <span className="text-sm font-medium">{trend.toFixed(0)}</span>
      </span>
    );
  } else {
    return (
      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <Minus className="w-4 h-4" />
        <span className="text-sm font-medium">0</span>
      </span>
    );
  }
}

/**
 * Get confidence level color
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.70) return 'text-blue-600 dark:text-blue-400';
  if (confidence >= 0.50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Scouter Leaderboard Component
 *
 * Displays ELO rankings with rank badges, trends, and statistics
 */
export function ScouterLeaderboard({
  entries,
  loading = false,
  emptyMessage = 'No scouter rankings available'
}: ScouterLeaderboardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frc-blue mb-4"></div>
            <p>Loading leaderboard...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <Trophy className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">{emptyMessage}</p>
            <p className="text-sm mt-2">Run a validation to generate rankings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scouter Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Rank
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Scouter
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Rating
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Tier
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Trend
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Validations
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Success Rate
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => {
                const eloRank = getELORank(entry.currentElo);
                const rankBadge = getRankBadge(eloRank);
                const successRate = entry.totalValidations > 0
                  ? (entry.successfulValidations / entry.totalValidations) * 100
                  : 0;
                const failedValidations = entry.totalValidations - entry.successfulValidations;

                return (
                  <tr
                    key={entry.scouterId}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {/* Rank Position */}
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        {index < 3 ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold text-sm">
                            {index + 1}
                          </div>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400 font-medium">
                            #{index + 1}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Scouter Name */}
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {entry.scouterName}
                      </span>
                    </td>

                    {/* ELO Rating */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {Math.round(entry.currentElo)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Peak: {Math.round(entry.peakElo)}
                        </span>
                      </div>
                    </td>

                    {/* Rank Tier */}
                    <td className="py-4 px-4">
                      <Badge variant={rankBadge.variant}>
                        <span className="flex items-center gap-1.5">
                          <span className={rankBadge.color}>{rankBadge.icon}</span>
                          <span>{rankBadge.label}</span>
                        </span>
                      </Badge>
                    </td>

                    {/* Trend */}
                    <td className="py-4 px-4">
                      {getTrendIndicator(entry.recentTrend || 0)}
                    </td>

                    {/* Total Validations */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {entry.totalValidations}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.successfulValidations} / {failedValidations}
                        </span>
                      </div>
                    </td>

                    {/* Success Rate */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                          {successRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Confidence Level */}
                    <td className="py-4 px-4">
                      <span
                        className={`text-sm font-semibold ${getConfidenceColor(entry.confidenceLevel)}`}
                      >
                        {(entry.confidenceLevel * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
