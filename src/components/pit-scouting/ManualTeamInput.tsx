'use client';

import { useState, useCallback, useEffect } from 'react';

interface ManualTeamInputProps {
  value: number | null;
  onChange: (teamNumber: number | null) => void;
  disabled?: boolean;
}

/**
 * Numeric input for manually entering a team number.
 * Used for manual-schedule events (scrimmages) where the team roster
 * may not be imported from TBA. Commits the value on blur or Enter
 * to avoid re-rendering the parent on every keystroke.
 */
export function ManualTeamInput({
  value,
  onChange,
  disabled = false,
}: ManualTeamInputProps) {
  const [localInput, setLocalInput] = useState(value?.toString() ?? '');

  useEffect(() => {
    setLocalInput(value?.toString() ?? '');
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalInput(e.target.value.replace(/\D/g, ''));
  }, []);

  const commitValue = useCallback(() => {
    const num = parseInt(localInput, 10);
    const next = localInput && num > 0 ? num : null;
    if (next !== value) {
      onChange(next);
    }
  }, [localInput, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    },
    []
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        Team Number
      </label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={localInput}
        onChange={handleInputChange}
        onBlur={commitValue}
        onKeyDown={handleKeyDown}
        placeholder="Enter team #"
        disabled={disabled}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center text-2xl font-bold tabular-nums text-gray-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
      <p className="text-xs text-slate-500">
        Manual event -- type the team number and press Enter or tap away to confirm.
      </p>
    </div>
  );
}
