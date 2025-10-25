'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Error boundary UI for offline route
 * Displays friendly error message with retry option
 */
export default function OfflineError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Offline page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
          {/* Error Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <AlertTriangle
              className="w-8 h-8 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            We encountered an error while loading offline mode. This might be a
            temporary issue.
          </p>

          {/* Error Details (dev only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs font-mono text-red-700 dark:text-red-300 text-left break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-left">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Try Again
            </button>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              Go Home
            </Link>
          </div>

          {/* Help Text */}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-6">
            If this problem persists, try clearing your browser cache or contact
            support.
          </p>
        </div>
      </div>
    </div>
  );
}
