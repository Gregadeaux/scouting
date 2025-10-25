/**
 * Port Interface: Submission Repository
 *
 * Defines the contract for storing and retrieving submissions.
 * This is a port (interface) in hexagonal architecture - the implementation
 * (adapter) will be in the infrastructure layer.
 *
 * Dependency Inversion Principle: Core domain depends on this interface,
 * not on concrete implementations like IndexedDB.
 */

import type { Submission } from '../domain/submission';
import type { SubmissionId, SubmissionFilter, Result } from '../domain/types';
import type { DatabaseError } from '../domain/errors';

/**
 * Repository interface for Submission persistence
 */
export interface ISubmissionRepository {
  /**
   * Save a new submission to storage
   *
   * @param submission - The submission entity to save
   * @returns Result with void on success, or DatabaseError on failure
   */
  save(submission: Submission): Promise<Result<void, DatabaseError>>;

  /**
   * Find a submission by its ID
   *
   * @param id - The submission ID to search for
   * @returns Result with the submission if found, null if not found, or DatabaseError on failure
   */
  findById(id: SubmissionId): Promise<Result<Submission | null, DatabaseError>>;

  /**
   * Find all pending submissions (ready to sync)
   *
   * @returns Result with array of pending submissions, or DatabaseError on failure
   */
  findPending(): Promise<Result<Submission[], DatabaseError>>;

  /**
   * Find all submissions matching a filter
   *
   * @param filter - Optional filter criteria
   * @returns Result with array of submissions, or DatabaseError on failure
   */
  findAll(filter?: SubmissionFilter): Promise<Result<Submission[], DatabaseError>>;

  /**
   * Update an existing submission
   *
   * @param submission - The updated submission entity
   * @returns Result with void on success, or DatabaseError on failure
   */
  update(submission: Submission): Promise<Result<void, DatabaseError>>;

  /**
   * Delete a submission by ID
   *
   * @param id - The submission ID to delete
   * @returns Result with void on success, or DatabaseError on failure
   */
  delete(id: SubmissionId): Promise<Result<void, DatabaseError>>;

  /**
   * Count submissions matching a filter
   *
   * @param filter - Optional filter criteria
   * @returns Result with count, or DatabaseError on failure
   */
  count(filter?: SubmissionFilter): Promise<Result<number, DatabaseError>>;

  /**
   * Delete all submissions older than a certain timestamp
   *
   * @param beforeTimestamp - Delete submissions created before this timestamp
   * @returns Result with number of deleted submissions, or DatabaseError on failure
   */
  deleteOlderThan(beforeTimestamp: number): Promise<Result<number, DatabaseError>>;

  /**
   * Clear all submissions (use with caution!)
   *
   * @returns Result with void on success, or DatabaseError on failure
   */
  clear(): Promise<Result<void, DatabaseError>>;
}
