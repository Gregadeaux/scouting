import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import {
  extractAllianceBreakdown,
  towerLevelToPoints,
  type TBAScoreBreakdown2026Alliance,
  type TowerLevel,
} from '@/types/tba-score-breakdown-2026';

// ============================================================================
// SHARED TYPES & COMPONENTS
// ============================================================================

interface ScoreBreakdown2025 {
  total_points: number | null;
  auto_points: number | null;
  teleop_points: number | null;
  endgame_points: number | null;
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
  redBreakdown: ScoreBreakdown2025 | Record<string, unknown> | null;
  blueBreakdown: ScoreBreakdown2025 | Record<string, unknown> | null;
  eventKey?: string;
}

export function ScoreBreakdownCard({ redBreakdown, blueBreakdown, eventKey }: ScoreBreakdownCardProps) {
  const hasData = redBreakdown !== null || blueBreakdown !== null;

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

  const season = eventKey ? parseInt(eventKey.substring(0, 4), 10) : 2025;

  if (season >= 2026) {
    return (
      <ScoreBreakdown2026View
        redBreakdown={redBreakdown as Record<string, unknown> | null}
        blueBreakdown={blueBreakdown as Record<string, unknown> | null}
      />
    );
  }

  return (
    <ScoreBreakdown2025View
      redBreakdown={redBreakdown}
      blueBreakdown={blueBreakdown}
    />
  );
}

// ============================================================================
// 2025 REEFSCAPE VIEW
// ============================================================================

