'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useScouterEvent } from '@/contexts/ScouterEventContext';
import { useLiveScoutingSession } from '@/hooks/useLiveScoutingSession';
import type {
  StationKey,
  MatchOrchestrationState,
  StationAssignment,
  ScouterPresenceState,
} from '@/types/scouting-session';
import {
  ALL_STATION_KEYS,
  getOrchestration,
} from '@/types/scouting-session';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PrepareMatchView } from './PrepareMatchView';
import { AssignmentView } from './AssignmentView';
import { MonitoringView } from './MonitoringView';

interface LeadScoutDashboardProps {
  userId: string;
  userName: string;
}

export function LeadScoutDashboard({ userId, userName }: LeadScoutDashboardProps) {
  const { selectedEventKey, selectedEvent, events, isLoading: eventsLoading, setSelectedEvent } = useScouterEvent();

  const {
    session,
    currentMatchNumber,
    isConnected,
    isLoading: sessionLoading,
    error,
    updateSessionData,
    connectedScouters,
    connectedCount,
    setMatchNumber,
  } = useLiveScoutingSession(selectedEventKey, {
    presence: true,
    presenceState: {
      userId,
      scoutName: userName,
      status: 'connected',
      joinedAt: new Date().toISOString(),
    },
  });

  const orchestration = useMemo(
    () => getOrchestration(session?.session_data),
    [session?.session_data]
  );

  // Build scouter list from session_data checkins (HTTP-based, reliable)
  // merged with Realtime presence (fast, but may not connect)
  const scouterPool = useMemo(() => {
    const seen = new Set<string>();
    const result: ScouterPresenceState[] = [];

    // 1. Checkins from session_data (always works via polling)
    const checkins = (session?.session_data?.checkins ?? {}) as Record<
      string,
      { scoutName?: string; status?: string; lastSeen?: string }
    >;
    const staleThreshold = Date.now() - 15_000; // 15 seconds
    for (const [uid, info] of Object.entries(checkins)) {
      if (uid === userId) continue; // exclude lead
      if (info.lastSeen && new Date(info.lastSeen).getTime() < staleThreshold) continue;
      seen.add(uid);
      result.push({
        userId: uid,
        scoutName: info.scoutName ?? 'Unknown',
        status: (info.status as ScouterPresenceState['status']) ?? 'connected',
        joinedAt: info.lastSeen ?? '',
      });
    }

    // 2. Merge Realtime presence (may have fresher status like 'scouting')
    for (const s of connectedScouters) {
      if (s.userId === userId) continue;
      if (seen.has(s.userId)) {
        // Update status from presence if it's more specific
        const existing = result.find((r) => r.userId === s.userId);
        if (existing && s.status !== 'connected') {
          existing.status = s.status;
        }
      } else {
        result.push(s);
      }
    }

    return result;
  }, [session?.session_data, connectedScouters, userId]);

  const isManualEvent = selectedEvent?.manual_schedule === true;
  const [updateError, setUpdateError] = useState<string | null>(null);

  // --- State Transitions ---

  const updateOrchestration = useCallback(
    async (updates: Partial<MatchOrchestrationState>) => {
      setUpdateError(null);
      try {
        const current = session?.session_data ?? {};
        const merged = { ...current, ...updates };
        await updateSessionData(merged as Record<string, unknown>);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update session';
        setUpdateError(msg);
      }
    },
    [session?.session_data, updateSessionData]
  );

  const handlePrepareMatch = useCallback(async () => {
    // Carry over previous scouter assignments (but clear team numbers for manual events)
    const prevAssignments = orchestration.assignments;
    const newAssignments: Record<StationKey, StationAssignment | null> = {} as Record<StationKey, StationAssignment | null>;

    for (const key of ALL_STATION_KEYS) {
      const prev = prevAssignments[key];
      if (prev?.user_id) {
        newAssignments[key] = {
          user_id: prev.user_id,
          scout_name: prev.scout_name,
          team_number: isManualEvent ? 0 : prev.team_number,
        };
      } else {
        newAssignments[key] = null;
      }
    }

    await updateOrchestration({
      match_state: 'preparing',
      assignments: newAssignments,
      submissions: {
        red_1: { submitted: false },
        red_2: { submitted: false },
        red_3: { submitted: false },
        blue_1: { submitted: false },
        blue_2: { submitted: false },
        blue_3: { submitted: false },
      },
    });
  }, [orchestration.assignments, isManualEvent, updateOrchestration]);

  const handleAssignScouter = useCallback(
    async (stationKey: StationKey, scouterUserId: string, scoutName: string) => {
      const currentAssignments = { ...orchestration.assignments };

      // Clear this scouter from any other station
      for (const key of ALL_STATION_KEYS) {
        if (currentAssignments[key]?.user_id === scouterUserId && key !== stationKey) {
          currentAssignments[key] = null;
        }
      }

      if (scouterUserId) {
        const existing = currentAssignments[stationKey];
        currentAssignments[stationKey] = {
          user_id: scouterUserId,
          scout_name: scoutName,
          team_number: existing?.team_number ?? 0,
        };
      } else {
        currentAssignments[stationKey] = null;
      }

      await updateOrchestration({ assignments: currentAssignments });
    },
    [orchestration.assignments, updateOrchestration]
  );

  const handleTeamNumberChange = useCallback(
    async (stationKey: StationKey, teamNumber: number | null) => {
      const currentAssignments = { ...orchestration.assignments };
      const existing = currentAssignments[stationKey];
      currentAssignments[stationKey] = {
        user_id: existing?.user_id ?? '',
        scout_name: existing?.scout_name ?? '',
        team_number: teamNumber ?? 0,
      };
      await updateOrchestration({ assignments: currentAssignments });
    },
    [orchestration.assignments, updateOrchestration]
  );

  const handlePrestartMatch = useCallback(async () => {
    await updateOrchestration({ match_state: 'active' });
  }, [updateOrchestration]);

  const handleCancelPrepare = useCallback(async () => {
    await updateOrchestration({ match_state: 'idle' });
  }, [updateOrchestration]);

  const handlePrepareNextMatch = useCallback(async () => {
    // Increment match number first, then transition to preparing.
    // We await the match number update so the session state is consistent
    // before we build the new assignments.
    await setMatchNumber(currentMatchNumber + 1);
    await handlePrepareMatch();
  }, [currentMatchNumber, setMatchNumber, handlePrepareMatch]);

  const handleClockOutScouter = useCallback(
    async (scouterUserId: string) => {
      const clockedOut = [...orchestration.clocked_out, scouterUserId];
      await updateOrchestration({ clocked_out: clockedOut });
    },
    [orchestration.clocked_out, updateOrchestration]
  );

  const handleRestoreScouter = useCallback(
    async (scouterUserId: string) => {
      const clockedOut = orchestration.clocked_out.filter((id) => id !== scouterUserId);
      await updateOrchestration({ clocked_out: clockedOut });
    },
    [orchestration.clocked_out, updateOrchestration]
  );

  // --- Event selector ---

  function handleEventChange(eventKey: string) {
    if (eventKey === '__none__') {
      setSelectedEvent(null);
      return;
    }
    const event = events.find((e) => e.event_key === eventKey);
    setSelectedEvent(event ?? null);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // --- Render ---

  const matchState = orchestration.match_state;

  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Lead Scout</h1>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-cyan-400">
            Back to Admin
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Event selector */}
      <div className="mb-6">
        <Select
          value={selectedEventKey ?? '__none__'}
          onValueChange={handleEventChange}
          disabled={eventsLoading}
        >
          <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-200">
            <SelectValue placeholder="Select event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No event selected</SelectItem>
            {events.map((event) => (
              <SelectItem key={event.event_key} value={event.event_key}>
                {event.event_name} — {formatDate(event.start_date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* No event selected */}
      {!selectedEventKey && (
        <div className="text-center py-12 text-slate-500">
          <p>Select an event to begin managing matches.</p>
        </div>
      )}

      {/* Loading */}
      {selectedEventKey && sessionLoading && (
        <div className="text-center py-12">
          <div className="mb-4 h-6 w-6 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent mx-auto" />
          <p className="text-slate-400">Loading session...</p>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">
          {error.message}
        </div>
      )}
      {updateError && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">
          {updateError}
        </div>
      )}

      {/* Dashboard states */}
      {selectedEventKey && !sessionLoading && session && (
        <>
          {(matchState === 'idle' || matchState === 'completed') && (
            <PrepareMatchView
              nextMatchNumber={currentMatchNumber}
              connectedScouters={scouterPool}
              clockedOut={orchestration.clocked_out}
              onPrepareMatch={handlePrepareMatch}
              onClockOutScouter={handleClockOutScouter}
              onRestoreScouter={handleRestoreScouter}
            />
          )}

          {matchState === 'preparing' && (
            <AssignmentView
              matchNumber={currentMatchNumber}
              orchestration={orchestration}
              connectedScouters={scouterPool}
              isManualEvent={isManualEvent}
              onAssignScouter={handleAssignScouter}
              onTeamNumberChange={handleTeamNumberChange}
              onPrestartMatch={handlePrestartMatch}
              onCancel={handleCancelPrepare}
            />
          )}

          {matchState === 'active' && (
            <MonitoringView
              matchNumber={currentMatchNumber}
              orchestration={orchestration}
              connectedScouters={scouterPool}
              onPrepareNextMatch={handlePrepareNextMatch}
            />
          )}
        </>
      )}
    </div>
  );
}
