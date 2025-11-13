'use client';

import { useState, useEffect } from 'react';
import { useMatchScouting } from '@/contexts/MatchScoutingContext';
import { PeriodTimer } from './controls/PeriodTimer';
import { UndoButton } from './controls/UndoButton';
import { QuickNotes } from './controls/QuickNotes';
import { SubmitButton } from './controls/SubmitButton';
import { PreMatchSetup } from './modals/PreMatchSetup';
import { AutoPeriod } from './periods/AutoPeriod';
import { TeleopPeriod } from './periods/TeleopPeriod';
import { EndgamePeriod } from './periods/EndgamePeriod';

export function MatchScoutingInterface() {
  const { state } = useMatchScouting();
  const [showPreMatch, setShowPreMatch] = useState(true);

  // Show pre-match setup when in pre-match period
  useEffect(() => {
    if (state.currentPeriod === 'pre-match') {
      setShowPreMatch(true);
    }
  }, [state.currentPeriod]);

  // Prevent orientation issues on mobile
  useEffect(() => {
    // Lock to landscape if possible (requires user permission on iOS)
    const lockOrientation = async () => {
      try {
        // @ts-ignore - ScreenOrientation API not fully typed
        if (screen.orientation && screen.orientation.lock) {
          // @ts-ignore
          await screen.orientation.lock('landscape');
        }
      } catch (err) {
        // Orientation lock not supported or denied
        console.log('Orientation lock not supported');
      }
    };

    lockOrientation();

    return () => {
      // @ts-ignore - ScreenOrientation API not fully typed
      if (screen.orientation && screen.orientation.unlock) {
        // @ts-ignore
        screen.orientation.unlock();
      }
    };
  }, []);

  // Render appropriate period
  const renderPeriod = () => {
    switch (state.currentPeriod) {
      case 'pre-match':
        return (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">Ready to Scout</h1>
              <p className="text-gray-600 mb-8">Click "Setup Match" to begin</p>
              <button
                onClick={() => setShowPreMatch(true)}
                className="px-8 py-4 bg-green-600 text-white rounded-lg font-bold text-xl hover:bg-green-700"
              >
                Setup Match
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
          <div className="flex items-center justify-center h-full bg-green-50">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-4xl font-bold text-green-800 mb-4">Submitted!</h1>
              <p className="text-gray-600 mb-8">
                Match {state.matchKey} - Team {state.teamNumber}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-xl hover:bg-blue-700"
              >
                Scout Next Match
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Pre-match setup modal */}
      <PreMatchSetup isOpen={showPreMatch} onClose={() => setShowPreMatch(false)} />

      {/* Period Timer - Always visible except pre-match */}
      {state.currentPeriod !== 'pre-match' && <PeriodTimer autoAdvance={false} />}

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {renderPeriod()}
      </div>

      {/* Bottom controls - Always visible during scouting */}
      {state.currentPeriod !== 'pre-match' && state.currentPeriod !== 'submitted' && (
        <div className="bg-white border-t-2 border-gray-300 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left side - Undo */}
              <div className="flex items-center gap-2">
                <UndoButton />
              </div>

              {/* Center - Quick Notes */}
              <div className="flex-1 max-w-2xl">
                <QuickNotes />
              </div>

              {/* Right side - Submit */}
              <div className="flex items-center gap-2">
                <SubmitButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
