/**
 * Submission entity - core domain object for offline queue items
 * Implements immutable design with factory methods and state transitions
 */

import {
  SubmissionId,
  TeamNumber,
  ScoutingType,
  Priority,
  Result,
  SerializedSubmission,
  createSubmissionId,
  createTeamNumber,
  isScoutingType,
} from './types';
import {
  SyncStatus,
  isPending,
  isSyncing,
  isSuccess,
  isFailed,
  startSync,
  markSuccess,
  markFailed,
  calculateNextRetryTime,
  serializeStatus,
  deserializeStatus,
} from './sync-status';
import {
  ValidationError,
  OfflineError,
  isRecoverableError,
} from './errors';

/**
 * Data payload for a submission
 * This is the actual scouting data being submitted
 */
export interface SubmissionData {
  /** Type of scouting (match, pit, super) */
  type: ScoutingType;
  /** Team number being scouted */
  teamNumber: TeamNumber;
  /** Event key (e.g., "2025arc") */
  eventKey: string;
  /** Match key (e.g., "2025arc_qm1") - optional for pit scouting */
  matchKey?: string;
  /** The actual scouting data (auto, teleop, endgame, etc.) */
  data: Record<string, unknown>;
}

/**
 * Metadata about a submission
 */
export interface SubmissionMetadata {
  /** When the submission was created */
  createdAt: Date;
  /** When the submission was last updated */
  updatedAt: Date;
  /** Number of sync attempts made */
  retryCount: number;
  /** Priority for queue ordering */
  priority: Priority;
  /** Version number for optimistic concurrency control */
  version: number;
}

/**
 * Submission entity - immutable domain object
 */
export class Submission {
  /**
   * Private constructor - use factory methods instead
   */
  private constructor(
    public readonly id: SubmissionId,
    public readonly data: Readonly<SubmissionData>,
    public readonly metadata: Readonly<SubmissionMetadata>,
    public readonly syncStatus: SyncStatus
  ) {
    // Ensure immutability
    Object.freeze(this);
    Object.freeze(this.data);
    Object.freeze(this.metadata);
  }

  /**
   * Factory method to create a new submission with validation
   */
  static create(
    data: SubmissionData,
    priority: Priority = Priority.NORMAL
  ): Result<Submission, ValidationError> {
    // Validate required fields
    const error = Submission.validateData(data);
    if (error) {
      return Result.err(error);
    }

    // Generate unique ID
    const id = createSubmissionId(Submission.generateId());

    // Create metadata
    const now = new Date();
    const metadata: SubmissionMetadata = {
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      priority,
      version: 1,
    };

    // Create initial sync status
    const syncStatus = SyncStatus.pending(now);

    // Create submission
    const submission = new Submission(id, data, metadata, syncStatus);

    return Result.ok(submission);
  }

  /**
   * Factory method to restore a submission from storage
   */
  static fromSerialized(
    serialized: SerializedSubmission
  ): Result<Submission, ValidationError> {
    try {
      const id = createSubmissionId(serialized.id);
      const teamNumber = createTeamNumber(serialized.teamNumber);

      const data: SubmissionData = {
        type: serialized.type,
        teamNumber,
        eventKey: serialized.eventKey,
        matchKey: serialized.matchKey,
        data: serialized.data,
      };

      const metadata: SubmissionMetadata = {
        createdAt: new Date(serialized.createdAt),
        updatedAt: new Date(serialized.updatedAt),
        retryCount: serialized.retryCount,
        priority: serialized.priority,
        version: serialized.version,
      };

      const syncStatus = deserializeStatus(serialized.syncStatus);

      const submission = new Submission(id, data, metadata, syncStatus);

      return Result.ok(submission);
    } catch (error) {
      return Result.err(
        new ValidationError(
          `Failed to deserialize submission: ${error instanceof Error ? error.message : String(error)}`,
          [],
          { serialized }
        )
      );
    }
  }

  /**
   * Validate submission data
   * Returns null if valid, ValidationError if invalid
   */
  private static validateData(
    data: SubmissionData
  ): ValidationError | null {
    const errors: string[] = [];

    // Validate type
    if (!isScoutingType(data.type)) {
      errors.push('type');
    }

    // Validate team number
    if (!data.teamNumber || typeof data.teamNumber !== 'number') {
      errors.push('teamNumber');
    }

    // Validate event key
    if (!data.eventKey || typeof data.eventKey !== 'string') {
      errors.push('eventKey');
    }

    // Validate match key for match scouting
    if (data.type === 'match' && !data.matchKey) {
      errors.push('matchKey');
    }

    // Validate data payload
    if (!data.data || typeof data.data !== 'object') {
      errors.push('data');
    }

    if (errors.length > 0) {
      return new ValidationError('Invalid submission data', errors, { data });
    }

    return null;
  }

