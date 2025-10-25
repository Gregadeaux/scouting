/**
 * Application Service: Submission Service
 *
 * Orchestrates business logic for managing submissions.
 * Depends only on port interfaces (Dependency Inversion Principle).
 *
 * Responsibilities:
 * - Queue new submissions
 * - Retrieve queue state
 * - Retry failed submissions
 * - Delete submissions
 * - Emit domain events
 */

import type { ISubmissionRepository } from '../ports/submission-repository';
import type { ISyncCoordinator } from '../ports/sync-coordinator';
import type {
  IEventBus,
  SubmissionQueuedEvent,
  SubmissionRetryingEvent,
  SubmissionDeletedEvent,
  SubmissionSuccessEvent,
  SubmissionFailedEvent,
  QueueStateChangedEvent,
} from '../ports/event-bus';
import type { SubmissionData } from '../domain/submission';
import { Submission } from '../domain/submission';
import type { SubmissionId, Result } from '../domain/types';
import { Result as ResultHelpers, Priority } from '../domain/types';
import type { SyncStatus } from '../domain/sync-status';
import { isPending, isSyncing, isSuccess, isFailed } from '../domain/sync-status';
import {
  type OfflineError,
  isRecoverableError,
  toOfflineError,
  ItemNotFoundError,
} from '../domain/errors';

// Helper to check Result types
const isOk = ResultHelpers.isOk;
const isErr = ResultHelpers.isErr;

/**
 * Queue state for UI display
 */
export interface QueueState {
  /** Total number of submissions in queue */
  total: number;

  /** Number of pending submissions */
  pending: number;

  /** Number of currently syncing submissions */
  syncing: number;

  /** Number of failed submissions */
  failed: number;

  /** Number of successful submissions (kept for history) */
  success: number;

  /** All submissions */
  submissions: Submission[];
}

// Helper aliases for Result
const ok = ResultHelpers.ok;
const err = ResultHelpers.err;

/**
 * Submission service configuration
 */
export interface SubmissionServiceConfig {
  /** Maximum number of submissions to keep in queue */
  maxQueueSize?: number;

  /** Auto-cleanup successful submissions older than this (ms) */
  autoCleanupAfterMs?: number;
}

/**
 * Submission service - manages the offline submission queue
 */
export class SubmissionService {
  private readonly config: Required<SubmissionServiceConfig>;

