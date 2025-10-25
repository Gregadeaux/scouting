/**
 * Error types for offline-first architecture
 * Follows a hierarchy with specific error types for different failure modes
 */

/**
 * Base error class for all offline-related errors
 */
export class OfflineError extends Error {
  /** Error code for programmatic error handling */
  public readonly code: string;
  /** Additional context about the error */
  public readonly context?: Record<string, unknown>;
  /** Timestamp when error occurred */
  public readonly timestamp: Date;
  /** Whether this error is recoverable */
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    recoverable = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OfflineError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.recoverable = recoverable;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }

  /**
   * Create error from JSON
   */
  static fromJSON(json: Record<string, unknown>): OfflineError {
    const error = new OfflineError(
      json.message as string,
      json.code as string,
      json.recoverable as boolean,
      json.context as Record<string, unknown>
    );
    return error;
  }
}

/**
 * Error when queue operations fail
 */
export class QueueError extends OfflineError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'QUEUE_ERROR', true, context);
    this.name = 'QueueError';
  }
}

/**
 * Error when queue is full
 */
export class QueueFullError extends QueueError {
  constructor(currentSize: number, maxSize: number) {
    super(`Queue is full: ${currentSize}/${maxSize} items`, {
      currentSize,
      maxSize,
    });
    this.name = 'QueueFullError';
  }
}

/**
 * Error when item not found in queue
 */
export class ItemNotFoundError extends QueueError {
  constructor(itemId: string) {
    super(`Item not found in queue: ${itemId}`, { itemId });
    this.name = 'ItemNotFoundError';
  }
}

/**
 * Error when sync operations fail
 */
export class SyncError extends OfflineError {
  /** HTTP status code if applicable */
  public readonly statusCode?: number;
  /** Number of retry attempts made */
  public readonly attemptNumber: number;

  constructor(
    message: string,
    attemptNumber: number,
    recoverable = true,
    statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'SYNC_ERROR',
      recoverable,
      { ...context, statusCode, attemptNumber }
    );
    this.name = 'SyncError';
    this.statusCode = statusCode;
    this.attemptNumber = attemptNumber;
  }
}

/**
 * Error when server rejects the submission
 */
export class ServerRejectionError extends SyncError {
  constructor(
    message: string,
    statusCode: number,
    attemptNumber: number,
    context?: Record<string, unknown>
  ) {
    // 4xx errors are generally not recoverable (client error)
    const recoverable = statusCode >= 500;
    super(message, attemptNumber, recoverable, statusCode, context);
    this.name = 'ServerRejectionError';
  }
}

/**
 * Error when sync times out
 */
export class SyncTimeoutError extends SyncError {
  public readonly timeoutMs: number;

