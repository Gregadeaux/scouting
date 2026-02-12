import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/auth';
import { LeadScoutLayoutClient } from '@/components/lead-scout/LeadScoutLayoutClient';

export default async function LeadScoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/lead-scout');
  }

  // Check role — scouters can't access lead scout
  const userRole = (user.app_metadata?.role || user.user_metadata?.role) as UserRole | undefined;

  if (!userRole) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'mentor'].includes(profile.role)) {
      redirect('/scouting/pit');
    }
  } else if (!['admin', 'mentor'].includes(userRole)) {
    redirect('/scouting/pit');
  }

  return (
    <LeadScoutLayoutClient>
      {children}
    </LeadScoutLayoutClient>
  );
}
