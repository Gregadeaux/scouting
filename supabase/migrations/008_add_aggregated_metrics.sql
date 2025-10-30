-- Add aggregated_metrics JSONB column to team_statistics table
-- This stores the complete AggregatedStatistics data structure
-- Also adds match_key to match_scouting for easier joins

ALTER TABLE team_statistics
ADD COLUMN IF NOT EXISTS aggregated_metrics JSONB;

-- Add index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_ts_aggregated_metrics
ON team_statistics USING gin (aggregated_metrics);

-- Update the unique constraint to allow null event_key (for season-wide stats)
ALTER TABLE team_statistics
DROP CONSTRAINT IF EXISTS team_statistics_team_number_event_key_key;

ALTER TABLE team_statistics
ADD CONSTRAINT team_statistics_unique_team_event
UNIQUE NULLS NOT DISTINCT (team_number, event_key);

-- Add comment
COMMENT ON COLUMN team_statistics.aggregated_metrics IS
'Complete aggregated statistics in JSONB format including auto/teleop/endgame stats, trends, and percentile rankings';

-- Update the event_key foreign key to allow NULL
ALTER TABLE team_statistics
DROP CONSTRAINT IF EXISTS team_statistics_event_key_fkey;

ALTER TABLE team_statistics
ADD CONSTRAINT team_statistics_event_key_fkey
FOREIGN KEY (event_key)
REFERENCES events(event_key)
ON DELETE CASCADE;

-- Make event_key nullable for season-wide statistics
ALTER TABLE team_statistics
ALTER COLUMN event_key DROP NOT NULL;

-- Add match_key to match_scouting table for easier queries
ALTER TABLE match_scouting
ADD COLUMN IF NOT EXISTS match_key VARCHAR(100);

-- Create index for match_key queries
CREATE INDEX IF NOT EXISTS idx_ms_match_key
ON match_scouting(match_key);

-- Populate match_key from match_schedule join (if data exists)
UPDATE match_scouting ms
SET match_key = msch.match_key
FROM match_schedule msch
WHERE ms.match_id = msch.match_id
AND ms.match_key IS NULL;

-- Add comment
COMMENT ON COLUMN match_scouting.match_key IS
'Match key for direct queries without joining through match_schedule';