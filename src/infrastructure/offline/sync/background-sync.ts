/**
 * Background Sync Coordinator
 * Manages synchronization of offline submissions with the server
 */

import type { ISyncCoordinator, SyncReport, RetryConfig as PortRetryConfig } from '@/core/offline/ports/sync-coordinator';
import type { ISubmissionRepository } from '@/core/offline/ports/submission-repository';
import type {
  IEventBus,
  SyncStartedEvent,
  SyncCompletedEvent,
  SyncFailedEvent,
  SubmissionSuccessEvent,
  SubmissionFailedEvent,
  SubmissionRetryingEvent
} from '@/core/offline/ports/event-bus';
import { Submission } from '@/core/offline/domain/submission';
import { SyncError, OfflineError } from '@/core/offline/domain/errors';
import { ResultHelpers } from '@/core/offline/domain';
import type { Result, SubmissionId } from '@/core/offline/domain/types';
import { createSubmissionId } from '@/core/offline/domain/types';
import {
  RetryStrategy,
  createRetryStrategy,
  isRetryableError,
  shouldAbortRetry,
  type RetryConfig as InfraRetryConfig
} from './retry-strategy';

/**
 * Sync configuration
 */
export interface SyncConfig {
  apiBaseUrl: string;
  autoSyncInterval?: number; // milliseconds
  batchSize?: number;
  enableBackgroundSync?: boolean;
  retryConfig?: Partial<InfraRetryConfig>;
}

/**
 * Sync result for a single submission
 */
export interface SyncResult {
  submissionId: string;
  success: boolean;
  error?: string;
}

/**
 * Batch sync result
 */
export interface BatchSyncResult {
  totalAttempted: number;
  successful: number;
  failed: number;
  results: SyncResult[];
}

/**
 * Coordinates background synchronization
 */
export class BackgroundSyncCoordinator implements ISyncCoordinator {
  private readonly config: Required<Omit<SyncConfig, 'retryConfig'>> & Pick<SyncConfig, 'retryConfig'>;
  private readonly retryStrategy: RetryStrategy;
  private readonly retryConfig: PortRetryConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncingFlag = false;

