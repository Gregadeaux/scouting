import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import type { MatchSchedule } from '@/types';

interface MatchHeaderProps {
  match: MatchSchedule;
}

const COMP_LEVEL_LABELS: Record<string, string> = {
  qm: 'Qualification',
  ef: 'Eighth Final',
  qf: 'Quarter Final',
  sf: 'Semi Final',
  f: 'Final',
};

type BadgeVariant = 'default' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline';

const COMP_LEVEL_COLORS: Record<string, BadgeVariant> = {
  qm: 'secondary',
  ef: 'warning',
  qf: 'warning',
  sf: 'warning',
  f: 'danger',
};

export function MatchHeader({ match }: MatchHeaderProps) {
  const hasScores = match.red_score !== null && match.blue_score !== null;
  const redScore = match.red_score ?? 0;
  const blueScore = match.blue_score ?? 0;

  const formatTime = (isoString?: string) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const scheduledTime = formatTime(match.scheduled_time);

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Left: Match Info */}
      <div className="flex items-center gap-3">
        <Badge variant={COMP_LEVEL_COLORS[match.comp_level] || 'secondary'}>
          {COMP_LEVEL_LABELS[match.comp_level] || match.comp_level.toUpperCase()}
        </Badge>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Match {match.match_number}
          </h1>
          {scheduledTime && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Scheduled: {scheduledTime}
            </p>
          )}
        </div>
      </div>

      {/* Center: Scores */}
      {hasScores ? (
        <div className="flex items-center gap-3">
          {/* Red Score */}
          <div className="flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 dark:bg-red-900/30">
            <span className="text-sm font-medium text-red-900 dark:text-red-100">RED</span>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {redScore}
            </span>
            {match.winning_alliance === 'red' && (
              <Trophy className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>

          {/* VS */}
          <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">VS</span>

          {/* Blue Score */}
          <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 dark:bg-blue-900/30">
            {match.winning_alliance === 'blue' && (
              <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {blueScore}
            </span>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">BLUE</span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Scores not yet available
        </div>
      )}

      {/* Right: Winner Badge */}
      {hasScores && match.winning_alliance && (
        <Badge
          variant={match.winning_alliance === 'tie' ? 'secondary' : 'success'}
          className="ml-auto"
        >
          {match.winning_alliance === 'tie'
            ? 'TIE'
            : `${match.winning_alliance.toUpperCase()} WINS`}
        </Badge>
      )}
    </div>
  );
}
