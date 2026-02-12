/**
 * Scouting Session Service
 *
 * Manages live scouting session state for manual-schedule events.
 * Thin wrapper around Supabase operations on the scouting_sessions table.
 */

import type { ScoutingSession } from '@/types';
import { createServiceClient } from '@/lib/supabase/server';

export class ScoutingSessionService {
  /**
   * Get or create a scouting session for an event.
   * Idempotent — returns existing session if one exists.
   */
  async getOrCreateSession(eventKey: string): Promise<ScoutingSession> {
    const supabase = createServiceClient();

    const { data: existing, error: fetchError } = await supabase
      .from('scouting_sessions')
      .select('*')
      .eq('event_key', eventKey)
      .single();

    if (existing && !fetchError) {
      return existing as ScoutingSession;
    }

    const { data, error } = await supabase
      .from('scouting_sessions')
      .insert({ event_key: eventKey })
      .select()
      .single();

    if (error) {
      // Handle race condition: another request created it first
      if (error.code === '23505') {
        const { data: raceResult, error: raceError } = await supabase
          .from('scouting_sessions')
          .select('*')
          .eq('event_key', eventKey)
          .single();

        if (raceError || !raceResult) {
          throw new Error(`Failed to fetch session after conflict: ${raceError?.message}`);
        }
        return raceResult as ScoutingSession;
      }
      throw new Error(`Failed to create scouting session: ${error.message}`);
    }

    return data as ScoutingSession;
  }

  /**
   * Update session fields (match number, comp level, session data).
   */
  async updateSession(
    eventKey: string,
    updates: {
      current_match_number?: number;
      comp_level?: string;
      session_data?: Record<string, unknown>;
      updated_by?: string;
    }
  ): Promise<ScoutingSession> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('scouting_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('event_key', eventKey)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update scouting session: ${error.message}`);
    }

    return data as ScoutingSession;
  }
}

export function getScoutingSessionService(): ScoutingSessionService {
  return new ScoutingSessionService();
}
