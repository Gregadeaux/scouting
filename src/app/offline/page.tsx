'use client';

import { useMemo } from 'react';
import { WifiOff, InfoIcon } from 'lucide-react';
import { useOfflineStatus } from '@/lib/hooks/use-offline-status';
import { useSyncQueue } from '@/lib/hooks/use-sync-queue';
import { useSubmissions } from '@/lib/hooks/use-submissions';
import { SyncStatusBadge } from '@/components/offline/sync-status-badge';
import { QueueStatusCard, type QueueState } from '@/components/offline/queue-status-card';
import { SubmissionList } from '@/components/offline/submission-list';
import { OfflineBanner } from '@/components/offline/offline-banner';

/**
 * Offline Mode Page
 * Thin container component using hooks to manage state
 * Pure presentation with minimal business logic
 */
export default function OfflinePage() {
  // Hooks for data and state
  const isOnline = useOfflineStatus();
  const { status, pendingCount, sync } = useSyncQueue();
  const { submissions, loading, error, retry, remove } = useSubmissions();

  // Compute queue statistics
  const queueState: QueueState = useMemo(() => {
    const pending = submissions.filter((s) => s.status === 'pending').length;
    const syncing = submissions.filter((s) => s.status === 'syncing').length;
    const success = submissions.filter((s) => s.status === 'success').length;
    const failed = submissions.filter((s) => s.status === 'failed').length;

    return {
      total: submissions.length,
      pending,
      syncing,
      success,
      failed,
      lastSyncTime: status.lastSyncTime,
    };
  }, [submissions, status.lastSyncTime]);

  return (
    <>
      {/* Offline Banner */}
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <WifiOff
                className="w-8 h-8 text-slate-400"
                aria-hidden="true"
              />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Offline Mode
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  You can still access cached content and queue submissions
                </p>
              </div>
            </div>

            {/* Connection Status Badge */}
            <SyncStatusBadge
              status={status}
              pendingCount={pendingCount}
              isOnline={isOnline}
              onSyncClick={sync}
            />
          </div>

          {/* Queue Statistics */}
          <div className="mb-6">
            <QueueStatusCard
              queue={queueState}
              isSyncing={status.isSyncing}
              isOnline={isOnline}
              onSync={sync}
            />
          </div>

          {/* Submissions List */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Queued Submissions ({pendingCount} pending)
            </h2>

            {/* Error State */}
            {error && (
              <div
                className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                role="alert"
              >
                <p className="text-sm text-red-700 dark:text-red-300">
                  <span className="font-semibold">Error:</span> {error}
                </p>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="text-center py-12">
                <div
                  className="inline-block w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"
                  role="status"
                  aria-label="Loading submissions"
                />
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
                  Loading submissions...
                </p>
              </div>
            ) : (
              <SubmissionList
                submissions={submissions}
                isOnline={isOnline}
                onRetry={retry}
                onDelete={remove}
              />
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <InfoIcon
                className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  About Offline Mode
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5">
                  <li>
                    • Match scouting forms work offline - submissions are queued
                    automatically
                  </li>
                  <li>
                    • Cached match schedules and team data are available for viewing
                  </li>
                  <li>
                    • Your data will sync automatically when you reconnect
                  </li>
                  <li>
                    • The app will retry failed submissions up to 5 times with
                    exponential backoff
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
