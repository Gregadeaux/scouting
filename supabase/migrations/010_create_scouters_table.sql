-- ============================================================================
-- Scouters Management Table
-- ============================================================================
-- Tracks scout profiles, experience levels, and performance metrics
-- Implements SCOUT-10: Scouters Management feature
-- ============================================================================

-- Create scouters table
CREATE TABLE IF NOT EXISTS scouters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User relationship
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_number INTEGER REFERENCES teams(team_number),

  -- Scout profile
  experience_level TEXT NOT NULL DEFAULT 'rookie',
  preferred_role TEXT,

  -- Performance tracking
  total_matches_scouted INTEGER NOT NULL DEFAULT 0 CHECK (total_matches_scouted >= 0),
  total_events_attended INTEGER NOT NULL DEFAULT 0 CHECK (total_events_attended >= 0),

  -- Skills and certifications (JSONB array)
  certifications JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Scheduling and notes
  availability_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id),
  CHECK (experience_level IN ('rookie', 'intermediate', 'veteran')),
  CHECK (preferred_role IS NULL OR preferred_role IN ('match_scouting', 'pit_scouting', 'both'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX idx_scouters_user ON scouters(user_id);
CREATE INDEX idx_scouters_team ON scouters(team_number);
CREATE INDEX idx_scouters_experience ON scouters(experience_level);

-- Performance tracking indexes
CREATE INDEX idx_scouters_matches_scouted ON scouters(total_matches_scouted DESC);
CREATE INDEX idx_scouters_events_attended ON scouters(total_events_attended DESC);

-- JSONB index for certifications
CREATE INDEX idx_scouters_certifications ON scouters USING GIN (certifications);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE scouters IS 'Scout profiles with experience tracking, certifications, and availability management';
COMMENT ON COLUMN scouters.user_id IS 'Reference to auth.users - each user can have one scouter profile';
COMMENT ON COLUMN scouters.team_number IS 'Optional: Primary team affiliation for the scout';
COMMENT ON COLUMN scouters.experience_level IS 'Scout experience: rookie (first season), intermediate (2-3 seasons), veteran (4+ seasons)';
COMMENT ON COLUMN scouters.preferred_role IS 'Scout role preference: match_scouting, pit_scouting, or both';
COMMENT ON COLUMN scouters.total_matches_scouted IS 'Cumulative count of matches this scout has completed';
COMMENT ON COLUMN scouters.total_events_attended IS 'Cumulative count of events this scout has participated in';
COMMENT ON COLUMN scouters.certifications IS 'Array of certification strings: ["pit_certified", "match_certified", "lead_scout", "data_analyst"]';
COMMENT ON COLUMN scouters.availability_notes IS 'Free-form text for schedule constraints, preferences, or special notes';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_scouters_updated_at
  BEFORE UPDATE ON scouters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_scouters_updated_at ON scouters IS 'Automatically updates the updated_at timestamp on row modification';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE scouters ENABLE ROW LEVEL SECURITY;

-- Policy: Scouts can view their own record
CREATE POLICY "Scouts can view own record"
  ON scouters
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Policy: Admins can view all records
CREATE POLICY "Admins can view all scouter records"
  ON scouters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
        AND user_profiles.is_active = true
    )
  );

-- Policy: Mentors can view scouters from their team
CREATE POLICY "Mentors can view team scouters"
  ON scouters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_teams ut ON ut.user_id = up.id
      WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'mentor')
        AND up.is_active = true
        AND ut.team_number = scouters.team_number
    )
  );

-- Policy: Admins can insert records
CREATE POLICY "Admins can create scouter records"
  ON scouters
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
        AND user_profiles.is_active = true
    )
  );

-- Policy: Admins can update all records
CREATE POLICY "Admins can update scouter records"
  ON scouters
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
        AND user_profiles.is_active = true
    )
  );

