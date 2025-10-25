'use client';

import { useEffect } from 'react';
import { initializeSyncManager } from '@/lib/offline/sync';

/**
 * Offline Provider Component
 *
 * Initializes the sync manager and sets up offline functionality.
 * Should be included once in the root layout.
 */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize sync manager on client-side only
    if (typeof window !== 'undefined') {
      initializeSyncManager();
    }
  }, []);

  return <>{children}</>;
}
