/**
 * Offline Components - Barrel Export
 *
 * Presentation Components (Pure):
 * - SyncStatusBadge: Online/offline status with sync button
 * - QueueStatusCard: Queue statistics display
 * - SubmissionCard: Single submission display
 * - SubmissionList: List of submissions
 * - OfflineBanner: Notification banner for offline status
 *
 * Container Components (Smart):
 * - SyncStatusIndicator: Connected version of SyncStatusBadge
 */

export { SyncStatusBadge } from './sync-status-badge';
export type { SyncStatusBadgeProps } from './sync-status-badge';

export { QueueStatusCard } from './queue-status-card';
export type { QueueStatusCardProps, QueueState } from './queue-status-card';

export { SubmissionCard } from './submission-card';
export type { SubmissionCardProps } from './submission-card';

export { SubmissionList } from './submission-list';
export type { SubmissionListProps } from './submission-list';

export { OfflineBanner } from './offline-banner';
export type { OfflineBannerProps } from './offline-banner';

export { SyncStatusIndicator } from './sync-status-indicator';
export type { SyncStatusIndicatorProps } from './sync-status-indicator';
