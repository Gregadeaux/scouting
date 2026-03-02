/**
 * DataQualityBadge Component
 *
 * Shared badge for displaying data quality status (Complete/Partial/Issues)
 * with optional tooltip showing quality reasons.
 *
 * Two visual variants:
 * - "admin" (default): Light-mode friendly with colored dots
 * - "analytics": Dark-mode friendly with lucide icons
 */

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type DataQuality = 'complete' | 'partial' | 'issues';

interface DataQualityBadgeProps {
  quality: DataQuality;
  reasons?: string[];
  variant?: 'admin' | 'analytics';
}

const ADMIN_STYLES: Record<DataQuality, { dot: string; badge: string; label: string }> = {
  complete: {
    dot: 'bg-green-600',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    label: 'Complete',
  },
  partial: {
    dot: 'bg-yellow-600',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    label: 'Partial',
  },
  issues: {
    dot: 'bg-red-600',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    label: 'Issues',
  },
};

const ANALYTICS_STYLES: Record<DataQuality, { color: string; bg: string; label: string }> = {
  complete: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Complete',
  },
  partial: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    label: 'Partial',
  },
  issues: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    label: 'Issues',
  },
};

export function DataQualityBadge({ quality, reasons, variant = 'admin' }: DataQualityBadgeProps) {
  const tooltip = reasons && reasons.length > 0 ? reasons.join(', ') : undefined;

  if (variant === 'analytics') {
    const { color, bg, label } = ANALYTICS_STYLES[quality];
    const Icon = quality === 'complete' ? CheckCircle2 : AlertCircle;

    return (
      <span
        title={tooltip}
        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${color} ${bg}`}
      >
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  }

  const { dot, badge, label } = ADMIN_STYLES[quality];

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
