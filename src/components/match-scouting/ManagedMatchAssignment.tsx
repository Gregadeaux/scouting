'use client';

import { useEffect, useRef } from 'react';
import type { ScoutingSession } from '@/types';
import type { StationKey } from '@/types/scouting-session';
import { ALL_STATION_KEYS, stationLabel, parseStationKey, getOrchestration } from '@/types/scouting-session';
import { cn } from '@/lib/utils';

interface ManagedMatchAssignmentProps {
  session: ScoutingSession;
  userId: string;
  matchNumber: number;
  onAssignmentReceived: (params: {
    matchNumber: number;
    teamNumber: number;
    allianceColor: 'red' | 'blue';
    stationPosition: 1 | 2 | 3;
    matchKey?: string;
  }) => void;
}

/**
 * Displays managed assignment status when a lead scouter is orchestrating matches.
 * When match_state becomes 'active', finds the current user's assignment and
 * fires onAssignmentReceived to auto-fill the scouting form.
 */
export function ManagedMatchAssignment({
  session,
  userId,
  matchNumber,
  onAssignmentReceived,
}: ManagedMatchAssignmentProps) {
  const orchestration = getOrchestration(session.session_data);
  const matchState = orchestration?.match_state ?? 'idle';
  const lastFiredRef = useRef<string>('');

  // Find this user's assignment
  let assignedStation: StationKey | undefined;
  let assignedTeamNumber: number | undefined;
  if (orchestration?.assignments) {
    for (const key of ALL_STATION_KEYS) {
      const a = orchestration.assignments[key];
      if (a?.user_id === userId) {
        assignedStation = key;
        assignedTeamNumber = a.team_number;
        break;
      }
    }
  }

  // Fire callback when match becomes active and user has an assignment
  useEffect(() => {
    if (matchState !== 'active') return;
    if (!assignedStation || !assignedTeamNumber) return;

    const fireKey = `${matchNumber}-${assignedStation}-${assignedTeamNumber}`;
    if (lastFiredRef.current === fireKey) return;
    lastFiredRef.current = fireKey;

    const { alliance, position } = parseStationKey(assignedStation);
    onAssignmentReceived({
      matchNumber,
      teamNumber: assignedTeamNumber,
      allianceColor: alliance,
      stationPosition: position,
      matchKey: orchestration?.tba_match_key,
    });
  }, [matchState, matchNumber, assignedStation, assignedTeamNumber, orchestration?.tba_match_key, onAssignmentReceived]);

  // Waiting states
  if (matchState === 'idle' || matchState === 'preparing') {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center">
        <div className="mb-2 text-lg font-medium text-slate-300">
          Waiting for lead scouter...
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Connected to session
        </div>
        {matchState === 'preparing' && assignedStation && (
          <div className="mt-3 text-sm text-cyan-400">
            Assigned to {stationLabel(assignedStation)}
            {assignedTeamNumber ? ` — Team ${assignedTeamNumber}` : ''}
          </div>
        )}
      </div>
    );
  }

  // Active — show assignment
  if (matchState === 'active' && assignedStation && assignedTeamNumber) {
    const { alliance } = parseStationKey(assignedStation);
    return (
      <div className={cn(
        'rounded-lg border-2 p-4',
        alliance === 'red'
          ? 'border-red-500 bg-red-950/40'
          : 'border-blue-500 bg-blue-950/40'
      )}>
        <div className="text-center">
          <div className="text-sm text-slate-400 mb-1">
            Match {matchNumber} — {stationLabel(assignedStation)}
          </div>
          <div className="text-3xl font-bold text-slate-100">
            Team {assignedTeamNumber}
          </div>
        </div>
      </div>
    );
  }

  // Active but no assignment for this user
  if (matchState === 'active') {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center">
        <div className="text-slate-400">
          Match {matchNumber} is active — you are not assigned to this match.
        </div>
      </div>
    );
  }

  // completed
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center">
      <div className="text-slate-400">
        Match {matchNumber} is complete. Waiting for next match...
      </div>
    </div>
  );
}
