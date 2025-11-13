'use client';

import { useState, useEffect } from 'react';
import { useMatchScouting } from '@/contexts/MatchScoutingContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

interface PreMatchSetupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreMatchSetup({ isOpen, onClose }: PreMatchSetupProps) {
  const { state, setMatchInfo, setScoutInfo, startMatch } = useMatchScouting();

  // Form state
  const [matchKey, setMatchKey] = useState(state.matchKey || '');
  const [teamNumber, setTeamNumber] = useState(state.teamNumber?.toString() || '');
  const [allianceColor, setAllianceColor] = useState<'red' | 'blue'>(state.allianceColor || 'red');
  const [robotPosition, setRobotPosition] = useState<1 | 2 | 3>(state.robotPosition || 1);
  const [scoutName, setScoutName] = useState(state.scoutName || '');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!matchKey.trim()) {
      newErrors.matchKey = 'Match is required';
    }

    if (!teamNumber.trim()) {
      newErrors.teamNumber = 'Team number is required';
    } else if (isNaN(Number(teamNumber)) || Number(teamNumber) <= 0) {
      newErrors.teamNumber = 'Team number must be a positive number';
    }

    if (!scoutName.trim()) {
      newErrors.scoutName = 'Scout name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Save match info
    setMatchInfo(matchKey, Number(teamNumber), allianceColor, robotPosition);
    setScoutInfo(scoutName);

    // Start the match
    startMatch();

    // Close modal
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Match Setup</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Match Key */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Match <span className="text-red-600">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., qm1, sf1m2"
              value={matchKey}
              onChange={(e) => setMatchKey(e.target.value)}
              className={errors.matchKey ? 'border-red-500' : ''}
            />
            {errors.matchKey && <p className="text-red-600 text-sm mt-1">{errors.matchKey}</p>}
          </div>

          {/* Team Number */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Team Number <span className="text-red-600">*</span>
            </label>
            <Input
              type="number"
              placeholder="e.g., 930"
              value={teamNumber}
              onChange={(e) => setTeamNumber(e.target.value)}
              className={errors.teamNumber ? 'border-red-500' : ''}
            />
            {errors.teamNumber && <p className="text-red-600 text-sm mt-1">{errors.teamNumber}</p>}
          </div>

          {/* Alliance Color */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Alliance Color <span className="text-red-600">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAllianceColor('red')}
                className={cn(
                  'flex-1 py-3 rounded-lg font-semibold transition-all',
                  allianceColor === 'red'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                )}
              >
                Red Alliance
              </button>
              <button
                type="button"
                onClick={() => setAllianceColor('blue')}
                className={cn(
                  'flex-1 py-3 rounded-lg font-semibold transition-all',
                  allianceColor === 'blue'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                )}
              >
                Blue Alliance
              </button>
            </div>
          </div>

          {/* Robot Position */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Robot Position <span className="text-red-600">*</span>
            </label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setRobotPosition(pos)}
                  className={cn(
                    'flex-1 py-3 rounded-lg font-semibold transition-all',
                    robotPosition === pos
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  )}
                >
                  Position {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Scout Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Scout Name <span className="text-red-600">*</span>
            </label>
            <Input
              type="text"
              placeholder="Your name"
              value={scoutName}
              onChange={(e) => setScoutName(e.target.value)}
              className={errors.scoutName ? 'border-red-500' : ''}
            />
            {errors.scoutName && <p className="text-red-600 text-sm mt-1">{errors.scoutName}</p>}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-bold">
            Start Match
          </Button>
        </form>
      </div>
    </div>
  );
}
