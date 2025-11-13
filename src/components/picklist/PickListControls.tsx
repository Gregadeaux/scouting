/**
 * Pick List Controls Component
 *
 * Top-level controls for the picklist page:
 * - Event selector
 * - Add Picklist button
 * - Clear All Picked button
 * - Save/Load/Manage configurations
 * - Summary stats
 *
 * Related: SCOUT-58
 */

'use client';

import { Plus, Trash2, Download, Save, Settings } from 'lucide-react';
import { ConfigurationSelector } from './ConfigurationSelector';
import type { PickListConfiguration } from '@/types/picklist';

interface Event {
  event_key: string;
  event_name: string;
  year: number;
}

interface PickListControlsProps {
  events: Event[];
  selectedEventKey: string | null;
  onEventChange: (eventKey: string) => void;
  onAddPicklist: () => void;
  onClearAllPicked: () => void;
  onExportCSV?: () => void;
  pickedCount: number;
  totalTeams: number;
  isLoading: boolean;
  // Configuration management (SCOUT-58)
  configurations?: PickListConfiguration[];
  onSaveConfig?: () => void;
  onLoadConfig?: (config: PickListConfiguration) => void;
  onManageConfigs?: () => void;
}

export function PickListControls({
  events,
  selectedEventKey,
  onEventChange,
  onAddPicklist,
  onClearAllPicked,
  onExportCSV,
  pickedCount,
  totalTeams,
  isLoading,
  configurations = [],
  onSaveConfig,
  onLoadConfig,
  onManageConfigs,
}: PickListControlsProps) {
  const handleClearClick = () => {
    if (pickedCount === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to clear ${pickedCount} picked team${pickedCount === 1 ? '' : 's'}? This action cannot be undone.`
    );

    if (confirmed) {
      onClearAllPicked();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left side: Event selector */}
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Event
            </label>
            <select
              value={selectedEventKey || ''}
              onChange={(e) => onEventChange(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Select an event...</option>
              {events.map(event => (
                <option key={event.event_key} value={event.event_key}>
                  {event.event_name} ({event.year})
                </option>
              ))}
            </select>
          </div>

          {/* Summary stats */}
          {selectedEventKey && (
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalTeams}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Total Teams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {pickedCount}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Picked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalTeams - pickedCount}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Available</div>
              </div>
            </div>
          )}
        </div>

        {/* Right side: Action buttons */}
        {selectedEventKey && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Configuration buttons (SCOUT-58) */}
            {onLoadConfig && configurations.length > 0 && (
              <ConfigurationSelector
                configurations={configurations}
                onLoad={onLoadConfig}
                disabled={isLoading}
              />
            )}

            {onSaveConfig && (
              <button
                onClick={onSaveConfig}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
                title="Save current view configuration"
              >
                <Save className="w-4 h-4" />
                <span>Save View</span>
              </button>
            )}

            {onManageConfigs && (
              <button
                onClick={onManageConfigs}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
                title="Manage saved configurations"
              >
                <Settings className="w-4 h-4" />
                <span>Manage</span>
              </button>
            )}

            <button
              onClick={onAddPicklist}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Picklist</span>
            </button>

            {onExportCSV && (
              <button
                onClick={onExportCSV}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors disabled:opacity-50"
                title="Export to CSV"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            )}

            <button
              onClick={handleClearClick}
              disabled={isLoading || pickedCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Picked</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
