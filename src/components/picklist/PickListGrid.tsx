/**
 * Pick List Grid Component
 *
 * Multi-column responsive layout for displaying multiple picklists.
 * CSS Grid with 2-4 columns depending on screen width.
 */

'use client';

import { PickListColumn } from './PickListColumn';
import type { PickListTeam } from '@/types/picklist';
import type { SortMetric, SortDirection } from './SortSelector';

export interface PickListColumnConfig {
  id: string;
  sortMetric: SortMetric;
  sortDirection: SortDirection;
}

interface PickListGridProps {
  teams: PickListTeam[];
  columns: PickListColumnConfig[];
  isPicked: (teamNumber: number) => boolean;
  onTogglePicked: (teamNumber: number) => void;
  onRemoveColumn: (columnId: string) => void;
}

export function PickListGrid({
  teams,
  columns,
  isPicked,
  onTogglePicked,
  onRemoveColumn,
}: PickListGridProps) {
  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">No picklists created yet</p>
          <p className="text-sm">Click &quot;Add Picklist&quot; to create your first column</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 h-full overflow-x-auto pb-4"
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(320px, 1fr))`,
      }}
    >
      {columns.map((column, index) => (
        <PickListColumn
          key={column.id}
          teams={teams}
          isPicked={isPicked}
          onTogglePicked={onTogglePicked}
          onRemoveColumn={() => onRemoveColumn(column.id)}
          initialSortMetric={column.sortMetric}
          initialSortDirection={column.sortDirection}
          columnIndex={index}
        />
      ))}
    </div>
  );
}
