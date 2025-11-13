'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { MatchWithScoutingStatus } from '@/types/event-detail';

interface EventMatchScheduleProps {
  matches: MatchWithScoutingStatus[];
}

export function EventMatchSchedule({ matches }: EventMatchScheduleProps) {
  const [compLevel, setCompLevel] = useState<string>('all');
  const router = useRouter();

  const filteredMatches = matches.filter((match) =>
    compLevel === 'all' || match.comp_level === compLevel
  );

  const getCompLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      qm: 'Qualification',
      ef: 'Eighth-Final',
      qf: 'Quarter-Final',
      sf: 'Semi-Final',
      f: 'Final',
    };
    return labels[level] || level;
  };

  const countScoutedPositions = (status: MatchWithScoutingStatus['scouting_status']) => {
    return Object.values(status).filter(Boolean).length;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Match Schedule ({matches.length})</CardTitle>
          <div className="flex gap-2">
            <Badge
              variant={compLevel === 'all' ? 'default' : 'outline'}
              onClick={() => setCompLevel('all')}
              className="cursor-pointer"
            >
              All
            </Badge>
            <Badge
              variant={compLevel === 'qm' ? 'default' : 'outline'}
              onClick={() => setCompLevel('qm')}
              className="cursor-pointer"
            >
              Quals
            </Badge>
            <Badge
              variant={compLevel === 'sf' ? 'default' : 'outline'}
              onClick={() => setCompLevel('sf')}
              className="cursor-pointer"
            >
              Playoffs
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-2">Match</th>
                <th className="text-left p-2">Red Alliance</th>
                <th className="text-left p-2">Blue Alliance</th>
                <th className="text-center p-2">Score</th>
                <th className="text-center p-2">Scouted</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.map((match) => {
                const scoutedCount = countScoutedPositions(match.scouting_status);
                const handleMatchClick = () => {
                  router.push(`/admin/matches/${match.match_key}`);
                };
                const handleKeyDown = (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMatchClick();
                  }
                };
                return (
                  <tr
                    key={match.match_key}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={handleMatchClick}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${getCompLevelLabel(match.comp_level)} ${match.match_number}`}
                  >
                    <td className="p-2">
                      <Badge variant="outline">
                        {getCompLevelLabel(match.comp_level)} {match.match_number}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <span className={match.scouting_status.red_1 ? 'text-green-600' : ''}>
                          {match.red_1}
                        </span>
                        <span className={match.scouting_status.red_2 ? 'text-green-600' : ''}>
                          {match.red_2}
                        </span>
                        <span className={match.scouting_status.red_3 ? 'text-green-600' : ''}>
                          {match.red_3}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <span className={match.scouting_status.blue_1 ? 'text-blue-600' : ''}>
                          {match.blue_1}
                        </span>
                        <span className={match.scouting_status.blue_2 ? 'text-blue-600' : ''}>
                          {match.blue_2}
                        </span>
                        <span className={match.scouting_status.blue_3 ? 'text-blue-600' : ''}>
                          {match.blue_3}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      {match.red_score !== null && match.blue_score !== null ? (
                        <span className="font-mono">
                          {match.red_score} - {match.blue_score}
                        </span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {scoutedCount === 6 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                      ) : scoutedCount > 0 ? (
                        <Badge variant="outline">{scoutedCount}/6</Badge>
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredMatches.length === 0 && (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              No matches found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
