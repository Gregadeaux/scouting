/**
 * Auth Storage
 *
 * Manages offline caching of authenticated user data in localStorage.
 * Provides fallback when network is unavailable and allows the app
 * to function in offline mode with cached credentials.
 */

import type { AuthenticatedUser } from '@/types/auth';

const AUTH_STORAGE_KEY = 'scouting_auth_user';
const AUTH_TIMESTAMP_KEY = 'scouting_auth_timestamp';
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Manages local storage of authentication data
 * Singleton pattern for consistent access across the app
 */
export class AuthStorage {
  /**
   * Retrieve cached user from localStorage
   * Returns null if no user cached, cache expired, or parse error
   */
  async getUser(): Promise<AuthenticatedUser | null> {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);

      if (!stored) {
        return null;
      }

      // Check cache expiration
      if (timestamp) {
        const cachedTime = parseInt(timestamp, 10);
        const now = Date.now();

        if (now - cachedTime > CACHE_DURATION_MS) {
          console.warn('Auth cache expired, clearing');
          await this.clearUser();
          return null;
        }
      }

      const user = JSON.parse(stored) as AuthenticatedUser;

      // Validate required fields
      if (!user.profile?.id || !user.profile?.email || !user.profile?.role) {
        console.warn('Invalid cached user data, clearing');
        await this.clearUser();
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error reading auth storage:', error);
      // Clear corrupted data
      await this.clearUser();
      return null;
    }
  }

  /**
   * Store user in localStorage
   * Automatically adds timestamp for cache expiration
   */
  async setUser(user: AuthenticatedUser): Promise<void> {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error writing auth storage:', error);
      // Storage quota exceeded or other error
      throw new Error('Failed to cache user data');
    }
  }

  /**
   * Remove user from localStorage
   * Call on logout or when cache is invalid
   */
  async clearUser(): Promise<void> {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error clearing auth storage:', error);
    }
  }

  /**
   * Check if user is cached without retrieving full data
   * Useful for quick checks before expensive operations
   */
  async hasUser(): Promise<boolean> {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get cache age in milliseconds
   * Returns null if no cache exists
   */
  async getCacheAge(): Promise<number | null> {
    try {
      const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);
      if (!timestamp) {
        return null;
      }

      const cachedTime = parseInt(timestamp, 10);
      return Date.now() - cachedTime;
    } catch {
      return null;
    }
  }

  /**
   * Check if cache is expired without clearing
   */
  async isCacheExpired(): Promise<boolean> {
    const age = await this.getCacheAge();
    if (age === null) {
      return true;
    }
    return age > CACHE_DURATION_MS;
  }

  /**
   * Update specific fields in cached user
   * Useful for profile updates without full re-authentication
   */
  async updateUser(updates: Partial<AuthenticatedUser>): Promise<AuthenticatedUser | null> {
    try {
      const currentUser = await this.getUser();
      if (!currentUser) {
        return null;
      }

      const updatedUser: AuthenticatedUser = {
        ...currentUser,
        ...updates,
        // Preserve immutable auth fields
        auth: currentUser.auth,
        profile: {
          ...currentUser.profile,
          ...(updates.profile || {}),
          // Preserve immutable profile fields
          id: currentUser.profile.id,
          email: currentUser.profile.email,
        },
      };

      await this.setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating cached user:', error);
      return null;
    }
  }

  /**
   * Refresh cache timestamp without changing user data
   * Call after successful API requests to extend cache lifetime
   */
  async refreshTimestamp(): Promise<void> {
    try {
      const hasUser = await this.hasUser();
      if (hasUser) {
        localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
      }
    } catch (error) {
      console.error('Error refreshing timestamp:', error);
    }
  }

  /**
   * Get storage size estimate
   * Useful for debugging storage issues
   */
  getStorageSize(): number {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) {
        return 0;
      }
      // Approximate size in bytes
      return new Blob([stored]).size;
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const authStorage = new AuthStorage();

/**
 * Storage event listener for cross-tab synchronization
 * Listen to changes made by other tabs/windows
 */
export function createStorageListener(
  onUserChanged: (user: AuthenticatedUser | null) => void
): () => void {
  const handler = async (event: StorageEvent) => {
    // Only respond to auth storage changes
    if (event.key !== AUTH_STORAGE_KEY) {
      return;
    }

    try {
      if (event.newValue === null) {
        // User was cleared in another tab
        onUserChanged(null);
      } else {
        // User was updated in another tab
        const user = JSON.parse(event.newValue) as AuthenticatedUser;
        onUserChanged(user);
      }
    } catch (error) {
      console.error('Error handling storage event:', error);
    }
  };

  window.addEventListener('storage', handler);

  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handler);
  };
}
