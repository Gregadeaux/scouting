/**
 * IndexedDB Migration System
 * Handles schema changes and data migrations between versions
 */

import { DatabaseError } from '@/core/offline/domain';

/**
 * Migration definition interface
 */
export interface Migration {
  version: number;
  description: string;
  up: (db: IDBDatabase, transaction: IDBTransaction) => void;
  down?: (db: IDBDatabase, transaction: IDBTransaction) => void;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  migrationsApplied: number[];
  errors: Error[];
}

/**
 * Manages database migrations
 */
export class MigrationRunner {
  constructor(private readonly migrations: Migration[]) {
    this.validateMigrations();
  }

  /**
   * Applies migrations during database upgrade
   */
  applyMigrations(
    db: IDBDatabase,
    transaction: IDBTransaction,
    oldVersion: number,
    newVersion: number
  ): MigrationResult {
    const result: MigrationResult = {
      success: true,
      fromVersion: oldVersion,
      toVersion: newVersion,
      migrationsApplied: [],
      errors: []
    };

    try {
      // Get migrations to apply
      const migrationsToApply = this.migrations.filter(
        m => m.version > oldVersion && m.version <= newVersion
      );

      // Sort by version
      migrationsToApply.sort((a, b) => a.version - b.version);

      // Apply each migration
      for (const migration of migrationsToApply) {
        try {
          console.info(`Applying migration ${migration.version}: ${migration.description}`);
          migration.up(db, transaction);
          result.migrationsApplied.push(migration.version);
        } catch (error) {
          const migrationError = new DatabaseError(
            `Migration ${migration.version} failed: ${migration.description}`,
            'MIGRATION_FAILED',
            false,
            { originalError: error }
          );
          result.errors.push(migrationError);
          result.success = false;

          // Stop applying further migrations on error
          break;
        }
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        new DatabaseError(
          'Migration runner failed',
          'MIGRATION_FAILED',
          false,
          { originalError: error }
        )
      );
      return result;
    }
  }

  /**
   * Validates migration definitions
   */
  private validateMigrations(): void {
    // Check for duplicate versions
    const versions = new Set<number>();
    for (const migration of this.migrations) {
      if (versions.has(migration.version)) {
        throw new DatabaseError(
          `Duplicate migration version: ${migration.version}`,
          'MIGRATION_FAILED',
          false
        );
      }
      versions.add(migration.version);
    }

    // Check for sequential versions
    const sortedVersions = Array.from(versions).sort((a, b) => a - b);
    for (let i = 0; i < sortedVersions.length; i++) {
      if (sortedVersions[i] !== i + 1) {
        console.warn(
          `Non-sequential migration versions detected. Expected ${i + 1}, found ${sortedVersions[i]}`
        );
      }
    }
  }
}

/**
 * Predefined migrations for the scouting system
 */
export const SCOUTING_MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial schema - submissions, sync queue, metadata',
    up: (db: IDBDatabase) => {
      // Submissions store
      if (!db.objectStoreNames.contains('submissions')) {
        const submissionsStore = db.createObjectStore('submissions', {
          keyPath: 'id'
        });

        submissionsStore.createIndex('by-status', 'status', { unique: false });
        submissionsStore.createIndex('by-type', 'type', { unique: false });
        submissionsStore.createIndex('by-team', 'teamNumber', { unique: false });
        submissionsStore.createIndex('by-match', 'matchId', { unique: false });
        submissionsStore.createIndex('by-created', 'createdAt', { unique: false });
        submissionsStore.createIndex('by-status-and-type', ['status', 'type'], { unique: false });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('sync-queue')) {
        const syncQueueStore = db.createObjectStore('sync-queue', {
          keyPath: 'id'
        });

        syncQueueStore.createIndex('by-priority', 'priority', { unique: false });
        syncQueueStore.createIndex('by-created', 'createdAt', { unique: false });
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', {
          keyPath: 'key'
        });
      }
    }
  },

  // Future migrations can be added here
  // Example:
  // {
  //   version: 2,
  //   description: 'Add scouterId index to submissions',
  //   up: (db: IDBDatabase, transaction: IDBTransaction) => {
  //     const store = transaction.objectStore('submissions');
  //     if (!store.indexNames.contains('by-scouter')) {
  //       store.createIndex('by-scouter', 'scouterId', { unique: false });
  //     }
  //   },
  //   down: (db: IDBDatabase, transaction: IDBTransaction) => {
  //     const store = transaction.objectStore('submissions');
  //     if (store.indexNames.contains('by-scouter')) {
  //       store.deleteIndex('by-scouter');
  //     }
  //   }
  // }
];

/**
 * Creates migration runner with default migrations
 */
export function createMigrationRunner(): MigrationRunner {
  return new MigrationRunner(SCOUTING_MIGRATIONS);
}

/**
 * Helper to add a new migration
 */
export function addMigration(migration: Migration): void {
  SCOUTING_MIGRATIONS.push(migration);
}

/**
 * Gets the latest migration version
 */
export function getLatestVersion(): number {
  if (SCOUTING_MIGRATIONS.length === 0) {
    return 0;
  }
  return Math.max(...SCOUTING_MIGRATIONS.map(m => m.version));
}