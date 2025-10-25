'use client';

/**
 * useOptimisticSubmission Hook
 *
 * Implements optimistic UI updates for form submissions.
 * Shows data immediately, then reconciles with server response.
 *
 * @example
 * ```tsx
 * function ScoutingForm() {
 *   const { submit, optimisticData, rollback, isPending } = useOptimisticSubmission();
 *
 *   const handleSubmit = async (data: FormData) => {
 *     await submit({
 *       url: '/api/match-scouting',
 *       method: 'POST',
 *       data,
 *       onSuccess: () => {
 *         toast.success('Submitted!');
 *       },
 *       onError: (err) => {
 *         toast.error('Failed to submit');
 *       },
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {optimisticData && <Preview data={optimisticData} />}
 *     </form>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useTransition } from 'react';
import { offlineApi, type ApiResponse } from '../api';

export interface OptimisticSubmissionOptions<T = any> {
  /**
   * API endpoint URL
   */
  url: string;

  /**
   * HTTP method
   */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /**
   * Data to submit
   */
  data: T;

  /**
   * Custom headers
   */
  headers?: Record<string, string>;

  /**
   * Success callback
   */
  onSuccess?: (response: ApiResponse<T>) => void;

  /**
   * Error callback
   */
  onError?: (error: Error) => void;

  /**
   * Queued callback (when submission is queued for later)
   */
  onQueued?: (queueId: string) => void;

  /**
   * Whether to automatically rollback on error (default: true)
   */
  autoRollback?: boolean;
}

export interface UseOptimisticSubmissionResult<T = any> {
  /**
   * Submit data with optimistic update
   */
  submit: (options: OptimisticSubmissionOptions<T>) => Promise<ApiResponse<T>>;

  /**
   * Current optimistic data (shown immediately)
   */
  optimisticData: T | null;

  /**
   * Server response data (after successful submission)
   */
  serverData: T | null;

  /**
   * Manually rollback optimistic update
   */
  rollback: () => void;

  /**
   * Whether submission is in progress
   */
  isPending: boolean;

  /**
   * Whether data was queued for later sync
   */
  isQueued: boolean;

  /**
   * Queue ID if submission was queued
   */
  queueId: string | null;

  /**
   * Error from last submission
   */
  error: Error | null;
}

/**
 * Hook that handles optimistic UI updates
 *
 * Shows data immediately while submitting to server.
 * Automatically handles rollback on error.
 * Works seamlessly with offline queue.
 *
 * @returns Submission function and state
 */
export function useOptimisticSubmission<T = any>(): UseOptimisticSubmissionResult<T> {
  const [isPending, startTransition] = useTransition();
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [serverData, setServerData] = useState<T | null>(null);
  const [isQueued, setIsQueued] = useState(false);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Rollback optimistic update
   */
  const rollback = useCallback(() => {
    setOptimisticData(null);
    setIsQueued(false);
    setQueueId(null);
  }, []);

  /**
   * Submit with optimistic update
   */
  const submit = useCallback(
    async (options: OptimisticSubmissionOptions<T>): Promise<ApiResponse<T>> => {
      const {
        url,
        method,
        data,
        headers,
        onSuccess,
        onError,
        onQueued,
        autoRollback = true,
      } = options;

      // Reset state
      setError(null);
      setServerData(null);
      setIsQueued(false);
      setQueueId(null);

      // Set optimistic data immediately
      setOptimisticData(data);

      // Use startTransition for better UX
      const result = await new Promise<ApiResponse<T>>((resolve) => {
        startTransition(async () => {
          try {
            const response = await offlineApi<T>(
              url,
              method,
              data,
              {
                headers,
                onQueued: (id) => {
                  setIsQueued(true);
                  setQueueId(id);
                  onQueued?.(id);
                },
              }
            );

            if (response.success) {
              if (response.queued) {
                // Submission was queued
                setIsQueued(true);
                setQueueId(response.queueId || null);
                onSuccess?.(response);
              } else {
                // Submission succeeded immediately
                setServerData(response.data || null);
                setOptimisticData(null); // Clear optimistic data
                onSuccess?.(response);
              }
            } else {
              // Submission failed
              const err = new Error(response.error || 'Submission failed');
              setError(err);

              if (autoRollback) {
                rollback();
              }

              onError?.(err);
            }

            resolve(response);
          } catch (err) {
            // Unexpected error
            const error = err instanceof Error ? err : new Error('Unexpected error');
            setError(error);

            if (autoRollback) {
              rollback();
            }

            onError?.(error);

            resolve({
              success: false,
              error: error.message,
            });
          }
        });
      });

      return result;
    },
    [rollback]
  );

  return {
    submit,
    optimisticData,
    serverData,
    rollback,
    isPending,
    isQueued,
    queueId,
    error,
  };
}
