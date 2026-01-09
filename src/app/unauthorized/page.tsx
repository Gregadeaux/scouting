import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Access Denied
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You don&apos;t have permission to access this page. This area is restricted to administrators only.
        </p>

        <div className="space-y-3">
          <Link href="/dashboard" className="block">
            <Button variant="primary" className="w-full">
              Go to Dashboard
            </Button>
          </Link>

          <Link href="/" className="block">
            <Button variant="secondary" className="w-full">
              Go to Home
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          If you believe this is an error, please contact your system administrator.
        </p>
      </div>
    </div>
  );
}