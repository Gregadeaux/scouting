# Integration Guide - Adding Offline Hooks to Your App

Step-by-step guide to integrate the offline hooks layer into your Next.js 15 app.

## Step 1: Add Providers to Root Layout

**File:** `/Users/gregbilletdeaux/Developer/930/scouting/src/app/layout.tsx`

```tsx
import { OfflineProvider, SyncProvider } from '@/lib/offline';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <OfflineProvider
          onInitialized={() => {
            console.log('Offline services ready');
          }}
          onError={(error) => {
            console.error('Offline init error:', error);
          }}
        >
          <SyncProvider
            syncInterval={30000}
            syncOnOnline={true}
            onSyncComplete={(count) => {
              if (count === 0) {
                console.log('All synced!');
              }
            }}
          >
            {children}
          </SyncProvider>
        </OfflineProvider>
      </body>
    </html>
  );
}
```

## Step 2: Add Offline Status Banner

**File:** `/Users/gregbilletdeaux/Developer/930/scouting/src/components/offline-banner.tsx`

```tsx
'use client';

import { useOfflineStatus, useSyncQueue } from '@/lib/offline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const { isOffline } = useOfflineStatus();
  const { queue } = useSyncQueue();

  if (!isOffline && queue.pendingCount === 0) {
    return null;
  }

  return (
    <Alert variant={isOffline ? 'destructive' : 'warning'}>
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        {isOffline ? (
          <>You're offline. Submissions will be queued.</>
        ) : (
          <>{queue.pendingCount} submissions waiting to sync.</>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

Add to your main layout:

```tsx
// In layout or page component
import { OfflineBanner } from '@/components/offline-banner';

<div className="container">
  <OfflineBanner />
  {children}
