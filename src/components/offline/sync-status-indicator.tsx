'use client';

import { useEffect } from 'react';
import { useSyncQueue } from '@/lib/hooks/use-sync-queue';
import { useOfflineStatus } from '@/lib/hooks/use-offline-status';
import { SyncStatusBadge } from './sync-status-badge';

export interface SyncStatusIndicatorProps {
  /** Optional className for styling */
  className?: string;
  /** Show toast notifications on sync events */
  showToast?: boolean;
}

/**
 * Container component for sync status
 * Uses hooks to fetch data and passes to presentation component
 * Handles sync click and shows toast notifications
 *
 * Usage:
 * <SyncStatusIndicator showToast />
 */
export function SyncStatusIndicator({
  className,
  showToast = true,
}: SyncStatusIndicatorProps) {
  const isOnline = useOfflineStatus();
  const { status, pendingCount, sync } = useSyncQueue();

  // Show toast notifications on sync events
  useEffect(() => {
    if (!showToast) return;

    // You can integrate with a toast library here
    // For now, we'll use console for demonstration
    if (status.error) {
      console.error('Sync error:', status.error);
      // toast.error(`Sync failed: ${status.error}`);
    } else if (status.lastSyncTime && !status.isSyncing && pendingCount === 0) {
      console.log('All submissions synced successfully');
      // toast.success('All submissions synced!');
    }
  }, [status, pendingCount, showToast]);

  return (
    <SyncStatusBadge
      status={status}
      pendingCount={pendingCount}
      isOnline={isOnline}
      onSyncClick={sync}
      className={className}
    />
  );
}
