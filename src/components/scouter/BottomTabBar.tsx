'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Target, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/scouting/pit', label: 'Pit', icon: ClipboardList },
  { href: '/scouting/match', label: 'Match', icon: Target },
  { href: '/scouting/settings', label: 'Settings', icon: Settings },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 px-4',
                'transition-colors',
                isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