  /**
   * Generate a unique ID for a submission
   */
  private static generateId(): string {
    // Use timestamp + random string for uniqueness
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `sub_${timestamp}_${random}`;
  }

  /**
   * State transition: Mark as syncing
   */
  markAsSyncing(config: {
    maxRetries: number;
    baseRetryDelay: number;
    maxRetryDelay: number;
    exponentialBackoff: boolean;
  }): Result<Submission, OfflineError> {
    // Calculate next attempt number
    const nextAttempt = this.metadata.retryCount + 1;

    // Check if max retries exceeded
    if (nextAttempt > config.maxRetries) {
      return Result.err(
        new OfflineError(
          `Maximum retries (${config.maxRetries}) exceeded`,
          'MAX_RETRIES_EXCEEDED',
          false,
          { submissionId: this.id, retryCount: this.metadata.retryCount }
        )
      );
    }

    // Transition to syncing status
    const newStatus = startSync(this.syncStatus, nextAttempt);
    if (!newStatus) {
      return Result.err(
        new OfflineError(
          `Cannot start sync from current status: ${this.syncStatus.type}`,
          'INVALID_STATE_TRANSITION',
          false,
          { submissionId: this.id, currentStatus: this.syncStatus.type }
        )
      );
    }

    // Create new submission with updated status and metadata
    const newMetadata: SubmissionMetadata = {
      ...this.metadata,
      updatedAt: new Date(),
      retryCount: nextAttempt,
      version: this.metadata.version + 1,
    };

    return Result.ok(
      new Submission(this.id, this.data, newMetadata, newStatus)
    );
  }

  /**
   * State transition: Mark as success
   */
  markAsSuccess(
    response?: Record<string, unknown>
  ): Result<Submission, OfflineError> {
    const newStatus = markSuccess(this.syncStatus, response);
    if (!newStatus) {
      return Result.err(
        new OfflineError(
          `Cannot mark as success from current status: ${this.syncStatus.type}`,
          'INVALID_STATE_TRANSITION',
          false,
          { submissionId: this.id, currentStatus: this.syncStatus.type }
        )
      );
    }

    const newMetadata: SubmissionMetadata = {
      ...this.metadata,
      updatedAt: new Date(),
      version: this.metadata.version + 1,
    };

    return Result.ok(
      new Submission(this.id, this.data, newMetadata, newStatus)
    );
  }

  /**
   * State transition: Mark as failed
   */
  markAsFailed(
    error: OfflineError,
    config: {
      maxRetries: number;
      baseRetryDelay: number;
      maxRetryDelay: number;
      exponentialBackoff: boolean;
    }
  ): Result<Submission, OfflineError> {
    // Determine if retry is possible
    const canRetry =
      isRecoverableError(error) &&
      this.metadata.retryCount < config.maxRetries;

    // Calculate next retry time if retryable
    const nextRetryAt = canRetry
      ? calculateNextRetryTime(
        this.metadata.retryCount + 1,
        config.baseRetryDelay,
        config.maxRetryDelay,
        config.exponentialBackoff
      )
      : undefined;

    const newStatus = markFailed(this.syncStatus, error, canRetry, nextRetryAt);
    if (!newStatus) {
      return Result.err(
        new OfflineError(
          `Cannot mark as failed from current status: ${this.syncStatus.type}`,
          'INVALID_STATE_TRANSITION',
          false,
          { submissionId: this.id, currentStatus: this.syncStatus.type }
        )
      );
    }

    const newMetadata: SubmissionMetadata = {
      ...this.metadata,
      updatedAt: new Date(),
      version: this.metadata.version + 1,
    };

    return Result.ok(
      new Submission(this.id, this.data, newMetadata, newStatus)
    );
  }

  /**
   * Update priority
   */
  updatePriority(priority: Priority): Submission {
    const newMetadata: SubmissionMetadata = {
      ...this.metadata,
      priority,
      updatedAt: new Date(),
      version: this.metadata.version + 1,
    };

    return new Submission(this.id, this.data, newMetadata, this.syncStatus);
  }

  /**
   * Check if submission can be synced now
   */
  canSyncNow(): boolean {
    if (isPending(this.syncStatus)) {
      return true;
    }

    if (isFailed(this.syncStatus) && this.syncStatus.canRetry) {
      if (!this.syncStatus.nextRetryAt) {
        return true;
      }
      return new Date() >= this.syncStatus.nextRetryAt;
    }

    return false;
  }

