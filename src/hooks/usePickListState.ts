/**
 * Pick List State Management Hook
 *
 * Manages global picked teams state with localStorage persistence.
 * When a team is marked as picked, it affects ALL picklist columns simultaneously.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'picklist_picked_teams_';

export interface PickListStateReturn {
  /** Set of picked team numbers */
  pickedTeams: Set<number>;

  /** Toggle a team's picked status */
  togglePicked: (teamNumber: number) => void;

  /** Check if a team is picked */
  isPicked: (teamNumber: number) => boolean;

  /** Clear all picked teams (with optional confirmation) */
  clearAllPicked: () => void;

  /** Load picked teams from localStorage for specific event */
  loadForEvent: (eventKey: string) => void;

  /** Get count of picked teams */
  pickedCount: number;
}

/**
 * Custom hook for managing pick list state
 *
 * Features:
 * - Global state (affects all columns)
 * - localStorage persistence per event
 * - Toggle picked status
 * - Clear all picked teams
 */
export function usePickListState(eventKey?: string): PickListStateReturn {
  const [pickedTeams, setPickedTeams] = useState<Set<number>>(new Set());
  const [currentEventKey, setCurrentEventKey] = useState<string | undefined>(eventKey);

  /**
   * Load picked teams from localStorage
   */
  const loadFromStorage = useCallback((key: string) => {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${key}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const parsed = JSON.parse(stored) as number[];
        setPickedTeams(new Set(parsed));
        console.log(`[PickListState] Loaded ${parsed.length} picked teams for ${key}`);
      } else {
        setPickedTeams(new Set());
      }
    } catch (error) {
      console.error('[PickListState] Error loading from storage:', error);
      setPickedTeams(new Set());
    }
  }, []);

  // Load picked teams from localStorage on mount or event change
  useEffect(() => {
    if (eventKey) {
      loadFromStorage(eventKey);
      setCurrentEventKey(eventKey);
    }
  }, [eventKey, loadFromStorage]);

  /**
   * Save picked teams to localStorage
   */
  const saveToStorage = useCallback((key: string, teams: Set<number>) => {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${key}`;
      const array = Array.from(teams);
      localStorage.setItem(storageKey, JSON.stringify(array));
      console.log(`[PickListState] Saved ${array.length} picked teams for ${key}`);
    } catch (error) {
      console.error('[PickListState] Error saving to storage:', error);
    }
  }, []);

  /**
   * Toggle a team's picked status
   */
  const togglePicked = useCallback((teamNumber: number) => {
    setPickedTeams(prev => {
      const next = new Set(prev);

      if (next.has(teamNumber)) {
        next.delete(teamNumber);
        console.log(`[PickListState] Unmarked team ${teamNumber} as picked`);
      } else {
        next.add(teamNumber);
        console.log(`[PickListState] Marked team ${teamNumber} as picked`);
      }

      // Save to localStorage
      if (currentEventKey) {
        saveToStorage(currentEventKey, next);
      }

      return next;
    });
  }, [currentEventKey, saveToStorage]);

  /**
   * Check if a team is picked
   */
  const isPicked = useCallback((teamNumber: number): boolean => {
    return pickedTeams.has(teamNumber);
  }, [pickedTeams]);

  /**
   * Clear all picked teams
   */
  const clearAllPicked = useCallback(() => {
    setPickedTeams(new Set());

    if (currentEventKey) {
      saveToStorage(currentEventKey, new Set());
    }

    console.log('[PickListState] Cleared all picked teams');
  }, [currentEventKey, saveToStorage]);

  /**
   * Load picked teams for a specific event
   */
  const loadForEvent = useCallback((key: string) => {
    loadFromStorage(key);
    setCurrentEventKey(key);
  }, [loadFromStorage]);

  return {
    pickedTeams,
    togglePicked,
    isPicked,
    clearAllPicked,
    loadForEvent,
    pickedCount: pickedTeams.size,
  };
}
