/**
 * Infrastructure Layer - Offline Module
 * Exports all infrastructure implementations
 */

// Database
export { IndexedDBManager, getDatabaseManager, resetDatabaseManager } from './indexeddb/database';
export type { IndexedDBConfig, StoreConfig, IndexConfig } from './indexeddb/database';

// Repository
export { IndexedDBSubmissionRepository } from './indexeddb/submission-repository';

// Migrations
export {
  MigrationRunner,
  SCOUTING_MIGRATIONS,
  createMigrationRunner,
  addMigration,
  getLatestVersion
} from './indexeddb/migrations';
export type { Migration, MigrationResult } from './indexeddb/migrations';

// Sync
export { BackgroundSyncCoordinator } from './sync/background-sync';
export type { SyncConfig, SyncResult, BatchSyncResult } from './sync/background-sync';

export {
  RetryStrategy,
  createRetryStrategy,
  isRetryableError,
  shouldAbortRetry,
  DEFAULT_RETRY_CONFIG
} from './sync/retry-strategy';
export type { RetryConfig, RetryAttempt } from './sync/retry-strategy';

// Events
export {
  EventBus,
  getGlobalEventBus,
  resetGlobalEventBus,
  createEventBus
} from './events/event-emitter';

// Factory
export {
  createOfflineServices,
  getOfflineServices,
  resetOfflineServices,
  initializeOfflineServices,
  shutdownOfflineServices,
  createTestOfflineServices,
  getDefaultConfig,
  DEFAULT_PRODUCTION_CONFIG,
  DEFAULT_DEVELOPMENT_CONFIG
} from './factory';
export type { OfflineConfig, OfflineServices } from './factory';
