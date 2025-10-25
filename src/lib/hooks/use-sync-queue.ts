'use client';

import { useEffect, useState, useCallback } from 'react';
import { syncManager, type SyncEvent } from '@/lib/offline/sync';
import { getPendingCount } from '@/lib/offline/queue';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime?: number;
  error?: string;
}

/**
 * Hook to track sync queue status
 * Provides syncing state and pending count
 */
export function useSyncQueue() {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
  });
  const [pendingCount, setPendingCount] = useState(0);

  // Load pending count
  const loadPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // Trigger manual sync
  const sync = useCallback(async () => {
    await syncManager.syncAll();
  }, []);

  // Listen to sync events
  useEffect(() => {
    loadPendingCount();

    const unsubscribe = syncManager.on((event: SyncEvent) => {
      switch (event.type) {
        case 'sync-start':
          setStatus({ isSyncing: true });
          break;
        case 'sync-complete':
          setStatus({ isSyncing: false, lastSyncTime: Date.now() });
          setPendingCount(event.pending ?? 0);
          break;
        case 'sync-error':
          setStatus({ isSyncing: false, error: event.error });
          break;
        case 'submission-success':
        case 'submission-failed':
          loadPendingCount();
          break;
      }
    });

    return unsubscribe;
  }, [loadPendingCount]);

  return {
    status,
    pendingCount,
    sync,
  };
}
