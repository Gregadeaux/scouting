'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { TeamMatchTBA } from '@/hooks/useTeamTBAData';
import { formatMatchLabel, sortMatchesBySchedule } from '@/lib/utils/match-format';

interface TBAPerformanceTrendProps {
  matches: TeamMatchTBA[];
  isLoading?: boolean;
}

interface ChartDataPoint {
  match: string;
  matchNumber: number;
  allianceScore: number | null;
  autoPoints: number | null;
  towerPoints: number;
}

export function TBAPerformanceTrend({
  matches,
  isLoading = false,
}: TBAPerformanceTrendProps) {
  const chartData = useMemo<ChartDataPoint[]>(() => {
    return sortMatchesBySchedule(matches).map((m, i) => ({
      match: formatMatchLabel(m.compLevel, m.matchNumber, m.setNumber),
      matchNumber: i + 1,
      allianceScore: m.allianceScore,
      autoPoints: m.allianceAutoPoints,
      towerPoints: m.autoTowerPoints + m.endgameTowerPoints,
    }));
  }, [matches]);

  const avgScore = useMemo(() => {
    const scores = chartData.filter((d) => d.allianceScore != null).map((d) => d.allianceScore!);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-slate-800" />
          <div className="h-[250px] rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  if (chartData.length < 2) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Performance Trend</h3>
        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/30">
          TBA Data
        </span>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          <span className="text-slate-400">Alliance Score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="text-slate-400">Auto Points</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Tower Points (Robot)</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="match"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            stroke="#475569"
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            stroke="#475569"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              borderColor: '#475569',
              borderRadius: '0.75rem',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                allianceScore: 'Alliance Score',
                autoPoints: 'Auto Points',
                towerPoints: 'Tower Points',
              };
              return [value, labels[name] || name];
            }}
          />
          <ReferenceLine
            y={avgScore}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            label={{
              value: `Avg: ${avgScore.toFixed(0)}`,
              position: 'right',
              fill: '#94a3b8',
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="allianceScore"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={{ r: 3, fill: '#22d3ee' }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="autoPoints"
            stroke="#fbbf24"
            strokeWidth={2}
            dot={{ r: 3, fill: '#fbbf24' }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="towerPoints"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ r: 3, fill: '#34d399' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
