'use client';

/**
 * Email Verification Page
 * Shown after signup to prompt email verification
 */

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResendEmail = async () => {
    setResending(true);
    try {
      // Get current user email from session
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: user.email,
        });

        if (error) throw error;

        setResent(true);
        setTimeout(() => setResent(false), 5000);
      }
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          {/* Email Icon */}
          <div className="mx-auto w-16 h-16 bg-frc-blue/10 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-frc-blue"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Check Your Email
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We&apos;ve sent a verification email to your inbox. Please click the link in the
            email to verify your account and complete registration.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Important:</strong> Check your spam folder if you don&apos;t see the email
              within a few minutes.
            </p>
          </div>

          {resent && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg dark:bg-green-900 dark:border-green-700 dark:text-green-200">
              Verification email resent! Check your inbox.
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleResendEmail}
              disabled={resending || resent}
            >
              {resending ? 'Sending...' : resent ? 'Email Sent!' : 'Resend Verification Email'}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/auth/login')}
            >
              Back to Login
            </Button>
          </div>

          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Already verified?{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="text-frc-blue hover:text-frc-dark-blue dark:text-frc-light-blue font-medium"
            >
              Sign in here
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}
