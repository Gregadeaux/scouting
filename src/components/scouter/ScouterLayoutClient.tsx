'use client';

import React from 'react';
import { ScouterEventProvider } from '@/contexts/ScouterEventContext';
import { BottomTabBar } from './BottomTabBar';

interface ScouterLayoutClientProps {
  children: React.ReactNode;
}

export function ScouterLayoutClient({ children }: ScouterLayoutClientProps) {
  return (
    <ScouterEventProvider>
      <div className="min-h-screen bg-slate-950 pb-20">
        {children}
      </div>
      <BottomTabBar />
    </ScouterEventProvider>
  );
}
