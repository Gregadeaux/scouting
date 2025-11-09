import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { ExternalLink } from 'lucide-react';
import type { Team } from '@/types';
import type { ScoutingEntryWithDetails } from '@/types/admin';

interface AllianceColumnProps {
  alliance: 'red' | 'blue';
  teamNumbers: (number | null | undefined)[];
  teams: Record<number, Team>;
  scoutingData?: Record<number, ScoutingEntryWithDetails[]>;
}

export function AllianceColumn({ alliance, teamNumbers, teams, scoutingData }: AllianceColumnProps) {
  const isRed = alliance === 'red';
  const bgColor = isRed
    ? 'bg-red-50 dark:bg-red-950/20'
    : 'bg-blue-50 dark:bg-blue-950/20';
  const headerBg = isRed
    ? 'bg-red-600 dark:bg-red-700'
    : 'bg-blue-600 dark:bg-blue-700';
  const borderColor = isRed
    ? 'border-red-200 dark:border-red-800'
    : 'border-blue-200 dark:border-blue-800';

  return (
    <div className="flex flex-col gap-3">
      {/* Alliance Header */}
      <div className={`${headerBg} rounded-lg px-4 py-2 text-center`}>
        <h2 className="text-xl font-bold text-white uppercase tracking-wide">
          {alliance} Alliance
        </h2>
      </div>

      {/* Team Cards */}
      <div className="flex flex-col gap-3">
        {teamNumbers.map((teamNumber, index) => {
          const team = teamNumber ? teams[teamNumber] : null;
          const position = index + 1;

          // Get scouting data for this team
          const teamScoutingEntries = teamNumber && scoutingData ? scoutingData[teamNumber] : undefined;

          // Calculate metrics from scouting data
          let metrics: { auto: number; teleop: number; endgame: number; isAverage: boolean; matchCount: number } | null = null;

          if (teamScoutingEntries && teamScoutingEntries.length > 0) {
            // Check if this is average data (from the API for upcoming matches)
            const isAverageData = teamScoutingEntries[0].auto_performance?.is_average === true;
            const matchCount = isAverageData ? (teamScoutingEntries[0].auto_performance?.match_count || 0) : teamScoutingEntries.length;

            if (matchCount > 0) {
              // Calculate average metrics
              const totalAuto = teamScoutingEntries.reduce((sum, e) => sum + e.preview_metrics.auto_points, 0);
              const totalTeleop = teamScoutingEntries.reduce((sum, e) => sum + e.preview_metrics.teleop_points, 0);
              const totalEndgame = teamScoutingEntries.reduce((sum, e) => sum + e.preview_metrics.endgame_points, 0);

              metrics = {
                auto: totalAuto / teamScoutingEntries.length,
                teleop: totalTeleop / teamScoutingEntries.length,
                endgame: totalEndgame / teamScoutingEntries.length,
                isAverage: isAverageData,
                matchCount: matchCount,
              };
            }
          }

          return (
            <Card
              key={`${alliance}-${position}`}
              className={`${bgColor} ${borderColor} border-2 hover:shadow-md transition-shadow`}
            >
              <CardContent className="p-4">
                {teamNumber && team ? (
                  <div className="space-y-2">
                    {/* Team Number & Link */}
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/admin/teams/${teamNumber}`}
                        className="group flex items-center gap-2"
                      >
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:underline">
                          {teamNumber}
                        </span>
                        <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <span className={`text-xs font-semibold ${
                        isRed ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        Position {position}
                      </span>
                    </div>

                    {/* Team Name */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                        {team.team_nickname || team.team_name}
                      </h3>
                      {team.city && team.state_province && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {team.city}, {team.state_province}
                        </p>
                      )}
                    </div>

                    {/* Scouting Metrics or Placeholder */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      {metrics ? (
                        <>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {metrics.isAverage ? 'Avg Auto' : 'Auto'}
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {metrics.auto.toFixed(1)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {metrics.isAverage ? 'Avg Teleop' : 'Teleop'}
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {metrics.teleop.toFixed(1)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {metrics.isAverage ? 'Avg Endgame' : 'Endgame'}
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {metrics.endgame.toFixed(1)}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Auto</p>
                            <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">-</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Teleop</p>
                            <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">-</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Endgame</p>
                            <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">-</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Show match count for averages */}
                    {metrics && metrics.isAverage && (
                      <div className="text-center mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          {metrics.matchCount === 0
                            ? 'No prior matches'
                            : `From ${metrics.matchCount} ${metrics.matchCount === 1 ? 'match' : 'matches'}`}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No team assigned
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
