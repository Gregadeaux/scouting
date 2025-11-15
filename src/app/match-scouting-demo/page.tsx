'use client';

import { useState } from 'react';
import { MatchScoutingProvider, useMatchScouting } from '@/contexts/MatchScoutingContext';
import { AutoPeriod, TeleopPeriod, EndgamePeriod } from '@/components/match-scouting-v2/periods';
import {
  PeriodTimer,
  UndoButton,
  QuickNotes,
  SubmitButton,
} from '@/components/match-scouting-v2/controls';

// ============================================================================
// Demo Content Component
// ============================================================================

function MatchScoutingDemo() {
  const { state, startMatch, setPeriod } = useMatchScouting();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize demo data
  const handleStartDemo = () => {
    startMatch();
    setIsInitialized(true);
  };

  // Render period-specific component
  const renderPeriodComponent = () => {
    switch (state.currentPeriod) {
      case 'pre-match':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6 p-8">
              <h2 className="text-3xl font-bold text-gray-800">Match Scouting Demo</h2>
              <p className="text-gray-600">
                This demo showcases the FRC 2025 Reefscape match scouting interface.
              </p>
              <button
                onClick={handleStartDemo}
                className="px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Match
              </button>
            </div>
          </div>
        );
      case 'auto':
        return <AutoPeriod />;
      case 'teleop':
        return <TeleopPeriod />;
      case 'endgame':
        return <EndgamePeriod />;
      case 'submitted':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6 p-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-16 h-16 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800">Submitted!</h2>
              <p className="text-gray-600">Scouting data has been recorded.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Timer Header */}
      {isInitialized && <PeriodTimer />}

      {/* Main Content Area */}
      <div className="flex-1 relative min-h-0">{renderPeriodComponent()}</div>

      {/* Bottom Controls */}
      {isInitialized && state.currentPeriod !== 'pre-match' && state.currentPeriod !== 'submitted' && (
        <div className="bg-white border-t shadow-lg p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* Left: Undo Button */}
            <UndoButton />

            {/* Center: Quick Notes */}
            <div className="flex-1 max-w-md">
              <QuickNotes />
            </div>

            {/* Right: Period Navigation & Submit */}
            <div className="flex items-center gap-3">
              {/* Manual Period Navigation */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPeriod('auto')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    state.currentPeriod === 'auto'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Auto
                </button>
                <button
                  onClick={() => setPeriod('teleop')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    state.currentPeriod === 'teleop'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Teleop
                </button>
                <button
                  onClick={() => setPeriod('endgame')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    state.currentPeriod === 'endgame'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Endgame
                </button>
              </div>

              {/* Submit Button */}
              <SubmitButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default function MatchScoutingDemoPage() {
  return (
    <MatchScoutingProvider>
      <MatchScoutingDemo />
    </MatchScoutingProvider>
  );
}
