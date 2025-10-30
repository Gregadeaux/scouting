import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';

interface RecentMatch {
  match_key: string;
  match_number: number;
  comp_level: string;
  alliance: 'red' | 'blue';
  score: number | null;
  opponent_score: number | null;
  result: 'W' | 'L' | 'T' | '-';
}

interface TeamRecentTableProps {
  teamNumber: number;
  teamName?: string;
  recentMatches: RecentMatch[];
}

const COMP_LEVEL_LABELS: Record<string, string> = {
  qm: 'QM',
  ef: 'EF',
  qf: 'QF',
  sf: 'SF',
  f: 'F',
};

export function TeamRecentTable({ teamNumber, teamName, recentMatches }: TeamRecentTableProps) {
  return (
    <Card className="h-[300px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Recent Matches - Team {teamNumber}
          {teamName && <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">{teamName}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {recentMatches.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No recent matches found
            </p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[220px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                    Match
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                    Alliance
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                    Score
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                    Opp Score
                  </th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentMatches.map((match) => {
                  const resultColor =
                    match.result === 'W'
                      ? 'bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500'
                      : match.result === 'L'
                      ? 'bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500'
                      : match.result === 'T'
                      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500'
                      : '';

                  return (
                    <tr
                      key={match.match_key}
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${resultColor}`}
                    >
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {COMP_LEVEL_LABELS[match.comp_level] || match.comp_level.toUpperCase()}
                        </Badge>
                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                          {match.match_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={match.alliance === 'red' ? 'danger' : 'default'}
                          className="text-xs"
                        >
                          {match.alliance.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">
                        {match.score ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">
                        {match.opponent_score ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {match.result !== '-' ? (
                          <Badge
                            variant={
                              match.result === 'W'
                                ? 'success'
                                : match.result === 'L'
                                ? 'danger'
                                : 'warning'
                            }
                            className="text-xs font-bold"
                          >
                            {match.result}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
