/**
 * Printable Radar Chart Component
 *
 * Static radar chart showing top 5 teams across all metrics
 * Optimized for printing with grayscale-friendly colors
 *
 * Related: SCOUT-88
 */

'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TeamStatistics } from '@/types';

interface PrintableRadarChartProps {
  teamStats: TeamStatistics[];
  topN?: number;
}

const TEAM_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
];

export function PrintableRadarChart({ teamStats, topN = 5 }: PrintableRadarChartProps) {
  // Get top N teams by OPR
  const topTeams = [...teamStats]
    .sort((a, b) => (b.opr || 0) - (a.opr || 0))
    .slice(0, topN);

  if (topTeams.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No team data available
      </div>
    );
  }

  // Find max values for normalization across ALL teams at the event
  const maxOPR = Math.max(...teamStats.map((s) => s.opr || 0), 1);
  const maxCCWM = Math.max(...teamStats.map((s) => s.ccwm || 0), 1);
  const maxAuto = Math.max(...teamStats.map((s) => s.avg_auto_score || 0), 1);
  const maxTeleop = Math.max(...teamStats.map((s) => s.avg_teleop_score || 0), 1);
  const maxEndgame = Math.max(...teamStats.map((s) => s.avg_endgame_score || 0), 1);
  const maxReliability = 100;

  // Prepare radar chart data
  const radarData = [
    {
      metric: 'OPR',
      ...Object.fromEntries(
        topTeams.map((s) => [
          `team${s.team_number}`,
          ((s.opr || 0) / maxOPR) * 100,
        ])
      ),
    },
    {
      metric: 'CCWM',
      ...Object.fromEntries(
        topTeams.map((s) => [
          `team${s.team_number}`,
          ((s.ccwm || 0) / maxCCWM) * 100,
        ])
      ),
    },
    {
      metric: 'Auto',
      ...Object.fromEntries(
        topTeams.map((s) => [
          `team${s.team_number}`,
          ((s.avg_auto_score || 0) / maxAuto) * 100,
        ])
      ),
    },
    {
      metric: 'Teleop',
      ...Object.fromEntries(
        topTeams.map((s) => [
          `team${s.team_number}`,
          ((s.avg_teleop_score || 0) / maxTeleop) * 100,
        ])
      ),
    },
    {
      metric: 'Endgame',
      ...Object.fromEntries(
        topTeams.map((s) => [
          `team${s.team_number}`,
          ((s.avg_endgame_score || 0) / maxEndgame) * 100,
        ])
      ),
    },
    {
      metric: 'Reliability',
      ...Object.fromEntries(
        topTeams.map((s) => [
          `team${s.team_number}`,
          ((s.reliability_score || 0) / maxReliability) * 100,
        ])
      ),
    },
  ];

  return (
    <div className="print-section">
      <h3 className="text-base font-semibold mb-3">
        Top {topTeams.length} Teams - Capability Profile
      </h3>
      <div style={{ height: '350px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#d1d5db" />
            <PolarAngleAxis
              dataKey="metric"
              style={{ fontSize: 11, fill: '#6b7280' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              style={{ fontSize: 9, fill: '#9ca3af' }}
            />
            {topTeams.map((team, index) => (
              <Radar
                key={team.team_number}
                name={`Team ${team.team_number}`}
                dataKey={`team${team.team_number}`}
                stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                fill={TEAM_COLORS[index % TEAM_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconSize={12}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        All metrics normalized to 0-100% scale based on event maximum
      </div>

      {/* Statistics Table */}
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Raw Statistics</h4>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Metric</th>
              {topTeams.map((team, index) => (
                <th
                  key={team.team_number}
                  className="text-right p-2"
                  style={{ color: TEAM_COLORS[index % TEAM_COLORS.length] }}
                >
                  {team.team_number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-2 font-medium text-muted-foreground">OPR</td>
              {topTeams.map((s) => (
                <td key={s.team_number} className="p-2 text-right font-mono">
                  {s.opr?.toFixed(1) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium text-muted-foreground">DPR</td>
              {topTeams.map((s) => (
                <td key={s.team_number} className="p-2 text-right font-mono">
                  {s.dpr?.toFixed(1) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium text-muted-foreground">CCWM</td>
              {topTeams.map((s) => (
                <td key={s.team_number} className="p-2 text-right font-mono">
                  {s.ccwm?.toFixed(1) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium text-muted-foreground">Avg Auto</td>
              {topTeams.map((s) => (
                <td key={s.team_number} className="p-2 text-right font-mono">
                  {s.avg_auto_score?.toFixed(1) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium text-muted-foreground">Avg Teleop</td>
              {topTeams.map((s) => (
                <td key={s.team_number} className="p-2 text-right font-mono">
                  {s.avg_teleop_score?.toFixed(1) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium text-muted-foreground">Avg Endgame</td>
              {topTeams.map((s) => (
                <td key={s.team_number} className="p-2 text-right font-mono">
                  {s.avg_endgame_score?.toFixed(1) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium text-muted-foreground">Reliability %</td>
              {topTeams.map((s) => (
                <td key={s.team_number} className="p-2 text-right font-mono">
                  {s.reliability_score?.toFixed(0) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2 font-medium text-muted-foreground">Matches</td>
              {topTeams.map((s) => (
                <td key={s.team_number} className="p-2 text-right font-mono">
                  {s.matches_scouted?.toString() || '0'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
