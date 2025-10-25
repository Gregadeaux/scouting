'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ImportJob } from '@/types/import-job';

export interface UseImportJobResult {
  job: ImportJob | null;
  isLoading: boolean;
  error: string | null;
  isComplete: boolean;
  isProcessing: boolean;
  isFailed: boolean;
  refresh: () => Promise<void>;
  cancel: () => Promise<void>;
}

export function useImportJob(jobId: string | null): UseImportJobResult {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/import-jobs/${jobId}`);
      const data = await response.json();

      if (data.success) {
        setJob(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch job status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  const cancel = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/admin/import-jobs/${jobId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        await fetchStatus(); // Refresh status
      } else {
        setError(data.error || 'Failed to cancel job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    }
  }, [jobId, fetchStatus]);

  // Poll every 2 seconds while job is processing
  useEffect(() => {
    if (!jobId || !job || job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return;
    }

    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [jobId, job, fetchStatus]);

  // Initial fetch
  useEffect(() => {
    if (jobId) {
      fetchStatus();
    }
  }, [jobId, fetchStatus]);

  return {
    job,
    isLoading,
    error,
    isComplete: job?.status === 'completed',
    isProcessing: job?.status === 'processing',
    isFailed: job?.status === 'failed',
    refresh: fetchStatus,
    cancel,
  };
}
