-- Add component OPR columns to team_statistics
-- These store per-team OPR estimates for different scoring components,
-- calculated from TBA score_breakdown data.

ALTER TABLE team_statistics
  ADD COLUMN IF NOT EXISTS auto_opr numeric,
  ADD COLUMN IF NOT EXISTS teleop_hub_opr numeric,
  ADD COLUMN IF NOT EXISTS endgame_opr numeric,
  ADD COLUMN IF NOT EXISTS total_hub_opr numeric;
