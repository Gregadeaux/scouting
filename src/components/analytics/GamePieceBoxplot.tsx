/**
 * Game Piece Boxplot Component
 *
 * Displays distribution of game pieces scored across matches for teams.
 * Shows 10 teams at a time with pagination.
 * Each boxplot shows:
 * - Individual match performances as dots
 * - Box (shaded area) for interquartile range (Q1-Q3)
 * - Min/max range
 * - Median line
 *
 * Related: SCOUT-7
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface GamePieceBoxplotProps {
  eventKey: string;
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

const METRIC_OPTIONS = [
  { value: 'allCoral', label: 'All Coral (L1+L2+L3+L4)' },
  { value: 'allAlgae', label: 'All Algae (Processor+Barge)' },
  { value: 'coralL1', label: 'Coral Level 1' },
  { value: 'coralL2', label: 'Coral Level 2' },
  { value: 'coralL3', label: 'Coral Level 3' },
  { value: 'coralL4', label: 'Coral Level 4' },
  { value: 'algaeProcessor', label: 'Algae Processor' },
  { value: 'algaeBarge', label: 'Algae Barge' },
];

const TEAMS_PER_PAGE = 10;

export function GamePieceBoxplot({ eventKey }: GamePieceBoxplotProps) {
  const [teamsData, setTeamsData] = useState<TeamData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('allCoral');
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (error) {
      console.error('[GamePieceBoxplot] Error fetching data:', error);
      setError('Failed to load game piece data');
    } finally {
      setIsLoading(false);
    }
  }, [eventKey]);

  useEffect(() => {
    fetchGamePieceData();
  }, [fetchGamePieceData]);

  // Calculate boxplot statistics for each team
  const calculateBoxplotStats = (teams: TeamData[]): BoxplotStats[] => {
    return teams
      .map((team) => {
        const values = team.matches
          .map((match) => match[selectedMetric])
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

        return {
          teamNumber: team.teamNumber,
          min,
          q1,
          median,
          q3,
          max,
          values,
        };
      })
      .filter((stat): stat is BoxplotStats => stat !== null)
      .sort((a, b) => b.median - a.median); // Sort by median descending
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

  if (teamsData.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No game piece data available for this event yet.
        </p>
      </Card>
    );
  }

  const boxplotStats = calculateBoxplotStats(teamsData);
  const totalPages = Math.ceil(boxplotStats.length / TEAMS_PER_PAGE);
  const startIdx = currentPage * TEAMS_PER_PAGE;
  const endIdx = Math.min(startIdx + TEAMS_PER_PAGE, boxplotStats.length);
  const currentStats = boxplotStats.slice(startIdx, endIdx);

  // Prepare chart data for current page
  const chartData: Array<{
    team: string;
    teamNumber: number;
    x: number;
    y: number;
    type: 'point' | 'box' | 'whisker' | 'median';
    index: number;
  }> = [];

  currentStats.forEach((stat, index) => {
    // Add individual data points
    stat.values.forEach((value) => {
      chartData.push({
        team: `${stat.teamNumber}`,
        teamNumber: stat.teamNumber,
        x: index,
        y: value,
        type: 'point',
        index,
      });
    });

    // Add box boundaries (we'll render these as rectangles)
    chartData.push({
      team: `${stat.teamNumber}`,
      teamNumber: stat.teamNumber,
      x: index,
      y: stat.q1,
      type: 'box',
      index,
    });

    chartData.push({
      team: `${stat.teamNumber}`,
      teamNumber: stat.teamNumber,
      x: index,
      y: stat.q3,
      type: 'box',
      index,
    });

    // Add median line
    chartData.push({
      team: `${stat.teamNumber}`,
      teamNumber: stat.teamNumber,
      x: index,
      y: stat.median,
      type: 'median',
      index,
    });

    // Add whiskers (min/max)
    chartData.push({
      team: `${stat.teamNumber}`,
      teamNumber: stat.teamNumber,
      x: index,
      y: stat.min,
      type: 'whisker',
      index,
    });

    chartData.push({
      team: `${stat.teamNumber}`,
      teamNumber: stat.teamNumber,
      x: index,
      y: stat.max,
      type: 'whisker',
      index,
    });
  });

  const metricLabel =
    METRIC_OPTIONS.find((opt) => opt.value === selectedMetric)?.label ||
    'Game Pieces';

  return (
    <Card className="p-4">
      <div className="mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Game Piece Distribution - {metricLabel}
          </h3>
          <div className="text-sm text-muted-foreground">
            Teams {startIdx + 1}-{endIdx} of {boxplotStats.length}
          </div>
        </div>

        {/* Metric Selector */}
        <div className="max-w-xs">
          <Select
            label="Scoring Metric"
            value={selectedMetric}
            onChange={(e) => {
              setSelectedMetric(e.target.value as MetricType);
              setCurrentPage(0); // Reset to first page
            }}
            options={METRIC_OPTIONS}
          />
        </div>
      </div>

      {/* Boxplot Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-0.5, currentStats.length - 0.5]}
              ticks={currentStats.map((_, i) => i)}
              tickFormatter={(value) => {
                const stat = currentStats[value];
                return stat ? `${stat.teamNumber}` : '';
              }}
              label={{
                value: 'Team Number',
                position: 'insideBottom',
                offset: -10,
              }}
              className="text-xs"
            />
            <YAxis
              type="number"
              label={{
                value: metricLabel,
                angle: -90,
                position: 'insideLeft',
              }}
              className="text-xs"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;

                const data = payload[0].payload;
                const stat = currentStats[data.index];

                if (!stat) return null;

                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold mb-1">Team {stat.teamNumber}</p>
                    <div className="text-sm space-y-0.5">
                      <p>Max: {stat.max}</p>
                      <p>Q3: {stat.q3.toFixed(1)}</p>
                      <p>Median: {stat.median.toFixed(1)}</p>
                      <p>Q1: {stat.q1.toFixed(1)}</p>
                      <p>Min: {stat.min}</p>
                      <p className="mt-1 text-muted-foreground">
                        {stat.values.length} matches
                      </p>
                    </div>
                  </div>
                );
              }}
            />

            {/* Render individual data points */}
            <Scatter
              data={chartData.filter((d) => d.type === 'point')}
              fill="#3b82f6"
              fillOpacity={0.6}
            >
              {chartData
                .filter((d) => d.type === 'point')
                .map((entry, index) => (
                  <Cell key={`point-${index}`} r={3} />
                ))}
            </Scatter>

            {/* Custom boxplot rendering via shape prop */}
            <Scatter
              data={currentStats.map((stat, i) => ({ x: i, y: stat.median }))}
              shape={(props: unknown) => {
                const { cx = 0, cy = 0, index = 0 } = props as { cx?: number; cy?: number; index?: number };
                const stat = currentStats[index];
                if (!stat) return <></>;  // Return empty fragment instead of null

                const boxWidth = 40;
                const yScale = 80 / (stat.max - stat.min || 1); // Approximate scale

                const q1Y = cy + (stat.median - stat.q1) * yScale;
                const q3Y = cy - (stat.q3 - stat.median) * yScale;
                const minY = cy + (stat.median - stat.min) * yScale;
                const maxY = cy - (stat.max - stat.median) * yScale;

                return (
                  <g>
                    {/* Whisker lines (min to Q1, Q3 to max) */}
                    <line
                      x1={cx}
                      y1={minY}
                      x2={cx}
                      y2={q1Y}
                      stroke="#64748b"
                      strokeWidth={1}
                    />
                    <line
                      x1={cx}
                      y1={q3Y}
                      x2={cx}
                      y2={maxY}
                      stroke="#64748b"
                      strokeWidth={1}
                    />

                    {/* Box (Q1 to Q3) */}
                    <rect
                      x={cx - boxWidth / 2}
                      y={q3Y}
                      width={boxWidth}
                      height={Math.abs(q1Y - q3Y)}
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />

                    {/* Median line */}
                    <line
                      x1={cx - boxWidth / 2}
                      y1={cy}
                      x2={cx + boxWidth / 2}
                      y2={cy}
                      stroke="#1e40af"
                      strokeWidth={3}
                    />

                    {/* Min/max caps */}
                    <line
                      x1={cx - 10}
                      y1={minY}
                      x2={cx + 10}
                      y2={minY}
                      stroke="#64748b"
                      strokeWidth={1}
                    />
                    <line
                      x1={cx - 10}
                      y1={maxY}
                      x2={cx + 10}
                      y2={maxY}
                      stroke="#64748b"
                      strokeWidth={1}
                    />
                  </g>
                );
              }}
              fill="transparent"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <Button
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>

          <Button
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
            }
            disabled={currentPage === totalPages - 1}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-sm font-medium mb-2">How to Read This Chart:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>• Dots: Individual match performances</div>
          <div>• Box: 75% of performances (Q1 to Q3)</div>
          <div>• Thick line: Median performance</div>
          <div>• Whiskers: Min and max performances</div>
        </div>
      </div>
    </Card>
  );
}
