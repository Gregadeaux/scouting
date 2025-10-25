/**
 * Offline-Aware API Wrapper
 *
 * Intercepts API calls and automatically queues them when offline.
 * Provides seamless offline/online transitions for scouting forms.
 */

import { queueSubmission } from './queue';

export interface OfflineApiOptions {
  /**
   * Whether to queue this request if offline (default: true)
   */
  queueIfOffline?: boolean;

  /**
   * Whether to show a notification when queued (default: true)
   */
  notifyOnQueue?: boolean;

  /**
   * Custom headers to include in the request
   */
  headers?: Record<string, string>;

  /**
   * Callback when request is queued
   */
  onQueued?: (queueId: string) => void;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  queued?: boolean;
  queueId?: string;
}

/**
 * Check if the device is currently online
 */
function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Check if an error is a network error
 */
function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    (error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch'))
  );
}

/**
 * Make an offline-aware API request
 *
 * Automatically queues POST/PUT/PATCH/DELETE requests when offline.
 * GET requests fail immediately when offline (rely on service worker cache).
 */
export async function offlineApi<T = unknown>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
  options: OfflineApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    queueIfOffline = true,
    notifyOnQueue = true,
    headers = {},
    onQueued,
  } = options;

  // Prepare request options
  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  // Check if we're offline BEFORE attempting the request
  if (!isOnline() && queueIfOffline && method !== 'GET') {
    try {
      const queueId = await queueSubmission(url, method, body, headers);

      if (onQueued) {
        onQueued(queueId);
      }

      if (notifyOnQueue && typeof window !== 'undefined') {
        // Dispatch custom event for UI to show notification
        window.dispatchEvent(
          new CustomEvent('offline-submission-queued', {
            detail: { queueId, url, method },
          })
        );
      }

      return {
        success: true,
        queued: true,
        queueId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue submission',
      };
    }
  }

  // Attempt the request
  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    // If it's a network error and we can queue, do so
    if (
      isNetworkError(error) &&
      queueIfOffline &&
      method !== 'GET'
    ) {
      try {
        const queueId = await queueSubmission(url, method, body, headers);

        if (onQueued) {
          onQueued(queueId);
        }

        if (notifyOnQueue && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('offline-submission-queued', {
              detail: { queueId, url, method },
            })
          );
        }

        return {
          success: true,
          queued: true,
          queueId,
        };
      } catch (queueError) {
        return {
          success: false,
          error:
            queueError instanceof Error
              ? queueError.message
              : 'Failed to queue submission',
        };
      }
    }

    // Not a network error or can't queue
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

/**
 * Convenience wrapper for POST requests
 */
export async function offlinePost<T = unknown>(
  url: string,
  body: unknown,
  options?: OfflineApiOptions
): Promise<ApiResponse<T>> {
  return offlineApi<T>(url, 'POST', body, options);
}

/**
 * Convenience wrapper for PUT requests
 */
export async function offlinePut<T = unknown>(
  url: string,
  body: unknown,
  options?: OfflineApiOptions
): Promise<ApiResponse<T>> {
  return offlineApi<T>(url, 'PUT', body, options);
}

/**
 * Convenience wrapper for PATCH requests
 */
export async function offlinePatch<T = unknown>(
  url: string,
  body: unknown,
  options?: OfflineApiOptions
): Promise<ApiResponse<T>> {
  return offlineApi<T>(url, 'PATCH', body, options);
}

/**
 * Convenience wrapper for DELETE requests
 */
export async function offlineDelete<T = unknown>(
  url: string,
  options?: OfflineApiOptions
): Promise<ApiResponse<T>> {
  return offlineApi<T>(url, 'DELETE', undefined, options);
}

/**
 * Convenience wrapper for GET requests
 * Note: GET requests don't queue - they rely on service worker cache
 */
export async function offlineGet<T = unknown>(
  url: string,
  options?: Omit<OfflineApiOptions, 'queueIfOffline'>
): Promise<ApiResponse<T>> {
  return offlineApi<T>(url, 'GET', undefined, {
    ...options,
    queueIfOffline: false, // GET never queues
  });
}
