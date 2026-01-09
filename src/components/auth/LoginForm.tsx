'use client';

/**
 * Login Form Component
 * Handles user authentication with email/password
 * Uses Server Actions for authentication (server-side only)
 */

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/auth/login/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';

export interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
}

export function LoginForm({ onSuccess, onForgotPassword, onSignUp }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    startTransition(async () => {
      const result = await loginAction(formData);

      if (!result.success) {
        setFormError(result.error || 'Failed to sign in');
        return;
      }

      // Success! Redirect to the appropriate page
      if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh(); // Force refresh to update auth state
      }

      onSuccess?.();
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto p-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
        Sign In to FRC Scouting
      </h2>

      {formError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="your.email@example.com"
          disabled={isPending}
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          disabled={isPending}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={isPending}
              className="mr-2 h-4 w-4 text-frc-blue border-gray-300 rounded focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Remember me</span>
          </label>

          {onForgotPassword && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-frc-blue hover:text-frc-dark-blue dark:text-frc-light-blue"
              disabled={isPending}
            >
              Forgot password?
            </button>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      {onSignUp && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={onSignUp}
              className="text-frc-blue hover:text-frc-dark-blue dark:text-frc-light-blue font-medium"
              disabled={isPending}
            >
              Sign up
            </button>
          </p>
        </div>
      )}
    </Card>
  );
}
