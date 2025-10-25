/**
 * Core Offline Module - Public API
 *
 * This module exports the core offline-first architecture components
 * following Clean Architecture and SOLID principles.
 *
 * Layers:
 * - Domain: Pure business logic and entities (no dependencies)
 * - Ports: Interface definitions (dependency inversion)
 * - Services: Application logic (depends on ports, not implementations)
 * - Infrastructure: Concrete implementations (not exported here)
 */

// ============================================================================
// Domain Layer
// ============================================================================

export {
  Submission,
  type SubmissionData,
  type SubmissionMetadata,
  isSubmission,
  SubmissionComparators,
} from './domain/submission';

export {
  type SubmissionId,
  createSubmissionId,
  isSubmissionId,
  type TeamNumber,
  createTeamNumber,
  isTeamNumber,
  type ScoutingType,
  isScoutingType,
  Priority,
  type OfflineConfig,
  DEFAULT_OFFLINE_CONFIG,
  type Result,
  Result as ResultHelpers,
  type SerializedSubmission,
  type SubmissionFilter,
  type DeepReadonly,
  type KeysOfType,
} from './domain/types';

export {
  type SyncStatus,
  isPending,
  isSyncing,
  isSuccess,
  isFailed,
  startSync,
  markSuccess,
  markFailed,
  calculateNextRetryTime,
  serializeStatus,
  deserializeStatus,
  SyncStatus as SyncStatusHelpers,
} from './domain/sync-status';

export {
  // Base errors
  OfflineError,

  // Queue errors
  QueueError,
  QueueFullError,
  ItemNotFoundError,

  // Sync errors
  SyncError,
  ServerRejectionError,
  SyncTimeoutError,

  // Network errors
  NetworkError,
  DeviceOfflineError,
  NetworkRequestError,

  // Validation errors
  ValidationError,
  SchemaValidationError,
  MissingFieldError,

  // Database errors
  DatabaseError,
  IndexedDBError,
  StorageQuotaError,

  // Other errors
  MaxRetriesExceededError,
  OperationCancelledError,

  // Type guards
  isOfflineError,
  isQueueError,
  isSyncError,
  isNetworkError,
  isValidationError,
  isDatabaseError,
  isRecoverableError,

  // Utilities
  toOfflineError,
} from './domain/errors';

// ============================================================================
// Port Interfaces (Dependency Inversion)
// ============================================================================

export type { ISubmissionRepository } from './ports/submission-repository';

export type {
  ISyncCoordinator,
  SyncReport,
  RetryConfig,
} from './ports/sync-coordinator';

export type {
  IEventBus,
  DomainEvent,
  OfflineEvent,
  EventHandler,
  Subscription,
  SubmissionQueuedEvent,
  SyncStartedEvent,
  SyncCompletedEvent,
  SyncFailedEvent,
  SubmissionSuccessEvent,
  SubmissionFailedEvent,
  SubmissionRetryingEvent,
  SubmissionDeletedEvent,
  QueueStateChangedEvent,
} from './ports/event-bus';

export { createEvent } from './ports/event-bus';

// ============================================================================
// Application Services
// ============================================================================

export {
  SubmissionService,
  type QueueState,
  type SubmissionServiceConfig,
} from './services/submission-service';

export {
  SyncService,
  type SyncServiceConfig,
} from './services/sync-service';
