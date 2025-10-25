/**
 * CSRF Protection Utilities - Server Side
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a random CSRF token (server-side)
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get or create CSRF token from cookies (server-side)
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_TOKEN_NAME)?.value;

  if (!token) {
    token = generateCsrfToken();
    cookieStore.set(CSRF_TOKEN_NAME, token, {
      httpOnly: false, // Must be readable by client JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
  }

  return token;
}

/**
 * Validate CSRF token from request
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_TOKEN_NAME)?.value;

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Both must exist and match
  if (!cookieToken || !headerToken) {
    return false;
  }

  return cookieToken === headerToken;
}

/**
 * Middleware helper to validate CSRF tokens for state-changing methods
 */
export async function validateCsrfMiddleware(request: NextRequest): Promise<NextResponse | null> {
  // Only validate for state-changing methods
  const method = request.method;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null; // No validation needed for GET/HEAD/OPTIONS
  }

  // Validate CSRF token
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

/**
 * API route helper to validate CSRF
 */
export async function requireCsrfToken(request: NextRequest): Promise<void> {
  const isValid = await validateCsrfToken(request);

  if (!isValid) {
    throw new Error('CSRF validation failed');
  }
}

export { CSRF_TOKEN_NAME, CSRF_HEADER_NAME };
