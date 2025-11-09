/**
 * Admin Team Service - Manages admin-specific team operations
 *
 * This service provides admin functionality for team management including
 * team members, events, and other admin-specific operations.
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { Team } from '@/types';

/**
 * Team event participation details
 */
export interface TeamEvent {
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

/**
 * Team member/scouter details
 */
export interface TeamScouter {
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

/**
 * Complete team detail for admin view
 */
export interface AdminTeamDetail {
  team: Team;
  events: TeamEvent[];
  scouters: TeamScouter[];
}

/**
 * Admin Team Service Interface
 */
export interface IAdminTeamService {
  /**
   * Get complete team details including events and team members
   */
  getTeamDetailForAdmin(teamNumber: number): Promise<AdminTeamDetail>;
}

/**
 * Admin Team Service Implementation
 */
export class AdminTeamService implements IAdminTeamService {
  constructor() {}

  /**
   * Get complete team details for admin view
   */
  async getTeamDetailForAdmin(teamNumber: number): Promise<AdminTeamDetail> {
    const supabase = createServiceClient();

    // Fetch team data
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('team_number', teamNumber)
      .single();

    if (teamError || !team) {
      throw new Error(`Team ${teamNumber} not found`);
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
      .order('events(start_date)', { ascending: false }) as { data: EventTeamItem[] | null; error: unknown };

    interface EventTeamItem {
      event_key: string;
      created_at: string;
      events: Omit<TeamEvent, 'team_registered_at'> | null;
    }

    // Transform events data
    const events: TeamEvent[] = eventTeamsData?.map((item: EventTeamItem) => {
      const eventData = item.events;
      if (!eventData) return null;
      return {
        ...eventData,
        team_registered_at: item.created_at
      };
    }).filter((event): event is TeamEvent => event !== null) || [];

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
      .order('joined_at', { ascending: false }) as { data: TeamMemberItem[] | null; error: unknown };

    interface TeamMemberItem {
      id: string;
      team_role: string;
      can_submit_data: boolean;
      can_view_analytics: boolean;
      can_manage_team: boolean;
      is_active: boolean;
      joined_at: string;
      left_at: string | null;
      user_profiles: TeamScouter['user'] | null;
    }

    // Transform scouters data
    const scouters: TeamScouter[] = teamMembersData?.map((item: TeamMemberItem) => {
      const userProfile = item.user_profiles;
      if (!userProfile) return null;
      return {
        membership_id: item.id,
        team_role: item.team_role,
        can_submit_data: item.can_submit_data,
        can_view_analytics: item.can_view_analytics,
        can_manage_team: item.can_manage_team,
        is_active: item.is_active,
        joined_at: item.joined_at,
        left_at: item.left_at,
        user: userProfile
      };
    }).filter((scouter): scouter is TeamScouter => scouter !== null) || [];

    if (eventsError) {
      this.log(`Error fetching events for team ${teamNumber}:`, eventsError);
    }

    if (scoutersError) {
      this.log(`Error fetching scouters for team ${teamNumber}:`, scoutersError);
    }

    return {
      team: team as Team,
      events,
      scouters,
    };
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: unknown): void {
    console.log(`[AdminTeamService] ${message}`, data || '');
  }
}

/**
 * Factory function to create Admin Team Service
 */
export function createAdminTeamService(): IAdminTeamService {
  return new AdminTeamService();
}
