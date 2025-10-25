/**
 * Auth Tab Sync - Cross-tab authentication synchronization
 * Uses BroadcastChannel API to sync auth state across browser tabs
 */

import type { AuthenticatedUser } from '@/types/auth';

export type AuthSyncEventType = 'login' | 'logout' | 'profile_update' | 'session_refresh';

export interface AuthSyncEvent {
  type: AuthSyncEventType;
  timestamp: number;
  data?: any;
}

type AuthSyncListener = (event: AuthSyncEvent) => void;

/**
 * Auth Tab Sync Manager
 * Synchronizes authentication state across browser tabs
 */
export class AuthTabSync {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<AuthSyncListener> = new Set();
  private tabId: string;
  private isSupported: boolean;

  constructor() {
    // Generate unique tab ID
    this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check BroadcastChannel support
    this.isSupported = typeof window !== 'undefined' && 'BroadcastChannel' in window;

    // Only initialize in browser environment
    if (this.isSupported) {
      try {
        this.channel = new BroadcastChannel('frc-scouting-auth');
        this.channel.onmessage = this.handleMessage.bind(this);
      } catch (error) {
        console.warn('BroadcastChannel initialization failed:', error);
        this.isSupported = false;
      }
    }
  }

  /**
   * Handle incoming messages from other tabs
   */
  private handleMessage(event: MessageEvent<AuthSyncEvent>): void {
    const syncEvent = event.data;

    // Validate event structure
    if (!syncEvent || !syncEvent.type || !syncEvent.timestamp) {
      console.warn('Invalid auth sync event received:', syncEvent);
      return;
    }

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(syncEvent);
      } catch (error) {
        console.error('Error in auth sync listener:', error);
      }
    });
  }

  /**
   * Broadcast an auth event to all other tabs
   */
  broadcast(type: AuthSyncEventType, data?: unknown): void {
    if (!this.channel || !this.isSupported) {
      return;
    }

    const event: AuthSyncEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    try {
      this.channel.postMessage(event);
    } catch (error) {
      console.error('Failed to broadcast auth event:', error);
    }
  }

  /**
   * Subscribe to auth sync events
   * @returns Unsubscribe function
   */
  subscribe(listener: AuthSyncListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Broadcast login event
   */
  broadcastLogin(user: AuthenticatedUser): void {
    this.broadcast('login', user);
  }

  /**
   * Broadcast logout event
   */
  broadcastLogout(): void {
    this.broadcast('logout');
  }

  /**
   * Broadcast profile update event
   */
  broadcastProfileUpdate(updates: Partial<AuthenticatedUser>): void {
    this.broadcast('profile_update', updates);
  }

  /**
   * Broadcast session refresh event
   */
  broadcastSessionRefresh(user: AuthenticatedUser): void {
    this.broadcast('session_refresh', user);
  }

  /**
   * Clean up resources
   */
  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }

  /**
   * Check if tab sync is available
   */
  get supported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current tab ID
   */
  get currentTabId(): string {
    return this.tabId;
  }

  /**
   * Get number of active subscribers
   */
  get subscriberCount(): number {
    return this.listeners.size;
  }
}

// Export singleton instance
export const authTabSync = new AuthTabSync();
