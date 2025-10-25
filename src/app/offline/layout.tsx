import { Suspense } from 'react';

/**
 * Layout for offline route
 * Wraps with Suspense for loading states and error boundary
 */
export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div
              className="inline-block w-12 h-12 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"
              role="status"
              aria-label="Loading offline mode"
            />
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
              Loading offline mode...
            </p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
