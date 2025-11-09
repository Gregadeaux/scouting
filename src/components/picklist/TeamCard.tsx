/**
 * Team Card Component
 *
 * Displays a single team with metrics and picked status.
 * Strikethrough styling when picked, color coding for top 8.
 */

'use client';

import { Check, CheckCircle2 } from 'lucide-react';
import type { PickListTeam } from '@/types/picklist';

interface TeamCardProps {
  team: PickListTeam;
  isPicked: boolean;
  onTogglePicked: (teamNumber: number) => void;
  isTopEight: boolean;
}

export function TeamCard({ team, isPicked, onTogglePicked, isTopEight }: TeamCardProps) {
  return (
    <div
      className={`
        relative rounded-lg border p-4 transition-all cursor-pointer
        ${isPicked ? 'bg-gray-100 dark:bg-gray-800 opacity-50' : 'bg-white dark:bg-gray-900'}
        ${isTopEight && !isPicked ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-200 dark:border-gray-700'}
        hover:shadow-md
      `}
      onClick={() => onTogglePicked(team.teamNumber)}
      title={`Click to ${isPicked ? 'unmark' : 'mark'} as picked`}
    >
      {/* Picked checkbox indicator */}
      <div className="absolute top-2 right-2">
        {isPicked ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600" />
        )}
      </div>

      {/* Team number and name */}
      <div className="mb-3">
        <div className={`flex items-baseline gap-2 ${isPicked ? 'line-through' : ''}`}>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {team.teamNumber}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            #{team.rank}
          </span>
        </div>

        {team.teamNickname && (
          <p className={`text-sm text-gray-600 dark:text-gray-300 mt-1 ${isPicked ? 'line-through' : ''}`}>
            {team.teamNickname}
          </p>
        )}
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <MetricBadge
          label="OPR"
          value={team.opr.toFixed(1)}
          isPicked={isPicked}
          color="blue"
        />
        <MetricBadge
          label="DPR"
          value={team.dpr.toFixed(1)}
          isPicked={isPicked}
          color="red"
        />
        <MetricBadge
          label="CCWM"
          value={team.ccwm.toFixed(1)}
          isPicked={isPicked}
          color="purple"
        />
        <MetricBadge
          label="Score"
          value={team.compositeScore.toFixed(3)}
          isPicked={isPicked}
          color="green"
        />
      </div>

      {/* Additional metrics */}
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
        {team.avgAutoScore !== undefined && (
          <div className={`flex justify-between ${isPicked ? 'line-through' : ''}`}>
            <span>Auto:</span>
            <span className="font-medium">{team.avgAutoScore.toFixed(1)}</span>
          </div>
        )}
        {team.avgTeleopScore !== undefined && (
          <div className={`flex justify-between ${isPicked ? 'line-through' : ''}`}>
            <span>Teleop:</span>
            <span className="font-medium">{team.avgTeleopScore.toFixed(1)}</span>
          </div>
        )}
        {team.avgEndgameScore !== undefined && (
          <div className={`flex justify-between ${isPicked ? 'line-through' : ''}`}>
            <span>Endgame:</span>
            <span className="font-medium">{team.avgEndgameScore.toFixed(1)}</span>
          </div>
        )}
        {team.reliabilityScore !== undefined && (
          <div className={`flex justify-between ${isPicked ? 'line-through' : ''}`}>
            <span>Reliability:</span>
            <span className="font-medium">{team.reliabilityScore.toFixed(0)}%</span>
          </div>
        )}
      </div>

      {/* Strengths/Weaknesses tooltip content (shown on hover via title) */}
      {(team.strengths.length > 0 || team.weaknesses.length > 0) && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {team.strengths.length > 0 && (
            <div className={`text-xs ${isPicked ? 'line-through' : ''}`}>
              <span className="text-green-600 dark:text-green-400 font-medium">+</span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">
                {team.strengths.slice(0, 2).join(', ')}
              </span>
            </div>
          )}
          {team.weaknesses.length > 0 && (
            <div className={`text-xs ${isPicked ? 'line-through' : ''}`}>
              <span className="text-red-600 dark:text-red-400 font-medium">-</span>
              <span className="text-gray-600 dark:text-gray-400 ml-1">
                {team.weaknesses.slice(0, 2).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MetricBadgeProps {
  label: string;
  value: string;
  isPicked: boolean;
  color: 'blue' | 'red' | 'purple' | 'green';
}

function MetricBadge({ label, value, isPicked, color }: MetricBadgeProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  return (
    <div
      className={`
        px-2 py-1 rounded text-center ${colorClasses[color]}
        ${isPicked ? 'line-through opacity-60' : ''}
      `}
    >
      <div className="font-medium">{value}</div>
      <div className="text-[10px] opacity-75">{label}</div>
    </div>
  );
}
