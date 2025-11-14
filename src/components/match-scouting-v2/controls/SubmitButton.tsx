'use client';

import { useState } from 'react';
import { useMatchScouting } from '@/contexts/MatchScoutingContext';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Component
// ============================================================================

interface SubmitButtonProps {
  onSubmit?: () => Promise<void>;
  className?: string;
}

export function SubmitButton({ onSubmit, className }: SubmitButtonProps) {
  const { state, submit } = useMatchScouting();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      // Call custom submit handler if provided
      if (onSubmit) {
        await onSubmit();
      }

      // Update context state
      submit();

      // Close confirmation
      setShowConfirmation(false);
    } catch (error) {
      console.error('Failed to submit:', error);
      // Keep confirmation open on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  // Calculate totals for confirmation
  const totalCoral =
    state.autoPerformance.coral_scored_L1 +
    state.autoPerformance.coral_scored_L2 +
    state.autoPerformance.coral_scored_L3 +
    state.autoPerformance.coral_scored_L4 +
    state.teleopPerformance.coral_scored_L1 +
    state.teleopPerformance.coral_scored_L2 +
    state.teleopPerformance.coral_scored_L3 +
    state.teleopPerformance.coral_scored_L4;

  const totalAlgae = state.teleopPerformance.algae_scored_barge + state.teleopPerformance.algae_scored_processor;

  return (
    <>
      {/* Submit Button */}
      <button
        onClick={handleSubmitClick}
        disabled={state.currentPeriod === 'submitted' || isSubmitting}
        className={cn(
          'min-h-[70px] px-8 py-4 rounded-xl font-bold text-xl transition-all',
          'border-2 shadow-lg flex items-center justify-center gap-3',
          state.currentPeriod === 'submitted'
            ? 'bg-gray-400 text-gray-200 border-gray-500 cursor-not-allowed'
            : 'bg-green-600 text-white border-green-700 hover:bg-green-700 active:scale-95',
          className
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Submitting...
          </>
        ) : state.currentPeriod === 'submitted' ? (
          <>
            <CheckCircle2 className="w-6 h-6" />
            Submitted
          </>
        ) : (
          <>
            <CheckCircle2 className="w-6 h-6" />
            Submit Scouting Data
          </>
        )}
      </button>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Confirm Submission</h2>
              <p className="text-gray-600 mt-1">Review your scouting data before submitting</p>
            </div>

            {/* Match Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Match:</span>
                <span className="font-semibold text-gray-800">{state.matchKey}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Team:</span>
                <span className="font-semibold text-gray-800">{state.teamNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Alliance:</span>
                <span
                  className={cn(
                    'font-semibold',
                    state.allianceColor === 'red' ? 'text-red-600' : 'text-blue-600'
                  )}
                >
                  {state.allianceColor === 'red' ? 'Red' : 'Blue'} - Position {state.robotPosition}
                </span>
              </div>
            </div>

            {/* Data Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Coral Scored:</span>
                <span className="font-bold text-green-600">{totalCoral}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Algae Scored:</span>
                <span className="font-bold text-purple-600">{totalAlgae}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Left Starting Zone:</span>
                <span className={cn('font-semibold', state.autoPerformance.left_starting_zone ? 'text-green-600' : 'text-gray-400')}>
                  {state.autoPerformance.left_starting_zone ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Climbed Cage:</span>
                <span className={cn('font-semibold', state.endgamePerformance.cage_climb_successful ? 'text-green-600' : 'text-gray-400')}>
                  {state.endgamePerformance.cage_climb_successful ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Quick Notes:</span>
                <span className="font-semibold text-gray-800">{state.quickNotes.length}</span>
              </div>
            </div>

            {/* Warning for issues */}
            {(state.robotBroke || state.tippedOver) && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                <div className="text-sm text-yellow-800">
                  <span className="font-semibold">⚠ Robot Issues:</span>
                  <ul className="mt-1 ml-4 list-disc">
                    {state.robotBroke && <li>Robot broke during match</li>}
                    {state.tippedOver && <li>Robot tipped over</li>}
                    {state.wasTipped && <li>Robot was tipped by opponent</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className={cn(
                  'flex-1 px-6 py-3 rounded-lg font-semibold transition-all',
                  'border-2 border-gray-300 bg-white text-gray-700',
                  'hover:bg-gray-50 active:scale-95',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={cn(
                  'flex-1 px-6 py-3 rounded-lg font-semibold transition-all',
                  'border-2 border-green-700 bg-green-600 text-white',
                  'hover:bg-green-700 active:scale-95',
                  'flex items-center justify-center gap-2',
                  isSubmitting && 'opacity-75 cursor-wait'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Confirm & Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
