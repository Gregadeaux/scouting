# Offline Components

Thin, reusable presentation components for offline mode functionality. These components follow the **container/presentation pattern** to separate business logic from UI.

## Architecture

### Presentation Components (Pure/Dumb)
Components that only render UI based on props. No hooks, no side effects, no business logic.

- `SyncStatusBadge` - Online/offline indicator with sync button
- `QueueStatusCard` - Queue statistics display
- `SubmissionCard` - Single submission display
- `SubmissionList` - List of submissions
- `OfflineBanner` - Notification banner

### Container Components (Smart)
Components that use hooks and manage state, then pass data to presentation components.

- `SyncStatusIndicator` - Connected version of SyncStatusBadge

## Components

### SyncStatusBadge

Pure presentation component showing sync status.

**Props:**
```typescript
interface SyncStatusBadgeProps {
  status: SyncStatus;        // { isSyncing, lastSyncTime?, error? }
  pendingCount: number;      // Number of pending submissions
  isOnline: boolean;         // Device connectivity status
  onSyncClick?: () => void;  // Callback for sync button
  className?: string;
}
```

**Usage:**
```tsx
<SyncStatusBadge
  status={{ isSyncing: false, lastSyncTime: Date.now() }}
  pendingCount={5}
  isOnline={true}
  onSyncClick={() => console.log('Sync clicked')}
/>
```

**Features:**
- Shows WiFi/WifiOff icon based on online status
- Displays pending count badge
- Sync button (only when online and has pending items)
- Loading state during sync
- Error message display
- Full ARIA labels and keyboard navigation

---

### QueueStatusCard

Pure presentation component displaying queue statistics.

**Props:**
```typescript
interface QueueStatusCardProps {
  queue: QueueState;  // { total, pending, syncing, success, failed, lastSyncTime? }
  isSyncing: boolean;
  isOnline: boolean;
  onSync: () => void;
  className?: string;
}
```

**Usage:**
```tsx
<QueueStatusCard
  queue={{
    total: 10,
    pending: 5,
    syncing: 1,
    success: 3,
    failed: 1,
    lastSyncTime: Date.now()
  }}
  isSyncing={false}
  isOnline={true}
  onSync={handleSync}
/>
```

**Features:**
- Grid display of statistics (pending, success, syncing, failed)
- Color-coded status indicators
- Last sync time display with relative formatting
- Sync Now button
- Responsive 2-column grid

---

### SubmissionCard

Pure presentation component for a single queued submission.

**Props:**
```typescript
interface SubmissionCardProps {
  submission: QueuedSubmission;
  isOnline?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
  className?: string;
}
```

**Usage:**
```tsx
<SubmissionCard
  submission={{
    id: '123',
    url: '/api/match-scouting',
    method: 'POST',
    status: 'pending',
    timestamp: Date.now(),
    retryCount: 0
  }}
  isOnline={true}
  onRetry={handleRetry}
  onDelete={handleDelete}
/>
```

**Features:**
- Status icon with color coding
- HTTP method badge
- URL path display
- Timestamp with retry count
- Error message display for failed submissions
- Retry button (for failed submissions when online)
- Delete button (for failed/success submissions)

---

### SubmissionList

Pure presentation component rendering a list of submissions.

**Props:**
```typescript
interface SubmissionListProps {
  submissions: QueuedSubmission[];
  isOnline?: boolean;
  onRetry?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}
```

**Usage:**
```tsx
<SubmissionList
  submissions={submissions}
  isOnline={true}
  onRetry={(id) => retrySubmission(id)}
  onDelete={(id) => deleteSubmission(id)}
/>
```

**Features:**
- Empty state with friendly message
- Auto-sorting (failed → pending → syncing → success)
- Within status, sorts by timestamp (newest first)
- Maps to SubmissionCard components
- Proper ARIA labels

---

### OfflineBanner

Pure presentation component for offline notification banner.

**Props:**
```typescript
interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  className?: string;
}
```

