# Offline Support - React Hooks Layer

Complete React Hooks implementation for offline-first functionality in Next.js 15 App Router.

## Overview

This layer provides React hooks and providers that make offline functionality easy to use in your components. All hooks follow React best practices and are fully typed with TypeScript.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  UI Components                      │
│              (Forms, Lists, Status)                 │
└────────────────┬────────────────────────────────────┘
                 │ uses
┌────────────────▼────────────────────────────────────┐
│              React Hooks Layer                      │
│  - useOfflineStatus()                              │
│  - useSyncQueue()                                  │
│  - useSubmissions()                                │
│  - useOptimisticSubmission()                       │
└────────────────┬────────────────────────────────────┘
                 │ uses
┌────────────────▼────────────────────────────────────┐
│         Core Services (queue, sync, api)           │
│              IndexedDB Storage                      │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Set Up Providers

Wrap your app with `OfflineProvider` and `SyncProvider`:

```tsx
// app/layout.tsx
import { OfflineProvider, SyncProvider } from '@/lib/offline';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OfflineProvider>
          <SyncProvider syncInterval={30000}>
            {children}
          </SyncProvider>
        </OfflineProvider>
      </body>
    </html>
  );
}
```

### 2. Use Hooks in Components

```tsx
// components/scouting-form.tsx
'use client';

import { useOfflineStatus, useOptimisticSubmission } from '@/lib/offline';

export function ScoutingForm() {
  const { isOffline } = useOfflineStatus();
  const { submit, isPending, isQueued } = useOptimisticSubmission();

  const handleSubmit = async (data: FormData) => {
    await submit({
      url: '/api/match-scouting',
      method: 'POST',
      data,
      onSuccess: () => {
        toast.success(isQueued ? 'Queued for later' : 'Submitted!');
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {isOffline && <Banner>Offline - submissions will be queued</Banner>}
      {/* form fields */}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

## Hooks Reference

### useOfflineStatus()

Monitors network connectivity status.

```tsx
const { isOnline, isOffline } = useOfflineStatus();

// Show offline banner
{isOffline && <OfflineBanner />}
```

**Returns:**
- `isOnline: boolean` - True when device has connectivity
- `isOffline: boolean` - Convenience property (!isOnline)

**Features:**
- Real-time updates via online/offline events
- SSR-safe (returns online by default)
- Automatic cleanup

---

### useSyncQueue()

Provides access to the submission queue state and sync operations.

```tsx
const { queue, syncNow, isSyncing, error } = useSyncQueue();

// Display pending count
<Badge>{queue.pendingCount} pending</Badge>

// Manual sync button
<Button onClick={syncNow} disabled={isSyncing}>
  Sync Now
</Button>
```

**Returns:**
- `queue: QueueState` - Current queue state
  - `submissions: QueuedSubmission[]` - All submissions
  - `pendingCount: number` - Count of pending
  - `failedCount: number` - Count of failed
  - `successCount: number` - Count of successful
  - `lastEvent?: SyncEvent` - Last sync event
- `syncNow: () => Promise<void>` - Trigger manual sync
- `isSyncing: boolean` - Whether sync is in progress
- `error: string | null` - Last sync error
- `refresh: () => Promise<void>` - Refresh queue data

**Features:**
- Subscribes to sync events
- Auto-refreshes on queue changes
- Tracks sync status

---

### useSubmission(id)

Fetches and manages a single queued submission.

```tsx
const { submission, retry, deleteSubmission, isLoading } = useSubmission(id);

if (!submission) return <NotFound />;

