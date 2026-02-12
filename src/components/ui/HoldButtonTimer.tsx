'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface HoldButtonTimerProps {
  value: number;
  onChange: (seconds: number) => void;
  label?: string;
  disabled?: boolean;
  maxSeconds?: number;
  className?: string;
}

/**
 * HoldButtonTimer
 *
 * A touch-friendly button that accumulates time while held.
 * User holds the button to time an action, releases to stop.
 * Multiple holds accumulate to the total time.
 *
 * Features:
 * - Large touch target (min 80px height)
 * - Visual feedback while holding (pulsing animation, color change)
 * - Haptic feedback on mobile (vibration)
 * - Reset button to clear accumulated time
 * - Prevents accidental scrolling with touch-action: none
 */
export function HoldButtonTimer({
  value,
  onChange,
  label = 'Hold to Time',
  disabled = false,
  maxSeconds = 150, // Default to 2.5 minutes (full match length)
  className,
}: HoldButtonTimerProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [displayTime, setDisplayTime] = useState(value);
  const holdStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVibrateRef = useRef<number>(0);

  // Sync display time with prop value when not holding
  useEffect(() => {
    if (!isHolding) {
      setDisplayTime(value);
    }
  }, [value, isHolding]);

  // Update display time during hold using requestAnimationFrame
  const updateDisplayTime = useCallback(() => {
    if (holdStartTimeRef.current !== null) {
      const now = Date.now();
      const elapsed = (now - holdStartTimeRef.current) / 1000;
      const newTime = Math.min(value + elapsed, maxSeconds);
      setDisplayTime(newTime);

      // Haptic pulse every 1 second while holding
      if (navigator.vibrate && now - lastVibrateRef.current >= 1000) {
        navigator.vibrate(30);
        lastVibrateRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(updateDisplayTime);
    }
  }, [value, maxSeconds]);

  // Stop timing and commit the value
  const handleStop = useCallback(() => {
    if (holdStartTimeRef.current === null) return;

    // Cancel animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Calculate final time
    const elapsed = (Date.now() - holdStartTimeRef.current) / 1000;
    const newTotal = Math.min(value + elapsed, maxSeconds);

    // Round to 0.1 second precision
    const roundedTime = Math.round(newTotal * 10) / 10;

    setIsHolding(false);
    holdStartTimeRef.current = null;
    setDisplayTime(roundedTime);
    onChange(roundedTime);

    // Haptic feedback on stop
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  }, [value, maxSeconds, onChange]);

  // Start timing
  const handleStart = useCallback(() => {
    if (disabled || value >= maxSeconds) return;

    setIsHolding(true);
    holdStartTimeRef.current = Date.now();
    lastVibrateRef.current = Date.now();

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(updateDisplayTime);
  }, [disabled, value, maxSeconds, updateDisplayTime]);

  // Listen for pointer release on the document so re-renders don't break the hold
  useEffect(() => {
    if (!isHolding) return;

    const onPointerUp = () => handleStop();
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);

    return () => {
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isHolding, handleStop]);

  // Reset timer
  const handleReset = useCallback(() => {
    if (disabled) return;

    // Cancel any ongoing hold
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsHolding(false);
    holdStartTimeRef.current = null;
    setDisplayTime(0);
    onChange(0);

    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }, [disabled, onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Format time display
  const formatTime = (seconds: number): string => {
    // Guard against undefined/NaN values
    const safeSeconds = typeof seconds === 'number' && !isNaN(seconds) ? seconds : 0;

    if (safeSeconds >= 60) {
      const mins = Math.floor(safeSeconds / 60);
      const secs = safeSeconds % 60;
      return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
    }
    return `${safeSeconds.toFixed(1)}s`;
  };

  const hasTime = value > 0;
  const atMax = value >= maxSeconds;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Main hold button */}
      <button
        type="button"
        onPointerDown={handleStart}
        disabled={disabled || atMax}
        style={{ touchAction: 'none' }}
        className={cn(
          'relative flex min-h-[80px] min-w-[140px] flex-1 flex-col items-center justify-center rounded-xl border-2 px-4 py-3 transition-all select-none',
          'focus:outline-none focus:ring-2 focus:ring-frc-blue focus:ring-offset-2',
          isHolding
            ? 'border-frc-blue bg-frc-blue text-white scale-[1.02] shadow-lg'
            : hasTime
              ? 'border-frc-blue/60 bg-frc-blue/10 text-gray-900 dark:text-gray-100'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
          (disabled || atMax) && 'cursor-not-allowed opacity-50'
        )}
      >
        {/* Timer icon with pulse animation */}
        <div className={cn(
          'mb-1 text-2xl',
          isHolding && 'animate-pulse'
        )}>
          ⏱️
        </div>

        {/* Time display */}
        <div className={cn(
          'text-2xl font-bold tabular-nums',
          isHolding && 'text-white'
        )}>
          {formatTime(displayTime)}
        </div>

        {/* Instructions */}
        <div className={cn(
          'text-xs mt-1',
          isHolding ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'
        )}>
          {isHolding ? 'Release to stop' : atMax ? 'Max reached' : label}
        </div>

        {/* Holding indicator ring */}
        {isHolding && (
          <div className="absolute inset-0 rounded-xl border-4 border-white/50 animate-ping pointer-events-none" />
        )}
      </button>

      {/* Reset button - only show when there's time */}
      {hasTime && !isHolding && (
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg border-2 border-gray-300 bg-white text-gray-600 transition-all',
            'hover:border-red-400 hover:bg-red-50 hover:text-red-600',
            'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          title="Reset timer"
        >
          <span className="text-lg">✕</span>
        </button>
      )}
    </div>
  );
}
