'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Layers } from 'lucide-react';
import type { ScoutingEntryWithDetails } from '@/types/admin';

interface GamePieceBreakdownProps {
  scoutingData: ScoutingEntryWithDetails[];
  isLoading?: boolean;
  tbaHubData?: {
    autoCount: number;
    transitionCount: number;
    shift1Count: number;
    shift2Count: number;
    shift3Count: number;
    shift4Count: number;
    endgameCount: number;
    totalCount: number;
  };
  climbRates?: {
    autoClimbRate: number;
    endgameClimbRate: number;
    disabledRate: number;
  };
}

interface BreakdownItem {
  name: string;
  shortName: string;
  avgCount: number;
  totalCount: number;
  color: string;
  category: 'coral' | 'algae' | 'endgame';
  [key: string]: string | number; // Index signature for Recharts
}

// Custom tooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: BreakdownItem;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{data.name}</p>
      <div className="mt-1 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Average:</span>
          <span className="font-mono font-medium text-white">{data.avgCount.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Total:</span>
          <span className="font-mono text-slate-300">{data.totalCount}</span>
        </div>
      </div>
    </div>
  );
}

export function GamePieceBreakdown({ scoutingData, isLoading = false, tbaHubData, climbRates }: GamePieceBreakdownProps) {
  const is2026 = scoutingData.some((e) => e.preview_metrics.season === 2026) || !!tbaHubData;
  // Aggregate game piece data from JSONB fields
  const breakdownData = useMemo<BreakdownItem[]>(() => {
    if (!scoutingData.length) return [];

    const matchCount = scoutingData.length;

    // Initialize counters
    const totals = {
      // Auto coral
      auto_coral_L1: 0,
      auto_coral_L2: 0,
      auto_coral_L3: 0,
      auto_coral_L4: 0,
      // Teleop coral
      teleop_coral_L1: 0,
      teleop_coral_L2: 0,
      teleop_coral_L3: 0,
      teleop_coral_L4: 0,
      // Algae
      algae_barge: 0,
      algae_processor: 0,
      // Endgame
      shallow_climbs: 0,
      deep_climbs: 0,
    };

    // Sum up values from each entry
    scoutingData.forEach((entry) => {
      const auto = entry.auto_performance || {};
      const teleop = entry.teleop_performance || {};
      const endgame = entry.endgame_performance || {};

      // Auto coral
      totals.auto_coral_L1 += Number(auto.coral_scored_L1) || 0;
      totals.auto_coral_L2 += Number(auto.coral_scored_L2) || 0;
      totals.auto_coral_L3 += Number(auto.coral_scored_L3) || 0;
      totals.auto_coral_L4 += Number(auto.coral_scored_L4) || 0;

      // Teleop coral
      totals.teleop_coral_L1 += Number(teleop.coral_scored_L1) || 0;
      totals.teleop_coral_L2 += Number(teleop.coral_scored_L2) || 0;
      totals.teleop_coral_L3 += Number(teleop.coral_scored_L3) || 0;
      totals.teleop_coral_L4 += Number(teleop.coral_scored_L4) || 0;

      // Algae
      totals.algae_barge += Number(teleop.algae_scored_barge) || 0;
      totals.algae_processor += Number(teleop.algae_scored_processor) || 0;

      // Endgame
      if (endgame.cage_climb_successful) {
        if (endgame.cage_level_achieved === 'shallow') {
          totals.shallow_climbs += 1;
        } else if (endgame.cage_level_achieved === 'deep') {
          totals.deep_climbs += 1;
        }
      }
    });

    // Build breakdown items - combine auto + teleop coral
    const items: BreakdownItem[] = [
      {
        name: 'Coral L1',
        shortName: 'L1',
        avgCount: (totals.auto_coral_L1 + totals.teleop_coral_L1) / matchCount,
        totalCount: totals.auto_coral_L1 + totals.teleop_coral_L1,
        color: '#06b6d4', // cyan
        category: 'coral',
      },
      {
        name: 'Coral L2',
        shortName: 'L2',
        avgCount: (totals.auto_coral_L2 + totals.teleop_coral_L2) / matchCount,
        totalCount: totals.auto_coral_L2 + totals.teleop_coral_L2,
        color: '#0891b2', // cyan darker
        category: 'coral',
      },
      {
        name: 'Coral L3',
        shortName: 'L3',
        avgCount: (totals.auto_coral_L3 + totals.teleop_coral_L3) / matchCount,
        totalCount: totals.auto_coral_L3 + totals.teleop_coral_L3,
        color: '#0e7490', // cyan darker
        category: 'coral',
      },
      {
        name: 'Coral L4',
        shortName: 'L4',
        avgCount: (totals.auto_coral_L4 + totals.teleop_coral_L4) / matchCount,
        totalCount: totals.auto_coral_L4 + totals.teleop_coral_L4,
        color: '#155e75', // cyan darkest
        category: 'coral',
      },
      {
        name: 'Algae Barge',
        shortName: 'Barge',
        avgCount: totals.algae_barge / matchCount,
        totalCount: totals.algae_barge,
        color: '#22c55e', // green
        category: 'algae',
      },
      {
        name: 'Algae Processor',
        shortName: 'Proc',
        avgCount: totals.algae_processor / matchCount,
        totalCount: totals.algae_processor,
        color: '#16a34a', // green darker
        category: 'algae',
      },
      {
        name: 'Shallow Climb',
        shortName: 'Shallow',
        avgCount: totals.shallow_climbs / matchCount,
        totalCount: totals.shallow_climbs,
        color: '#f59e0b', // amber
        category: 'endgame',
      },
      {
        name: 'Deep Climb',
        shortName: 'Deep',
        avgCount: totals.deep_climbs / matchCount,
        totalCount: totals.deep_climbs,
        color: '#d97706', // amber darker
        category: 'endgame',
      },
    ];

    return items;
  }, [scoutingData]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-slate-800" />
          <div className="h-48 rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  // 2026: Show hub counts per section + climb/disabled rates
  if (is2026 && tbaHubData) {
    const hubItems: BreakdownItem[] = [
      { name: 'Auto', shortName: 'Auto', avgCount: tbaHubData.autoCount, totalCount: 0, color: '#06b6d4', category: 'coral' },
      { name: 'Transition', shortName: 'Trans', avgCount: tbaHubData.transitionCount, totalCount: 0, color: '#0891b2', category: 'coral' },
      { name: 'Shift 1', shortName: 'S1', avgCount: tbaHubData.shift1Count, totalCount: 0, color: '#22c55e', category: 'algae' },
      { name: 'Shift 2', shortName: 'S2', avgCount: tbaHubData.shift2Count, totalCount: 0, color: '#16a34a', category: 'algae' },
      { name: 'Shift 3', shortName: 'S3', avgCount: tbaHubData.shift3Count, totalCount: 0, color: '#15803d', category: 'algae' },
      { name: 'Shift 4', shortName: 'S4', avgCount: tbaHubData.shift4Count, totalCount: 0, color: '#166534', category: 'algae' },
      { name: 'Endgame', shortName: 'End', avgCount: tbaHubData.endgameCount, totalCount: 0, color: '#f59e0b', category: 'endgame' },
      { name: 'Total', shortName: 'Total', avgCount: tbaHubData.totalCount, totalCount: 0, color: '#10b981', category: 'endgame' },
    ];

    // Add climb/disabled rate bars if available
    const rateItems: BreakdownItem[] = climbRates ? [
      { name: 'Auto Climb Rate', shortName: 'Auto %', avgCount: climbRates.autoClimbRate, totalCount: 0, color: '#06b6d4', category: 'endgame' },
      { name: 'Endgame Climb Rate', shortName: 'End %', avgCount: climbRates.endgameClimbRate, totalCount: 0, color: '#f59e0b', category: 'endgame' },
      { name: 'Disabled Rate', shortName: 'Dis %', avgCount: climbRates.disabledRate, totalCount: 0, color: '#ef4444', category: 'endgame' },
    ] : [];

    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Hub Scoring Breakdown</h3>
          <span className="ml-2 text-xs text-slate-500">(avg alliance hub counts)</span>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hubItems}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
              <YAxis type="category" dataKey="shortName" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} width={50} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }} />
              <Bar dataKey="avgCount" radius={[0, 4, 4, 0]}>
                {hubItems.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {rateItems.length > 0 && (
          <>
            <div className="mt-4 mb-2 text-xs font-medium text-slate-400">Climb & Reliability Rates (%)</div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rateItems}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                  <YAxis type="category" dataKey="shortName" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} width={50} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }} />
                  <Bar dataKey="avgCount" radius={[0, 4, 4, 0]}>
                    {rateItems.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!breakdownData.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="h-8 w-8 text-slate-600" />
          <p className="mt-2 text-slate-500">No game piece data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Layers className="h-5 w-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-white">Game Piece Breakdown</h3>
        <span className="ml-2 text-xs text-slate-500">(avg per match)</span>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-cyan-500" />
          <span className="text-xs text-slate-400">Coral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span className="text-xs text-slate-400">Algae</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-amber-500" />
          <span className="text-xs text-slate-400">Endgame</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={breakdownData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }} />
            <Bar dataKey="avgCount" radius={[0, 4, 4, 0]}>
              {breakdownData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
