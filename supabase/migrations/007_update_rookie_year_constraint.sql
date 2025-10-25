-- Migration: Update rookie_year constraint to allow next year
-- Teams can be announced for the upcoming season before the current year ends
-- For example, in late 2025, teams can have rookie_year 2026

-- Drop the old constraint
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_rookie_year_check;

-- Add the new constraint allowing up to next year
ALTER TABLE teams ADD CONSTRAINT teams_rookie_year_check
    CHECK (rookie_year >= 1992 AND rookie_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1);

COMMENT ON CONSTRAINT teams_rookie_year_check ON teams IS
    'Rookie year must be between 1992 (first FRC season) and next year (allows pre-announcement of new teams)';
