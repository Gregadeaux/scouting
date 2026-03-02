/**
 * ScoutingDataList Component
 * Information-dense table for displaying scouting entries with inline preview metrics
 */

'use client';

import React from 'react';
import { ChevronUp, ChevronDown, Clock, User, Hash, Timer } from 'lucide-react';
import type { ScoutingEntryWithDetails } from '@/types/admin';
import { formatDistanceToNow } from '@/lib/utils';
import { formatRatingDisplay, formatShootingTime } from '@/lib/scouting-display';
import { DataQualityBadge } from '@/components/scouting/DataQualityBadge';

function is2026Entry(entry: ScoutingEntryWithDetails): boolean {
  const schemaVersion = entry.auto_performance?.schema_version as string | undefined;
  if (schemaVersion?.startsWith('2026')) return true;
  if (entry.event_key?.startsWith('2026')) return true;
  return false;
}

interface ScoutingDataListProps {
  data: ScoutingEntryWithDetails[];
  loading: boolean;
  onRowClick: (entry: ScoutingEntryWithDetails) => void;
  onSort: (field: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function ScoutingDataList({
  data,
  loading,
  onRowClick,
  onSort,
  sortBy,
  sortOrder,
}: ScoutingDataListProps) {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="inline h-3 w-3" />
    ) : (
      <ChevronDown className="inline h-3 w-3" />
    );
  };

  const getCompLevelDisplay = (level?: string) => {
    switch (level) {
      case 'qm': return 'Qual';
      case 'ef': return 'Elim';
      case 'qf': return 'Quarter';
      case 'sf': return 'Semi';
      case 'f': return 'Final';
      default: return level || '-';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading scouting data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-gray-500">
        <p className="text-lg font-medium">No scouting data found</p>
        <p className="mt-2 text-sm">Try adjusting your filters or search criteria</p>
      </div>
    );
  }

  // Detect if entries are 2026 based on first entry
  const show2026Columns = data.length > 0 && is2026Entry(data[0]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th
                className="cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => onSort('team_number')}
              >
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Team
                  <SortIcon field="team_number" />
                </div>
              </th>
              <th
                className="cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => onSort('match_key')}
              >
                <div className="flex items-center gap-1">
                  Match
                  <SortIcon field="match_key" />
                </div>
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Event
              </th>
              <th
                className="cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => onSort('scout_name')}
              >
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Scout
                  <SortIcon field="scout_name" />
                </div>
              </th>
              <th
                className="cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => onSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Time
                  <SortIcon field="created_at" />
                </div>
              </th>
              {show2026Columns ? (
                <>
                  <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Score
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Feed
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Def
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1">
                      <Timer className="h-3 w-3" />
                      Shoot
                    </div>
                  </th>
                </>
              ) : (
                <>
                  <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Auto
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Tele
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    End
                  </th>
                  <th
                    className="cursor-pointer px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => onSort('total_points')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Total
                      <SortIcon field="total_points" />
                    </div>
                  </th>
                </>
              )}
              <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Quality
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {data.map((entry) => (
              <tr
                key={entry.id}
                onClick={() => onRowClick(entry)}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {entry.team_number}
                    </span>
                    {entry.team_name && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {entry.team_name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {getCompLevelDisplay(entry.comp_level)} {entry.match_number || '-'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.match_key.split('_').slice(0, -1).join('_')}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                    {entry.event_name || entry.event_key || '-'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                  {entry.scout_name}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(entry.created_at))}
                </td>
                {show2026Columns ? (
                  <>
                    <td className="whitespace-nowrap px-2 py-2 text-center">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {formatRatingDisplay(entry.teleop_performance?.scoring_rating)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatRatingDisplay(entry.teleop_performance?.feeding_rating)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatRatingDisplay(entry.teleop_performance?.defense_rating)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-center">
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        {formatShootingTime(entry.shooting_time_seconds)}
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="whitespace-nowrap px-2 py-2 text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.preview_metrics.auto_points ?? '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.preview_metrics.teleop_points ?? '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.preview_metrics.endgame_points ?? '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-center">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {entry.preview_metrics.total_points ?? '-'}
                      </span>
                    </td>
                  </>
                )}
                <td className="whitespace-nowrap px-3 py-2 text-center">
                  <DataQualityBadge quality={entry.data_quality} reasons={entry.data_quality_reasons} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
