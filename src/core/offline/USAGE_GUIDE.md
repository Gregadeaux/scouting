# Offline Core Services - Usage Guide

This guide demonstrates how to use the core services layer for offline-first submission queue management.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Service Setup](#service-setup)
3. [Queuing Submissions](#queuing-submissions)
4. [Event Handling](#event-handling)
5. [Sync Management](#sync-management)
6. [Error Handling](#error-handling)
7. [React Integration](#react-integration)
8. [Testing](#testing)

---

## Quick Start

### Installation

```typescript
// Import core services and types
import {
  SubmissionService,
  SyncService,
  type QueueState,
  type Result,
} from '@/core/offline';

// Import infrastructure adapters (when implemented)
import { IndexedDBRepository } from '@/core/offline/infrastructure/indexeddb-repository';
import { HttpSyncCoordinator } from '@/core/offline/infrastructure/http-sync-coordinator';
import { InMemoryEventBus } from '@/core/offline/infrastructure/in-memory-event-bus';
```

---

## Service Setup

### Creating the Services

```typescript
// services-setup.ts
import {
  SubmissionService,
  SyncService,
} from '@/core/offline';
import {
  IndexedDBRepository,
  HttpSyncCoordinator,
  InMemoryEventBus,
} from '@/core/offline/infrastructure';

// Create infrastructure instances (singletons recommended)
const repository = new IndexedDBRepository();

const syncCoordinator = new HttpSyncCoordinator({
  maxRetries: 5,
  baseDelayMs: 1000,     // Start with 1 second delay
  maxDelayMs: 60000,     // Max 1 minute delay
  exponentialBackoff: true,
  useJitter: true,       // Prevent thundering herd
});

const eventBus = new InMemoryEventBus();

// Create application services
export const submissionService = new SubmissionService(
  repository,
  syncCoordinator,
  eventBus,
  {
    maxQueueSize: 1000,
    autoCleanupAfterMs: 24 * 60 * 60 * 1000, // 24 hours
  }
);

export const syncService = new SyncService(
  repository,
  syncCoordinator,
  eventBus,
  {
    periodicSyncIntervalMs: 30000, // 30 seconds
    maxConcurrentSyncs: 3,
    syncTimeoutMs: 30000,
  }
);

// Export event bus for subscribers
export { eventBus };
```

### Initializing on App Start

```typescript
// app-initialization.ts
import { syncService, eventBus } from './services-setup';

export function initializeOfflineServices() {
  // Subscribe to events for logging/analytics
  eventBus.subscribeAll((event) => {
    console.log('[Offline Event]', event.type, event);
  });

  // Start periodic background sync
  syncService.startPeriodicSync();

  // Cleanup on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      syncService.stopPeriodicSync();
    });
  }

  console.log('✅ Offline services initialized');
}
```

---

## Queuing Submissions

### Basic Submission

```typescript
import { submissionService } from './services-setup';
import type { SubmissionData } from '@/core/offline';

async function submitMatchScouting(matchData: MatchScoutingData) {
  // Prepare submission data
  const submissionData: SubmissionData = {
    url: '/api/scouting',
    method: 'POST',
    body: matchData,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Queue the submission
  const result = await submissionService.queueSubmission(submissionData);

  // Handle the result
  if (result.ok) {
    console.log('✅ Submission queued:', result.value.toString());
    showToast('Data saved offline. Will sync when online.', 'success');
    return result.value; // SubmissionId
  } else {
    console.error('❌ Failed to queue:', result.error.message);
    showToast(`Failed to save: ${result.error.message}`, 'error');
    throw result.error;
  }
}
```

### With Result Pattern Matching

```typescript
async function submitWithMatching(matchData: MatchScoutingData) {
  const result = await submissionService.queueSubmission({
    url: '/api/scouting',
    method: 'POST',
    body: matchData,
  });

  return result.match({
    ok: (submissionId) => {
      console.log('Success!', submissionId.toString());
      return submissionId;
    },
    err: (error) => {
      console.error('Error!', error.message);
      throw error;
    },
  });
}
```

### Checking Queue State

```typescript
async function displayQueueStatus() {
  const result = await submissionService.getQueue();

  if (!result.ok) {
    console.error('Failed to get queue:', result.error);
    return;
  }

  const queue = result.value;

  console.log(`
    📊 Queue Status:
    - Total: ${queue.total}
    - Pending: ${queue.pending}
    - Syncing: ${queue.syncing}
    - Failed: ${queue.failed}
    - Success: ${queue.success}
  `);

  // Display individual submissions
  queue.submissions.forEach((submission) => {
    console.log(`  • ${submission.id}: ${submission.status} (${submission.retryCount} retries)`);
  });
}
```

---

## Event Handling

### Subscribing to Events

```typescript
import { eventBus } from './services-setup';

// Subscribe to specific events
export function setupEventListeners() {
  // When submission is queued
  eventBus.subscribe('submission.queued', (event) => {
    console.log('📝 New submission queued:', event.submissionId);
    updateQueueBadge();
  });

  // When sync starts
  eventBus.subscribe('sync.started', (event) => {
    console.log('🔄 Sync started for', event.count, 'submissions');
    showSyncIndicator(true);
  });

  // When sync completes
  eventBus.subscribe('sync.completed', (event) => {
    console.log(`✅ Sync complete: ${event.succeeded} succeeded, ${event.failed} failed`);
    showSyncIndicator(false);

    if (event.succeeded > 0) {
      showToast(`${event.succeeded} submissions synced successfully`, 'success');
    }
  });

  // When individual submission succeeds
  eventBus.subscribe('submission.success', (event) => {
    console.log('✅ Submission synced:', event.submissionId);
    playSuccessSound();
  });

  // When individual submission fails
  eventBus.subscribe('submission.failed', (event) => {
    const message = event.willRetry
      ? `Submission failed (will retry): ${event.error}`
      : `Submission permanently failed: ${event.error}`;

    console.warn('⚠️', message);

    if (!event.willRetry) {
      showToast(message, 'error');
    }
  });

  // When submission is retrying
  eventBus.subscribe('submission.retrying', (event) => {
    const delaySeconds = Math.round(event.nextRetryMs / 1000);
    console.log(`🔄 Retrying submission in ${delaySeconds}s (attempt ${event.attempt})`);
  });

  // When queue state changes
  eventBus.subscribe('queue.stateChanged', (event) => {
    updateQueueBadge(event.pendingCount);
    updateStatusBar({
      pending: event.pendingCount,
      failed: event.failedCount,
      total: event.totalCount,
    });
  });
}

// Helper functions
function updateQueueBadge(count?: number) {
  const badge = document.getElementById('queue-badge');
  if (badge && count !== undefined) {
    badge.textContent = count.toString();
    badge.style.display = count > 0 ? 'block' : 'none';
  }
}

function showSyncIndicator(show: boolean) {
  const indicator = document.getElementById('sync-indicator');
  if (indicator) {
    indicator.style.display = show ? 'block' : 'none';
  }
}

function showToast(message: string, type: 'success' | 'error' | 'warning') {
  // Your toast implementation
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function playSuccessSound() {
  // Optional: Play a success sound
  const audio = new Audio('/sounds/success.mp3');
  audio.play().catch(() => {});
}
```

### Analytics Integration

```typescript
// Track all events for analytics
eventBus.subscribeAll((event) => {
  // Send to analytics service
  analytics.track(`offline_${event.type}`, {
    timestamp: event.timestamp,
    ...event,
  });
});

// Track specific metrics
eventBus.subscribe('sync.completed', (event) => {
  analytics.track('sync_performance', {
    duration_ms: event.durationMs,
    succeeded: event.succeeded,
    failed: event.failed,
    success_rate: event.succeeded / (event.succeeded + event.failed),
  });
});
```

---

## Sync Management

### Manual Sync

```typescript
import { syncService } from './services-setup';

// Sync all pending submissions
async function syncNow() {
  showLoadingIndicator(true);

  const result = await syncService.syncAll();

  showLoadingIndicator(false);

  if (result.ok) {
    const report = result.value;
    showToast(
      `Synced ${report.succeeded} of ${report.attempted} submissions`,
      report.failed > 0 ? 'warning' : 'success'
    );
  } else {
    showToast(`Sync failed: ${result.error.message}`, 'error');
  }
}

// Sync a specific submission
async function retrySingleSubmission(submissionIdString: string) {
  const submissionId = SubmissionId.fromString(submissionIdString);

  const result = await syncService.syncOne(submissionId);

  if (result.ok) {
    showToast('Submission synced successfully', 'success');
  } else {
    showToast(`Sync failed: ${result.error.message}`, 'error');
  }
}
```

### Retry Failed Submissions

```typescript
import { submissionService } from './services-setup';
import { SubmissionId } from '@/core/offline';

async function retryFailedSubmission(submissionIdString: string) {
  const submissionId = SubmissionId.fromString(submissionIdString);

  const result = await submissionService.retrySubmission(submissionId);

  if (result.ok) {
    showToast('Submission queued for retry', 'success');
  } else {
    showToast(`Retry failed: ${result.error.message}`, 'error');
  }
}

// Retry all failed submissions
async function retryAllFailed() {
  const queueResult = await submissionService.getQueue();

  if (!queueResult.ok) {
    showToast('Failed to get queue', 'error');
    return;
  }

  const failedSubmissions = queueResult.value.submissions.filter(
    (s) => s.status === SubmissionStatus.FAILED
  );

  let retriedCount = 0;

  for (const submission of failedSubmissions) {
    const result = await submissionService.retrySubmission(submission.id);
    if (result.ok) {
      retriedCount++;
    }
  }

  showToast(`Retrying ${retriedCount} failed submissions`, 'success');
}
```

### Periodic Sync Control

```typescript
import { syncService } from './services-setup';

// Start periodic sync (called on app init)
function startBackgroundSync() {
  syncService.startPeriodicSync(30000); // Every 30 seconds
}

// Stop periodic sync (called on app shutdown)
function stopBackgroundSync() {
  syncService.stopPeriodicSync();
}

// Check if periodic sync is running
function getSyncStatus() {
  return {
    isRunning: syncService.isPeriodicSyncRunning(),
    isSyncing: syncService.isSyncInProgress(),
  };
}
```

---

## Error Handling

### Handling Different Error Types

```typescript
import {
  isNetworkError,
  isQueueError,
  isSyncError,
  DeviceOfflineError,
  QueueFullError,
} from '@/core/offline';

async function handleSubmission(data: SubmissionData) {
  const result = await submissionService.queueSubmission(data);

  if (result.ok) {
    return result.value;
  }

  const error = result.error;

  // Network errors
  if (isNetworkError(error)) {
    if (error instanceof DeviceOfflineError) {
      showToast('Device is offline. Data saved locally.', 'info');
    } else {
      showToast('Network error. Data saved for later sync.', 'warning');
    }
    return null;
  }

  // Queue errors
  if (isQueueError(error)) {
    if (error instanceof QueueFullError) {
      showToast('Offline queue is full. Please sync existing data.', 'error');
      // Optionally trigger sync
      syncService.syncAll();
    } else {
      showToast('Queue error. Please try again.', 'error');
    }
    return null;
  }

  // Sync errors
  if (isSyncError(error)) {
    showToast(`Sync error: ${error.message}`, 'error');
    return null;
  }

  // Unknown errors
  showToast(`Error: ${error.message}`, 'error');
  return null;
}
```

### Recoverable vs Non-Recoverable Errors

```typescript
import { isRecoverableError } from '@/core/offline';

async function handleError(error: unknown) {
  if (isRecoverableError(error)) {
    // Recoverable error - will retry automatically
    console.warn('Recoverable error:', error);
    showToast('Temporary error. Will retry automatically.', 'warning');
  } else {
    // Non-recoverable error - requires user intervention
    console.error('Non-recoverable error:', error);
    showToast('Error requires attention. Check queue.', 'error');
    // Maybe navigate to queue page
    router.push('/offline/queue');
  }
}
```

---

## React Integration

### Custom Hook for Queue State

```typescript
// hooks/useOfflineQueue.ts
import { useState, useEffect } from 'react';
import { submissionService, eventBus } from '@/services-setup';
import type { QueueState } from '@/core/offline';

export function useOfflineQueue() {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial queue state
  useEffect(() => {
    async function loadQueue() {
      setLoading(true);
      const result = await submissionService.getQueue();

      if (result.ok) {
        setQueueState(result.value);
        setError(null);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
    }

    loadQueue();
  }, []);

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = eventBus.subscribe('queue.stateChanged', async () => {
      const result = await submissionService.getQueue();
      if (result.ok) {
        setQueueState(result.value);
      }
    });

    return unsubscribe.unsubscribe;
  }, []);

  return { queueState, loading, error };
}
```

### Queue Display Component

```typescript
// components/OfflineQueueDisplay.tsx
import React from 'react';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { SubmissionStatus } from '@/core/offline';

export function OfflineQueueDisplay() {
  const { queueState, loading, error } = useOfflineQueue();

  if (loading) return <div>Loading queue...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!queueState) return null;

  return (
    <div className="offline-queue">
      <h2>Offline Queue</h2>

      <div className="queue-stats">
        <StatCard label="Total" value={queueState.total} />
        <StatCard label="Pending" value={queueState.pending} color="blue" />
        <StatCard label="Syncing" value={queueState.syncing} color="yellow" />
        <StatCard label="Failed" value={queueState.failed} color="red" />
        <StatCard label="Success" value={queueState.success} color="green" />
      </div>

      <div className="submission-list">
        {queueState.submissions.map((submission) => (
          <SubmissionCard key={submission.id.toString()} submission={submission} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className={`stat-card ${color || ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
```

### Sync Button Component

```typescript
// components/SyncButton.tsx
import React, { useState } from 'react';
import { syncService, eventBus } from '@/services-setup';

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribeStart = eventBus.subscribe('sync.started', () => {
      setIsSyncing(true);
    });

    const unsubscribeComplete = eventBus.subscribe('sync.completed', () => {
      setIsSyncing(false);
    });

    return () => {
      unsubscribeStart.unsubscribe();
      unsubscribeComplete.unsubscribe();
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncService.syncAll();
  };

  return (
    <button onClick={handleSync} disabled={isSyncing}>
      {isSyncing ? (
        <>
          <Spinner /> Syncing...
        </>
      ) : (
        <>
          <SyncIcon /> Sync Now
        </>
      )}
    </button>
  );
}
```

---

## Testing

### Unit Testing Services

```typescript
// services/__tests__/submission-service.test.ts
import { SubmissionService } from '@/core/offline';
import { MockRepository } from '@/core/offline/__mocks__/mock-repository';
import { MockSyncCoordinator } from '@/core/offline/__mocks__/mock-sync-coordinator';
import { MockEventBus } from '@/core/offline/__mocks__/mock-event-bus';

describe('SubmissionService', () => {
  let service: SubmissionService;
  let mockRepo: MockRepository;
  let mockSync: MockSyncCoordinator;
  let mockEvents: MockEventBus;

  beforeEach(() => {
    mockRepo = new MockRepository();
    mockSync = new MockSyncCoordinator();
    mockEvents = new MockEventBus();

    service = new SubmissionService(mockRepo, mockSync, mockEvents);
  });

  it('should queue a submission successfully', async () => {
    const result = await service.queueSubmission({
      url: '/api/test',
      method: 'POST',
      body: { test: true },
    });

    expect(result.ok).toBe(true);
    expect(mockRepo.saved).toHaveLength(1);
  });

  it('should emit queued event', async () => {
    await service.queueSubmission({
      url: '/api/test',
      method: 'POST',
      body: { test: true },
    });

    const events = mockEvents.getPublishedEvents();
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'submission.queued' })
    );
  });

  it('should handle queue full error', async () => {
    // Fill queue to max
    mockRepo.setCount(1000);

    const result = await service.queueSubmission({
      url: '/api/test',
      method: 'POST',
      body: { test: true },
    });

    expect(result.ok).toBe(false);
    expect(result.error.message).toContain('Queue is full');
  });
});
```

---

## Best Practices

1. **Always check Result.ok** before accessing value
2. **Subscribe to events early** in app initialization
3. **Handle errors gracefully** with user-friendly messages
4. **Use type guards** for specific error handling
5. **Start periodic sync** on app initialization
6. **Stop periodic sync** on app shutdown
7. **Test with mocks** for reliable unit tests
8. **Monitor queue state** and alert users when full
9. **Provide manual sync** button for user control
10. **Show sync progress** in UI for transparency

---

## Troubleshooting

### Queue Not Syncing

```typescript
// Check sync service status
const status = {
  isPeriodicSyncRunning: syncService.isPeriodicSyncRunning(),
  isSyncing: syncService.isSyncInProgress(),
  isOnline: syncCoordinator.isOnline(),
};

console.log('Sync Status:', status);

// Restart periodic sync if needed
if (!status.isPeriodicSyncRunning) {
  syncService.startPeriodicSync();
}
```

### Submissions Stuck in Queue

```typescript
// Get queue state
const queueResult = await submissionService.getQueue();

if (queueResult.ok) {
  const stuck = queueResult.value.submissions.filter(
    (s) => s.status === SubmissionStatus.FAILED
  );

  console.log(`${stuck.length} submissions are stuck`);

  // Retry each one
  for (const submission of stuck) {
    await submissionService.retrySubmission(submission.id);
  }
}
```

---

This guide covers the core usage patterns. For implementation details, see [README.md](./README.md).