  constructor(
    timeoutMs: number,
    attemptNumber: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Sync operation timed out after ${timeoutMs}ms`,
      attemptNumber,
      true,
      undefined,
      { ...context, timeoutMs }
    );
    this.name = 'SyncTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error when network is unavailable
 */
export class NetworkError extends OfflineError {
  /** Whether the device is completely offline */
  public readonly offline: boolean;

  constructor(message: string, offline = false, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', true, { ...context, offline });
    this.name = 'NetworkError';
    this.offline = offline;
  }
}

/**
 * Error when device is offline
 */
export class DeviceOfflineError extends NetworkError {
  constructor() {
    super('Device is offline', true);
    this.name = 'DeviceOfflineError';
  }
}

/**
 * Error when network request fails
 */
export class NetworkRequestError extends NetworkError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, false, context);
    this.name = 'NetworkRequestError';
  }
}

/**
 * Error when data validation fails
 */
export class ValidationError extends OfflineError {
  /** Fields that failed validation */
  public readonly invalidFields: string[];

  constructor(
    message: string,
    invalidFields: string[],
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', false, { ...context, invalidFields });
    this.name = 'ValidationError';
    this.invalidFields = invalidFields;
  }
}

/**
 * Error when schema validation fails
 */
export class SchemaValidationError extends ValidationError {
  public readonly schemaErrors: Array<{ field: string; message: string }>;

  constructor(
    schemaErrors: Array<{ field: string; message: string }>,
    context?: Record<string, unknown>
  ) {
    const invalidFields = schemaErrors.map((e) => e.field);
    const message = `Schema validation failed: ${schemaErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`;
    super(message, invalidFields, { ...context, schemaErrors });
    this.name = 'SchemaValidationError';
    this.schemaErrors = schemaErrors;
  }
}

/**
 * Error when required field is missing
 */
export class MissingFieldError extends ValidationError {
  constructor(field: string, context?: Record<string, unknown>) {
    super(`Required field missing: ${field}`, [field], context);
    this.name = 'MissingFieldError';
  }
}

/**
 * Error when database operations fail
 */
export class DatabaseError extends OfflineError {
  /** Name of the database operation that failed */
  public readonly operation: string;

  constructor(
    message: string,
    operation: string,
    recoverable = true,
    context?: Record<string, unknown>
  ) {
    super(message, 'DATABASE_ERROR', recoverable, { ...context, operation });
    this.name = 'DatabaseError';
    this.operation = operation;
  }
}

/**
 * Error when IndexedDB operations fail
 */
export class IndexedDBError extends DatabaseError {
  constructor(message: string, operation: string, context?: Record<string, unknown>) {
    super(message, operation, true, context);
    this.name = 'IndexedDBError';
  }
}

/**
 * Error when storage quota is exceeded
 */
export class StorageQuotaError extends DatabaseError {
  public readonly quotaBytes?: number;
  public readonly usedBytes?: number;

  constructor(
    quotaBytes?: number,
    usedBytes?: number,
    context?: Record<string, unknown>
  ) {
    super(
      'Storage quota exceeded',
      'storage',
      false,
      { ...context, quotaBytes, usedBytes }
    );
    this.name = 'StorageQuotaError';
    this.quotaBytes = quotaBytes;
    this.usedBytes = usedBytes;
  }
}

/**
 * Error when maximum retries are exceeded
 */
export class MaxRetriesExceededError extends OfflineError {
  public readonly maxRetries: number;
  public readonly lastError: OfflineError;

  constructor(maxRetries: number, lastError: OfflineError) {
    super(
      `Maximum retries (${maxRetries}) exceeded. Last error: ${lastError.message}`,
      'MAX_RETRIES_EXCEEDED',
      false,
      { maxRetries, lastError: lastError.toJSON() }
    );
    this.name = 'MaxRetriesExceededError';
    this.maxRetries = maxRetries;
    this.lastError = lastError;
  }
}

/**
 * Error when operation is cancelled
 */
export class OperationCancelledError extends OfflineError {
  constructor(reason?: string, context?: Record<string, unknown>) {
    super(
      `Operation cancelled${reason ? `: ${reason}` : ''}`,
      'OPERATION_CANCELLED',
      false,
      context
    );
    this.name = 'OperationCancelledError';
  }
}

/**
 * Type guard to check if error is an OfflineError
 */
export function isOfflineError(error: unknown): error is OfflineError {
  return error instanceof OfflineError;
}

/**
 * Type guard to check if error is a QueueError
 */
export function isQueueError(error: unknown): error is QueueError {
  return error instanceof QueueError;
}

/**
 * Type guard to check if error is a SyncError
 */
export function isSyncError(error: unknown): error is SyncError {
  return error instanceof SyncError;
}

/**
 * Type guard to check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if error is a DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Type guard to check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (isOfflineError(error)) {
    return error.recoverable;
  }
  // Unknown errors are assumed to be recoverable
  return true;
}

/**
 * Convert any error to an OfflineError
 */
export function toOfflineError(error: unknown): OfflineError {
  if (isOfflineError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new OfflineError(
      error.message,
      'UNKNOWN_ERROR',
      true,
      { originalError: error.name, stack: error.stack }
    );
  }

  return new OfflineError(
    String(error),
    'UNKNOWN_ERROR',
    true,
    { originalError: error }
  );
}
