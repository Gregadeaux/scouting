/**
 * Application Service: Sync Service
 *
 * Orchestrates synchronization operations for all pending submissions.
 * Manages periodic sync and retry logic with exponential backoff.
 *
 * Responsibilities:
 * - Sync all pending submissions
 * - Sync individual submissions
 * - Start/stop periodic sync
 * - Handle retry logic
 * - Emit sync events
 */

import type { ISubmissionRepository } from '../ports/submission-repository';
import type { ISyncCoordinator, SyncReport } from '../ports/sync-coordinator';
import type {
  IEventBus,
  SyncStartedEvent,
  SyncFailedEvent,
  SyncCompletedEvent,
  SubmissionSuccessEvent,
  SubmissionRetryingEvent,
  SubmissionFailedEvent,
} from '../ports/event-bus';
import type { Submission } from '../domain/submission';
import type { SubmissionId, Result } from '../domain/types';
import { Result as ResultHelpers } from '../domain/types';
import {
  type OfflineError,
  toOfflineError,
  ItemNotFoundError,
  DeviceOfflineError,
} from '../domain/errors';

// Helper aliases for Result
const ok = ResultHelpers.ok;
const err = ResultHelpers.err;
const isOk = ResultHelpers.isOk;
const isErr = ResultHelpers.isErr;

/**
 * Sync service configuration
 */
export interface SyncServiceConfig {
  /** Interval for periodic sync in milliseconds */
  periodicSyncIntervalMs?: number;

  /** Maximum number of concurrent sync operations */
  maxConcurrentSyncs?: number;

  /** Timeout for sync operations in milliseconds */
  syncTimeoutMs?: number;
}

/**
 * Sync service - manages synchronization operations
 */
