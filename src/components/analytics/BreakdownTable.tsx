/**
 * Breakdown Table Component
 *
 * Displays top teams by OPR with breakdown match details
 * Shows specific match numbers where robot had issues
 * Used in printable report
 *
 * Related: SCOUT-88
 */

'use client';

import { useEffect, useState } from 'react';
import type { TeamStatistics } from '@/types';
import type { TeamBreakdownData } from '@/app/api/analytics/breakdowns/[eventKey]/route';

interface BreakdownTableProps {
  eventKey: string;
  teamStats: TeamStatistics[];
  topN?: number;
}

export function BreakdownTable({ eventKey, teamStats, topN = 10 }: BreakdownTableProps) {
  const [breakdownData, setBreakdownData] = useState<TeamBreakdownData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBreakdowns = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/analytics/breakdowns/${eventKey}`);
        const data = await response.json();

        if (data.success && data.data) {
          setBreakdownData(data.data.teams || []);
        }
      } catch (error) {
        console.error('[BreakdownTable] Error fetching breakdowns:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreakdowns();
  }, [eventKey]);

  // Get top N teams by OPR
  const topTeams = [...teamStats]
    .sort((a, b) => (b.opr || 0) - (a.opr || 0))
    .slice(0, topN);

  // Helper to get breakdown info for a team
  const getBreakdownInfo = (teamNumber: number) => {
    return breakdownData.find(bd => bd.team_number === teamNumber);
  };

  // Helper to format match numbers
  const formatMatchNumbers = (breakdown: TeamBreakdownData | undefined) => {
    if (!breakdown || breakdown.breakdown_matches.length === 0) {
      return '—';
    }

    // Group by comp level for cleaner display
    const byCompLevel = breakdown.breakdown_matches.reduce((acc, match) => {
      const key = match.comp_level.toUpperCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(match.match_number);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(byCompLevel)
      .map(([level, numbers]) => `${level} ${numbers.join(', ')}`)
      .join('; ');
  };

  // Helper to format breakdown types
  const formatBreakdownTypes = (breakdown: TeamBreakdownData | undefined) => {
    if (!breakdown || breakdown.breakdown_matches.length === 0) {
      return '—';
    }

    const allTypes = new Set<string>();
    breakdown.breakdown_matches.forEach(match => {
      match.breakdown_types.forEach(type => allTypes.add(type));
    });

    return Array.from(allTypes)
      .map(type => type.charAt(0).toUpperCase() + type.slice(1))
      .join(', ');
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading breakdown data...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left p-3 font-semibold">Rank</th>
            <th className="text-left p-3 font-semibold">Team</th>
            <th className="text-right p-3 font-semibold">OPR</th>
            <th className="text-right p-3 font-semibold">DPR</th>
            <th className="text-right p-3 font-semibold">CCWM</th>
            <th className="text-right p-3 font-semibold">Reliability %</th>
            <th className="text-right p-3 font-semibold">Breakdowns</th>
            <th className="text-left p-3 font-semibold">Breakdown Matches</th>
            <th className="text-left p-3 font-semibold">Issue Types</th>
          </tr>
        </thead>
        <tbody>
          {topTeams.map((team, index) => {
            const breakdown = getBreakdownInfo(team.team_number);
            const hasBreakdown = breakdown && breakdown.total_breakdowns > 0;

            return (
              <tr
                key={team.team_number}
                className={`border-b ${hasBreakdown ? 'bg-red-50' : ''}`}
              >
                <td className="p-3 font-medium">{index + 1}</td>
                <td className="p-3 font-bold">{team.team_number}</td>
                <td className="p-3 text-right font-mono">{team.opr?.toFixed(1) || 'N/A'}</td>
                <td className="p-3 text-right font-mono">{team.dpr?.toFixed(1) || 'N/A'}</td>
                <td className="p-3 text-right font-mono">{team.ccwm?.toFixed(1) || 'N/A'}</td>
                <td className="p-3 text-right font-mono">
                  {team.reliability_score?.toFixed(0) || 'N/A'}
                </td>
                <td className="p-3 text-right font-mono">
                  {breakdown?.total_breakdowns || 0}
                </td>
                <td className="p-3 text-xs">
                  {formatMatchNumbers(breakdown)}
                </td>
                <td className="p-3 text-xs">
                  {formatBreakdownTypes(breakdown)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-4 text-xs text-muted-foreground space-y-1">
        <p><strong>OPR:</strong> Offensive Power Rating - Contribution to alliance score</p>
        <p><strong>DPR:</strong> Defensive Power Rating - Points prevented on opposing alliance</p>
        <p><strong>CCWM:</strong> Calculated Contribution to Winning Margin</p>
        <p><strong>Reliability:</strong> Percentage of matches played without breakdowns</p>
        <p><strong>Breakdown Types:</strong> Disabled (robot stopped working), Disconnected (lost connection), Tipped (robot fell over)</p>
      </div>
    </div>
  );
}
