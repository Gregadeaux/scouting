'use client';

import { cn } from '@/lib/utils';

interface ScouterChipProps {
  name: string;
  status: 'connected' | 'scouting' | 'submitted' | 'offline';
  className?: string;
}

const STATUS_STYLES = {
  connected: { dot: 'bg-green-500', text: 'text-green-400', label: 'Online' },
  scouting: { dot: 'bg-yellow-500 animate-pulse', text: 'text-yellow-400', label: 'Scouting' },
  submitted: { dot: 'bg-cyan-500', text: 'text-cyan-400', label: 'Submitted' },
  offline: { dot: 'bg-slate-600', text: 'text-slate-500', label: 'Offline' },
} as const;

export function ScouterChip({ name, status, className }: ScouterChipProps) {
  const styles = STATUS_STYLES[status];

  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2',
      className
    )}>
      <span className={cn('h-2 w-2 rounded-full shrink-0', styles.dot)} />
      <span className="text-sm font-medium text-slate-200 truncate">{name}</span>
      <span className={cn('text-xs ml-auto shrink-0', styles.text)}>{styles.label}</span>
    </div>
  );
}
