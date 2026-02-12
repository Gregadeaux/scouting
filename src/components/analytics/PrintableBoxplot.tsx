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

import { useEffect, useState, useRef } from 'react';
import {
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

interface TeamMatchData {
  matchNumber: number;
  // 2025 fields
  coralL1: number;
  coralL2: number;
  coralL3: number;
  coralL4: number;
  algaeProcessor: number;
  algaeBarge: number;
  allCoral: number;
  allAlgae: number;
  // 2026 fields
  autoCount: number;
  transitionCount: number;
  shift1Count: number;
  shift2Count: number;
  shift3Count: number;
  shift4Count: number;
  endgameCount: number;
  totalCount: number;
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
  | 'allAlgae'
  | 'autoCount'
  | 'transitionCount'
  | 'shift1Count'
  | 'shift2Count'
  | 'shift3Count'
  | 'shift4Count'
  | 'endgameCount'
  | 'totalCount';

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
  totalCount: 'Total Game Pieces',
  autoCount: 'Auto Game Pieces',
  transitionCount: 'Transition Game Pieces',
  shift1Count: 'Shift 1 Game Pieces',
  shift2Count: 'Shift 2 Game Pieces',
  shift3Count: 'Shift 3 Game Pieces',
  shift4Count: 'Shift 4 Game Pieces',
  endgameCount: 'Endgame Game Pieces',
};

export function PrintableBoxplot({
  eventKey,
  metric,
  title,
  topN = 10,
}: PrintableBoxplotProps) {
  const [teamsData, setTeamsData] = useState<TeamData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Store baseline (y=0) and top (y=yMax) pixel positions for each team
  const scaleRef = useRef<Map<string, { baseline: number; top: number; yMax: number }>>(new Map());

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

  // Prepare scatter points for match performances
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

  // Calculate Y-axis domain - must include all scatter data points
  const allYValues = scatterData.map((d) => d.y);
  const yMin = 0;
  const yMax = Math.max(...allYValues, ...boxplotStats.map((s) => s.max), 1);

  // Create baseline reference points (y=0) - used to establish pixel scale
  const baselineData: Array<{
    x: number;
    y: number;
    team: string;
    yDomainMax: number;
  }> = boxplotStats.map((stat, index) => ({
    x: index,
    y: 0,
    team: `${stat.teamNumber}`,
    yDomainMax: yMax,
  }));

  // Create top reference points (y=yMax) - used to establish pixel scale
  const topData: Array<{
    x: number;
    y: number;
    team: string;
    yDomainMax: number;
  }> = boxplotStats.map((stat, index) => ({
    x: index,
    y: yMax,
    team: `${stat.teamNumber}`,
    yDomainMax: yMax,
  }));

  // Create boxplot drawing points (one per team with all stats)
  const boxplotDrawData: Array<{
    x: number;
    y: number;
    team: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    yDomainMax: number;
  }> = boxplotStats.map((stat, index) => ({
    x: index,
    y: stat.median, // Position at median for the scatter point
    team: `${stat.teamNumber}`,
    min: stat.min,
    q1: stat.q1,
    median: stat.median,
    q3: stat.q3,
    max: stat.max,
    yDomainMax: yMax,
  }));

  const teamCategories = boxplotStats.map((s) => `${s.teamNumber}`);
  const metricLabel = METRIC_LABELS[metric];

  return (
    <div className="print-section">
      <h3 className="text-base font-semibold mb-3">{title}</h3>
      <div style={{ height: '280px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
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
              domain={[yMin, yMax]}
              allowDataOverflow={true}
              label={{
                value: metricLabel,
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11 },
              }}
              style={{ fontSize: 10 }}
            />

            {/* Baseline reference points (y=0) - invisible, just to capture pixel positions */}
            <Scatter
              name="Baseline Refs"
              data={baselineData}
              dataKey="y"
              fill="transparent"
              isAnimationActive={false}
              shape={(props: unknown) => {
                const p = props as {
                  cx?: number;
                  cy?: number;
                  payload?: {
                    team: string;
                    yDomainMax: number;
                  };
                };

                const { cy, payload } = p;

                if (payload && typeof cy === 'number') {
                  // Store baseline pixel position
                  const existing = scaleRef.current.get(payload.team) || { baseline: 0, top: 0, yMax: payload.yDomainMax };
                  scaleRef.current.set(payload.team, { ...existing, baseline: cy, yMax: payload.yDomainMax });
                }

                return <></>; // Invisible
              }}
            />

            {/* Top reference points (y=yMax) - invisible, just to capture pixel positions */}
            <Scatter
              name="Top Refs"
              data={topData}
              dataKey="y"
              fill="transparent"
              isAnimationActive={false}
              shape={(props: unknown) => {
                const p = props as {
                  cx?: number;
                  cy?: number;
                  payload?: {
                    team: string;
                    yDomainMax: number;
                  };
                };

                const { cy, payload } = p;

                if (payload && typeof cy === 'number') {
                  // Store top pixel position
                  const existing = scaleRef.current.get(payload.team) || { baseline: 0, top: 0, yMax: payload.yDomainMax };
                  scaleRef.current.set(payload.team, { ...existing, top: cy });
                }

                return <></>; // Invisible
              }}
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

            {/* Boxplot drawing - renders after reference points are captured */}
            <Scatter
              name="Boxplot"
              data={boxplotDrawData}
              dataKey="y"
              fill="transparent"
              isAnimationActive={false}
              shape={(props: unknown) => {
                const p = props as {
                  cx?: number;
                  cy?: number;
                  payload?: {
                    team: string;
                    min: number;
                    q1: number;
                    median: number;
                    q3: number;
                    max: number;
                    yDomainMax: number;
                  };
                };

                const { cx, payload } = p;

                if (!payload || typeof cx !== 'number') {
                  return <></>;
                }

                const scale = scaleRef.current.get(payload.team);
                if (!scale || scale.baseline === 0 && scale.top === 0) {
                  return <></>;
                }

                // Calculate pixels per unit from reference points
                // baseline is at y=0, top is at y=yMax
                // In SVG, y increases downward, so baseline.cy > top.cy
                const pixelsPerUnit = (scale.baseline - scale.top) / scale.yMax;

                if (pixelsPerUnit <= 0) {
                  return <></>;
                }

                // Calculate pixel positions for all values
                // pixelY = baseline - value * pixelsPerUnit
                const minPixel = scale.baseline - payload.min * pixelsPerUnit;
                const q1Pixel = scale.baseline - payload.q1 * pixelsPerUnit;
                const medianPixel = scale.baseline - payload.median * pixelsPerUnit;
                const q3Pixel = scale.baseline - payload.q3 * pixelsPerUnit;
                const maxPixel = scale.baseline - payload.max * pixelsPerUnit;

                const boxWidth = 24;

                return (
                  <g>
                    {/* Lower whisker: min to q1 */}
                    <line
                      x1={cx}
                      y1={minPixel}
                      x2={cx}
                      y2={q1Pixel}
                      stroke="#64748b"
                      strokeWidth={1.5}
                    />
                    {/* Upper whisker: q3 to max */}
                    <line
                      x1={cx}
                      y1={q3Pixel}
                      x2={cx}
                      y2={maxPixel}
                      stroke="#64748b"
                      strokeWidth={1.5}
                    />

                    {/* Box: q1 to q3 */}
                    <rect
                      x={cx - boxWidth / 2}
                      y={q3Pixel}
                      width={boxWidth}
                      height={q1Pixel - q3Pixel}
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

                    {/* Min cap */}
                    <line
                      x1={cx - 12}
                      y1={minPixel}
                      x2={cx + 12}
                      y2={minPixel}
                      stroke="#64748b"
                      strokeWidth={1.5}
                    />
                    {/* Max cap */}
                    <line
                      x1={cx - 12}
                      y1={maxPixel}
                      x2={cx + 12}
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