**Usage:**
```tsx
<OfflineBanner
  isOnline={false}
  pendingCount={3}
/>
```

**Features:**
- Fixed position at top of screen
- Auto-dismissible
- Shows when offline
- Shows "Back online!" message for 3 seconds when reconnecting
- Displays pending count badge
- Orange background when offline, green when reconnecting
- Slide-down animation

---

### SyncStatusIndicator

Container component (smart) using hooks to connect to sync state.

**Props:**
```typescript
interface SyncStatusIndicatorProps {
  className?: string;
  showToast?: boolean;  // Show toast notifications (default: true)
}
```

**Usage:**
```tsx
// Simple usage - fully connected
<SyncStatusIndicator />

// With custom styling
<SyncStatusIndicator className="my-4" showToast={false} />
```

**Features:**
- Uses `useOfflineStatus()`, `useSyncQueue()` hooks
- Auto-updates on sync events
- Handles sync click
- Optional toast notifications
- Renders SyncStatusBadge with live data

---

## Hooks

These hooks are used by container components and the page.

### useOfflineStatus()

Tracks browser online/offline status.

```tsx
const isOnline = useOfflineStatus();
// true | false
```

### useSyncQueue()

Manages sync queue state.

```tsx
const { status, pendingCount, sync } = useSyncQueue();

// status: { isSyncing: boolean, lastSyncTime?: number, error?: string }
// pendingCount: number
// sync: () => Promise<void>
```

### useSubmissions()

CRUD operations for queued submissions.

```tsx
const { submissions, loading, error, retry, remove, reload } = useSubmissions();

// submissions: QueuedSubmission[]
// loading: boolean
// error: string | undefined
// retry: (id: string) => Promise<void>
// remove: (id: string) => Promise<void>
// reload: () => Promise<void>
```

---

## Styling

All components use Tailwind CSS with:
- Dark mode support (`dark:` variants)
- Responsive design (mobile-first)
- Accessible color contrasts (WCAG AA)
- Consistent spacing and typography

Colors:
- **Pending**: Yellow (yellow-500)
- **Syncing**: Blue (blue-500)
- **Success**: Green (green-500)
- **Failed**: Red (red-500)
- **Offline**: Red/Orange
- **Online**: Green

---

## Accessibility

All components include:
- Proper ARIA labels (`aria-label`, `aria-live`, `role`)
- Keyboard navigation support
- Focus indicators (ring classes)
- Semantic HTML
- Screen reader friendly

Testing:
```bash
# Lighthouse accessibility audit
npm run build
npm run start
# Run Lighthouse in Chrome DevTools
```

---

## Performance

### Optimizations
- Pure presentation components (no re-renders unless props change)
- `useMemo` for computed values
- Minimal hook dependencies
- Icon SVGs (Lucide React) - tree-shakeable

### Bundle Size
- SyncStatusBadge: ~2KB
- QueueStatusCard: ~2.5KB
- SubmissionCard: ~2KB
- SubmissionList: ~1KB
- OfflineBanner: ~1.5KB
- Hooks: ~3KB total

---

## Usage Examples

### Basic Offline Page

```tsx
'use client';

import {
  useOfflineStatus,
  useSyncQueue,
  useSubmissions
} from '@/lib/hooks';
import {
  SyncStatusBadge,
  QueueStatusCard,
  SubmissionList,
  OfflineBanner
} from '@/components/offline';

export default function OfflinePage() {
  const isOnline = useOfflineStatus();
  const { status, pendingCount, sync } = useSyncQueue();
  const { submissions, retry, remove } = useSubmissions();

  const queue = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    syncing: submissions.filter(s => s.status === 'syncing').length,
    success: submissions.filter(s => s.status === 'success').length,
    failed: submissions.filter(s => s.status === 'failed').length,
    lastSyncTime: status.lastSyncTime
  };

  return (
    <>
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />

      <div className="p-6">
        <SyncStatusBadge
          status={status}
          pendingCount={pendingCount}
          isOnline={isOnline}
          onSyncClick={sync}
        />

        <QueueStatusCard
          queue={queue}
          isSyncing={status.isSyncing}
          isOnline={isOnline}
          onSync={sync}
        />

        <SubmissionList
          submissions={submissions}
          isOnline={isOnline}
          onRetry={retry}
          onDelete={remove}
        />
      </div>
    </>
  );
}
```

