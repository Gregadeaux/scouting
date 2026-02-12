'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList,
  ArrowLeft,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  User,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoutingEntry {
  id: string;
  match_key: string;
  team_number: number;
  scout_name: string;
  created_at: string;
  data_quality: string;
  preview_metrics: {
    auto_points: number;
    teleop_points: number;
    endgame_points: number;
    total_points: number;
  };
}

export default function EventScoutingPage() {
  const params = useParams();
  const eventKey = params.eventKey as string;

  const [entries, setEntries] = useState<ScoutingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchEntries() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/scouting?eventKey=${eventKey}&limit=200`);
        if (!response.ok) throw new Error('Failed to fetch scouting data');
        const data = await response.json();
        setEntries(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scouting data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchEntries();
  }, [eventKey]);

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.match_key.toLowerCase().includes(query) ||
      entry.team_number.toString().includes(query) ||
      entry.scout_name.toLowerCase().includes(query)
    );
  });

  // Stats
  const totalEntries = entries.length;
  const completeEntries = entries.filter(e => e.data_quality === 'complete').length;
  const uniqueScouts = new Set(entries.map(e => e.scout_name)).size;
  const uniqueTeams = new Set(entries.map(e => e.team_number)).size;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/events/${eventKey}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Link>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-800" />
          <div className="grid gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-xl bg-slate-800" />
            ))}
          </div>
          <div className="h-96 rounded-xl bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/events/${eventKey}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Link>
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Scouting Data</h1>
          </div>
        </div>
        <a
          href={`/api/admin/scouting/export?eventKey=${eventKey}`}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-2">
              <ClipboardList className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalEntries}</p>
              <p className="text-xs text-slate-500">Total Entries</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{completeEntries}</p>
              <p className="text-xs text-slate-500">Complete</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <User className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{uniqueScouts}</p>
              <p className="text-xs text-slate-500">Scouts</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Trophy className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{uniqueTeams}</p>
              <p className="text-xs text-slate-500">Teams Scouted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by match, team, or scout..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Match
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Scout
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Auto
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Teleop
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-rose-400">
                  Endgame
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Quality
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    {entry.match_key.replace(`${eventKey}_`, '')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/events/${eventKey}/teams/${entry.team_number}`}
                      className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
                    >
                      {entry.team_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{entry.scout_name}</td>
                  <td className="px-4 py-3 text-center font-mono text-sm text-cyan-400">
                    {entry.preview_metrics.auto_points}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-sm text-amber-400">
                    {entry.preview_metrics.teleop_points}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-sm text-rose-400">
                    {entry.preview_metrics.endgame_points}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-sm font-semibold text-white">
                    {entry.preview_metrics.total_points}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.data_quality === 'complete' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        Partial
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEntries.length === 0 && (
          <div className="py-12 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-2 text-slate-500">
              {searchQuery ? 'No entries found matching your search' : 'No scouting data for this event'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
