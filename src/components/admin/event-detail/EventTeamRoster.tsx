'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import type { Team } from '@/types';

interface EventTeamRosterProps {
  teams: Team[];
  eventKey?: string;
}

export function EventTeamRoster({ teams, eventKey }: EventTeamRosterProps) {
  const [search, setSearch] = useState('');

  const filteredTeams = teams
    .filter((team) =>
      team.team_number.toString().includes(search) ||
      team.team_name.toLowerCase().includes(search.toLowerCase()) ||
      team.team_nickname?.toLowerCase().includes(search.toLowerCase()) ||
      team.city?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.team_number - b.team_number); // Numeric sort by team number

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Teams</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {teams.length} {teams.length === 1 ? 'team' : 'teams'} registered
            </p>
          </div>
          <div className="relative w-full sm:w-auto sm:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by number, name, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-2 whitespace-nowrap">Team #</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Location</th>
                <th className="text-left p-2 whitespace-nowrap">Rookie Year</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map((team) => (
                <tr key={team.team_number} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-2 font-mono font-bold">
                    {eventKey ? (
                      <Link
                        href={`/admin/events/${eventKey}/teams/${team.team_number}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                      >
                        {team.team_number}
                      </Link>
                    ) : (
                      team.team_number
                    )}
                  </td>
                  <td className="p-2">{team.team_nickname || team.team_name}</td>
                  <td className="p-2 text-sm text-gray-600 dark:text-gray-400">
                    {team.city}, {team.state_province}
                  </td>
                  <td className="p-2">
                    {team.rookie_year && (
                      <Badge variant="outline">{team.rookie_year}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTeams.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-600 mb-2">
                {search ? (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      No teams match &quot;{search}&quot;
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Try adjusting your search terms
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      No teams registered yet
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Teams will appear here once they register for this event
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
