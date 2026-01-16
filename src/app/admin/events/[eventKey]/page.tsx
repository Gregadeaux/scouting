'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Target,
  Users,
  Zap,
  Shield,
  ChevronRight,
  FileText,
  Download,
  RefreshCw,
  Activity,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamStatistics } from '@/types';

// Stat card with animated gradient border
function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  color = 'cyan',
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose';
}) {
  const colorClasses = {
    cyan: 'from-cyan-500 to-blue-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-600',
    rose: 'from-rose-500 to-pink-600',
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50 p-5 transition-all duration-300 hover:border-slate-600 hover:bg-slate-800/50">
      {/* Gradient accent */}
      <div className={cn(
        "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity",
        colorClasses[color]
      )} />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subValue && (
            <p className="text-xs text-slate-400">{subValue}</p>
          )}
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br",
          colorClasses[color],
          "shadow-lg shadow-black/20"
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <TrendingUp className={cn(
            "h-3.5 w-3.5",
            trend === 'up' ? "text-emerald-400" : trend === 'down' ? "text-rose-400 rotate-180" : "text-slate-400"
          )} />
          <span className={cn(
            "text-xs font-medium",
            trend === 'up' ? "text-emerald-400" : trend === 'down' ? "text-rose-400" : "text-slate-400"
          )}>
            {trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Stable'}
          </span>
        </div>
      )}
    </div>
  );
}

// Team ranking row with performance bars
function TeamRankingRow({
  rank,
  team,
  eventKey,
}: {
  rank: number;
  team: TeamStatistics;
  eventKey: string;
}) {
  const maxOpr = 80; // Normalized max for visualization
  const oprPercentage = Math.min((team.opr || 0) / maxOpr * 100, 100);

  const getRankBadgeColor = (r: number) => {
    if (r === 1) return 'from-amber-400 to-yellow-500 text-black';
    if (r === 2) return 'from-slate-300 to-slate-400 text-black';
    if (r === 3) return 'from-amber-600 to-amber-700 text-white';
    return 'bg-slate-800 text-slate-400';
  };

  return (
    <Link
      href={`/admin/events/${eventKey}/teams/${team.team_number}`}
      className="group flex w-full items-center gap-4 rounded-lg border border-transparent bg-slate-800/30 px-4 py-3 text-left transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/60"
    >
      {/* Rank badge */}
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
        rank <= 3 ? `bg-gradient-to-br ${getRankBadgeColor(rank)}` : "bg-slate-800 text-slate-500"
      )}>
        {rank}
      </div>

      {/* Team info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{team.team_number}</span>
          {rank <= 3 && (
            <Award className={cn(
              "h-4 w-4",
              rank === 1 ? "text-amber-400" : rank === 2 ? "text-slate-400" : "text-amber-600"
            )} />
          )}
        </div>

        {/* OPR bar */}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${oprPercentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-right">
        <div>
          <p className="text-sm font-semibold text-cyan-400">
            {team.opr?.toFixed(1) || '—'}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">OPR</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-300">
            {team.avg_auto_score?.toFixed(1) || '—'}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Auto</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-300">
            {team.avg_teleop_score?.toFixed(1) || '—'}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Teleop</p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-400" />
      </div>
    </Link>
  );
}

