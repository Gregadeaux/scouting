'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchWithScouting {
  match_key: string;
  comp_level: string;
  match_number: number;
  set_number?: number | null;
  scheduled_time?: string | null;
  actual_time?: string | null;
  red_1?: number;
  red_2?: number;
  red_3?: number;
  blue_1?: number;
  blue_2?: number;
  blue_3?: number;
  red_score?: number | null;
  blue_score?: number | null;
  scouting_status: {
    red_1: boolean;
    red_2: boolean;
    red_3: boolean;
    blue_1: boolean;
    blue_2: boolean;
    blue_3: boolean;
  };
  scout_count: number;
}

// Helper to get alliance teams as array
function getAllianceTeams(match: MatchWithScouting, alliance: 'red' | 'blue'): number[] {
  if (alliance === 'red') {
    return [match.red_1, match.red_2, match.red_3].filter((t): t is number => t !== undefined && t !== null);
  }
  return [match.blue_1, match.blue_2, match.blue_3].filter((t): t is number => t !== undefined && t !== null);
}

// Helper to calculate scouting coverage
function getScoutingCoverage(match: MatchWithScouting): { scouted: number; total: number; percentage: number } {
  const status = match.scouting_status;
  const total = 6;
  const scouted = [status.red_1, status.red_2, status.red_3, status.blue_1, status.blue_2, status.blue_3].filter(Boolean).length;
  return { scouted, total, percentage: (scouted / total) * 100 };
}

function getCompLevelDisplay(compLevel: string): string {
  const levels: Record<string, string> = {
    qm: 'Qualification',
    ef: 'Eighth-Final',
    qf: 'Quarterfinal',
    sf: 'Semifinal',
    f: 'Final',
  };
  return levels[compLevel] || compLevel.toUpperCase();
}

function MatchCard({ match, eventKey }: { match: MatchWithScouting; eventKey: string }) {
  const coverage = getScoutingCoverage(match);
  const isScouted = coverage.percentage >= 100;
  const isPartial = coverage.percentage > 0 && coverage.percentage < 100;
  const redTeams = getAllianceTeams(match, 'red');
  const blueTeams = getAllianceTeams(match, 'blue');

  return (
    <Link
      href={`/admin/events/${eventKey}/matches/${match.match_key}`}
      className={cn(
        "block rounded-xl border bg-slate-900 p-4 transition-all duration-200",
        "hover:border-slate-600 hover:bg-slate-800/50",
        isScouted ? "border-emerald-500/30" : isPartial ? "border-amber-500/30" : "border-slate-700"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            isScouted ? "bg-emerald-500/10" : isPartial ? "bg-amber-500/10" : "bg-slate-800"
          )}>
            {isScouted ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : isPartial ? (
              <Clock className="h-5 w-5 text-amber-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-slate-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">
                {getCompLevelDisplay(match.comp_level)} {match.match_number}
              </span>
              {match.set_number && (
                <span className="text-xs text-slate-500">Set {match.set_number}</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-slate-400">{redTeams.join(', ')}</span>
                {match.red_score != null && (
                  <span className="ml-1 font-mono text-red-400">{match.red_score}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-slate-400">{blueTeams.join(', ')}</span>
                {match.blue_score != null && (
                  <span className="ml-1 font-mono text-blue-400">{match.blue_score}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={cn(
              "text-sm font-medium",
              isScouted ? "text-emerald-400" : isPartial ? "text-amber-400" : "text-slate-500"
            )}>
              {coverage.scouted}/{coverage.total}
            </div>
            <div className="text-xs text-slate-500">scouted</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </div>
      </div>
    </Link>
  );
}

export default function EventMatchesPage() {
  const params = useParams();
  const eventKey = params.eventKey as string;

  const [matches, setMatches] = useState<MatchWithScouting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchMatches() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/events/${eventKey}/matches`);
        if (!response.ok) throw new Error('Failed to fetch matches');
        const data = await response.json();
        setMatches(data.data?.matches || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load matches');
      } finally {
        setIsLoading(false);
      }
    }
    fetchMatches();
  }, [eventKey]);

  // Filter matches
  const filteredMatches = matches.filter(match => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const redTeams = getAllianceTeams(match, 'red');
    const blueTeams = getAllianceTeams(match, 'blue');
    return (
      match.match_key.toLowerCase().includes(query) ||
      redTeams.some(t => t.toString().includes(query)) ||
      blueTeams.some(t => t.toString().includes(query))
    );
  });

  // Group by comp level
  const matchesByLevel = filteredMatches.reduce((acc, match) => {
    const level = match.comp_level;
    if (!acc[level]) acc[level] = [];
    acc[level].push(match);
    return acc;
  }, {} as Record<string, MatchWithScouting[]>);

  const levelOrder = ['qm', 'ef', 'qf', 'sf', 'f'];
  const sortedLevels = Object.keys(matchesByLevel).sort(
    (a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b)
  );

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
          <div className="h-24 rounded-xl bg-slate-800" />
          <div className="h-24 rounded-xl bg-slate-800" />
          <div className="h-24 rounded-xl bg-slate-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href={`/admin/events/${eventKey}`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Event
        </Link>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">{error}</p>
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
            <Trophy className="h-6 w-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">Event Matches</h1>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-400">
              {matches.length} matches
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by match or team number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* Matches by Level */}
      <div className="space-y-8">
        {sortedLevels.map((level) => (
          <div key={level}>
            <h2 className="mb-4 text-lg font-semibold text-slate-300">
              {getCompLevelDisplay(level)} Matches
            </h2>
            <div className="grid gap-3">
              {matchesByLevel[level]
                .sort((a, b) => a.match_number - b.match_number)
                .map((match) => (
                  <MatchCard key={match.match_key} match={match} eventKey={eventKey} />
                ))}
            </div>
          </div>
        ))}
      </div>

      {filteredMatches.length === 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 py-12 text-center">
          <Trophy className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-2 text-slate-500">
            {searchQuery ? 'No matches found matching your search' : 'No matches for this event'}
          </p>
        </div>
      )}
    </div>
  );
}
