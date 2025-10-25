/**
 * Offline Utilities - Main Export
 *
 * Centralized exports for all offline functionality.
 * Import from this file to access queue, sync, API utilities, hooks, and providers.
 */

// Queue operations
export {
  queueSubmission,
  getPendingSubmissions,
  getAllSubmissions,
  updateSubmission,
  deleteSubmission,
  cleanupOldSubmissions,
  getPendingCount,
  type QueuedSubmission,
} from './queue';

// Sync manager
export {
  syncManager,
  initializeSyncManager,
  type SyncEvent,
} from './sync';

// Offline-aware API wrapper
export {
  offlineApi,
  offlineGet,
  offlinePost,
  offlinePut,
  offlinePatch,
  offlineDelete,
  type OfflineApiOptions,
  type ApiResponse,
} from './api';

// React hooks
export {
  useOfflineStatus,
  useSyncQueue,
  useSubmission,
  useSubmissions,
  useOptimisticSubmission,
  useOfflineService,
  type OfflineStatus,
  type QueueState,
  type UseSyncQueueResult,
  type UseSubmissionResult,
  type UseSubmissionsResult,
  type OptimisticSubmissionOptions,
  type UseOptimisticSubmissionResult,
} from './hooks';

// React providers
export {
  OfflineProvider,
  OfflineErrorBoundary,
  withOfflineProvider,
  OfflineContext,
  SyncProvider,
  useSyncContext,
  withSyncProvider,
  SyncContext,
  type OfflineProviderProps,
  type OfflineContextValue,
  type SyncProviderProps,
  type SyncContextValue,
} from './providers';
