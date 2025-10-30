'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MatchHeader } from '@/components/admin/matches/MatchHeader';
import { AllianceColumn } from '@/components/admin/matches/AllianceColumn';
import { ScoreBreakdownCard } from '@/components/admin/matches/ScoreBreakdownCard';
import { VideoLinksCard } from '@/components/admin/matches/VideoLinksCard';
import { TeamRecentTable } from '@/components/admin/matches/TeamRecentTable';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import type { MatchSchedule, Team, TBAVideo } from '@/types';

interface EnrichedRecentMatch {
  match_key: string;
  match_number: number;
  comp_level: string;
  alliance: 'red' | 'blue';
  score: number;
  opponent_score: number;
  result: 'W' | 'L' | 'T' | '-';
}

interface VideoLink {
  type: 'tba' | 'youtube' | 'other';
  url: string;
  label: string;
}

interface MatchDetailClientProps {
  match: MatchSchedule;
  teams: Record<number, Team>;
  recentMatches: Record<number, EnrichedRecentMatch[]>;
  videos: TBAVideo[];
  scoreBreakdown: {
    red: Record<string, unknown> | null;
    blue: Record<string, unknown> | null;
  };
}

export default function MatchDetailClient({
  match,
  teams,
  recentMatches,
  videos,
  scoreBreakdown,
}: MatchDetailClientProps) {
  const router = useRouter();

  const redTeams = [match.red_1, match.red_2, match.red_3];
  const blueTeams = [match.blue_1, match.blue_2, match.blue_3];

  // Transform TBAVideo[] to VideoLink[] with labels
  const videoLinks: VideoLink[] = videos.map((video, index) => ({
    type: video.type,
    url: video.url || `https://www.thebluealliance.com/match/${match.match_key}`,
    label: video.type === 'youtube' ? `YouTube Video ${index + 1}` : `TBA Match Video`,
  }));

  return (
    <div className="space-y-6 pb-8">
      {/* Back Button */}
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Matches
      </Button>

      {/* Match Header */}
      <MatchHeader match={match} />

      {/* 3-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Red Alliance */}
        <div>
          <AllianceColumn alliance="red" teamNumbers={redTeams} teams={teams} />
        </div>

        {/* Column 2: Score Breakdown & Videos */}
        <div className="space-y-6">
          <ScoreBreakdownCard
            redBreakdown={scoreBreakdown.red as Record<string, number | null> | null}
            blueBreakdown={scoreBreakdown.blue as Record<string, number | null> | null}
          />
          <VideoLinksCard videos={videoLinks} />
        </div>

        {/* Column 3: Blue Alliance */}
        <div>
          <AllianceColumn alliance="blue" teamNumbers={blueTeams} teams={teams} />
        </div>
      </div>

      {/* Recent Matches for Each Team (Below the fold) */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Team Recent Performance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...redTeams, ...blueTeams]
            .filter((teamNum): teamNum is number => teamNum !== null && teamNum !== undefined)
            .map((teamNumber) => {
              const team = teams[teamNumber];
              const matches = recentMatches[teamNumber] || [];

              return (
                <TeamRecentTable
                  key={teamNumber}
                  teamNumber={teamNumber}
                  teamName={team?.team_nickname || team?.team_name}
                  recentMatches={matches}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