return (
  <div>
    <p>Status: {submission.status}</p>
    <p>Retries: {submission.retryCount}</p>
    <Button onClick={retry}>Retry</Button>
    <Button onClick={deleteSubmission}>Delete</Button>
  </div>
);
```

**Parameters:**
- `id?: string` - Submission ID to fetch

**Returns:**
- `submission: QueuedSubmission | null` - Submission data
- `retry: () => Promise<void>` - Retry the submission
- `deleteSubmission: () => Promise<void>` - Delete from queue
- `isLoading: boolean` - Loading state
- `error: string | null` - Error message
- `refresh: () => Promise<void>` - Refresh data

**Features:**
- Auto-refreshes when submission changes
- Provides retry and delete operations
- Loading and error states

---

### useSubmissions(filter?)

Fetches all submissions with optional filtering and sorting.

```tsx
const { submissions, totalCount, isLoading } = useSubmissions({
  status: 'pending',
  sortBy: 'timestamp',
  sortDirection: 'desc',
  limit: 10,
});

return (
  <List>
    {submissions.map(sub => (
      <SubmissionItem key={sub.id} submission={sub} />
    ))}
  </List>
);
```

**Parameters:**
- `filter?: SubmissionFilter`
  - `status?: 'pending' | 'syncing' | 'failed' | 'success' | array`
  - `urlPattern?: string | RegExp` - Filter by URL
  - `method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'`
  - `afterTimestamp?: number` - Only newer than
  - `beforeTimestamp?: number` - Only older than
  - `limit?: number` - Limit results
  - `sortBy?: 'timestamp' | 'retryCount' | 'status'`
  - `sortDirection?: 'asc' | 'desc'`

**Returns:**
- `submissions: QueuedSubmission[]` - Filtered submissions
- `totalCount: number` - Total count before filtering
- `isLoading: boolean` - Loading state
- `error: string | null` - Error message
- `refresh: () => Promise<void>` - Refresh data

**Features:**
- Auto-refreshes on queue changes
- Comprehensive filtering
- Sorting support
- Performance optimized

---

### useOptimisticSubmission()

Implements optimistic UI updates for form submissions.

```tsx
const { submit, optimisticData, serverData, isPending, isQueued } =
  useOptimisticSubmission();

const handleSubmit = async (data: FormData) => {
  await submit({
    url: '/api/match-scouting',
    method: 'POST',
    data,
    onSuccess: (response) => {
      if (response.queued) {
        toast.info('Queued for later sync');
      } else {
        toast.success('Submitted successfully!');
      }
    },
    onError: (error) => {
      toast.error('Submission failed');
    },
  });
};

// Show optimistic data immediately
{optimisticData && <Preview data={optimisticData} />}

// Show server data after success
{serverData && <SuccessMessage data={serverData} />}
```

**Returns:**
- `submit: (options) => Promise<ApiResponse>` - Submit with optimistic update
  - Options:
    - `url: string` - API endpoint
    - `method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'`
    - `data: T` - Data to submit
    - `headers?: Record<string, string>`
    - `onSuccess?: (response) => void`
    - `onError?: (error) => void`
    - `onQueued?: (queueId) => void`
    - `autoRollback?: boolean` - Default: true
- `optimisticData: T | null` - Data shown immediately
- `serverData: T | null` - Data from server response
- `rollback: () => void` - Manually rollback
- `isPending: boolean` - Submission in progress
- `isQueued: boolean` - Whether queued for later
- `queueId: string | null` - Queue ID if queued
- `error: Error | null` - Last error

**Features:**
- Immediate UI updates
- Automatic rollback on error
- Works with offline queue
- React 18 transitions

---

### useSyncContext()

Accesses sync state from SyncProvider.

```tsx
const { isSyncing, sync, lastSyncTime, pendingCount } = useSyncContext();

return (
  <div>
    <p>Last sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}</p>
    <p>Pending: {pendingCount}</p>
    <Button onClick={sync} disabled={isSyncing}>
      {isSyncing ? 'Syncing...' : 'Sync Now'}
    </Button>
  </div>
);
```

