'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, Zap, Target, Award, Shield } from 'lucide-react';
import type { TeamScoutingAggregates } from '@/types/admin';
import type { Team } from '@/types';

interface TeamPerformanceHeroProps {
  team: Team;
  aggregates: TeamScoutingAggregates | null;
  isLoading?: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  color: 'cyan' | 'amber' | 'rose' | 'emerald' | 'slate';
  icon: React.ElementType;
}

function StatCard({ label, value, subValue, trend, color, icon: Icon }: StatCardProps) {
  const colorClasses = {
    cyan: {
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      text: 'text-cyan-400',
      accent: 'bg-cyan-500',
    },
    amber: {
      bg: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-400',
      accent: 'bg-amber-500',
    },
    rose: {
      bg: 'bg-rose-500/10 border-rose-500/30',
      text: 'text-rose-400',
      accent: 'bg-rose-500',
    },
    emerald: {
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      text: 'text-emerald-400',
      accent: 'bg-emerald-500',
    },
    slate: {
      bg: 'bg-slate-500/10 border-slate-500/30',
      text: 'text-slate-300',
      accent: 'bg-slate-500',
    },
  };

  const colors = colorClasses[color];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={`relative overflow-hidden rounded-xl border ${colors.bg} p-4`}>
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 h-full w-1 ${colors.accent}`} />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className={`text-3xl font-bold tabular-nums ${colors.text}`}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-slate-500">{subValue}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Icon className={`h-5 w-5 ${colors.text} opacity-60`} />
          {trend && (
            <TrendIcon
              className={`h-4 w-4 ${
                trend === 'up'
                  ? 'text-emerald-400'
                  : trend === 'down'
                  ? 'text-red-400'
                  : 'text-slate-500'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function TeamPerformanceHero({
  team,
  aggregates,
  isLoading = false,
}: TeamPerformanceHeroProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl bg-slate-900 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-12 w-48 rounded bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasData = aggregates && aggregates.total_matches > 0;
  const is2026 = aggregates?.season === 2026;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 shadow-xl">
      {/* Team Identity */}
      <div className="mb-6 flex items-end justify-between border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-5xl font-black tracking-tighter text-white">
              {team.team_number}
            </span>
            {hasData && (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                {aggregates.total_matches} MATCHES SCOUTED
              </span>
            )}
          </div>
          <h1 className="mt-1 text-xl font-medium text-slate-300">
            {team.team_nickname || team.team_name || 'Unknown Team'}
          </h1>
          {team.city && team.state_province && (
            <p className="text-sm text-slate-500">
              {team.city}, {team.state_province}
            </p>
          )}
        </div>
        <div className="text-right">
          {hasData && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {is2026 ? 'Avg Climb Pts' : 'Avg Total'}
              </p>
              <p className="font-mono text-4xl font-bold text-white">
                {is2026
                  ? (aggregates.avg_climb_points ?? aggregates.avg_total_points).toFixed(1)
                  : aggregates.avg_total_points.toFixed(1)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {hasData ? (
        is2026 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Climb Points"
              value={(aggregates.avg_climb_points ?? 0).toFixed(1)}
              subValue={`Auto: ${((aggregates.auto_climb_rate ?? 0)).toFixed(0)}% | Endgame: ${((aggregates.endgame_climb_rate ?? 0)).toFixed(0)}%`}
              color="cyan"
              icon={Zap}
            />
            <StatCard
              label="Scoring Rating"
              value={(aggregates.avg_scoring_rating ?? 0).toFixed(1)}
              subValue="1-5 scale"
              color="amber"
              icon={Target}
            />
            <StatCard
              label="Reliability"
              value={(aggregates.avg_reliability_rating ?? 0).toFixed(1)}
              subValue={`${((aggregates.disabled_rate ?? 0)).toFixed(0)}% disabled`}
              color="rose"
              icon={Shield}
            />
            <StatCard
              label="Data Quality"
              value={`${aggregates.complete_entries}/${aggregates.total_matches}`}
              subValue="Complete entries"
              color="emerald"
              icon={Activity}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Auto Score"
              value={aggregates.avg_auto_points.toFixed(1)}
              subValue={`${((aggregates.avg_auto_points / aggregates.avg_total_points) * 100).toFixed(0)}% of total`}
              color="cyan"
              icon={Zap}
            />
            <StatCard
              label="Teleop Score"
              value={aggregates.avg_teleop_points.toFixed(1)}
              subValue={`${((aggregates.avg_teleop_points / aggregates.avg_total_points) * 100).toFixed(0)}% of total`}
              color="amber"
              icon={Target}
            />
            <StatCard
              label="Endgame Score"
              value={aggregates.avg_endgame_points.toFixed(1)}
              subValue={`${((aggregates.avg_endgame_points / aggregates.avg_total_points) * 100).toFixed(0)}% of total`}
              color="rose"
              icon={Award}
            />
            <StatCard
              label="Data Quality"
              value={`${aggregates.complete_entries}/${aggregates.total_matches}`}
              subValue="Complete entries"
              color="emerald"
              icon={Activity}
            />
          </div>
        )
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Activity className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-2 text-slate-500">No scouting data available yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
