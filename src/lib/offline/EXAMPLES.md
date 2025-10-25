# Offline Hooks - Usage Examples

Complete examples demonstrating how to use offline hooks in real-world scenarios.

## Table of Contents

1. [App Setup](#app-setup)
2. [Offline Status Banner](#offline-status-banner)
3. [Match Scouting Form](#match-scouting-form)
4. [Queue Management Page](#queue-management-page)
5. [Sync Status Widget](#sync-status-widget)
6. [Advanced Patterns](#advanced-patterns)

---

## App Setup

### Root Layout with Providers

```tsx
// app/layout.tsx
import { OfflineProvider, SyncProvider } from '@/lib/offline';
import { Toaster } from '@/components/ui/toaster';

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
            console.log('Offline services initialized');
          }}
          onError={(error) => {
            console.error('Offline initialization failed:', error);
          }}
        >
          <SyncProvider
            syncInterval={30000} // Sync every 30 seconds
            syncOnOnline={true} // Sync when coming back online
            onSyncComplete={(pendingCount) => {
              if (pendingCount === 0) {
                console.log('All submissions synced!');
              }
            }}
          >
            {children}
            <Toaster />
          </SyncProvider>
        </OfflineProvider>
      </body>
    </html>
  );
}
```

---

## Offline Status Banner

### Simple Banner Component

```tsx
// components/offline-banner.tsx
'use client';

import { useOfflineStatus, useSyncQueue } from '@/lib/offline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, CloudOff } from 'lucide-react';

export function OfflineBanner() {
  const { isOffline } = useOfflineStatus();
  const { queue } = useSyncQueue();

  if (!isOffline) {
    return null;
  }

  return (
    <Alert variant="warning" className="mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        You're offline. {queue.pendingCount > 0 && (
          <span>{queue.pendingCount} submissions queued for sync.</span>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

### Banner with Sync Button

```tsx
// components/offline-banner-with-sync.tsx
'use client';

import { useOfflineStatus, useSyncContext } from '@/lib/offline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflineBannerWithSync() {
  const { isOffline } = useOfflineStatus();
  const { pendingCount, sync, isSyncing } = useSyncContext();

  // Don't show if online and no pending
  if (!isOffline && pendingCount === 0) {
    return null;
  }

  return (
    <Alert variant={isOffline ? 'warning' : 'info'} className="mb-4">
      {isOffline ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      <AlertDescription className="flex items-center justify-between">
        <span>
          {isOffline ? 'Offline' : 'Online'} - {pendingCount} pending
        </span>
        {!isOffline && pendingCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={sync}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

---

## Match Scouting Form

### Basic Form with Optimistic Updates

```tsx
// components/scouting/match-scouting-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOptimisticSubmission, useOfflineStatus } from '@/lib/offline';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MatchScoutingData } from '@/types';

export function MatchScoutingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { isOffline } = useOfflineStatus();
  const { submit, isPending, isQueued, optimisticData } =
    useOptimisticSubmission<MatchScoutingData>();

  const [formData, setFormData] = useState({
    teamNumber: '',
    matchNumber: '',
    autoScore: 0,
    teleopScore: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: MatchScoutingData = {
      team_number: parseInt(formData.teamNumber),
      match_number: parseInt(formData.matchNumber),
      auto_performance: {
        schema_version: '2025.1',
        score: formData.autoScore,
      },
      teleop_performance: {
        schema_version: '2025.1',
        score: formData.teleopScore,
      },
      endgame_performance: {
        schema_version: '2025.1',
        climbed: false,
      },
    };

    await submit({
      url: '/api/match-scouting',
      method: 'POST',
      data,
      onSuccess: (response) => {
        if (response.queued) {
          toast({
            title: 'Saved Locally',
            description: 'Will sync when connection is restored',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Submitted!',
            description: 'Match data saved to server',
            variant: 'success',
          });
          router.push('/matches');
        }
      },
      onError: (error) => {
        toast({
          title: 'Submission Failed',
          description: error.message,
          variant: 'destructive',
        });
      },
      onQueued: (queueId) => {
        console.log('Queued with ID:', queueId);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Offline indicator */}
      {isOffline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="text-sm text-yellow-800">
            Offline mode - submissions will be queued
          </p>
        </div>
      )}

      {/* Optimistic preview */}
      {optimisticData && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-800">
            {isQueued ? 'Queued for sync...' : 'Submitting...'}
          </p>
        </div>
      )}

      {/* Form fields */}
      <div>
        <Label htmlFor="teamNumber">Team Number</Label>
        <Input
          id="teamNumber"
          type="number"
          required
          value={formData.teamNumber}
          onChange={(e) =>
            setFormData({ ...formData, teamNumber: e.target.value })
          }
        />
      </div>

      <div>
        <Label htmlFor="matchNumber">Match Number</Label>
        <Input
          id="matchNumber"
          type="number"
          required
          value={formData.matchNumber}
          onChange={(e) =>
            setFormData({ ...formData, matchNumber: e.target.value })
          }
        />
      </div>

      <div>
        <Label htmlFor="autoScore">Auto Score</Label>
        <Input
          id="autoScore"
          type="number"
          value={formData.autoScore}
          onChange={(e) =>
            setFormData({ ...formData, autoScore: parseInt(e.target.value) })
          }
        />
      </div>

      <div>
        <Label htmlFor="teleopScore">Teleop Score</Label>
        <Input
          id="teleopScore"
          type="number"
          value={formData.teleopScore}
          onChange={(e) =>
            setFormData({ ...formData, teleopScore: parseInt(e.target.value) })
          }
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Submitting...' : 'Submit Match Data'}
      </Button>
    </form>
  );
}
```

---

## Queue Management Page

### Queue List Component

```tsx
// app/queue/page.tsx
'use client';

import { useSubmissions, useSubmission } from '@/lib/offline';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function QueuePage() {
  const { submissions, isLoading, error, refresh } = useSubmissions({
    sortBy: 'timestamp',
    sortDirection: 'desc',
  });

  if (isLoading) {
    return <div>Loading queue...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Submission Queue</h1>
        <Button onClick={refresh} variant="outline">
          Refresh
        </Button>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No submissions in queue
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <QueueItem key={submission.id} submissionId={submission.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueItem({ submissionId }: { submissionId: string }) {
  const { submission, retry, deleteSubmission } = useSubmission(submissionId);

  if (!submission) {
    return null;
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800',
      label: 'Pending',
    },
    syncing: {
      icon: AlertCircle,
      color: 'bg-blue-100 text-blue-800',
      label: 'Syncing',
    },
    failed: {
      icon: XCircle,
      color: 'bg-red-100 text-red-800',
      label: 'Failed',
    },
    success: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      label: 'Success',
    },
  };

  const config = statusConfig[submission.status];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <span className="font-mono text-sm">{submission.method}</span>
              <span className="text-sm font-normal">{submission.url}</span>
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>
                {formatDistanceToNow(submission.timestamp, { addSuffix: true })}
              </span>
              {submission.retryCount > 0 && (
                <span>Retries: {submission.retryCount}</span>
              )}
            </div>
          </div>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        {submission.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">{submission.error}</p>
          </div>
        )}

        <div className="flex gap-2">
          {(submission.status === 'pending' || submission.status === 'failed') && (
            <Button onClick={retry} size="sm" variant="outline">
              Retry Now
            </Button>
          )}
          <Button
            onClick={deleteSubmission}
            size="sm"
            variant="destructive"
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Filter Controls

```tsx
// components/queue/queue-filters.tsx
'use client';

import { useState } from 'react';
import { useSubmissions, type SubmissionFilter } from '@/lib/offline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function QueueFilters() {
  const [filter, setFilter] = useState<SubmissionFilter>({
    sortBy: 'timestamp',
    sortDirection: 'desc',
  });

  const { submissions, totalCount } = useSubmissions(filter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status filter */}
        <div>
          <Label>Status</Label>
          <Select
            value={filter.status as string}
            onValueChange={(value) =>
              setFilter({ ...filter, status: value as any })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="syncing">Syncing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="success">Success</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Method filter */}
        <div>
          <Label>Method</Label>
          <Select
            value={filter.method}
            onValueChange={(value) =>
              setFilter({ ...filter, method: value as any })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Limit */}
        <div>
          <Label>Limit</Label>
          <Input
            type="number"
            min={1}
            value={filter.limit || ''}
            onChange={(e) =>
              setFilter({ ...filter, limit: parseInt(e.target.value) || undefined })
            }
            placeholder="No limit"
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {submissions.length} of {totalCount} submissions
      </div>
    </div>
  );
}
```

---

## Sync Status Widget

### Header Sync Widget

```tsx
// components/layout/sync-widget.tsx
'use client';

import { useOfflineStatus, useSyncContext } from '@/lib/offline';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function SyncWidget() {
  const { isOnline, isOffline } = useOfflineStatus();
  const {
    isSyncing,
    sync,
    lastSyncTime,
    lastSyncError,
    pendingCount,
    autoSyncEnabled,
    setAutoSyncEnabled,
  } = useSyncContext();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80">
        <div className="space-y-4">
          {/* Status */}
          <div>
            <h4 className="font-semibold mb-2">Connection Status</h4>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Online</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Offline</span>
                </>
              )}
            </div>
          </div>

          {/* Pending count */}
          <div>
            <h4 className="font-semibold mb-2">Pending Submissions</h4>
            <p className="text-2xl font-bold">{pendingCount}</p>
          </div>

          {/* Last sync */}
          <div>
            <h4 className="font-semibold mb-2">Last Sync</h4>
            <p className="text-sm text-muted-foreground">
              {lastSyncTime
                ? formatDistanceToNow(lastSyncTime, { addSuffix: true })
                : 'Never'}
            </p>
          </div>

          {/* Error */}
          {lastSyncError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">{lastSyncError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={sync}
              disabled={isSyncing || isOffline}
              className="w-full"
              size="sm"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>

            <Button
              onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
              variant="outline"
              className="w-full"
              size="sm"
            >
              Auto-sync: {autoSyncEnabled ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## Advanced Patterns

### Custom Hook: Filtered Pending Count

```tsx
// hooks/use-pending-match-count.ts
import { useSubmissions } from '@/lib/offline';

export function usePendingMatchCount() {
  const { submissions } = useSubmissions({
    status: 'pending',
    urlPattern: /\/api\/match-scouting/,
  });

  return submissions.length;
}

// Usage
function MatchScoutingPage() {
  const pendingCount = usePendingMatchCount();

  return (
    <div>
      <h1>Match Scouting</h1>
      {pendingCount > 0 && (
        <Badge>{pendingCount} pending uploads</Badge>
      )}
    </div>
  );
}
```

### Auto-save Draft with Optimistic Updates

```tsx
// components/auto-save-form.tsx
'use client';

import { useEffect, useCallback } from 'react';
import { useOptimisticSubmission } from '@/lib/offline';
import { useDebounce } from '@/hooks/use-debounce';

export function AutoSaveForm() {
  const [formData, setFormData] = useState({});
  const debouncedData = useDebounce(formData, 1000);
  const { submit, isQueued } = useOptimisticSubmission();

  const autoSave = useCallback(async () => {
    if (!debouncedData) return;

    await submit({
      url: '/api/drafts',
      method: 'POST',
      data: debouncedData,
      onSuccess: () => {
        console.log('Draft saved');
      },
    });
  }, [debouncedData, submit]);

  useEffect(() => {
    autoSave();
  }, [autoSave]);

  return (
    <form>
      {/* form fields */}
      {isQueued && (
        <div className="text-sm text-muted-foreground">
          Saved locally - will sync later
        </div>
      )}
    </form>
  );
}
```

### Retry All Failed Submissions

```tsx
// components/retry-all-button.tsx
'use client';

import { useSubmissions } from '@/lib/offline';
import { syncManager } from '@/lib/offline';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function RetryAllButton() {
  const { submissions } = useSubmissions({ status: 'failed' });
  const [isRetrying, setIsRetrying] = useState(false);

  const retryAll = async () => {
    setIsRetrying(true);
    try {
      for (const submission of submissions) {
        await syncManager.retrySubmission(submission.id);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  if (submissions.length === 0) {
    return null;
  }

  return (
    <Button
      onClick={retryAll}
      disabled={isRetrying}
      variant="outline"
    >
      {isRetrying ? 'Retrying...' : `Retry All (${submissions.length})`}
    </Button>
  );
}
```

---

## Next Steps

- Customize components to match your design system
- Add analytics tracking for offline submissions
- Implement conflict resolution for concurrent edits
- Build queue visualization dashboard

---

Last Updated: 2025-10-23
