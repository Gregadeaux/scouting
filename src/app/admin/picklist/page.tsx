/**
 * Pick List Page
 *
 * Revolutionary multi-column pick list UI for alliance selection.
 * Features:
 * - Multiple simultaneous picklists with different sort metrics
 * - Single shared team list with strikethrough when picked
 * - Multi-column responsive layout
 * - localStorage persistence
 * - Save/load/manage configurations (SCOUT-58)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { PickListControls } from '@/components/picklist/PickListControls';
import { PickListGrid, type PickListColumnConfig } from '@/components/picklist/PickListGrid';
import { SaveConfigDialog } from '@/components/picklist/SaveConfigDialog';
import { ManageConfigurationsDialog } from '@/components/picklist/ManageConfigurationsDialog';
import { usePickListState } from '@/hooks/usePickListState';
import type { PickList, PickListTeam, PickListConfiguration } from '@/types/picklist';
import type { SortMetric } from '@/components/picklist/SortSelector';

interface Event {
  event_key: string;
  event_name: string;
  year: number;
}

const INITIAL_SORT_METRICS: SortMetric[] = ['compositeScore', 'opr', 'ccwm', 'autoScore'];

export default function PickListPage() {
  // State
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [teams, setTeams] = useState<PickListTeam[]>([]);
  const [columns, setColumns] = useState<PickListColumnConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickListData, setPickListData] = useState<PickList | null>(null);

  // Configuration management (SCOUT-58)
  const [configurations, setConfigurations] = useState<PickListConfiguration[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);

  // Pick list state (global picked teams)
  const {
    isPicked,
    togglePicked,
    clearAllPicked,
    loadForEvent,
    pickedCount,
  } = usePickListState(selectedEventKey || undefined);

  // Fetch events on mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Load pick list when event changes
  useEffect(() => {
    if (selectedEventKey) {
      loadPickList(selectedEventKey);
      loadForEvent(selectedEventKey);
      fetchConfigurations(selectedEventKey);
    }
  }, [selectedEventKey, loadForEvent]);

  // Auto-load default configuration when configurations load
  useEffect(() => {
    if (configurations.length > 0 && columns.length === 0) {
      const defaultConfig = configurations.find((c) => c.isDefault);
      if (defaultConfig) {
        handleLoadConfiguration(defaultConfig);
      }
    }
  }, [configurations]);

  /**
   * Fetch available events
   */
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/events');
      const data = await response.json();

      if (data.success && data.data) {
        // Sort by year desc, then by name
        const sorted = data.data.sort((a: Event, b: Event) => {
          if (a.year !== b.year) return b.year - a.year;
          return a.event_name.localeCompare(b.event_name);
        });
        setEvents(sorted);
      } else {
        setError('Failed to load events');
      }
    } catch (error) {
      console.error('[PickList] Error fetching events:', error);
      setError('Failed to load events');
    }
  };

  /**
   * Load pick list for selected event
   */
  const loadPickList = async (eventKey: string, strategy: string = 'BALANCED') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/picklist/${eventKey}?strategy=${strategy}&minMatches=3&includeNotes=true`
      );

      const data = await response.json();

      if (data.success && data.data) {
        const pickList: PickList = data.data;
        setPickListData(pickList);
        setTeams(pickList.teams);

        // Initialize with default columns if none exist
        if (columns.length === 0) {
          initializeDefaultColumns();
        }
      } else {
        setError(data.error || 'Failed to load pick list');
        setTeams([]);
      }
    } catch (error) {
      console.error('[PickList] Error loading pick list:', error);
      setError('Failed to load pick list. Have you calculated OPR/DPR/CCWM for this event?');
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initialize default columns
   */
  const initializeDefaultColumns = () => {
    const defaultColumns: PickListColumnConfig[] = INITIAL_SORT_METRICS.map((metric, index) => ({
      id: `column-${Date.now()}-${index}`,
      sortMetric: metric,
      sortDirection: metric === 'dpr' ? 'asc' : 'desc', // DPR: lower is better
    }));

    setColumns(defaultColumns);
  };

  /**
   * Add a new picklist column
   */
  const handleAddPicklist = () => {
    const newColumn: PickListColumnConfig = {
      id: `column-${Date.now()}`,
      sortMetric: 'compositeScore',
      sortDirection: 'desc',
    };

    setColumns(prev => [...prev, newColumn]);
  };

  /**
   * Remove a column
   */
  const handleRemoveColumn = (columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));
  };

  /**
   * Handle column sort change
   */
  const handleColumnSortChange = (columnId: string, metric: SortMetric, direction: 'asc' | 'desc') => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId
          ? { ...col, sortMetric: metric, sortDirection: direction }
          : col
      )
    );
  };

  /**
   * Handle event change
   */
  const handleEventChange = (eventKey: string) => {
    setSelectedEventKey(eventKey);
    setColumns([]); // Reset columns when changing events
  };

  /**
   * Fetch saved configurations for current event (SCOUT-58)
   */
  const fetchConfigurations = async (eventKey: string) => {
    try {
      const response = await fetch(
        `/api/admin/picklist/configurations?eventKey=${eventKey}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        setConfigurations(data.data);
      } else {
        console.error('[PickList] Failed to fetch configurations:', data.error);
      }
    } catch (error) {
      console.error('[PickList] Error fetching configurations:', error);
    }
  };

  /**
   * Save current configuration (SCOUT-58)
   */
  const handleSaveConfiguration = async (name: string, isDefault: boolean) => {
    if (!selectedEventKey || columns.length === 0) return;

    try {
      const response = await fetch('/api/admin/picklist/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventKey: selectedEventKey,
          name,
          configuration: { columns },
          isDefault,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Refresh configurations list
        await fetchConfigurations(selectedEventKey);
      } else {
        throw new Error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('[PickList] Error saving configuration:', error);
      throw error;
    }
  };

  /**
   * Load a saved configuration (SCOUT-58)
   */
  const handleLoadConfiguration = (config: PickListConfiguration) => {
    setColumns(config.configuration.columns);
  };

  /**
   * Rename a configuration (SCOUT-58)
   */
  const handleRenameConfiguration = async (id: string, newName: string) => {
    try {
      const response = await fetch(`/api/admin/picklist/configurations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh configurations list
        if (selectedEventKey) {
          await fetchConfigurations(selectedEventKey);
        }
      } else {
        throw new Error(data.error || 'Failed to rename configuration');
      }
    } catch (error) {
      console.error('[PickList] Error renaming configuration:', error);
      throw error;
    }
  };

  /**
   * Set/unset configuration as default (SCOUT-58)
   */
  const handleSetDefault = async (id: string, isDefault: boolean) => {
    try {
      const response = await fetch(`/api/admin/picklist/configurations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh configurations list
        if (selectedEventKey) {
          await fetchConfigurations(selectedEventKey);
        }
      } else {
        throw new Error(data.error || 'Failed to update default status');
      }
    } catch (error) {
      console.error('[PickList] Error updating default status:', error);
      throw error;
    }
  };

  /**
   * Delete a configuration (SCOUT-58)
   */
  const handleDeleteConfiguration = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/picklist/configurations/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Refresh configurations list
        if (selectedEventKey) {
          await fetchConfigurations(selectedEventKey);
        }
      } else {
        throw new Error(data.error || 'Failed to delete configuration');
      }
    } catch (error) {
      console.error('[PickList] Error deleting configuration:', error);
      throw error;
    }
  };

  /**
   * Export to CSV
   */
  const handleExportCSV = useCallback(() => {
    if (!pickListData) return;

    // Create CSV content using the service method format
    const headers = [
      'Rank',
      'Team',
      'Team Name',
      'Nickname',
      'Score',
      'OPR',
      'DPR',
      'CCWM',
      'Matches',
      'Avg Auto',
      'Avg Teleop',
      'Avg Endgame',
      'Reliability %',
      'Picked',
    ];

    const rows = teams.map(team => [
      team.rank.toString(),
      team.teamNumber.toString(),
      team.teamName || '',
      team.teamNickname || '',
      team.compositeScore.toFixed(4),
      team.opr.toFixed(2),
      team.dpr.toFixed(2),
      team.ccwm.toFixed(2),
      team.matchesPlayed.toString(),
      team.avgAutoScore?.toFixed(1) || 'N/A',
      team.avgTeleopScore?.toFixed(1) || 'N/A',
      team.avgEndgameScore?.toFixed(1) || 'N/A',
      team.reliabilityScore?.toFixed(0) || 'N/A',
      isPicked(team.teamNumber) ? 'Yes' : 'No',
    ]);

    // Escape CSV cells
    const escapeCell = (cell: string) => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };

    const csvLines = [
      `# Pick List: ${pickListData.eventName || pickListData.eventKey}`,
      `# Strategy: ${pickListData.strategy.name}`,
      `# Generated: ${new Date().toISOString()}`,
      `# Teams: ${teams.length}, Picked: ${pickedCount}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(escapeCell).join(',')),
    ];

    const csvContent = csvLines.join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `picklist-${selectedEventKey}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [pickListData, teams, isPicked, pickedCount, selectedEventKey]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-[1920px] mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Alliance Selection Pick List
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create multiple sortable pick lists to compare teams using different metrics.
            Teams marked as picked will show strikethrough across all columns.
          </p>
        </div>

        {/* Controls */}
        <PickListControls
          events={events}
          selectedEventKey={selectedEventKey}
          onEventChange={handleEventChange}
          onAddPicklist={handleAddPicklist}
          onClearAllPicked={clearAllPicked}
          onExportCSV={handleExportCSV}
          pickedCount={pickedCount}
          totalTeams={teams.length}
          isLoading={isLoading}
          configurations={configurations}
          onSaveConfig={() => setShowSaveDialog(true)}
          onLoadConfig={handleLoadConfiguration}
          onManageConfigs={() => setShowManageDialog(true)}
        />

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading pick list...</p>
            </div>
          </div>
        )}

        {/* Pick list grid */}
        {!isLoading && selectedEventKey && teams.length > 0 && (
          <div className="h-[calc(100vh-320px)]">
            <PickListGrid
              teams={teams}
              columns={columns}
              isPicked={isPicked}
              onTogglePicked={togglePicked}
              onRemoveColumn={handleRemoveColumn}
              onColumnSortChange={handleColumnSortChange}
            />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !selectedEventKey && (
          <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">Select an event to view pick list</p>
              <p className="text-sm">Choose an event from the dropdown above</p>
            </div>
          </div>
        )}

        {/* No teams state */}
        {!isLoading && selectedEventKey && teams.length === 0 && !error && (
          <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">No team statistics available</p>
              <p className="text-sm">Calculate OPR/DPR/CCWM for this event first</p>
            </div>
          </div>
        )}

        {/* Configuration Dialogs (SCOUT-58) */}
        <SaveConfigDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          onSave={handleSaveConfiguration}
          existingNames={configurations.map((c) => c.name)}
        />

        <ManageConfigurationsDialog
          isOpen={showManageDialog}
          onClose={() => setShowManageDialog(false)}
          configurations={configurations}
          onRename={handleRenameConfiguration}
          onSetDefault={handleSetDefault}
          onDelete={handleDeleteConfiguration}
        />
      </div>
    </div>
  );
}