  constructor(
    private readonly repository: ISubmissionRepository,
    private readonly eventBus: IEventBus,
    config: SyncConfig
  ) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl,
      autoSyncInterval: config.autoSyncInterval ?? 30000, // 30 seconds
      batchSize: config.batchSize ?? 10,
      enableBackgroundSync: config.enableBackgroundSync ?? true,
      retryConfig: config.retryConfig
    };

    this.retryStrategy = createRetryStrategy(config.retryConfig);

    // Map infrastructure retry config to port retry config
    const infraConfig = config.retryConfig || {};
    this.retryConfig = {
      maxRetries: infraConfig.maxRetries ?? 3,
      baseDelayMs: infraConfig.initialDelayMs ?? 1000,
      maxDelayMs: infraConfig.maxDelayMs ?? 30000,
      exponentialBackoff: (infraConfig.backoffMultiplier ?? 2) > 1,
      useJitter: (infraConfig.jitterMs ?? 500) > 0
    };
  }

  /**
   * ISyncCoordinator: Sync a single submission
   */
  async sync(submission: Submission): Promise<Result<void, SyncError>> {
    try {
      await this.syncSubmission(submission);
      return ResultHelpers.ok(undefined);
    } catch (error) {
      if (error instanceof SyncError) {
        return ResultHelpers.err(error);
      }
      return ResultHelpers.err(
        new SyncError(
          error instanceof Error ? error.message : 'Unknown error',
          0, // attemptNumber
          true, // recoverable by default
          undefined, // no status code
          { error }
        )
      );
    }
  }

  /**
   * ISyncCoordinator: Sync multiple submissions in batch
   */
  async syncBatch(submissions: Submission[]): Promise<Result<SyncReport, SyncError>> {
    const startTime = Date.now();
    const results: SyncResult[] = [];
    const successIds: string[] = [];
    const failedIds: string[] = [];
    const errors: Array<{ submissionId: string; error: string }> = [];

    // Sync submissions in parallel (with some concurrency limit)
    const concurrency = 3;
    for (let i = 0; i < submissions.length; i += concurrency) {
      const batch = submissions.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(submission => this.syncSubmission(submission))
      );

      for (let j = 0; j < batch.length; j++) {
        const result = batchResults[j];
        const submission = batch[j];
        const submissionId = submission.id as string;

        if (result.status === 'fulfilled') {
          results.push({ submissionId, success: true });
          successIds.push(submissionId);
        } else {
          const errorMsg = result.reason?.message || 'Unknown error';
          results.push({ submissionId, success: false, error: errorMsg });
          failedIds.push(submissionId);
          errors.push({ submissionId, error: errorMsg });
        }
      }
    }

    const report: SyncReport = {
      attempted: submissions.length,
      succeeded: successIds.length,
      failed: failedIds.length,
      successIds,
      failedIds,
      errors,
      durationMs: Date.now() - startTime
    };

    return ResultHelpers.ok(report);
  }

  /**
   * ISyncCoordinator: Check if a submission can be retried
   */
  canRetry(submission: Submission): boolean {
    return submission.metadata.retryCount < this.retryConfig.maxRetries;
  }

  /**
   * ISyncCoordinator: Calculate retry delay
   */
  getRetryDelay(attempt: number): number {
    let delay = this.retryConfig.baseDelayMs;

    if (this.retryConfig.exponentialBackoff) {
      delay = Math.min(
        this.retryConfig.baseDelayMs * Math.pow(2, attempt),
        this.retryConfig.maxDelayMs
      );
    }

    if (this.retryConfig.useJitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return delay;
  }

  /**
   * ISyncCoordinator: Check if online
   */
  isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true; // Assume online if can't determine
  }

  /**
   * ISyncCoordinator: Get retry configuration
   */
  getRetryConfig(): PortRetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Starts automatic background sync
   */
  async start(): Promise<void> {
    if (this.syncInterval) {
      console.warn('Background sync already started');
      return;
    }

    if (!this.config.enableBackgroundSync) {
      console.info('Background sync is disabled');
      return;
    }

    console.info('Starting background sync', {
      interval: this.config.autoSyncInterval
    });

    // Initial sync
    await this.syncPending().catch(error => {
      console.error('Initial sync failed:', error);
    });

    // Start interval
    this.syncInterval = setInterval(async () => {
      await this.syncPending().catch(error => {
        console.error('Background sync failed:', error);
      });
    }, this.config.autoSyncInterval);

    this.eventBus.publish<SyncStartedEvent>({ type: 'sync.started', submissionIds: [], count: 0 });
  }

  /**
   * Stops automatic background sync
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.info('Background sync stopped');
      // No 'sync.stopped' event type defined in ports
    }
  }

  /**
   * Syncs all pending submissions
   */
  async syncPending(): Promise<BatchSyncResult> {
    if (this.isSyncingFlag) {
      console.info('Sync already in progress, skipping');
      return {
        totalAttempted: 0,
        successful: 0,
        failed: 0,
        results: []
      };
    }

    this.isSyncingFlag = true;
    this.eventBus.publish<SyncStartedEvent>({ type: 'sync.started', submissionIds: [], count: 0 });

    try {
      // Get pending submissions
      const pendingResult = await this.repository.findPending();

      if (!pendingResult.ok) {
        console.error('Failed to fetch pending submissions:', pendingResult.error);
        this.eventBus.publish<SyncFailedEvent>({
          type: 'sync.failed',
          submissionIds: [],
          error: pendingResult.error.message
        });
        return {
          totalAttempted: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }

      const pending = pendingResult.value;

      if (pending.length === 0) {
        console.info('No pending submissions to sync');
        this.eventBus.publish<SyncCompletedEvent>({
          type: 'sync.completed',
          succeeded: 0,
          failed: 0,
          durationMs: 0
        });
        return {
          totalAttempted: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }

      console.info(`Syncing ${pending.length} pending submissions`);

      // Sync in batches
      const results: SyncResult[] = [];
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < pending.length; i += this.config.batchSize) {
        const batch = pending.slice(i, i + this.config.batchSize);
        const batchResults = await this.syncBatchInternal(batch);

        results.push(...batchResults);
        successful += batchResults.filter(r => r.success).length;
        failed += batchResults.filter(r => !r.success).length;
      }

      const result: BatchSyncResult = {
        totalAttempted: pending.length,
        successful,
        failed,
        results
      };

      this.eventBus.publish<SyncCompletedEvent>({
        type: 'sync.completed',
        succeeded: successful,
        failed: failed,
        durationMs: 0
      });
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      this.eventBus.publish<SyncFailedEvent>({
        type: 'sync.failed',
        submissionIds: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      this.isSyncingFlag = false;
    }
  }

  /**
   * Syncs a single submission by ID
   */
  async syncOne(id: string): Promise<void> {
    const submissionId = createSubmissionId(id);
    const submissionResult = await this.repository.findById(submissionId);

    if (!submissionResult.ok) {
      throw new SyncError(
        `Failed to fetch submission: ${submissionResult.error.message}`,
        0, // attemptNumber
        false // not recoverable
      );
    }

    const submission = submissionResult.value;

    if (!submission) {
      throw new SyncError(
        `Submission ${id} not found`,
        0, // attemptNumber
        false // not recoverable
      );
    }

    if (!submission.canSyncNow()) {
      console.info(`Submission ${id} cannot be synced now, skipping`);
      return;
    }

    try {
      await this.syncSubmission(submission);
      this.eventBus.publish<SubmissionSuccessEvent>({
        type: 'submission.success',
        submissionId: id,
        attempt: submission.metadata.retryCount
      });
    } catch (error) {
      this.eventBus.publish<SubmissionFailedEvent>({
        type: 'submission.failed',
        submissionId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: submission.metadata.retryCount,
        willRetry: this.canRetry(submission)
      });
      throw error;
    }
  }

  /**
   * Forces immediate sync of all pending
   */
  async forceSync(): Promise<BatchSyncResult> {
    console.info('Force sync triggered');
    return this.syncPending();
  }

  /**
   * Checks if currently syncing
   */
  isSyncInProgress(): boolean {
    return this.isSyncingFlag;
  }

  /**
   * Syncs a batch of submissions (internal)
   */
  private async syncBatchInternal(submissions: Submission[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Sync submissions in parallel (with some concurrency limit)
    const concurrency = 3;
    for (let i = 0; i < submissions.length; i += concurrency) {
      const batch = submissions.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(submission => this.syncSubmission(submission))
      );

      for (let j = 0; j < batch.length; j++) {
        const result = batchResults[j];
        const submission = batch[j];

        if (result.status === 'fulfilled') {
          results.push({
            submissionId: submission.id as string,
            success: true
          });
        } else {
          results.push({
            submissionId: submission.id as string,
            success: false,
            error: result.reason?.message || 'Unknown error'
          });
        }
      }
    }

    return results;
  }

  /**
   * Syncs a single submission with retry logic
   */
  private async syncSubmission(submission: Submission): Promise<void> {
    const retryConfig = {
      maxRetries: this.retryConfig.maxRetries,
      baseRetryDelay: this.retryConfig.baseDelayMs,
      maxRetryDelay: this.retryConfig.maxDelayMs,
      exponentialBackoff: this.retryConfig.exponentialBackoff
    };

    // Mark as syncing
    const syncingResult = submission.markAsSyncing(retryConfig);
    if (!syncingResult.ok) {
      throw new SyncError(
        `Cannot start sync: ${syncingResult.error.message}`,
        0, // attemptNumber
        false // not recoverable
      );
    }

    const currentSubmission = syncingResult.value;
    const updateResult = await this.repository.update(currentSubmission);
    if (!updateResult.ok) {
      console.error('Failed to update submission as syncing:', updateResult.error);
    }

    try {
      await this.retryStrategy.executeWithRetry(
        async () => {
          // Make API call
          await this.uploadSubmission(currentSubmission);
        },
        (attempt) => {
          console.info(`Retrying submission ${currentSubmission.id}`, {
            attempt: attempt.attemptNumber,
            delay: attempt.delayMs
          });
          this.eventBus.publish<SubmissionRetryingEvent>({
            type: 'submission.retrying',
            submissionId: currentSubmission.id as string,
            attempt: attempt.attemptNumber,
            nextRetryMs: attempt.delayMs
          });
        }
      );

      // Mark as success
      const successResult = currentSubmission.markAsSuccess();
      if (successResult.ok) {
        const saveResult = await this.repository.update(successResult.value);
        if (!saveResult.ok) {
          console.error('Failed to update submission as synced:', saveResult.error);
        }
      }
    } catch (error) {
      // Mark as failed
      const offlineError = error instanceof OfflineError
        ? error
        : new OfflineError(
            error instanceof Error ? error.message : 'Unknown error',
            'SYNC_FAILED',
            isRetryableError(error),
            { error }
          );

      const failedResult = currentSubmission.markAsFailed(offlineError, retryConfig);
      if (failedResult.ok) {
        const saveResult = await this.repository.update(failedResult.value);
        if (!saveResult.ok) {
          console.error('Failed to update submission as failed:', saveResult.error);
        }
      }

      throw error;
    }
  }

  /**
   * Uploads submission to API
   */
  private async uploadSubmission(submission: Submission): Promise<void> {
    const endpoint = this.getEndpointForSubmission(submission);
    const url = `${this.config.apiBaseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamNumber: submission.data.teamNumber,
          eventKey: submission.data.eventKey,
          matchKey: submission.data.matchKey,
          data: submission.data.data,
          metadata: {
            createdAt: submission.metadata.createdAt.toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new SyncError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          submission.metadata.retryCount,
          this.isRetryableStatus(response.status),
          response.status,
          { data: errorData }
        );
      }

      // Success
      console.info(`Successfully synced submission ${submission.id}`);
    } catch (error) {
      if (error instanceof SyncError) {
        throw error;
      }

      // Network or fetch error
      throw new SyncError(
        error instanceof Error ? error.message : 'Network request failed',
        submission.metadata.retryCount,
        true, // network errors are retryable
        undefined,
        { error }
      );
    }
  }

  /**
   * Gets API endpoint for submission type
   */
  private getEndpointForSubmission(submission: Submission): string {
    switch (submission.data.type) {
      case 'match':
        return '/api/match-scouting';
      case 'pit':
        return '/api/pit-scouting';
      case 'super':
        return '/api/super-scouting';
      default:
        throw new SyncError(
          `Unknown submission type: ${submission.data.type}`,
          0,
          false
        );
    }
  }

  /**
   * Check if HTTP status is retryable
   */
  private isRetryableStatus(status: number): boolean {
    // 5xx errors are retryable
    if (status >= 500) {
      return true;
    }
    // 429 Too Many Requests is retryable
    if (status === 429) {
      return true;
    }
    // 408 Request Timeout is retryable
    if (status === 408) {
      return true;
    }
    // 4xx client errors are not retryable
    return false;
  }
}
