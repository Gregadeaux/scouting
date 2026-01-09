/**
 * MatchScoutingSection Component
 *
 * Displays scouting data for a match, organized by alliance with expandable team details.
 * Shows Red Alliance vs Blue Alliance in a two-column layout with team cards showing
 * summary metrics and expandable sections for detailed JSONB data.
 *
 * @example Basic Usage
 * ```tsx
 * import { MatchScoutingSection } from '@/components/admin/matches/MatchScoutingSection';
 *
 * export default function MatchDetailPage({ params }: { params: { matchKey: string } }) {
 *   return (
 *     <div>
 *       <h1>Match Details</h1>
 *       <MatchScoutingSection
 *         matchKey={params.matchKey}
 *         eventKey="2025wimu"
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Compact Mode (for smaller displays)
 * ```tsx
 * <MatchScoutingSection
 *   matchKey="2025wimu_qm10"
 *   eventKey="2025wimu"
 *   compact={true}
 * />
 * ```
 *
 * @example Without Event Key (searches across all events)
 * ```tsx
 * <MatchScoutingSection matchKey="2025wimu_qm10" />
 * ```
 *
 * Features:
 * - Two-column alliance layout (Red vs Blue)
 * - Team cards with average metrics (auto/teleop/endgame/total points)
 * - Expandable sections showing all scout entries per team
 * - Handles multiple scouts per team
 * - Data quality badges (Complete/Partial/Issues)
 * - Coverage percentage display
 * - Export functionality (JSON download)
 * - Modal detail view with full JSONB display
 * - Loading, error, and empty states
 * - Responsive design (stacks on mobile)
 *
 * Data Source: Uses `/api/matches/[matchKey]/scouting` endpoint (SCOUT-36)
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronUp, Download, RefreshCw, User } from 'lucide-react';
import { JSONBDataDisplay } from '@/components/scouting/JSONBDataDisplay';
import { useMatchScouting } from '@/hooks/useMatchScouting';
import type { ScoutingEntryWithDetails } from '@/types/admin';

interface MatchScoutingSectionProps {
  matchKey: string;
  eventKey?: string;
  compact?: boolean;
}

interface TeamScoutingCardProps {
  teamNumber: number;
  teamName?: string;
  entries: ScoutingEntryWithDetails[];
  alliance: 'red' | 'blue';
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (entry: ScoutingEntryWithDetails) => void;
}

function TeamScoutingCard({
  teamNumber,
  teamName,
  entries,
  alliance,
  isExpanded,
  onToggle,
  onViewDetails,
}: TeamScoutingCardProps) {
  const allianceColor = alliance === 'red' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/10';
  const headerColor = alliance === 'red' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20';

  // Calculate average metrics from all entries
  const avgMetrics = entries.length > 0 ? {
    auto: entries.reduce((sum, e) => sum + e.preview_metrics.auto_points, 0) / entries.length,
    teleop: entries.reduce((sum, e) => sum + e.preview_metrics.teleop_points, 0) / entries.length,
    endgame: entries.reduce((sum, e) => sum + e.preview_metrics.endgame_points, 0) / entries.length,
    total: entries.reduce((sum, e) => sum + e.preview_metrics.total_points, 0) / entries.length,
  } : null;

  const getQualityBadge = (quality: 'complete' | 'partial' | 'issues') => {
    switch (quality) {
      case 'complete':
        return <Badge variant="success">Complete</Badge>;
      case 'partial':
        return <Badge variant="warning">Partial</Badge>;
      case 'issues':
        return <Badge variant="danger">Issues</Badge>;
    }
  };

  return (
    <Card className={`border-2 ${allianceColor}`}>
      <div
        className={`flex cursor-pointer items-center justify-between p-4 ${headerColor}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold">{teamNumber}</div>
          {teamName && <div className="text-sm text-gray-600 dark:text-gray-400">{teamName}</div>}
          <Badge variant="default">{entries.length} {entries.length === 1 ? 'scout' : 'scouts'}</Badge>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </div>

      <CardContent className="pt-4">
        {avgMetrics && (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Auto</div>
              <div className="text-lg font-semibold">{avgMetrics.auto.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Teleop</div>
              <div className="text-lg font-semibold">{avgMetrics.teleop.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Endgame</div>
              <div className="text-lg font-semibold">{avgMetrics.endgame.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {avgMetrics.total.toFixed(1)}
              </div>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {entries.map((entry, index) => (
              <div
                key={entry.id || index}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{entry.scout_name}</div>
                    <div className="text-xs text-gray-500">
                      {entry.preview_metrics.total_points.toFixed(1)} pts
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getQualityBadge(entry.data_quality)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(entry)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MatchScoutingSection({
  matchKey,
  eventKey,
  compact: _compact = false,
}: MatchScoutingSectionProps) {
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<ScoutingEntryWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const {
    data,
    metadata,
    isLoading,
    error,
    refetch,
  } = useMatchScouting({
    matchKey,
    eventKey,
  });

  const toggleTeam = (teamNumber: number) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamNumber)) {
      newExpanded.delete(teamNumber);
    } else {
      newExpanded.add(teamNumber);
    }
    setExpandedTeams(newExpanded);
  };

  const handleViewDetails = (entry: ScoutingEntryWithDetails) => {
    setSelectedEntry(entry);
    setIsDetailModalOpen(true);
  };

  const handleExport = () => {
    if (!data) return;

    const exportData = {
      match_key: matchKey,
      event_key: eventKey,
      metadata,
      red_alliance: data.red_alliance,
      blue_alliance: data.blue_alliance,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match-${matchKey}-scouting.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">Loading match scouting data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

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

  // Empty state
  if (!data || (data.red_alliance.length === 0 && data.blue_alliance.length === 0)) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-gray-600">No scouting data available</p>
            <p className="mt-2 text-sm text-gray-500">
              This match has not been scouted yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group entries by team
  const redTeams = new Map<number, ScoutingEntryWithDetails[]>();
  const blueTeams = new Map<number, ScoutingEntryWithDetails[]>();

  data.red_alliance.forEach(entry => {
    if (!redTeams.has(entry.team_number)) {
      redTeams.set(entry.team_number, []);
    }
    redTeams.get(entry.team_number)!.push(entry);
  });

  data.blue_alliance.forEach(entry => {
    if (!blueTeams.has(entry.team_number)) {
      blueTeams.set(entry.team_number, []);
    }
    blueTeams.get(entry.team_number)!.push(entry);
  });

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Match Scouting Data</h3>
          {metadata && (
            <p className="text-sm text-gray-600">
              {metadata.teams_scouted} of 6 teams scouted ({metadata.coverage_percentage.toFixed(0)}% coverage)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Two-column alliance layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Red Alliance */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-red-600">Red Alliance</h4>
          {Array.from(redTeams.entries()).map(([teamNumber, entries]) => (
            <TeamScoutingCard
              key={teamNumber}
              teamNumber={teamNumber}
              teamName={entries[0]?.team_name}
              entries={entries}
              alliance="red"
              isExpanded={expandedTeams.has(teamNumber)}
              onToggle={() => toggleTeam(teamNumber)}
              onViewDetails={handleViewDetails}
            />
          ))}
          {redTeams.size === 0 && (
            <Card className="border-2 border-red-500 bg-red-50 dark:bg-red-900/10">
              <CardContent className="py-8 text-center text-gray-500">
                No red alliance teams scouted
              </CardContent>
            </Card>
          )}
        </div>

        {/* Blue Alliance */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-blue-600">Blue Alliance</h4>
          {Array.from(blueTeams.entries()).map(([teamNumber, entries]) => (
            <TeamScoutingCard
              key={teamNumber}
              teamNumber={teamNumber}
              teamName={entries[0]?.team_name}
              entries={entries}
              alliance="blue"
              isExpanded={expandedTeams.has(teamNumber)}
              onToggle={() => toggleTeam(teamNumber)}
              onViewDetails={handleViewDetails}
            />
          ))}
          {blueTeams.size === 0 && (
            <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/10">
              <CardContent className="py-8 text-center text-gray-500">
                No blue alliance teams scouted
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry && (
                <>
                  Team {selectedEntry.team_number} - Match {selectedEntry.match_key}
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
