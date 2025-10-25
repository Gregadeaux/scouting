/**
 * Authentication & Authorization Type Definitions
 * Supabase Auth + Role-Based Access Control (RBAC)
 */

import { User as SupabaseUser } from '@supabase/supabase-js';

// ============================================================================
// USER ROLES & PERMISSIONS
// ============================================================================

/**
 * User role hierarchy:
 * - admin: Full system access, user management, all teams
 * - mentor: Team management, assign scouts, view analytics
 * - scouter: Submit scouting data, view assigned matches
 */
export type UserRole = 'admin' | 'mentor' | 'scouter';

/**
 * Permission sets for each role
 */
export interface RolePermissions {
  // Data Permissions
  canSubmitData: boolean;
  canEditData: boolean;
  canDeleteData: boolean;
  canViewAnalytics: boolean;

  // Team Management
  canManageTeam: boolean;
  canInviteMembers: boolean;
  canAssignScouts: boolean;

  // System Administration
  canManageUsers: boolean;
  canManageRoles: boolean;
  canViewAuditLogs: boolean;
  canManageSeasons: boolean;

  // Data Access Scope
  accessScope: 'all' | 'team' | 'own';
}

/**
 * Default permissions by role
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canSubmitData: true,
    canEditData: true,
    canDeleteData: true,
    canViewAnalytics: true,
    canManageTeam: true,
    canInviteMembers: true,
    canAssignScouts: true,
    canManageUsers: true,
    canManageRoles: true,
    canViewAuditLogs: true,
    canManageSeasons: true,
    accessScope: 'all',
  },
  mentor: {
    canSubmitData: true,
    canEditData: true,
    canDeleteData: false,
    canViewAnalytics: true,
    canManageTeam: true,
    canInviteMembers: true,
    canAssignScouts: true,
    canManageUsers: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canManageSeasons: false,
    accessScope: 'team',
  },
  scouter: {
    canSubmitData: true,
    canEditData: false,
    canDeleteData: false,
    canViewAnalytics: false,
    canManageTeam: false,
    canInviteMembers: false,
    canAssignScouts: false,
    canManageUsers: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canManageSeasons: false,
    accessScope: 'own',
  },
};

// ============================================================================
// USER PROFILE
// ============================================================================

/**
 * Extended user profile linked to Supabase Auth
 */
export interface UserProfile {
  // Auth linkage
  id: string; // UUID from auth.users
  email: string;

  // User Information
  full_name?: string;
  display_name?: string;

  // Role & Permissions
  role: UserRole;

  // Team Association
  primary_team_number?: number | null;

  // Scouting Preferences
  preferred_scout_name?: string;
  device_id?: string;

  // Account Status
  is_active: boolean;
  email_verified: boolean;

  // Onboarding
  onboarding_completed: boolean;
  training_completed_at?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  last_login_at?: string;

  // Audit
  created_by?: string;
}

/**
 * User profile with Supabase auth data
 */
export interface AuthenticatedUser {
  auth: SupabaseUser;
  profile: UserProfile;
  permissions: RolePermissions;
}

/**
 * User profile creation data
 */
export interface CreateUserProfileData {
  email: string;
  full_name?: string;
  display_name?: string;
  role: UserRole;
  primary_team_number?: number;
  preferred_scout_name?: string;
}

/**
 * User profile update data
 */
export interface UpdateUserProfileData {
  full_name?: string;
  display_name?: string;
  preferred_scout_name?: string;
  device_id?: string;
  onboarding_completed?: boolean;
  training_completed_at?: string;
}

// ============================================================================
// TEAM MEMBERSHIP
// ============================================================================

/**
 * Multi-team membership for users
 */
export interface TeamMembership {
  id: string;

  // Relationships
  user_id: string;
  team_number: number;

  // Team-specific role
  team_role: UserRole;

  // Access Control
  can_submit_data: boolean;
  can_view_analytics: boolean;
  can_manage_team: boolean;

  // Status
  is_active: boolean;
  joined_at: string;
  left_at?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Team membership creation data
 */
export interface CreateTeamMembershipData {
  user_id: string;
  team_number: number;
  team_role: UserRole;
  can_submit_data?: boolean;
  can_view_analytics?: boolean;
  can_manage_team?: boolean;
}

/**
 * Extended user with team memberships
 */
export interface UserWithTeams extends UserProfile {
  team_memberships: TeamMembership[];
}

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * Audit log entry for security tracking
 */
export interface AuditLogEntry {
  id: string;

  // Who & When
  user_id?: string;
  email?: string;

  // What
  action: AuditAction;
  resource_type?: string;
  resource_id?: string;

  // Details
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  // Context
  ip_address?: string;
  user_agent?: string;

  // Timing
  created_at: string;
}

/**
 * Common audit actions
 */
export type AuditAction =
  | 'user_signup'
  | 'user_login'
  | 'user_logout'
  | 'role_change'
  | 'profile_update'
  | 'team_join'
  | 'team_leave'
  | 'data_create'
  | 'data_update'
  | 'data_delete'
  | 'permission_change'
  | 'password_reset'
  | 'email_change';

// ============================================================================
// AUTHENTICATION FORMS
// ============================================================================

/**
 * Login form data
 */
export interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

/**
 * Signup form data
 */
export interface SignupFormData {
  email: string;
  password: string;
  full_name?: string;
  team_number?: number;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirm {
  token: string;
  password: string;
}

/**
 * Email change request
 */
export interface EmailChangeRequest {
  new_email: string;
  password: string;
}

// ============================================================================
// AUTHORIZATION HELPERS
// ============================================================================

/**
 * Resource access check
 */
export interface ResourceAccess {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  reason?: string;
}

/**
 * Team access check
 */
export interface TeamAccess {
  hasAccess: boolean;
  canManage: boolean;
  membership?: TeamMembership;
}

// ============================================================================
// AUTH CONTEXT
// ============================================================================

/**
 * Authentication context state
 */
export interface AuthContextState {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: Error | null;
}

/**
 * OAuth provider types
 * Currently only Google is supported
 * Apple can be added when you have an Apple Developer account
 */
export type OAuthProvider = 'google';

/**
 * Authentication context actions
 */
export interface AuthContextActions {
  signIn: (data: LoginFormData) => Promise<void>;
  signUp: (data: SignupFormData) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (data: PasswordResetRequest) => Promise<void>;
  updateProfile: (data: UpdateUserProfileData) => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * Full authentication context
 */
export interface AuthContext extends AuthContextState, AuthContextActions {
  // Convenience getters
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMentor: boolean;
  isScouter: boolean;

  // Permission checks
  hasPermission: (permission: keyof RolePermissions) => boolean;
  canAccessTeam: (teamNumber: number) => Promise<boolean>;
  canAccessResource: (resourceType: string, resourceId: string) => Promise<ResourceAccess>;
}

// ============================================================================
// SESSION & TOKENS
// ============================================================================

/**
 * Session information
 */
export interface SessionInfo {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  user: SupabaseUser;
}

/**
 * Invitation token for new users
 */
export interface InvitationToken {
  id: string;
  email: string;
  role: UserRole;
  team_number?: number;
  expires_at: string;
  created_by: string;
  used_at?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

/**
 * Authentication API response
 */
export interface AuthResponse {
  success: boolean;
  user?: AuthenticatedUser;
  session?: SessionInfo;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * User list response
 */
export interface UserListResponse {
  users: UserProfile[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * Team members response
 */
export interface TeamMembersResponse {
  members: (UserProfile & { membership: TeamMembership })[];
  team_number: number;
  total: number;
}
