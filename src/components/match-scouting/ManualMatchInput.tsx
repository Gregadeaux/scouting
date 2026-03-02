'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveScoutingSession } from '@/hooks/useLiveScoutingSession';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ManualMatchInputProps {
  eventKey: string;
  onSelectionComplete: (params: {
    matchNumber: number;
    teamNumber: number;
    allianceColor: 'red' | 'blue';
  }) => void;
  /** Increment to reset team/alliance inputs (e.g. after submission) */
  resetKey?: number;
  disabled?: boolean;
  /** When false, hide +/- controls; match number is read-only (controlled by lead scouter) */
  canControlMatch?: boolean;
}

/**
 * Fires onSelectionComplete when all three values are present.
 * Extracted to avoid duplicating the guard logic.
 */
function fireIfComplete(
  teamNumber: string,
  allianceColor: 'red' | 'blue' | null,
  matchNumber: number,
  cb: ManualMatchInputProps['onSelectionComplete']
) {
  const tn = Number(teamNumber);
  if (teamNumber && tn > 0 && allianceColor) {
    cb({ matchNumber, teamNumber: tn, allianceColor });
  }
}

/**
 * ManualMatchInput Component
 *
 * Replaces MatchSelector + MatchTeamSelector for manual-schedule events.
 * Shows live-synced match number with +/- controls, team number input,
 * and alliance color toggle.
 *
 * Performance: The team number input uses local state and only propagates
 * to the parent on blur (or Enter), avoiding expensive re-renders of the
 * entire form tree on every keystroke.
 */
export function ManualMatchInput({ eventKey, onSelectionComplete, resetKey = 0, disabled, canControlMatch = true }: ManualMatchInputProps) {
  const {
    session,
    currentMatchNumber,
    isConnected,
    isLoading,
    error: sessionError,
    incrementMatch,
    decrementMatch,
  } = useLiveScoutingSession(eventKey);

  // Local-only state for the text input - NOT propagated on every keystroke
  const [localTeamInput, setLocalTeamInput] = useState<string>('');
  // The "committed" team number that has been propagated to the parent
  const [committedTeamNumber, setCommittedTeamNumber] = useState<string>('');
  const [allianceColor, setAllianceColor] = useState<'red' | 'blue' | null>(null);

  // Reset inputs when resetKey changes (parent signals a reset after submission)
  useEffect(() => {
    if (resetKey > 0) {
      setLocalTeamInput('');
      setCommittedTeamNumber('');
      setAllianceColor(null);
    }
  }, [resetKey]);

  // Refs keep fresh values accessible to the realtime match-number effect
  // without adding them to its dependency array
  const committedTeamRef = useRef(committedTeamNumber);
  const allianceColorRef = useRef(allianceColor);
  const onSelectionCompleteRef = useRef(onSelectionComplete);

  useEffect(() => {
    committedTeamRef.current = committedTeamNumber;
    allianceColorRef.current = allianceColor;
    onSelectionCompleteRef.current = onSelectionComplete;
  }, [committedTeamNumber, allianceColor, onSelectionComplete]);

  const handleTeamInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTeamInput(e.target.value.replace(/\D/g, ''));
  }, []);

  // Commit the team number on blur or Enter - propagates to parent
  const commitTeamNumber = useCallback(() => {
    if (localTeamInput !== committedTeamNumber) {
      setCommittedTeamNumber(localTeamInput);
      fireIfComplete(localTeamInput, allianceColor, currentMatchNumber, onSelectionComplete);
    }
  }, [localTeamInput, committedTeamNumber, allianceColor, currentMatchNumber, onSelectionComplete]);

  const handleTeamKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    },
    []
  );

  const handleAllianceChange = useCallback(
    (color: 'red' | 'blue') => {
      setAllianceColor(color);

      // Use the local input value (may not be committed yet) so tapping
      // alliance right after typing still works without needing to blur first
      const teamToUse = localTeamInput || committedTeamNumber;
      if (teamToUse !== committedTeamNumber) {
        setCommittedTeamNumber(teamToUse);
      }
      fireIfComplete(teamToUse, color, currentMatchNumber, onSelectionComplete);
    },
    [localTeamInput, committedTeamNumber, currentMatchNumber, onSelectionComplete]
  );

  // Re-fire callback when match number changes from realtime, using refs for fresh values
  useEffect(() => {
    const tn = committedTeamRef.current;
    const ac = allianceColorRef.current;
    if (tn && Number(tn) > 0 && ac) {
      onSelectionCompleteRef.current({
        matchNumber: currentMatchNumber,
        teamNumber: Number(tn),
        allianceColor: ac,
      });
    }
  }, [currentMatchNumber]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (sessionError && !session) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/30">
        <p className="text-sm text-red-800 dark:text-red-200">
          Failed to load scouting session. Please refresh and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Inline error for mid-session failures (e.g. match number update failed) */}
      {sessionError && session && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30">
          <p className="text-sm text-red-800 dark:text-red-200">
            {sessionError.message}
          </p>
        </div>
      )}

      {/* Match Number with live sync */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Match Number
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs',
              isConnected ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-yellow-500'
              )}
            />
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>
        <div className="flex items-center justify-center gap-4">
          {canControlMatch && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={decrementMatch}
              disabled={disabled || currentMatchNumber <= 1}
              className="h-14 w-14 text-2xl font-bold"
            >
              -
            </Button>
          )}
          <span className="min-w-[80px] text-center text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {currentMatchNumber}
          </span>
          {canControlMatch && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={incrementMatch}
              disabled={disabled}
              className="h-14 w-14 text-2xl font-bold"
            >
              +
            </Button>
          )}
        </div>
      </div>

      {/* Team Number */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-400">
          Team Number
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localTeamInput}
          onChange={handleTeamInputChange}
          onBlur={commitTeamNumber}
          onKeyDown={handleTeamKeyDown}
          placeholder="Enter team #"
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-2xl font-bold tabular-nums text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* Alliance Color */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-400">
          Alliance
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleAllianceChange('red')}
            disabled={disabled}
            className={cn(
              'min-h-[48px] rounded-lg border-2 px-4 py-3 text-lg font-bold transition-all',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              allianceColor === 'red'
                ? 'border-red-500 bg-red-500 text-white focus:ring-red-500'
                : 'border-red-300 bg-red-50 text-red-700 hover:border-red-400 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300'
            )}
          >
            Red
          </button>
          <button
            type="button"
            onClick={() => handleAllianceChange('blue')}
            disabled={disabled}
            className={cn(
              'min-h-[48px] rounded-lg border-2 px-4 py-3 text-lg font-bold transition-all',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              allianceColor === 'blue'
                ? 'border-blue-500 bg-blue-500 text-white focus:ring-blue-500'
                : 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            )}
          >
            Blue
          </button>
        </div>
      </div>
    </div>
  );
}
