/**
 * OPR Leaderboard Component
 *
 * Interactive leaderboard showing all teams ranked by OPR.
 * Supports clicking teams to select them for comparison.
 *
 * Related: SCOUT-7
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Check } from 'lucide-react';
import type { TeamStatistics } from '@/types';

interface OPRLeaderboardProps {
  teamStats: TeamStatistics[];
  onTeamSelect: (teamNumber: number) => void;
  selectedTeams: number[];
}

type SortMetric = 'opr' | 'dpr' | 'ccwm' | 'reliability';

export function OPRLeaderboard({ teamStats, onTeamSelect, selectedTeams }: OPRLeaderboardProps) {
  const [sortBy, setSortBy] = useState<SortMetric>('opr');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedTeams = [...teamStats].sort((a, b) => {
    let aVal = 0;
    let bVal = 0;

    switch (sortBy) {
      case 'opr':
        aVal = a.opr || 0;
        bVal = b.opr || 0;
        break;
      case 'dpr':
        aVal = a.dpr || 0;
        bVal = b.dpr || 0;
        break;
      case 'ccwm':
        aVal = a.ccwm || 0;
        bVal = b.ccwm || 0;
        break;
      case 'reliability':
        aVal = a.reliability_score || 0;
        bVal = b.reliability_score || 0;
        break;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    return (bVal - aVal) * direction;
  });

  const handleSort = (metric: SortMetric) => {
    if (sortBy === metric) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(metric);
      setSortDirection('desc');
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Team Rankings</h3>
        <span className="text-sm text-muted-foreground">
          Click to compare (max 4)
        </span>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <SortButton
          label="OPR"
          active={sortBy === 'opr'}
          direction={sortBy === 'opr' ? sortDirection : undefined}
          onClick={() => handleSort('opr')}
        />
        <SortButton
          label="DPR"
          active={sortBy === 'dpr'}
          direction={sortBy === 'dpr' ? sortDirection : undefined}
          onClick={() => handleSort('dpr')}
        />
        <SortButton
          label="CCWM"
          active={sortBy === 'ccwm'}
          direction={sortBy === 'ccwm' ? sortDirection : undefined}
          onClick={() => handleSort('ccwm')}
        />
        <SortButton
          label="Reliability"
          active={sortBy === 'reliability'}
          direction={sortBy === 'reliability' ? sortDirection : undefined}
          onClick={() => handleSort('reliability')}
        />
      </div>

      {/* Leaderboard Table */}
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background border-b">
            <tr className="text-sm text-muted-foreground">
              <th className="text-left p-2 w-12">Rank</th>
              <th className="text-left p-2">Team</th>
              <th className="text-right p-2">OPR</th>
              <th className="text-right p-2">DPR</th>
              <th className="text-right p-2">CCWM</th>
              <th className="text-right p-2">Rel%</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => {
              const isSelected = selectedTeams.includes(team.team_number);
              return (
                <tr
                  key={team.team_number}
                  onClick={() => onTeamSelect(team.team_number)}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                    isSelected ? 'bg-primary/10' : ''
                  }`}
                >
                  <td className="p-2 text-muted-foreground">{index + 1}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className="font-medium">{team.team_number}</span>
                    </div>
                  </td>
                  <td className="p-2 text-right font-mono text-sm">
                    {team.opr?.toFixed(1) || 'N/A'}
                  </td>
                  <td className="p-2 text-right font-mono text-sm">
                    {team.dpr?.toFixed(1) || 'N/A'}
                  </td>
                  <td className="p-2 text-right font-mono text-sm">
                    {team.ccwm?.toFixed(1) || 'N/A'}
                  </td>
                  <td className="p-2 text-right font-mono text-sm">
                    {team.reliability_score?.toFixed(0) || 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface SortButtonProps {
  label: string;
  active: boolean;
  direction?: 'asc' | 'desc';
  onClick: () => void;
}

function SortButton({ label, active, direction, onClick }: SortButtonProps) {
  return (
    <Button
      variant={active ? 'primary' : 'outline'}
      size="sm"
      onClick={onClick}
      className="gap-1"
    >
      {label}
      {active && (
        <ArrowUpDown className={`h-3 w-3 ${direction === 'asc' ? 'rotate-180' : ''}`} />
      )}
    </Button>
  );
}
