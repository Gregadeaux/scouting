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
  // Always initialize as online to avoid hydration mismatch between server and client.
  // The useEffect below will sync with the real navigator.onLine value after mount.
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Sync initial state with browser
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

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
