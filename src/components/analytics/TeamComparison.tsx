/**
 * Team Comparison Component
 *
 * Side-by-side comparison of selected teams showing:
 * - Statistics comparison
 * - Radar chart of capabilities
 * - Strengths/weaknesses
 *
 * Related: SCOUT-7
 */

'use client';

import { Card } from '@/components/ui/Card';
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

interface TeamComparisonProps {
  eventKey: string;
  teamNumbers: number[];
  teamStats: TeamStatistics[];
  allEventStats: TeamStatistics[];
}

const TEAM_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
];

export function TeamComparison({ eventKey: _eventKey, teamNumbers, teamStats, allEventStats }: TeamComparisonProps) {
  if (teamNumbers.length === 0) return null;

  // Find max values for normalization across ALL teams at the event (not just selected)
  const maxOPR = Math.max(...allEventStats.map(s => s.opr || 0), 1);
  const maxCCWM = Math.max(...allEventStats.map(s => s.ccwm || 0), 1);
  const maxAuto = Math.max(...allEventStats.map(s => s.avg_auto_score || 0), 1);
  const maxTeleop = Math.max(...allEventStats.map(s => s.avg_teleop_score || 0), 1);
  const maxEndgame = Math.max(...allEventStats.map(s => s.avg_endgame_score || 0), 1);
  const maxReliability = 100;

  // Prepare radar chart data
  const radarData = [
    { metric: 'OPR', ...Object.fromEntries(teamStats.map(s => [`team${s.team_number}`, ((s.opr || 0) / maxOPR) * 100])) },
    { metric: 'CCWM', ...Object.fromEntries(teamStats.map(s => [`team${s.team_number}`, ((s.ccwm || 0) / maxCCWM) * 100])) },
    { metric: 'Auto', ...Object.fromEntries(teamStats.map(s => [`team${s.team_number}`, ((s.avg_auto_score || 0) / maxAuto) * 100])) },
    { metric: 'Teleop', ...Object.fromEntries(teamStats.map(s => [`team${s.team_number}`, ((s.avg_teleop_score || 0) / maxTeleop) * 100])) },
    { metric: 'Endgame', ...Object.fromEntries(teamStats.map(s => [`team${s.team_number}`, ((s.avg_endgame_score || 0) / maxEndgame) * 100])) },
    { metric: 'Reliability', ...Object.fromEntries(teamStats.map(s => [`team${s.team_number}`, ((s.reliability_score || 0) / maxReliability) * 100])) },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Team Comparison</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div>
          <h4 className="text-sm font-medium mb-4 text-center">Capability Profile</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis
                  dataKey="metric"
                  className="text-xs"
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
                {teamStats.map((team, index) => (
                  <Radar
                    key={team.team_number}
                    name={`Team ${team.team_number}`}
                    dataKey={`team${team.team_number}`}
                    stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                    fill={TEAM_COLORS[index % TEAM_COLORS.length]}
                    fillOpacity={0.2}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statistics Table */}
        <div>
          <h4 className="text-sm font-medium mb-4">Statistics Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2">Metric</th>
                  {teamStats.map((team, index) => (
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
                <StatRow
                  label="OPR"
                  values={teamStats.map(s => s.opr?.toFixed(1) || 'N/A')}
                />
                <StatRow
                  label="DPR"
                  values={teamStats.map(s => s.dpr?.toFixed(1) || 'N/A')}
                />
                <StatRow
                  label="CCWM"
                  values={teamStats.map(s => s.ccwm?.toFixed(1) || 'N/A')}
                />
                <StatRow
                  label="Avg Auto"
                  values={teamStats.map(s => s.avg_auto_score?.toFixed(1) || 'N/A')}
                />
                <StatRow
                  label="Avg Teleop"
                  values={teamStats.map(s => s.avg_teleop_score?.toFixed(1) || 'N/A')}
                />
                <StatRow
                  label="Avg Endgame"
                  values={teamStats.map(s => s.avg_endgame_score?.toFixed(1) || 'N/A')}
                />
                <StatRow
                  label="Reliability %"
                  values={teamStats.map(s => s.reliability_score?.toFixed(0) || 'N/A')}
                />
                <StatRow
                  label="Matches Played"
                  values={teamStats.map(s => s.matches_scouted?.toString() || '0')}
                />
              </tbody>
            </table>
          </div>

          {/* Note: Strengths/weaknesses would be derived from scouting notes in production */}
        </div>
      </div>
    </Card>
  );
}

interface StatRowProps {
  label: string;
  values: string[];
}

function StatRow({ label, values }: StatRowProps) {
  return (
    <tr className="border-b">
      <td className="p-2 font-medium text-muted-foreground">{label}</td>
      {values.map((value, index) => (
        <td key={index} className="p-2 text-right font-mono">
          {value}
        </td>
      ))}
    </tr>
  );
}
