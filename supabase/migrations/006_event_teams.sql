-- Migration: Add event_teams junction table
-- Purpose: Track which teams are registered for which events
-- Note: Match schedules aren't available until day-of-event, but team rosters are known weeks in advance

-- Create event_teams junction table
CREATE TABLE IF NOT EXISTS event_teams (
    event_key TEXT NOT NULL REFERENCES events(event_key) ON DELETE CASCADE,
    team_number INTEGER NOT NULL REFERENCES teams(team_number) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Composite primary key
    PRIMARY KEY (event_key, team_number)
);

-- Create indexes for efficient queries
CREATE INDEX idx_event_teams_event_key ON event_teams(event_key);
CREATE INDEX idx_event_teams_team_number ON event_teams(team_number);
CREATE INDEX idx_event_teams_created_at ON event_teams(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_teams_updated_at
    BEFORE UPDATE ON event_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_event_teams_updated_at();

-- Note: RLS policies will be added when authentication system is fully configured
-- For now, access is controlled at the application level via middleware

-- Add helpful comment
COMMENT ON TABLE event_teams IS 'Junction table linking teams to events they are registered for. Populated from TBA team list, independent of match schedule.';
COMMENT ON COLUMN event_teams.event_key IS 'Event identifier (e.g., 2025txaus)';
COMMENT ON COLUMN event_teams.team_number IS 'FRC team number (e.g., 930)';
