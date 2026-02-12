'use client';

/**
 * Complete Profile Page
 * Shown to OAuth users who sign in but have no role/team assigned.
 * Collects team number and assigns the default 'scouter' role.
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { updateUserProfile } from '@/lib/supabase/auth';
import { getRedirectPathForRole } from '@/lib/services/redirect.service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import type { UserRole } from '@/types/auth';

export default function CompleteProfilePage() {
  const [teamNumber, setTeamNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Load current user info on mount
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not authenticated - redirect to login
        window.location.href = '/auth/login';
        return;
      }

      setUserId(user.id);

      // Pre-fill full name from OAuth metadata if available
      const metaName =
        user.user_metadata?.full_name || user.user_metadata?.name || '';
      setFullName(metaName as string);

      setInitializing(false);
    };

    loadUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedTeamNumber = parseInt(teamNumber, 10);
    if (!teamNumber || isNaN(parsedTeamNumber) || parsedTeamNumber < 1 || parsedTeamNumber > 99999) {
      setError('Please enter a valid FRC team number (1-99999)');
      return;
    }

    if (!userId) {
      setError('No authenticated session found. Please sign in again.');
      return;
    }

    setLoading(true);

    try {
      const defaultRole: UserRole = 'scouter';

      // Update user metadata in Supabase Auth so middleware/callback can read the role
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          role: defaultRole,
          team_number: parsedTeamNumber,
          full_name: fullName || undefined,
        },
      });

      if (metaError) {
        throw new Error(metaError.message);
      }

      // Update the user_profiles row
      const profile = await updateUserProfile(supabase, userId, {
        full_name: fullName || undefined,
      });

      if (!profile) {
        // Profile update may silently fail if RLS blocks it or the row doesn't exist yet.
        // The auth metadata update above is sufficient to unblock the user.
        console.warn('Could not update user_profiles row; proceeding with auth metadata only.');
      }

      // Redirect to the role-based landing page
      const redirectPath = getRedirectPathForRole(defaultRole);
      window.location.href = redirectPath;
    } catch (err) {
      console.error('Complete profile error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to complete profile. Please try again.'
      );
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frc-blue mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Just a couple more details before you start scouting
          </p>
        </div>

        <Card className="w-full max-w-md mx-auto p-8">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
            Team Information
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              name="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              helpText="Your name as you'd like it to appear"
            />

            <Input
              label="Team Number"
              type="number"
              name="team_number"
              value={teamNumber}
              onChange={(e) => setTeamNumber(e.target.value)}
              required
              placeholder="930"
              min="1"
              max="99999"
              helpText="Your FRC team number (required)"
            />

            <p className="text-sm text-gray-600 dark:text-gray-400">
              You will be assigned the <strong>Scouter</strong> role. A team admin can
              update your role later if needed.
            </p>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
