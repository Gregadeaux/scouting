/**
 * Sync status types for tracking submission state
 * Uses discriminated unions for type-safe state management
 */

import { OfflineError } from './errors';

/**
 * Pending status - item is queued but not yet syncing
 */
export interface PendingStatus {
  type: 'pending';
  /** When the item was added to the queue */
  queuedAt: Date;
}

/**
 * Syncing status - item is currently being synchronized
 */
export interface SyncingStatus {
  type: 'syncing';
  /** When the current sync attempt started */
  startedAt: Date;
  /** Current attempt number (1-indexed) */
  attempt: number;
}

/**
 * Success status - item was successfully synchronized
 */
export interface SuccessStatus {
  type: 'success';
  /** When the sync completed successfully */
  completedAt: Date;
  /** Server response data (optional) */
  response?: Record<string, unknown>;
}

/**
 * Failed status - sync failed and may or may not be retryable
 */
export interface FailedStatus {
  type: 'failed';
  /** When the sync failed */
  failedAt: Date;
  /** The error that caused the failure */
  error: OfflineError;
  /** Whether this item can be retried */
  canRetry: boolean;
  /** Next retry attempt time (if canRetry is true) */
  nextRetryAt?: Date;
}

/**
 * Discriminated union of all possible sync statuses
 */
export type SyncStatus =
  | PendingStatus
  | SyncingStatus
  | SuccessStatus
  | FailedStatus;

/**
 * Factory functions for creating sync status objects
 */
export const SyncStatus = {
  /**
   * Create a new pending status
   */
  pending(queuedAt: Date = new Date()): PendingStatus {
    return {
      type: 'pending',
      queuedAt,
    };
  },

  /**
   * Create a new syncing status
   */
  syncing(attempt: number, startedAt: Date = new Date()): SyncingStatus {
    if (attempt < 1) {
      throw new Error('Attempt number must be at least 1');
    }
    return {
      type: 'syncing',
      startedAt,
      attempt,
    };
  },

  /**
   * Create a new success status
   */
  success(
    completedAt: Date = new Date(),
    response?: Record<string, unknown>
  ): SuccessStatus {
    return {
      type: 'success',
      completedAt,
      response,
    };
  },

  /**
   * Create a new failed status
   */
  failed(
    error: OfflineError,
    canRetry: boolean,
    failedAt: Date = new Date(),
    nextRetryAt?: Date
  ): FailedStatus {
    return {
      type: 'failed',
      failedAt,
      error,
      canRetry,
      nextRetryAt,
    };
  },
};

/**
 * Type guards for sync status
 */

export function isPending(status: SyncStatus): status is PendingStatus {
  return status.type === 'pending';
}

export function isSyncing(status: SyncStatus): status is SyncingStatus {
  return status.type === 'syncing';
}

export function isSuccess(status: SyncStatus): status is SuccessStatus {
  return status.type === 'success';
}

export function isFailed(status: SyncStatus): status is FailedStatus {
  return status.type === 'failed';
}

/**
 * Check if status represents a terminal state (success or non-retryable failure)
 */
export function isTerminal(status: SyncStatus): boolean {
  return isSuccess(status) || (isFailed(status) && !status.canRetry);
}

/**
 * Check if status represents an active state (pending or syncing)
 */
export function isActive(status: SyncStatus): boolean {
  return isPending(status) || isSyncing(status);
}

/**
 * Check if status can transition to syncing
 */
export function canStartSync(status: SyncStatus): boolean {
  if (isPending(status)) {
    return true;
  }
  if (isFailed(status) && status.canRetry) {
    // Can retry if nextRetryAt is not set or has passed
    if (!status.nextRetryAt) {
      return true;
    }
    return new Date() >= status.nextRetryAt;
  }
  return false;
}

/**
 * State transition functions
 * These ensure valid state transitions following the state machine rules
 */

/**
 * Transition from pending to syncing
 */
export function startSync(
  status: SyncStatus,
  attempt: number
): SyncingStatus | null {
  if (!canStartSync(status)) {
    return null;
  }
  return SyncStatus.syncing(attempt);
}

/**
 * Transition from syncing to success
 */
export function markSuccess(
  status: SyncStatus,
  response?: Record<string, unknown>
): SuccessStatus | null {
  if (!isSyncing(status)) {
    return null;
  }
  return SyncStatus.success(new Date(), response);
}

