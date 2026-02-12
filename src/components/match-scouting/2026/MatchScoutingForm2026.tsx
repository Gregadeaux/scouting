'use client';

import { type ReactNode, useState, useEffect, useCallback } from 'react';
import type { Event, MatchSchedule } from '@/types';
import type {
  AutoPerformance2026,
  TeleopPerformance2026,
  EndgamePerformance2026,
  ClimbLevel2026,
  ClimbPosition2026,
  DisabledReason2026,
} from '@/types/season-2026';
import {
  DEFAULT_AUTO_PERFORMANCE_2026,
  DEFAULT_TELEOP_PERFORMANCE_2026,
  DEFAULT_ENDGAME_PERFORMANCE_2026,
  RATING_LABELS_2026,
} from '@/types/season-2026';

import Link from 'next/link';
import { useOptimisticSubmission, useOfflineStatus } from '@/lib/offline';
import { useScouterEventSafe } from '@/contexts/ScouterEventContext';
import { useLiveScoutingSession } from '@/hooks/useLiveScoutingSession';
import { getOrchestration } from '@/types/scouting-session';
import { EventSelector } from '@/components/pit-scouting/EventSelector';
import { MatchSelector } from '../MatchSelector';
import { MatchTeamSelector } from '../MatchTeamSelector';
import { ManualMatchInput } from '../ManualMatchInput';
import { ManagedMatchAssignment } from '../ManagedMatchAssignment';
import { Button } from '@/components/ui/button';
import { HoldButtonTimer } from '@/components/ui/HoldButtonTimer';
import { cn } from '@/lib/utils';

interface MatchScoutingForm2026Props {
  userId: string;
  scoutName: string;
  eventKey?: string;
  onSubmitSuccess?: (data: unknown) => void;
}

interface FormState {
  auto: AutoPerformance2026;
  teleop: TeleopPerformance2026;
  endgame: EndgamePerformance2026;
  notes: string;
  shootingTimeSeconds: number;
}

const CLIMB_LEVELS: { value: ClimbLevel2026; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'L1', label: 'L1' },
  { value: 'L2', label: 'L2' },
  { value: 'L3', label: 'L3' },
];

const CLIMB_POSITIONS: { value: ClimbPosition2026; label: string }[] = [
  { value: 'left', label: 'L' },
  { value: 'center', label: 'C' },
  { value: 'right', label: 'R' },
];

const DISABLED_REASONS: { value: DisabledReason2026; label: string }[] = [
  { value: 'robot_died', label: 'Robot Died' },
  { value: 'stuck_on_bump', label: 'Stuck on Bump' },
  { value: 'stuck_on_balls', label: 'Stuck on Balls' },
  { value: 'stuck_in_trench', label: 'Stuck in Trench' },
  { value: 'disabled_by_refs', label: 'Disabled by Refs' },
  { value: 'other', label: 'Other' },
];

/**
 * Toggle Button Component
 * Large, touch-friendly toggle for boolean values
 */
function ToggleButton({
  value,
  onChange,
  label,
  className,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'min-h-[48px] rounded-lg border-2 px-4 py-3 font-medium transition-all',
        'focus:outline-none focus:ring-2 focus:ring-frc-blue focus:ring-offset-2',
        value
          ? 'border-frc-blue bg-frc-blue text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
        className
      )}
    >
      {label}
    </button>
  );
}

/**
 * Segmented Button Group
 * For selecting one option from multiple choices
 */
function SegmentedButtons<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T | undefined;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn('flex gap-2', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'min-h-[48px] min-w-[48px] flex-1 rounded-lg border-2 px-3 py-2 font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-frc-blue focus:ring-offset-2',
            value === option.value
              ? 'border-frc-blue bg-frc-blue text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Rating Slider Component
 * Touch-friendly 1-5 rating slider with labels
 */
function RatingSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {value} - {RATING_LABELS_2026[value as keyof typeof RATING_LABELS_2026]}
        </span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={cn(
              'min-h-[48px] flex-1 rounded-lg border-2 text-lg font-bold transition-all',
              'focus:outline-none focus:ring-2 focus:ring-frc-blue focus:ring-offset-2',
              value === rating
                ? 'border-frc-blue bg-frc-blue text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
            )}
          >
            {rating}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}

