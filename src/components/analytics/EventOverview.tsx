/**
 * Event Overview Component
 *
 * Displays high-level event statistics:
 * - Top teams by OPR/DPR/CCWM
 * - Average scores across all teams
 * - Total matches and teams
 *
 * Related: SCOUT-7
 */

'use client';

import { Card } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Shield, Target } from 'lucide-react';
import type { TeamStatistics } from '@/types';

interface EventOverviewProps {
  eventKey: string;
  teamStats: TeamStatistics[];
}

export function EventOverview({ eventKey, teamStats }: EventOverviewProps) {
  if (!teamStats.length) return null;

  // Calculate event-level statistics
  const topOPR = [...teamStats]
    .filter(s => s.opr !== undefined && s.opr !== null)
    .sort((a, b) => (b.opr || 0) - (a.opr || 0))
    .slice(0, 3);

  const topDPR = [...teamStats]
    .filter(s => s.dpr !== undefined && s.dpr !== null)
    .sort((a, b) => (a.dpr || 0) - (b.dpr || 0)) // Lower DPR is better
    .slice(0, 3);

  const topCCWM = [...teamStats]
    .filter(s => s.ccwm !== undefined && s.ccwm !== null)
    .sort((a, b) => (b.ccwm || 0) - (a.ccwm || 0))
    .slice(0, 3);

  const avgOPR = teamStats.reduce((sum, s) => sum + (s.opr || 0), 0) / teamStats.length;
  const avgDPR = teamStats.reduce((sum, s) => sum + (s.dpr || 0), 0) / teamStats.length;
  const avgCCWM = teamStats.reduce((sum, s) => sum + (s.ccwm || 0), 0) / teamStats.length;
  const totalMatches = teamStats.reduce((sum, s) => sum + (s.matches_scouted || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Event Overview</h2>
        <p className="text-muted-foreground">
          {teamStats.length} teams • {totalMatches} total matches
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Average OPR"
          value={avgOPR.toFixed(1)}
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          description="Offensive Power Rating"
        />
        <StatCard
          title="Average DPR"
          value={avgDPR.toFixed(1)}
          icon={<TrendingDown className="h-5 w-5 text-blue-500" />}
          description="Defensive Power Rating"
        />
        <StatCard
          title="Average CCWM"
          value={avgCCWM.toFixed(1)}
          icon={<Target className="h-5 w-5 text-purple-500" />}
          description="Contribution to Winning Margin"
        />
        <StatCard
          title="Teams Competing"
          value={teamStats.length.toString()}
          icon={<Shield className="h-5 w-5 text-orange-500" />}
          description="Total teams at event"
        />
      </div>

      {/* Top Teams */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TopTeamsCard
          title="Top OPR"
          teams={topOPR}
          metric="opr"
          color="green"
        />
        <TopTeamsCard
          title="Best Defense (Lowest DPR)"
          teams={topDPR}
          metric="dpr"
          color="blue"
        />
        <TopTeamsCard
          title="Top CCWM"
          teams={topCCWM}
          metric="ccwm"
          color="purple"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}

interface TopTeamsCardProps {
  title: string;
  teams: TeamStatistics[];
  metric: 'opr' | 'dpr' | 'ccwm';
  color: 'green' | 'blue' | 'purple';
}

function TopTeamsCard({ title, teams, metric, color }: TopTeamsCardProps) {
  const colorClasses = {
    green: 'bg-green-500/10 text-green-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {teams.map((team, index) => (
          <div
            key={team.team_number}
            className="flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${colorClasses[color]}`}>
                {index + 1}
              </span>
              <span className="font-medium">{team.team_number}</span>
            </div>
            <span className="font-mono text-sm">
              {team[metric]?.toFixed(1) || 'N/A'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
