'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Trophy,
  UserCog,
  ShieldCheck,
  ClipboardList,
  CheckCircle2,
  BarChart3,
  History,
  Menu,
  ListChecks
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    name: 'Events',
    href: '/admin/events',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    name: 'Teams',
    href: '/admin/teams',
    icon: <Users className="h-5 w-5" />,
  },
  {
    name: 'Matches',
    href: '/admin/matches',
    icon: <Trophy className="h-5 w-5" />,
  },
  {
    name: 'Users',
    href: '/admin/users',
    adminOnly: true,
    icon: <UserCog className="h-5 w-5" />,
  },
  {
    name: 'Scouters',
    href: '/admin/scouters',
    adminOnly: true,
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    name: 'Scouting Data',
    href: '/admin/scouting',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    name: 'Validation',
    href: '/admin/validation',
    adminOnly: true,
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  {
    name: 'Leaderboard',
    href: '/admin/leaderboard',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    name: 'Pick List',
    href: '/admin/picklist',
    icon: <ListChecks className="h-5 w-5" />,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: <History className="h-5 w-5" />,
  },
  {
    name: 'Seasons',
    href: '/admin/seasons',
    adminOnly: true,
    icon: <Calendar className="h-5 w-5" />,
  },
];

interface SidebarProps {
  className?: string;
  userRole?: string; // Server-side role from layout
}

export function Sidebar({ className = '', userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-background p-2 shadow-lg lg:hidden border"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-background transition-transform duration-300",
          collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0',
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <h1 className="text-xl font-bold text-primary">FRC Scouting Admin</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              // Skip admin-only items if user is not admin (server-side check)
              if (item.adminOnly && userRole !== 'admin') {
                return null;
              }

              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <p className="text-xs text-muted-foreground">
              FRC Scouting System v1.0
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
