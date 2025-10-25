import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PitScoutingClient } from './PitScoutingClient';

export default async function PitScoutingPage() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login?redirect=/pit-scouting');
  }
  
  return <PitScoutingClient userId={user.id} />;
}

export const metadata = {
  title: 'Pit Scouting | FRC Scouting System',
  description: 'Submit and edit pit scouting data for FRC teams',
};
