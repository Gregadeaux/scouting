import { useState, useEffect, useCallback } from 'react';
import type { TeamStatistics } from '@/types';

export interface TeamMatchTBA {
  matchKey: string;
  matchNumber: number;
  compLevel: string;
  setNumber: number;
  alliance: 'red' | 'blue';
  robotPosition: 1 | 2 | 3;
  partners: number[];
  allianceScore: number | null;
  opponentScore: number | null;
  result: 'W' | 'L' | 'T' | null;
  autoTowerLevel: string | null;
  endgameTowerLevel: string | null;
  autoTowerPoints: number;
  endgameTowerPoints: number;
  hubCounts: Record<string, number> | null;
  allianceAutoPoints: number | null;
  allianceTeleopPoints: number | null;
  allianceEndgamePoints: number | null;
}

export interface TeamMatchStats {
  auto_opr: number | null;
  teleop_hub_opr: number | null;
  endgame_opr: number | null;
  total_hub_opr: number | null;
  opr: number | null;
  avg_total_score: number | null;
  avg_auto_score: number | null;
  avg_teleop_score: number | null;
  avg_endgame_score: number | null;
}

interface UseTeamTBADataOptions {
  teamNumber: number;
  eventKey: string;
  enabled?: boolean;
}

interface UseTeamTBADataReturn {
  matches: TeamMatchTBA[];
  stats: TeamMatchStats | null;
  allTeamStats: TeamStatistics[];
  isLoading: boolean;
  error: string | null;
}

export function useTeamTBAData({
  teamNumber,
  eventKey,
  enabled = true,
}: UseTeamTBADataOptions): UseTeamTBADataReturn {
  const [matches, setMatches] = useState<TeamMatchTBA[]>([]);
  const [stats, setStats] = useState<TeamMatchStats | null>(null);
  const [allTeamStats, setAllTeamStats] = useState<TeamStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !teamNumber || !eventKey) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch team match history and event-wide stats in parallel
      const [matchRes, eventRes] = await Promise.all([
        fetch(`/api/analytics/team-matches/${teamNumber}?eventKey=${encodeURIComponent(eventKey)}`),
        fetch(`/api/analytics/event/${encodeURIComponent(eventKey)}`),
      ]);

      if (!matchRes.ok) {
        throw new Error('Failed to fetch team match data');
      }

      const matchData = await matchRes.json();
      if (matchData.success) {
        setMatches(matchData.data?.matches || []);
        setStats(matchData.data?.stats || null);
      }

      if (eventRes.ok) {
        const eventData = await eventRes.json();
        if (eventData.success) {
          setAllTeamStats(eventData.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching TBA data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch TBA data');
      setMatches([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [teamNumber, eventKey, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { matches, stats, allTeamStats, isLoading, error };
}
