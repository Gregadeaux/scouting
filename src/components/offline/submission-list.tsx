'use client';

import { CheckCircle } from 'lucide-react';
import type { QueuedSubmission } from '@/lib/offline/queue';
import { SubmissionCard } from './submission-card';

export interface SubmissionListProps {
  /** Array of submissions to display */
  submissions: QueuedSubmission[];
  /** Whether device is online */
  isOnline?: boolean;
  /** Callback when retry is clicked for a submission */
  onRetry?: (id: string) => void;
  /** Callback when delete is clicked for a submission */
  onDelete?: (id: string) => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Pure presentation component for list of submissions
 * Renders a list of SubmissionCard components or empty state
 *
 * Usage:
 * <SubmissionList
 *   submissions={submissions}
 *   isOnline={true}
 *   onRetry={(id) => console.log('retry', id)}
 *   onDelete={(id) => console.log('delete', id)}
 * />
 */
export function SubmissionList({
  submissions,
  isOnline = false,
  onRetry,
  onDelete,
  className = '',
}: SubmissionListProps) {
  // Empty state
  if (submissions.length === 0) {
    return (
      <div
        className={`text-center py-12 ${className}`}
        role="status"
        aria-label="No submissions"
      >
        <CheckCircle
          className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50"
          aria-hidden="true"
        />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
          No queued submissions
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          All your data has been synced successfully
        </p>
      </div>
    );
  }

  // Sort submissions: failed first, then pending, then syncing, then success
  const sortedSubmissions = [...submissions].sort((a, b) => {
    const statusOrder = { failed: 0, pending: 1, syncing: 2, success: 3 };
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    // Within same status, sort by timestamp (newest first)
    return b.timestamp - a.timestamp;
  });

  return (
    <div className={className}>
      <div
        className="space-y-3"
        role="list"
        aria-label={`${submissions.length} submissions`}
      >
        {sortedSubmissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            isOnline={isOnline}
            onRetry={onRetry ? () => onRetry(submission.id) : undefined}
            onDelete={onDelete ? () => onDelete(submission.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
