'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Trophy,
  Users,
  Target,
  Zap,
  Shield,
  Activity,
  Printer,
  Download,
  RefreshCw,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamRadarProfile } from '@/components/analytics/TeamRadarProfile';
import { GamePieceBoxplotFull } from '@/components/analytics/GamePieceBoxplotFull';
import type { TeamStatistics } from '@/types';

interface Match {
  match_key: string;
  match_number: number;
  comp_level: string;
  set_number?: number | null;
  event_key: string;
  red_1: number;
  red_2: number;
  red_3: number;
  blue_1: number;
  blue_2: number;
  blue_3: number;
  red_score?: number | null;
  blue_score?: number | null;
  scheduled_time?: string | null;
  actual_time?: string | null;
}

interface ScoutingEntry {
  id: string;
  team_number: number;
  alliance: string;
  alliance_position: number;
  scouter_name?: string;
  created_at: string;
}

// Alliance team card with stats
function AllianceTeamCard({
  teamNumber,
  alliance,
  position,
  stats,
  scouted,
  eventKey,
}: {
  teamNumber: number;
  alliance: 'red' | 'blue';
  position: number;
  stats?: TeamStatistics;
  scouted: boolean;
  eventKey: string;
}) {
  const allianceColors = {
    red: {
      bg: 'from-red-500/10 to-red-600/5',
      border: 'border-red-500/30',
      text: 'text-red-400',
      accent: 'bg-red-500',
    },
    blue: {
      bg: 'from-blue-500/10 to-blue-600/5',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      accent: 'bg-blue-500',
    },
  };

  const colors = allianceColors[alliance];

  return (
    <Link
      href={`/admin/events/${eventKey}/teams/${teamNumber}`}
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-lg",
        colors.border,
        `bg-gradient-to-br ${colors.bg}`
      )}
    >
      {/* Position badge */}
      <div className={cn(
        "absolute -right-3 -top-3 h-12 w-12 rotate-12",
        colors.accent,
        "opacity-10"
      )} />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium uppercase tracking-wider", colors.text)}>
              {alliance} {position}
            </span>
            {scouted ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
            )}
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{teamNumber}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-slate-400" />
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold text-cyan-400">
              {stats.opr?.toFixed(1) || '—'}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">OPR</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-300">
              {stats.avg_auto_score?.toFixed(1) || '—'}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Auto</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-300">
              {stats.avg_teleop_score?.toFixed(1) || '—'}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Teleop</p>
          </div>
        </div>
      )}
    </Link>
  );
}

