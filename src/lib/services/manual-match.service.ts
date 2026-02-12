/**
 * Manual Match Service
 *
 * Handles scouting submissions for manual-schedule events.
 * Calls the ensure_manual_match_and_team RPC to atomically create
 * match/team records, then inserts the match_scouting row.
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface ManualMatchSubmission {
  event_key: string;
  match_number: number;
  team_number: number;
  alliance_color: 'red' | 'blue';
  comp_level?: string;
  scout_name: string;
  scout_id: string;
  auto_performance: Record<string, unknown>;
  teleop_performance: Record<string, unknown>;
  endgame_performance: Record<string, unknown>;
  starting_position?: 1 | 2 | 3;
  robot_disconnected?: boolean;
  robot_disabled?: boolean;
  robot_tipped?: boolean;
  foul_count?: number;
  tech_foul_count?: number;
  yellow_card?: boolean;
  red_card?: boolean;
  defense_rating?: number;
  driver_skill_rating?: number;
  speed_rating?: number;
  strengths?: string;
  weaknesses?: string;
  notes?: string;
  confidence_level?: number;
  device_id?: string;
}

export interface ManualMatchResult {
  match_id: number;
  match_key: string;
  alliance_position: number | null;
  scouting_record: Record<string, unknown>;
}

export class ManualMatchService {
  /**
   * Submit scouting data for a manual-schedule event.
   *
   * 1. Calls RPC to ensure match/team/alliance slot exist
   * 2. Inserts match_scouting row with resolved match_id
   */
  async submitScoutingData(submission: ManualMatchSubmission): Promise<ManualMatchResult> {
    const supabase = createServiceClient();

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'ensure_manual_match_and_team',
      {
        p_event_key: submission.event_key,
        p_match_number: submission.match_number,
        p_team_number: submission.team_number,
        p_alliance_color: submission.alliance_color,
        p_comp_level: submission.comp_level || 'qm',
      }
    );

    if (rpcError) {
      throw new Error(`Failed to ensure match/team: ${rpcError.message}`);
    }

    const { match_id, match_key, alliance_position } = rpcResult as {
      match_id: number;
      match_key: string;
      alliance_position: number | null;
    };

    const scoutingData = {
      match_id,
      match_key,
      team_number: submission.team_number,
      scout_name: submission.scout_name,
      alliance_color: submission.alliance_color,
      starting_position: alliance_position ?? submission.starting_position,
      auto_performance: submission.auto_performance,
      teleop_performance: submission.teleop_performance,
      endgame_performance: submission.endgame_performance,
      robot_disconnected: submission.robot_disconnected ?? false,
      robot_disabled: submission.robot_disabled ?? false,
      robot_tipped: submission.robot_tipped ?? false,
      foul_count: submission.foul_count ?? 0,
      tech_foul_count: submission.tech_foul_count ?? 0,
      yellow_card: submission.yellow_card ?? false,
      red_card: submission.red_card ?? false,
      defense_rating: submission.defense_rating,
      driver_skill_rating: submission.driver_skill_rating,
      speed_rating: submission.speed_rating,
      strengths: submission.strengths,
      weaknesses: submission.weaknesses,
      notes: submission.notes,
      confidence_level: submission.confidence_level,
      device_id: submission.device_id,
    };

    const { data, error } = await supabase
      .from('match_scouting')
      .insert(scoutingData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          'Duplicate: This scout already submitted data for this team in this match'
        );
      }
      throw new Error(`Failed to insert scouting data: ${error.message}`);
    }

    return {
      match_id,
      match_key,
      alliance_position,
      scouting_record: data as Record<string, unknown>,
    };
  }
}

export function getManualMatchService(): ManualMatchService {
  return new ManualMatchService();
}
