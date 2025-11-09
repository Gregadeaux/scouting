/**
 * Custom hook for fetching team scouting data across all matches at an event
 * Uses the /api/teams/[teamNumber]/scouting endpoint (SCOUT-37)
 *
 * @example Basic Usage
 * ```tsx
 * import { useTeamScouting } from '@/hooks/useTeamScouting';
 *
 * function TeamPerformance({ teamNumber }: { teamNumber: number }) {
 *   const { data, aggregates, isLoading, error } = useTeamScouting({
 *     teamNumber,
 *     eventKey: '2025wimu',
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       <h2>Team {teamNumber}</h2>
 *       <p>Average Points: {aggregates?.avg_total_points}</p>
 *       <p>Matches: {aggregates?.total_matches}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With Sorting and Pagination
 * ```tsx
 * const { data, pagination } = useTeamScouting({
 *   teamNumber: 930,
 *   eventKey: '2025wimu',
 *   sortBy: 'total_points',
 *   sortOrder: 'desc',
 *   limit: 10,
 *   page: 1,
 * });
 * ```
 *
 * @example Conditional Fetching
 * ```tsx
 * const { data } = useTeamScouting({
 *   teamNumber: 930,
 *   eventKey: selectedEvent,
 *   enabled: selectedEvent !== null, // Only fetch when event is selected
 * });
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  ScoutingEntryWithDetails,
  TeamScoutingAggregates,
  PaginationInfo,
} from '@/types/admin';

interface UseTeamScoutingOptions {
  teamNumber: number;
  eventKey: string;
  sortBy?: 'match_number' | 'created_at' | 'total_points';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  enabled?: boolean; // Allow disabling the hook
}

interface TeamScoutingResponse {
  success: boolean;
  data: ScoutingEntryWithDetails[];
  pagination: PaginationInfo;
  aggregates: TeamScoutingAggregates;
  error?: string;
}

interface UseTeamScoutingReturn {
  data: ScoutingEntryWithDetails[];
  aggregates: TeamScoutingAggregates | null;
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const EMPTY_AGGREGATES: TeamScoutingAggregates = {
  total_matches: 0,
  avg_auto_points: 0,
  avg_teleop_points: 0,
  avg_endgame_points: 0,
  avg_total_points: 0,
  complete_entries: 0,
  data_quality_distribution: {},
};

export function useTeamScouting({
  teamNumber,
  eventKey,
  sortBy = 'match_number',
  sortOrder = 'asc',
  limit = 50,
  page = 1,
  enabled = true,
}: UseTeamScoutingOptions): UseTeamScoutingReturn {
  const [data, setData] = useState<ScoutingEntryWithDetails[]>([]);
  const [aggregates, setAggregates] = useState<TeamScoutingAggregates | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamScouting = useCallback(async () => {
    if (!enabled || !teamNumber || !eventKey) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        eventKey,
        sortBy,
        sortOrder,
        limit: String(limit),
        page: String(page),
      });

      const url = `/api/teams/${teamNumber}/scouting?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch team scouting data: ${response.statusText}`);
      }

      const result: TeamScoutingResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch team scouting data');
      }

      setData(result.data || []);
      setAggregates(result.aggregates || EMPTY_AGGREGATES);
      setPagination(result.pagination || null);
    } catch (err) {
      console.error('Error fetching team scouting data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setData([]);
      setAggregates(EMPTY_AGGREGATES);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [teamNumber, eventKey, sortBy, sortOrder, limit, page, enabled]);

  useEffect(() => {
    fetchTeamScouting();
  }, [fetchTeamScouting]);

  return {
    data,
    aggregates,
    pagination,
    isLoading,
    error,
    refetch: fetchTeamScouting,
  };
}
