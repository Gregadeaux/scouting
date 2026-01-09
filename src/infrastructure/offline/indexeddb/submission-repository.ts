/**
 * IndexedDB Submission Repository Implementation
 * Provides persistent storage for offline submissions
 */

import type { ISubmissionRepository } from '@/core/offline/ports/submission-repository';
import {
  Submission,
  DatabaseError,

} from '@/core/offline/domain';
import { ResultHelpers } from '@/core/offline/domain';
import type { Result, SubmissionId, SerializedSubmission, SubmissionFilter } from '@/core/offline/domain/types';
import { IndexedDBManager } from './database';

/**
 * IndexedDB implementation of submission repository
 */
export class IndexedDBSubmissionRepository implements ISubmissionRepository {
  private readonly storeName = 'submissions';

  constructor(private readonly dbManager: IndexedDBManager) { }

  /**
   * Saves a submission to IndexedDB
   */
  async save(submission: Submission): Promise<Result<void, DatabaseError>> {
    try {
      const db = await this.ensureDatabase();

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const serialized = submission.toJSON();

        const request = store.put(serialized);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          reject(this.createError('Failed to save submission', request.error));
        };

        transaction.onerror = () => {
          reject(this.handleQuotaError(transaction.error));
        };
      });

      return ResultHelpers.ok(undefined);
    } catch (error) {
      if (error instanceof DatabaseError) {
        return ResultHelpers.err(error);
      }
      return ResultHelpers.err(this.createError('Failed to save submission', error));
    }
  }

  /**
   * Finds submission by ID
   */
  async findById(id: SubmissionId): Promise<Result<Submission | null, DatabaseError>> {
    try {
      const db = await this.ensureDatabase();

      const data = await new Promise<SerializedSubmission | undefined>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          reject(this.createError('Failed to find submission', request.error));
        };
      });

      if (!data) {
        return ResultHelpers.ok(null);
      }

      const submissionResult = Submission.fromSerialized(data);
      if (!submissionResult.ok) {
        return ResultHelpers.err(
          new DatabaseError(
            'Failed to deserialize submission',
            'DESERIALIZATION_ERROR',
            true,
            { error: submissionResult.error }
          )
        );
      }

      return ResultHelpers.ok(submissionResult.value);
    } catch (error) {
      if (error instanceof DatabaseError) {
        return ResultHelpers.err(error);
      }
      return ResultHelpers.err(this.createError('Failed to find submission', error));
    }
  }

  /**
   * Finds all pending submissions
   */
  async findPending(): Promise<Result<Submission[], DatabaseError>> {
    try {
      const db = await this.ensureDatabase();

      const results = await new Promise<SerializedSubmission[]>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          // Filter for pending submissions
          const all = request.result as SerializedSubmission[];
          const pending = all.filter(s => {
            // Check if status is pending
            return s.syncStatus.type === 'pending';
          });
          resolve(pending);
        };

        request.onerror = () => {
          reject(this.createError('Failed to find pending submissions', request.error));
        };
      });

      const submissions = this.deserializeAll(results);
      return ResultHelpers.ok(submissions);
    } catch (error) {
      if (error instanceof DatabaseError) {
        return ResultHelpers.err(error);
      }
      return ResultHelpers.err(this.createError('Failed to find pending submissions', error));
    }
  }

  /**
   * Finds all submissions with optional filter
   */
  async findAll(filter?: SubmissionFilter): Promise<Result<Submission[], DatabaseError>> {
    try {
      const db = await this.ensureDatabase();

      const results = await new Promise<SerializedSubmission[]>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          let data = request.result as SerializedSubmission[];

          // Apply filter if provided
          if (filter) {
            data = this.applyFilter(data, filter);
          }

          resolve(data);
        };

        request.onerror = () => {
          reject(this.createError('Failed to find submissions', request.error));
        };
      });

      const submissions = this.deserializeAll(results);
      return ResultHelpers.ok(submissions);
    } catch (error) {
      if (error instanceof DatabaseError) {
        return ResultHelpers.err(error);
      }
      return ResultHelpers.err(this.createError('Failed to find submissions', error));
    }
  }

  /**
   * Updates existing submission
   */
  async update(submission: Submission): Promise<Result<void, DatabaseError>> {
    // PUT operation updates if exists
    return this.save(submission);
  }

  /**
   * Deletes submission by ID
   */
  async delete(id: SubmissionId): Promise<Result<void, DatabaseError>> {
    try {
      const db = await this.ensureDatabase();

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          reject(this.createError('Failed to delete submission', request.error));
        };
      });

      return ResultHelpers.ok(undefined);
    } catch (error) {
      if (error instanceof DatabaseError) {
        return ResultHelpers.err(error);
      }
      return ResultHelpers.err(this.createError('Failed to delete submission', error));
    }
  }

  /**
   * Counts submissions with optional filter
   */
  async count(filter?: SubmissionFilter): Promise<Result<number, DatabaseError>> {
    try {
      const db = await this.ensureDatabase();

      const count = await new Promise<number>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);

        if (!filter) {
          // No filter, use count()
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => {
            reject(this.createError('Failed to count submissions', request.error));
          };
        } else {
          // With filter, get all and count
          const request = store.getAll();
          request.onsuccess = () => {
            const data = request.result as SerializedSubmission[];
            const filtered = this.applyFilter(data, filter);
            resolve(filtered.length);
          };
          request.onerror = () => {
            reject(this.createError('Failed to count submissions', request.error));
          };
        }
      });

      return ResultHelpers.ok(count);
    } catch (error) {
      if (error instanceof DatabaseError) {
        return ResultHelpers.err(error);
      }
      return ResultHelpers.err(this.createError('Failed to count submissions', error));
    }
  }

  /**
   * Deletes submissions older than timestamp
   */
  async deleteOlderThan(beforeTimestamp: number): Promise<Result<number, DatabaseError>> {
    try {
      const db = await this.ensureDatabase();

      const deletedCount = await new Promise<number>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('by-created');

        // Get all submissions
        const request = index.openCursor();
        let count = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

          if (cursor) {
            const data = cursor.value as SerializedSubmission;
            const createdAt = new Date(data.createdAt).getTime();

            if (createdAt < beforeTimestamp) {
              cursor.delete();
              count++;
            }

            cursor.continue();
          } else {
            resolve(count);
          }
        };

        request.onerror = () => {
          reject(this.createError('Failed to delete old submissions', request.error));
        };
      });

      return ResultHelpers.ok(deletedCount);
    } catch (error) {
      if (error instanceof DatabaseError) {
        return ResultHelpers.err(error);
      }
      return ResultHelpers.err(this.createError('Failed to delete old submissions', error));
    }
  }

  /**
   * Clears all submissions
   */
  async clear(): Promise<Result<void, DatabaseError>> {
    try {
      const db = await this.ensureDatabase();

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          reject(this.createError('Failed to clear submissions', request.error));
        };
      });

      return ResultHelpers.ok(undefined);
    } catch (error) {
      if (error instanceof DatabaseError) {
        return ResultHelpers.err(error);
      }
      return ResultHelpers.err(this.createError('Failed to clear submissions', error));
    }
  }

  /**
   * Deserializes array of submissions
   */
  private deserializeAll(data: SerializedSubmission[]): Submission[] {
    const submissions: Submission[] = [];

    for (const serialized of data) {
      const result = Submission.fromSerialized(serialized);
      if (result.ok) {
        submissions.push(result.value);
      } else {
        console.error('Failed to deserialize submission:', result.error);
      }
    }

    return submissions;
  }

  /**
   * Applies filter to serialized submissions
   */
  private applyFilter(
    data: SerializedSubmission[],
    filter: SubmissionFilter
  ): SerializedSubmission[] {
    return data.filter(s => {
      // Filter by type
      if (filter.type && s.type !== filter.type) {
        return false;
      }

      // Filter by team number
      if (filter.teamNumber !== undefined && s.teamNumber !== filter.teamNumber) {
        return false;
      }

      // Filter by event key
      if (filter.eventKey && s.eventKey !== filter.eventKey) {
        return false;
      }

      // Filter by status type
      if (filter.statusType && s.syncStatus.type !== filter.statusType) {
        return false;
      }

      // Filter by priority
      if (filter.priority !== undefined && s.priority !== filter.priority) {
        return false;
      }

      // Filter by created before
      if (filter.createdBefore) {
        const createdAt = new Date(s.createdAt).getTime();
        const beforeTime = filter.createdBefore instanceof Date
          ? filter.createdBefore.getTime()
          : filter.createdBefore;
        if (createdAt >= beforeTime) {
          return false;
        }
      }

      // Filter by created after
      if (filter.createdAfter) {
        const createdAt = new Date(s.createdAt).getTime();
        const afterTime = filter.createdAfter instanceof Date
          ? filter.createdAfter.getTime()
          : filter.createdAfter;
        if (createdAt <= afterTime) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Ensures database is open
   */
  private async ensureDatabase(): Promise<IDBDatabase> {
    const db = await this.dbManager.openDatabase();
    if (!db) {
      throw new DatabaseError(
        'Database not available',
        'CONNECTION_FAILED',
        true
      );
    }
    return db;
  }

  /**
   * Creates database error
   */
  private createError(message: string, originalError?: unknown): DatabaseError {
    return new DatabaseError(message, 'OPERATION_FAILED', true, { originalError });
  }

  /**
   * Handles quota exceeded errors
   */
  private handleQuotaError(error: DOMException | null): DatabaseError {
    if (error?.name === 'QuotaExceededError') {
      return new DatabaseError(
        'Storage quota exceeded. Please free up space.',
        'QUOTA_EXCEEDED',
        false,
        { error }
      );
    }
    return this.createError('Transaction failed', error);
  }
}