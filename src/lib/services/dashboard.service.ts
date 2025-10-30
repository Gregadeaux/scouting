/**
 * Dashboard Service - Manages admin dashboard statistics and activity
 *
 * This service provides aggregated statistics and recent activity data
 * for the admin dashboard.
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { DashboardStats, ActivityItem } from '@/types/admin';

// Types for Supabase query results
interface RecentTeam {
  team_number: number;
  team_name: string;
  created_at: string | null;
}

interface RecentEvent {
  event_key: string;
  event_name: string;
  created_at: string | null;
}

interface RecentMatch {
  match_id: string;
  match_number: number;
  event_key: string;
  created_at: string | null;
}

interface RecentScoutingEntry {
  id: string;
  team_number: number;
  scout_name: string;
  created_at: string | null;
}

interface RecentAuditLog {
  id: string;
  action_type: string;
  description: string;
  created_at: string | null;
}

/**
 * Dashboard Service Interface
 */
export interface IDashboardService {
  /**
   * Get dashboard statistics including counts and recent activity
   */
  getDashboardStats(): Promise<DashboardStats>;
}

/**
 * Dashboard Service Implementation
 */
export class DashboardService implements IDashboardService {
  constructor() {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const supabase = createServiceClient();

    // Fetch counts in parallel
    const [
      { count: totalTeams },
      { count: totalEvents },
      { count: totalMatches },
      { count: totalScoutingEntries },
    ] = await Promise.all([
      supabase.from('teams').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('match_schedule').select('*', { count: 'exact', head: true }),
      supabase.from('match_scouting').select('*', { count: 'exact', head: true }),
    ]);

    // For now, we'll use a placeholder for active scouters
    // In a real implementation, you'd query the scouters table with an active filter
    const activeScouters = 0;

    // Fetch recent activity from multiple sources
    const [
      { data: recentTeams },
      { data: recentEvents },
      { data: recentMatches },
      { data: recentScouting },
      { data: recentAuditLog },
    ] = await Promise.all([
      supabase
        .from('teams')
        .select('team_number, team_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('events')
        .select('event_key, event_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('match_schedule')
        .select('match_id, match_number, event_key, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('match_scouting')
        .select('id, team_number, scout_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('admin_audit_log')
        .select('id, action_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Combine and sort all activities
    const activities = [
      ...(recentTeams || []).map((team: RecentTeam) => ({
        id: `team-${team.team_number}`,
        type: 'team_created' as const,
        description: `Team ${team.team_number} (${team.team_name}) was added`,
        timestamp: team.created_at || new Date().toISOString(),
      })),
      ...(recentEvents || []).map((event: RecentEvent) => ({
        id: `event-${event.event_key}`,
        type: 'event_created' as const,
        description: `Event "${event.event_name}" (${event.event_key}) was created`,
        timestamp: event.created_at || new Date().toISOString(),
      })),
      ...(recentMatches || []).map((match: RecentMatch) => ({
        id: `match-${match.match_id}`,
        type: 'match_scheduled' as const,
        description: `Match #${match.match_number} scheduled for ${match.event_key}`,
        timestamp: match.created_at || new Date().toISOString(),
      })),
      ...(recentScouting || []).map((entry: RecentScoutingEntry) => ({
        id: `scouting-${entry.id}`,
        type: 'match_scouted' as const,
        description: `${entry.scout_name} scouted team ${entry.team_number}`,
        timestamp: entry.created_at || new Date().toISOString(),
      })),
      ...(recentAuditLog || []).map((log: RecentAuditLog) => ({
        id: `audit-${log.id}`,
        type: log.action_type as ActivityItem['type'],
        description: log.description,
        timestamp: log.created_at || new Date().toISOString(),
      })),
    ] as ActivityItem[];

    // Sort by timestamp (newest first) and take top 10
    const recentActivity = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      totalTeams: totalTeams || 0,
      totalEvents: totalEvents || 0,
      totalMatches: totalMatches || 0,
      activeScouters,
      totalScoutingEntries: totalScoutingEntries || 0,
      recentActivity,
    };
  }

  /**
   * Logging utility
   */
  private log(message: string, data?: unknown): void {
    console.log(`[DashboardService] ${message}`, data || '');
  }
}

/**
 * Factory function to create Dashboard Service
 */
export function createDashboardService(): IDashboardService {
  return new DashboardService();
}
