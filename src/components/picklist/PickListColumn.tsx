/**
 * Pick List Column Component
 *
 * Single sortable column displaying teams with a specific metric sort.
 * Teams are shared across all columns, but each column sorts independently.
 */

'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { TeamCard } from './TeamCard';
import { SortSelector, type SortMetric, type SortDirection } from './SortSelector';
import type { PickListTeam } from '@/types/picklist';

interface PickListColumnProps {
  teams: PickListTeam[];
  isPicked: (teamNumber: number) => boolean;
  onTogglePicked: (teamNumber: number) => void;
  onRemoveColumn: () => void;
  initialSortMetric?: SortMetric;
  initialSortDirection?: SortDirection;
  columnIndex: number;
}

export function PickListColumn({
  teams,
  isPicked,
  onTogglePicked,
  onRemoveColumn,
  initialSortMetric = 'compositeScore',
  initialSortDirection = 'desc',
  columnIndex,
}: PickListColumnProps) {
  const [sortMetric, setSortMetric] = useState<SortMetric>(initialSortMetric);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  // Sort teams by selected metric
  const sortedTeams = useMemo(() => {
    const sorted = [...teams].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      // Map metric to team property
      switch (sortMetric) {
        case 'opr':
          aValue = a.opr;
          bValue = b.opr;
          break;
        case 'dpr':
          aValue = a.dpr;
          bValue = b.dpr;
          break;
        case 'ccwm':
          aValue = a.ccwm;
          bValue = b.ccwm;
          break;
        case 'compositeScore':
          aValue = a.compositeScore;
          bValue = b.compositeScore;
          break;
        case 'autoScore':
          aValue = a.avgAutoScore ?? 0;
          bValue = b.avgAutoScore ?? 0;
          break;
        case 'teleopScore':
          aValue = a.avgTeleopScore ?? 0;
          bValue = b.avgTeleopScore ?? 0;
          break;
        case 'endgameScore':
          aValue = a.avgEndgameScore ?? 0;
          bValue = b.avgEndgameScore ?? 0;
          break;
        case 'reliability':
          aValue = a.reliabilityScore ?? 0;
          bValue = b.reliabilityScore ?? 0;
          break;
        case 'driverSkill':
          aValue = a.avgDriverSkill ?? 0;
          bValue = b.avgDriverSkill ?? 0;
          break;
        case 'defenseRating':
          aValue = a.avgDefenseRating ?? 0;
          bValue = b.avgDefenseRating ?? 0;
          break;
        case 'speedRating':
          aValue = a.avgSpeedRating ?? 0;
          bValue = b.avgSpeedRating ?? 0;
          break;
        default:
          aValue = a.compositeScore;
          bValue = b.compositeScore;
      }

      // Sort
      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return sorted;
  }, [teams, sortMetric, sortDirection]);

  const handleSortChange = (metric: SortMetric, direction: SortDirection) => {
    setSortMetric(metric);
    setSortDirection(direction);
  };

  // Get metric display name
  const getMetricLabel = () => {
    const option = [
      { value: 'compositeScore', label: 'Composite Score' },
      { value: 'opr', label: 'OPR' },
      { value: 'dpr', label: 'DPR' },
      { value: 'ccwm', label: 'CCWM' },
      { value: 'autoScore', label: 'Auto Score' },
      { value: 'teleopScore', label: 'Teleop Score' },
      { value: 'endgameScore', label: 'Endgame Score' },
      { value: 'reliability', label: 'Reliability' },
      { value: 'driverSkill', label: 'Driver Skill' },
      { value: 'defenseRating', label: 'Defense' },
      { value: 'speedRating', label: 'Speed' },
    ].find(opt => opt.value === sortMetric);

    return option?.label || 'Unknown';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 rounded-t-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {getMetricLabel()}
          </h3>
          <button
            onClick={onRemoveColumn}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Remove column"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Sort selector */}
        <SortSelector
          sortMetric={sortMetric}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Team list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedTeams.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No teams available
          </div>
        ) : (
          sortedTeams.map((team, index) => (
            <TeamCard
              key={team.teamNumber}
              team={team}
              isPicked={isPicked(team.teamNumber)}
              onTogglePicked={onTogglePicked}
              isTopEight={index < 8 && !isPicked(team.teamNumber)}
            />
          ))
        )}
      </div>
    </div>
  );
}
