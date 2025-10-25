# Offline Hooks - Quick Reference Card

## Setup (Once)

```tsx
// app/layout.tsx
import { OfflineProvider, SyncProvider } from '@/lib/offline';

<OfflineProvider>
  <SyncProvider>
    {children}
  </SyncProvider>
</OfflineProvider>
```

## Hooks Cheat Sheet

### 1. Check if Offline

```tsx
import { useOfflineStatus } from '@/lib/offline';

const { isOffline } = useOfflineStatus();

{isOffline && <Banner>You're offline</Banner>}
```

### 2. Submit Form with Offline Support

```tsx
import { useOptimisticSubmission } from '@/lib/offline';

const { submit, isPending } = useOptimisticSubmission();

await submit({
  url: '/api/endpoint',
  method: 'POST',
  data: formData,
  onSuccess: () => toast.success('Saved!'),
});
```

### 3. Show Queue Status

```tsx
import { useSyncQueue } from '@/lib/offline';

const { queue, syncNow, isSyncing } = useSyncQueue();

<Badge>{queue.pendingCount} pending</Badge>
<Button onClick={syncNow} disabled={isSyncing}>Sync</Button>
```

### 4. List Pending Submissions

```tsx
import { useSubmissions } from '@/lib/offline';

const { submissions } = useSubmissions({ status: 'pending' });

<List>
  {submissions.map(sub => <Item key={sub.id} {...sub} />)}
</List>
```

### 5. Manage Single Submission

```tsx
import { useSubmission } from '@/lib/offline';

const { submission, retry, deleteSubmission } = useSubmission(id);

<Button onClick={retry}>Retry</Button>
<Button onClick={deleteSubmission}>Delete</Button>
```

### 6. Sync Controls

```tsx
import { useSyncContext } from '@/lib/offline';

const { sync, isSyncing, pendingCount } = useSyncContext();

<Button onClick={sync}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Button>
```

## Common Patterns

### Offline Banner

```tsx
const { isOffline } = useOfflineStatus();
const { queue } = useSyncQueue();

{isOffline && (
  <Alert>Offline - {queue.pendingCount} queued</Alert>
)}
```

### Form Submission

```tsx
const { submit, isPending } = useOptimisticSubmission();

<form onSubmit={async (e) => {
  e.preventDefault();
  await submit({
    url: '/api/data',
    method: 'POST',
    data: formData,
  });
}}>
  <button disabled={isPending}>Submit</button>
</form>
```

### Queue List

```tsx
const { submissions } = useSubmissions({
  status: 'pending',
  sortBy: 'timestamp',
});

{submissions.map(sub => (
  <QueueItem key={sub.id} submission={sub} />
))}
```

### Sync Widget

```tsx
const { isOnline } = useOfflineStatus();
const { sync, isSyncing, pendingCount } = useSyncContext();

<div>
  <StatusDot online={isOnline} />
  <span>{pendingCount}</span>
  <Button onClick={sync} disabled={isSyncing}>
    <RefreshIcon />
  </Button>
</div>
```

## Type Imports

```tsx
import type {
  OfflineStatus,
  QueueState,
  QueuedSubmission,
  SubmissionFilter,
  OptimisticSubmissionOptions,
} from '@/lib/offline';
```

## Filter Options

```tsx
useSubmissions({
  status: 'pending' | 'syncing' | 'failed' | 'success',
  urlPattern: /regex/,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  afterTimestamp: Date.now() - 3600000, // 1 hour ago
  limit: 10,
  sortBy: 'timestamp' | 'retryCount' | 'status',
  sortDirection: 'asc' | 'desc',
})
```

## Troubleshooting

**Error: Hook must be used within Provider**
```tsx
// Wrap app with providers in layout.tsx
<OfflineProvider><SyncProvider>...</SyncProvider></OfflineProvider>
```

**Data not refreshing**
```tsx
const { refresh } = useSubmissions();
refresh(); // Manual refresh
```

## File Paths

```
Hooks:      @/lib/offline/hooks/*
Providers:  @/lib/offline/providers/*
Main:       @/lib/offline
```

## See Also

- `README.md` - Complete documentation
- `EXAMPLES.md` - Real-world examples
- Individual hook files for JSDoc comments
