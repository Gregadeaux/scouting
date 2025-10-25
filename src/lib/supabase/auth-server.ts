/**
 * Server-Only Authentication Helper Functions
 * For use in Server Components, API Routes, and Server Actions
 *
 * These functions create their own server client internally.
 * For client-side usage, use functions from './auth.ts' instead.
 */

import { createClient } from './server';
import { getPermissionsForRole } from './auth';
import type {
  AuthenticatedUser,
  UserProfile,
  UserRole,
  TeamMembership
} from '@/types/auth';

// ============================================================================
// USER PROFILE OPERATIONS
// ============================================================================

/**
 * Get user profile by ID (server-side)
 */
export async function getUserProfileServer(
  userId: string
): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

/**
 * Get current authenticated user with profile (server-side)
 */
export async function getCurrentUserServer(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const profile = await getUserProfileServer(user.id);

  if (!profile) {
    return null;
  }

  const permissions = getPermissionsForRole(profile.role);

  return {
    auth: user,
    profile,
    permissions,
  };
}

// ============================================================================
// TEAM MEMBERSHIP OPERATIONS
// ============================================================================

/**
 * Get user's team memberships (server-side)
 */
export async function getUserTeamsServer(
  userId: string
): Promise<TeamMembership[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching team memberships:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's role (server-side)
 */
export async function getUserRoleServer(
  userId: string
): Promise<UserRole | null> {
  const profile = await getUserProfileServer(userId);
  return profile?.role || null;
}

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * Check if user is admin (server-side)
 */
export async function isAdminServer(
  userId: string
): Promise<boolean> {
  const profile = await getUserProfileServer(userId);
  return profile?.role === 'admin';
}

/**
 * Check if user is mentor for a team (server-side)
 */
export async function isTeamMentorServer(
  userId: string,
  teamNumber: number
): Promise<boolean> {
  // Check if user is admin first
  const profile = await getUserProfileServer(userId);
  if (profile?.role === 'admin') {
    return true;
  }

  const supabase = await createClient();

  // Check if user is a mentor for this specific team
  const { data, error } = await supabase
    .from('team_members')
    .select('team_role')
    .eq('user_id', userId)
    .eq('team_number', teamNumber)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return false;
  }

  return data.team_role === 'mentor';
}

/**
 * Check if user can access team data (server-side)
 */
export async function canAccessTeamServer(
  userId: string,
  teamNumber: number
): Promise<boolean> {
  // Check if user is admin first
  const profile = await getUserProfileServer(userId);
  if (profile?.role === 'admin') {
    return true;
  }

  const supabase = await createClient();

  // Check if user is a member of this team
  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', userId)
    .eq('team_number', teamNumber)
    .eq('is_active', true)
    .single();

  return !error && !!data;
}
