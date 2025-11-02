'use client';

import { useOfflineStatus } from '@/lib/offline';
import { WifiOff } from 'lucide-react';

/**
 * OfflineBanner Component
 *
 * Displays a banner at the top of the screen when the app is offline.
 * Informs users that their submissions will be queued and synced automatically.
 */
export function OfflineBanner() {
  const { isOffline } = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center font-medium flex items-center justify-center gap-2 sticky top-0 z-50">
      <WifiOff className="w-4 h-4" />
      <span>You are offline. Submissions will be queued and synced automatically when reconnected.</span>
    </div>
  );
}