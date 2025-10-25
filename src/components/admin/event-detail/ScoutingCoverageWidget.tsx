'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { ScoutingCoverageStats } from '@/types/event-detail';

interface ScoutingCoverageWidgetProps {
  stats: ScoutingCoverageStats;
}

export function ScoutingCoverageWidget({ stats }: ScoutingCoverageWidgetProps) {
  const matchColor = stats.scouting_percentage >= 80
    ? 'text-green-600'
    : stats.scouting_percentage >= 50
    ? 'text-yellow-600'
    : 'text-red-600';

  const pitColor = stats.pit_scouting_percentage >= 80
    ? 'text-green-600'
    : stats.pit_scouting_percentage >= 50
    ? 'text-yellow-600'
    : 'text-red-600';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Match Scouting Coverage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Match Scouting</CardTitle>
          {stats.scouting_percentage >= 80 ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${matchColor}`}>
            {stats.matches_scouted} / {stats.total_matches}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {stats.scouting_percentage.toFixed(1)}% coverage
          </p>
          <Progress value={stats.scouting_percentage} className="mt-3" />
        </CardContent>
      </Card>

      {/* Pit Scouting Coverage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pit Scouting</CardTitle>
          {stats.pit_scouting_percentage >= 80 ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${pitColor}`}>
            {stats.teams_with_pit_scouting} / {stats.total_teams}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {stats.pit_scouting_percentage.toFixed(1)}% coverage
          </p>
          <Progress value={stats.pit_scouting_percentage} className="mt-3" />
        </CardContent>
      </Card>
    </div>
  );
}
