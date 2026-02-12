'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export interface EventSummary {
  event_key: string;
  event_name: string;
  event_code: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  state_province: string | null;
}

interface EventContextValue {
  selectedEvent: EventSummary | null;
  setSelectedEvent: (event: EventSummary | null) => void;
  events: EventSummary[];
  isLoading: boolean;
  error: string | null;
  refreshEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

const STORAGE_KEY = 'scouting_selected_event';

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [selectedEvent, setSelectedEventState] = useState<EventSummary | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const pathname = usePathname();

  // Extract event key from URL if on an event page
  const urlEventKey = pathname?.match(/\/admin\/events\/([^/]+)/)?.[1] || null;

  // Fetch events on mount
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/events?limit=50&sortBy=start_date&sortOrder=desc');
      if (!response.ok) throw new Error('Failed to fetch events');
      const result = await response.json();
      setEvents(result.data || []);
      return result.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      setEvents([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load: fetch events and restore from localStorage
  useEffect(() => {
    async function initialize() {
      const fetchedEvents = await fetchEvents();

      // Try to restore from localStorage first (will be overridden by URL sync if needed)
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const eventExists = fetchedEvents.find((e: EventSummary) => e.event_key === parsed.event_key);
          if (eventExists) {
            setSelectedEventState(eventExists);
          }
        }
      } catch {
        // Ignore localStorage errors
      }
      setHasInitialized(true);
    }
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Sync context with URL when navigating to event pages (runs after events loaded)
  useEffect(() => {
    if (!hasInitialized || events.length === 0 || !urlEventKey) return;

    // If we're on an event page, ensure that event is selected
    if (selectedEvent?.event_key !== urlEventKey) {
      const urlEvent = events.find(e => e.event_key === urlEventKey);
      if (urlEvent) {
        setSelectedEventState(urlEvent);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(urlEvent));
        } catch {
          // Ignore
        }
      }
    }
  }, [urlEventKey, events, hasInitialized, selectedEvent?.event_key]);

  // Save selected event to localStorage when it changes
  const setSelectedEvent = useCallback((event: EventSummary | null) => {
    setSelectedEventState(event);
    try {
      if (event) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return (
    <EventContext.Provider
      value={{
        selectedEvent,
        setSelectedEvent,
        events,
        isLoading,
        error,
        refreshEvents: fetchEvents,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEventContext must be used within an EventProvider');
  }
  return context;
}
