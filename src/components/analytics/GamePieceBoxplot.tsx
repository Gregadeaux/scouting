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

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ComposedChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
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

  // Prepare data for current page
  const currentTeamNumbers = currentStats.map(s => s.teamNumber);
  const currentTeamsData = teamsData.filter(t =>
    currentTeamNumbers.includes(t.teamNumber)
  );

  // Prepare scatter points - spread horizontally by match number
  const scatterData: Array<{
    x: number; // team index with offset for match progression
    y: number; // value
    team: string; // team number for display
    matchNumber: number; // for tooltip
  }> = [];

  const spreadRange = 0.35; // How far to spread matches around team center (±0.35 = 0.7 total width)

  currentStats.forEach((stat, teamIndex) => {
    const teamData = currentTeamsData.find(t => t.teamNumber === stat.teamNumber);
    if (teamData) {
      const sortedMatches = teamData.matches
        .filter(m => {
          const value = m[selectedMetric];
          return value !== undefined && value !== null;
        })
        .sort((a, b) => a.matchNumber - b.matchNumber);

      const numMatches = sortedMatches.length;

      sortedMatches.forEach((match, matchIndex) => {
        const value = match[selectedMetric];

        // Spread matches across x-axis: from (teamIndex - spreadRange) to (teamIndex + spreadRange)
        // First match on the left, last match on the right
        let xOffset = 0;
        if (numMatches > 1) {
          xOffset = -spreadRange + (matchIndex / (numMatches - 1)) * (spreadRange * 2);
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

  // Prepare boxplot data for current page
  const boxplotData = currentStats.map((stat, index) => ({
    x: index,
    team: `${stat.teamNumber}`,
    min: stat.min,
    q1: stat.q1,
    median: stat.median,
    q3: stat.q3,
    max: stat.max,
  }));

  // Categories for x-axis
  const teamCategories = currentStats.map(s => `${s.teamNumber}`);

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
        <div className="max-w-xs space-y-2">
          <label className="text-sm font-medium">Scoring Metric</label>
          <Select
            value={selectedMetric}
            onValueChange={(value) => {
              setSelectedMetric(value as MetricType);
              setCurrentPage(0); // Reset to first page
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Boxplot Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={boxplotData}
            margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-0.5, currentStats.length - 0.5]}
              ticks={Array.from({ length: currentStats.length }, (_, i) => i)}
              tickFormatter={(value) => teamCategories[value] || ''}
              label={{
                value: 'Team Number',
                position: 'insideBottom',
                offset: -10,
              }}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;

                const data = payload[0]?.payload;
                if (!data) return null;

                // Check if it's a scatter point or boxplot data
                if ('y' in data && 'matchNumber' in data) {
                  // Scatter point
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold">Team {data.team}</p>
                      <p className="text-sm">Match {data.matchNumber}</p>
                      <p className="text-sm">Value: {data.y}</p>
                    </div>
                  );
                }

                // Boxplot data
                const teamNum = parseInt(data.team);
                const stat = currentStats.find(s => s.teamNumber === teamNum);

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
              name="Match Performance"
              data={scatterData}
              dataKey="y"
              fill="#3b82f6"
              fillOpacity={0.6}
            />

            {/* Render boxplot elements using Bar with custom shape */}
            <Bar
              dataKey="median"
              fill="transparent"
              shape={(props: unknown) => {
                const { x, y, width, height, payload } = props as { x?: number; y?: number; width?: number; height?: number; payload?: typeof boxplotData[0]; value?: number };

                if (!payload || typeof x !== 'number' || typeof y !== 'number') {
                  return <></>;
                }

                const boxWidth = 120; // Wider to encompass scattered match points
                const cx = x + (width || 0) / 2;

                // Since y represents the median position, we can calculate other positions
                // by determining the pixel-per-unit ratio
                // The 'y' prop is the pixel position for the median value
                const medianValue = payload.median;
                const medianPixel = y;

                // Calculate pixels per data unit using the bar height
                // height is negative for upward bars
                const pixelsPerUnit = height !== undefined && height !== 0
                  ? height / medianValue
                  : 1;

                // Now calculate all y positions relative to the median
                const q1Pixel = medianPixel + (medianValue - payload.q1) * pixelsPerUnit;
                const q3Pixel = medianPixel + (medianValue - payload.q3) * pixelsPerUnit;
                const minPixel = medianPixel + (medianValue - payload.min) * pixelsPerUnit;
                const maxPixel = medianPixel + (medianValue - payload.max) * pixelsPerUnit;

                return (
                  <g>
                    {/* Whisker lines */}
                    <line
                      x1={cx}
                      y1={minPixel}
                      x2={cx}
                      y2={q1Pixel}
                      stroke="#64748b"
                      strokeWidth={2}
                    />
                    <line
                      x1={cx}
                      y1={q3Pixel}
                      x2={cx}
                      y2={maxPixel}
                      stroke="#64748b"
                      strokeWidth={2}
                    />

                    {/* Box (Q1 to Q3) */}
                    <rect
                      x={cx - boxWidth / 2}
                      y={Math.min(q1Pixel, q3Pixel)}
                      width={boxWidth}
                      height={Math.abs(q1Pixel - q3Pixel)}
                      fill="#10b981"
                      fillOpacity={0.3}
                      stroke="#10b981"
                      strokeWidth={2}
                    />

                    {/* Median line */}
                    <line
                      x1={cx - boxWidth / 2}
                      y1={medianPixel}
                      x2={cx + boxWidth / 2}
                      y2={medianPixel}
                      stroke="#059669"
                      strokeWidth={3}
                    />

                    {/* Min/max caps */}
                    <line
                      x1={cx - 30}
                      y1={minPixel}
                      x2={cx + 30}
                      y2={minPixel}
                      stroke="#64748b"
                      strokeWidth={2}
                    />
                    <line
                      x1={cx - 30}
                      y1={maxPixel}
                      x2={cx + 30}
                      y2={maxPixel}
                      stroke="#64748b"
                      strokeWidth={2}
                    />
                  </g>
                );
              }}
            />
          </ComposedChart>
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
