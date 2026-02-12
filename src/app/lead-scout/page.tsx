'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LeadScoutDashboard } from '@/components/lead-scout/LeadScoutDashboard';

export default function LeadScoutPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent mx-auto" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <LeadScoutDashboard
      userId={user.auth.id}
      userName={user.profile?.full_name || user.auth.email?.split('@')[0] || 'Lead'}
    />
  );
}
