'use client';

import { Clock, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import type { QueuedSubmission } from '@/lib/offline/queue';

export interface SubmissionCardProps {
  /** The queued submission to display */
  submission: QueuedSubmission;
  /** Whether device is online */
  isOnline?: boolean;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Callback when delete button is clicked */
  onDelete?: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Pure presentation component for a single submission
 * Shows submission details, status, and action buttons
 *
 * Usage:
 * <SubmissionCard
 *   submission={queuedSubmission}
 *   isOnline={true}
 *   onRetry={() => console.log('retry')}
 *   onDelete={() => console.log('delete')}
 * />
 */
export function SubmissionCard({
  submission,
  isOnline = false,
  onRetry,
  onDelete,
  className = '',
}: SubmissionCardProps) {
  const { id, url, method, status, timestamp, retryCount, error } = submission;

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" aria-label="Pending" />;
      case 'syncing':
        return (
          <RefreshCw
            className="w-5 h-5 text-blue-500 animate-spin"
            aria-label="Syncing"
          />
        );
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" aria-label="Success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" aria-label="Failed" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10';
      case 'syncing':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10';
      case 'success':
        return 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10';
      case 'failed':
        return 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10';
    }
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getUrlPath = (fullUrl: string) => {
    try {
      return new URL(fullUrl).pathname;
    } catch {
      return fullUrl;
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${getStatusColor()} ${className}`}
      role="article"
      aria-label={`Submission ${id}`}
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
          {getStatusIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Method and URL */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-semibold rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              aria-label={`HTTP method: ${method}`}
            >
              {method}
            </span>
            <span
              className="text-sm text-slate-600 dark:text-slate-400 truncate"
              title={url}
            >
              {getUrlPath(url)}
            </span>
          </div>

          {/* Timestamp and Retry Count */}
          <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">
            <time dateTime={new Date(timestamp).toISOString()}>
              {formatTimestamp(timestamp)}
            </time>
            {retryCount > 0 && (
              <span className="ml-2" aria-label={`Retried ${retryCount} times`}>
                • Retried {retryCount} time{retryCount !== 1 ? 's' : ''}
              </span>
            )}
          </p>

          {/* Status */}
          <p className="text-xs font-medium capitalize mb-1">
            <span
              className={`${
                status === 'pending'
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : status === 'syncing'
                  ? 'text-blue-700 dark:text-blue-300'
                  : status === 'success'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}
            >
              Status: {status}
            </span>
          </p>

          {/* Error Message */}
          {error && (
            <div
              className="mt-2 p-2 rounded bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
              role="alert"
            >
              <p className="text-xs text-red-700 dark:text-red-300">
                <span className="font-semibold">Error:</span> {error}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Retry Button */}
          {status === 'failed' && isOnline && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 border border-blue-300 dark:border-blue-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              aria-label="Retry submission"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry
            </button>
          )}

          {/* Delete Button */}
          {onDelete && (status === 'failed' || status === 'success') && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              aria-label="Delete submission"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
