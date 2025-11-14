'use client';

import { useEffect, useState } from 'react';
import { useMatchScouting, type Period } from '@/contexts/MatchScoutingContext';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PeriodTimerProps {
  autoAdvance?: boolean; // Auto-advance periods based on timer
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PERIOD_DURATIONS = {
  auto: 15, // 0-15s
  teleop: 120, // 15-135s
  endgame: 15, // 135-150s (overlap with teleop)
} as const;

const PERIOD_NAMES: Record<Period, string> = {
  'pre-match': 'Pre-Match',
  auto: 'Autonomous',
  teleop: 'Teleoperated',
  endgame: 'Endgame',
  submitted: 'Submitted',
};

const PERIOD_COLORS: Record<Period, string> = {
  'pre-match': 'bg-gray-500',
  auto: 'bg-blue-600',
  teleop: 'bg-green-600',
  endgame: 'bg-orange-600',
  submitted: 'bg-purple-600',
};

// ============================================================================
// Component
// ============================================================================

export function PeriodTimer({ autoAdvance = true, className }: PeriodTimerProps) {
  const { state, advancePeriod } = useMatchScouting();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Calculate elapsed time since match start
  useEffect(() => {
    if (!state.matchStartTime || state.currentPeriod === 'pre-match' || state.currentPeriod === 'submitted') {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - state.matchStartTime!) / 1000);
      setElapsedSeconds(elapsed);
    }, 100); // Update every 100ms for smooth display

    return () => clearInterval(interval);
  }, [state.matchStartTime, state.currentPeriod]);

  // Auto-advance periods based on elapsed time
  useEffect(() => {
    if (!autoAdvance || !state.matchStartTime || state.currentPeriod === 'submitted') return;

    if (state.currentPeriod === 'auto' && elapsedSeconds >= PERIOD_DURATIONS.auto) {
      advancePeriod();
    } else if (state.currentPeriod === 'teleop' && elapsedSeconds >= PERIOD_DURATIONS.auto + PERIOD_DURATIONS.teleop) {
      advancePeriod();
    } else if (state.currentPeriod === 'endgame' && elapsedSeconds >= 150) {
      // Match is over - could auto-submit or just wait
      // For now, just stop the timer
    }
  }, [elapsedSeconds, state.currentPeriod, state.matchStartTime, autoAdvance, advancePeriod]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get period-specific time remaining
  const getPeriodTime = (): { current: number; total: number; label: string } => {
    if (state.currentPeriod === 'auto') {
      const remaining = Math.max(0, PERIOD_DURATIONS.auto - elapsedSeconds);
      return { current: remaining, total: PERIOD_DURATIONS.auto, label: 'Auto' };
    } else if (state.currentPeriod === 'teleop') {
      const teleopElapsed = Math.max(0, elapsedSeconds - PERIOD_DURATIONS.auto);
      const remaining = Math.max(0, PERIOD_DURATIONS.teleop - teleopElapsed);
      return { current: remaining, total: PERIOD_DURATIONS.teleop, label: 'Teleop' };
    } else if (state.currentPeriod === 'endgame') {
      const endgameStart = PERIOD_DURATIONS.auto + PERIOD_DURATIONS.teleop;
      const endgameElapsed = Math.max(0, elapsedSeconds - endgameStart);
      const remaining = Math.max(0, PERIOD_DURATIONS.endgame - endgameElapsed);
      return { current: remaining, total: PERIOD_DURATIONS.endgame, label: 'Endgame' };
    }
    return { current: 0, total: 150, label: 'Match' };
  };

  const periodTime = getPeriodTime();
  const progressPercent = ((periodTime.total - periodTime.current) / periodTime.total) * 100;

  return (
    <div className={cn('bg-white border-b-4 shadow-md', PERIOD_COLORS[state.currentPeriod], className)}>
      <div className="px-4 py-2">
        {/* Top row - Period name and match time */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Period indicator */}
            <div
              className={cn(
                'px-4 py-1.5 rounded-lg text-white font-bold text-sm',
                PERIOD_COLORS[state.currentPeriod]
              )}
              onClick={() => advancePeriod()}
            >
              {PERIOD_NAMES[state.currentPeriod]}
            </div>

            {/* Match info */}
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{state.matchKey || 'No Match'}</span>
              {' • '}
              <span>Team {state.teamNumber || '---'}</span>
              {' • '}
              <span className={state.allianceColor === 'red' ? 'text-red-600' : 'text-blue-600'}>
                {state.allianceColor === 'red' ? 'Red' : 'Blue'} Alliance
              </span>
              {' • '}
              <span>Robot {state.robotPosition}</span>
            </div>
          </div>

          {/* Match timer */}
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-gray-800">
              {formatTime(elapsedSeconds)}
            </div>
            {state.currentPeriod !== 'pre-match' && state.currentPeriod !== 'submitted' && (
              <div className="text-xs text-gray-500">
                {periodTime.label}: {formatTime(periodTime.current)}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {state.currentPeriod !== 'pre-match' && state.currentPeriod !== 'submitted' && (
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn('absolute inset-y-0 left-0 transition-all duration-300', PERIOD_COLORS[state.currentPeriod])}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
