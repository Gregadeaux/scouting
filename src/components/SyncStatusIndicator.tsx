'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { getPendingCount } from '@/lib/offline/queue';
import { syncManager, type SyncEvent } from '@/lib/offline/sync';
import Link from 'next/link';

export function SyncStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    // Load pending count
    loadPendingCount();

    // Set up event listeners
    const handleOnline = () => {
      setIsOnline(true);
      showNotification('Back online - syncing queued data...');
    };

    const handleOffline = () => {
      setIsOnline(false);
      showNotification('You are offline - submissions will be queued');
    };

    const handleQueuedSubmission = (event: Event) => {
      const customEvent = event as CustomEvent;
      loadPendingCount();
      showNotification('Submission queued for sync');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-submission-queued', handleQueuedSubmission);

    // Listen for sync events
    const unsubscribe = syncManager.on(handleSyncEvent);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-submission-queued', handleQueuedSubmission);
      unsubscribe();
    };
  }, []);

  async function loadPendingCount() {
    const count = await getPendingCount();
    setPendingCount(count);
  }

  function handleSyncEvent(event: SyncEvent) {
    switch (event.type) {
      case 'sync-start':
        setIsSyncing(true);
        break;
      case 'sync-complete':
        setIsSyncing(false);
        loadPendingCount();
        if (event.pending === 0) {
          showNotification('All data synced successfully');
        }
        break;
      case 'sync-error':
        setIsSyncing(false);
        showNotification('Sync error - will retry automatically', true);
        break;
      case 'submission-success':
        loadPendingCount();
        break;
      case 'submission-failed':
        loadPendingCount();
        showNotification('Submission failed - check offline page', true);
        break;
    }
  }

  function showNotification(message: string, isError = false) {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  return (
    <>
      {/* Status Indicator */}
      <Link
        href="/offline"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
            {isSyncing && (
              <RefreshCw className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />
            )}
          </>
        ) : (
          <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
        )}

        {pendingCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {pendingCount}
            </span>
            <AlertCircle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
          </div>
        )}

        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </Link>

      {/* Toast Notification */}
      {showToast && (
        <div
          className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 max-w-sm animate-slide-up"
          role="alert"
        >
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 flex-shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{toastMessage}</p>
          </div>
        </div>
      )}
    </>
  );
}
