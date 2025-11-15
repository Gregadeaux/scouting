/**
 * Printable Boxplot Component
 *
 * Static boxplot visualization optimized for printing
 * Shows top 10 teams for a specific metric
 * No interactive elements (tooltips, pagination)
 *
 * Related: SCOUT-88
 */

'use client';

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Bar,
} from 'recharts';

interface TeamMatchData {
  matchNumber: number;
  coralL1: number;
  coralL2: number;
  coralL3: number;
  coralL4: number;
  algaeProcessor: number;
  algaeBarge: number;
  allCoral: number;
  allAlgae: number;
}

interface TeamData {
  teamNumber: number;
  matches: TeamMatchData[];
}

interface BoxplotStats {
  teamNumber: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  values: number[];
  average: number;
}

type MetricType =
  | 'coralL1'
  | 'coralL2'
  | 'coralL3'
  | 'coralL4'
  | 'algaeProcessor'
  | 'algaeBarge'
  | 'allCoral'
  | 'allAlgae';

interface PrintableBoxplotProps {
  eventKey: string;
  metric: MetricType;
  title: string;
  topN?: number;
}

const METRIC_LABELS: Record<MetricType, string> = {
  allCoral: 'All Coral (L1+L2+L3+L4)',
  allAlgae: 'All Algae (Processor+Barge)',
  coralL1: 'Coral Level 1',
  coralL2: 'Coral Level 2',
  coralL3: 'Coral Level 3',
  coralL4: 'Coral Level 4',
  algaeProcessor: 'Algae Processor',
  algaeBarge: 'Algae Barge',
};

