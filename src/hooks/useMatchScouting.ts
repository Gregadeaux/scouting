/**
 * Custom hook for fetching match scouting data organized by alliance
 * Uses the /api/matches/[matchKey]/scouting endpoint (SCOUT-36)
 *
 * @example Basic Usage
 * ```tsx
 * import { useMatchScouting } from '@/hooks/useMatchScouting';
 *
 * function MatchOverview({ matchKey }: { matchKey: string }) {
 *   const { data, metadata, isLoading, error } = useMatchScouting({
 *     matchKey,
 *     eventKey: '2025wimu',
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       <h2>Match {matchKey}</h2>
 *       <p>Coverage: {metadata?.coverage_percentage}%</p>
 *       <p>Red Teams: {data?.red_alliance.length}</p>
 *       <p>Blue Teams: {data?.blue_alliance.length}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Filter by Alliance
 * ```tsx
 * const { data } = useMatchScouting({
 *   matchKey: '2025wimu_qm10',
 *   eventKey: '2025wimu',
 *   alliance: 'red', // Only fetch red alliance data
 * });
 * ```
 *
 * @example Filter by Team
 * ```tsx
 * const { data } = useMatchScouting({
 *   matchKey: '2025wimu_qm10',
 *   teamNumber: 930, // Only fetch data for team 930
 * });
 * ```
 *
 * @example With Manual Refetch
 * ```tsx
 * const { data, refetch } = useMatchScouting({
 *   matchKey: '2025wimu_qm10',
 *   eventKey: '2025wimu',
 * });
 *
 * // Later, manually refresh the data
 * <button onClick={refetch}>Refresh Data</button>
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  MatchScoutingData,
  MatchScoutingMetadata,
} from '@/types/admin';

interface UseMatchScoutingOptions {
  matchKey: string;
  eventKey?: string;
  teamNumber?: number;
  alliance?: 'red' | 'blue';
  enabled?: boolean; // Allow disabling the hook
}

interface MatchScoutingResponse {
  success: boolean;
  data: MatchScoutingData;
  metadata: MatchScoutingMetadata;
  error?: string;
}

interface UseMatchScoutingReturn {
  data: MatchScoutingData | null;
  metadata: MatchScoutingMetadata | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const EMPTY_DATA: MatchScoutingData = {
  match_key: '',
  red_alliance: [],
  blue_alliance: [],
  by_team: {},
};

const EMPTY_METADATA: MatchScoutingMetadata = {
  total_entries: 0,
  teams_scouted: 0,
  coverage_percentage: 0,
};

export function useMatchScouting({
  matchKey,
  eventKey,
  teamNumber,
  alliance,
  enabled = true,
}: UseMatchScoutingOptions): UseMatchScoutingReturn {
  const [data, setData] = useState<MatchScoutingData | null>(null);
  const [metadata, setMetadata] = useState<MatchScoutingMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatchScouting = useCallback(async () => {
    if (!enabled || !matchKey) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (eventKey) params.set('eventKey', eventKey);
      if (teamNumber) params.set('teamNumber', String(teamNumber));
      if (alliance) params.set('alliance', alliance);

      const queryString = params.toString();
      const url = `/api/matches/${matchKey}/scouting${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch match scouting data: ${response.statusText}`);
      }

      const result: MatchScoutingResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch match scouting data');
      }

      setData(result.data || EMPTY_DATA);
      setMetadata(result.metadata || EMPTY_METADATA);
    } catch (err) {
      console.error('Error fetching match scouting data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setData(EMPTY_DATA);
      setMetadata(EMPTY_METADATA);
    } finally {
      setIsLoading(false);
    }
  }, [matchKey, eventKey, teamNumber, alliance, enabled]);

  useEffect(() => {
    fetchMatchScouting();
  }, [fetchMatchScouting]);

  return {
    data,
    metadata,
    isLoading,
    error,
    refetch: fetchMatchScouting,
  };
}
