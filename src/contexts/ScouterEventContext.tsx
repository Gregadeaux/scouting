'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';
import { useEvents } from '@/hooks/useEvents';

interface ScouterEventContextValue {
  selectedEventKey: string | null;
  selectedEvent: Event | null;
  setSelectedEvent: (event: Event | null) => void;
  events: Event[];
  isLoading: boolean;
  error: Error | null;
}

const ScouterEventContext = createContext<ScouterEventContextValue | undefined>(undefined);

const STORAGE_KEY = 'scouter_selected_event';

export function ScouterEventProvider({ children }: { children: React.ReactNode }) {
  const [selectedEvent, setSelectedEventState] = useState<Event | null>(null);
  const { data: events, isLoading, error } = useEvents({ year: 2026, limit: 100 });

  // Restore from localStorage once events load
  useEffect(() => {
    if (isLoading || events.length === 0) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as { event_key: string };
      const match = events.find((e) => e.event_key === parsed.event_key);
      if (match) {
        setSelectedEventState(match);
      }
    } catch {
      // Invalid JSON, ignore
    }
  }, [isLoading, events]);

  const setSelectedEvent = useCallback((event: Event | null) => {
    setSelectedEventState(event);

    if (event) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ event_key: event.event_key }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ScouterEventContext.Provider
      value={{
        selectedEventKey: selectedEvent?.event_key ?? null,
        selectedEvent,
        setSelectedEvent,
        events,
        isLoading,
        error,
      }}
    >
      {children}
    </ScouterEventContext.Provider>
  );
}

export function useScouterEvent(): ScouterEventContextValue {
  const context = useContext(ScouterEventContext);
  if (context === undefined) {
    throw new Error('useScouterEvent must be used within a ScouterEventProvider');
  }
  return context;
}

/**
 * Safe version that returns null when used outside a ScouterEventProvider.
 * Useful for components that render in both scouter layout and standalone (e.g. demo page).
 */
export function useScouterEventSafe(): ScouterEventContextValue | null {
  return useContext(ScouterEventContext) ?? null;
}
