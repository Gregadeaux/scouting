/**
 * Error Sanitization Utility
 *
 * Prevents leaking sensitive database and system information to clients
 * by mapping internal error details to user-friendly messages.
 *
 * SECURITY: Never expose:
 * - Database schema details
 * - SQL queries or constraints
 * - File paths or stack traces
 * - Internal system information
 * - Connection strings or credentials
 */

/**
 * Database error codes that we recognize and handle specially
 */
const POSTGRES_ERROR_CODES = {
  // Constraint violations
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',

  // Permission errors
  INSUFFICIENT_PRIVILEGE: '42501',

  // Data errors
  INVALID_TEXT_REPRESENTATION: '22P02',
  NUMERIC_VALUE_OUT_OF_RANGE: '22003',
  DIVISION_BY_ZERO: '22012',

  // Connection errors
  CONNECTION_EXCEPTION: '08000',
  CONNECTION_FAILURE: '08006',

  // Syntax errors
  SYNTAX_ERROR: '42601',
  UNDEFINED_TABLE: '42P01',
  UNDEFINED_COLUMN: '42703',
} as const;

/**
 * Supabase-specific error codes
 */
const SUPABASE_ERROR_CODES = {
  ROW_LEVEL_SECURITY: 'PGRST116', // RLS policy violation
  INVALID_JWT: 'PGRST301', // Invalid JWT token
} as const;

/**
 * Generic user-friendly error messages for different error categories
 */
const GENERIC_MESSAGES = {
  DATABASE: 'Unable to process your request. Please try again.',
  VALIDATION: 'Invalid data provided. Please check your input.',
  PERMISSION: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'This operation conflicts with existing data.',
  SERVER: 'An internal error occurred. Please try again later.',
  RATE_LIMIT: 'Too many requests. Please wait before trying again.',
  AUTHENTICATION: 'Authentication required or invalid credentials.',
} as const;

/**
 * Error information that should be logged server-side only
 */
