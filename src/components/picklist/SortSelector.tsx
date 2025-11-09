/**
 * Sort Selector Component
 *
 * Dropdown for selecting sort metric and direction (asc/desc)
 */

'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';

export type SortMetric =
  | 'opr'
  | 'dpr'
  | 'ccwm'
  | 'compositeScore'
  | 'autoScore'
  | 'teleopScore'
  | 'endgameScore'
  | 'reliability'
  | 'driverSkill'
  | 'defenseRating'
  | 'speedRating';

export type SortDirection = 'asc' | 'desc';

interface SortSelectorProps {
  sortMetric: SortMetric;
  sortDirection: SortDirection;
  onSortChange: (metric: SortMetric, direction: SortDirection) => void;
}

const SORT_OPTIONS: { value: SortMetric; label: string; defaultDirection: SortDirection }[] = [
  { value: 'compositeScore', label: 'Composite Score', defaultDirection: 'desc' },
  { value: 'opr', label: 'OPR', defaultDirection: 'desc' },
  { value: 'dpr', label: 'DPR', defaultDirection: 'asc' }, // Lower is better
  { value: 'ccwm', label: 'CCWM', defaultDirection: 'desc' },
  { value: 'autoScore', label: 'Auto Score', defaultDirection: 'desc' },
  { value: 'teleopScore', label: 'Teleop Score', defaultDirection: 'desc' },
  { value: 'endgameScore', label: 'Endgame Score', defaultDirection: 'desc' },
  { value: 'reliability', label: 'Reliability', defaultDirection: 'desc' },
  { value: 'driverSkill', label: 'Driver Skill', defaultDirection: 'desc' },
  { value: 'defenseRating', label: 'Defense Rating', defaultDirection: 'desc' },
  { value: 'speedRating', label: 'Speed Rating', defaultDirection: 'desc' },
];

export function SortSelector({ sortMetric, sortDirection, onSortChange }: SortSelectorProps) {
  const handleMetricChange = (metric: SortMetric) => {
    // Find default direction for this metric
    const option = SORT_OPTIONS.find(opt => opt.value === metric);
    const defaultDirection = option?.defaultDirection || 'desc';

    // If changing to same metric, toggle direction
    if (metric === sortMetric) {
      onSortChange(metric, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(metric, defaultDirection);
    }
  };

  const handleDirectionToggle = () => {
    onSortChange(sortMetric, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Metric selector */}
      <select
        value={sortMetric}
        onChange={(e) => handleMetricChange(e.target.value as SortMetric)}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {SORT_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Direction toggle button */}
      <button
        onClick={handleDirectionToggle}
        className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
      >
        {sortDirection === 'asc' ? (
          <ArrowUp className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        ) : (
          <ArrowDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        )}
      </button>
    </div>
  );
}
