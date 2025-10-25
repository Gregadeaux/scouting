/**
 * Offline Hooks - Barrel Export
 *
 * Centralized exports for all offline React hooks.
 * Import from this file to access hooks in your components.
 */

// Core hooks
export { useOfflineStatus, type OfflineStatus } from './use-offline-status';
export { useSyncQueue, type UseSyncQueueResult } from './use-sync-queue';
export { useSubmission, type UseSubmissionResult } from './use-submission';
export {
  useSubmissions,
  type UseSubmissionsResult,
} from './use-submissions';
export {
  useOptimisticSubmission,
  type OptimisticSubmissionOptions,
  type UseOptimisticSubmissionResult,
} from './use-optimistic-submission';

// Context hooks
export { useOfflineService } from './use-offline-service';

// Re-export types from services
export type { QueueState } from '@/core/offline/services/submission-service';
