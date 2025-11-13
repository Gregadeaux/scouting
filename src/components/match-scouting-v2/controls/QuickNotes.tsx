'use client';

import { useState } from 'react';
import { useMatchScouting } from '@/contexts/MatchScoutingContext';
import { X, MessageSquare, AlertTriangle, Shield, Zap, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Component
// ============================================================================

export function QuickNotes() {
  const { state, addNote, removeNote } = useMatchScouting();
  const [isExpanded, setIsExpanded] = useState(false);

  const quickButtons = [
    { text: 'Tipped', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { text: 'Defended', icon: Shield, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { text: 'Broke', icon: Zap, color: 'bg-red-100 text-red-800 border-red-300' },
    { text: 'Penalty', icon: Flag, color: 'bg-orange-100 text-orange-800 border-orange-300' },
  ];

  const handleQuickNote = (text: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    addNote(`[${timestamp}] ${text}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-gray-300 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-700">Quick Notes</span>
          {state.quickNotes.length > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
              {state.quickNotes.length}
            </span>
          )}
        </div>
        <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {quickButtons.map(({ text, icon: Icon, color }) => (
              <button
                key={text}
                onClick={() => handleQuickNote(text)}
                className={cn(
                  'min-h-[60px] px-4 py-2 rounded-lg font-semibold transition-all',
                  'border-2 flex items-center justify-center gap-2',
                  'hover:scale-105 active:scale-95',
                  color
                )}
              >
                <Icon className="w-5 h-5" />
                {text}
              </button>
            ))}
          </div>

          {/* Notes List */}
          {state.quickNotes.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</div>
              {state.quickNotes.map((note, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200"
                >
                  <span className="text-sm text-gray-700 flex-1">{note}</span>
                  <button
                    onClick={() => removeNote(index)}
                    className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-100 rounded p-1 transition-colors"
                    title="Remove note"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {state.quickNotes.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-2">No notes yet. Tap a button to add one.</div>
          )}
        </div>
      )}
    </div>
  );
}
