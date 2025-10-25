'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getAllSubmissions,
  deleteSubmission,
  type QueuedSubmission,
} from '@/lib/offline/queue';
import { syncManager } from '@/lib/offline/sync';

/**
 * Hook to manage queued submissions
 * Provides CRUD operations for submission queue
 */
export function useSubmissions() {
  const [submissions, setSubmissions] = useState<QueuedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  // Load all submissions
  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const all = await getAllSubmissions();
      setSubmissions(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Retry a specific submission
  const retry = useCallback(async (id: string) => {
    try {
      await syncManager.retrySubmission(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry submission');
    }
  }, []);

  // Delete a submission
  const remove = useCallback(async (id: string) => {
    try {
      await deleteSubmission(id);
      await loadSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete submission');
    }
  }, [loadSubmissions]);

  // Listen to sync events to reload submissions
  useEffect(() => {
    loadSubmissions();

    const unsubscribe = syncManager.on((event) => {
      if (
        event.type === 'sync-complete' ||
        event.type === 'submission-success' ||
        event.type === 'submission-failed'
      ) {
        loadSubmissions();
      }
    });

    return unsubscribe;
  }, [loadSubmissions]);

  return {
    submissions,
    loading,
    error,
    retry,
    remove,
    reload: loadSubmissions,
  };
}
