'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type {
  AutoPerformance2025,
  TeleopPerformance2025,
  EndgamePerformance2025,
} from '@/types/season-2025';
import {
  DEFAULT_AUTO_PERFORMANCE_2025,
  DEFAULT_TELEOP_PERFORMANCE_2025,
  DEFAULT_ENDGAME_PERFORMANCE_2025,
} from '@/types/season-2025';

// ============================================================================
// Types
// ============================================================================

export type Period = 'pre-match' | 'auto' | 'teleop' | 'endgame' | 'submitted';

export interface MatchScoutingState {
  // Match metadata
  matchKey: string;
  teamNumber: number;
  allianceColor: 'red' | 'blue';
  robotPosition: 1 | 2 | 3;
  scoutName: string;
  scoutUserId?: string;

  // Current period
  currentPeriod: Period;
  matchStartTime: number | null; // Unix timestamp (ms)

  // Performance data (matches database schema)
  autoPerformance: AutoPerformance2025;
  teleopPerformance: TeleopPerformance2025;
  endgamePerformance: EndgamePerformance2025;

  // Overall match data
  fouls: number;
  techFouls: number;
  cards: ('yellow' | 'red')[];
  robotBroke: boolean;
  tippedOver: boolean;
  wasTipped: boolean;
  defenseRating: number; // 0-5
  driverSkillRating: number; // 0-5

  // UI state
  undoStack: MatchScoutingAction[];
  quickNotes: string[];
}

export type MatchScoutingAction =
  // Setup actions
  | { type: 'SET_MATCH_INFO'; payload: { matchKey: string; teamNumber: number; allianceColor: 'red' | 'blue'; robotPosition: 1 | 2 | 3 } }
  | { type: 'SET_SCOUT_INFO'; payload: { scoutName: string; scoutUserId?: string } }

  // Period management
  | { type: 'START_MATCH' }
  | { type: 'ADVANCE_PERIOD' }
  | { type: 'SET_PERIOD'; payload: Period }

  // Counter actions
  | { type: 'INCREMENT_COUNTER'; payload: { period: 'auto' | 'teleop' | 'endgame'; field: string } }
  | { type: 'DECREMENT_COUNTER'; payload: { period: 'auto' | 'teleop' | 'endgame'; field: string } }

  // Boolean toggles
  | { type: 'TOGGLE_BOOLEAN'; payload: { period: 'auto' | 'teleop' | 'endgame' | 'overall'; field: string } }

  // Select/enum changes
  | { type: 'SET_SELECT'; payload: { period: 'auto' | 'teleop' | 'endgame'; field: string; value: string } }

  // Rating changes
  | { type: 'SET_RATING'; payload: { field: 'defenseRating' | 'driverSkillRating'; value: number } }

  // Card management
  | { type: 'ADD_CARD'; payload: 'yellow' | 'red' }
  | { type: 'REMOVE_CARD'; payload: number } // index

  // Notes
  | { type: 'ADD_NOTE'; payload: string }
  | { type: 'REMOVE_NOTE'; payload: number } // index

  // Undo
  | { type: 'UNDO' }

  // Submission
  | { type: 'SUBMIT' }
  | { type: 'RESET' };

// ============================================================================
// Initial State
// ============================================================================

const initialState: MatchScoutingState = {
  matchKey: '',
  teamNumber: 0,
  allianceColor: 'red',
  robotPosition: 1,
  scoutName: '',
  scoutUserId: undefined,

  currentPeriod: 'pre-match',
  matchStartTime: null,

  autoPerformance: DEFAULT_AUTO_PERFORMANCE_2025,
  teleopPerformance: DEFAULT_TELEOP_PERFORMANCE_2025,
  endgamePerformance: DEFAULT_ENDGAME_PERFORMANCE_2025,

  fouls: 0,
  techFouls: 0,
  cards: [],
  robotBroke: false,
  tippedOver: false,
  wasTipped: false,
  defenseRating: 0,
  driverSkillRating: 0,

  undoStack: [],
  quickNotes: [],
};

// ============================================================================
// Reducer
// ============================================================================

