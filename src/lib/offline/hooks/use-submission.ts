'use client';

/**
 * useSubmission Hook
 *
 * Fetches and manages a single queued submission by ID.
 * Provides operations to retry or delete the submission.
 *
 * @example
 * ```tsx
 * function SubmissionDetail({ id }: { id: string }) {
 *   const { submission, retry, deleteSubmission, isLoading, error } = useSubmission(id);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *   if (!submission) return <NotFound />;
 *
 *   return (
 *     <div>
 *       <p>Status: {submission.status}</p>
 *       <button onClick={retry}>Retry</button>
 *       <button onClick={deleteSubmission}>Delete</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAllSubmissions,
  deleteSubmission as deleteSubmissionFromQueue,
  type QueuedSubmission,
} from '../queue';
import { syncManager } from '../sync';

export interface UseSubmissionResult {
  /**
   * The submission data, or null if not found
   */
  submission: QueuedSubmission | null;

  /**
   * Retry the submission
   */
  retry: () => Promise<void>;

  /**
   * Delete the submission from queue
   */
  deleteSubmission: () => Promise<void>;

  /**
   * Whether data is loading
   */
  isLoading: boolean;

  /**
   * Error message if operation failed
   */
  error: string | null;

  /**
   * Refresh submission data
   */
  refresh: () => Promise<void>;
}

/**
 * Hook that manages a single submission
 *
 * Fetches submission by ID and provides operations.
 * Automatically refreshes when submission changes.
 *
 * @param id - Submission ID to fetch
 * @returns Submission data and operations
 */
export function useSubmission(id?: string): UseSubmissionResult {
  const [submission, setSubmission] = useState<QueuedSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch submission from IndexedDB
   */
  const refresh = useCallback(async () => {
    if (!id) {
      setSubmission(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get all submissions and find the one we want
      const submissions = await getAllSubmissions();
      const found = submissions.find(s => s.id === id);

      setSubmission(found || null);
    } catch (err) {
      console.error('Failed to fetch submission:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch submission');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  /**
   * Retry the submission
   */
  const retry = useCallback(async () => {
    if (!id) {
      throw new Error('No submission ID provided');
    }

    try {
      setError(null);
      await syncManager.retrySubmission(id);
      // Refresh will happen via sync events
    } catch (err) {
      console.error('Failed to retry submission:', err);
      setError(err instanceof Error ? err.message : 'Failed to retry submission');
      throw err;
    }
  }, [id]);

  /**
   * Delete the submission
   */
  const deleteSubmission = useCallback(async () => {
    if (!id) {
      throw new Error('No submission ID provided');
    }

    try {
      setError(null);
      await deleteSubmissionFromQueue(id);
      setSubmission(null);
    } catch (err) {
      console.error('Failed to delete submission:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete submission');
      throw err;
    }
  }, [id]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Listen for sync events that might affect this submission
   */
  useEffect(() => {
    const handleSyncEvent = (event: unknown) => {
      // Refresh if this submission was affected
      if (
        event &&
        typeof event === 'object' &&
        (('submissionId' in event && event.submissionId === id) ||
          ('type' in event && event.type === 'sync-complete'))
      ) {
        refresh();
      }
    };

    const unsubscribe = syncManager.on(handleSyncEvent);

    return unsubscribe;
  }, [id, refresh]);

  return {
    submission,
    retry,
    deleteSubmission,
    isLoading,
    error,
    refresh,
  };
}
