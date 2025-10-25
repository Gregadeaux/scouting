'use client';

import { useEffect, useState } from 'react';
import { getCsrfTokenClient } from '@/lib/csrf/client';

/**
 * Hook to get CSRF token for client-side requests
 *
 * Usage:
 * const csrfToken = useCsrfToken();
 *
 * fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'x-csrf-token': csrfToken,
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify(data),
 * });
 */
export function useCsrfToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from cookie
    const csrfToken = getCsrfTokenClient();
    setToken(csrfToken);

    // If no token exists, request one from the server
    if (!csrfToken) {
      fetch('/api/csrf')
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setToken(data.token);
          }
        })
        .catch((error) => {
          console.error('Failed to get CSRF token:', error);
        });
    }
  }, []);

  return token;
}

// Re-export the fetchWithCsrf function
export { fetchWithCsrf } from '@/lib/csrf/client';
