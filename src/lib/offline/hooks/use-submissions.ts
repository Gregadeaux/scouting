'use client';

/**
 * useSubmissions Hook
 *
 * Fetches all queued submissions with optional filtering.
 * Automatically refreshes when queue changes via sync events.
 *
 * @example
 * ```tsx
 * function SubmissionList() {
 *   const { submissions, loading, error, retry, remove } = useSubmissions();
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *
 *   return (
 *     <ul>
 *       {submissions.map(sub => (
 *         <li key={sub.id}>
 *           {sub.data.url}
 *           <button onClick={() => retry(sub.id)}>Retry</button>
 *           <button onClick={() => remove(sub.id)}>Delete</button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useOfflineService } from './use-offline-service';
import type { Submission } from '@/core/offline/domain/submission';
import type { OfflineEvent } from '@/core/offline/ports/event-bus';

export interface UseSubmissionsResult {
  /**
   * All submissions
   */
  submissions: Submission[];

  /**
   * Total count
   */
  totalCount: number;

  /**
   * Whether data is loading
   */
  loading: boolean;

  /**
   * Error message if fetch failed
   */
  error: string | null;

  /**
   * Retry a failed submission
   */
  retry: (id: string) => Promise<void>;

  /**
   * Remove a submission from queue
   */
  remove: (id: string) => Promise<void>;

  /**
   * Refresh submissions data
   */
  refresh: () => Promise<void>;
}

/**
 * Hook that fetches and manages submissions
 *
 * Automatically refreshes on sync events.
 *
 * @returns Submissions and operations
 */
export function useSubmissions(): UseSubmissionsResult {
  const { submissionService, eventBus } = useOfflineService();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load submissions from service
   */
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await submissionService.getQueue();

      if (result.ok) {
        setSubmissions(result.value.submissions);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch submissions';
      console.error('Failed to fetch submissions:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [submissionService]);

  /**
   * Retry a failed submission
   */
  const retry = useCallback(async (id: string) => {
    try {
      const result = await submissionService.retrySubmission(id as any);
      if (!result.ok) {
        console.error('Failed to retry submission:', result.error);
      }
    } catch (err) {
      console.error('Failed to retry submission:', err);
    }
  }, [submissionService]);

  /**
   * Remove a submission
   */
  const remove = useCallback(async (id: string) => {
    try {
      const result = await submissionService.deleteSubmission(id as any);
      if (!result.ok) {
        console.error('Failed to delete submission:', result.error);
      }
    } catch (err) {
      console.error('Failed to delete submission:', err);
    }
  }, [submissionService]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Listen for events
   */
  useEffect(() => {
    const unsubscribe = eventBus.subscribeAll((event: OfflineEvent) => {
      // Refresh on any submission change
      if (
        event.type === 'sync.completed' ||
        event.type === 'submission.queued' ||
        event.type === 'submission.success' ||
        event.type === 'submission.failed' ||
        event.type === 'submission.deleted' ||
        event.type === 'queue.stateChanged'
      ) {
        refresh();
      }
    });

    return () => {
      unsubscribe.unsubscribe();
    };
  }, [eventBus, refresh]);

  return {
    submissions,
    totalCount: submissions.length,
    loading,
    error,
    retry,
    remove,
    refresh,
  };
}
