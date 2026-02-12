'use client';

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { PieChartIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TeamScoutingAggregates } from '@/types/admin';

interface ScoringBreakdownChartProps {
  aggregates: TeamScoutingAggregates | null;
  isLoading?: boolean;
}

interface BreakdownData {
  name: string;
  value: number;
  color: string;
  percentage: number;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

// Custom tooltip for donut chart
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: BreakdownData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="text-sm font-medium text-white">{data.name}</span>
      </div>
      <div className="mt-1 text-right">
        <span className="font-mono text-lg font-bold text-white">{data.value.toFixed(1)}</span>
        <span className="ml-1 text-xs text-slate-400">pts ({data.percentage.toFixed(0)}%)</span>
      </div>
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: number;
  percentage: number;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

function StatRow({ label, value, percentage, color, trend }: StatRowProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="font-mono text-lg font-semibold text-white">{value.toFixed(1)}</span>
          <span className="ml-1 text-xs text-slate-500">{percentage.toFixed(0)}%</span>
        </div>
        {trend && (
          <TrendIcon
            className={`h-4 w-4 ${
              trend === 'up'
                ? 'text-emerald-400'
                : trend === 'down'
                ? 'text-red-400'
                : 'text-slate-600'
            }`}
          />
        )}
      </div>
    </div>
  );
}

export function ScoringBreakdownChart({ aggregates, isLoading = false }: ScoringBreakdownChartProps) {
  const is2026 = aggregates?.season === 2026;

  const breakdownData = useMemo<BreakdownData[]>(() => {
    if (!aggregates || aggregates.avg_total_points === 0) return [];

    const total = aggregates.avg_total_points;

    return [
      {
        name: 'Auto',
        value: aggregates.avg_auto_points,
        color: '#06b6d4', // cyan
        percentage: (aggregates.avg_auto_points / total) * 100,
      },
      {
        name: 'Teleop',
        value: aggregates.avg_teleop_points,
        color: '#f59e0b', // amber
        percentage: (aggregates.avg_teleop_points / total) * 100,
      },
      {
        name: 'Endgame',
        value: aggregates.avg_endgame_points,
        color: '#f43f5e', // rose
        percentage: (aggregates.avg_endgame_points / total) * 100,
      },
    ];
  }, [aggregates]);

  // 2026 radar data for ratings
  const radarData = useMemo(() => {
    if (!is2026 || !aggregates) return [];
    return [
      { rating: 'Scoring', value: aggregates.avg_scoring_rating ?? 0 },
      { rating: 'Feeding', value: aggregates.avg_feeding_rating ?? 0 },
      { rating: 'Defense', value: aggregates.avg_defense_rating ?? 0 },
      { rating: 'Reliability', value: aggregates.avg_reliability_rating ?? 0 },
    ];
  }, [aggregates, is2026]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-slate-800" />
          <div className="flex items-center justify-center">
            <div className="h-48 w-48 rounded-full bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (is2026 && radarData.length > 0) {
    const avgRating = aggregates?.avg_overall_rating ?? 0;

    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Rating Profile</h3>
        </div>

        <div className="flex flex-col items-center lg:flex-row lg:gap-8">
          {/* Radar Chart */}
          <div className="relative h-48 w-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={70}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis
                  dataKey="rating"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Radar
                  name="Rating"
                  dataKey="value"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs uppercase tracking-wider text-slate-500">Avg Rating</span>
              <span className="font-mono text-2xl font-bold text-white">{avgRating.toFixed(1)}</span>
            </div>
          </div>

          {/* Rating Stats */}
          <div className="mt-4 flex-1 lg:mt-0">
            <div className="divide-y divide-slate-800">
              <StatRow label="Scoring" value={aggregates?.avg_scoring_rating ?? 0} percentage={((aggregates?.avg_scoring_rating ?? 0) / 5) * 100} color="#06b6d4" />
              <StatRow label="Feeding" value={aggregates?.avg_feeding_rating ?? 0} percentage={((aggregates?.avg_feeding_rating ?? 0) / 5) * 100} color="#f59e0b" />
              <StatRow label="Defense" value={aggregates?.avg_defense_rating ?? 0} percentage={((aggregates?.avg_defense_rating ?? 0) / 5) * 100} color="#f43f5e" />
              <StatRow label="Reliability" value={aggregates?.avg_reliability_rating ?? 0} percentage={((aggregates?.avg_reliability_rating ?? 0) / 5) * 100} color="#10b981" />
            </div>

            {/* Consistency indicator */}
            {aggregates && aggregates.complete_entries > 0 && (
              <div className="mt-4 rounded-lg bg-slate-800/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Data Completeness</span>
                  <span className="text-sm font-medium text-emerald-400">
                    {((aggregates.complete_entries / aggregates.total_matches) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${(aggregates.complete_entries / aggregates.total_matches) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!breakdownData.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <PieChartIcon className="h-8 w-8 text-slate-600" />
          <p className="mt-2 text-slate-500">No scoring data available</p>
        </div>
      </div>
    );
  }

  const total = aggregates?.avg_total_points || 0;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <PieChartIcon className="h-5 w-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-white">Scoring Breakdown</h3>
      </div>

      <div className="flex flex-col items-center lg:flex-row lg:gap-8">
        {/* Donut Chart */}
        <div className="relative h-48 w-48 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdownData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-wider text-slate-500">Avg Total</span>
            <span className="font-mono text-2xl font-bold text-white">{total.toFixed(1)}</span>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="mt-4 flex-1 lg:mt-0">
          <div className="divide-y divide-slate-800">
            {breakdownData.map((item) => (
              <StatRow
                key={item.name}
                label={item.name}
                value={item.value}
                percentage={item.percentage}
                color={item.color}
              />
            ))}
          </div>

          {/* Consistency indicator */}
          {aggregates && aggregates.complete_entries > 0 && (
            <div className="mt-4 rounded-lg bg-slate-800/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Data Completeness</span>
                <span className="text-sm font-medium text-emerald-400">
                  {((aggregates.complete_entries / aggregates.total_matches) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${(aggregates.complete_entries / aggregates.total_matches) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
