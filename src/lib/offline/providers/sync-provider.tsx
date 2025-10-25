'use client';

/**
 * SyncProvider
 *
 * Manages sync state and provides sync controls to the component tree.
 * Handles periodic sync, manual sync triggers, and sync status.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <OfflineProvider>
 *       <SyncProvider syncInterval={30000}>
 *         <YourApp />
 *       </SyncProvider>
 *     </OfflineProvider>
 *   );
 * }
 *
 * function SyncButton() {
 *   const { sync, isSyncing, lastSyncTime } = useSyncContext();
 *
 *   return (
 *     <button onClick={sync} disabled={isSyncing}>
 *       {isSyncing ? 'Syncing...' : 'Sync Now'}
 *     </button>
 *   );
 * }
 * ```
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { syncManager, type SyncEvent } from '../sync';
import { useOfflineStatus } from '../hooks/use-offline-status';

export interface SyncContextValue {
  /**
   * Whether a sync is currently in progress
   */
  isSyncing: boolean;

  /**
   * Trigger manual sync
   */
  sync: () => Promise<void>;

  /**
   * Last successful sync timestamp
   */
  lastSyncTime: number | null;

  /**
   * Last sync error
   */
  lastSyncError: string | null;

  /**
   * Number of pending submissions
   */
  pendingCount: number;

  /**
   * Whether auto-sync is enabled
   */
  autoSyncEnabled: boolean;

  /**
   * Toggle auto-sync
   */
  setAutoSyncEnabled: (enabled: boolean) => void;
}

/**
 * Context for sync state
 */
export const SyncContext = createContext<SyncContextValue | null>(null);

export interface SyncProviderProps {
  children: ReactNode;

  /**
   * Sync interval in milliseconds (default: 30000 = 30s)
   */
  syncInterval?: number;

  /**
   * Whether to enable auto-sync initially (default: true)
   */
  initialAutoSync?: boolean;

  /**
   * Whether to sync when coming online (default: true)
   */
  syncOnOnline?: boolean;

  /**
   * Callback when sync completes
   */
  onSyncComplete?: (pendingCount: number) => void;

  /**
   * Callback when sync fails
   */
  onSyncError?: (error: string) => void;
}

/**
 * Provider for sync state and controls
 *
 * Manages:
 * - Periodic background sync
 * - Manual sync triggers
 * - Sync status tracking
 * - Auto-sync toggle
 *
 * @param props - Provider props
 */
export function SyncProvider({
  children,
  syncInterval = 30000,
  initialAutoSync = true,
  syncOnOnline = true,
  onSyncComplete,
  onSyncError,
}: SyncProviderProps) {
  const { isOnline } = useOfflineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(initialAutoSync);

  /**
   * Manual sync trigger
   */
  const sync = useCallback(async () => {
    try {
      await syncManager.syncAll();
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }, []);

  /**
   * Handle sync events
   */
  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      switch (event.type) {
        case 'sync-start':
          setIsSyncing(true);
          setLastSyncError(null);
          break;

        case 'sync-complete':
          setIsSyncing(false);
          setLastSyncTime(Date.now());
          setPendingCount(event.pending || 0);
          onSyncComplete?.(event.pending || 0);
          break;

        case 'sync-error':
          setIsSyncing(false);
          setLastSyncError(event.error || 'Unknown error');
          onSyncError?.(event.error || 'Unknown error');
          break;

        case 'submission-success':
        case 'submission-failed':
          // These will trigger a sync-complete event
          break;
      }
    };

    const unsubscribe = syncManager.on(handleSyncEvent);

    return unsubscribe;
  }, [onSyncComplete, onSyncError]);

  /**
   * Sync when coming online
   */
  useEffect(() => {
    if (syncOnOnline && isOnline && autoSyncEnabled) {
      sync();
    }
  }, [isOnline, syncOnOnline, autoSyncEnabled, sync]);

  /**
   * Periodic sync
   */
  useEffect(() => {
    if (!autoSyncEnabled || !isOnline) {
      return;
    }

    // Initial sync
    sync();

    // Set up interval
    const interval = setInterval(() => {
      if (isOnline) {
        sync();
      }
    }, syncInterval);

    return () => {
      clearInterval(interval);
    };
  }, [autoSyncEnabled, isOnline, syncInterval, sync]);

  /**
   * Context value
   */
  const value: SyncContextValue = {
    isSyncing,
    sync,
    lastSyncTime,
    lastSyncError,
    pendingCount,
    autoSyncEnabled,
    setAutoSyncEnabled,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

/**
 * Hook to access sync context
 *
 * @throws Error if used outside SyncProvider
 */
export function useSyncContext(): SyncContextValue {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error(
      'useSyncContext must be used within SyncProvider. ' +
      'Wrap your component tree with <SyncProvider>.'
    );
  }

  return context;
}

/**
 * HOC to wrap component with sync provider
 */
export function withSyncProvider<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<SyncProviderProps, 'children'>
) {
  return function SyncProviderWrapper(props: P) {
    return (
      <SyncProvider {...options}>
        <Component {...props} />
      </SyncProvider>
    );
  };
}
