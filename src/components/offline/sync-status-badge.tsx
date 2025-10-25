'use client';

import { Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import type { SyncStatus } from '@/lib/hooks/use-sync-queue';

export interface SyncStatusBadgeProps {
  /** Current sync status */
  status: SyncStatus;
  /** Number of pending submissions */
  pendingCount: number;
  /** Whether device is online */
  isOnline: boolean;
  /** Callback when sync button is clicked */
  onSyncClick?: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Pure presentation component for sync status display
 * Shows online/offline indicator, pending count, and sync button
 *
 * Usage:
 * <SyncStatusBadge
 *   status={{ isSyncing: false }}
 *   pendingCount={5}
 *   isOnline={true}
 *   onSyncClick={() => console.log('sync')}
 * />
 */
export function SyncStatusBadge({
  status,
  pendingCount,
  isOnline,
  onSyncClick,
  className = '',
}: SyncStatusBadgeProps) {
  const { isSyncing, error } = status;

  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Online/Offline Indicator */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi
            className="w-5 h-5 text-green-600 dark:text-green-400"
            aria-hidden="true"
          />
        ) : (
          <WifiOff
            className="w-5 h-5 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
        )}
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Pending Count Badge */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
          <span
            className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-semibold text-white bg-blue-600 dark:bg-blue-500 rounded-full"
            aria-label={`${pendingCount} pending submissions`}
          >
            {pendingCount}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            pending
          </span>
        </div>
      )}

      {/* Sync Button */}
      {isOnline && pendingCount > 0 && onSyncClick && (
        <>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
          <button
            onClick={onSyncClick}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            aria-label={isSyncing ? 'Syncing submissions' : 'Sync pending submissions'}
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </>
      )}

      {/* Error Indicator */}
      {error && (
        <span
          className="text-xs text-red-600 dark:text-red-400"
          role="alert"
          aria-live="assertive"
        >
          Error: {error}
        </span>
      )}
    </div>
  );
}
