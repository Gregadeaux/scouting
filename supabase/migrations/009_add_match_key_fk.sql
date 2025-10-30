-- Add foreign key constraint for match_key in match_scouting
-- This ensures data integrity and allows cleaner join syntax

-- First, ensure all existing rows have valid match_key values
-- (Migration 008 should have populated these, but let's be safe)
UPDATE match_scouting ms
SET match_key = msch.match_key
FROM match_schedule msch
WHERE ms.match_id = msch.match_id
AND (ms.match_key IS NULL OR ms.match_key = '');

-- Make match_key NOT NULL (it should always have a value)
ALTER TABLE match_scouting
ALTER COLUMN match_key SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE match_scouting
ADD CONSTRAINT match_scouting_match_key_fkey
FOREIGN KEY (match_key)
REFERENCES match_schedule(match_key)
ON DELETE CASCADE;

-- Update comment
COMMENT ON COLUMN match_scouting.match_key IS
'Match key referencing match_schedule.match_key - allows queries without joining through match_id';
