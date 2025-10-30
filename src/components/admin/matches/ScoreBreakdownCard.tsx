import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';

interface ScoreBreakdown {
  total_points: number | null;
  auto_points: number | null;
  teleop_points: number | null;
  endgame_points: number | null;
  // 2025 Reefscape specific
  coral_L1: number | null;
  coral_L2: number | null;
  coral_L3: number | null;
  coral_L4: number | null;
  algae_barge: number | null;
  algae_processor: number | null;
  cage_shallow: number | null;
  cage_deep: number | null;
}

interface ScoreBreakdownCardProps {
  redBreakdown: ScoreBreakdown | Record<string, number | null> | null;
  blueBreakdown: ScoreBreakdown | Record<string, number | null> | null;
}

export function ScoreBreakdownCard({ redBreakdown, blueBreakdown }: ScoreBreakdownCardProps) {
  const hasData = redBreakdown?.total_points !== null || blueBreakdown?.total_points !== null;

  if (!hasData) {
    return (
      <Card className="h-[400px]">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No score breakdown available</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Detailed scoring data will appear here after the match
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[400px] overflow-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Score Breakdown</span>
          <Badge variant="secondary" className="text-xs">2025 Reefscape</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Scores */}
        <div className="grid grid-cols-2 gap-3">
          {/* Red Alliance */}
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
            <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-2">RED ALLIANCE</p>
            <div className="space-y-1">
              <ScoreLine label="Auto" value={redBreakdown?.auto_points} />
              <ScoreLine label="Teleop" value={redBreakdown?.teleop_points} />
              <ScoreLine label="Endgame" value={redBreakdown?.endgame_points} />
              <div className="pt-1 border-t border-red-300 dark:border-red-700">
                <ScoreLine label="Total" value={redBreakdown?.total_points} bold />
              </div>
            </div>
          </div>

          {/* Blue Alliance */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">BLUE ALLIANCE</p>
            <div className="space-y-1">
              <ScoreLine label="Auto" value={blueBreakdown?.auto_points} />
              <ScoreLine label="Teleop" value={blueBreakdown?.teleop_points} />
              <ScoreLine label="Endgame" value={blueBreakdown?.endgame_points} />
              <div className="pt-1 border-t border-blue-300 dark:border-blue-700">
                <ScoreLine label="Total" value={blueBreakdown?.total_points} bold />
              </div>
            </div>
          </div>
        </div>

        {/* Game Elements - Coral Scoring */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            <span>🪸</span> Coral Scored on Reef
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            {['L1', 'L2', 'L3', 'L4'].map((level, idx) => (
              <div key={level} className="rounded bg-gray-100 p-2 dark:bg-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">{level}</p>
                <div className="flex gap-1 justify-center mt-1">
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {getCoralValue(redBreakdown, idx) ?? '-'}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {getCoralValue(blueBreakdown, idx) ?? '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Algae Scoring */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            <span>🌿</span> Algae Scored
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-gray-100 p-2 dark:bg-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">Barge</p>
              <div className="flex gap-1 justify-center mt-1">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {redBreakdown?.algae_barge ?? '-'}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {blueBreakdown?.algae_barge ?? '-'}
                </span>
              </div>
            </div>
            <div className="rounded bg-gray-100 p-2 dark:bg-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">Processor</p>
              <div className="flex gap-1 justify-center mt-1">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {redBreakdown?.algae_processor ?? '-'}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {blueBreakdown?.algae_processor ?? '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Endgame - Cage Climb */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            <span>🧗</span> Cage Climb
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-gray-100 p-2 dark:bg-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">Shallow</p>
              <div className="flex gap-1 justify-center mt-1">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {redBreakdown?.cage_shallow ?? '-'}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {blueBreakdown?.cage_shallow ?? '-'}
                </span>
              </div>
            </div>
            <div className="rounded bg-gray-100 p-2 dark:bg-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">Deep</p>
              <div className="flex gap-1 justify-center mt-1">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {redBreakdown?.cage_deep ?? '-'}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {blueBreakdown?.cage_deep ?? '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreLine({ label, value, bold = false }: { label: string; value: number | null | undefined; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className={`text-gray-700 dark:text-gray-300 ${bold ? 'font-bold' : ''}`}>
        {label}:
      </span>
      <span className={`text-gray-900 dark:text-gray-100 ${bold ? 'font-bold text-base' : ''}`}>
        {value ?? '-'}
      </span>
    </div>
  );
}

function getCoralValue(
  breakdown: ScoreBreakdown | Record<string, number | null> | null,
  levelIndex: number
): number | null {
  if (!breakdown) return null;

  // Handle specific ScoreBreakdown type
  if ('coral_L1' in breakdown) {
    const levels = [breakdown.coral_L1, breakdown.coral_L2, breakdown.coral_L3, breakdown.coral_L4];
    return levels[levelIndex];
  }

  // Handle generic Record type
  const levelKey = `coral_L${levelIndex + 1}`;
  return breakdown[levelKey] as number | null ?? null;
}
