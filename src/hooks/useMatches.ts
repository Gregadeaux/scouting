'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MatchSchedule } from '@/types';
import { getCachedMatches, cacheMatches } from '@/lib/offline/cache';
import { useOfflineStatus } from '@/lib/offline';

interface UseMatchesOptions {
  eventKey?: string | null;
  limit?: number;
}

interface UseMatchesReturn {
  data: MatchSchedule[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * useMatches Hook
 *
 * Fetches match schedule from the API with optional filtering by event.
 * Automatically refetches when options change.
 *
 * @example
 * ```tsx
 * const { data: matches, isLoading, error, refetch } = useMatches({
 *   eventKey: '2025cafr'
 * });
 *
 * if (isLoading) return <Loader />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <div>
 *     {matches.map(match => <MatchCard key={match.match_key} match={match} />)}
 *   </div>
 * );
 * ```
 */
export function useMatches(options?: UseMatchesOptions): UseMatchesReturn {
  const [data, setData] = useState<MatchSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isOffline } = useOfflineStatus();

  const fetchMatches = useCallback(async () => {
    // Don't fetch if no event key provided
    if (!options?.eventKey) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Try cache first if offline
      if (isOffline) {
        const cached = await getCachedMatches(options.eventKey);
        if (cached) {
          setData(cached);
          setIsLoading(false);
          return;
        }
      }

      const params = new URLSearchParams();
      params.append('event_key', options.eventKey);
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }

      const url = `/api/matches?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        // If offline and no cache, try to use any stale cache
        if (isOffline) {
          const cached = await getCachedMatches(options.eventKey);
          if (cached) {
            setData(cached);
            setIsLoading(false);
            return;
          }
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch matches: ${response.statusText}`);
      }

      const result = await response.json();
      const matches = result.data || [];

      // Cache for offline use
      await cacheMatches(options.eventKey, matches);

      setData(matches);
    } catch (err) {
      // If offline and error, still try cache as fallback
      if (isOffline && options?.eventKey) {
        const cached = await getCachedMatches(options.eventKey);
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
  }, [options?.eventKey, options?.limit, isOffline]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchMatches,
  };
}
