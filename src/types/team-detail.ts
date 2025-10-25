import { Team, PitScouting } from './index';
import { RobotCapabilities2025, AutonomousCapabilities2025 } from './season-2025';

export interface TeamPhoto {
  id: string;
  url: string;
  caption?: string;
  uploaded_at: string;
  uploaded_by: string;
  uploaded_by_name?: string;
}

export interface TeamMatchSummary {
  matches_played: number;
  avg_auto_points: number;
  avg_teleop_points: number;
  avg_endgame_points: number;
  avg_total_points: number;
  reliability_score: number; // 0-100
  win_rate?: number;
}

export interface TeamDetail {
  team: Team;
  event_key: string;
  pit_scouting?: PitScouting<RobotCapabilities2025, AutonomousCapabilities2025>;
  pit_scouting_by_name?: string;
  match_summary?: TeamMatchSummary;
  photos: TeamPhoto[];
  last_updated: string;
}