-- Policy: Scouts can update their own availability notes
CREATE POLICY "Scouts can update own availability"
  ON scouters
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can delete records
CREATE POLICY "Admins can delete scouter records"
  ON scouters
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
        AND user_profiles.is_active = true
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically create scouter profile for new scouts
CREATE OR REPLACE FUNCTION create_scouter_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if user role is 'scouter' and no profile exists
  IF NEW.role = 'scouter' AND NOT EXISTS (
    SELECT 1 FROM scouters WHERE user_id = NEW.id
  ) THEN
    INSERT INTO scouters (
      user_id,
      team_number,
      experience_level
    ) VALUES (
      NEW.id,
      NEW.primary_team_number,
      'rookie' -- Default for new scouts
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create scouter profiles
DROP TRIGGER IF EXISTS auto_create_scouter_profile ON user_profiles;
CREATE TRIGGER auto_create_scouter_profile
  AFTER INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (NEW.role = 'scouter')
  EXECUTE FUNCTION create_scouter_profile();

COMMENT ON FUNCTION create_scouter_profile() IS 'Automatically creates a scouter profile when a user is assigned the scouter role';

-- Function to update scout metrics when match scouting is submitted
CREATE OR REPLACE FUNCTION update_scouter_metrics()
RETURNS TRIGGER AS $$
DECLARE
  scout_user_id UUID;
  event_key_val VARCHAR(50);
BEGIN
  -- Only process on INSERT (new scouting entry)
  IF TG_OP = 'INSERT' THEN
    -- Find the user_id for this scout name
    SELECT up.id INTO scout_user_id
    FROM user_profiles up
    WHERE up.email = NEW.scout_name OR up.full_name = NEW.scout_name
    LIMIT 1;

    IF scout_user_id IS NOT NULL THEN
      -- Get the event_key for this match
      SELECT m.event_key INTO event_key_val
      FROM match_schedule m
      WHERE m.match_id = NEW.match_id;

      -- Update scouter metrics
      UPDATE scouters
      SET
        total_matches_scouted = total_matches_scouted + 1,
        -- Increment events if this is their first match at this event
        total_events_attended = (
          SELECT COUNT(DISTINCT m.event_key)
          FROM match_scouting ms
          JOIN match_schedule m ON m.match_id = ms.match_id
          WHERE ms.scout_name = NEW.scout_name
        )
      WHERE user_id = scout_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update metrics when match scouting is submitted
DROP TRIGGER IF EXISTS update_scouter_metrics_trigger ON match_scouting;
CREATE TRIGGER update_scouter_metrics_trigger
  AFTER INSERT ON match_scouting
  FOR EACH ROW
  EXECUTE FUNCTION update_scouter_metrics();

COMMENT ON FUNCTION update_scouter_metrics() IS 'Automatically updates scouter performance metrics when they complete match scouting';

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for scouter leaderboard
CREATE OR REPLACE VIEW scouter_leaderboard AS
SELECT
  s.id,
  s.user_id,
  up.full_name,
  up.email,
  s.team_number,
  t.team_name,
  s.experience_level,
  s.total_matches_scouted,
  s.total_events_attended,
  s.certifications,
  CASE
    WHEN jsonb_array_length(s.certifications) >= 3 THEN 'Expert'
    WHEN jsonb_array_length(s.certifications) >= 2 THEN 'Proficient'
    WHEN jsonb_array_length(s.certifications) >= 1 THEN 'Certified'
    ELSE 'Learning'
  END as skill_level,
  s.created_at,
  s.updated_at
FROM scouters s
JOIN user_profiles up ON up.id = s.user_id
LEFT JOIN teams t ON t.team_number = s.team_number
WHERE up.is_active = true
ORDER BY s.total_matches_scouted DESC;

COMMENT ON VIEW scouter_leaderboard IS 'Leaderboard view showing scout performance and rankings';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant read access to authenticated users (RLS policies will further restrict)
GRANT SELECT ON scouters TO authenticated;
GRANT INSERT, UPDATE, DELETE ON scouters TO authenticated;

-- Grant access to views
GRANT SELECT ON scouter_leaderboard TO authenticated;

-- ============================================================================
-- SAMPLE DATA (Optional - for development/testing)
-- ============================================================================

-- Uncomment to insert sample scouter data
/*
-- Insert sample scouters (assumes users exist)
INSERT INTO scouters (
  user_id,
  team_number,
  experience_level,
  preferred_role,
  total_matches_scouted,
  total_events_attended,
  certifications,
  availability_notes
)
SELECT
  up.id,
  930,
  'veteran',
  'both',
  150,
  5,
  '["pit_certified", "match_certified", "lead_scout"]'::JSONB,
  'Available all weekends'
FROM user_profiles up
WHERE up.email = 'gregadeaux@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
