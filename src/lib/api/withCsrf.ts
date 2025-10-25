/**
 * API Route Wrapper with CSRF Protection
 *
 * Usage:
 * export const POST = withCsrf(async (request: NextRequest) => {
 *   // Your handler code here
 *   return NextResponse.json({ success: true });
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfToken } from '@/lib/csrf/server';

type ApiHandler = (request: NextRequest, context?: unknown) => Promise<NextResponse>;

/**
 * Wrap an API route handler with CSRF validation
 */
export function withCsrf(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: unknown) => {
    // Only validate for state-changing methods
    const method = request.method;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const isValid = await validateCsrfToken(request);

      if (!isValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'CSRF validation failed. Please refresh the page and try again.',
          },
          { status: 403 }
        );
      }
    }

    // CSRF validation passed, call the handler
    return handler(request, context);
  };
}

/**
 * Validate CSRF token for manual checking in API routes
 */
export async function checkCsrf(request: NextRequest): Promise<NextResponse | null> {
  const method = request.method;

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null; // No validation needed
  }

  const isValid = await validateCsrfToken(request);

  if (!isValid) {
    return NextResponse.json(
      {
        success: false,
        error: 'CSRF validation failed',
      },
      { status: 403 }
    );
  }

  return null; // Validation passed
}