export function PrintableBoxplot({
  eventKey,
  metric,
  title,
  topN = 10,
}: PrintableBoxplotProps) {
  const [teamsData, setTeamsData] = useState<TeamData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/analytics/game-pieces/${eventKey}`);
        const data = await response.json();

        if (data.success && data.data) {
          setTeamsData(data.data.teams || []);
        }
      } catch (error) {
        console.error('[PrintableBoxplot] Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [eventKey]);

  const calculateBoxplotStats = (teams: TeamData[]): BoxplotStats[] => {
    return teams
      .map((team) => {
        const values = team.matches
          .map((match) => match[metric])
          .filter((val) => val !== undefined && val !== null)
          .sort((a, b) => a - b);

        if (values.length === 0) return null;

        const min = values[0];
        const max = values[values.length - 1];
        const median = calculateMedian(values);
        const q1 = calculatePercentile(values, 25);
        const q3 = calculatePercentile(values, 75);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;

        return {
          teamNumber: team.teamNumber,
          min,
          q1,
          median,
          q3,
          max,
          values,
          average,
        };
      })
      .filter((stat): stat is BoxplotStats => stat !== null)
      .sort((a, b) => b.average - a.average)
      .slice(0, topN);
  };

  const calculateMedian = (values: number[]): number => {
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0
      ? (values[mid - 1] + values[mid]) / 2
      : values[mid];
  };

  const calculatePercentile = (values: number[], percentile: number): number => {
    const index = (percentile / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) return values[lower];
    return values[lower] * (1 - weight) + values[upper] * weight;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading {title}...
      </div>
    );
  }

  if (teamsData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available for {title}
      </div>
    );
  }

  const boxplotStats = calculateBoxplotStats(teamsData);
  const currentTeamNumbers = boxplotStats.map((s) => s.teamNumber);
  const currentTeamsData = teamsData.filter((t) =>
    currentTeamNumbers.includes(t.teamNumber)
  );

  // Prepare scatter points
  const scatterData: Array<{
    x: number;
    y: number;
    team: string;
    matchNumber: number;
  }> = [];

  const spreadRange = 0.35;

  boxplotStats.forEach((stat, teamIndex) => {
    const teamData = currentTeamsData.find((t) => t.teamNumber === stat.teamNumber);
    if (teamData) {
      const sortedMatches = teamData.matches
        .filter((m) => {
          const value = m[metric];
          return value !== undefined && value !== null;
        })
        .sort((a, b) => a.matchNumber - b.matchNumber);

      const numMatches = sortedMatches.length;

      sortedMatches.forEach((match, matchIndex) => {
        const value = match[metric];
        let xOffset = 0;
        if (numMatches > 1) {
          xOffset =
            -spreadRange +
            (matchIndex / (numMatches - 1)) * (spreadRange * 2);
        }

        scatterData.push({
          x: teamIndex + xOffset,
          y: value,
          team: `${stat.teamNumber}`,
          matchNumber: match.matchNumber,
        });
      });
    }
  });

  // Prepare boxplot data
  const boxplotData = boxplotStats.map((stat, index) => ({
    x: index,
    team: `${stat.teamNumber}`,
    min: stat.min,
    q1: stat.q1,
    median: stat.median,
    q3: stat.q3,
    max: stat.max,
  }));

  const teamCategories = boxplotStats.map((s) => `${s.teamNumber}`);
  const metricLabel = METRIC_LABELS[metric];

  return (
    <div className="print-section">
      <h3 className="text-base font-semibold mb-3">{title}</h3>
      <div style={{ height: '280px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={boxplotData}
            margin={{ top: 10, right: 10, bottom: 40, left: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-0.5, boxplotStats.length - 0.5]}
              ticks={Array.from({ length: boxplotStats.length }, (_, i) => i)}
              tickFormatter={(value) => teamCategories[value] || ''}
              label={{
                value: 'Team Number',
                position: 'insideBottom',
                offset: -5,
                style: { fontSize: 11 },
              }}
              style={{ fontSize: 10 }}
            />
            <YAxis
              label={{
                value: metricLabel,
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11 },
              }}
              style={{ fontSize: 10 }}
            />

            {/* Scatter points for match performances */}
            <Scatter
              name="Match Performance"
              data={scatterData}
              dataKey="y"
              fill="#3b82f6"
              fillOpacity={0.6}
              isAnimationActive={false}
            />

            {/* Boxplot bars */}
            <Bar
              dataKey="median"
              fill="transparent"
              isAnimationActive={false}
              shape={(props: unknown) => {
                const p = props as {
                  x?: number;
                  y?: number;
                  width?: number;
                  height?: number;
                  payload?: {
                    median: number;
                    q1: number;
                    q3: number;
                    min: number;
                    max: number;
                  };
                };

                const { x, y, width, height, payload } = p;

                if (
                  !payload ||
                  typeof x !== 'number' ||
                  typeof y !== 'number'
                ) {
                  return <></>;
                }

                const boxWidth = 100;
                const cx = x + (width || 0) / 2;
                const medianValue = payload.median;
                const medianPixel = y;
                const pixelsPerUnit =
                  height !== undefined && height !== 0
                    ? height / medianValue
                    : 1;

                const q1Pixel =
                  medianPixel + (medianValue - payload.q1) * pixelsPerUnit;
                const q3Pixel =
                  medianPixel + (medianValue - payload.q3) * pixelsPerUnit;
                const minPixel =
                  medianPixel + (medianValue - payload.min) * pixelsPerUnit;
                const maxPixel =
                  medianPixel + (medianValue - payload.max) * pixelsPerUnit;

                return (
                  <g>
                    {/* Whiskers */}
                    <line
                      x1={cx}
                      y1={minPixel}
                      x2={cx}
                      y2={q1Pixel}
                      stroke="#64748b"
                      strokeWidth={1.5}
                    />
                    <line
                      x1={cx}
                      y1={q3Pixel}
                      x2={cx}
                      y2={maxPixel}
                      stroke="#64748b"
                      strokeWidth={1.5}
                    />

                    {/* Box */}
                    <rect
                      x={cx - boxWidth / 2}
                      y={Math.min(q1Pixel, q3Pixel)}
                      width={boxWidth}
                      height={Math.abs(q1Pixel - q3Pixel)}
                      fill="#10b981"
                      fillOpacity={0.3}
                      stroke="#10b981"
                      strokeWidth={1.5}
                    />

                    {/* Median line */}
                    <line
                      x1={cx - boxWidth / 2}
                      y1={medianPixel}
                      x2={cx + boxWidth / 2}
                      y2={medianPixel}
                      stroke="#059669"
                      strokeWidth={2.5}
                    />

                    {/* Min/max caps */}
                    <line
                      x1={cx - 25}
                      y1={minPixel}
                      x2={cx + 25}
                      y2={minPixel}
                      stroke="#64748b"
                      strokeWidth={1.5}
                    />
                    <line
                      x1={cx - 25}
                      y1={maxPixel}
                      x2={cx + 25}
                      y2={maxPixel}
                      stroke="#64748b"
                      strokeWidth={1.5}
                    />
                  </g>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Dots: Individual matches | Box: Q1-Q3 range | Thick line: Median | Whiskers: Min/Max
      </div>
    </div>
  );
}