function matchScoutingReducer(
  state: MatchScoutingState,
  action: MatchScoutingAction
): MatchScoutingState {
  // Add action to undo stack (except for undo itself and non-data actions)
  const addToUndoStack = ![
    'UNDO',
    'SET_MATCH_INFO',
    'SET_SCOUT_INFO',
    'START_MATCH',
    'ADVANCE_PERIOD',
    'SET_PERIOD',
    'SUBMIT',
    'RESET',
  ].includes(action.type);

  const newState = { ...state };
  if (addToUndoStack) {
    newState.undoStack = [...state.undoStack, action];
  }

  switch (action.type) {
    case 'SET_MATCH_INFO':
      return {
        ...newState,
        ...action.payload,
      };

    case 'SET_SCOUT_INFO':
      return {
        ...newState,
        ...action.payload,
      };

    case 'START_MATCH':
      return {
        ...newState,
        currentPeriod: 'auto',
        matchStartTime: Date.now(),
      };

    case 'ADVANCE_PERIOD': {
      const periodOrder: Period[] = ['pre-match', 'auto', 'teleop', 'endgame', 'submitted'];
      const currentIndex = periodOrder.indexOf(state.currentPeriod);
      const nextPeriod = periodOrder[currentIndex + 1] || state.currentPeriod;
      return {
        ...newState,
        currentPeriod: nextPeriod,
      };
    }

    case 'SET_PERIOD':
      return {
        ...newState,
        currentPeriod: action.payload,
      };

    case 'INCREMENT_COUNTER': {
      const { period, field } = action.payload;
      const performanceKey = `${period}Performance` as keyof Pick<
        MatchScoutingState,
        'autoPerformance' | 'teleopPerformance' | 'endgamePerformance'
      >;
      const performance = state[performanceKey] as unknown as Record<string, unknown>;

      return {
        ...newState,
        [performanceKey]: {
          ...performance,
          [field]: (performance[field] as number) + 1,
        },
      };
    }

    case 'DECREMENT_COUNTER': {
      const { period, field } = action.payload;
      const performanceKey = `${period}Performance` as keyof Pick<
        MatchScoutingState,
        'autoPerformance' | 'teleopPerformance' | 'endgamePerformance'
      >;
      const performance = state[performanceKey] as unknown as Record<string, unknown>;
      const currentValue = performance[field] as number;

      return {
        ...newState,
        [performanceKey]: {
          ...performance,
          [field]: Math.max(0, currentValue - 1), // Don't go below 0
        },
      };
    }

    case 'TOGGLE_BOOLEAN': {
      const { period, field } = action.payload;

      if (period === 'overall') {
        // Overall match fields
        return {
          ...newState,
          [field]: !(state[field as keyof MatchScoutingState] as boolean),
        };
      } else {
        // Period-specific fields
        const performanceKey = `${period}Performance` as keyof Pick<
          MatchScoutingState,
          'autoPerformance' | 'teleopPerformance' | 'endgamePerformance'
        >;
        const performance = state[performanceKey] as unknown as Record<string, unknown>;

        return {
          ...newState,
          [performanceKey]: {
            ...performance,
            [field]: !performance[field],
          },
        };
      }
    }

    case 'SET_SELECT': {
      const { period, field, value } = action.payload;
      const performanceKey = `${period}Performance` as keyof Pick<
        MatchScoutingState,
        'autoPerformance' | 'teleopPerformance' | 'endgamePerformance'
      >;
      const performance = state[performanceKey] as unknown as Record<string, unknown>;

      return {
        ...newState,
        [performanceKey]: {
          ...performance,
          [field]: value,
        },
      };
    }

    case 'SET_RATING':
      return {
        ...newState,
        [action.payload.field]: action.payload.value,
      };

    case 'ADD_CARD':
      return {
        ...newState,
        cards: [...state.cards, action.payload],
      };

    case 'REMOVE_CARD':
      return {
        ...newState,
        cards: state.cards.filter((_, i) => i !== action.payload),
      };

    case 'ADD_NOTE':
      return {
        ...newState,
        quickNotes: [...state.quickNotes, action.payload],
      };

    case 'REMOVE_NOTE':
      return {
        ...newState,
        quickNotes: state.quickNotes.filter((_, i) => i !== action.payload),
      };

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;

      // Pop last action
      const undoStack = [...state.undoStack];
      const lastAction = undoStack.pop();

      // Rebuild state by replaying all actions except the last
      let replayedState = { ...initialState };
      for (const action of undoStack) {
        replayedState = matchScoutingReducer(replayedState, action);
      }

      return {
        ...replayedState,
        // Preserve non-data state
        matchKey: state.matchKey,
        teamNumber: state.teamNumber,
        allianceColor: state.allianceColor,
        robotPosition: state.robotPosition,
        scoutName: state.scoutName,
        scoutUserId: state.scoutUserId,
        currentPeriod: state.currentPeriod,
        matchStartTime: state.matchStartTime,
        undoStack,
      };
    }

    case 'SUBMIT':
      return {
        ...newState,
        currentPeriod: 'submitted',
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface MatchScoutingContextValue {
  state: MatchScoutingState;
  dispatch: React.Dispatch<MatchScoutingAction>;
}

const MatchScoutingContext = createContext<MatchScoutingContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface MatchScoutingProviderProps {
  children: ReactNode;
}

export function MatchScoutingProvider({ children }: MatchScoutingProviderProps) {
  const [state, dispatch] = useReducer(matchScoutingReducer, initialState);

  return (
    <MatchScoutingContext.Provider value={{ state, dispatch }}>
      {children}
    </MatchScoutingContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useMatchScouting() {
  const context = useContext(MatchScoutingContext);

  if (!context) {
    throw new Error('useMatchScouting must be used within MatchScoutingProvider');
  }

  const { state, dispatch } = context;

  // Helper functions for common operations
  const helpers = {
    // Setup
    setMatchInfo: (matchKey: string, teamNumber: number, allianceColor: 'red' | 'blue', robotPosition: 1 | 2 | 3) => {
      dispatch({ type: 'SET_MATCH_INFO', payload: { matchKey, teamNumber, allianceColor, robotPosition } });
    },

    setScoutInfo: (scoutName: string, scoutUserId?: string) => {
      dispatch({ type: 'SET_SCOUT_INFO', payload: { scoutName, scoutUserId } });
    },

    // Period management
    startMatch: () => dispatch({ type: 'START_MATCH' }),
    advancePeriod: () => dispatch({ type: 'ADVANCE_PERIOD' }),
    setPeriod: (period: Period) => dispatch({ type: 'SET_PERIOD', payload: period }),

    // Counters
    increment: (period: 'auto' | 'teleop' | 'endgame', field: string) => {
      dispatch({ type: 'INCREMENT_COUNTER', payload: { period, field } });
    },

    decrement: (period: 'auto' | 'teleop' | 'endgame', field: string) => {
      dispatch({ type: 'DECREMENT_COUNTER', payload: { period, field } });
    },

    // Booleans
    toggle: (period: 'auto' | 'teleop' | 'endgame' | 'overall', field: string) => {
      dispatch({ type: 'TOGGLE_BOOLEAN', payload: { period, field } });
    },

    // Selects
    setSelect: (period: 'auto' | 'teleop' | 'endgame', field: string, value: string) => {
      dispatch({ type: 'SET_SELECT', payload: { period, field, value } });
    },

    // Ratings
    setRating: (field: 'defenseRating' | 'driverSkillRating', value: number) => {
      dispatch({ type: 'SET_RATING', payload: { field, value } });
    },

    // Cards
    addCard: (card: 'yellow' | 'red') => dispatch({ type: 'ADD_CARD', payload: card }),
    removeCard: (index: number) => dispatch({ type: 'REMOVE_CARD', payload: index }),

    // Notes
    addNote: (note: string) => dispatch({ type: 'ADD_NOTE', payload: note }),
    removeNote: (index: number) => dispatch({ type: 'REMOVE_NOTE', payload: index }),

    // Undo
    undo: () => dispatch({ type: 'UNDO' }),

    // Submission
    submit: () => dispatch({ type: 'SUBMIT' }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return {
    state,
    dispatch,
    ...helpers,
  };
}
