'use client';

import { useCallback, useEffect, useState } from 'react';
import { BackgroundSyncAdapter } from '@/infrastructure/offline/adapters/BackgroundSyncAdapter';

/**
 * React hook for interacting with Background Sync API
 *
 * Provides:
 * - Browser support detection
 * - Sync registration
 * - Pending sync tag tracking
 */
export function useBackgroundSync() {
  const [isSupported, setIsSupported] = useState(false);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize adapter as singleton
  const adapter = BackgroundSyncAdapter.getInstance();

  useEffect(() => {
    // Check support on mount
    setIsSupported(adapter.isSupported());

    // Load pending sync tags
    if (adapter.isSupported()) {
      adapter.getTags()
        .then(setPendingTags)
        .catch((error) => {
          console.error('Failed to load sync tags:', error);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    // Listen for service worker messages about sync completion
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        // Refresh pending tags after sync
        adapter.getTags().then(setPendingTags).catch(console.error);
      }
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [adapter]);

  /**
   * Register a sync event with the service worker
   */
  const registerSync = useCallback(async (tag: string = 'submission-sync') => {
    try {
      await adapter.registerSync(tag);
      // Update pending tags
      const tags = await adapter.getTags();
      setPendingTags(tags);
      return true;
    } catch (error) {
      console.error('Failed to register sync:', error);
      return false;
    }
  }, [adapter]);

  /**
   * Check if a specific tag is pending sync
   */
  const hasPendingSync = useCallback(async (tag: string) => {
    return adapter.hasPendingSync(tag);
  }, [adapter]);

  /**
   * Manually refresh the pending tags list
   */
  const refreshTags = useCallback(async () => {
    try {
      const tags = await adapter.getTags();
      setPendingTags(tags);
    } catch (error) {
      console.error('Failed to refresh tags:', error);
    }
  }, [adapter]);

  return {
    isSupported,
    isLoading,
    registerSync,
    pendingTags,
    hasPendingSync,
    refreshTags,
  };
}