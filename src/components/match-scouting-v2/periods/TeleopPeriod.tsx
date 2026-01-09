'use client';

import { FieldOverlay } from '../field/FieldOverlay';
import { ClickableRegion } from '../field/ClickableRegion';
import { useMatchScouting } from '@/contexts/MatchScoutingContext';

// ============================================================================
// Component
// ============================================================================

export function TeleopPeriod() {
  const { state, increment, decrement } = useMatchScouting();
  const { teleopPerformance } = state;

  // Approximate field coordinates (will be refined later)
  const centerX = 877;
  const centerY = 450;

  const rightX = 1505;
  const topY = 150;

  // Reef levels at center
  const reefLevels = [
    {
      level: 'L1' as const,
      field: 'coral_scored_L1' as const,
      color: '#34d399',
      y: centerY + 250,
    },
    {
      level: 'L2' as const,
      field: 'coral_scored_L2' as const,
      color: '#60a5fa',
      y: centerY + 100,
    },
    {
      level: 'L3' as const,
      field: 'coral_scored_L3' as const,
      color: '#fbbf24',
      y: centerY - 100,
    },
    {
      level: 'L4' as const,
      field: 'coral_scored_L4' as const,
      color: '#f87171',
      y: centerY - 250,
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Field with scoring zones */}
      <div className="flex-1 relative min-h-0">
        <FieldOverlay
          backgroundImage="/field-images/reefscape-teleop.png"
          viewBox="0 0 1755 805"
          backgroundOpacity={0.3}
        >
          {/* Center Reef - Coral Scoring */}
          {reefLevels.map(({ level, field, color, y }) => (
            <ClickableRegion
              key={level}
              shape="rect"
              coords={{ x: centerX - 175, y: y - 100, width: 300, height: 125 }}
              onClick={() => increment('teleop', field)}
              onLongPress={() => decrement('teleop', field)}
              label={level}
              labelPosition="center"
              count={teleopPerformance[field]}
              color={color}
            />
          ))}

          {/* Right Side - Barge (Algae) */}
          <ClickableRegion
            shape="rect"
            coords={{ x: rightX - 195, y: topY - 240, width: 150, height: 450 }}
            onClick={() => increment('teleop', 'algae_scored_barge')}
            onLongPress={() => decrement('teleop', 'algae_scored_barge')}
            label="Barge"
            labelPosition="center"
            count={teleopPerformance.algae_scored_barge}
            color="#06b6d4"
          />

          {/* Top - Net (Algae) */}
          <ClickableRegion
            shape="rect"
            coords={{ x: centerX + 90, y: centerY + 350, width: 145, height: 100 }}
            onClick={() => increment('teleop', 'algae_scored_processor')}
            onLongPress={() => decrement('teleop', 'algae_scored_processor')}
            label="Processor"
            labelPosition="center"
            count={teleopPerformance.algae_scored_processor}
            color="#105fb9ff"
          />

          {/* Missed Counters - Bottom corners */}
          <ClickableRegion
            shape="circle"
            coords={{ cx: 200, cy: 700, r: 40 }}
            onClick={() => increment('teleop', 'coral_missed')}
            onLongPress={() => decrement('teleop', 'coral_missed')}
            label="Coral Miss"
            labelPosition="top"
            count={teleopPerformance.coral_missed}
            color="#ef4444"
          />

          <ClickableRegion
            shape="circle"
            coords={{ cx: 1555, cy: 700, r: 40 }}
            onClick={() => increment('teleop', 'algae_missed')}
            onLongPress={() => decrement('teleop', 'algae_missed')}
            label="Algae Miss"
            labelPosition="top"
            count={teleopPerformance.algae_missed}
            color="#f97316"
          />
        </FieldOverlay>
      </div>

      {/* Bottom Stats Bar */}
      {/* <div className="bg-white border-t shadow-md p-3">
        <div className="max-w-6xl mx-auto grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-gray-800">
              {teleopPerformance.coral_scored_L1 +
                teleopPerformance.coral_scored_L2 +
                teleopPerformance.coral_scored_L3 +
                teleopPerformance.coral_scored_L4}
            </div>
            <div className="text-xs text-gray-600">Coral</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-800">
              {teleopPerformance.algae_scored_barge + teleopPerformance.algae_scored_processor}
            </div>
            <div className="text-xs text-gray-600">Algae</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-800">{teleopPerformance.cycles_completed}</div>
            <div className="text-xs text-gray-600">Cycles</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-600">
              {teleopPerformance.coral_missed + teleopPerformance.algae_missed}
            </div>
            <div className="text-xs text-gray-600">Missed</div>
          </div>
        </div>
      </div> */}
    </div>
  );
}