  /**
   * Check if submission is in a terminal state
   */
  isTerminal(): boolean {
    return (
      isSuccess(this.syncStatus) ||
      (isFailed(this.syncStatus) && !this.syncStatus.canRetry)
    );
  }

  /**
   * Check if submission is currently syncing
   */
  isSyncing(): boolean {
    return isSyncing(this.syncStatus);
  }

  /**
   * Get age in milliseconds
   */
  getAge(): number {
    return Date.now() - this.metadata.createdAt.getTime();
  }

  /**
   * Get time since last update in milliseconds
   */
  getTimeSinceUpdate(): number {
    return Date.now() - this.metadata.updatedAt.getTime();
  }

  /**
   * Serialize to JSON for storage
   */
  toJSON(): SerializedSubmission {
    return {
      id: this.id,
      type: this.data.type,
      teamNumber: this.data.teamNumber as number,
      eventKey: this.data.eventKey,
      matchKey: this.data.matchKey,
      data: this.data.data,
      createdAt: this.metadata.createdAt.toISOString(),
      updatedAt: this.metadata.updatedAt.toISOString(),
      syncStatus: serializeStatus(this.syncStatus),
      retryCount: this.metadata.retryCount,
      priority: this.metadata.priority,
      version: this.metadata.version,
    };
  }

  /**
   * Get a human-readable description
   */
  toString(): string {
    const { type, teamNumber, eventKey, matchKey } = this.data;
    const matchInfo = matchKey ? ` (${matchKey})` : '';
    return `${type} scouting for Team ${teamNumber} at ${eventKey}${matchInfo}`;
  }

  /**
   * Compare submissions for equality
   */
  equals(other: Submission): boolean {
    return (
      this.id === other.id &&
      this.metadata.version === other.metadata.version
    );
  }

  /**
   * Create a copy with updated data (for editing before sync)
   */
  updateData(
    newData: Partial<SubmissionData['data']>
  ): Result<Submission, ValidationError> {
    // Only allow updates on pending submissions
    if (!isPending(this.syncStatus)) {
      return Result.err(
        new ValidationError(
          'Cannot update data after sync has started',
          [],
          { submissionId: this.id, status: this.syncStatus.type }
        )
      );
    }

    const updatedPayload = {
      ...this.data.data,
      ...newData,
    };

    const updatedData: SubmissionData = {
      ...this.data,
      data: updatedPayload,
    };

    // Validate updated data
    const error = Submission.validateData(updatedData);
    if (error) {
      return Result.err(error);
    }

    const newMetadata: SubmissionMetadata = {
      ...this.metadata,
      updatedAt: new Date(),
      version: this.metadata.version + 1,
    };

    return Result.ok(
      new Submission(this.id, updatedData, newMetadata, this.syncStatus)
    );
  }
}

/**
 * Type guard to check if value is a Submission
 */
export function isSubmission(value: unknown): value is Submission {
  return value instanceof Submission;
}

/**
 * Comparator functions for sorting submissions
 */
export const SubmissionComparators = {
  /**
   * Sort by priority (high to low), then by creation time (old to new)
   */
  byPriorityAndAge: (a: Submission, b: Submission): number => {
    // Higher priority first
    if (a.metadata.priority !== b.metadata.priority) {
      return b.metadata.priority - a.metadata.priority;
    }
    // Older submissions first
    return (
      a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime()
    );
  },

  /**
   * Sort by creation time (old to new)
   */
  byAge: (a: Submission, b: Submission): number => {
    return (
      a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime()
    );
  },

  /**
   * Sort by priority (high to low)
   */
  byPriority: (a: Submission, b: Submission): number => {
    return b.metadata.priority - a.metadata.priority;
  },

  /**
   * Sort by retry count (fewer retries first)
   */
  byRetryCount: (a: Submission, b: Submission): number => {
    return a.metadata.retryCount - b.metadata.retryCount;
  },

  /**
   * Sort by event and match (for chronological ordering)
   */
  byEventAndMatch: (a: Submission, b: Submission): number => {
    // First by event
    if (a.data.eventKey !== b.data.eventKey) {
      return a.data.eventKey.localeCompare(b.data.eventKey);
    }
    // Then by match
    const matchA = a.data.matchKey || '';
    const matchB = b.data.matchKey || '';
    return matchA.localeCompare(matchB);
  },
};
