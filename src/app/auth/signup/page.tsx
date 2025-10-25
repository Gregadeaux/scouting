'use client';

/**
 * Signup Page
 * Public route for new user registration
 */

import { SignupForm } from '@/components/auth/SignupForm';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Join FRC Scouting
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create an account to start scouting
          </p>
        </div>

        <SignupForm
          onSuccess={() => {
            router.push('/auth/verify-email');
          }}
          onSignIn={() => {
            router.push('/auth/login');
          }}
        />

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">
            By creating an account, you agree to follow your team&apos;s code of conduct
            and FRC gracious professionalism values.
          </p>
          <p>
            Need help?{' '}
            <a
              href="mailto:support@example.com"
              className="text-frc-blue hover:text-frc-dark-blue dark:text-frc-light-blue"
            >
              Contact your mentor
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
