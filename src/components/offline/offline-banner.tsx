'use client';

import { useState, useEffect } from 'react';
import { WifiOff, X, AlertCircle } from 'lucide-react';

export interface OfflineBannerProps {
  /** Whether device is online */
  isOnline: boolean;
  /** Number of pending submissions */
  pendingCount: number;
  /** Optional className for styling */
  className?: string;
}

/**
 * Pure presentation component for offline notification banner
 * Auto-dismissible, shows when offline with pending submissions
 *
 * Usage:
 * <OfflineBanner isOnline={false} pendingCount={5} />
 */
export function OfflineBanner({
  isOnline,
  pendingCount,
  className = '',
}: OfflineBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);

  // Auto-dismiss when coming online
  useEffect(() => {
    if (isOnline) {
      setJustCameOnline(true);
      const timer = setTimeout(() => {
        setIsDismissed(true);
        setJustCameOnline(false);
      }, 3000); // Show "back online" message for 3 seconds
      return () => clearTimeout(timer);
    } else {
      setIsDismissed(false);
      setJustCameOnline(false);
    }
  }, [isOnline]);

  // Don't show if dismissed or if online with no pending items
  if (isDismissed || (isOnline && !justCameOnline)) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 animate-slide-down ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`mx-auto max-w-7xl px-4 py-3 ${
          isOnline
            ? 'bg-green-600 dark:bg-green-700'
            : 'bg-orange-600 dark:bg-orange-700'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            {isOnline ? (
              <AlertCircle
                className="w-5 h-5 text-white flex-shrink-0"
                aria-hidden="true"
              />
            ) : (
              <WifiOff
                className="w-5 h-5 text-white flex-shrink-0"
                aria-hidden="true"
              />
            )}

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {isOnline ? (
                  'Back online!'
                ) : (
                  <>
                    You&apos;re offline
                    {pendingCount > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                        {pendingCount} pending
                      </span>
                    )}
                  </>
                )}
              </p>
              <p className="text-xs text-white/90 mt-0.5">
                {isOnline
                  ? pendingCount > 0
                    ? 'Your submissions will sync automatically'
                    : 'All submissions synced'
                  : 'Your submissions will be queued and synced when you reconnect'}
              </p>
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600 dark:focus:ring-offset-orange-700"
            aria-label="Dismiss notification"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
