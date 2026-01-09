/**
 * Offline Services Factory
 * Wires up all dependencies and provides configured service instances
 */

import { IndexedDBManager, getDatabaseManager } from './indexeddb/database';
import { IndexedDBSubmissionRepository } from './indexeddb/submission-repository';
import { BackgroundSyncCoordinator, SyncConfig } from './sync/background-sync';
import { getGlobalEventBus, createEventBus } from './events/event-emitter';
import type { ISubmissionRepository } from '@/core/offline/ports/submission-repository';
import type { ISyncCoordinator } from '@/core/offline/ports/sync-coordinator';
import type { IEventBus } from '@/core/offline/ports/event-bus';
import { SubmissionService } from '@/core/offline/services/submission-service';
import { SyncService } from '@/core/offline/services/sync-service';

/**
 * Offline services configuration
 */
export interface OfflineConfig {
  database?: {
    name?: string;
    version?: number;
  };
  sync?: {
    apiBaseUrl: string;
    autoSyncInterval?: number;
    batchSize?: number;
    enableBackgroundSync?: boolean;
  };
  events?: {
    useGlobalBus?: boolean;
    maxHistorySize?: number;
  };
}

/**
 * Configured offline services
 */
export interface OfflineServices {
  // Infrastructure layer
  repository: ISubmissionRepository;
  syncCoordinator: ISyncCoordinator;
  eventBus: IEventBus;
  dbManager: IndexedDBManager;

  // Domain services layer
  submissionService: SubmissionService;
  syncService: SyncService;

  // Lifecycle methods
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;
}

/**
 * Singleton instance
 */
let servicesInstance: OfflineServices | null = null;

/**
 * Creates and configures offline services
 */
export function createOfflineServices(config?: OfflineConfig): OfflineServices {
  // Create or get database manager
  const dbManager = getDatabaseManager({
    databaseName: config?.database?.name,
    version: config?.database?.version
  });

  // Create event bus
  const eventBus = config?.events?.useGlobalBus !== false
    ? getGlobalEventBus()
    : createEventBus({ maxHistorySize: config?.events?.maxHistorySize });

  // Create repository
  const repository = new IndexedDBSubmissionRepository(dbManager);

  // Create sync coordinator
  if (!config?.sync?.apiBaseUrl) {
    throw new Error('API base URL is required for sync configuration');
  }

  const syncConfig: SyncConfig = {
    apiBaseUrl: config.sync.apiBaseUrl,
    autoSyncInterval: config.sync.autoSyncInterval,
    batchSize: config.sync.batchSize,
    enableBackgroundSync: config.sync.enableBackgroundSync
  };

  const syncCoordinator = new BackgroundSyncCoordinator(
    repository,
    eventBus,
    syncConfig
  );

  // Create domain services
  const submissionService = new SubmissionService(
    repository,
    syncCoordinator,
    eventBus
  );

  const syncService = new SyncService(
    repository,
    syncCoordinator,
    eventBus,
    {
      periodicSyncIntervalMs: config?.sync?.autoSyncInterval,
    }
  );

  // Initialize method
  const initialize = async () => {
    await dbManager.openDatabase();
    if (config?.sync?.enableBackgroundSync !== false) {
      if (syncCoordinator instanceof BackgroundSyncCoordinator) {
        await syncCoordinator.start();
      }
      syncService.startPeriodicSync();
    }
  };

  // Cleanup method
  const cleanup = async () => {
    syncService.stopPeriodicSync();
    if (syncCoordinator instanceof BackgroundSyncCoordinator) {
      syncCoordinator.stop();
    }
    dbManager.closeDatabase();
    eventBus.clearAll();
  };

  return {
    repository,
    syncCoordinator,
    eventBus,
    dbManager,
    submissionService,
    syncService,
    initialize,
    cleanup
  };
}

/**
 * Gets or creates singleton instance of offline services
 */
export function getOfflineServices(config?: OfflineConfig): OfflineServices {
  if (!servicesInstance) {
    servicesInstance = createOfflineServices(config);
  }
  return servicesInstance;
}

/**
 * Resets singleton instance
 */
export async function resetOfflineServices(): Promise<void> {
  if (servicesInstance) {
    await servicesInstance.cleanup();
    servicesInstance = null;
  }
}

/**
 * Initializes offline services and starts background sync
 */
export async function initializeOfflineServices(config?: OfflineConfig): Promise<OfflineServices> {
  const services = getOfflineServices(config);
  await services.initialize();
  return services;
}

/**
 * Shuts down offline services
 */
export async function shutdownOfflineServices(): Promise<void> {
  await resetOfflineServices();
}

/**
 * Creates offline services for testing
 */
export function createTestOfflineServices(overrides?: {
  repository?: ISubmissionRepository;
  syncCoordinator?: ISyncCoordinator;
  eventBus?: IEventBus;
}): OfflineServices {
  const dbManager = getDatabaseManager({ databaseName: 'test-db' });
  const eventBus = overrides?.eventBus || createEventBus();
  const repository = overrides?.repository || new IndexedDBSubmissionRepository(dbManager);
  const syncCoordinator = overrides?.syncCoordinator || new BackgroundSyncCoordinator(
    repository,
    eventBus,
    {
      apiBaseUrl: 'http://localhost:3000',
      enableBackgroundSync: false
    }
  );

  const submissionService = new SubmissionService(
    repository,
    syncCoordinator,
    eventBus
  );

  const syncService = new SyncService(
    repository,
    syncCoordinator,
    eventBus,
    {
      periodicSyncIntervalMs: 10000,
    }
  );

  const initialize = async () => {
    await dbManager.openDatabase();
  };

  const cleanup = async () => {
    syncService.stopPeriodicSync();
    if (syncCoordinator instanceof BackgroundSyncCoordinator) {
      syncCoordinator.stop();
    }
    dbManager.closeDatabase();
    eventBus.clearAll();
  };

  return {
    repository,
    syncCoordinator,
    eventBus,
    dbManager,
    submissionService,
    syncService,
    initialize,
    cleanup
  };
}

/**
 * Default configuration for production
 */
export const DEFAULT_PRODUCTION_CONFIG: OfflineConfig = {
  database: {
    name: 'frc-scouting-offline',
    version: 1
  },
  sync: {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    autoSyncInterval: 30000, // 30 seconds
    batchSize: 10,
    enableBackgroundSync: true
  },
  events: {
    useGlobalBus: true,
    maxHistorySize: 100
  }
};

/**
 * Default configuration for development
 */
export const DEFAULT_DEVELOPMENT_CONFIG: OfflineConfig = {
  database: {
    name: 'frc-scouting-offline-dev',
    version: 1
  },
  sync: {
    apiBaseUrl: 'http://localhost:3000',
    autoSyncInterval: 10000, // 10 seconds for faster testing
    batchSize: 5,
    enableBackgroundSync: true
  },
  events: {
    useGlobalBus: true,
    maxHistorySize: 50
  }
};

/**
 * Gets default config based on environment
 */
export function getDefaultConfig(): OfflineConfig {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production'
    ? DEFAULT_PRODUCTION_CONFIG
    : DEFAULT_DEVELOPMENT_CONFIG;
}