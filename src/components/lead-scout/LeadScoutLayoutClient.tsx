'use client';

import React from 'react';
import { ScouterEventProvider } from '@/contexts/ScouterEventContext';

interface LeadScoutLayoutClientProps {
  children: React.ReactNode;
}

export function LeadScoutLayoutClient({ children }: LeadScoutLayoutClientProps) {
  return (
    <ScouterEventProvider>
      <div className="min-h-screen bg-slate-950">
        {children}
      </div>
    </ScouterEventProvider>
  );
}
