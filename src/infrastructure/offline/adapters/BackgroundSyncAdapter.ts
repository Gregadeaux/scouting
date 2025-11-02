/**
 * BackgroundSyncAdapter
 *
 * Bridge between the service worker's Background Sync API and our offline infrastructure.
 * Provides abstraction for registering background sync events and checking browser support.
 */

// Extended ServiceWorkerRegistration type with sync support
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  };
}

export interface IBackgroundSyncAdapter {
  /**
   * Register a sync event with the service worker
   * @param tag - Unique identifier for the sync event
   */
  registerSync(tag: string): Promise<void>;

  /**
   * Check if Background Sync API is supported
   */
  isSupported(): boolean;

  /**
   * Get all pending sync tags
   */
  getTags(): Promise<string[]>;
}

export class BackgroundSyncAdapter implements IBackgroundSyncAdapter {
  private static instance: BackgroundSyncAdapter;

  /**
   * Get singleton instance
   */
  static getInstance(): BackgroundSyncAdapter {
    if (!BackgroundSyncAdapter.instance) {
      BackgroundSyncAdapter.instance = new BackgroundSyncAdapter();
    }
    return BackgroundSyncAdapter.instance;
  }

  /**
   * Register a sync event with the service worker
   * Falls back gracefully if not supported
   */
  async registerSync(tag: string): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Background Sync not supported, falling back to manual sync');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      // Type assertion needed as TypeScript doesn't include sync in ServiceWorkerRegistration by default
      await (registration as ServiceWorkerRegistrationWithSync).sync.register(tag);
      console.log(`Background sync registered: ${tag}`);
    } catch (error) {
      console.error('Failed to register background sync:', error);
      throw error;
    }
  }

  /**
   * Check if Background Sync API is supported in the current browser
   * Note: Only Chrome and Edge support this API as of 2024
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false; // SSR environment
    }

    return (
      'serviceWorker' in navigator &&
      'sync' in ServiceWorkerRegistration.prototype
    );
  }

  /**
   * Get all pending sync tags from the service worker
   */
  async getTags(): Promise<string[]> {
    if (!this.isSupported()) return [];

    try {
      const registration = await navigator.serviceWorker.ready;
      // Type assertion needed as TypeScript doesn't include sync.getTags()
      const tags = await (registration as ServiceWorkerRegistrationWithSync).sync.getTags();
      return tags || [];
    } catch (error) {
      console.error('Failed to get sync tags:', error);
      return [];
    }
  }

  /**
   * Check if a specific sync tag is pending
   */
  async hasPendingSync(tag: string): Promise<boolean> {
    const tags = await this.getTags();
    return tags.includes(tag);
  }
}