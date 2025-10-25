import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import TeamDetailClient from './TeamDetailClient';
import type { Team } from '@/types';

interface TeamDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface TeamEvent {
  event_key: string;
  event_name: string;
  event_code: string;
  year: number;
  event_type: string;
  district: string | null;
  week: number | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  start_date: string;
  end_date: string;
  team_registered_at: string;
}

interface TeamScouter {
  membership_id: string;
  team_role: string;
  can_submit_data: boolean;
  can_view_analytics: boolean;
  can_manage_team: boolean;
  is_active: boolean;
  joined_at: string;
  left_at: string | null;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    display_name: string | null;
    role: string;
    preferred_scout_name: string | null;
    is_active: boolean;
    email_verified: boolean;
    onboarding_completed: boolean;
    training_completed_at: string | null;
    last_login_at: string | null;
    created_at: string;
  };
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { id } = await params;
  const teamNumber = parseInt(id);

  // Validate team number
  if (isNaN(teamNumber) || teamNumber <= 0) {
    notFound();
  }

  const supabase = createServiceClient();

  // Fetch team data
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('team_number', teamNumber)
    .single();

  if (teamError || !team) {
    console.error('Error fetching team:', teamError);
    notFound();
  }

  // Fetch events for this team
  const { data: eventTeamsData, error: eventsError } = await supabase
    .from('event_teams')
    .select(`
      event_key,
      created_at,
      events (
        event_key,
        event_name,
        event_code,
        year,
        event_type,
        district,
        week,
        city,
        state_province,
        country,
        start_date,
        end_date
      )
    `)
    .eq('team_number', teamNumber)
    .order('events(start_date)', { ascending: false });

  interface EventTeamItem {
    event_key: string;
    created_at: string;
    events: Omit<TeamEvent, 'team_registered_at'>;
  }

  // Transform events data
  const events: TeamEvent[] = eventTeamsData?.map((item: EventTeamItem) => ({
    ...item.events,
    team_registered_at: item.created_at
  })) || [];

  // Fetch scouters for this team
  const { data: teamMembersData, error: scoutersError } = await supabase
    .from('team_members')
    .select(`
      id,
      team_role,
      can_submit_data,
      can_view_analytics,
      can_manage_team,
      is_active,
      joined_at,
      left_at,
      user_profiles (
        id,
        email,
        full_name,
        display_name,
        role,
        preferred_scout_name,
        is_active,
        email_verified,
        onboarding_completed,
        training_completed_at,
        last_login_at,
        created_at
      )
    `)
    .eq('team_number', teamNumber)
    .order('joined_at', { ascending: false });

  interface TeamMemberItem {
    id: string;
    team_role: string;
    can_submit_data: boolean;
    can_view_analytics: boolean;
    can_manage_team: boolean;
    is_active: boolean;
    joined_at: string;
    left_at: string | null;
    user_profiles: TeamScouter['user'];
  }

  // Transform scouters data
  const scouters: TeamScouter[] = teamMembersData?.map((item: TeamMemberItem) => ({
    membership_id: item.id,
    team_role: item.team_role,
    can_submit_data: item.can_submit_data,
    can_view_analytics: item.can_view_analytics,
    can_manage_team: item.can_manage_team,
    is_active: item.is_active,
    joined_at: item.joined_at,
    left_at: item.left_at,
    user: item.user_profiles
  })) || [];

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
  }

  if (scoutersError) {
    console.error('Error fetching scouters:', scoutersError);
  }

  return (
    <TeamDetailClient
      team={team as Team}
      events={events}
      scouters={scouters}
    />
  );
}
