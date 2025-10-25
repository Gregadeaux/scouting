'use client';

/**
 * Authentication Context Provider
 * Manages global authentication state and provides auth operations
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/api/auth-client';
import { authStorage } from '@/lib/offline/auth-storage';
import { authTabSync } from '@/lib/auth/tab-sync';
import { getPermissionsForRole } from '@/lib/supabase/auth';
import type {
  AuthContext as IAuthContext,
  AuthenticatedUser,
  LoginFormData,
  SignupFormData,
  UpdateUserProfileData,
  PasswordResetRequest,
  ResourceAccess,
  RolePermissions,
  OAuthProvider,
} from '@/types/auth';

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

const AuthContext = createContext<IAuthContext | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  // ============================================================================
  // INITIALIZE AUTH STATE
  // ============================================================================

  useEffect(() => {
    // Check active session on mount
    const initializeAuth = async () => {
      try {
        // Try to get user from API first
        const currentUser = await authClient.getCurrentUser();

        if (currentUser) {
          // Cache user in IndexedDB
          await authStorage.setUser(currentUser);
          setUser(currentUser);
        } else {
          // Fallback to cached user if offline
          const cachedUser = await authStorage.getUser();
          if (cachedUser) {
            setUser(cachedUser);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);

        // Try cached user on error
        try {
          const cachedUser = await authStorage.getUser();
          if (cachedUser) {
            setUser(cachedUser);
          }
        } catch (cacheErr) {
          console.error('Error reading cached user:', cacheErr);
        }

        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to cross-tab auth sync events
    const unsubscribe = authTabSync.subscribe((event) => {
      if (event.type === 'login' && event.data) {
        const user = event.data as AuthenticatedUser;
        setUser(user);
        authStorage.setUser(user).catch(console.error);
      } else if (event.type === 'logout') {
        setUser(null);
        authStorage.clearUser().catch(console.error);
      } else if (event.type === 'profile_update') {
        // Refresh user from API
        authClient.getCurrentUser().then((user) => {
          if (user) {
            setUser(user);
            authStorage.setUser(user).catch(console.error);
          }
        }).catch(console.error);
      } else if (event.type === 'session_refresh' && event.data) {
        const user = event.data as AuthenticatedUser;
        setUser(user);
        authStorage.setUser(user).catch(console.error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ============================================================================
  // AUTH OPERATIONS
  // ============================================================================

  const signIn = useCallback(
    async (data: LoginFormData) => {
      try {
        setLoading(true);
        setError(null);

        // Call login API
        const currentUser = await authClient.login(data);

        // Cache user in IndexedDB/localStorage
        await authStorage.setUser(currentUser);

        // Broadcast login to other tabs
        authTabSync.broadcast('login', { user: currentUser });

        // Update state
        setUser(currentUser);

        // Use RedirectService for consistent role-based routing
        const { getRedirectPathForRole } = await import('@/lib/services/redirect.service');
        const redirectPath = getRedirectPathForRole(currentUser.profile.role);
        router.push(redirectPath);
      } catch (err) {
        console.error('Sign in error:', err);

        // If offline, try cached user
        if (!navigator.onLine) {
          try {
            const cachedUser = await authStorage.getUser();
            if (cachedUser) {
              setUser(cachedUser);
              return;
            }
          } catch (cacheErr) {
            console.error('Failed to get cached user:', cacheErr);
          }
        }

        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const signUp = useCallback(
    async (data: SignupFormData) => {
      try {
        setLoading(true);
        setError(null);

        // Call signup API
        const currentUser = await authClient.signup(data);

        // Redirect to email verification page
        router.push('/auth/verify-email');
      } catch (err) {
        console.error('Sign up error:', err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const signInWithOAuth = useCallback(
    async (provider: OAuthProvider) => {
      try {
        setLoading(true);
        setError(null);

        // Get OAuth URL from API
        const oauthUrl = await authClient.getOAuthUrl(provider);

        // Redirect to OAuth provider
        window.location.href = oauthUrl;

        // The browser will redirect to the provider's OAuth page
        // After authorization, user will be redirected to /auth/callback
      } catch (err) {
        console.error('OAuth sign in error:', err);
        setError(err as Error);
        setLoading(false);
        throw err;
      }
      // Don't set loading to false here - the redirect will happen
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Call logout API
      await authClient.logout();

      // Clear cached user
      await authStorage.clearUser();

      // Broadcast logout to other tabs
      authTabSync.broadcast('logout');

      // Update state
      setUser(null);

      // Redirect to home
      router.push('/');
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const resetPassword = useCallback(async (data: PasswordResetRequest) => {
    try {
      setLoading(true);
      setError(null);

      // Call password reset API
      await authClient.requestPasswordReset(data.email);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (data: UpdateUserProfileData) => {
      try {
        setLoading(true);
        setError(null);

        if (!user) {
          throw new Error('No authenticated user');
        }

        // Call update profile API
        const updatedUser = await authClient.updateProfile(user.auth.id, data);

        // Cache updated user
        await authStorage.setUser(updatedUser);

        // Broadcast profile update to other tabs
        authTabSync.broadcast('profile_update', { user: updatedUser });

        // Update local state
        setUser(updatedUser);
      } catch (err) {
        console.error('Profile update error:', err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const refreshSession = useCallback(async () => {
    try {
      // Call refresh API
      const currentUser = await authClient.refresh();

      if (currentUser) {
        // Cache refreshed user
        await authStorage.setUser(currentUser);

        // Broadcast session refresh to other tabs
        authTabSync.broadcast('session_refresh', { user: currentUser });

        // Update state
        setUser(currentUser);
      }
    } catch (err) {
      console.error('Session refresh error:', err);
      setError(err as Error);
      throw err;
    }
  }, []);

  // ============================================================================
  // PERMISSION CHECKS
  // ============================================================================

  const hasPermission = useCallback(
    (permission: keyof RolePermissions): boolean => {
      if (!user) return false;
      return user.permissions[permission] as boolean;
    },
    [user]
  );

  const canAccessTeam = useCallback(
    async (teamNumber: number): Promise<boolean> => {
      if (!user) return false;
      if (user.profile.role === 'admin') return true;

      try {
        const result = await authClient.checkTeamAccess(teamNumber);
        return result.hasAccess;
      } catch (err) {
        console.error('Error checking team access:', err);
        return false;
      }
    },
    [user]
  );

  const canAccessResource = useCallback(
    async (resourceType: string, resourceId: string): Promise<ResourceAccess> => {
      if (!user) {
        return {
          canView: false,
          canEdit: false,
          canDelete: false,
          reason: 'Not authenticated',
        };
      }

      try {
        return await authClient.checkResourceAccess(resourceType, resourceId);
      } catch (err) {
        console.error('Error checking resource access:', err);
        return {
          canView: false,
          canEdit: false,
          canDelete: false,
          reason: 'Access check failed',
        };
      }
    },
    [user]
  );

  // ============================================================================
  // CONVENIENCE GETTERS
  // ============================================================================

  const isAuthenticated = !!user;
  const isAdmin = user?.profile.role === 'admin';
  const isMentor = user?.profile.role === 'mentor';
  const isScouter = user?.profile.role === 'scouter';

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: IAuthContext = {
    // State
    user,
    loading,
    error,

    // Actions
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    resetPassword,
    updateProfile,
    refreshSession,

    // Convenience getters
    isAuthenticated,
    isAdmin,
    isMentor,
    isScouter,

    // Permission checks
    hasPermission,
    canAccessTeam,
    canAccessResource,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access authentication context
 * @throws {Error} if used outside AuthProvider
 */
export function useAuth(): IAuthContext {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// ============================================================================
// PROTECTED ROUTE HOC
// ============================================================================

/**
 * Higher-order component to protect routes
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requireRole?: 'admin' | 'mentor' | 'scouter';
    redirectTo?: string;
  }
) {
  return function ProtectedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.push(options?.redirectTo || '/auth/login');
        } else if (options?.requireRole) {
          // Check role hierarchy: admin > mentor > scouter
          const roleHierarchy = { admin: 3, mentor: 2, scouter: 1 };
          const userLevel = roleHierarchy[user.profile.role];
          const requiredLevel = roleHierarchy[options.requireRole];

          if (userLevel < requiredLevel) {
            router.push('/unauthorized');
          }
        }
      }
    }, [user, loading, router]);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!user) {
      return null;
    }

    if (options?.requireRole) {
      const roleHierarchy = { admin: 3, mentor: 2, scouter: 1 };
      const userLevel = roleHierarchy[user.profile.role];
      const requiredLevel = roleHierarchy[options.requireRole];

      if (userLevel < requiredLevel) {
        return null;
      }
    }

    return <Component {...props} />;
  };
}
