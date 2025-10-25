'use client';

import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export interface QueueState {
  total: number;
  pending: number;
  syncing: number;
  success: number;
  failed: number;
  lastSyncTime?: number;
}

export interface QueueStatusCardProps {
  /** Queue statistics */
  queue: QueueState;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Whether device is online */
  isOnline: boolean;
  /** Callback when sync button is clicked */
  onSync: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Pure presentation component for queue statistics
 * Displays queue counts, last sync time, and sync button
 *
 * Usage:
 * <QueueStatusCard
 *   queue={{ total: 10, pending: 5, syncing: 0, success: 4, failed: 1 }}
 *   isSyncing={false}
 *   isOnline={true}
 *   onSync={() => console.log('sync')}
 * />
 */
export function QueueStatusCard({
  queue,
  isSyncing,
  isOnline,
  onSync,
  className = '',
}: QueueStatusCardProps) {
  const { total, pending, syncing, success, failed, lastSyncTime } = queue;

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Sync Queue
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {total === 0 ? 'All submissions synced' : `${total} total submissions`}
          </p>
        </div>

        {/* Sync Button */}
        {isOnline && pending > 0 && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            aria-label={isSyncing ? 'Syncing submissions' : 'Sync pending submissions now'}
          >
            <RefreshCw
              className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Pending */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {pending}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Pending
            </p>
          </div>
        </div>

        {/* Success */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {success}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              Synced
            </p>
          </div>
        </div>

        {/* Syncing */}
        {syncing > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" aria-hidden="true" />
            <div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {syncing}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Syncing
              </p>
            </div>
          </div>
        )}

        {/* Failed */}
        {failed > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            <div>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {failed}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">
                Failed
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Last Sync Time */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Last sync: <span className="font-medium text-slate-900 dark:text-white">{formatLastSync(lastSyncTime)}</span>
        </p>
      </div>
    </div>
  );
}
