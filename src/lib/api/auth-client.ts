/**
 * Auth API Client
 *
 * Client-side wrapper for authentication API endpoints.
 * Handles all auth-related HTTP requests with proper error handling
 * and offline support.
 */

import type {
  AuthenticatedUser,
  LoginFormData,
  SignupFormData,
  UpdateUserProfileData,
} from '@/types/auth';

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SessionResponse {
  user: AuthenticatedUser;
}

interface AuthResponse {
  user: AuthenticatedUser;
  session: { access_token: string; refresh_token: string; expires_in: number; token_type: string };
}

interface TeamAccessResponse {
  hasAccess: boolean;
  teamRole?: string;
}

/**
 * Client for making authenticated API calls
 * Automatically handles offline scenarios and network errors
 */
export class AuthAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/auth') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get current authenticated user session
   * Returns null if not authenticated or offline
   */
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/session`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const { data } = await response.json() as APIResponse<SessionResponse>;
      return data?.user || null;
    } catch (error) {
      // Return null for network errors (offline)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Offline: Cannot fetch user session');
        return null;
      }
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   * @throws Error if credentials invalid or network error
   */
  async login(data: LoginFormData): Promise<AuthenticatedUser> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json() as APIResponse<AuthResponse>;

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      if (!result.data?.user) {
        throw new Error('Invalid response format');
      }

      return result.data.user;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot login while offline');
      }
      throw error;
    }
  }

  /**
   * Create new user account
   * @throws Error if validation fails or network error
   */
  async signup(data: SignupFormData): Promise<AuthenticatedUser> {
    try {
      const response = await fetch(`${this.baseUrl}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json() as APIResponse<AuthResponse>;

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      if (!result.data?.user) {
        throw new Error('Invalid response format');
      }

      return result.data.user;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot signup while offline');
      }
      throw error;
    }
  }

  /**
   * Sign out current user
   * @throws Error if network error
   */
  async logout(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json() as APIResponse<never>;
        throw new Error(result.error || 'Logout failed');
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot logout while offline');
      }
      throw error;
    }
  }

  /**
   * Update user profile information
   * @throws Error if validation fails or network error
   */
  async updateProfile(userId: string, data: UpdateUserProfileData): Promise<AuthenticatedUser> {
    try {
      const response = await fetch(`${this.baseUrl}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, ...data }),
      });

      const result = await response.json() as APIResponse<{ user: AuthenticatedUser }>;

      if (!response.ok) {
        throw new Error(result.error || 'Profile update failed');
      }

      if (!result.data?.user) {
        throw new Error('Invalid response format');
      }

      return result.data.user;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot update profile while offline');
      }
      throw error;
    }
  }

  /**
   * Check if user has access to specific team
   */
  async checkTeamAccess(teamNumber: number): Promise<TeamAccessResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/team-access?team=${teamNumber}`, {
        credentials: 'include',
      });

      const result = await response.json() as APIResponse<TeamAccessResponse>;

      if (!response.ok) {
        throw new Error(result.error || 'Access check failed');
      }

      return result.data || { hasAccess: false };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Offline: Cannot check team access');
        return { hasAccess: false };
      }
      throw error;
    }
  }

  /**
   * Refresh current session
   * Useful for keeping sessions alive during long-running operations
   */
  async refresh(): Promise<AuthenticatedUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        const result = await response.json() as APIResponse<never>;
        throw new Error(result.error || 'Session refresh failed');
      }

      const result = await response.json() as APIResponse<SessionResponse>;
      return result.data?.user || null;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Offline: Cannot refresh session');
        return null;
      }
      throw error;
    }
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const result = await response.json() as APIResponse<never>;
        throw new Error(result.error || 'Password reset request failed');
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot request password reset while offline');
      }
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const result = await response.json() as APIResponse<never>;
        throw new Error(result.error || 'Email verification failed');
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot verify email while offline');
      }
      throw error;
    }
  }

  /**
   * Get OAuth URL for provider
   * @throws Error if network error
   */
  async getOAuthUrl(provider: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider,
          redirectTo: `${window.location.origin}/auth/callback`
        }),
      });

      const result = await response.json() as APIResponse<{ url: string }>;

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get OAuth URL');
      }

      if (!result.data?.url) {
        throw new Error('Invalid response format');
      }

      return result.data.url;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot get OAuth URL while offline');
      }
      throw error;
    }
  }

  /**
   * Check if user can access a resource
   */
  async checkResourceAccess(resourceType: string, resourceId: string): Promise<{
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    reason?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/resource-access?type=${resourceType}&id=${resourceId}`,
        {
          credentials: 'include',
        }
      );

      const result = await response.json() as APIResponse<{
        canView: boolean;
        canEdit: boolean;
        canDelete: boolean;
        reason?: string;
      }>;

      if (!response.ok) {
        throw new Error(result.error || 'Access check failed');
      }

      return result.data || {
        canView: false,
        canEdit: false,
        canDelete: false,
        reason: 'Access denied',
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Offline: Cannot check resource access');
        return {
          canView: false,
          canEdit: false,
          canDelete: false,
          reason: 'Offline',
        };
      }
      throw error;
    }
  }
}

// Export singleton instance for convenience
export const authClient = new AuthAPIClient();
