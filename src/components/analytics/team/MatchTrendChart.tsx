'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import type { ScoutingEntryWithDetails } from '@/types/admin';

interface MatchTrendChartProps {
  scoutingData: ScoutingEntryWithDetails[];
  isLoading?: boolean;
}

type MetricView = 'breakdown' | 'total' | 'ratings';

interface ChartDataPoint {
  match: string;
  matchNumber: number;
  auto: number;
  teleop: number;
  endgame: number;
  total: number;
  // 2026 fields
  autoClimb?: number;
  endgameClimb?: number;
  climbTotal?: number;
  avgRating?: number;
  [key: string]: string | number | undefined; // Index signature for Recharts
}

// Custom tooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    name: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  // For total view, just show the total
  if (payload.length === 1 && payload[0].dataKey === 'total') {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
        <p className="mb-2 text-sm font-semibold text-white">{label}</p>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-slate-400">Total</span>
          <span className="font-mono font-bold text-emerald-400">{payload[0].value}</span>
        </div>
      </div>
    );
  }

  // For breakdown view
  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
      <p className="mb-2 text-sm font-semibold text-white">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-400">{entry.name}</span>
            </div>
            <span className="font-mono font-medium text-white">{entry.value}</span>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-700 pt-2 text-sm">
          <span className="font-medium text-slate-300">Total</span>
          <span className="font-mono font-bold text-white">{total}</span>
        </div>
      </div>
    </div>
  );
}

export function MatchTrendChart({ scoutingData, isLoading = false }: MatchTrendChartProps) {
  const is2026 = scoutingData.some((e) => e.preview_metrics.season === 2026);
  const [view, setView] = useState<MetricView>('breakdown');

  // Transform scouting data into chart data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!scoutingData.length) return [];

    // Sort by match number
    const sorted = [...scoutingData].sort((a, b) => {
      const aNum = a.match_number || 0;
      const bNum = b.match_number || 0;
      return aNum - bNum;
    });

    return sorted.map((entry) => {
      const pm = entry.preview_metrics;
      const base = {
        match: `Q${entry.match_number || '?'}`,
        matchNumber: entry.match_number || 0,
        auto: pm.auto_points,
        teleop: pm.teleop_points,
        endgame: pm.endgame_points,
        total: pm.total_points,
      };

      if (pm.season === 2026) {
        return {
          ...base,
          autoClimb: pm.auto_points,
          endgameClimb: pm.endgame_points,
          climbTotal: pm.climb_points ?? (pm.auto_points + pm.endgame_points),
          avgRating: pm.avg_rating ?? 0,
        };
      }

      return base;
    });
  }, [scoutingData]);

  // Calculate averages for reference lines
  const averages = useMemo(() => {
    if (!chartData.length) return { auto: 0, teleop: 0, endgame: 0, total: 0 };
    const sum = chartData.reduce(
      (acc, d) => ({
        auto: acc.auto + d.auto,
        teleop: acc.teleop + d.teleop,
        endgame: acc.endgame + d.endgame,
        total: acc.total + d.total,
      }),
      { auto: 0, teleop: 0, endgame: 0, total: 0 }
    );
    const count = chartData.length;
    return {
      auto: sum.auto / count,
      teleop: sum.teleop / count,
      endgame: sum.endgame / count,
      total: sum.total / count,
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-slate-800" />
          <div className="h-64 rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-8 w-8 text-slate-600" />
          <p className="mt-2 text-slate-500">No match data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Match Performance</h3>
        </div>
        <div className="flex rounded-lg border border-slate-700 p-0.5">
          <button
            onClick={() => setView('breakdown')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'breakdown'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Breakdown
          </button>
          <button
            onClick={() => setView('total')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'total'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Total
          </button>
          {is2026 && (
            <button
              onClick={() => setView('ratings')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'ratings'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ratings
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4">
        {view === 'breakdown' ? (
          is2026 ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-cyan-500" />
                <span className="text-xs text-slate-400">Auto Climb</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-rose-500" />
                <span className="text-xs text-slate-400">Endgame Climb</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-cyan-500" />
                <span className="text-xs text-slate-400">Auto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-amber-500" />
                <span className="text-xs text-slate-400">Teleop</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-rose-500" />
                <span className="text-xs text-slate-400">Endgame</span>
              </div>
            </>
          )
        ) : view === 'ratings' ? (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-amber-500" />
            <span className="text-xs text-slate-400">Avg Rating (1-5)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-emerald-500" />
            <span className="text-xs text-slate-400">{is2026 ? 'Total Climb Points' : 'Total Score'}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="h-px w-4 border-t-2 border-dashed border-slate-500" />
          <span className="text-xs text-slate-500">Average</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'ratings' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="match"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(100, 116, 139, 0.3)' }} />
              <Line
                type="monotone"
                dataKey="avgRating"
                name="Avg Rating"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4, fill: '#f59e0b' }}
              />
              <ReferenceLine
                y={chartData.reduce((sum, d) => sum + (d.avgRating ?? 0), 0) / (chartData.length || 1)}
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="match"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }} />

              {view === 'breakdown' ? (
                is2026 ? (
                  <>
                    <Bar dataKey="autoClimb" name="Auto Climb" stackId="climb" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="endgameClimb" name="Endgame Climb" stackId="climb" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                    <ReferenceLine
                      y={averages.total}
                      stroke="#64748b"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{
                        value: `Avg: ${averages.total.toFixed(0)}`,
                        position: 'right',
                        fill: '#64748b',
                        fontSize: 10,
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Bar dataKey="auto" name="Auto" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="teleop" name="Teleop" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="endgame" name="Endgame" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                    <ReferenceLine
                      y={averages.total}
                      stroke="#64748b"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{
                        value: `Avg: ${averages.total.toFixed(0)}`,
                        position: 'right',
                        fill: '#64748b',
                        fontSize: 10,
                      }}
                    />
                  </>
                )
              ) : (
                <>
                  <Bar dataKey={is2026 ? 'climbTotal' : 'total'} name={is2026 ? 'Climb Points' : 'Total'} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <ReferenceLine
                    y={averages.total}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{
                      value: `Avg: ${averages.total.toFixed(0)}`,
                      position: 'right',
                      fill: '#64748b',
                      fontSize: 10,
                    }}
                  />
                </>
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
