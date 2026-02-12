/**
 * Scouting Session Types
 *
 * Types for match orchestration, station assignments, and presence tracking
 * used by the lead scouter dashboard and scouter managed mode.
 */

export type MatchState = 'idle' | 'preparing' | 'active' | 'completed';

export type StationKey = 'red_1' | 'red_2' | 'red_3' | 'blue_1' | 'blue_2' | 'blue_3';

export const ALL_STATION_KEYS: StationKey[] = [
  'red_1', 'red_2', 'red_3',
  'blue_1', 'blue_2', 'blue_3',
];

export interface StationAssignment {
  user_id: string;
  scout_name: string;
  team_number: number;
}

export interface MatchSubmissionStatus {
  submitted: boolean;
  submitted_at?: string;
}

export interface MatchOrchestrationState {
  match_state: MatchState;
  assignments: Record<StationKey, StationAssignment | null>;
  clocked_out: string[];
  submissions: Record<StationKey, MatchSubmissionStatus>;
  tba_match_key?: string;
}

export interface ScouterPresenceState {
  userId: string;
  scoutName: string;
  status: 'connected' | 'scouting' | 'submitted';
  assignedStation?: StationKey;
  joinedAt: string;
}

/**
 * Helper to create a default (empty) orchestration state
 */
export function createDefaultOrchestrationState(): MatchOrchestrationState {
  return {
    match_state: 'idle',
    assignments: {
      red_1: null, red_2: null, red_3: null,
      blue_1: null, blue_2: null, blue_3: null,
    },
    clocked_out: [],
    submissions: {
      red_1: { submitted: false },
      red_2: { submitted: false },
      red_3: { submitted: false },
      blue_1: { submitted: false },
      blue_2: { submitted: false },
      blue_3: { submitted: false },
    },
  };
}

/**
 * Parse a StationKey into its alliance color and position number
 */
export function parseStationKey(key: StationKey): { alliance: 'red' | 'blue'; position: 1 | 2 | 3 } {
  const [alliance, posStr] = key.split('_');
  return {
    alliance: alliance as 'red' | 'blue',
    position: Number(posStr) as 1 | 2 | 3,
  };
}

/**
 * Get the display label for a station key (e.g. "R1", "B3")
 */
export function stationLabel(key: StationKey): string {
  const { alliance, position } = parseStationKey(key);
  return `${alliance === 'red' ? 'R' : 'B'}${position}`;
}

/**
 * Type guard for MatchOrchestrationState stored in session_data JSONB.
 */
export function isOrchestrationState(data: Record<string, unknown>): data is MatchOrchestrationState & Record<string, unknown> {
  return (
    typeof data.match_state === 'string' &&
    ['idle', 'preparing', 'active', 'completed'].includes(data.match_state) &&
    typeof data.assignments === 'object' &&
    data.assignments !== null
  );
}

/**
 * Parse session_data as MatchOrchestrationState, falling back to defaults.
 */
export function getOrchestration(sessionData: Record<string, unknown> | undefined): MatchOrchestrationState {
  if (!sessionData || !isOrchestrationState(sessionData)) {
    return createDefaultOrchestrationState();
  }
  const defaults = createDefaultOrchestrationState();
  return {
    ...defaults,
    ...sessionData,
    clocked_out: Array.isArray(sessionData.clocked_out) ? sessionData.clocked_out as string[] : [],
    submissions: (typeof sessionData.submissions === 'object' && sessionData.submissions !== null)
      ? sessionData.submissions as MatchOrchestrationState['submissions']
      : defaults.submissions,
  };
}
