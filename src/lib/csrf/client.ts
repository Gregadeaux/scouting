/**
 * CSRF Protection Utilities - Client Side
 */

'use client';

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a random CSRF token (client-side)
 */
export function generateCsrfTokenClient(): string {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get CSRF token from cookies (client-side)
 */
export function getCsrfTokenClient(): string | null {
  if (typeof window === 'undefined') return null;

  const match = document.cookie.match(new RegExp(`(^| )${CSRF_TOKEN_NAME}=([^;]+)`));
  return match ? match[2] : null;
}

/**
 * Enhanced fetch wrapper that automatically includes CSRF token
 */
export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  const csrfToken = getCsrfTokenClient();

  // For POST/PUT/PATCH/DELETE, ensure CSRF token is included
  const method = options.method?.toUpperCase();
  const requiresCsrf = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (requiresCsrf && !csrfToken) {
    // Try to get token from server first
    const tokenResponse = await fetch('/api/csrf');
    const tokenData = await tokenResponse.json();

    if (!tokenData.token) {
      throw new Error('Failed to obtain CSRF token');
    }

    // Token is now in cookie, proceed with request
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-csrf-token': tokenData.token,
      },
    });
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(requiresCsrf && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
  });
}

export { CSRF_TOKEN_NAME, CSRF_HEADER_NAME };
