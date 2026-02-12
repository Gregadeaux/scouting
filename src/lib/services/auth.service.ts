/**
 * Authentication Service
 *
 * Centralized service layer for all authentication operations.
 * Provides a clean abstraction over Supabase auth functions,
 * maintaining SOLID principles and separation of concerns.
 *
 * This service:
 * - Abstracts direct Supabase dependencies
 * - Provides consistent error handling
 * - Returns structured, type-safe results
 * - Serves as single entry point for auth operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  AuthenticatedUser,
  LoginFormData,
  SignupFormData,
  UpdateUserProfileData,
  UserProfile,
  UserRole,
} from '@/types/auth';

// Re-export functions from auth module for centralized access
import {
  getCurrentUser as getUser,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  getUserProfile as getProfile,
  updateUserProfile as updateProfile,
  requestPasswordReset as resetPassword,
  refreshSession as refreshAuthSession,
  isAdmin as checkIsAdmin,
  canAccessTeam as checkTeamAccess,
  getPermissionsForRole,
} from '@/lib/supabase/auth';

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface AuthResult<T = void> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface UserAuthResult extends AuthResult<AuthenticatedUser> {
  user?: AuthenticatedUser;
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Get the current authenticated user with profile and permissions
 *
 * @param supabase - Supabase client instance
 * @returns User data or null if not authenticated
 */
export async function getCurrentUser(
  supabase: SupabaseClient
): Promise<AuthenticatedUser | null> {
  try {
    return await getUser(supabase);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get user profile by ID
 *
 * @param supabase - Supabase client instance
 * @param userId - User's ID
 * @returns User profile or null
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  try {
    return await getProfile(supabase, userId);
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// ============================================================================
// AUTHENTICATION OPERATIONS
// ============================================================================

/**
 * Sign in user with email and password
 *
 * @param supabase - Supabase client instance
 * @param credentials - Login form data
 * @returns Authentication result with user data
 */
export async function signIn(
  supabase: SupabaseClient,
  credentials: LoginFormData
): Promise<UserAuthResult> {
  try {
    const { user, error } = await authSignIn(supabase, credentials);

    if (error || !user) {
      return {
        success: false,
        error: error || new Error('Sign in failed'),
      };
    }

    // Get full user profile
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return {
        success: false,
        error: new Error('Failed to load user profile'),
      };
    }

    return {
      success: true,
      data: currentUser,
      user: currentUser,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Sign up new user
 *
 * @param supabase - Supabase client instance
 * @param formData - Signup form data
 * @returns Authentication result
 */
export async function signUp(
  supabase: SupabaseClient,
  formData: SignupFormData
): Promise<AuthResult> {
  try {
    const { user, error } = await authSignUp(supabase, formData);

    if (error || !user) {
      return {
        success: false,
        error: error || new Error('Sign up failed'),
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Sign out current user
 *
 * @param supabase - Supabase client instance
 * @returns Result of sign out operation
 */
export async function signOut(supabase: SupabaseClient): Promise<AuthResult> {
  try {
    const { error } = await authSignOut(supabase);

    if (error) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Request password reset email
 *
 * @param supabase - Supabase client instance
 * @param email - User's email address
 * @returns Result of password reset request
 */
export async function requestPasswordReset(
  supabase: SupabaseClient,
  email: string
): Promise<AuthResult> {
  try {
    const { error } = await resetPassword(supabase, email);

    if (error) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Refresh current session
 *
 * @param supabase - Supabase client instance
 * @returns Result of session refresh
 */
export async function refreshSession(supabase: SupabaseClient): Promise<AuthResult> {
  try {
    const { error } = await refreshAuthSession(supabase);

    if (error) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

// ============================================================================
// PROFILE OPERATIONS
// ============================================================================

/**
 * Update user profile
 *
 * @param supabase - Supabase client instance
 * @param userId - User's ID
 * @param data - Profile update data
 * @returns Updated profile or null
 */
export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  data: UpdateUserProfileData
): Promise<UserProfile | null> {
  try {
    return await updateProfile(supabase, userId, data);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
}

// ============================================================================
// AUTHORIZATION CHECKS
// ============================================================================

/**
 * Check if user is an admin
 *
 * @param supabase - Supabase client instance
 * @param userId - User's ID
 * @returns true if user is admin
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    return await checkIsAdmin(supabase, userId);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if user can access team data
 *
 * @param supabase - Supabase client instance
 * @param userId - User's ID
 * @param teamNumber - Team number to check access for
 * @returns true if user can access team
 */
export async function canAccessTeam(
  supabase: SupabaseClient,
  userId: string,
  teamNumber: number
): Promise<boolean> {
  try {
    return await checkTeamAccess(supabase, userId, teamNumber);
  } catch (error) {
    console.error('Error checking team access:', error);
    return false;
  }
}

/**
 * Get permissions for a specific role
 *
 * @param role - User role
 * @returns Role permissions object
 */
export function getRolePermissions(role: UserRole) {
  return getPermissionsForRole(role);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user has completed onboarding
 *
 * @param user - Authenticated user
 * @returns true if onboarding is complete
 */
export function hasCompletedOnboarding(user: AuthenticatedUser): boolean {
  return user.profile.onboarding_completed || false;
}

/**
 * Get user's primary team number
 *
 * @param user - Authenticated user
 * @returns Team number or null
 */
export function getPrimaryTeamNumber(user: AuthenticatedUser): number | null {
  return user.profile.primary_team_number || null;
}

/**
 * Get user's display name
 *
 * @param user - Authenticated user
 * @returns Display name, falling back to full name or email
 */
export function getUserDisplayName(user: AuthenticatedUser): string {
  return (
    user.profile.display_name ||
    user.profile.full_name ||
    user.profile.email
  );
}

// ============================================================================
// PERMISSION HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user can view events
 *
 * @param user - User object with role property, or null
 * @returns true if user can view events
 */
export function canViewEvents(user: { role: string } | null): boolean {
  if (!user) return false;
  return ['admin', 'mentor', 'scouter', 'viewer'].includes(user.role);
}

/**
 * Check if user can edit events
 *
 * @param user - User object with role property, or null
 * @returns true if user can edit events
 */
export function canEditEvents(user: { role: string } | null): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

/**
 * Check if user can view team details
 *
 * @param user - User object with role property, or null
 * @returns true if user can view team details
 */
export function canViewTeamDetails(user: { role: string } | null): boolean {
  if (!user) return false;
  return ['admin', 'mentor', 'viewer'].includes(user.role);
}

/**
 * Check if user can edit team data
 *
 * @param user - User object with role property, or null
 * @returns true if user can edit team data
 */
export function canEditTeamData(user: { role: string } | null): boolean {
  if (!user) return false;
  return ['admin', 'scouter'].includes(user.role);
}

/**
 * Check if user can manage scouting sessions (lead scout operations)
 *
 * @param user - User object with role property, or null
 * @returns true if user can manage scouting sessions
 */
export function canManageScoutingSession(user: { role: string } | null): boolean {
  if (!user) return false;
  return ['admin', 'mentor'].includes(user.role);
}
