'use client';

import React from 'react';
import Link from 'next/link';
import type { TeamMatchTBA } from '@/hooks/useTeamTBAData';
import { formatMatchLabel, sortMatchesBySchedule } from '@/lib/utils/match-format';

interface TBAMatchHistoryTableProps {
  matches: TeamMatchTBA[];
  eventKey: string;
  teamNumber: number;
  isLoading?: boolean;
}

function ResultBadge({ result }: { result: 'W' | 'L' | 'T' | null }) {
  if (!result) return <span className="text-slate-500">-</span>;

  const styles = {
    W: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    L: 'bg-red-500/20 text-red-400 border-red-500/30',
    T: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${styles[result]}`}>
      {result}
    </span>
  );
}

function TowerBadge({ level }: { level: string | null }) {
  if (!level || level === 'None') return <span className="text-slate-600">-</span>;

  const colorMap: Record<string, string> = {
    Level1: 'text-slate-400',
    Level2: 'text-cyan-400',
    Level3: 'text-amber-400',
  };

  const labelMap: Record<string, string> = {
    Level1: 'L1',
    Level2: 'L2',
    Level3: 'L3',
  };

  return (
    <span className={`text-xs font-medium ${colorMap[level] || 'text-slate-300'}`}>
      {labelMap[level] || level}
    </span>
  );
}

export function TBAMatchHistoryTable({
  matches,
  eventKey,
  teamNumber,
  isLoading = false,
}: TBAMatchHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 rounded bg-slate-800" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  const sortedMatches = sortMatchesBySchedule(matches);

  const wins = matches.filter((m) => m.result === 'W').length;
  const losses = matches.filter((m) => m.result === 'L').length;
  const ties = matches.filter((m) => m.result === 'T').length;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h3 className="text-lg font-semibold text-white">Match History</h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">{matches.length} matches</span>
          {(wins > 0 || losses > 0 || ties > 0) && (
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
              <span className="text-emerald-400">{wins}W</span>
              {' - '}
              <span className="text-red-400">{losses}L</span>
              {ties > 0 && (
                <>
                  {' - '}
                  <span className="text-amber-400">{ties}T</span>
                </>
              )}
            </span>
          )}
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/30">
            TBA Data
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                Match
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
                Alliance
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                Partners
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
                Score
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
                Result
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
                Auto Tower
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
                Endgame
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedMatches.map((match) => (
              <tr
                key={match.matchKey}
                className="transition-colors hover:bg-slate-800/50"
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    href={`/admin/events/${eventKey}/matches/${match.matchKey}`}
                    className="text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    {formatMatchLabel(match.compLevel, match.matchNumber, match.setNumber)}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                      match.alliance === 'red'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {match.alliance.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {match.partners.map((p) => (
                      <Link
                        key={p}
                        href={`/admin/events/${eventKey}/teams/${p}`}
                        className="text-sm text-slate-300 hover:text-white"
                      >
                        {p}
                      </Link>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <span className="font-mono text-sm font-bold text-white">
                    {match.allianceScore ?? '-'}
                  </span>
                  <span className="mx-1 text-slate-600">-</span>
                  <span className="font-mono text-sm text-slate-400">
                    {match.opponentScore ?? '-'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <ResultBadge result={match.result} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <TowerBadge level={match.autoTowerLevel} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  <TowerBadge level={match.endgameTowerLevel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
