'use client';

import { FieldOverlay } from '../field/FieldOverlay';
import { ClickableRegion } from '../field/ClickableRegion';
import { useMatchScouting } from '@/contexts/MatchScoutingContext';
import { cn } from '@/lib/utils';

// ============================================================================
// Component
// ============================================================================

export function AutoPeriod() {
  const { state, increment, decrement, toggle } = useMatchScouting();
  const { autoPerformance } = state;

  // Field center coordinates (approximate)
  const centerX = 877;
  const centerY = 402;

  // Reef levels stacked vertically
  const reefLevels = [
    {
      level: 'L1' as const,
      field: 'coral_scored_L1' as const,
      color: '#34d399', // green
      y: centerY + 150,
    },
    {
      level: 'L2' as const,
      field: 'coral_scored_L2' as const,
      color: '#60a5fa', // blue
      y: centerY + 50,
    },
    {
      level: 'L3' as const,
      field: 'coral_scored_L3' as const,
      color: '#fbbf24', // yellow
      y: centerY - 50,
    },
    {
      level: 'L4' as const,
      field: 'coral_scored_L4' as const,
      color: '#f87171', // red
      y: centerY - 150,
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Field with scoring zones */}
      <div className="flex-1 relative min-h-0">
        <FieldOverlay
          backgroundImage="/field-images/reefscape-auto.png"
          viewBox="0 0 1755 805"
          backgroundOpacity={0.3}
        >
          {/* Reef Coral Scoring - Vertical Stack at Center */}
          {reefLevels.map(({ level, field, color, y }) => (
            <ClickableRegion
              key={level}
              shape="circle"
              coords={{ cx: centerX, cy: y, r: 50 }}
              onClick={() => increment('auto', field)}
              onLongPress={() => decrement('auto', field)}
              label={level}
              labelPosition="center"
              count={autoPerformance[field]}
              color={color}
            />
          ))}

          {/* Missed Counter - Right side */}
          <ClickableRegion
            shape="circle"
            coords={{ cx: centerX + 200, cy: centerY, r: 50 }}
            onClick={() => increment('auto', 'coral_missed')}
            onLongPress={() => decrement('auto', 'coral_missed')}
            label="Missed"
            labelPosition="top"
            count={autoPerformance.coral_missed}
            color="#ef4444"
          />
        </FieldOverlay>
      </div>

      {/* Bottom Controls */}
      <div className="bg-white border-t shadow-md p-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-4">
            {/* Mobility Toggle */}
            <button
              onClick={() => toggle('auto', 'left_starting_zone')}
              className={cn(
                'min-h-[60px] px-6 py-3 rounded-lg font-semibold text-lg transition-all',
                'border-2',
                autoPerformance.left_starting_zone
                  ? 'bg-green-600 text-white border-green-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              )}
            >
              {autoPerformance.left_starting_zone ? '✓ ' : ''}Left Starting Zone
            </button>

            {/* Summary Stats */}
            <div className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-gray-300 px-4 py-2">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">
                  {autoPerformance.coral_scored_L1 +
                    autoPerformance.coral_scored_L2 +
                    autoPerformance.coral_scored_L3 +
                    autoPerformance.coral_scored_L4}
                </div>
                <div className="text-sm text-gray-600">Total Coral Scored</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
