'use client';

/**
 * Login Page
 * Public route for user authentication
 */

import { LoginForm } from '@/components/auth/LoginForm';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

/**
 * Login Page
 *
 * Public route for user authentication.
 * Redirect logic is handled by:
 * - Middleware: Prevents authenticated users from accessing this page
 * - AuthContext: Routes users to role-specific pages after successful login
 */

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            FRC Scouting System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to access your scouting dashboard
          </p>
        </div>

        <LoginForm
          onSuccess={() => {
            // AuthContext.signIn handles role-based redirect via RedirectService
            // No need to redirect here - just let the auth flow complete
          }}
          onForgotPassword={() => {
            router.push('/auth/forgot-password');
          }}
          onSignUp={() => {
            router.push('/auth/signup');
          }}
        />

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Having trouble?{' '}
            <a
              href="mailto:support@example.com"
              className="text-frc-blue hover:text-frc-dark-blue dark:text-frc-light-blue"
            >
              Contact your team mentor
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
