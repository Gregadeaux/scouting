'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TeamDetailCard } from '@/components/mentor/TeamDetailCard';
import { PitScoutingViewer } from '@/components/mentor/PitScoutingViewer';
import { MatchPerformanceSummary } from '@/components/mentor/MatchPerformanceSummary';
import { TeamPhotosGallery } from '@/components/mentor/TeamPhotosGallery';
import { TeamScoutingHistory } from '@/components/admin/teams/TeamScoutingHistory';
import type { TeamDetail } from '@/types/team-detail';

interface TeamDetailClientProps {
  teamDetail: TeamDetail;
  eventKey: string;
}

export default function TeamDetailClient({ teamDetail, eventKey }: TeamDetailClientProps) {
  const { team } = teamDetail;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href={`/admin/events/${eventKey}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Event
        </Link>
      </div>

      {/* Responsive Grid Layout: Mobile = 1 col, Large screens = 3 cols (2+1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team Detail Card */}
          <TeamDetailCard team={team} />

          {/* Pit Scouting Data */}
          <PitScoutingViewer
            pitScouting={teamDetail.pit_scouting}
            scoutedByName={teamDetail.pit_scouting_by_name}
          />

          {/* Team Photos Gallery */}
          <TeamPhotosGallery photos={teamDetail.photos || []} />

          {/* Team Scouting History */}
          <TeamScoutingHistory
            key={`${team.team_number}-${eventKey}`}
            teamNumber={team.team_number}
            eventKey={eventKey}
            showAggregates={true}
          />
        </div>

        {/* Sidebar - Right Column (1/3 width on large screens, sticky on scroll) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4 space-y-6">
            {/* Match Performance Summary - Sticky on large screens */}
            <MatchPerformanceSummary summary={teamDetail.match_summary} />

            {/* Future sidebar widgets can go here */}
          </div>
        </div>
      </div>

      {/* Spacing at bottom */}
      <div className="h-8" />
    </div>
  );
}