  constructor(
    private readonly repository: ISubmissionRepository,
    private readonly syncCoordinator: ISyncCoordinator,
    private readonly eventBus: IEventBus,
    config?: SubmissionServiceConfig
  ) {
    this.config = {
      maxQueueSize: config?.maxQueueSize ?? 1000,
      autoCleanupAfterMs: config?.autoCleanupAfterMs ?? 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  /**
   * Queue a new submission for sync
   *
   * @param data - The submission data to queue
   * @returns Result with the submission ID, or error
   */
  async queueSubmission(data: SubmissionData): Promise<Result<SubmissionId, OfflineError>> {
    try {
      // Check if queue is full
      const countResult = await this.repository.count();
      if (isErr(countResult)) {
        return err(countResult.error);
      }

      if (countResult.value >= this.config.maxQueueSize) {
        // Auto-cleanup old successful submissions
        await this.cleanupOldSubmissions();

        // Check again after cleanup
        const newCountResult = await this.repository.count();
        if (isErr(newCountResult)) {
          return err(newCountResult.error);
        }

        if (newCountResult.value >= this.config.maxQueueSize) {
          return err(
            toOfflineError(
              new Error(`Queue is full: ${newCountResult.value}/${this.config.maxQueueSize}`)
            )
          );
        }
      }

      // Create new submission entity
      const createResult = Submission.create(data);
      if (isErr(createResult)) {
        return err(createResult.error);
      }
      const submission = createResult.value;

      // Save to repository
      const saveResult = await this.repository.save(submission);
      if (isErr(saveResult)) {
        return err(saveResult.error);
      }

      // Emit event
      this.eventBus.publish<SubmissionQueuedEvent>({
        type: 'submission.queued',
        submissionId: submission.id,
        url: '',
        method: 'POST',
      });

      // Emit queue state changed
      await this.emitQueueStateChanged();

      // If online, try to sync immediately
      if (this.syncCoordinator.isOnline()) {
        // Fire and forget - don't wait for sync
        this.syncOneInBackground(submission.id).catch(() => {
          // Sync will be retried later
        });
      }

      return ok(submission.id);
    } catch (error) {
      return err(toOfflineError(error));
    }
  }

  /**
   * Get the current queue state
   *
   * @returns Result with the queue state, or error
   */
  async getQueue(): Promise<Result<QueueState, OfflineError>> {
    try {
      const allResult = await this.repository.findAll();
      if (isErr(allResult)) {
        return err(allResult.error);
      }

      const submissions = allResult.value;

      const state: QueueState = {
        total: submissions.length,
        pending: submissions.filter((s: Submission) => isPending(s.syncStatus)).length,
        syncing: submissions.filter((s: Submission) => isSyncing(s.syncStatus)).length,
        failed: submissions.filter((s: Submission) => isFailed(s.syncStatus)).length,
        success: submissions.filter((s: Submission) => isSuccess(s.syncStatus)).length,
        submissions,
      };

      return ok(state);
    } catch (error) {
      return err(toOfflineError(error));
    }
  }

  /**
   * Retry a failed submission
   *
   * @param id - The submission ID to retry
   * @returns Result with void on success, or error
   */
  async retrySubmission(id: SubmissionId): Promise<Result<void, OfflineError>> {
    try {
      // Find the submission
      const findResult = await this.repository.findById(id);
      if (isErr(findResult)) {
        return err(findResult.error);
      }

      const submission = findResult.value;
      if (!submission) {
        return err(new ItemNotFoundError(id));
      }

      // Check if it can be retried
      if (!this.syncCoordinator.canRetry(submission)) {
        return err(
          toOfflineError(new Error('Submission cannot be retried (max retries exceeded)'))
        );
      }

      // Get retry config
      const retryConfig = this.syncCoordinator.getRetryConfig();
      const config = {
        maxRetries: retryConfig.maxRetries,
        baseRetryDelay: retryConfig.baseDelayMs,
        maxRetryDelay: retryConfig.maxDelayMs,
        exponentialBackoff: retryConfig.exponentialBackoff,
      };

      // Mark as syncing (which will increment retry count)
      const markResult = submission.markAsSyncing(config);
      if (isErr(markResult)) {
        return err(markResult.error);
      }
      const updatedSubmission = markResult.value;

      // Save
      const updateResult = await this.repository.update(updatedSubmission);
      if (isErr(updateResult)) {
        return err(updateResult.error);
      }

      // Emit event
      this.eventBus.publish<SubmissionRetryingEvent>({
        type: 'submission.retrying',
        submissionId: id,
        attempt: updatedSubmission.metadata.retryCount,
        nextRetryMs: 0, // Immediate retry
      });

      // Emit queue state changed
      await this.emitQueueStateChanged();

      // Try to sync immediately if online
      if (this.syncCoordinator.isOnline()) {
        await this.syncOneInBackground(id);
      }

      return ok(undefined);
    } catch (error) {
      return err(toOfflineError(error));
    }
  }

  /**
   * Delete a submission from the queue
   *
   * @param id - The submission ID to delete
   * @returns Result with void on success, or error
   */
  async deleteSubmission(id: SubmissionId): Promise<Result<void, OfflineError>> {
    try {
      const deleteResult = await this.repository.delete(id);
      if (isErr(deleteResult)) {
        return err(deleteResult.error);
      }

      // Emit event
      this.eventBus.publish<SubmissionDeletedEvent>({
        type: 'submission.deleted',
        submissionId: id,
      });

      // Emit queue state changed
      await this.emitQueueStateChanged();

      return ok(undefined);
    } catch (error) {
      return err(toOfflineError(error));
    }
  }

  /**
   * Get a specific submission by ID
   *
   * @param id - The submission ID
   * @returns Result with the submission, or error
   */
  async getSubmission(id: SubmissionId): Promise<Result<Submission | null, OfflineError>> {
    try {
      const findResult = await this.repository.findById(id);
      if (isErr(findResult)) {
        return err(findResult.error);
      }

      return ok(findResult.value);
    } catch (error) {
      return err(toOfflineError(error));
    }
  }

  /**
   * Cleanup old successful submissions
   */
  private async cleanupOldSubmissions(): Promise<void> {
    const beforeTimestamp = Date.now() - this.config.autoCleanupAfterMs;
    await this.repository.deleteOlderThan(beforeTimestamp);
  }

  /**
   * Sync one submission in the background
   */
  private async syncOneInBackground(id: SubmissionId): Promise<void> {
    const findResult = await this.repository.findById(id);
    if (isErr(findResult) || !findResult.value) {
      return;
    }

    const submission = findResult.value;

    // Get retry config
    const retryConfig = this.syncCoordinator.getRetryConfig();
    const config = {
      maxRetries: retryConfig.maxRetries,
      baseRetryDelay: retryConfig.baseDelayMs,
      maxRetryDelay: retryConfig.maxDelayMs,
      exponentialBackoff: retryConfig.exponentialBackoff,
    };

    // Mark as syncing before sync attempt
    const syncingResult = submission.markAsSyncing(config);
    if (isErr(syncingResult)) {
      return;
    }
    const syncingSubmission = syncingResult.value;

    await this.repository.update(syncingSubmission);
    const syncResult = await this.syncCoordinator.sync(syncingSubmission);

    if (isOk(syncResult)) {
      // Mark as success
      const successResult = syncingSubmission.markAsSuccess();
      if (isOk(successResult)) {
        await this.repository.update(successResult.value);

        this.eventBus.publish<SubmissionSuccessEvent>({
          type: 'submission.success',
          submissionId: id,
          attempt: syncingSubmission.metadata.retryCount,
        });
      }
    } else {
      // Handle failure
      const canRetry = this.syncCoordinator.canRetry(syncingSubmission);
      const failedResult = syncingSubmission.markAsFailed(syncResult.error, config);

      if (isOk(failedResult)) {
        await this.repository.update(failedResult.value);

        this.eventBus.publish<SubmissionFailedEvent>({
          type: 'submission.failed',
          submissionId: id,
          error: syncResult.error.message,
          attempt: syncingSubmission.metadata.retryCount,
          willRetry: canRetry,
        });
      }
    }

    await this.emitQueueStateChanged();
  }

  /**
   * Emit queue state changed event
   */
  private async emitQueueStateChanged(): Promise<void> {
    const queueResult = await this.getQueue();
    if (isOk(queueResult)) {
      const state = queueResult.value;
      this.eventBus.publish<QueueStateChangedEvent>({
        type: 'queue.stateChanged',
        pendingCount: state.pending,
        failedCount: state.failed,
        totalCount: state.total,
      });
    }
  }
}