</div>
```

## Step 3: Update Forms to Use Optimistic Submission

**Before:**

```tsx
// Old form without offline support
async function handleSubmit(data: FormData) {
  try {
    const response = await fetch('/api/match-scouting', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed');

    toast.success('Submitted!');
    router.push('/matches');
  } catch (error) {
    toast.error('Failed to submit');
  }
}
```

**After:**

```tsx
'use client';

import { useOptimisticSubmission } from '@/lib/offline';

function MatchScoutingForm() {
  const router = useRouter();
  const { submit, isPending, isQueued } = useOptimisticSubmission();

  async function handleSubmit(data: FormData) {
    await submit({
      url: '/api/match-scouting',
      method: 'POST',
      data,
      onSuccess: (response) => {
        if (response.queued) {
          toast.info('Saved offline - will sync later');
        } else {
          toast.success('Submitted!');
          router.push('/matches');
        }
      },
      onError: (error) => {
        toast.error('Failed to submit');
      },
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

## Step 4: Add Sync Status Widget to Header

**File:** `/Users/gregbilletdeaux/Developer/930/scouting/src/components/sync-widget.tsx`

```tsx
'use client';

import { useOfflineStatus, useSyncContext } from '@/lib/offline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function SyncWidget() {
  const { isOnline } = useOfflineStatus();
  const { sync, isSyncing, pendingCount } = useSyncContext();

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-600" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-600" />
      )}

      {pendingCount > 0 && (
        <Badge variant="secondary">{pendingCount}</Badge>
      )}

      <Button
        onClick={sync}
        disabled={isSyncing || !isOnline}
        size="sm"
        variant="ghost"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
```

Add to header:

```tsx
// In your header component
import { SyncWidget } from '@/components/sync-widget';

<header>
  <nav>
    {/* other nav items */}
    <SyncWidget />
  </nav>
</header>
```

## Step 5: Create Queue Management Page

**File:** `/Users/gregbilletdeaux/Developer/930/scouting/src/app/queue/page.tsx`

```tsx
'use client';

import { useSubmissions, useSubmission } from '@/lib/offline';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function QueuePage() {
  const { submissions, isLoading, refresh } = useSubmissions({
    sortBy: 'timestamp',
    sortDirection: 'desc',
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Submission Queue</h1>
        <Button onClick={refresh} variant="outline">Refresh</Button>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            No submissions in queue
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map(sub => (
            <QueueItem key={sub.id} id={sub.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueItem({ id }: { id: string }) {
  const { submission, retry, deleteSubmission } = useSubmission(id);

  if (!submission) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">
            {submission.method} {submission.url}
          </CardTitle>
          <Badge>{submission.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {submission.error && (
          <p className="text-sm text-red-600 mb-2">{submission.error}</p>
        )}
        <div className="flex gap-2">
          {(submission.status === 'pending' || submission.status === 'failed') && (
            <Button onClick={retry} size="sm">Retry</Button>
          )}
          <Button onClick={deleteSubmission} size="sm" variant="destructive">
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Step 6: Add Navigation Link

```tsx
// In your navigation
<nav>
  <Link href="/queue">
    Queue
    {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
  </Link>
</nav>
```

## Step 7: Test Offline Functionality

### Chrome DevTools Method

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Test form submission
5. Check IndexedDB in Application tab
6. Go back online
7. Watch submissions sync

### Manual Testing Checklist

- [ ] Form submits when online
- [ ] Form queues when offline
- [ ] Offline banner appears when offline
- [ ] Queue count updates in header
- [ ] Queue page shows submissions
- [ ] Retry button works
- [ ] Delete button works
- [ ] Auto-sync triggers when online
- [ ] Manual sync button works
- [ ] Success/error toasts show

## Step 8: Add Analytics (Optional)

```tsx
// Track offline submissions
import { useSyncQueue } from '@/lib/offline';
import { useEffect } from 'react';

function AnalyticsTracker() {
  const { queue } = useSyncQueue();

  useEffect(() => {
    if (queue.lastEvent?.type === 'submission-success') {
      // Track successful sync
      analytics.track('submission_synced', {
        submissionId: queue.lastEvent.submissionId,
      });
    }
  }, [queue.lastEvent]);

  return null;
}
```

## Step 9: Production Considerations

### Service Worker Registration

Consider adding a service worker for better offline support:

```tsx
// In app/layout.tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('SW registered:', registration);
      },
      (error) => {
        console.log('SW registration failed:', error);
      }
    );
  }
}, []);
```

### Error Monitoring

Add error tracking for offline issues:

```tsx
// In OfflineProvider
<OfflineProvider
  onError={(error) => {
    // Send to error tracking service
    Sentry.captureException(error, {
      tags: { component: 'offline' },
    });
  }}
>
```

### Performance Monitoring

Track sync performance:

```tsx
// In SyncProvider
<SyncProvider
  onSyncComplete={(count) => {
    analytics.track('sync_complete', {
      pending: count,
      duration: Date.now() - syncStartTime,
    });
  }}
>
```

## Common Issues and Solutions

### Issue: Hook error "must be used within Provider"

**Solution:** Ensure providers are in layout.tsx:

```tsx
// app/layout.tsx must have:
<OfflineProvider>
  <SyncProvider>
    {children}
  </SyncProvider>
</OfflineProvider>
```

### Issue: Submissions not syncing

**Solution:** Check network status and sync settings:

```tsx
const { autoSyncEnabled, setAutoSyncEnabled } = useSyncContext();

// Enable auto-sync
setAutoSyncEnabled(true);
```

### Issue: IndexedDB quota exceeded

**Solution:** Add cleanup routine:

```tsx
import { cleanupOldSubmissions } from '@/lib/offline';

// Run periodically
useEffect(() => {
  const interval = setInterval(cleanupOldSubmissions, 3600000); // 1 hour
  return () => clearInterval(interval);
}, []);
```

## Verification Checklist

After integration, verify:

- [ ] Providers added to layout.tsx
- [ ] Offline banner component created
- [ ] Forms updated to use useOptimisticSubmission
- [ ] Sync widget added to header
- [ ] Queue page created
- [ ] Navigation link added
- [ ] Tested offline scenarios
- [ ] Tested sync behavior
- [ ] Error handling works
- [ ] Analytics tracking added (optional)

## Next Steps

1. Customize UI components to match your design system
2. Add more sophisticated error handling
3. Implement conflict resolution if needed
4. Add queue visualization dashboard
5. Monitor offline usage patterns

## Support

See these files for more help:
- `README.md` - Complete API reference
- `EXAMPLES.md` - More usage examples
- `QUICK_REFERENCE.md` - Quick lookup
- Individual hook files - JSDoc comments

---

Last Updated: 2025-10-23
