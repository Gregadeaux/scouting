'use client';

import { useMatchScouting } from '@/contexts/MatchScoutingContext';
import { cn } from '@/lib/utils';

// ============================================================================
// Component
// ============================================================================

export function EndgamePeriod() {
  const { state, toggle, increment, decrement } = useMatchScouting();
  const { endgamePerformance, teleopPerformance } = state;

  return (
    <div className="relative w-full h-full flex flex-col bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Main Content - Centered Layout */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-6">
          {/* Cage Climbing Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Cage Climbing</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => toggle('endgame', 'cage_climb_attempted')}
                className={cn(
                  'min-h-[80px] px-6 py-4 rounded-lg font-semibold text-lg transition-all',
                  'border-2',
                  endgamePerformance.cage_climb_attempted
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                )}
              >
                {endgamePerformance.cage_climb_attempted ? '✓ ' : ''}Climb Attempted
              </button>

              <button
                onClick={() => toggle('endgame', 'cage_climb_successful')}
                className={cn(
                  'min-h-[80px] px-6 py-4 rounded-lg font-semibold text-lg transition-all',
                  'border-2',
                  endgamePerformance.cage_climb_successful
                    ? 'bg-green-600 text-white border-green-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                )}
              >
                {endgamePerformance.cage_climb_successful ? '✓ ' : ''}Climb Successful
              </button>
            </div>
          </div>

          {/* Algae Scoring Continues */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Continue Scoring</h2>
            <div className="grid grid-cols-3 gap-4">
              {/* Processor */}
              <button
                onClick={() => increment('teleop', 'algae_scored_processor')}
                onContextMenu={(e) => {
                  e.preventDefault();
                  decrement('teleop', 'algae_scored_processor');
                }}
                className={cn(
                  'min-h-[100px] px-4 py-3 rounded-lg font-semibold transition-all',
                  'border-2 bg-purple-100 border-purple-400 hover:bg-purple-200'
                )}
              >
                <div className="text-4xl font-bold text-purple-800">
                  {teleopPerformance.algae_scored_processor}
                </div>
                <div className="text-sm text-purple-700 mt-1">Processor</div>
              </button>

              {/* Net */}
              <button
                onClick={() => increment('teleop', 'algae_scored_processor')}
                onContextMenu={(e) => {
                  e.preventDefault();
                  decrement('teleop', 'algae_scored_processor');
                }}
                className={cn(
                  'min-h-[100px] px-4 py-3 rounded-lg font-semibold transition-all',
                  'border-2 bg-green-100 border-green-400 hover:bg-green-200'
                )}
              >
                <div className="text-4xl font-bold text-green-800">
                  {teleopPerformance.algae_scored_processor}
                </div>
                <div className="text-sm text-green-700 mt-1">Net</div>
              </button>

              {/* Trap - Add to endgame if not already tracked */}
              <button
                onClick={() => increment('endgame', 'endgame_points')}
                onContextMenu={(e) => {
                  e.preventDefault();
                  decrement('endgame', 'endgame_points');
                }}
                className={cn(
                  'min-h-[100px] px-4 py-3 rounded-lg font-semibold transition-all',
                  'border-2 bg-amber-100 border-amber-400 hover:bg-amber-200'
                )}
              >
                <div className="text-4xl font-bold text-amber-800">{endgamePerformance.endgame_points}</div>
                <div className="text-sm text-amber-700 mt-1">Trap</div>
              </button>
            </div>
          </div>

          {/* Robot Status */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Robot Status</h2>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => toggle('overall', 'robotBroke')}
                className={cn(
                  'min-h-[70px] px-4 py-3 rounded-lg font-semibold transition-all',
                  'border-2',
                  state.robotBroke
                    ? 'bg-red-600 text-white border-red-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                )}
              >
                {state.robotBroke ? '✓ ' : ''}Broke
              </button>

              <button
                onClick={() => toggle('overall', 'tippedOver')}
                className={cn(
                  'min-h-[70px] px-4 py-3 rounded-lg font-semibold transition-all',
                  'border-2',
                  state.tippedOver
                    ? 'bg-orange-600 text-white border-orange-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                )}
              >
                {state.tippedOver ? '✓ ' : ''}Tipped Over
              </button>

              <button
                onClick={() => toggle('overall', 'wasTipped')}
                className={cn(
                  'min-h-[70px] px-4 py-3 rounded-lg font-semibold transition-all',
                  'border-2',
                  state.wasTipped
                    ? 'bg-yellow-600 text-white border-yellow-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                )}
              >
                {state.wasTipped ? '✓ ' : ''}Was Tipped
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="bg-white border-t shadow-md p-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm text-gray-600">
            {endgamePerformance.cage_climb_successful && <span className="text-green-600 font-bold">✓ Climbed</span>}
            {!endgamePerformance.cage_climb_successful && endgamePerformance.cage_climb_attempted && (
              <span className="text-orange-600 font-bold">⚠ Climb Failed</span>
            )}
            {!endgamePerformance.cage_climb_attempted && (
              <span className="text-gray-500">No Climb Attempted</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
