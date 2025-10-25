'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/auth';

interface RoleBasedWrapperProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * RoleBasedWrapper Component
 *
 * Conditionally renders children based on user role authorization.
 * Returns null or fallback component if user role is not in allowed list.
 *
 * @example
 * ```tsx
 * <RoleBasedWrapper allowedRoles={['admin', 'mentor']}>
 *   <AdminPanel />
 * </RoleBasedWrapper>
 * ```
 *
 * @example With fallback
 * ```tsx
 * <RoleBasedWrapper
 *   allowedRoles={['admin']}
 *   fallback={<p>Access denied</p>}
 * >
 *   <AdminContent />
 * </RoleBasedWrapper>
 * ```
 */
export function RoleBasedWrapper({
  children,
  allowedRoles,
  fallback = null,
}: RoleBasedWrapperProps) {
  const { user, loading } = useAuth();

  // Show nothing while loading
  if (loading) {
    return null;
  }

  // If no user, show fallback
  if (!user) {
    return <>{fallback}</>;
  }

  // Check if user's role is in allowed roles
  const hasAccess = allowedRoles.includes(user.profile.role);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
