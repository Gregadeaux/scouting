'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Team } from '@/types';

interface UseEventTeamsReturn {
  data: Team[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * useEventTeams Hook
 *
 * Fetches teams participating in a specific event.
 * Only fetches if eventKey is provided (not null).
 * Automatically resets and refetches when eventKey changes.
 *
 * @example
 * ```tsx
 * const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
 * const { data: teams, isLoading, error } = useEventTeams(selectedEvent);
 *
 * if (!selectedEvent) return <p>Select an event</p>;
 * if (isLoading) return <Loader />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <div>
 *     {teams.map(team => <TeamCard key={team.team_number} team={team} />)}
 *   </div>
 * );
 * ```
 */
export function useEventTeams(eventKey: string | null): UseEventTeamsReturn {
  const [data, setData] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!eventKey) {
      // Reset data if no event is selected
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const url = `/api/events/${encodeURIComponent(eventKey)}/teams`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch teams: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(new Error(errorMessage));
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [eventKey]);

  useEffect(() => {
    // Reset data when eventKey changes to null
    if (!eventKey) {
      setData([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    fetchTeams();
  }, [fetchTeams, eventKey]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchTeams,
  };
}
