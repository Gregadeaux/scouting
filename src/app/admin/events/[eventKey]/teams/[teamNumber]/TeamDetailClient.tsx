'use client';

import React, { useState } from 'react';
import { ArrowLeft, Camera, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JSONBDataDisplay } from '@/components/scouting/JSONBDataDisplay';
import {
  TeamPerformanceHero,
  MatchTrendChart,
  ScoringBreakdownChart,
  MatchHistoryTable,
  GamePieceBreakdown,
} from '@/components/analytics/team';
import { PitScoutingViewer } from '@/components/mentor/PitScoutingViewer';
import { TeamPhotosGallery } from '@/components/mentor/TeamPhotosGallery';
import { useTeamScouting } from '@/hooks/useTeamScouting';
import type { TeamDetail } from '@/types/team-detail';
import type { ScoutingEntryWithDetails } from '@/types/admin';

interface TeamDetailClientProps {
  teamDetail: TeamDetail;
  eventKey: string;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-slate-400" />
          <span className="text-lg font-semibold text-white">{title}</span>
          {badge && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-slate-400" />
        )}
      </button>
      {isOpen && <div className="border-t border-slate-800 p-6">{children}</div>}
    </div>
  );
}

export default function TeamDetailClient({ teamDetail, eventKey }: TeamDetailClientProps) {
  const { team } = teamDetail;
  const [selectedEntry, setSelectedEntry] = useState<ScoutingEntryWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch scouting data using the hook
  const {
    data: scoutingData,
    aggregates,
    isLoading,
    error,
  } = useTeamScouting({
    teamNumber: team.team_number,
    eventKey,
    sortBy: 'match_number',
    sortOrder: 'asc',
    limit: 100,
  });

  const handleRowClick = (entry: ScoutingEntryWithDetails) => {
    setSelectedEntry(entry);
    setIsDetailModalOpen(true);
  };

  const photoCount = teamDetail.photos?.length || 0;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />

      <div className="relative mx-auto max-w-7xl px-4 py-6">
        {/* Navigation */}
        <nav className="mb-6">
          <Link
            href={`/admin/events/${eventKey}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Link>
        </nav>

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-700 bg-red-500/10 p-6">
            <p className="text-red-400">Failed to load scouting data: {error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Hero Section */}
          <TeamPerformanceHero
            team={team}
            aggregates={aggregates}
            isLoading={isLoading}
          />

          {/* Charts Row */}
          {aggregates && aggregates.total_matches > 0 && (
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Trend Chart - Wider */}
              <div className="lg:col-span-3">
                <MatchTrendChart scoutingData={scoutingData} isLoading={isLoading} />
              </div>

              {/* Breakdown Chart - Narrower */}
              <div className="lg:col-span-2">
                <ScoringBreakdownChart aggregates={aggregates} isLoading={isLoading} />
              </div>
            </div>
          )}

          {/* Game Piece Breakdown - 2025 Reefscape specific */}
          {scoutingData.length > 0 && (
            <GamePieceBreakdown scoutingData={scoutingData} isLoading={isLoading} />
          )}

          {/* Match History Table */}
          <MatchHistoryTable
            scoutingData={scoutingData}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />

          {/* Collapsible Sections for Secondary Content */}
          <div className="space-y-4">
            {/* Pit Scouting */}
            {teamDetail.pit_scouting && (
              <CollapsibleSection
                title="Pit Scouting Data"
                icon={ClipboardList}
                defaultOpen={false}
              >
                <PitScoutingViewer
                  pitScouting={teamDetail.pit_scouting}
                  scoutedByName={teamDetail.pit_scouting_by_name}
                />
              </CollapsibleSection>
            )}

            {/* Photos */}
            {photoCount > 0 && (
              <CollapsibleSection
                title="Robot Photos"
                icon={Camera}
                defaultOpen={false}
                badge={`${photoCount} photos`}
              >
                <TeamPhotosGallery photos={teamDetail.photos || []} />
              </CollapsibleSection>
            )}
          </div>
        </div>

        {/* Spacing at bottom */}
        <div className="h-8" />
      </div>

      {/* Match Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto border-slate-700 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedEntry && (
                <>
                  Team {selectedEntry.team_number} - Match Q
                  {selectedEntry.match_number || selectedEntry.match_key}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-800 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Auto</p>
                  <p className="font-mono text-2xl font-bold text-cyan-400">
                    {selectedEntry.preview_metrics.auto_points}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-800 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Teleop</p>
                  <p className="font-mono text-2xl font-bold text-amber-400">
                    {selectedEntry.preview_metrics.teleop_points}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-800 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Endgame</p>
                  <p className="font-mono text-2xl font-bold text-rose-400">
                    {selectedEntry.preview_metrics.endgame_points}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-800 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
                  <p className="font-mono text-2xl font-bold text-white">
                    {selectedEntry.preview_metrics.total_points}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span>Scout: {selectedEntry.scout_name}</span>
                <span>Match: {selectedEntry.match_key}</span>
                {selectedEntry.team_name && <span>Team: {selectedEntry.team_name}</span>}
              </div>

              {/* Performance Data */}
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-cyan-400">
                    <div className="h-2 w-2 rounded-full bg-cyan-400" />
                    Autonomous Performance
                  </h4>
                  <div className="rounded-lg bg-slate-800 p-4">
                    <JSONBDataDisplay
                      data={selectedEntry.auto_performance}
                      seasonConfig={{}}
                      compact={true}
                    />
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-amber-400">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    Teleoperated Performance
                  </h4>
                  <div className="rounded-lg bg-slate-800 p-4">
                    <JSONBDataDisplay
                      data={selectedEntry.teleop_performance}
                      seasonConfig={{}}
                      compact={true}
                    />
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-rose-400">
                    <div className="h-2 w-2 rounded-full bg-rose-400" />
                    Endgame Performance
                  </h4>
                  <div className="rounded-lg bg-slate-800 p-4">
                    <JSONBDataDisplay
                      data={selectedEntry.endgame_performance}
                      seasonConfig={{}}
                      compact={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