// Category breakdown card
function CategoryCard({
  title,
  teams,
  metric,
  color,
}: {
  title: string;
  teams: Array<{ team_number: number; value: number }>;
  metric: string;
  color: 'emerald' | 'blue' | 'violet';
}) {
  const colorClasses = {
    emerald: 'border-emerald-500/30 from-emerald-500/10',
    blue: 'border-blue-500/30 from-blue-500/10',
    violet: 'border-violet-500/30 from-violet-500/10',
  };

  const textColors = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    violet: 'text-violet-400',
  };

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-b to-transparent p-5",
      colorClasses[color]
    )}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="space-y-3">
        {teams.map((team, i) => (
          <div key={team.team_number} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">{i + 1}.</span>
              <span className="font-medium text-white">{team.team_number}</span>
            </div>
            <span className={cn("font-mono text-sm font-semibold", textColors[color])}>
              {team.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-600">
        {metric}
      </p>
    </div>
  );
}

export default function EventAnalyticsPage() {
  const params = useParams();
  const eventKey = params.eventKey as string;

  const [teamStats, setTeamStats] = useState<TeamStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsResponse, eventResponse] = await Promise.all([
        fetch(`/api/analytics/event/${eventKey}`),
        fetch(`/api/admin/events/${eventKey}`),
      ]);

      const [statsData, eventData] = await Promise.all([
        statsResponse.json(),
        eventResponse.json(),
      ]);

      if (statsData.success && statsData.data) {
        setTeamStats(statsData.data);
      } else {
        setError(statsData.error || 'Failed to load analytics');
      }

      if (eventData.success && eventData.data) {
        setEventName(eventData.data.event_name || eventKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [eventKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate aggregate stats
  const topTeams = [...teamStats].sort((a, b) => (b.opr || 0) - (a.opr || 0)).slice(0, 10);
  const avgOpr = teamStats.length > 0
    ? teamStats.reduce((sum, t) => sum + (t.opr || 0), 0) / teamStats.length
    : 0;
  const avgAuto = teamStats.length > 0
    ? teamStats.reduce((sum, t) => sum + (t.avg_auto_score || 0), 0) / teamStats.length
    : 0;
  const avgTeleop = teamStats.length > 0
    ? teamStats.reduce((sum, t) => sum + (t.avg_teleop_score || 0), 0) / teamStats.length
    : 0;
  const totalMatches = teamStats.reduce((sum, t) => sum + (t.matches_scouted || 0), 0);

  // Category leaders
  const autoLeaders = [...teamStats]
    .sort((a, b) => (b.avg_auto_score || 0) - (a.avg_auto_score || 0))
    .slice(0, 5)
    .map(t => ({ team_number: t.team_number, value: t.avg_auto_score || 0 }));

  const teleopLeaders = [...teamStats]
    .sort((a, b) => (b.avg_teleop_score || 0) - (a.avg_teleop_score || 0))
    .slice(0, 5)
    .map(t => ({ team_number: t.team_number, value: t.avg_teleop_score || 0 }));

  const endgameLeaders = [...teamStats]
    .sort((a, b) => (b.avg_endgame_score || 0) - (a.avg_endgame_score || 0))
    .slice(0, 5)
    .map(t => ({ team_number: t.team_number, value: t.avg_endgame_score || 0 }));

  const handleExportCSV = () => {
    if (!teamStats.length) return;

    const headers = [
      'Team',
      'OPR',
      'DPR',
      'CCWM',
      'Avg Auto',
      'Avg Teleop',
      'Avg Endgame',
      'Reliability',
      'Matches'
    ];

    const rows = teamStats
      .sort((a, b) => (b.opr || 0) - (a.opr || 0))
      .map(stat => [
        stat.team_number,
        stat.opr?.toFixed(2) || '',
        stat.dpr?.toFixed(2) || '',
        stat.ccwm?.toFixed(2) || '',
        stat.avg_auto_score?.toFixed(1) || '',
        stat.avg_teleop_score?.toFixed(1) || '',
        stat.avg_endgame_score?.toFixed(1) || '',
        stat.reliability_score?.toFixed(1) || '',
        stat.matches_scouted || 0
      ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${eventKey}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
              <Activity className="h-6 w-6 animate-pulse text-cyan-400" />
            </div>
          </div>
          <p className="text-sm text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (teamStats.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Event Analytics</h1>
            <p className="text-sm text-slate-400">{eventName || eventKey}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 py-16 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-4 text-slate-400">No analytics data available yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Match scouting data is needed to generate analytics
          </p>
          <Link
            href={`/admin/events/${eventKey}/scouting`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 hover:bg-cyan-500/20"
          >
            View Scouting Data
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Event Analytics</h1>
            <p className="text-sm text-slate-400">{eventName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/analytics/${eventKey}/report`}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40"
          >
            <FileText className="h-4 w-4" />
            Generate Report
          </Link>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Teams Analyzed"
          value={teamStats.length}
          subValue={`${totalMatches} total entries`}
          icon={Users}
          color="cyan"
        />
        <StatCard
          label="Average OPR"
          value={avgOpr.toFixed(1)}
          subValue="Event average"
          icon={Target}
          trend="neutral"
          color="emerald"
        />
        <StatCard
          label="Avg Auto Score"
          value={avgAuto.toFixed(1)}
          subValue="Points per match"
          icon={Zap}
          color="amber"
        />
        <StatCard
          label="Avg Teleop Score"
          value={avgTeleop.toFixed(1)}
          subValue="Points per match"
          icon={Activity}
          color="violet"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* OPR Leaderboard - Takes 2 columns */}
        <div className="lg:col-span-2 rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">OPR Rankings</h2>
                <p className="text-xs text-slate-500">Top performing teams</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
              Top 10
            </span>
          </div>

          <div className="space-y-2">
            {topTeams.map((team, i) => (
              <TeamRankingRow
                key={team.team_number}
                rank={i + 1}
                team={team}
                eventKey={eventKey}
              />
            ))}
          </div>
        </div>

        {/* Category Leaders - Right column */}
        <div className="space-y-4">
          <CategoryCard
            title="Auto Leaders"
            teams={autoLeaders}
            metric="Avg Auto Points"
            color="emerald"
          />
          <CategoryCard
            title="Teleop Leaders"
            teams={teleopLeaders}
            metric="Avg Teleop Points"
            color="blue"
          />
          <CategoryCard
            title="Endgame Leaders"
            teams={endgameLeaders}
            metric="Avg Endgame Points"
            color="violet"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-slate-700/50 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Deep Dive
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href={`/analytics/${eventKey}/report`}
            className="group flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 transition-all hover:border-violet-500/30 hover:bg-violet-500/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 transition-colors group-hover:bg-violet-500/20">
              <FileText className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="font-medium text-white">Full Report</p>
              <p className="text-xs text-slate-500">Printable PDF with charts</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-slate-600 group-hover:text-violet-400" />
          </Link>

          <Link
            href={`/admin/events/${eventKey}/scouting`}
            className="group flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 transition-colors group-hover:bg-cyan-500/20">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="font-medium text-white">Scouting Data</p>
              <p className="text-xs text-slate-500">Raw match entries</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-slate-600 group-hover:text-cyan-400" />
          </Link>

          <Link
            href={`/admin/events/${eventKey}/picklist`}
            className="group flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 transition-all hover:border-amber-500/30 hover:bg-amber-500/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 transition-colors group-hover:bg-amber-500/20">
              <Award className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-white">Pick List</p>
              <p className="text-xs text-slate-500">Alliance selection</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-slate-600 group-hover:text-amber-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