**Returns:**
- `isSyncing: boolean` - Sync in progress
- `sync: () => Promise<void>` - Trigger sync
- `lastSyncTime: number | null` - Last successful sync
- `lastSyncError: string | null` - Last error
- `pendingCount: number` - Pending submissions
- `autoSyncEnabled: boolean` - Auto-sync status
- `setAutoSyncEnabled: (enabled) => void` - Toggle auto-sync

**Features:**
- Manages periodic sync
- Sync on online events
- Auto-sync toggle

---

## Providers

### OfflineProvider

Provides offline services to component tree.

```tsx
<OfflineProvider
  onInitialized={() => console.log('Offline ready')}
  onError={(err) => console.error('Offline error:', err)}
  errorBoundary={CustomErrorBoundary}
>
  {children}
</OfflineProvider>
```

**Props:**
- `children: ReactNode` - Child components
- `errorBoundary?: Component` - Custom error boundary
- `onInitialized?: () => void` - Init callback
- `onError?: (error) => void` - Error callback

**Features:**
- Initializes IndexedDB
- Sets up sync manager
- Error boundary support
- Cleanup on unmount

---

### SyncProvider

Manages sync state and periodic sync.

```tsx
<SyncProvider
  syncInterval={30000}
  initialAutoSync={true}
  syncOnOnline={true}
  onSyncComplete={(count) => console.log(`${count} pending`)}
  onSyncError={(err) => console.error('Sync error:', err)}
>
  {children}
</SyncProvider>
```

**Props:**
- `children: ReactNode` - Child components
- `syncInterval?: number` - Sync interval (default: 30000ms)
- `initialAutoSync?: boolean` - Enable auto-sync (default: true)
- `syncOnOnline?: boolean` - Sync when coming online (default: true)
- `onSyncComplete?: (count) => void` - Sync success callback
- `onSyncError?: (error) => void` - Sync error callback

**Features:**
- Periodic background sync
- Sync on online events
- Auto-sync toggle
- Event callbacks

---

## Common Patterns

### Pattern 1: Offline Banner

```tsx
function OfflineBanner() {
  const { isOffline } = useOfflineStatus();
  const { queue } = useSyncQueue();

  if (!isOffline) return null;

  return (
    <Banner variant="warning">
      You're offline. {queue.pendingCount} submissions queued.
    </Banner>
  );
}
```

### Pattern 2: Sync Status Widget

```tsx
function SyncStatus() {
  const { isSyncing, sync, lastSyncTime, pendingCount } = useSyncContext();
  const { isOnline } = useOfflineStatus();

  return (
    <div>
      <StatusDot online={isOnline} />
      <span>{pendingCount} pending</span>
      <Button onClick={sync} disabled={isSyncing || !isOnline}>
        {isSyncing ? <Spinner /> : <RefreshIcon />}
      </Button>
      {lastSyncTime && (
        <span>Last: {formatRelativeTime(lastSyncTime)}</span>
      )}
    </div>
  );
}
```

### Pattern 3: Submission Queue List

```tsx
function QueueList() {
  const { submissions, isLoading } = useSubmissions({
    status: ['pending', 'failed'],
    sortBy: 'timestamp',
    sortDirection: 'desc',
  });

  if (isLoading) return <Spinner />;

  return (
    <List>
      {submissions.map(sub => (
        <QueueItem key={sub.id} submission={sub} />
      ))}
    </List>
  );
}

function QueueItem({ submission }: { submission: QueuedSubmission }) {
  const { retry, deleteSubmission } = useSubmission(submission.id);

  return (
    <ListItem>
      <div>
        <p>{submission.url}</p>
        <Badge status={submission.status}>{submission.status}</Badge>
        {submission.error && <ErrorText>{submission.error}</ErrorText>}
      </div>
      <div>
        <Button onClick={retry} size="sm">Retry</Button>
        <Button onClick={deleteSubmission} size="sm" variant="destructive">
          Delete
        </Button>
      </div>
    </ListItem>
  );
}
```

### Pattern 4: Form with Optimistic Updates

