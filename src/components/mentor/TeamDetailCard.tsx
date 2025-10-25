import React from 'react';
import { ExternalLink, MapPin, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { Team } from '@/types';

interface TeamDetailCardProps {
  team: Team;
}

/**
 * TeamDetailCard Component
 *
 * Displays team information with links to external resources.
 * Shows team number, name, location, website, and rookie year.
 *
 * @example
 * ```tsx
 * <TeamDetailCard team={teamData} />
 * ```
 */
export function TeamDetailCard({ team }: TeamDetailCardProps) {
  const tbaUrl = `https://www.thebluealliance.com/team/${team.team_number}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-4xl font-bold text-frc-blue mb-2">
              {team.team_number}
            </div>
            <CardTitle className="text-2xl">
              {team.team_name || team.team_nickname || 'Unknown Team'}
            </CardTitle>
            {team.team_nickname && team.team_name !== team.team_nickname && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                "{team.team_nickname}"
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location */}
        {(team.city || team.state_province || team.country) && (
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              {[team.city, team.state_province, team.country]
                .filter(Boolean)
                .join(', ')}
            </div>
          </div>
        )}

        {/* Rookie Year */}
        {team.rookie_year && (
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <div className="text-sm">
              Rookie Year: <span className="font-semibold">{team.rookie_year}</span>
            </div>
          </div>
        )}

        {/* External Links */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          {/* The Blue Alliance */}
          <a
            href={tbaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-frc-blue hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View on TBA
          </a>

          {/* Team Website */}
          {team.website && (
            <a
              href={team.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-frc-blue hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Team Website
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