export interface ErrorLogContext {
  originalError: unknown;
  errorCode?: string;
  errorName?: string;
  stackTrace?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * Sanitized error that is safe to send to clients
 */
export interface SanitizedError {
  message: string;
  code?: string; // Generic code like 'VALIDATION_ERROR', not database-specific
  statusCode: number;
}

/**
 * Determines if an error is a Postgres error with a code
 */
function isPostgresError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

/**
 * Determines if an error is a Supabase error
 */
function isSupabaseError(error: unknown): error is {
  code: string;
  message: string;
  details?: string;
  hint?: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Maps database error codes to user-friendly messages
 */
function mapDatabaseError(errorCode: string): SanitizedError {
  switch (errorCode) {
    case POSTGRES_ERROR_CODES.UNIQUE_VIOLATION:
      return {
        message: 'This item already exists. Please use a different value.',
        code: 'DUPLICATE_ENTRY',
        statusCode: 409,
      };

    case POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return {
        message: 'Cannot perform this action: related data exists.',
        code: 'REFERENCE_ERROR',
        statusCode: 409,
      };

    case POSTGRES_ERROR_CODES.NOT_NULL_VIOLATION:
      return {
        message: 'Required information is missing.',
        code: 'REQUIRED_FIELD',
        statusCode: 400,
      };

    case POSTGRES_ERROR_CODES.CHECK_VIOLATION:
      return {
        message: 'Invalid data: value does not meet requirements.',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      };

    case POSTGRES_ERROR_CODES.INSUFFICIENT_PRIVILEGE:
      return {
        message: GENERIC_MESSAGES.PERMISSION,
        code: 'PERMISSION_DENIED',
        statusCode: 403,
      };

    case POSTGRES_ERROR_CODES.INVALID_TEXT_REPRESENTATION:
    case POSTGRES_ERROR_CODES.NUMERIC_VALUE_OUT_OF_RANGE:
      return {
        message: GENERIC_MESSAGES.VALIDATION,
        code: 'INVALID_FORMAT',
        statusCode: 400,
      };

    case POSTGRES_ERROR_CODES.CONNECTION_EXCEPTION:
    case POSTGRES_ERROR_CODES.CONNECTION_FAILURE:
      return {
        message: GENERIC_MESSAGES.SERVER,
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
      };

    case POSTGRES_ERROR_CODES.SYNTAX_ERROR:
    case POSTGRES_ERROR_CODES.UNDEFINED_TABLE:
    case POSTGRES_ERROR_CODES.UNDEFINED_COLUMN:
      // These should never happen in production - they indicate code bugs
      return {
        message: GENERIC_MESSAGES.SERVER,
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      };

    case SUPABASE_ERROR_CODES.ROW_LEVEL_SECURITY:
      return {
        message: GENERIC_MESSAGES.PERMISSION,
        code: 'ACCESS_DENIED',
        statusCode: 403,
      };

    case SUPABASE_ERROR_CODES.INVALID_JWT:
      return {
        message: GENERIC_MESSAGES.AUTHENTICATION,
        code: 'AUTH_INVALID',
        statusCode: 401,
      };

    default:
      // Unknown error code - use generic message
      return {
        message: GENERIC_MESSAGES.DATABASE,
        code: 'DATABASE_ERROR',
        statusCode: 500,
      };
  }
}

/**
 * Sanitizes an error for safe client exposure
 *
 * @param error - The error to sanitize (can be any type)
 * @param context - Optional context for server-side logging
 * @returns A safe error object that can be sent to clients
 *
 * @example
 * ```typescript
 * try {
 *   await supabase.from('teams').insert(data);
 * } catch (error) {
 *   const sanitized = sanitizeError(error, { operation: 'create_team' });
 *   console.error('Database error:', sanitized.logContext);
 *   return errorResponse(sanitized.message, sanitized.statusCode);
 * }
 * ```
 */
export function sanitizeError(
  error: unknown,
  context?: Record<string, unknown>
): SanitizedError & { logContext: ErrorLogContext } {
  // Create log context with full error details (for server-side only)
  const logContext: ErrorLogContext = {
    originalError: error,
    timestamp: new Date().toISOString(),
    context,
  };

  // Handle Postgres/Supabase errors with codes
  if (isPostgresError(error) || isSupabaseError(error)) {
    logContext.errorCode = error.code;
    logContext.errorName = 'name' in error ? String(error.name) : 'DatabaseError';

    if ('stack' in error && typeof error.stack === 'string') {
      logContext.stackTrace = error.stack;
    }

    const sanitized = mapDatabaseError(error.code);
    return { ...sanitized, logContext };
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    logContext.errorName = error.name;
    logContext.stackTrace = error.stack;

    // Handle specific error types
    if (error instanceof TypeError || error instanceof RangeError) {
      return {
        message: GENERIC_MESSAGES.VALIDATION,
        code: 'INVALID_INPUT',
        statusCode: 400,
        logContext,
      };
    }

    // Default Error handling
    return {
      message: GENERIC_MESSAGES.SERVER,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      logContext,
    };
  }

  // Handle unknown error types
  return {
    message: GENERIC_MESSAGES.SERVER,
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
    logContext,
  };
}

/**
 * Logs error details to console (server-side only)
 *
 * In production, this should be replaced with proper logging service
 * (e.g., Sentry, DataDog, CloudWatch)
 *
 * @param logContext - Error context to log
 * @param operation - Description of what operation failed
 */
export function logError(logContext: ErrorLogContext, operation?: string): void {
  const logMessage = operation
    ? `Error during ${operation}:`
    : 'Error occurred:';

  // In development, log full details
  if (process.env.NODE_ENV === 'development') {
    console.error(logMessage, {
      timestamp: logContext.timestamp,
      code: logContext.errorCode,
      name: logContext.errorName,
      error: logContext.originalError,
      context: logContext.context,
      stack: logContext.stackTrace,
    });
  } else {
    // In production, log without exposing full error object
    console.error(logMessage, {
      timestamp: logContext.timestamp,
      code: logContext.errorCode,
      name: logContext.errorName,
      context: logContext.context,
      // Stack trace only in production if error is critical
      ...(logContext.stackTrace && { hasStackTrace: true }),
    });
  }
}

/**
 * Quick helper to sanitize and log an error in one call
 *
 * @example
 * ```typescript
 * try {
 *   // database operation
 * } catch (error) {
 *   const { message, statusCode } = sanitizeAndLogError(error, 'create_team');
 *   return errorResponse(message, statusCode);
 * }
 * ```
 */
export function sanitizeAndLogError(
  error: unknown,
  operation?: string,
  context?: Record<string, unknown>
): SanitizedError {
  const { logContext, ...sanitized } = sanitizeError(error, context);
  logError(logContext, operation);
  return sanitized;
}