function ScoreBreakdown2025View({
  redBreakdown,
  blueBreakdown,
}: {
  redBreakdown: ScoreBreakdown2025 | Record<string, unknown> | null;
  blueBreakdown: ScoreBreakdown2025 | Record<string, unknown> | null;
}) {
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
          <AllianceSummary
            alliance="red"
            autoPoints={getVal(redBreakdown, 'auto_points')}
            teleopPoints={getVal(redBreakdown, 'teleop_points')}
            endgamePoints={getVal(redBreakdown, 'endgame_points')}
            totalPoints={getVal(redBreakdown, 'total_points')}
          />
          <AllianceSummary
            alliance="blue"
            autoPoints={getVal(blueBreakdown, 'auto_points')}
            teleopPoints={getVal(blueBreakdown, 'teleop_points')}
            endgamePoints={getVal(blueBreakdown, 'endgame_points')}
            totalPoints={getVal(blueBreakdown, 'total_points')}
          />
        </div>

        {/* Coral Scoring */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            Coral Scored on Reef
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            {['L1', 'L2', 'L3', 'L4'].map((level, idx) => (
              <div key={level} className="rounded bg-gray-100 p-2 dark:bg-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">{level}</p>
                <RedBlueValues
                  red={getCoralValue(redBreakdown, idx)}
                  blue={getCoralValue(blueBreakdown, idx)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Algae Scoring */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            Algae Scored
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ComparisonCell label="Barge" red={getVal(redBreakdown, 'algae_barge')} blue={getVal(blueBreakdown, 'algae_barge')} />
            <ComparisonCell label="Processor" red={getVal(redBreakdown, 'algae_processor')} blue={getVal(blueBreakdown, 'algae_processor')} />
          </div>
        </div>

        {/* Endgame - Cage Climb */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            Cage Climb
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ComparisonCell label="Shallow" red={getVal(redBreakdown, 'cage_shallow')} blue={getVal(blueBreakdown, 'cage_shallow')} />
            <ComparisonCell label="Deep" red={getVal(redBreakdown, 'cage_deep')} blue={getVal(blueBreakdown, 'cage_deep')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 2026 VIEW
// ============================================================================

function ScoreBreakdown2026View({
  redBreakdown,
  blueBreakdown,
}: {
  redBreakdown: Record<string, unknown> | null;
  blueBreakdown: Record<string, unknown> | null;
}) {
  const red = extractAllianceBreakdown(redBreakdown ? { red: redBreakdown } : null, 'red');
  const blue = extractAllianceBreakdown(blueBreakdown ? { blue: blueBreakdown } : null, 'blue');

  if (!red && !blue) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Score Breakdown</span>
            <Badge variant="secondary" className="text-xs">2026</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">No 2026 score breakdown available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-auto max-h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Score Breakdown</span>
          <Badge variant="secondary" className="text-xs">2026</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Scores */}
        <div className="grid grid-cols-2 gap-3">
          <AllianceSummary
            alliance="red"
            autoPoints={red?.totalAutoPoints ?? null}
            teleopPoints={red?.totalTeleopPoints ?? null}
            endgamePoints={red?.endGameTowerPoints ?? null}
            totalPoints={red?.totalPoints ?? null}
            foulPoints={red?.foulPoints}
          />
          <AllianceSummary
            alliance="blue"
            autoPoints={blue?.totalAutoPoints ?? null}
            teleopPoints={blue?.totalTeleopPoints ?? null}
            endgamePoints={blue?.endGameTowerPoints ?? null}
            totalPoints={blue?.totalPoints ?? null}
            foulPoints={blue?.foulPoints}
          />
        </div>

        {/* Hub Scoring by Phase */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Hub Scoring by Phase
          </h4>
          <div className="space-y-1">
            {HUB_PHASES.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-[1fr_80px_80px] gap-1 items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className="text-right font-medium text-red-600 dark:text-red-400">
                  {red ? `${getHubCount(red, key)} (${getHubPoints(red, key)}pt)` : '-'}
                </span>
                <span className="text-right font-medium text-blue-600 dark:text-blue-400">
                  {blue ? `${getHubCount(blue, key)} (${getHubPoints(blue, key)}pt)` : '-'}
                </span>
              </div>
            ))}
            {/* Total row */}
            <div className="grid grid-cols-[1fr_80px_80px] gap-1 items-center text-xs pt-1 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Total Hub</span>
              <span className="text-right font-bold text-red-600 dark:text-red-400">
                {red ? `${red.hubScore.totalCount} (${red.hubScore.totalPoints}pt)` : '-'}
              </span>
              <span className="text-right font-bold text-blue-600 dark:text-blue-400">
                {blue ? `${blue.hubScore.totalCount} (${blue.hubScore.totalPoints}pt)` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Per-Robot Tower Levels */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Tower Levels (Per Robot)
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <TowerTable alliance="red" breakdown={red} />
            <TowerTable alliance="blue" breakdown={blue} />
          </div>
        </div>

        {/* Alliance Bonuses */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Alliance Bonuses
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            {BONUS_KEYS.map(({ key, label }) => (
              <div key={key} className="rounded bg-gray-100 p-2 dark:bg-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</p>
                <div className="flex gap-1 justify-center">
                  <BonusBadge achieved={red ? getBonusValue(red, key) : false} alliance="red" />
                  <span className="text-gray-400">/</span>
                  <BonusBadge achieved={blue ? getBonusValue(blue, key) : false} alliance="blue" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fouls */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Fouls
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ComparisonCell label="Minor" red={red?.minorFoulCount ?? null} blue={blue?.minorFoulCount ?? null} />
            <ComparisonCell label="Major" red={red?.majorFoulCount ?? null} blue={blue?.majorFoulCount ?? null} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 2026 HELPERS
// ============================================================================

const HUB_PHASES = [
  { key: 'auto', label: 'Auto' },
  { key: 'transition', label: 'Transition' },
  { key: 'shift1', label: 'Shift 1' },
  { key: 'shift2', label: 'Shift 2' },
  { key: 'shift3', label: 'Shift 3' },
  { key: 'shift4', label: 'Shift 4' },
  { key: 'endgame', label: 'Endgame' },
] as const;

type HubPhaseKey = typeof HUB_PHASES[number]['key'];

function getHubCount(breakdown: TBAScoreBreakdown2026Alliance, phase: HubPhaseKey): number {
  const hs = breakdown.hubScore;
  return hs[`${phase}Count` as keyof typeof hs] as number ?? 0;
}

function getHubPoints(breakdown: TBAScoreBreakdown2026Alliance, phase: HubPhaseKey): number {
  const hs = breakdown.hubScore;
  return hs[`${phase}Points` as keyof typeof hs] as number ?? 0;
}

const BONUS_KEYS = [
  { key: 'energized', label: 'Energized' },
  { key: 'supercharged', label: 'Supercharged' },
  { key: 'traversal', label: 'Traversal' },
] as const;

type BonusKey = typeof BONUS_KEYS[number]['key'];

function getBonusValue(breakdown: TBAScoreBreakdown2026Alliance, bonus: BonusKey): boolean {
  switch (bonus) {
    case 'energized': return breakdown.energizedAchieved;
    case 'supercharged': return breakdown.superchargedAchieved;
    case 'traversal': return breakdown.traversalAchieved;
  }
}

function TowerTable({
  alliance,
  breakdown,
}: {
  alliance: 'red' | 'blue';
  breakdown: TBAScoreBreakdown2026Alliance | null;
}) {
  const borderColor = alliance === 'red'
    ? 'border-red-200 dark:border-red-800'
    : 'border-blue-200 dark:border-blue-800';
  const bgColor = alliance === 'red'
    ? 'bg-red-50 dark:bg-red-950/20'
    : 'bg-blue-50 dark:bg-blue-950/20';
  const labelColor = alliance === 'red'
    ? 'text-red-900 dark:text-red-100'
    : 'text-blue-900 dark:text-blue-100';

  if (!breakdown) {
    return (
      <div className={`rounded-lg border ${borderColor} ${bgColor} p-2`}>
        <p className={`text-xs font-semibold ${labelColor} mb-1`}>{alliance.toUpperCase()}</p>
        <p className="text-xs text-gray-500">No data</p>
      </div>
    );
  }

  const robots = [1, 2, 3] as const;

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-2`}>
      <p className={`text-xs font-semibold ${labelColor} mb-1`}>{alliance.toUpperCase()}</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 dark:text-gray-400">
            <th className="text-left font-normal">Robot</th>
            <th className="text-center font-normal">Auto</th>
            <th className="text-center font-normal">Endgame</th>
          </tr>
        </thead>
        <tbody>
          {robots.map((pos) => {
            const autoLevel = breakdown[`autoTowerRobot${pos}` as keyof TBAScoreBreakdown2026Alliance] as TowerLevel;
            const endLevel = breakdown[`endGameTowerRobot${pos}` as keyof TBAScoreBreakdown2026Alliance] as TowerLevel;
            return (
              <tr key={pos}>
                <td className={`py-0.5 ${labelColor}`}>R{pos}</td>
                <td className="text-center py-0.5">
                  <TowerLevelBadge level={autoLevel} period="auto" />
                </td>
                <td className="text-center py-0.5">
                  <TowerLevelBadge level={endLevel} period="endgame" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TowerLevelBadge({ level, period }: { level: TowerLevel; period: 'auto' | 'endgame' }) {
  if (level === 'None') {
    return <span className="text-gray-400">-</span>;
  }

  const pts = towerLevelToPoints(level, period);
  const colorMap: Record<string, string> = {
    Level1: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    Level2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    Level3: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  };

  return (
    <span className={`inline-block rounded px-1 py-0.5 text-[10px] font-medium ${colorMap[level] ?? ''}`}>
      {level.replace('Level', 'L')} ({pts}pt)
    </span>
  );
}

function BonusBadge({ achieved, alliance }: { achieved: boolean; alliance: 'red' | 'blue' }) {
  if (achieved) {
    const color = alliance === 'red'
      ? 'text-red-600 dark:text-red-400'
      : 'text-blue-600 dark:text-blue-400';
    return <span className={`text-sm font-bold ${color}`}>Y</span>;
  }
  return <span className="text-sm text-gray-400">N</span>;
}

// ============================================================================
// SHARED HELPER COMPONENTS
// ============================================================================

function AllianceSummary({
  alliance,
  autoPoints,
  teleopPoints,
  endgamePoints,
  totalPoints,
  foulPoints,
}: {
  alliance: 'red' | 'blue';
  autoPoints: number | null;
  teleopPoints: number | null;
  endgamePoints: number | null;
  totalPoints: number | null;
  foulPoints?: number;
}) {
  const border = alliance === 'red'
    ? 'border-red-200 dark:border-red-800'
    : 'border-blue-200 dark:border-blue-800';
  const bg = alliance === 'red'
    ? 'bg-red-50 dark:bg-red-950/20'
    : 'bg-blue-50 dark:bg-blue-950/20';
  const label = alliance === 'red'
    ? 'text-red-900 dark:text-red-100'
    : 'text-blue-900 dark:text-blue-100';
  const divider = alliance === 'red'
    ? 'border-red-300 dark:border-red-700'
    : 'border-blue-300 dark:border-blue-700';

  return (
    <div className={`rounded-lg border-2 ${border} ${bg} p-3`}>
      <p className={`text-xs font-semibold ${label} mb-2`}>{alliance.toUpperCase()} ALLIANCE</p>
      <div className="space-y-1">
        <ScoreLine label="Auto" value={autoPoints} />
        <ScoreLine label="Teleop" value={teleopPoints} />
        <ScoreLine label="Endgame" value={endgamePoints} />
        {foulPoints !== undefined && <ScoreLine label="Foul Pts" value={foulPoints} />}
        <div className={`pt-1 border-t ${divider}`}>
          <ScoreLine label="Total" value={totalPoints} bold />
        </div>
      </div>
    </div>
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

function RedBlueValues({ red, blue }: { red: number | null; blue: number | null }) {
  return (
    <div className="flex gap-1 justify-center mt-1">
      <span className="text-sm font-semibold text-red-600 dark:text-red-400">{red ?? '-'}</span>
      <span className="text-gray-400">/</span>
      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{blue ?? '-'}</span>
    </div>
  );
}

function ComparisonCell({ label, red, blue }: { label: string; red: number | null; blue: number | null }) {
  return (
    <div className="rounded bg-gray-100 p-2 dark:bg-gray-800">
      <p className="text-xs text-gray-600 dark:text-gray-400 text-center">{label}</p>
      <RedBlueValues red={red} blue={blue} />
    </div>
  );
}

// ============================================================================
// SHARED HELPER FUNCTIONS
// ============================================================================

function getVal(
  breakdown: ScoreBreakdown2025 | Record<string, unknown> | null,
  key: string
): number | null {
  if (!breakdown) return null;
  const v = (breakdown as Record<string, unknown>)[key];
  return typeof v === 'number' ? v : null;
}

function getCoralValue(
  breakdown: ScoreBreakdown2025 | Record<string, unknown> | null,
  levelIndex: number
): number | null {
  if (!breakdown) return null;

  if ('coral_L1' in breakdown) {
    const b = breakdown as ScoreBreakdown2025;
    const levels = [b.coral_L1, b.coral_L2, b.coral_L3, b.coral_L4];
    return levels[levelIndex];
  }

  const levelKey = `coral_L${levelIndex + 1}`;
  const v = (breakdown as Record<string, unknown>)[levelKey];
  return typeof v === 'number' ? v : null;
}
