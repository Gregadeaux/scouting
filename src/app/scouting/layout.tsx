import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ScouterLayoutClient } from '@/components/scouter/ScouterLayoutClient';

export default async function ScoutingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/scouting/pit');
  }

  return (
    <ScouterLayoutClient>
      {children}
    </ScouterLayoutClient>
  );
}
