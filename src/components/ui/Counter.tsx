'use client';

import React, { useEffect, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';

interface CounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  className?: string;
}

/**
 * Counter Component
 *
 * A numeric counter with increment/decrement buttons and keyboard support.
 * Used for counting game pieces, cycles, etc.
 *
 * @example
 * ```tsx
 * <Counter
 *   value={coralCount}
 *   onChange={setCoralCount}
 *   min={0}
 *   max={10}
 *   label="Coral Pieces Scored"
 * />
 * ```
 */
export function Counter({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  disabled = false,
  label,
  className = '',
}: CounterProps) {
  const handleIncrement = useCallback(() => {
    if (value + step <= max) {
      onChange(value + step);
    }
  }, [value, step, max, onChange]);

  const handleDecrement = useCallback(() => {
    if (value - step >= min) {
      onChange(value - step);
    }
  }, [value, step, min, onChange]);

  // Keyboard support (arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleIncrement();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDecrement();
      }
    };

    // Only add listener if component is focused
    const element = document.activeElement;
    if (element?.getAttribute('data-counter-id') === label?.replace(/\s+/g, '-')) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [disabled, handleIncrement, handleDecrement, label]);

  const isAtMin = value <= min;
  const isAtMax = value >= max;

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div
        className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
        data-counter-id={label?.replace(/\s+/g, '-')}
        tabIndex={disabled ? -1 : 0}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || isAtMin}
          className="flex h-12 w-12 items-center justify-center rounded-l-lg border-r border-gray-300 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-frc-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="Decrement"
        >
          <Minus className="h-5 w-5" />
        </button>

        <div className="flex h-12 min-w-[60px] items-center justify-center px-4">
          <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {value}
          </span>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || isAtMax}
          className="flex h-12 w-12 items-center justify-center rounded-r-lg border-l border-gray-300 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-frc-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="Increment"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
