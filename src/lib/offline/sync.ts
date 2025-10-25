/**
 * Background Sync Manager
 *
 * Handles automatic retry of queued submissions with exponential backoff.
 * Listens for online events and coordinates background sync.
 */

import {
  getPendingSubmissions,
  updateSubmission,
  deleteSubmission,
  cleanupOldSubmissions,
  type QueuedSubmission,
} from './queue';

const MAX_RETRIES = 5;
const BASE_DELAY = 1000; // 1 second
const MAX_DELAY = 60000; // 1 minute

/**
 * Event emitter for sync status updates
 */
type SyncEventListener = (event: SyncEvent) => void;

export interface SyncEvent {
  type: 'sync-start' | 'sync-complete' | 'sync-error' | 'submission-success' | 'submission-failed';
  submissionId?: string;
  error?: string;
  pending?: number;
}

class SyncManager {
  private listeners: SyncEventListener[] = [];
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for online events
      window.addEventListener('online', () => this.syncAll());

      // Periodic cleanup
      setInterval(() => cleanupOldSubmissions(), 60 * 60 * 1000); // Every hour
    }
  }

  /**
   * Add event listener for sync updates
   */
  on(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Emit sync event to all listeners
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Calculate exponential backoff delay
   */
  private getBackoffDelay(retryCount: number): number {
    const delay = Math.min(BASE_DELAY * Math.pow(2, retryCount), MAX_DELAY);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Check if device is online
   */
  private isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  }

  /**
   * Sync a single submission
   */
  private async syncSubmission(submission: QueuedSubmission): Promise<boolean> {
    if (!this.isOnline()) {
      return false;
    }

    try {
      // Update status to syncing
      await updateSubmission(submission.id, {
        status: 'syncing',
        lastAttempt: Date.now(),
      });

      // Attempt to send the request
      const response = await fetch(submission.url, {
        method: submission.method,
        headers: {
          'Content-Type': 'application/json',
          ...submission.headers,
        },
        body: JSON.stringify(submission.body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success! Delete from queue
      await deleteSubmission(submission.id);

      this.emit({
        type: 'submission-success',
        submissionId: submission.id,
      });

      return true;
    } catch (error) {
      const retryCount = submission.retryCount + 1;
      const shouldRetry = retryCount < MAX_RETRIES;

      if (shouldRetry) {
        // Update with retry count and pending status
        await updateSubmission(submission.id, {
          status: 'pending',
          retryCount,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Schedule retry with backoff
        const delay = this.getBackoffDelay(retryCount);
        setTimeout(() => this.syncSubmission(submission), delay);
      } else {
        // Max retries reached, mark as failed
        await updateSubmission(submission.id, {
          status: 'failed',
          retryCount,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        this.emit({
          type: 'submission-failed',
          submissionId: submission.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return false;
    }
  }

  /**
   * Sync all pending submissions
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing || !this.isOnline()) {
      return;
    }

    this.isSyncing = true;
    this.emit({ type: 'sync-start' });

    try {
      const pending = await getPendingSubmissions();

      if (pending.length === 0) {
        this.emit({ type: 'sync-complete', pending: 0 });
        return;
      }

      // Process submissions sequentially to avoid overwhelming the server
      for (const submission of pending) {
        await this.syncSubmission(submission);
      }

      // Get remaining pending count
      const remaining = await getPendingSubmissions();

      this.emit({
        type: 'sync-complete',
        pending: remaining.length,
      });
    } catch (error) {
      this.emit({
        type: 'sync-error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Start periodic background sync
   */
  startPeriodicSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      return; // Already started
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline()) {
        this.syncAll();
      }
    }, intervalMs);
  }

  /**
   * Stop periodic background sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Force retry a specific submission
   */
  async retrySubmission(id: string): Promise<void> {
    const pending = await getPendingSubmissions();
    const submission = pending.find((s) => s.id === id);

    if (!submission) {
      throw new Error(`Submission ${id} not found`);
    }

    await this.syncSubmission(submission);
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

/**
 * Initialize sync manager (call this once in your app)
 */
export function initializeSyncManager(): void {
  if (typeof window !== 'undefined') {
    // Start periodic sync
    syncManager.startPeriodicSync(30000); // Every 30 seconds

    // Sync on initial load if online
    if (navigator.onLine) {
      syncManager.syncAll();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      syncManager.stopPeriodicSync();
    });
  }
}
