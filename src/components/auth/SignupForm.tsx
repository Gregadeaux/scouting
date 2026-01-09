'use client';

/**
 * Signup Form Component
 * Handles new user registration
 */

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { validatePasswordStrength, isValidEmail } from '@/lib/supabase/auth';
import type { SignupFormData } from '@/types/auth';

export interface SignupFormProps {
  onSuccess?: () => void;
  onSignIn?: () => void;
}

export function SignupForm({ onSuccess, onSignIn }: SignupFormProps) {
  const { signUp, signInWithOAuth, loading, error } = useAuth();
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    full_name: '',
    team_number: undefined,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else {
      const passwordValidation = validatePasswordStrength(formData.password);
      if (!passwordValidation.valid) {
        errors.password = passwordValidation.errors[0];
      }
    }

    // Confirm password
    if (formData.password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Team number validation
    if (formData.team_number && (formData.team_number < 1 || formData.team_number > 99999)) {
      errors.team_number = 'Please enter a valid FRC team number (1-99999)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await signUp(formData);
      onSuccess?.();
    } catch (err) {
      // Error is already handled by the context
      console.error('Signup error:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'team_number') {
      setFormData((prev) => ({
        ...prev,
        [name]: value ? parseInt(value, 10) : undefined,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field
    setFormErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  const handleOAuthSignIn = async () => {
    try {
      setOauthLoading('google');
      setFormErrors({});
      await signInWithOAuth('google');
      // Redirect will happen automatically
    } catch (err) {
      setFormErrors({
        oauth: err instanceof Error ? err.message : 'An error occurred signing in with Google',
      });
      setOauthLoading(null);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
        Create Your Account
      </h2>

      {(error || formErrors.oauth) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error?.message || formErrors.oauth}
        </div>
      )}

      {/* Google OAuth Button */}
      <Button
        type="button"
        variant="secondary"
        className="w-full flex items-center justify-center gap-3"
        onClick={handleOAuthSignIn}
        disabled={loading || oauthLoading !== null}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {oauthLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
      </Button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            Or sign up with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          name="full_name"
          value={formData.full_name || ''}
          onChange={handleChange}
          placeholder="John Doe"
          error={formErrors.full_name}
          helpText="Your name as you'd like it to appear"
        />

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
          placeholder="your.email@example.com"
          error={formErrors.email}
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          autoComplete="new-password"
          placeholder="Create a strong password"
          error={formErrors.password}
          helpText="At least 8 characters with uppercase, lowercase, and numbers"
        />

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setFormErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors.confirmPassword;
              return newErrors;
            });
          }}
          required
          autoComplete="new-password"
          placeholder="Re-enter your password"
          error={formErrors.confirmPassword}
        />

        <Input
          label="Team Number (Optional)"
          type="number"
          name="team_number"
          value={formData.team_number || ''}
          onChange={handleChange}
          placeholder="930"
          min="1"
          max="99999"
          error={formErrors.team_number}
          helpText="Your FRC team number"
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          By signing up, you agree to our terms of service and privacy policy.
        </p>
      </form>

      {onSignIn && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSignIn}
              className="text-frc-blue hover:text-frc-dark-blue dark:text-frc-light-blue font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      )}
    </Card>
  );
}
