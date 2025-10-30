import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { ExternalLink } from 'lucide-react';
import type { Team } from '@/types';

interface AllianceColumnProps {
  alliance: 'red' | 'blue';
  teamNumbers: (number | null | undefined)[];
  teams: Record<number, Team>;
}

export function AllianceColumn({ alliance, teamNumbers, teams }: AllianceColumnProps) {
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

                    {/* Quick Stats Placeholder */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg Score</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">-</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">W-L-T</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">-</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Rank</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">-</p>
                      </div>
                    </div>
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
