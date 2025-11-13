'use client';

import { useMatchScouting } from '@/contexts/MatchScoutingContext';
import { Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Component
// ============================================================================

export function UndoButton() {
  const { state, undo } = useMatchScouting();

  const undoCount = state.undoStack.length;
  const canUndo = undoCount > 0;

  return (
    <button
      onClick={undo}
      disabled={!canUndo}
      className={cn(
        'relative flex items-center justify-center',
        'min-w-[60px] min-h-[60px] rounded-full',
        'font-bold text-lg transition-all',
        'border-2 shadow-md',
        canUndo
          ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 active:scale-95'
          : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
      )}
      title={`Undo last action (${undoCount} available)`}
    >
      <Undo2 className="w-6 h-6" />
      {undoCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[24px] h-[24px] flex items-center justify-center px-1 border-2 border-white">
          {undoCount}
        </span>
      )}
    </button>
  );
}