### Header with Sync Status

```tsx
import { SyncStatusIndicator } from '@/components/offline';

export function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>My App</h1>
      <SyncStatusIndicator />
    </header>
  );
}
```

### Custom Submission Display

```tsx
import { SubmissionCard } from '@/components/offline';

const MyCustomCard = ({ submission }) => (
  <div className="my-custom-wrapper">
    <SubmissionCard
      submission={submission}
      isOnline={navigator.onLine}
      onRetry={() => handleRetry(submission.id)}
      className="shadow-lg"
    />
  </div>
);
```

---

## Testing

### Unit Tests (with React Testing Library)

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SyncStatusBadge } from './sync-status-badge';

test('shows sync button when online with pending items', () => {
  const onSync = jest.fn();

  render(
    <SyncStatusBadge
      status={{ isSyncing: false }}
      pendingCount={5}
      isOnline={true}
      onSyncClick={onSync}
    />
  );

  const syncButton = screen.getByRole('button', { name: /sync/i });
  expect(syncButton).toBeInTheDocument();

  fireEvent.click(syncButton);
  expect(onSync).toHaveBeenCalledTimes(1);
});
```

### Integration Tests

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useSyncQueue } from '@/lib/hooks';

test('useSyncQueue updates pending count', async () => {
  const { result } = renderHook(() => useSyncQueue());

  expect(result.current.pendingCount).toBe(0);

  // Queue a submission
  await queueSubmission('/api/test', 'POST', { data: 'test' });

  await waitFor(() => {
    expect(result.current.pendingCount).toBe(1);
  });
});
```

---

## Files

```
src/
├── components/offline/
│   ├── sync-status-badge.tsx       # Pure: Status badge
│   ├── queue-status-card.tsx       # Pure: Queue stats
│   ├── submission-card.tsx         # Pure: Single submission
│   ├── submission-list.tsx         # Pure: Submission list
│   ├── offline-banner.tsx          # Pure: Notification banner
│   ├── sync-status-indicator.tsx   # Smart: Connected badge
│   ├── index.ts                    # Barrel export
│   └── README.md                   # This file
├── lib/hooks/
│   ├── use-offline-status.ts       # Online/offline hook
│   ├── use-sync-queue.ts           # Sync queue hook
│   ├── use-submissions.ts          # Submissions CRUD hook
│   └── index.ts                    # Barrel export
└── app/offline/
    ├── page.tsx                    # Offline page (container)
    ├── layout.tsx                  # Layout with Suspense
    └── error.tsx                   # Error boundary
```

---

## Best Practices

1. **Separation of Concerns**: Keep presentation and logic separate
2. **Prop Types**: Always define TypeScript interfaces for props
3. **Accessibility**: Include ARIA labels and semantic HTML
4. **Performance**: Use `useMemo` for computed values
5. **Error Handling**: Always display error states
6. **Loading States**: Show spinners during async operations
7. **Dark Mode**: Use `dark:` variants for all colors
8. **Mobile First**: Design for small screens first

---

## Future Enhancements

- [ ] Add toast notification library integration
- [ ] Add submission detail modal
- [ ] Add bulk actions (retry all failed, clear all success)
- [ ] Add submission filtering (by status, date)
- [ ] Add submission search
- [ ] Add export submissions feature
- [ ] Add submission analytics chart
- [ ] Add unit tests for all components
- [ ] Add Storybook stories

---

## Related Documentation

- [Offline Queue System](/src/lib/offline/README.md)
- [Sync Manager](/src/lib/offline/sync.ts)
- [Custom Hooks](/src/lib/hooks/README.md)
