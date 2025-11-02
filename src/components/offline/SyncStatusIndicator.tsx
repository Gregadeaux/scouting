'use client';

import { useSyncQueue } from '@/lib/offline';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * SyncStatusIndicator Component
 *
 * Shows the number of pending submissions and allows manual sync.
 * Displays nothing when there are no pending submissions.
 * Shows different UI based on Background Sync API support.
 */
export function SyncStatusIndicator() {
  const { pendingCount, sync, isSyncing } = useSyncQueue();
  const { isSupported: bgSyncSupported, registerSync } = useBackgroundSync();
  const [hasRegisteredSync, setHasRegisteredSync] = useState(false);

  // Register background sync when there are pending submissions
  useEffect(() => {
    if (pendingCount > 0 && bgSyncSupported && !hasRegisteredSync) {
      registerSync('submission-sync')
        .then((success) => {
          if (success) {
            setHasRegisteredSync(true);
            console.log('Background sync registered for pending submissions');
          }
        })
        .catch(console.error);
    } else if (pendingCount === 0) {
      setHasRegisteredSync(false);
    }
  }, [pendingCount, bgSyncSupported, hasRegisteredSync, registerSync]);

  if (pendingCount === 0) return null;

  return (
    <div className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 shadow-lg">
      {isSyncing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : hasRegisteredSync ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <Upload className="w-4 h-4" />
      )}

      <span className="text-sm font-medium">
        {pendingCount} pending submission{pendingCount !== 1 ? 's' : ''}
      </span>

      {bgSyncSupported && hasRegisteredSync ? (
        <span className="ml-2 text-xs opacity-90">
          Will sync in background
        </span>
      ) : (
        <button
          onClick={sync}
          disabled={isSyncing}
          className="ml-2 px-3 py-1 bg-white text-blue-500 rounded text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      )}
    </div>
  );
}