'use client';

/**
 * useOfflineStatus Hook
 *
 * Monitors network connectivity status and provides real-time updates
 * when the device goes online or offline.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOnline, isOffline } = useOfflineStatus();
 *
 *   return (
 *     <div>
 *       {isOffline && <Banner>You're offline. Changes will be queued.</Banner>}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect } from 'react';

export interface OfflineStatus {
  /**
   * True when device has network connectivity
   */
  isOnline: boolean;

  /**
   * True when device has no network connectivity
   * Convenience property: equivalent to !isOnline
   */
  isOffline: boolean;
}

/**
 * Hook that tracks online/offline status
 *
 * Listens to browser online/offline events and updates state accordingly.
 * Safe to use in server-side rendering (returns online by default).
 *
 * @returns Current connectivity status
 */
export function useOfflineStatus(): OfflineStatus {
  // Initialize with navigator.onLine if available, otherwise assume online
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') {
      return true; // SSR fallback
    }
    return navigator.onLine;
  });

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    /**
     * Handle online event
     */
    const handleOnline = () => {
      setIsOnline(true);
    };

    /**
     * Handle offline event
     */
    const handleOffline = () => {
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
  };
}
