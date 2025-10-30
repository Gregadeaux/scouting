-- Migration: Add TBA score breakdown and video data to match_schedule
-- Created: 2025-10-25
-- Purpose: Store detailed scoring data and video links from The Blue Alliance API
--
-- This migration adds two JSONB columns to the match_schedule table:
-- 1. score_breakdown: Game-specific scoring details (varies by year)
-- 2. videos: Array of video links (YouTube, TBA, etc.)

-- Add score_breakdown column
-- Contains game-specific scoring data from TBA API
-- Structure varies by year/game (e.g., 2025 Reefscape vs 2024 Crescendo)
-- Example structure for 2025:
-- {
--   "red": {
--     "totalPoints": 150,
--     "autoPoints": 45,
--     "teleopPoints": 80,
--     "endgamePoints": 25,
--     "fouls": 0,
--     "techFouls": 0,
--     "coralLevel1": 3,
--     "coralLevel2": 2,
--     ... (game-specific fields)
--   },
--   "blue": { ... }
-- }
ALTER TABLE match_schedule
ADD COLUMN IF NOT EXISTS score_breakdown JSONB;

-- Add videos column
-- Array of video objects with metadata
-- Structure:
-- [
--   {
--     "key": "dQw4w9WgXcQ",
--     "type": "youtube",
--     "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
--   },
--   {
--     "key": "2025week1_qm1",
--     "type": "tba"
--   }
-- ]
ALTER TABLE match_schedule
ADD COLUMN IF NOT EXISTS videos JSONB;

-- Add indexes for JSONB queries
-- Allows efficient queries on score_breakdown data
CREATE INDEX IF NOT EXISTS idx_match_schedule_score_breakdown
ON match_schedule USING gin (score_breakdown);

-- Index for video queries
CREATE INDEX IF NOT EXISTS idx_match_schedule_videos
ON match_schedule USING gin (videos);

-- Add comments for documentation
COMMENT ON COLUMN match_schedule.score_breakdown IS
'Game-specific scoring breakdown from TBA API. Structure varies by year/game. Contains detailed point breakdowns, fouls, and game element scoring.';

COMMENT ON COLUMN match_schedule.videos IS
'Array of video objects with type (youtube/tba), key, and optional URL. Videos are linked to this match from various sources.';
