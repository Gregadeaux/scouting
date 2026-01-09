import { NextResponse } from 'next/server';
import { sanitizeAndLogError } from '@/lib/utils/error-sanitizer';

/**
 * Standard API response helpers for consistent error handling and response formatting
 *
 * SECURITY: Use sanitizedErrorResponse() for database errors to prevent
 * information disclosure. It automatically logs full error details server-side
 * while returning safe, generic messages to clients.
 */

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function errorResponse(message: string, status = 500, errors?: unknown) {
  const response: { success: boolean; error: string; errors?: unknown } = {
    success: false,
    error: message,
  };

  if (errors) {
    response.errors = errors;
  }

  return NextResponse.json(response, { status });
}

export function validationError(errors: Record<string, string>) {
  return errorResponse('Validation failed', 400, errors);
}

export function notFoundError(resource = 'Resource') {
  return errorResponse(`${resource} not found`, 404);
}

export function unauthorizedError(message = 'Unauthorized') {
  return errorResponse(message, 401);
}

export function serverError(message = 'Internal server error') {
  return errorResponse(message, 500);
}

/**
 * SECURITY: Sanitized error response that prevents information disclosure
 *
 * Use this for database errors, system errors, or any error that might
 * contain sensitive information. It:
 * - Logs full error details server-side (console.error)
 * - Returns generic, user-friendly message to client
 * - Maps database error codes to appropriate HTTP status codes
 *
 * @param error - The error to sanitize (database error, Error, or any type)
 * @param operation - Optional description of what operation failed (for logging)
 * @param context - Optional additional context for logging
 * @returns NextResponse with sanitized error message
 *
 * @example
 * ```typescript
  * try {
 *   const { data, error } = await supabase.from('teams').insert(teamData);
 *   if (error) {
 *     return sanitizedErrorResponse(error, 'create_team');
 *   }
 * } catch (error) {
 *   return sanitizedErrorResponse(error, 'create_team');
 * }
 * ```
 */
export function sanitizedErrorResponse(
  error: unknown,
  operation?: string,
  context?: Record<string, unknown>
): NextResponse {
  const { message, statusCode, code } = sanitizeAndLogError(error, operation, context);

  return NextResponse.json(
    {
      success: false,
      error: message,
      code, // Generic code like 'DUPLICATE_ENTRY', not database-specific
    },
    { status: statusCode }
  );
}
