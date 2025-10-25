'use client';

/**
 * useSyncQueue Hook
 *
 * Provides access to the submission queue state and sync operations.
 * Subscribes to sync events and automatically updates when queue changes.
 *
 * @example
 * ```tsx
 * function SyncStatus() {
 *   const { queue, sync, isSyncing, error } = useSyncQueue();
 *
 *   return (
 *     <div>
 *       <p>Pending: {queue.pending}</p>
 *       <button onClick={sync} disabled={isSyncing}>
 *         Sync Now
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useOfflineService } from './use-offline-service';
import type { QueueState } from '@/core/offline/services/submission-service';
import type { OfflineEvent } from '@/core/offline/ports/event-bus';

export interface UseSyncQueueResult {
  /**
   * Current queue state
   */
  queue: QueueState;

  /**
   * Trigger manual sync
   */
  sync: () => Promise<void>;

  /**
   * Whether a sync is currently in progress
   */
  isSyncing: boolean;

  /**
   * Number of pending submissions (convenience accessor)
   */
  pendingCount: number;

  /**
   * Sync status info
   */
  status: {
    isSyncing: boolean;
    lastSyncTime: number | null;
  };

  /**
   * Error from last sync attempt
   */
  error: string | null;
}

/**
 * Hook that manages sync queue state
 *
 * Subscribes to sync events and provides queue operations.
 * Automatically refreshes when submissions change.
 *
 * @returns Queue state and operations
 */
export function useSyncQueue(): UseSyncQueueResult {
  const { submissionService, syncService, eventBus } = useOfflineService();

  const [queue, setQueue] = useState<QueueState>({
    total: 0,
    pending: 0,
    syncing: 0,
    failed: 0,
    success: 0,
    submissions: [],
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load queue data
   */
  const loadQueue = useCallback(async () => {
    const result = await submissionService.getQueue();
    if (result.ok) {
      setQueue(result.value);
    } else {
      console.error('Failed to load queue:', result.error);
      setError(result.error.message);
    }
  }, [submissionService]);

  /**
   * Subscribe to events
   */
  useEffect(() => {
    // Initial load
    loadQueue();

    // Subscribe to all events
    const unsubscribe = eventBus.subscribeAll((event: OfflineEvent) => {
      switch (event.type) {
        case 'sync.started':
          setIsSyncing(true);
          setError(null);
          break;

        case 'sync.completed':
          setIsSyncing(false);
          setLastSyncTime(Date.now());
          loadQueue();
          break;

        case 'sync.failed':
          setIsSyncing(false);
          setError(event.error);
          break;

        case 'submission.queued':
        case 'submission.success':
        case 'submission.failed':
        case 'submission.deleted':
        case 'queue.stateChanged':
          loadQueue();
          break;
      }
    });

    return () => {
      unsubscribe.unsubscribe();
    };
  }, [eventBus, loadQueue]);

  /**
   * Trigger manual sync
   */
  const sync = useCallback(async () => {
    try {
      setError(null);
      const result = await syncService.syncAll();

      if (!result.ok) {
        setError(result.error.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      console.error('Sync error:', errorMessage);
      setError(errorMessage);
    }
  }, [syncService]);

  return {
    queue,
    sync,
    isSyncing,
    pendingCount: queue.pending,
    status: {
      isSyncing,
      lastSyncTime,
    },
    error,
  };
}