```tsx
function ScoutingForm() {
  const { submit, isPending, isQueued, optimisticData } =
    useOptimisticSubmission<MatchScoutingData>();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);

    await submit({
      url: '/api/match-scouting',
      method: 'POST',
      data,
      onSuccess: (response) => {
        if (response.queued) {
          toast.info('Saved locally - will sync when online');
        } else {
          toast.success('Submitted to server!');
          router.push('/matches');
        }
      },
      onError: () => {
        toast.error('Failed to submit');
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Show optimistic preview */}
      {optimisticData && (
        <PreviewCard data={optimisticData} status={isQueued ? 'queued' : 'submitting'} />
      )}

      {/* Form fields */}
      <input name="team" required />
      <input name="score" type="number" required />

      <button type="submit" disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

---

## TypeScript Support

All hooks are fully typed with TypeScript:

```tsx
import type {
  OfflineStatus,
  QueueState,
  QueuedSubmission,
  SubmissionFilter,
  OptimisticSubmissionOptions,
} from '@/lib/offline';

// Type-safe hook usage
const { submissions } = useSubmissions({
  status: 'pending', // Type: 'pending' | 'syncing' | 'failed' | 'success'
  limit: 10,
});

// Type-safe optimistic submission
const { submit } = useOptimisticSubmission<MyFormData>();
await submit({
  url: '/api/endpoint',
  method: 'POST',
  data: myData, // Type: MyFormData
});
```

---

## Performance Considerations

1. **Memoization**: All callbacks use `useCallback` for stable references
2. **Filtering**: Client-side filtering is memoized with `useMemo`
3. **Event Subscriptions**: Automatic cleanup prevents memory leaks
4. **Debouncing**: Consider debouncing rapid refreshes
5. **Pagination**: Use `limit` filter for large queues

---

## Testing

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useOfflineStatus, useSyncQueue } from '@/lib/offline';

test('offline status updates', () => {
  const { result } = renderHook(() => useOfflineStatus());

  expect(result.current.isOnline).toBe(true);

  // Simulate going offline
  window.dispatchEvent(new Event('offline'));

  expect(result.current.isOffline).toBe(true);
});

test('sync queue refreshes', async () => {
  const { result } = renderHook(() => useSyncQueue());

  await waitFor(() => {
    expect(result.current.queue.submissions).toBeDefined();
  });
});
```

---

## Migration Guide

### From Direct Service Usage

**Before:**
```tsx
import { syncManager, getPendingSubmissions } from '@/lib/offline';

function MyComponent() {
  const [pending, setPending] = useState([]);

  useEffect(() => {
    getPendingSubmissions().then(setPending);
    const unsubscribe = syncManager.on(() => {
      getPendingSubmissions().then(setPending);
    });
    return unsubscribe;
  }, []);
}
```

**After:**
```tsx
import { useSubmissions } from '@/lib/offline';

function MyComponent() {
  const { submissions } = useSubmissions({ status: 'pending' });
  // Automatically refreshes!
}
```

---

## Troubleshooting

### Hook Not Working

**Error:** `useOfflineService must be used within OfflineProvider`

**Solution:** Wrap your app with `<OfflineProvider>`:

```tsx
// app/layout.tsx
<OfflineProvider>
  <YourApp />
</OfflineProvider>
```

### Sync Not Triggering

**Issue:** Auto-sync not working

**Check:**
1. Is `SyncProvider` wrapping your app?
2. Is `autoSyncEnabled` set to true?
3. Is the device online?

### Stale Data

**Issue:** Hook not refreshing

**Solution:** Manually refresh:
```tsx
const { refresh } = useSubmissions();
useEffect(() => {
  refresh();
}, [someDependency]);
```

---

## Next Steps

- See individual hook files for JSDoc documentation
- Check `/examples` for complete component examples
- Review `queue.ts` and `sync.ts` for service layer details
- Test with mock data before production use

---

Last Updated: 2025-10-23
