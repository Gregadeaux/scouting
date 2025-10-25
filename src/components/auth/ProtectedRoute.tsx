'use client';

/**
 * Protected Route Component
 * Wrapper for pages that require authentication
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/auth';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: UserRole;
  requireTeam?: number;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Component that protects routes based on authentication and authorization
 */
export function ProtectedRoute({
  children,
  requireRole,
  requireTeam,
  fallback,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const { user, loading, canAccessTeam } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      if (!loading) {
        // Not authenticated
        if (!user) {
          router.push(redirectTo);
          return;
        }

        // Check role requirement
        if (requireRole) {
          const roleHierarchy: Record<UserRole, number> = {
            admin: 3,
            mentor: 2,
            scouter: 1,
          };

          const userLevel = roleHierarchy[user.profile.role];
          const requiredLevel = roleHierarchy[requireRole];

          if (userLevel < requiredLevel) {
            router.push('/unauthorized');
            return;
          }
        }

        // Check team access requirement
        if (requireTeam) {
          const hasAccess = await canAccessTeam(requireTeam);
          if (!hasAccess) {
            router.push('/unauthorized');
            return;
          }
        }
      }
    };

    checkAccess();
  }, [user, loading, requireRole, requireTeam, router, canAccessTeam, redirectTo]);

  // Show loading state
  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-frc-blue"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Check role
  if (requireRole) {
    const roleHierarchy: Record<UserRole, number> = {
      admin: 3,
      mentor: 2,
      scouter: 1,
    };

    const userLevel = roleHierarchy[user.profile.role];
    const requiredLevel = roleHierarchy[requireRole];

    if (userLevel < requiredLevel) {
      return null;
    }
  }

  return <>{children}</>;
}

/**
 * Loading component for protected routes
 */
export function ProtectedRouteLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-frc-blue"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying access...</p>
      </div>
    </div>
  );
}

/**
 * Unauthorized component
 */
export function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Access Denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You don&apos;t have permission to access this page. Please contact your team mentor or
          administrator if you believe this is an error.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-frc-blue hover:bg-frc-dark-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-frc-blue"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