export class SyncService {
  private readonly config: Required<SyncServiceConfig>;
  private syncIntervalHandle: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor(
    private readonly repository: ISubmissionRepository,
    private readonly syncCoordinator: ISyncCoordinator,
    private readonly eventBus: IEventBus,
    config?: SyncServiceConfig
  ) {
    this.config = {
      periodicSyncIntervalMs: config?.periodicSyncIntervalMs ?? 30000, // 30 seconds
      maxConcurrentSyncs: config?.maxConcurrentSyncs ?? 3,
      syncTimeoutMs: config?.syncTimeoutMs ?? 30000, // 30 seconds
    };

    // Listen for online events in browser
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncAll().catch(() => {
          // Errors are logged via events
        });
      });
    }
  }

  /**
   * Sync all pending submissions
   *
   * @returns Result with sync report, or error
   */
  async syncAll(): Promise<Result<SyncReport, OfflineError>> {
    // Prevent concurrent sync operations
    if (this.isSyncing) {
      return err(toOfflineError(new Error('Sync already in progress')));
    }

    // Check if online
    if (!this.syncCoordinator.isOnline()) {
      return err(new DeviceOfflineError());
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      // Get all pending submissions
      const pendingResult = await this.repository.findPending();
      if (isErr(pendingResult)) {
        this.isSyncing = false;
        return err(pendingResult.error);
      }

      const pendingSubmissions = pendingResult.value;

      // Nothing to sync
      if (pendingSubmissions.length === 0) {
        this.isSyncing = false;
        const report: SyncReport = {
          attempted: 0,
          succeeded: 0,
          failed: 0,
          successIds: [],
          failedIds: [],
          errors: [],
          durationMs: Date.now() - startTime,
        };
        return ok(report);
      }

      // Emit sync started event
      this.eventBus.publish<SyncStartedEvent>({
        type: 'sync.started',
        submissionIds: pendingSubmissions.map((s: Submission) => s.id),
        count: pendingSubmissions.length,
      });

      // Sync in batches to avoid overwhelming the server
      const syncResult = await this.syncCoordinator.syncBatch(pendingSubmissions);

      if (isErr(syncResult)) {
        this.isSyncing = false;

        // Emit sync failed event
        this.eventBus.publish<SyncFailedEvent>({
          type: 'sync.failed',
          error: syncResult.error.message,
          submissionIds: pendingSubmissions.map((s: Submission) => s.id),
        });

        return err(syncResult.error);
      }

      const report = syncResult.value;

      // Update repository with results
      await this.updateSubmissionsAfterSync(pendingSubmissions, report);

      // Emit sync completed event
      this.eventBus.publish<SyncCompletedEvent>({
        type: 'sync.completed',
        succeeded: report.succeeded,
        failed: report.failed,
        durationMs: report.durationMs,
      });

      this.isSyncing = false;
      return ok(report);
    } catch (error) {
      this.isSyncing = false;
      return err(toOfflineError(error));
    }
  }

  /**
   * Sync a single submission by ID
   *
   * @param id - The submission ID to sync
   * @returns Result with void on success, or error
   */
  async syncOne(id: SubmissionId): Promise<Result<void, OfflineError>> {
    try {
      // Check if online
      if (!this.syncCoordinator.isOnline()) {
        return err(new DeviceOfflineError());
      }

      // Find the submission
      const findResult = await this.repository.findById(id);
      if (isErr(findResult)) {
        return err(findResult.error);
      }

      const submission = findResult.value;
      if (!submission) {
        return err(new ItemNotFoundError(id));
      }

      // Get retry config
      const retryConfig = this.syncCoordinator.getRetryConfig();
      const config = {
        maxRetries: retryConfig.maxRetries,
        baseRetryDelay: retryConfig.baseDelayMs,
        maxRetryDelay: retryConfig.maxDelayMs,
        exponentialBackoff: retryConfig.exponentialBackoff,
      };

      // Mark as syncing
      const syncingResult = submission.markAsSyncing(config);
      if (isErr(syncingResult)) {
        return err(syncingResult.error);
      }
      const syncingSubmission = syncingResult.value;

      const updateResult = await this.repository.update(syncingSubmission);
      if (isErr(updateResult)) {
        return err(updateResult.error);
      }

      // Attempt to sync
      const syncResult = await this.syncCoordinator.sync(syncingSubmission);

      if (isOk(syncResult)) {
        // Success - mark as success
        const successResult = syncingSubmission.markAsSuccess();
        if (isErr(successResult)) {
          return err(successResult.error);
        }
        await this.repository.update(successResult.value);

        this.eventBus.publish<SubmissionSuccessEvent>({
          type: 'submission.success',
          submissionId: id,
          attempt: syncingSubmission.metadata.retryCount,
        });

        return ok(undefined);
      } else {
        // Failed - check if we can retry
        const canRetry = this.syncCoordinator.canRetry(syncingSubmission);

        const failedResult = syncingSubmission.markAsFailed(syncResult.error, config);
        if (isErr(failedResult)) {
          return err(failedResult.error);
        }
        const failedSubmission = failedResult.value;

        await this.repository.update(failedSubmission);

        if (canRetry) {
          const retryDelay = this.syncCoordinator.getRetryDelay(failedSubmission.metadata.retryCount);

          this.eventBus.publish<SubmissionRetryingEvent>({
            type: 'submission.retrying',
            submissionId: id,
            attempt: failedSubmission.metadata.retryCount,
            nextRetryMs: retryDelay,
          });

          // Schedule retry
          this.scheduleRetry(id, retryDelay);
        } else {
          this.eventBus.publish<SubmissionFailedEvent>({
            type: 'submission.failed',
            submissionId: id,
            error: syncResult.error.message,
            attempt: failedSubmission.metadata.retryCount,
            willRetry: false,
          });
        }

        return err(syncResult.error);
      }
    } catch (error) {
      return err(toOfflineError(error));
    }
  }

  /**
   * Start periodic background sync
   *
   * @param intervalMs - Optional custom interval in milliseconds
   */
  startPeriodicSync(intervalMs?: number): void {
    if (this.syncIntervalHandle) {
      // Already started
      return;
    }

    const interval = intervalMs ?? this.config.periodicSyncIntervalMs;

    this.syncIntervalHandle = setInterval(() => {
      if (this.syncCoordinator.isOnline() && !this.isSyncing) {
        this.syncAll().catch(() => {
          // Errors are logged via events
        });
      }
    }, interval);
  }

  /**
   * Stop periodic background sync
   */
  stopPeriodicSync(): void {
    if (this.syncIntervalHandle) {
      clearInterval(this.syncIntervalHandle);
      this.syncIntervalHandle = null;
    }
  }

  /**
   * Check if periodic sync is running
   */
  isPeriodicSyncRunning(): boolean {
    return this.syncIntervalHandle !== null;
  }

  /**
   * Check if a sync operation is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Update submissions in repository after batch sync
   */
  private async updateSubmissionsAfterSync(
    submissions: Submission[],
    report: SyncReport
  ): Promise<void> {
    // Get retry config
    const retryConfig = this.syncCoordinator.getRetryConfig();
    const config = {
      maxRetries: retryConfig.maxRetries,
      baseRetryDelay: retryConfig.baseDelayMs,
      maxRetryDelay: retryConfig.maxDelayMs,
      exponentialBackoff: retryConfig.exponentialBackoff,
    };

    for (const submission of submissions) {
      const submissionId = submission.id;

      if (report.successIds.includes(submissionId)) {
        // Mark as success
        const successResult = submission.markAsSuccess();
        if (isOk(successResult)) {
          await this.repository.update(successResult.value);

          this.eventBus.publish<SubmissionSuccessEvent>({
            type: 'submission.success',
            submissionId,
            attempt: submission.metadata.retryCount,
          });
        }
      } else if (report.failedIds.includes(submissionId)) {
        // Find the error for this submission
        const errorInfo = report.errors.find((e) => e.submissionId === submissionId);
        const errorMessage = errorInfo?.error ?? 'Unknown error';

        // Create error object
        const syncError = toOfflineError(new Error(errorMessage));

        // Check if we can retry
        const canRetry = this.syncCoordinator.canRetry(submission);

        // Mark as failed (which handles retryable vs non-retryable)
        const failedResult = submission.markAsFailed(syncError, config);
        if (isOk(failedResult)) {
          const failedSubmission = failedResult.value;
          await this.repository.update(failedSubmission);

          if (canRetry) {
            const retryDelay = this.syncCoordinator.getRetryDelay(failedSubmission.metadata.retryCount);

            this.eventBus.publish<SubmissionRetryingEvent>({
              type: 'submission.retrying',
              submissionId,
              attempt: failedSubmission.metadata.retryCount,
              nextRetryMs: retryDelay,
            });

            // Schedule retry
            this.scheduleRetry(submission.id, retryDelay);
          } else {
            this.eventBus.publish<SubmissionFailedEvent>({
              type: 'submission.failed',
              submissionId,
              error: errorMessage,
              attempt: failedSubmission.metadata.retryCount,
              willRetry: false,
            });
          }
        }
      }
    }
  }

  /**
   * Schedule a retry for a submission
   */
  private scheduleRetry(id: SubmissionId, delayMs: number): void {
    setTimeout(() => {
      this.syncOne(id).catch(() => {
        // Errors are logged via events
      });
    }, delayMs);
  }
}
