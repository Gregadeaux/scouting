/**
 * Core domain types for offline-first architecture
 * These types define the fundamental building blocks of the offline system
 */

/**
 * Branded type for Submission ID to ensure type safety
 */
export type SubmissionId = string & { readonly __brand: 'SubmissionId' };

/**
 * Helper function to create a SubmissionId
 */
export function createSubmissionId(id: string): SubmissionId {
  if (!id || id.trim().length === 0) {
    throw new Error('SubmissionId cannot be empty');
  }
  return id as SubmissionId;
}

/**
 * Branded type for Team Number to ensure type safety
 */
export type TeamNumber = number & { readonly __brand: 'TeamNumber' };

/**
 * Helper function to create a TeamNumber with validation
 */
export function createTeamNumber(num: number): TeamNumber {
  if (!Number.isInteger(num) || num < 1 || num > 99999) {
    throw new Error('TeamNumber must be a positive integer between 1 and 99999');
  }
  return num as TeamNumber;
}

/**
 * Type of scouting data being submitted
 */
export type ScoutingType = 'match' | 'pit' | 'super';

/**
 * Priority levels for queue ordering
 */
export enum Priority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Configuration for offline behavior
 */
export interface OfflineConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay between retries in milliseconds */
  baseRetryDelay: number;
  /** Maximum delay between retries in milliseconds */
  maxRetryDelay: number;
  /** Whether to use exponential backoff */
  exponentialBackoff: boolean;
  /** Maximum number of items to sync concurrently */
  maxConcurrentSyncs: number;
  /** Timeout for individual sync operations in milliseconds */
  syncTimeout: number;
  /** Whether to persist queue to storage */
  persistQueue: boolean;
  /** Storage key prefix for persistence */
  storageKeyPrefix: string;
  /** Maximum queue size before rejecting new items */
  maxQueueSize: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  maxRetries: 3,
  baseRetryDelay: 1000, // 1 second
  maxRetryDelay: 30000, // 30 seconds
  exponentialBackoff: true,
  maxConcurrentSyncs: 3,
  syncTimeout: 30000, // 30 seconds
  persistQueue: true,
  storageKeyPrefix: 'frc-offline-queue',
  maxQueueSize: 1000,
};

/**
 * Result type for functional error handling
 * Inspired by Rust's Result<T, E>
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Helper functions for Result type
 */
export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },

  err<E>(error: E): Result<never, E> {
    return { ok: false, error };
  },

  isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
    return result.ok === true;
  },

  isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
    return result.ok === false;
  },

  map<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => U
  ): Result<U, E> {
    return result.ok
      ? { ok: true, value: fn(result.value) }
      : { ok: false, error: (result as { ok: false; error: E }).error };
  },

  mapErr<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
  ): Result<T, F> {
    return result.ok
      ? { ok: true, value: result.value }
      : { ok: false, error: fn((result as { ok: false; error: E }).error) };
  },

  unwrap<T>(result: Result<T, Error>): T {
    if (result.ok) {
      return result.value;
    }
    throw new Error('Called unwrap on an Err result');
  },

  unwrapOr<T>(result: Result<T, Error>, defaultValue: T): T {
    if (result.ok) {
      return result.value;
    }
    return defaultValue;
  },
};

/**
 * Type guard to check if value is a valid SubmissionId
 */
export function isSubmissionId(value: unknown): value is SubmissionId {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard to check if value is a valid TeamNumber
 */
export function isTeamNumber(value: unknown): value is TeamNumber {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 99999
  );
}

/**
 * Type guard to check if value is a valid ScoutingType
 */
export function isScoutingType(value: unknown): value is ScoutingType {
  return value === 'match' || value === 'pit' || value === 'super';
}

/**
 * Utility type to make all properties readonly recursively
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

/**
 * Utility type to extract keys of a certain type from an object
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Serialized format for persistence
 */
export interface SerializedSubmission {
  id: string;
  type: ScoutingType;
  teamNumber: number;
  eventKey: string;
  matchKey?: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  syncStatus: Record<string, unknown>;
  retryCount: number;
  priority: Priority;
  version: number;
}

/**
 * Filter criteria for querying submissions
 */
export interface SubmissionFilter {
  /** Filter by scouting type */
  type?: ScoutingType | ScoutingType[];
  /** Filter by team number */
  teamNumber?: TeamNumber | TeamNumber[];
  /** Filter by event key */
  eventKey?: string;
  /** Filter by match key */
  matchKey?: string;
  /** Filter by sync status type */
  statusType?: 'pending' | 'syncing' | 'success' | 'failed' | Array<'pending' | 'syncing' | 'success' | 'failed'>;
  /** Only submissions created after this date */
  createdAfter?: Date;
  /** Only submissions created before this date */
  createdBefore?: Date;
  /** Only submissions updated after this date */
  updatedAfter?: Date;
  /** Only submissions updated before this date */
  updatedBefore?: Date;
  /** Filter by priority */
  priority?: Priority | Priority[];
  /** Limit number of results */
  limit?: number;
  /** Skip first N results */
  offset?: number;
  /** Sort field */
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'retryCount';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}