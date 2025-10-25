/**
 * Port Interface: Sync Coordinator
 *
 * Defines the contract for synchronizing submissions with the server.
 * This handles network communication and retry logic.
 *
 * Dependency Inversion Principle: Core domain depends on this interface,
 * not on concrete HTTP implementations.
 */

import type { Submission } from '../domain/submission';
import type { Result } from '../domain/types';
import type { SyncError } from '../domain/errors';

/**
 * Result of a batch sync operation
 */
export interface SyncReport {
  /** Total number of submissions attempted */
  attempted: number;

  /** Number of successful syncs */
  succeeded: number;

  /** Number of failed syncs */
  failed: number;

  /** Submission IDs that succeeded */
  successIds: string[];

  /** Submission IDs that failed */
  failedIds: string[];

  /** Detailed errors for failed submissions */
  errors: Array<{
    submissionId: string;
    error: string;
  }>;

  /** Duration of the sync operation in milliseconds */
  durationMs: number;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;

  /** Base delay in milliseconds */
  baseDelayMs: number;

  /** Maximum delay in milliseconds */
  maxDelayMs: number;

  /** Whether to use exponential backoff */
  exponentialBackoff: boolean;

  /** Whether to add jitter to prevent thundering herd */
  useJitter: boolean;
}

/**
 * Sync coordinator interface
 */
export interface ISyncCoordinator {
  /**
   * Sync a single submission to the server
   *
   * @param submission - The submission to sync
   * @returns Result with void on success, or SyncError on failure
   */
  sync(submission: Submission): Promise<Result<void, SyncError>>;

  /**
   * Sync multiple submissions in batch
   *
   * @param submissions - Array of submissions to sync
   * @returns Result with SyncReport on success, or SyncError on failure
   */
  syncBatch(submissions: Submission[]): Promise<Result<SyncReport, SyncError>>;

  /**
   * Check if a submission can be retried
   *
   * @param submission - The submission to check
   * @returns True if the submission can be retried
   */
  canRetry(submission: Submission): boolean;

  /**
   * Calculate the delay before the next retry attempt
   *
   * @param attempt - The attempt number (0-based)
   * @returns Delay in milliseconds
   */
  getRetryDelay(attempt: number): number;

  /**
   * Check if the device is currently online
   *
   * @returns True if online, false otherwise
   */
  isOnline(): boolean;

  /**
   * Get the current retry configuration
   *
   * @returns The retry configuration
   */
  getRetryConfig(): RetryConfig;
}
