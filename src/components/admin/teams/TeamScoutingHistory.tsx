/**
 * TeamScoutingHistory Component
 *
 * Displays a team's scouting history across all matches at an event.
 * Shows aggregate statistics in a summary card, followed by a sortable,
 * paginated table of match-by-match performance data.
 *
 * @example Basic Usage
 * ```tsx
 * import { TeamScoutingHistory } from '@/components/admin/teams/TeamScoutingHistory';
 *
 * export default function TeamDetailPage({ params }: { params: { teamNumber: string } }) {
 *   return (
 *     <div>
 *       <h1>Team {params.teamNumber}</h1>
 *       <TeamScoutingHistory
 *         teamNumber={parseInt(params.teamNumber)}
 *         eventKey="2025wimu"
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Without Aggregates (just match list)
 * ```tsx
 * <TeamScoutingHistory
 *   teamNumber={930}
 *   eventKey="2025wimu"
 *   showAggregates={false}
 * />
 * ```
 *
 * @example Compact Mode (fewer items per page)
 * ```tsx
 * <TeamScoutingHistory
 *   teamNumber={930}
 *   eventKey="2025wimu"
 *   compact={true}
 * />
 * ```
 *
 * @example In a Dashboard Widget
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Recent Performance - Team 930</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     <TeamScoutingHistory
 *       teamNumber={930}
 *       eventKey="2025wimu"
 *       showAggregates={true}
 *       compact={true}
 *     />
 *   </CardContent>
 * </Card>
 * ```
 *
 * Features:
 * - Aggregate statistics card (average auto/teleop/endgame/total points)
 * - Total matches scouted counter
 * - Data quality distribution with colored badges
 * - Match-by-match table with sortable columns
 * - Sort by: match_number, created_at, total_points
 * - Pagination for teams with many matches
 * - Expandable rows with full JSONB data display
 * - Export functionality (JSON download)
 * - Loading, error, and empty states
 * - Responsive design
 *
 * Data Source: Uses `/api/teams/[teamNumber]/scouting` endpoint (SCOUT-37)
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { TeamScoutingAggregates } from './TeamScoutingAggregates';
import { ScoutingDataList } from '@/components/admin/scouting/ScoutingDataList';
import { JSONBDataDisplay } from '@/components/scouting/JSONBDataDisplay';
import { useTeamScouting } from '@/hooks/useTeamScouting';
import type { ScoutingEntryWithDetails } from '@/types/admin';

interface TeamScoutingHistoryProps {
  teamNumber: number;
  eventKey: string;
  showAggregates?: boolean;
  compact?: boolean;
}

export function TeamScoutingHistory({
  teamNumber,
  eventKey,
  showAggregates = true,
  compact = false,
}: TeamScoutingHistoryProps) {
  // Debug logging
  console.log('[TeamScoutingHistory] Rendering with:', { teamNumber, eventKey });

  const [sortBy, setSortBy] = useState<'match_number' | 'created_at' | 'total_points'>('match_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<ScoutingEntryWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const {
    data,
    aggregates,
    pagination,
    isLoading,
    error,
    refetch,
  } = useTeamScouting({
    teamNumber,
    eventKey,
    sortBy,
    sortOrder,
    limit: compact ? 10 : 50,
    page: currentPage,
  });

  // Debug: log what data we got
  console.log('[TeamScoutingHistory] Received data:', {
    matchCount: data?.length,
    eventKeys: [...new Set(data?.map(d => d.match_schedule?.event_key))],
  });

  const handleSort = (field: string) => {
    const validSortFields = ['match_number', 'created_at', 'total_points'];
    if (!validSortFields.includes(field)) return;

    if (sortBy === field) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New sort field, default to ascending
      setSortBy(field as 'match_number' | 'created_at' | 'total_points');
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const handleRowClick = (entry: ScoutingEntryWithDetails) => {
    setSelectedEntry(entry);
    setIsDetailModalOpen(true);
  };

  const handleExport = () => {
    // Create JSON export of all data
    const exportData = {
      team_number: teamNumber,
      event_key: eventKey,
      aggregates,
      matches: data,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-${teamNumber}-${eventKey}-scouting.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && pagination.has_more) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-red-600">Error loading scouting data</p>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <Button onClick={refetch} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state (no data)
  if (!isLoading && data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-gray-600">No scouting data available</p>
            <p className="mt-2 text-sm text-gray-500">
              Team {teamNumber} has not been scouted at this event yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aggregate Statistics Card */}
      {showAggregates && aggregates && (
        <TeamScoutingAggregates
          aggregates={aggregates}
          teamNumber={teamNumber}
          eventKey={eventKey}
        />
      )}

      {/* Controls Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Match-by-Match Performance</h3>
        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm" disabled={data.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Match-by-Match Table */}
      <Card>
        <CardContent className="p-0">
          <ScoutingDataList
            data={data}
            loading={isLoading}
            onRowClick={handleRowClick}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {pagination && pagination.total > (compact ? 10 : 50) && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {Math.min(pagination.offset + 1, pagination.total)} -{' '}
            {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} entries
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePreviousPage}
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center px-4">
              <span className="text-sm">Page {currentPage}</span>
            </div>
            <Button
              onClick={handleNextPage}
              variant="outline"
              size="sm"
              disabled={!pagination.has_more || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry && (
                <>
                  Team {selectedEntry.team_number} - Match {selectedEntry.match_number || selectedEntry.match_key}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Scout:</span> {selectedEntry.scout_name}
                </div>
                <div>
                  <span className="font-medium">Match:</span> {selectedEntry.match_key}
                </div>
                <div>
                  <span className="font-medium">Team:</span> {selectedEntry.team_number} {selectedEntry.team_name && `(${selectedEntry.team_name})`}
                </div>
                <div>
                  <span className="font-medium">Total Points:</span> {selectedEntry.preview_metrics.total_points}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Autonomous Performance</h4>
                  <JSONBDataDisplay
                    data={selectedEntry.auto_performance}
                    seasonConfig={{}}
                    compact={true}
                  />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Teleoperated Performance</h4>
                  <JSONBDataDisplay
                    data={selectedEntry.teleop_performance}
                    seasonConfig={{}}
                    compact={true}
                  />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Endgame Performance</h4>
                  <JSONBDataDisplay
                    data={selectedEntry.endgame_performance}
                    seasonConfig={{}}
                    compact={true}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
