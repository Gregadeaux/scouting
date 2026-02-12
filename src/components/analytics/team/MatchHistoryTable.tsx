'use client';

import React from 'react';
import { FileText, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ScoutingEntryWithDetails } from '@/types/admin';

interface MatchHistoryTableProps {
  scoutingData: ScoutingEntryWithDetails[];
  isLoading?: boolean;
  onRowClick?: (entry: ScoutingEntryWithDetails) => void;
}

// Mini sparkline component
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const height = 20;
  const width = 60;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current point indicator */}
      {values.length > 0 && (
        <circle
          cx={width}
          cy={height - ((values[values.length - 1] - min) / range) * height}
          r="2"
          fill={color}
        />
      )}
    </svg>
  );
}

function DataQualityBadge({ quality }: { quality: 'complete' | 'partial' | 'issues' }) {
  const config = {
    complete: {
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      label: 'Complete',
    },
    partial: {
      icon: AlertCircle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      label: 'Partial',
    },
    issues: {
      icon: AlertCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      label: 'Issues',
    },
  };

  const { icon: Icon, color, bg, label } = config[quality];

  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${color} ${bg}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function MatchHistoryTable({ scoutingData, isLoading = false, onRowClick }: MatchHistoryTableProps) {
  const is2026 = scoutingData.some((e) => e.preview_metrics.season === 2026);

  // Sort by match number
  const sortedData = [...scoutingData].sort((a, b) => {
    const aNum = a.match_number || 0;
    const bNum = b.match_number || 0;
    return aNum - bNum;
  });

  // Calculate running averages for sparklines
  const getRunningValues = (
    data: ScoutingEntryWithDetails[],
    metric: 'auto_points' | 'teleop_points' | 'endgame_points' | 'total_points'
  ) => {
    return data.map((entry) => entry.preview_metrics[metric]);
  };

  const totalValues = getRunningValues(sortedData, 'total_points');

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-slate-800" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!sortedData.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-8 w-8 text-slate-600" />
          <p className="mt-2 text-slate-500">No match history available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Match History</h3>
          <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            {sortedData.length} matches
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Trend</span>
          <MiniSparkline values={totalValues} color="#10b981" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3 font-medium">Match</th>
              {is2026 ? (
                <>
                  <th className="px-4 py-3 font-medium text-cyan-400">Climb Pts</th>
                  <th className="px-4 py-3 font-medium text-amber-400">Scoring</th>
                  <th className="px-4 py-3 font-medium text-rose-400">Defense</th>
                  <th className="px-4 py-3 font-medium text-emerald-400">Reliability</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Disabled</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 font-medium text-cyan-400">Auto</th>
                  <th className="px-4 py-3 font-medium text-amber-400">Teleop</th>
                  <th className="px-4 py-3 font-medium text-rose-400">Endgame</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </>
              )}
              <th className="px-4 py-3 font-medium">Quality</th>
              <th className="px-4 py-3 font-medium">Scout</th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedData.map((entry) => {
              const pm = entry.preview_metrics;
              return (
                <tr
                  key={entry.id}
                  onClick={() => onRowClick?.(entry)}
                  className={`transition-colors ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-slate-800/50'
                      : ''
                  }`}
                >
                  <td className="px-6 py-3">
                    <span className="font-mono text-sm font-medium text-white">
                      Q{entry.match_number || '?'}
                    </span>
                  </td>
                  {is2026 ? (
                    <>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-cyan-400">
                          {pm.climb_points ?? pm.total_points}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-amber-400">
                          {pm.scoring_rating ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-rose-400">
                          {pm.defense_rating ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-emerald-400">
                          {pm.reliability_rating ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm ${pm.was_disabled ? 'text-red-400' : 'text-slate-500'}`}>
                          {pm.was_disabled ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-cyan-400">
                          {pm.auto_points}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-amber-400">
                          {pm.teleop_points}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-rose-400">
                          {pm.endgame_points}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-white">
                          {pm.total_points}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <DataQualityBadge quality={entry.data_quality} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-400 truncate max-w-[100px] block">
                      {entry.scout_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {onRowClick && (
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
