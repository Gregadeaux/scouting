'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEventContext } from '@/contexts/EventContext';
import { EventSelector } from './EventSelector';
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
  ListChecks,
  Menu,
  X,
  ChevronRight,
  Settings,
  Zap,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface EventNavItem {
  name: string;
  path: string; // Will be appended to /admin/events/{eventKey}/
  icon: React.ElementType;
}

// Global navigation items (always visible)
const globalNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Events',
    href: '/admin/events',
    icon: Calendar,
  },
];

// Event-scoped navigation (only when event is selected)
const eventNavItems: EventNavItem[] = [
  { name: 'Analytics', path: '', icon: BarChart3 },
  { name: 'Matches', path: 'matches', icon: Trophy },
  { name: 'Scouting Data', path: 'scouting', icon: ClipboardList },
  { name: 'Pick List', path: 'picklist', icon: ListChecks },
  { name: 'Information', path: 'information', icon: Zap },
];

// System navigation items (admin tools, settings)
const systemNavItems: NavItem[] = [
  {
    name: 'All Teams',
    href: '/admin/teams',
    icon: Users,
  },
  {
    name: 'All Matches',
    href: '/admin/matches',
    icon: Trophy,
  },
  {
    name: 'Users',
    href: '/admin/users',
    adminOnly: true,
    icon: UserCog,
  },
  {
    name: 'Scouters',
    href: '/admin/scouters',
    adminOnly: true,
    icon: ShieldCheck,
  },
  {
    name: 'All Scouting Data',
    href: '/admin/scouting',
    icon: ClipboardList,
  },
  {
    name: 'Validation',
    href: '/admin/validation',
    adminOnly: true,
    icon: CheckCircle2,
  },
  {
    name: 'Leaderboard',
    href: '/admin/leaderboard',
    icon: BarChart3,
  },
  {
    name: 'Seasons',
    href: '/admin/seasons',
    adminOnly: true,
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
  userRole?: string;
}

function NavLink({
  href,
  icon: Icon,
  name,
  isActive,
}: {
  href: string;
  icon: React.ElementType;
  name: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border-l-2 border-cyan-400 ml-[-1px]"
          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
      )}
    >
      <Icon className={cn(
        "h-[18px] w-[18px] transition-colors",
        isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
      )} />
      <span className="flex-1">{name}</span>
      {isActive && (
        <ChevronRight className="h-4 w-4 text-cyan-400/50" />
      )}
    </Link>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
      {children}
    </div>
  );
}

export function Sidebar({ className = '', userRole }: SidebarProps) {
  const pathname = usePathname();
  const { selectedEvent } = useEventContext();
  const [collapsed, setCollapsed] = useState(true); // Start collapsed on mobile

  const isAdmin = userRole === 'admin';

  // Check if current path is within the selected event
  const eventBasePath = selectedEvent ? `/admin/events/${selectedEvent.event_key}` : null;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "fixed left-4 top-4 z-50 p-2.5 rounded-xl lg:hidden",
          "bg-slate-900 border border-slate-700 shadow-lg shadow-black/20",
          "hover:bg-slate-800 hover:border-slate-600 transition-all duration-200"
        )}
      >
        {collapsed ? (
          <Menu className="h-5 w-5 text-slate-300" />
        ) : (
          <X className="h-5 w-5 text-slate-300" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-out",
          "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950",
          "border-r border-slate-800",
          collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0',
          className
        )}
      >
        {/* Decorative gradient orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex h-full flex-col">
          {/* Logo Header */}
          <div className="flex h-16 items-center px-5 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-lg font-black text-white">9</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">FRC Scouting</h1>
                <p className="text-[10px] text-slate-500 font-medium">Admin Portal</p>
              </div>
            </div>
          </div>

          {/* Event Selector */}
          <div className="px-4 py-4 border-b border-slate-800/50">
            <EventSelector />
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {/* Event Navigation (when event selected) */}
            {selectedEvent && eventBasePath && (
              <div>
                <SectionHeader>Event Navigation</SectionHeader>
                <div className="space-y-0.5">
                  {eventNavItems.map((item) => {
                    const href = item.path ? `${eventBasePath}/${item.path}` : eventBasePath;
                    const isActive = item.path
                      ? pathname === href || pathname.startsWith(`${href}/`)
                      : pathname === eventBasePath;

                    return (
                      <NavLink
                        key={item.path || 'overview'}
                        href={href}
                        icon={item.icon}
                        name={item.name}
                        isActive={isActive}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Global Navigation */}
            <div>
              <SectionHeader>Quick Access</SectionHeader>
              <div className="space-y-0.5">
                {globalNavItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href) && !pathname.includes('/events/'));

                  return (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      name={item.name}
                      isActive={isActive}
                    />
                  );
                })}
              </div>
            </div>

            {/* System Navigation */}
            <div>
              <SectionHeader>System</SectionHeader>
              <div className="space-y-0.5">
                {systemNavItems.map((item) => {
                  // Skip admin-only items if user is not admin
                  if (item.adminOnly && !isAdmin) return null;

                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href));

                  return (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      name={item.name}
                      isActive={isActive}
                    />
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-800/50 p-4">
            <div className="flex items-center gap-2 text-[10px] text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>FRC Scouting System v1.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