/**
 * Section Component
 * Groups related form fields with a title
 */
function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-700', className)}>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {children}
    </div>
  );
}

// Demo data for testing the form without real match data
const DEMO_MATCH: MatchSchedule = {
  match_id: 99999,
  event_key: 'demo_2026',
  match_key: 'demo_qm1',
  comp_level: 'qm',
  set_number: 1,
  match_number: 1,
  red_1: 930,
  red_2: 254,
  red_3: 1678,
  blue_1: 118,
  blue_2: 2056,
  blue_3: 2910,
  scheduled_time: new Date().toISOString(),
};

/**
 * MatchScoutingForm2026
 *
 * Simplified match scouting form for 2026 game.
 * Target: Complete in <60 seconds per robot
 *
 * Features:
 * - Large touch targets (min 48px) for field use
 * - Conditional field visibility
 * - Auto-save to localStorage
 * - Mobile-optimized layout
 * - Demo mode for testing without real data
 */
export function MatchScoutingForm2026({
  userId,
  scoutName,
  eventKey: eventKeyProp,
  onSubmitSuccess,
}: MatchScoutingForm2026Props) {
  const { submit, isPending, isQueued } = useOptimisticSubmission();
  const { isOffline } = useOfflineStatus();

  // Try to get event from scouter context (null outside ScouterEventProvider)
  const scouterCtx = useScouterEventSafe();
  const contextEventKey = scouterCtx?.selectedEventKey ?? null;

  // Use prop > context > local state
  const hasExternalEvent = !!(eventKeyProp || contextEventKey);

  // Manual mode state
  const [manualMatchNumber, setManualMatchNumber] = useState<number | null>(null);
  const [manualResetKey, setManualResetKey] = useState(0);

  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Selection state — local fallback only used when no prop/context (shouldn't happen normally)
  const [localEventKey, setLocalEventKey] = useState<string | null>(null);
  const [localEvent, setLocalEvent] = useState<Event | null>(null);

  // Detect manual-schedule event from context or local event selection
  const isManualEvent =
    scouterCtx?.selectedEvent?.manual_schedule === true ||
    localEvent?.manual_schedule === true;
  const selectedEventKey = eventKeyProp ?? contextEventKey ?? localEventKey;

  // Managed mode: check if a lead scouter session is active
  const {
    session: managedSession,
    currentMatchNumber: managedMatchNumber,
    isConnected: managedIsConnected,
    updatePresenceStatus,
  } = useLiveScoutingSession(selectedEventKey, {
    presence: true,
    presenceState: {
      userId,
      scoutName,
      status: 'connected',
      joinedAt: new Date().toISOString(),
    },
  });
  const managedOrchestration = managedSession ? getOrchestration(managedSession.session_data) : null;
  const isManagedMode = !isDemoMode &&
    !!managedOrchestration?.match_state &&
    managedOrchestration.match_state !== 'idle';

  // Periodic checkin so the lead can see this scouter (works without Realtime)
  useEffect(() => {
    if (!selectedEventKey || isDemoMode) return;

    const doCheckin = () => {
      fetch('/api/scouting-session/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_key: selectedEventKey,
          scout_name: scoutName,
          status: 'connected',
        }),
      }).catch(() => {/* ignore checkin failures */});
    };

    doCheckin(); // immediate first checkin
    const id = setInterval(doCheckin, 5000);
    return () => clearInterval(id);
  }, [selectedEventKey, scoutName, isDemoMode]);

  const [selectedMatchKey, setSelectedMatchKey] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchSchedule | null>(null);
  const [selectedTeamNumber, setSelectedTeamNumber] = useState<number | null>(null);
  const [allianceColor, setAllianceColor] = useState<'red' | 'blue' | null>(null);
  const [startingPosition, setStartingPosition] = useState<1 | 2 | 3 | null>(null);

  // Form state
  const [formState, setFormState] = useState<FormState>({
    auto: { ...DEFAULT_AUTO_PERFORMANCE_2026 },
    teleop: { ...DEFAULT_TELEOP_PERFORMANCE_2026 },
    endgame: { ...DEFAULT_ENDGAME_PERFORMANCE_2026 },
    notes: '',
    shootingTimeSeconds: 0,
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-save to localStorage
  const draftIdentifier = isManualEvent
    ? `${selectedEventKey}-m${manualMatchNumber}`
    : selectedMatchKey;
  const DRAFT_KEY = `match-scouting-draft-2026-${draftIdentifier}-${selectedTeamNumber}`;

  const hasDraftContext =
    !!selectedTeamNumber &&
    (isManualEvent ? !!manualMatchNumber : !!selectedMatchKey);

  // Load draft from localStorage
  useEffect(() => {
    if (!hasDraftContext) return;

    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      setFormState(parsed);
    } catch {
      // Invalid JSON, ignore
    }
  }, [DRAFT_KEY, hasDraftContext]);

  // Save draft to localStorage (every 10 seconds)
  useEffect(() => {
    if (!hasDraftContext) return;

    const interval = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formState));
    }, 10000);

    return () => clearInterval(interval);
  }, [DRAFT_KEY, formState, hasDraftContext]);

  // Clear form when selections change
  const resetForm = useCallback(() => {
    setFormState({
      auto: { ...DEFAULT_AUTO_PERFORMANCE_2026 },
      teleop: { ...DEFAULT_TELEOP_PERFORMANCE_2026 },
      endgame: { ...DEFAULT_ENDGAME_PERFORMANCE_2026 },
      notes: '',
      shootingTimeSeconds: 0,
    });
    setSuccessMessage(null);
    setError(null);
  }, []);

  // Demo mode handlers
  function enterDemoMode(): void {
    setIsDemoMode(true);
    setLocalEventKey('demo_2026');
    setSelectedMatchKey('demo_qm1');
    setSelectedMatch(DEMO_MATCH);
    setSelectedTeamNumber(930);
    setAllianceColor('red');
    setStartingPosition(1);
    resetForm();
  }

  function exitDemoMode(): void {
    setIsDemoMode(false);
    setLocalEventKey(null);
    setSelectedMatchKey(null);
    setSelectedMatch(null);
    setSelectedTeamNumber(null);
    setAllianceColor(null);
    setStartingPosition(null);
    resetForm();
  }

  function handleEventChange(eventKey: string | null, event: Event | null): void {
    if (isDemoMode) exitDemoMode();
    setLocalEventKey(eventKey);
    setLocalEvent(event);
    setSelectedMatchKey(null);
    setSelectedMatch(null);
    setSelectedTeamNumber(null);
    setAllianceColor(null);
    setStartingPosition(null);
    resetForm();
  }

  function handleMatchChange(matchKey: string | null, match: MatchSchedule | null): void {
    setSelectedMatchKey(matchKey);
    setSelectedMatch(match);
    setSelectedTeamNumber(null);
    setAllianceColor(null);
    setStartingPosition(null);
    resetForm();
  }

  function handleTeamChange(
    teamNumber: number | null,
    color: 'red' | 'blue' | null,
    position: 1 | 2 | 3 | null
  ): void {
    setSelectedTeamNumber(teamNumber);
    setAllianceColor(color);
    setStartingPosition(position);
    setSuccessMessage(null);
    setError(null);
  }

  // Form update helpers
  function updateAuto<K extends keyof AutoPerformance2026>(
    key: K,
    value: AutoPerformance2026[K]
  ): void {
    setFormState((prev) => ({
      ...prev,
      auto: { ...prev.auto, [key]: value },
    }));
  }

  function updateTeleop<K extends keyof TeleopPerformance2026>(
    key: K,
    value: TeleopPerformance2026[K]
  ): void {
    setFormState((prev) => ({
      ...prev,
      teleop: { ...prev.teleop, [key]: value },
    }));
  }

  function updateEndgame<K extends keyof EndgamePerformance2026>(
    key: K,
    value: EndgamePerformance2026[K]
  ): void {
    setFormState((prev) => ({
      ...prev,
      endgame: { ...prev.endgame, [key]: value },
    }));
  }

  function updateShootingTime(seconds: number): void {
    setFormState((prev) => ({ ...prev, shootingTimeSeconds: seconds }));
  }

  // Manual match selection handler
  function handleManualSelectionComplete(params: {
    matchNumber: number;
    teamNumber: number;
    allianceColor: 'red' | 'blue';
  }): void {
    setManualMatchNumber(params.matchNumber);
    setSelectedTeamNumber(params.teamNumber);
    setAllianceColor(params.allianceColor);
    setStartingPosition(null);
    setSuccessMessage(null);
    setError(null);
  }

  // Managed mode: receive assignment from lead scouter
  const handleManagedAssignment = useCallback((params: {
    matchNumber: number;
    teamNumber: number;
    allianceColor: 'red' | 'blue';
    stationPosition: 1 | 2 | 3;
    matchKey?: string;
  }) => {
    setManualMatchNumber(params.matchNumber);
    setSelectedTeamNumber(params.teamNumber);
    setAllianceColor(params.allianceColor);
    setStartingPosition(params.stationPosition);
    setSuccessMessage(null);
    setError(null);
    updatePresenceStatus('scouting');
  }, [updatePresenceStatus]);

  // Submit handler
  async function handleSubmit(): Promise<void> {
    // Validation differs for manual vs TBA mode
    if (isManualEvent) {
      if (!selectedEventKey || !manualMatchNumber || !selectedTeamNumber || !allianceColor) {
        setError('Please enter a match number, team number, and alliance color.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } else {
      if (!selectedMatchKey || !selectedMatch || !selectedTeamNumber || !allianceColor || !startingPosition) {
        setError('Please select an event, match, and team before submitting.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Demo mode - simulate submission
    if (isDemoMode) {
      setSuccessMessage('Demo submission successful! In real mode, this data would be saved.');
      resetForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setError(null);

    const commonFields = {
      team_number: selectedTeamNumber,
      scout_name: scoutName,
      scout_id: userId,
      alliance_color: allianceColor,
      auto_performance: formState.auto,
      teleop_performance: formState.teleop,
      endgame_performance: formState.endgame,
      shooting_time_seconds: formState.shootingTimeSeconds,
      robot_disconnected: false,
      robot_disabled: formState.endgame.was_disabled,
      robot_tipped: false,
      foul_count: 0,
      tech_foul_count: 0,
      yellow_card: false,
      red_card: false,
      notes: formState.notes,
    };

    const url = isManualEvent ? '/api/manual-match-scouting' : '/api/match-scouting';
    const payload = isManualEvent
      ? { ...commonFields, event_key: selectedEventKey, match_number: manualMatchNumber }
      : { ...commonFields, match_id: selectedMatch!.match_id, match_key: selectedMatchKey, starting_position: startingPosition };

    await submit({
      url,
      method: 'POST',
      data: payload,
      onSuccess: (response) => {
        localStorage.removeItem(DRAFT_KEY);

        if (response.queued) {
          setSuccessMessage(
            `Saved offline - will sync when connected. Team ${selectedTeamNumber} data queued.`
          );
        } else {
          setSuccessMessage(`Match data submitted for Team ${selectedTeamNumber}!`);
        }

        resetForm();

        // Notify lead scouter of submission (presence + durable DB update)
        if (isManagedMode && selectedEventKey) {
          updatePresenceStatus('submitted');
          fetch('/api/scouting-session/notify-submission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_key: selectedEventKey }),
          }).catch(() => {/* best-effort — presence is the fast path */});
        }

        // For manual events, clear team/alliance but keep match number (driven by session)
        if (isManualEvent) {
          setSelectedTeamNumber(null);
          setAllianceColor(null);
          setManualResetKey((k) => k + 1);
        }

        onSubmitSuccess?.(response.data || payload);

        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onError: (err) => {
        if (err.message.includes('Duplicate') || err.message.includes('already submitted')) {
          setError(
            `Duplicate submission: You already submitted data for Team ${selectedTeamNumber} in this match.`
          );
        } else {
          setError(`Error: ${err.message}`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });

    setIsSubmitting(false);
  }

  return (
    <div className={cn(
      'container mx-auto max-w-6xl px-4 py-6',
      isDemoMode && 'bg-purple-950/40'
    )}>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Match Scouting 2026</h1>
        {!isDemoMode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={enterDemoMode}
            className="text-xs"
          >
            Try Demo
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exitDemoMode}
            className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/50"
          >
            Exit Demo
          </Button>
        )}
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Fast qualitative scouting - target &lt;60 seconds
      </p>

      {/* Offline indicator */}
      {isOffline && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
          You are offline. Data will sync when reconnected.
        </div>
      )}

      {/* Messages */}
      {successMessage && (
        <div className={cn(
          'mb-4 rounded-lg border p-3 text-sm',
          isQueued
            ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
            : 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200'
        )}>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Selection */}
      <div className="mb-6 space-y-3">
        {/* Managed mode: lead scouter is controlling assignments */}
        {isManagedMode && managedSession && (
          <ManagedMatchAssignment
            session={managedSession}
            userId={userId}
            matchNumber={managedMatchNumber}
            onAssignmentReceived={handleManagedAssignment}
          />
        )}

        {!isDemoMode && !isManagedMode && (
          <>
            {/* Show inline EventSelector only when no external event (prop or context) */}
            {!hasExternalEvent && (
              <EventSelector
                value={selectedEventKey}
                onChange={handleEventChange}
                year={2026}
              />
            )}

            {/* Prompt to go to Settings when using context but no event selected */}
            {hasExternalEvent && !selectedEventKey && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-sm text-slate-300">
                  No event selected.{' '}
                  <Link href="/scouting/settings" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300">
                    Go to Settings
                  </Link>{' '}
                  to choose an event.
                </p>
              </div>
            )}

            {selectedEventKey && isManualEvent && (
              <ManualMatchInput
                eventKey={selectedEventKey}
                onSelectionComplete={handleManualSelectionComplete}
                resetKey={manualResetKey}
              />
            )}

            {selectedEventKey && !isManualEvent && (
              <>
                <MatchSelector
                  eventKey={selectedEventKey}
                  value={selectedMatchKey}
                  onChange={handleMatchChange}
                />

                <MatchTeamSelector
                  match={selectedMatch}
                  value={selectedTeamNumber}
                  onChange={handleTeamChange}
                />
              </>
            )}
          </>
        )}

        {selectedTeamNumber && allianceColor && (
          <div className={cn(
            'rounded-lg border-2 p-3',
            allianceColor === 'red'
              ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
              : 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
          )}>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Team {selectedTeamNumber} -{' '}
              <span className={allianceColor === 'red' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>
                {allianceColor.toUpperCase()}
              </span>
              {isManualEvent && manualMatchNumber && (
                <span> - Match {manualMatchNumber}</span>
              )}
              {!isManualEvent && startingPosition && (
                <span> - Position {startingPosition}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Form (only show when team selected) */}
      {selectedTeamNumber && allianceColor && (
        <div className="space-y-4">
          {/* Match Metrics - Global timer for tracking shooting time */}
          <Section title="Match Metrics">
            <HoldButtonTimer
              value={formState.shootingTimeSeconds}
              onChange={updateShootingTime}
              label="Hold to time shooting"
            />
          </Section>

          {/* 3-Column Layout: Auto | Teleop | Endgame */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Auto Column */}
            <Section title="Auto" className="h-fit">
              <div className="space-y-4">
                <div>
                  <ToggleButton
                    value={formState.auto.auto_climb_attempted}
                    onChange={(v) => {
                      updateAuto('auto_climb_attempted', v);
                      if (!v) {
                        updateAuto('auto_climb_success', false);
                        updateAuto('auto_climb_position', undefined);
                      }
                    }}
                    label="Attempted Climb?"
                    className="w-full"
                  />
                </div>

                {formState.auto.auto_climb_attempted && (
                  <div>
                    <ToggleButton
                      value={formState.auto.auto_climb_success}
                      onChange={(v) => {
                        updateAuto('auto_climb_success', v);
                        if (!v) {
                          updateAuto('auto_climb_position', undefined);
                        }
                      }}
                      label="Successful?"
                      className="w-full"
                    />
                  </div>
                )}

                {formState.auto.auto_climb_success && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">Position</label>
                    <SegmentedButtons
                      value={formState.auto.auto_climb_position}
                      onChange={(v) => updateAuto('auto_climb_position', v)}
                      options={CLIMB_POSITIONS}
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* Teleop Column - Ratings */}
            <Section title="Teleop" className="h-fit">
              <div className="space-y-4">
                <RatingSlider
                  value={formState.teleop.scoring_rating}
                  onChange={(v) => updateTeleop('scoring_rating', v)}
                  label="Scoring"
                />

                <RatingSlider
                  value={formState.teleop.feeding_rating}
                  onChange={(v) => updateTeleop('feeding_rating', v)}
                  label="Feeding"
                />

                <RatingSlider
                  value={formState.teleop.defense_rating}
                  onChange={(v) => updateTeleop('defense_rating', v)}
                  label="Defense"
                />

                <RatingSlider
                  value={formState.teleop.reliability_rating}
                  onChange={(v) => updateTeleop('reliability_rating', v)}
                  label="Reliability"
                />
              </div>
            </Section>

            {/* Endgame Column */}
            <Section title="Endgame" className="h-fit">
              <div className="space-y-4">
                <div>
                  <ToggleButton
                    value={formState.endgame.endgame_climb_attempted}
                    onChange={(v) => {
                      updateEndgame('endgame_climb_attempted', v);
                      if (!v) {
                        updateEndgame('endgame_climb_level', 'none');
                        updateEndgame('endgame_climb_success', false);
                        updateEndgame('endgame_climb_position', undefined);
                      }
                    }}
                    label="Attempted Climb?"
                    className="w-full"
                  />
                </div>

                {formState.endgame.endgame_climb_attempted && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Level</label>
                      <SegmentedButtons
                        value={formState.endgame.endgame_climb_level}
                        onChange={(v) => {
                          updateEndgame('endgame_climb_level', v);
                          if (v === 'none') {
                            updateEndgame('endgame_climb_success', false);
                            updateEndgame('endgame_climb_position', undefined);
                          }
                        }}
                        options={CLIMB_LEVELS}
                      />
                    </div>

                    {formState.endgame.endgame_climb_level !== 'none' && (
                      <>
                        <div>
                          <ToggleButton
                            value={formState.endgame.endgame_climb_success}
                            onChange={(v) => {
                              updateEndgame('endgame_climb_success', v);
                              if (!v) {
                                updateEndgame('endgame_climb_position', undefined);
                              }
                            }}
                            label="Successful?"
                            className="w-full"
                          />
                        </div>

                        {formState.endgame.endgame_climb_success && (
                          <div>
                            <label className="mb-2 block text-sm font-medium">Position</label>
                            <SegmentedButtons
                              value={formState.endgame.endgame_climb_position}
                              onChange={(v) => updateEndgame('endgame_climb_position', v)}
                              options={CLIMB_POSITIONS}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Robot Issues - included in Endgame column */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <ToggleButton
                    value={formState.endgame.was_disabled}
                    onChange={(v) => {
                      updateEndgame('was_disabled', v);
                      if (!v) {
                        updateEndgame('disabled_reason', undefined);
                        updateEndgame('disabled_notes', undefined);
                      }
                    }}
                    label="Robot Disabled?"
                    className="w-full"
                  />
                </div>

                {formState.endgame.was_disabled && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Reason</label>
                      <select
                        value={formState.endgame.disabled_reason || ''}
                        onChange={(e) =>
                          updateEndgame('disabled_reason', e.target.value as DisabledReason2026)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="">Select...</option>
                        {DISABLED_REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={formState.endgame.disabled_notes || ''}
                        onChange={(e) => updateEndgame('disabled_notes', e.target.value)}
                        placeholder="Details..."
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}
              </div>
            </Section>
          </div>

          {/* Notes - Full width below columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Section title="Notes">
                <textarea
                  value={formState.notes}
                  onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any additional observations..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </Section>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isPending}
                size="lg"
                className="w-full py-6 text-lg"
              >
                {isPending && 'Saving...'}
                {!isPending && isSubmitting && 'Submitting...'}
                {!isPending && !isSubmitting && 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedTeamNumber && (
        <div className="py-8 text-center text-muted-foreground">
          <p>Select an event, match, and team to begin</p>
        </div>
      )}
    </div>
  );
}
