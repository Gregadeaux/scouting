'use client';

import React from 'react';
import { EventProvider } from '@/contexts/EventContext';
import { Sidebar } from './Sidebar';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  userRole?: string;
}

export function AdminLayoutClient({ children, userRole }: AdminLayoutClientProps) {
  return (
    <EventProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar userRole={userRole} />
        {children}
      </div>
    </EventProvider>
  );
}
