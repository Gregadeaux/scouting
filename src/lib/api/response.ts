import { NextResponse } from 'next/server';

/**
 * Standard API response helpers for consistent error handling and response formatting
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
