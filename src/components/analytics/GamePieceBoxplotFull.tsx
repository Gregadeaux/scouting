/**
 * Full-Width Game Piece Boxplot Component
 *
 * Displays all 8 game piece categories as separate full-width boxplot sections,
 * stacked vertically for optimal viewing and printing.
 *
 * Categories:
 * 1. All Coral (L1+L2+L3+L4)
 * 2. Coral Level 1
 * 3. Coral Level 2
 * 4. Coral Level 3
 * 5. Coral Level 4
 * 6. All Algae (Processor+Barge)
 * 7. Algae Processor
 * 8. Algae Barge
 *
 * Shows top 10 teams per category. Uses vibrant colors for better readability
 * (blue dots, green boxes, gray whiskers).
 *
 * Related: SCOUT-91
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import {
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
} from 'recharts';

interface GamePieceBoxplotFullProps {
  eventKey: string;
  teamsPerCategory?: number; // Default to 10
  teamNumbers?: number[]; // Optional: filter to specific teams (e.g., for match reports)
  teamColors?: Record<number, string>; // Optional: map team numbers to colors (e.g., for alliance coloring)
}

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

interface CategoryConfig {
  key: MetricType;
  label: string;
  shortLabel: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'allCoral', label: 'All Coral (L1+L2+L3+L4)', shortLabel: 'All Coral' },
  { key: 'coralL1', label: 'Coral Level 1', shortLabel: 'Coral L1' },
  { key: 'coralL2', label: 'Coral Level 2', shortLabel: 'Coral L2' },
  { key: 'coralL3', label: 'Coral Level 3', shortLabel: 'Coral L3' },
  { key: 'coralL4', label: 'Coral Level 4', shortLabel: 'Coral L4' },
  { key: 'allAlgae', label: 'All Algae (Processor+Barge)', shortLabel: 'All Algae' },
  { key: 'algaeProcessor', label: 'Algae Processor', shortLabel: 'Processor' },
  { key: 'algaeBarge', label: 'Algae Barge', shortLabel: 'Barge' },
];

export function GamePieceBoxplotFull({
  eventKey,
  teamsPerCategory = 10,
  teamNumbers,
  teamColors,
}: GamePieceBoxplotFullProps) {
  const [teamsData, setTeamsData] = useState<TeamData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter teams data if teamNumbers is provided
  const filteredTeamsData = teamNumbers
    ? teamsData.filter((team) => teamNumbers.includes(team.teamNumber))
    : teamsData;

  const fetchGamePieceData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/game-pieces/${eventKey}`);
      const data = await response.json();

      if (data.success && data.data) {
        setTeamsData(data.data.teams || []);
      } else {
        setError(data.error || 'Failed to load game piece data');
      }
    } catch (err) {
      console.error('[GamePieceBoxplotFull] Error fetching data:', err);
      setError('Failed to load game piece data');
    } finally {
      setIsLoading(false);
    }
  }, [eventKey]);

  useEffect(() => {
    fetchGamePieceData();
  }, [fetchGamePieceData]);

  // Calculate boxplot statistics for a specific metric
  const calculateBoxplotStats = (
    teams: TeamData[],
    metric: MetricType
  ): BoxplotStats[] => {
    const stats = teams
      .map((team) => {
        const values = team.matches
          .map((match) => match[metric])
          .filter((val) => val !== undefined && val !== null)
          .sort((a, b) => a - b);

        if (values.length === 0) {
          return null;
        }

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
      .sort((a, b) => b.average - a.average); // Sort by average descending

    // Only limit to top N if we're not filtering to specific teams
    return teamNumbers ? stats : stats.slice(0, teamsPerCategory);
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

    if (lower === upper) {
      return values[lower];
    }

    return values[lower] * (1 - weight) + values[upper] * weight;
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Loading game piece data...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive">
        <p className="text-destructive">{error}</p>
      </Card>
    );
  }

  if (filteredTeamsData.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No game piece data available for {teamNumbers ? 'these teams' : 'this event'} yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold">Game Piece Scoring Distribution</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {teamNumbers ? `${filteredTeamsData.length} teams` : `Top ${teamsPerCategory} teams per category`}
        </p>
      </div>

      {/* Render each category as a separate full-width chart */}
      {CATEGORIES.map((category) => {
        const boxplotStats = calculateBoxplotStats(filteredTeamsData, category.key);

        if (boxplotStats.length === 0) {
          return (
            <Card key={category.key} className="p-6 break-inside-avoid">
              <h3 className="text-lg font-semibold mb-2">{category.label}</h3>
              <p className="text-sm text-muted-foreground">
                No data available for this category.
              </p>
            </Card>
          );
        }

        // Prepare scatter data with colors
        const scatterData: Array<{
          x: number;
          y: number;
          team: string;
          teamNumber: number;
          matchNumber: number;
          fill: string;
        }> = [];

        const spreadRange = 0.35;
        const currentTeamNumbers = boxplotStats.map((s) => s.teamNumber);
        const currentTeamsData = filteredTeamsData.filter((t) =>
          currentTeamNumbers.includes(t.teamNumber)
        );

        boxplotStats.forEach((stat, teamIndex) => {
          const teamData = currentTeamsData.find(
            (t) => t.teamNumber === stat.teamNumber
          );
          if (teamData) {
            const sortedMatches = teamData.matches
              .filter((m) => {
                const value = m[category.key];
                return value !== undefined && value !== null;
              })
              .sort((a, b) => a.matchNumber - b.matchNumber);

            const numMatches = sortedMatches.length;
            // Get color for this team (default to blue if not specified)
            const teamColor = teamColors?.[stat.teamNumber] || '#3b82f6';

            sortedMatches.forEach((match, matchIndex) => {
              const value = match[category.key];

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
                teamNumber: stat.teamNumber,
                matchNumber: match.matchNumber,
                fill: teamColor,
              });
            });
          }
        });

        // Prepare boxplot data with colors
        const boxplotData = boxplotStats.map((stat, index) => ({
          x: index,
          team: `${stat.teamNumber}`,
          teamNumber: stat.teamNumber,
          min: stat.min,
          q1: stat.q1,
          median: stat.median,
          q3: stat.q3,
          max: stat.max,
          fill: teamColors?.[stat.teamNumber] || '#10b981',
        }));

        const teamCategories = boxplotStats.map((s) => `${s.teamNumber}`);

        return (
          <Card key={category.key} className="p-3 break-inside-avoid">
            {/* Category Title */}
            <div className="mb-3 px-1">
              <h3 className="text-lg font-semibold">{category.label}</h3>
            </div>

            {/* Chart */}
            <div className="h-96 overflow-x-auto">
              <div style={{ width: 'fit-content', minWidth: '100%' }}>
                <ComposedChart
                  width={Math.max(1200, boxplotStats.length * 120)}
                  height={384}
                  data={boxplotData}
                  margin={{ top: 10, right: 10, bottom: 10, left: -40 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[-0.5, boxplotStats.length - 0.5]}
                    ticks={Array.from({ length: boxplotStats.length }, (_, i) => i)}
                    tickFormatter={(value) => teamCategories[value] || ''}
                    tick={{ fill: '#374151', fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: '#374151', fontSize: 12 }}
                  />

                  {/* Scatter points */}
                  <Scatter
                    name="Match Performance"
                    data={scatterData}
                    dataKey="y"
                    fillOpacity={0.6}
                    isAnimationActive={false}
                    shape={(props: unknown) => {
                      const shapedProps = props as { cx?: number; cy?: number; payload?: typeof scatterData[0] };
                      if (!shapedProps.payload || typeof shapedProps.cx !== 'number' || typeof shapedProps.cy !== 'number') {
                        return <></>;
                      }
                      return (
                        <circle
                          cx={shapedProps.cx}
                          cy={shapedProps.cy}
                          r={4}
                          fill={shapedProps.payload.fill}
                          fillOpacity={0.6}
                        />
                      );
                    }}
                  />

                  {/* Boxplot bars */}
                  <Bar
                    dataKey="median"
                    fill="transparent"
                    isAnimationActive={false}
                    shape={(props: unknown) => {
                      const { x, y, width, height, payload } = props as { x?: number; y?: number; width?: number; height?: number; payload?: typeof boxplotData[0]; value?: number };

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

                      // Use team color from payload (default to green if not specified)
                      const boxColor = payload.fill || '#10b981';

                      return (
                        <g>
                          {/* Whisker lines */}
                          <line
                            x1={cx}
                            y1={minPixel}
                            x2={cx}
                            y2={q1Pixel}
                            stroke={boxColor}
                            strokeWidth={2}
                          />
                          <line
                            x1={cx}
                            y1={q3Pixel}
                            x2={cx}
                            y2={maxPixel}
                            stroke={boxColor}
                            strokeWidth={2}
                          />

                          {/* Box (Q1 to Q3) */}
                          <rect
                            x={cx - boxWidth / 2}
                            y={Math.min(q1Pixel, q3Pixel)}
                            width={boxWidth}
                            height={Math.abs(q1Pixel - q3Pixel)}
                            fill={boxColor}
                            fillOpacity={0.3}
                            stroke={boxColor}
                            strokeWidth={2}
                          />

                          {/* Median line */}
                          <line
                            x1={cx - boxWidth / 2}
                            y1={medianPixel}
                            x2={cx + boxWidth / 2}
                            y2={medianPixel}
                            stroke="#cb0a06ff"
                            strokeWidth={3}
                          />

                          {/* Min/max caps */}
                          <line
                            x1={cx - 30}
                            y1={minPixel}
                            x2={cx + 30}
                            y2={minPixel}
                            stroke={boxColor}
                            strokeWidth={2}
                          />
                          <line
                            x1={cx - 30}
                            y1={maxPixel}
                            x2={cx + 30}
                            y2={maxPixel}
                            stroke={boxColor}
                            strokeWidth={2}
                          />
                        </g>
                      );
                    }}
                  />
                </ComposedChart>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Legend */}
      <Card className="p-4 bg-muted/50 print:break-inside-avoid">
        <p className="text-sm font-medium mb-2">How to Read These Charts:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>• Blue dots: Individual match performances</div>
          <div>• Green box: 75% of performances (Q1 to Q3)</div>
          <div>• Dark green line: Median performance</div>
          <div>• Gray whiskers: Min and max performances</div>
          <div>• Teams ranked by average performance</div>
          <div>• Use color printing for best readability</div>
        </div>
      </Card>
    </div>
  );
}