/**
 * Transition from syncing to failed
 */
export function markFailed(
  status: SyncStatus,
  error: OfflineError,
  canRetry: boolean,
  nextRetryAt?: Date
): FailedStatus | null {
  if (!isSyncing(status)) {
    return null;
  }
  return SyncStatus.failed(error, canRetry, new Date(), nextRetryAt);
}

/**
 * Calculate next retry time using exponential backoff
 */
export function calculateNextRetryTime(
  attemptNumber: number,
  baseDelay: number,
  maxDelay: number,
  exponentialBackoff: boolean
): Date {
  let delay: number;

  if (exponentialBackoff) {
    // Exponential backoff: baseDelay * 2^(attempt - 1)
    // Add jitter to prevent thundering herd
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * baseDelay * 0.3; // Up to 30% jitter
    delay = Math.min(exponentialDelay + jitter, maxDelay);
  } else {
    // Linear backoff with jitter
    const linearDelay = baseDelay * attemptNumber;
    const jitter = Math.random() * baseDelay * 0.3;
    delay = Math.min(linearDelay + jitter, maxDelay);
  }

  const nextRetry = new Date();
  nextRetry.setMilliseconds(nextRetry.getMilliseconds() + delay);
  return nextRetry;
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: SyncStatus): string {
  switch (status.type) {
    case 'pending':
      return 'Queued for sync';
    case 'syncing':
      return `Syncing (attempt ${status.attempt})`;
    case 'success':
      return 'Successfully synced';
    case 'failed':
      if (status.canRetry) {
        if (status.nextRetryAt) {
          const now = new Date();
          if (status.nextRetryAt > now) {
            const seconds = Math.ceil(
              (status.nextRetryAt.getTime() - now.getTime()) / 1000
            );
            return `Failed - retrying in ${seconds}s`;
          }
          return 'Failed - ready to retry';
        }
        return 'Failed - will retry';
      }
      return 'Failed permanently';
    default:
      // Exhaustive check
      const _exhaustive: never = status;
      return 'Unknown status';
  }
}

/**
 * Get status priority for queue ordering
 * Higher numbers = higher priority
 */
export function getStatusPriority(status: SyncStatus): number {
  switch (status.type) {
    case 'failed':
      // Failed items that can retry get higher priority
      return status.canRetry ? 2 : 0;
    case 'pending':
      return 1;
    case 'syncing':
      return 3; // Highest priority - already in progress
    case 'success':
      return -1; // Should be removed from queue
    default:
      const _exhaustive: never = status;
      return 0;
  }
}

/**
 * Serialize sync status to JSON
 */
export function serializeStatus(status: SyncStatus): Record<string, unknown> {
  const base = { type: status.type };

  switch (status.type) {
    case 'pending':
      return {
        ...base,
        queuedAt: status.queuedAt.toISOString(),
      };
    case 'syncing':
      return {
        ...base,
        startedAt: status.startedAt.toISOString(),
        attempt: status.attempt,
      };
    case 'success':
      return {
        ...base,
        completedAt: status.completedAt.toISOString(),
        response: status.response,
      };
    case 'failed':
      return {
        ...base,
        failedAt: status.failedAt.toISOString(),
        error: status.error.toJSON(),
        canRetry: status.canRetry,
        nextRetryAt: status.nextRetryAt?.toISOString(),
      };
    default:
      const _exhaustive: never = status;
      return base;
  }
}

/**
 * Deserialize sync status from JSON
 */
export function deserializeStatus(json: Record<string, unknown>): SyncStatus {
  const type = json.type as string;

  switch (type) {
    case 'pending':
      return SyncStatus.pending(new Date(json.queuedAt as string));

    case 'syncing':
      return SyncStatus.syncing(
        json.attempt as number,
        new Date(json.startedAt as string)
      );

    case 'success':
      return SyncStatus.success(
        new Date(json.completedAt as string),
        json.response as Record<string, unknown> | undefined
      );

    case 'failed': {
      const error = OfflineError.fromJSON(json.error as Record<string, unknown>);
      return SyncStatus.failed(
        error,
        json.canRetry as boolean,
        new Date(json.failedAt as string),
        json.nextRetryAt ? new Date(json.nextRetryAt as string) : undefined
      );
    }

    default:
      throw new Error(`Unknown sync status type: ${type}`);
  }
}
