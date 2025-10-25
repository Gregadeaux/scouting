/**
 * Domain layer exports
 *
 * This module provides the core domain objects for the offline-first architecture.
 * All exports are pure domain logic with no external dependencies.
 */

// Type exports
export type {
  SubmissionId,
  TeamNumber,
  ScoutingType,
  OfflineConfig,
  Result,
  SerializedSubmission,
  DeepReadonly,
  KeysOfType,
} from './types';

export {
  createSubmissionId,
  createTeamNumber,
  isSubmissionId,
  isTeamNumber,
  isScoutingType,
  Priority,
  DEFAULT_OFFLINE_CONFIG,
  Result as ResultHelpers,
} from './types';

// Sync status exports
export type {
  SyncStatus,
  PendingStatus,
  SyncingStatus,
  SuccessStatus,
  FailedStatus,
} from './sync-status';

export {
  SyncStatus as SyncStatusFactory,
  isPending,
  isSyncing,
  isSuccess,
  isFailed,
  isTerminal,
  isActive,
  canStartSync,
  startSync,
  markSuccess,
  markFailed,
  calculateNextRetryTime,
  getStatusDescription,
  getStatusPriority,
  serializeStatus,
  deserializeStatus,
} from './sync-status';

// Error exports
export {
  OfflineError,
  QueueError,
  QueueFullError,
  ItemNotFoundError,
  SyncError,
  ServerRejectionError,
  SyncTimeoutError,
  NetworkError,
  DeviceOfflineError,
  NetworkRequestError,
  ValidationError,
  SchemaValidationError,
  MissingFieldError,
  DatabaseError,
  IndexedDBError,
  StorageQuotaError,
  MaxRetriesExceededError,
  OperationCancelledError,
  isOfflineError,
  isQueueError,
  isSyncError,
  isNetworkError,
  isValidationError,
  isDatabaseError,
  isRecoverableError,
  toOfflineError,
} from './errors';

// Submission exports
export type {
  SubmissionData,
  SubmissionMetadata,
} from './submission';

export {
  Submission,
  isSubmission,
  SubmissionComparators,
} from './submission';