// Alliance summary card
function AllianceSummaryCard({
  alliance,
  teams,
  stats,
  score,
}: {
  alliance: 'red' | 'blue';
  teams: number[];
  stats: TeamStatistics[];
  score?: number | null;
}) {
  const allianceStats = stats.filter(s => teams.includes(s.team_number));
  const predictedScore = allianceStats.reduce((sum, s) => sum + (s.opr || 0), 0);
  const avgReliability = allianceStats.length > 0
    ? allianceStats.reduce((sum, s) => sum + (s.reliability_score || 0), 0) / allianceStats.length
    : 0;

  const colors = alliance === 'red'
    ? { border: 'border-red-500/50', bg: 'from-red-500/20', text: 'text-red-400', glow: 'shadow-red-500/20' }
    : { border: 'border-blue-500/50', bg: 'from-blue-500/20', text: 'text-blue-400', glow: 'shadow-blue-500/20' };

  return (
    <div className={cn(
      "rounded-xl border p-5",
      colors.border,
      `bg-gradient-to-br ${colors.bg} to-transparent`
    )}>
      <div className="flex items-center justify-between">
        <h3 className={cn("text-lg font-bold uppercase tracking-wider", colors.text)}>
          {alliance} Alliance
        </h3>
        {score != null && (
          <div className={cn(
            "rounded-lg px-4 py-2 text-2xl font-bold",
            alliance === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
          )}>
            {score}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Predicted Score</p>
          <p className="text-xl font-bold text-white">{predictedScore.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Avg Reliability</p>
          <p className="text-xl font-bold text-white">{avgReliability.toFixed(0)}%</p>
        </div>
      </div>
    </div>
  );
}

// Team comparison table
function TeamComparisonTable({
  redTeams,
  blueTeams,
  stats,
}: {
  redTeams: number[];
  blueTeams: number[];
  stats: TeamStatistics[];
}) {
  const getStats = (teamNumber: number) => stats.find(s => s.team_number === teamNumber);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Alliance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Team</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">OPR</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">CCWM</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Auto</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Teleop</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Endgame</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Reliability</th>
            </tr>
          </thead>
          <tbody>
            {redTeams.map((teamNumber, i) => {
              const teamStats = getStats(teamNumber);
              return (
                <tr key={teamNumber} className="border-b border-slate-700/30 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                  <td className="px-4 py-3 text-red-400 font-semibold">Red {i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-white">{teamNumber}</td>
                  <td className="px-4 py-3 text-right font-mono text-cyan-400">{teamStats?.opr?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{teamStats?.ccwm?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{teamStats?.avg_auto_score?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{teamStats?.avg_teleop_score?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{teamStats?.avg_endgame_score?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{teamStats?.reliability_score?.toFixed(0) || '—'}%</td>
                </tr>
              );
            })}
            {blueTeams.map((teamNumber, i) => {
              const teamStats = getStats(teamNumber);
              return (
                <tr key={teamNumber} className="border-b border-slate-700/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                  <td className="px-4 py-3 text-blue-400 font-semibold">Blue {i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-white">{teamNumber}</td>
                  <td className="px-4 py-3 text-right font-mono text-cyan-400">{teamStats?.opr?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{teamStats?.ccwm?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{teamStats?.avg_auto_score?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{teamStats?.avg_teleop_score?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{teamStats?.avg_endgame_score?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{teamStats?.reliability_score?.toFixed(0) || '—'}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
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

export default function AdminEventMatchPage() {
  const params = useParams();
  const eventKey = params.eventKey as string;
  const matchKey = params.matchKey as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [allTeamStats, setAllTeamStats] = useState<TeamStatistics[]>([]);
  const [matchTeamStats, setMatchTeamStats] = useState<TeamStatistics[]>([]);
  const [scoutingEntries, setScoutingEntries] = useState<ScoutingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [matchResponse, statsResponse, scoutingResponse] = await Promise.all([
        fetch(`/api/analytics/match/${matchKey}`),
        fetch(`/api/analytics/event/${eventKey}`),
        fetch(`/api/admin/scouting?match_key=${matchKey}&limit=100`),
      ]);

      const [matchData, statsData, scoutingData] = await Promise.all([
        matchResponse.json(),
        statsResponse.json(),
        scoutingResponse.json(),
      ]);

      if (matchData.success && matchData.data) {
        setMatch(matchData.data);
      } else {
        setError(matchData.error || 'Failed to load match details');
      }

      if (statsData.success && statsData.data) {
        setAllTeamStats(statsData.data);
      }

      if (scoutingData.success && scoutingData.data) {
        setScoutingEntries(scoutingData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load match data');
    } finally {
      setIsLoading(false);
    }
  }, [eventKey, matchKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter team stats for match teams
  useEffect(() => {
    if (match && allTeamStats.length > 0) {
      const teamNumbers = [
        match.red_1,
        match.red_2,
        match.red_3,
        match.blue_1,
        match.blue_2,
        match.blue_3,
      ];
      const filtered = allTeamStats.filter(stat => teamNumbers.includes(stat.team_number));
      setMatchTeamStats(filtered);
    }
  }, [match, allTeamStats]);

  const handlePrint = () => {
    window.print();
  };

  // Check which teams have scouting data
  const getScoutedTeams = () => {
    const scouted = new Set(scoutingEntries.map(e => e.team_number));
    return scouted;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/events/${eventKey}/matches`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Matches
          </Link>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="relative mx-auto mb-4 h-12 w-12">
              <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                <Activity className="h-6 w-6 animate-pulse text-cyan-400" />
              </div>
            </div>
            <p className="text-sm text-slate-400">Loading match data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="space-y-6">
        <Link
          href={`/admin/events/${eventKey}/matches`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Matches
        </Link>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-red-400">{error || 'Match not found'}</p>
          <button
            onClick={fetchData}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const redTeams = [match.red_1, match.red_2, match.red_3];
  const blueTeams = [match.blue_1, match.blue_2, match.blue_3];
  const scoutedTeams = getScoutedTeams();

  // Create color map for alliance teams
  const teamColors: Record<number, string> = {};
  redTeams.forEach(teamNumber => {
    teamColors[teamNumber] = '#ef4444'; // red-500
  });
  blueTeams.forEach(teamNumber => {
    teamColors[teamNumber] = '#3b82f6'; // blue-500
  });

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          nav, header, .no-print {
            display: none !important;
          }

          @page {
            size: letter landscape;
            margin: 0.5in;
          }

          body {
            font-size: 10pt;
            line-height: 1.3;
          }

          .page-break {
            page-break-after: always;
            break-after: always;
          }

          .print-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 1.5rem;
          }

          svg, svg * {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/events/${eventKey}/matches`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Matches
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {getCompLevelDisplay(match.comp_level)} {match.match_number}
                  {match.set_number && <span className="text-slate-400 ml-2">Set {match.set_number}</span>}
                </h1>
                <p className="text-sm text-slate-400">{matchKey}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/analytics/${eventKey}/match/${matchKey}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Download className="h-4 w-4" />
              Printable Report
            </Link>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* Match Info & Time */}
        {(match.scheduled_time || match.actual_time || match.red_score != null) && (
          <div className="flex flex-wrap gap-4 text-sm no-print">
            {match.scheduled_time && (
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="h-4 w-4" />
                <span>Scheduled: {new Date(match.scheduled_time).toLocaleString()}</span>
              </div>
            )}
            {match.actual_time && (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Played: {new Date(match.actual_time).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Alliance Cards */}
        <div className="grid gap-6 lg:grid-cols-2 print-section">
          {/* Red Alliance */}
          <div className="space-y-4">
            <AllianceSummaryCard
              alliance="red"
              teams={redTeams}
              stats={matchTeamStats}
              score={match.red_score}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {redTeams.map((teamNumber, i) => (
                <AllianceTeamCard
                  key={teamNumber}
                  teamNumber={teamNumber}
                  alliance="red"
                  position={i + 1}
                  stats={matchTeamStats.find(s => s.team_number === teamNumber)}
                  scouted={scoutedTeams.has(teamNumber)}
                  eventKey={eventKey}
                />
              ))}
            </div>
          </div>

          {/* Blue Alliance */}
          <div className="space-y-4">
            <AllianceSummaryCard
              alliance="blue"
              teams={blueTeams}
              stats={matchTeamStats}
              score={match.blue_score}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {blueTeams.map((teamNumber, i) => (
                <AllianceTeamCard
                  key={teamNumber}
                  teamNumber={teamNumber}
                  alliance="blue"
                  position={i + 1}
                  stats={matchTeamStats.find(s => s.team_number === teamNumber)}
                  scouted={scoutedTeams.has(teamNumber)}
                  eventKey={eventKey}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Team Comparison Table */}
        <div className="print-section">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Team Comparison</h2>
          </div>
          <TeamComparisonTable
            redTeams={redTeams}
            blueTeams={blueTeams}
            stats={matchTeamStats}
          />
        </div>

        {/* Radar Profiles */}
        {matchTeamStats.length > 0 && (
          <div className="print-section">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <Target className="h-4 w-4 text-violet-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Performance Profiles</h2>
            </div>
            <TeamRadarProfile
              eventKey={eventKey}
              teams={matchTeamStats}
              sortBy="opr"
              topTeamsCount={6}
              teamColors={teamColors}
            />
          </div>
        )}

        {/* Page break for print */}
        <div className="page-break" />

        {/* Game Piece Distribution */}
        <div className="print-section">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Zap className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Game Piece Distribution</h2>
          </div>
          <GamePieceBoxplotFull
            eventKey={eventKey}
            teamNumbers={[...redTeams, ...blueTeams]}
            teamColors={teamColors}
          />
        </div>

        {/* Scouting Entries Quick View */}
        {scoutingEntries.length > 0 && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6 no-print">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                  <Shield className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Scouting Entries</h2>
                  <p className="text-xs text-slate-500">{scoutingEntries.length} entries for this match</p>
                </div>
              </div>
              <Link
                href={`/admin/events/${eventKey}/scouting?match_key=${matchKey}`}
                className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {scoutingEntries.slice(0, 6).map(entry => (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    entry.alliance === 'red'
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-blue-500/30 bg-blue-500/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{entry.team_number}</span>
                    <span className={cn(
                      "text-xs",
                      entry.alliance === 'red' ? "text-red-400" : "text-blue-400"
                    )}>
                      {entry.alliance} {entry.alliance_position}
                    </span>
                  </div>
                  {entry.scouter_name && (
                    <p className="mt-1 text-xs text-slate-500">by {entry.scouter_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-700/50 text-xs text-slate-500 print-section">
          <p>Generated by FRC Scouting System</p>
          <p className="mt-1">Match: {matchKey} | Event: {eventKey}</p>
        </div>
      </div>
    </>
  );
}
