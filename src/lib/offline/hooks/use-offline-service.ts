'use client';

/**
 * useOfflineService Hook
 *
 * Provides access to offline services from React context.
 * Must be used within OfflineProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { submissionService, syncService } = useOfflineService();
 *
 *   // Use services...
 * }
 * ```
 */

import { useContext } from 'react';
import { OfflineContext } from '../providers/offline-provider';

/**
 * Hook that accesses offline services from context
 *
 * @throws Error if used outside OfflineProvider
 * @returns Offline services
 */
export function useOfflineService() {
  const context = useContext(OfflineContext);

  if (!context) {
    throw new Error(
      'useOfflineService must be used within OfflineProvider. ' +
      'Wrap your component tree with <OfflineProvider>.'
    );
  }

  if (!context.isInitialized) {
    console.warn('Offline services not yet initialized');
  }

  return {
    submissionService: context.services.submissionService,
    syncService: context.services.syncService,
    eventBus: context.services.eventBus,
    isInitialized: context.isInitialized,
    error: context.error,
  };
}
