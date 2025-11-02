'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';
import { getCachedEvents, cacheEvents } from '@/lib/offline/cache';
import { useOfflineStatus } from '@/lib/offline';

interface UseEventsOptions {
  year?: number;
  limit?: number;
}

interface UseEventsReturn {
  data: Event[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * useEvents Hook
 *
 * Fetches events from the API with optional filtering by year.
 * Automatically refetches when options change.
 *
 * @example
 * ```tsx
 * const { data: events, isLoading, error, refetch } = useEvents({ year: 2025 });
 *
 * if (isLoading) return <Loader />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <div>
 *     {events.map(event => <EventCard key={event.event_key} event={event} />)}
 *   </div>
 * );
 * ```
 */
export function useEvents(options?: UseEventsOptions): UseEventsReturn {
  const [data, setData] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isOffline } = useOfflineStatus();

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const yearString = options?.year?.toString() || new Date().getFullYear().toString();

      // Try cache first if offline
      if (isOffline) {
        const cached = await getCachedEvents(yearString);
        if (cached) {
          setData(cached);
          setIsLoading(false);
          return;
        }
      }

      const params = new URLSearchParams();
      if (options?.year) {
        params.append('year', options.year.toString());
      }
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }

      const url = `/api/events${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        // If offline and no cache, try to use any stale cache
        if (isOffline) {
          const cached = await getCachedEvents(yearString);
          if (cached) {
            setData(cached);
            setIsLoading(false);
            return;
          }
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch events: ${response.statusText}`);
      }

      const result = await response.json();
      // API returns { success: true, data: { data: Event[], pagination: {...} } }
      const events = result.data?.data || [];

      // Cache for offline use
      await cacheEvents(yearString, events);

      setData(events);
    } catch (err) {
      // If offline and error, still try cache as fallback
      if (isOffline) {
        const yearString = options?.year?.toString() || new Date().getFullYear().toString();
        const cached = await getCachedEvents(yearString);
        if (cached) {
          setData(cached);
          setIsLoading(false);
          return;
        }
      }

      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(new Error(errorMessage));
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [options?.year, options?.limit, isOffline]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchEvents,
  };
}
