/**
 * IndexedDB Database Manager
 * Handles database lifecycle, connections, and schema management
 */

import { DatabaseError } from '@/core/offline/domain';

export interface IndexedDBConfig {
  databaseName: string;
  version: number;
  stores: StoreConfig[];
}

export interface StoreConfig {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: IndexConfig[];
}

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

/**
 * Manages IndexedDB connections and schema
 */
export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private readonly config: IndexedDBConfig;

  constructor(config?: Partial<IndexedDBConfig>) {
    this.config = {
      databaseName: config?.databaseName || 'frc-scouting-offline',
      version: config?.version || 1,
      stores: config?.stores || this.getDefaultStores()
    };
  }

  /**
   * Opens connection to IndexedDB
   */
  async openDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    try {
      return await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.config.databaseName, this.config.version);

        request.onerror = () => {
          const error = new DatabaseError(
            'Failed to open IndexedDB',
            'CONNECTION_FAILED',
            true,
            { originalError: request.error }
          );
          reject(error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.setupEventHandlers(this.db);
          resolve(this.db);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          this.createObjectStores(db);
        };

        request.onblocked = () => {
          const error = new DatabaseError(
            'Database upgrade blocked by another connection',
            'CONNECTION_FAILED',
            true
          );
          reject(error);
        };
      });
    } catch (error) {
      throw new DatabaseError(
        'Failed to open database connection',
        'CONNECTION_FAILED',
        true,
        { originalError: error }
      );
    }
  }

  /**
   * Closes database connection
   */
  closeDatabase(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Creates object stores during database upgrade
   */
  createObjectStores(db: IDBDatabase): void {
    try {
      for (const storeConfig of this.config.stores) {
        // Check if store already exists
        if (!db.objectStoreNames.contains(storeConfig.name)) {
          const store = db.createObjectStore(storeConfig.name, {
            keyPath: storeConfig.keyPath,
            autoIncrement: storeConfig.autoIncrement
          });

          // Create indexes
          if (storeConfig.indexes) {
            for (const indexConfig of storeConfig.indexes) {
              store.createIndex(
                indexConfig.name,
                indexConfig.keyPath,
                indexConfig.options || {}
              );
            }
          }
        }
      }
    } catch (error) {
      throw new DatabaseError(
        'Failed to create object stores',
        'SCHEMA_ERROR',
        true,
        { originalError: error }
      );
    }
  }

  /**
   * Gets current database instance
   */
  getDatabase(): IDBDatabase | null {
    return this.db;
  }

  /**
   * Checks if database is open
   */
  isOpen(): boolean {
    return this.db !== null && this.db.name === this.config.databaseName;
  }

  /**
   * Deletes the entire database
   */
  async deleteDatabase(): Promise<void> {
    this.closeDatabase();

    try {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(this.config.databaseName);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          const error = new DatabaseError(
            'Failed to delete database',
            'OPERATION_FAILED',
            true,
            { originalError: request.error }
          );
          reject(error);
        };
      });
    } catch (error) {
      throw new DatabaseError(
        'Failed to delete database',
        'OPERATION_FAILED',
        true,
        { originalError: error }
      );
    }
  }

  /**
   * Estimates storage usage
   */
  async estimateStorageUsage(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0
        };
      } catch (error) {
        console.warn('Failed to estimate storage:', error);
        return { usage: 0, quota: 0 };
      }
    }
    return { usage: 0, quota: 0 };
  }

  /**
   * Checks if storage quota is near limit
   */
  async isStorageNearLimit(threshold: number = 0.9): Promise<boolean> {
    const { usage, quota } = await this.estimateStorageUsage();
    return quota > 0 && (usage / quota) > threshold;
  }

  /**
   * Sets up database event handlers
   */
  private setupEventHandlers(db: IDBDatabase): void {
    db.onversionchange = () => {
      console.warn('Database version changed, closing connection');
      this.closeDatabase();
    };

    db.onerror = (event) => {
      console.error('Database error:', event);
    };

    db.onabort = (event) => {
      console.error('Database transaction aborted:', event);
    };

    db.onclose = () => {
      console.info('Database connection closed');
      this.db = null;
    };
  }

  /**
   * Gets default store configurations
   */
  private getDefaultStores(): StoreConfig[] {
    return [
      {
        name: 'submissions',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          {
            name: 'by-status',
            keyPath: 'status',
            options: { unique: false }
          },
          {
            name: 'by-type',
            keyPath: 'type',
            options: { unique: false }
          },
          {
            name: 'by-team',
            keyPath: 'teamNumber',
            options: { unique: false }
          },
          {
            name: 'by-match',
            keyPath: 'matchId',
            options: { unique: false }
          },
          {
            name: 'by-created',
            keyPath: 'createdAt',
            options: { unique: false }
          },
          {
            name: 'by-status-and-type',
            keyPath: ['status', 'type'],
            options: { unique: false }
          }
        ]
      },
      {
        name: 'sync-queue',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          {
            name: 'by-priority',
            keyPath: 'priority',
            options: { unique: false }
          },
          {
            name: 'by-created',
            keyPath: 'createdAt',
            options: { unique: false }
          }
        ]
      },
      {
        name: 'metadata',
        keyPath: 'key',
        autoIncrement: false
      }
    ];
  }
}

/**
 * Global database manager instance
 */
let globalManager: IndexedDBManager | null = null;

/**
 * Gets or creates global database manager
 */
export function getDatabaseManager(config?: Partial<IndexedDBConfig>): IndexedDBManager {
  if (!globalManager) {
    globalManager = new IndexedDBManager(config);
  }
  return globalManager;
}

/**
 * Resets global database manager
 */
export function resetDatabaseManager(): void {
  if (globalManager) {
    globalManager.closeDatabase();
    globalManager = null;
  }
}