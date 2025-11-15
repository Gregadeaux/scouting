-- ============================================================================
-- ELO Scouter Ranking and Validation System
-- Created: 2025-11-13
--
-- This migration creates the infrastructure for validating scouter accuracy
-- and calculating ELO ratings based on consensus and TBA data validation.
-- ============================================================================

-- ============================================================================
-- TABLE: scouter_elo_ratings
-- Tracks current and historical ELO ratings for each scouter per season
-- ============================================================================
CREATE TABLE IF NOT EXISTS scouter_elo_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scouter_id UUID NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,

  -- Season context
  season_year INTEGER NOT NULL,

  -- Current rating
  current_elo DECIMAL(8,2) NOT NULL DEFAULT 1500.00,
  peak_elo DECIMAL(8,2) NOT NULL DEFAULT 1500.00,
  lowest_elo DECIMAL(8,2) NOT NULL DEFAULT 1500.00,

  -- Rating confidence (0.0 to 1.0)
  -- Higher confidence = more validations = more stable rating
  confidence_level DECIMAL(4,2) NOT NULL DEFAULT 0.50 CHECK (confidence_level BETWEEN 0 AND 1),

  -- Performance tracking
  total_validations INTEGER NOT NULL DEFAULT 0,
  successful_validations INTEGER NOT NULL DEFAULT 0, -- exact_match or close_match
  failed_validations INTEGER NOT NULL DEFAULT 0, -- mismatch

  -- Metadata
  last_validation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One rating per scouter per season
  UNIQUE(scouter_id, season_year)
);

-- Indexes for performance
CREATE INDEX idx_scouter_elo_scouter ON scouter_elo_ratings(scouter_id);
CREATE INDEX idx_scouter_elo_rating ON scouter_elo_ratings(current_elo DESC);
CREATE INDEX idx_scouter_elo_season ON scouter_elo_ratings(season_year);
CREATE INDEX idx_scouter_elo_confidence ON scouter_elo_ratings(confidence_level DESC);

-- RLS Policies
ALTER TABLE scouter_elo_ratings ENABLE ROW LEVEL SECURITY;

-- Scouters can view their own ratings
CREATE POLICY "Scouters can view their own ELO ratings"
  ON scouter_elo_ratings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scouters
      WHERE scouters.id = scouter_elo_ratings.scouter_id
      AND scouters.user_id = auth.uid()
    )
  );

-- Scouters can view ratings within their team (leaderboard)
CREATE POLICY "Scouters can view team leaderboards"
  ON scouter_elo_ratings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
    )
  );

-- Admins can manage all ratings
CREATE POLICY "Admins can manage all ELO ratings"
  ON scouter_elo_ratings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_role = 'admin'
    )
  );

-- ============================================================================
-- TABLE: scouter_elo_history
-- Audit trail of all ELO rating changes with context
-- ============================================================================
CREATE TABLE IF NOT EXISTS scouter_elo_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scouter_id UUID NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,

  -- Rating change
  elo_before DECIMAL(8,2) NOT NULL,
  elo_after DECIMAL(8,2) NOT NULL,
  elo_delta DECIMAL(8,2) NOT NULL,

  -- Validation context (will be created next)
  validation_id UUID NOT NULL, -- FK to validation_results added after table creation
  validation_type VARCHAR(50) NOT NULL, -- 'consensus', 'tba', 'manual'

  -- Performance details
  accuracy_score DECIMAL(4,2), -- 0.00 to 1.00
  outcome VARCHAR(20) NOT NULL, -- 'gain', 'neutral', 'loss'

  -- Context
  match_key VARCHAR(100),
  team_number INTEGER,
  event_key VARCHAR(50),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (validation_type IN ('consensus', 'tba', 'manual')),
  CHECK (outcome IN ('gain', 'neutral', 'loss'))
);

-- Indexes for querying history
CREATE INDEX idx_elo_history_scouter ON scouter_elo_history(scouter_id, created_at DESC);
CREATE INDEX idx_elo_history_validation ON scouter_elo_history(validation_id);
CREATE INDEX idx_elo_history_match ON scouter_elo_history(match_key);
CREATE INDEX idx_elo_history_event ON scouter_elo_history(event_key);
CREATE INDEX idx_elo_history_outcome ON scouter_elo_history(outcome);

-- RLS Policies
ALTER TABLE scouter_elo_history ENABLE ROW LEVEL SECURITY;

-- Scouters can view their own history
CREATE POLICY "Scouters can view their own ELO history"
  ON scouter_elo_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scouters
      WHERE scouters.id = scouter_elo_history.scouter_id
      AND scouters.user_id = auth.uid()
    )
  );

-- Admins can view all history
CREATE POLICY "Admins can view all ELO history"
  ON scouter_elo_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_role = 'admin'
    )
  );

-- ============================================================================
-- TABLE: validation_results
-- Stores field-level validation outcomes for each scouter
-- ============================================================================
CREATE TABLE IF NOT EXISTS validation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Validation metadata
  validation_type VARCHAR(50) NOT NULL,
  validation_method VARCHAR(100) NOT NULL, -- Class name (e.g., 'ConsensusValidationStrategy')
  execution_id UUID NOT NULL, -- Groups validations from same batch run

  -- Match/Team context
  match_key VARCHAR(100),
  team_number INTEGER,
  event_key VARCHAR(50) NOT NULL REFERENCES events(event_key) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,

  -- Field-level validation
  field_path TEXT NOT NULL, -- e.g., "auto_performance.coral_scored_L1"
  expected_value JSONB, -- Consensus or TBA value
  actual_value JSONB, -- Scouter's submitted value

  -- Scouter being validated
  scouter_id UUID NOT NULL REFERENCES scouters(id) ON DELETE CASCADE,
  match_scouting_id UUID REFERENCES match_scouting(id) ON DELETE SET NULL,

  -- Outcome
  validation_outcome VARCHAR(20) NOT NULL, -- 'exact_match', 'close_match', 'mismatch'
  accuracy_score DECIMAL(4,2) NOT NULL CHECK (accuracy_score BETWEEN 0 AND 1),

  -- Additional context
  confidence_level DECIMAL(4,2), -- How confident is the validation source? (0-1)
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (validation_type IN ('consensus', 'tba', 'manual')),
  CHECK (validation_outcome IN ('exact_match', 'close_match', 'mismatch'))
);

-- Indexes for querying validation results
CREATE INDEX idx_validation_scouter ON validation_results(scouter_id, created_at DESC);
CREATE INDEX idx_validation_execution ON validation_results(execution_id);
CREATE INDEX idx_validation_match ON validation_results(match_key);
CREATE INDEX idx_validation_team ON validation_results(team_number);
CREATE INDEX idx_validation_event ON validation_results(event_key);
CREATE INDEX idx_validation_type ON validation_results(validation_type);
CREATE INDEX idx_validation_outcome ON validation_results(validation_outcome);
CREATE INDEX idx_validation_field ON validation_results(field_path);

-- RLS Policies
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;

-- Scouters can view their own validation results
CREATE POLICY "Scouters can view their own validation results"
  ON validation_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scouters
      WHERE scouters.id = validation_results.scouter_id
      AND scouters.user_id = auth.uid()
    )
  );

-- Admins can view all validation results
CREATE POLICY "Admins can view all validation results"
  ON validation_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_role IN ('admin', 'mentor')
    )
  );

-- Admins can create validation results (system-generated)
CREATE POLICY "Admins can create validation results"
  ON validation_results
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_role = 'admin'
    )
  );

-- ============================================================================
-- TABLE: validation_consensus
-- Stores accepted consensus values for team/match/field combinations
-- ============================================================================
CREATE TABLE IF NOT EXISTS validation_consensus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Context
  match_key VARCHAR(100) NOT NULL,
  team_number INTEGER NOT NULL,
  event_key VARCHAR(50) NOT NULL REFERENCES events(event_key) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,

  -- Field identification
  field_path TEXT NOT NULL, -- e.g., "teleop_performance.algae_scored_barge"

  -- Consensus value
  consensus_value JSONB NOT NULL,
  consensus_method VARCHAR(50) NOT NULL, -- 'mode', 'weighted_average', 'majority_vote', 'median'

  -- Participating scouts
  scout_count INTEGER NOT NULL CHECK (scout_count >= 1),
  scouter_ids UUID[] NOT NULL,

  -- Confidence metrics
  agreement_percentage DECIMAL(5,2), -- % of scouts who agreed with consensus
  standard_deviation DECIMAL(10,4), -- For numeric fields
  outlier_count INTEGER DEFAULT 0,

  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_id UUID NOT NULL, -- Links to validation execution batch

  -- One consensus per match/team/field combination
  UNIQUE(match_key, team_number, field_path),
  CHECK (consensus_method IN ('mode', 'weighted_average', 'majority_vote', 'median'))
);

-- Indexes for querying consensus
CREATE INDEX idx_consensus_match_team ON validation_consensus(match_key, team_number);
CREATE INDEX idx_consensus_event ON validation_consensus(event_key);
CREATE INDEX idx_consensus_field ON validation_consensus(field_path);
CREATE INDEX idx_consensus_execution ON validation_consensus(execution_id);
CREATE INDEX idx_consensus_agreement ON validation_consensus(agreement_percentage DESC);

-- RLS Policies
ALTER TABLE validation_consensus ENABLE ROW LEVEL SECURITY;

-- Team members can view consensus for their events
CREATE POLICY "Team members can view consensus data"
  ON validation_consensus
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
    )
  );

-- Admins can manage consensus data
CREATE POLICY "Admins can manage consensus data"
  ON validation_consensus
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_role = 'admin'
    )
  );

-- ============================================================================
-- Add foreign key constraint from scouter_elo_history to validation_results
-- (Must be done after validation_results table exists)
-- ============================================================================
ALTER TABLE scouter_elo_history
ADD CONSTRAINT fk_elo_history_validation
FOREIGN KEY (validation_id)
REFERENCES validation_results(id)
ON DELETE CASCADE;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate confidence level based on validation count
CREATE OR REPLACE FUNCTION calculate_elo_confidence(validation_count INTEGER)
RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Confidence increases logarithmically with validations
  -- 0 validations = 0.50 confidence
  -- 10 validations = 0.70 confidence
  -- 30 validations = 0.80 confidence
  -- 100+ validations = 0.95 confidence
  RETURN LEAST(
    0.95,
    0.50 + (0.45 * (LN(validation_count + 1) / LN(100)))
  );
END;
$$;

-- Function to update ELO rating updated_at timestamp
CREATE OR REPLACE FUNCTION update_elo_rating_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_elo_rating_timestamp
BEFORE UPDATE ON scouter_elo_ratings
FOR EACH ROW
EXECUTE FUNCTION update_elo_rating_timestamp();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on tables
GRANT SELECT, INSERT, UPDATE ON scouter_elo_ratings TO authenticated;
GRANT SELECT ON scouter_elo_history TO authenticated;
GRANT SELECT, INSERT ON validation_results TO authenticated;
GRANT SELECT ON validation_consensus TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE scouter_elo_ratings IS 'Season-level ELO ratings for scouters based on validation accuracy';
COMMENT ON TABLE scouter_elo_history IS 'Audit trail of all ELO rating changes with validation context';
COMMENT ON TABLE validation_results IS 'Field-level validation outcomes comparing scouter data vs consensus/TBA';
COMMENT ON TABLE validation_consensus IS 'Accepted consensus values calculated from multiple scouter observations';

COMMENT ON COLUMN scouter_elo_ratings.confidence_level IS 'Rating confidence (0-1) based on validation count';
COMMENT ON COLUMN scouter_elo_ratings.peak_elo IS 'Highest rating achieved in this season';
COMMENT ON COLUMN scouter_elo_ratings.lowest_elo IS 'Lowest rating achieved in this season';

COMMENT ON COLUMN validation_results.field_path IS 'Dot-notation path to JSONB field, e.g., auto_performance.coral_scored_L1';
COMMENT ON COLUMN validation_results.accuracy_score IS 'Numeric accuracy score 0.0-1.0 (1.0 = perfect match)';
COMMENT ON COLUMN validation_results.execution_id IS 'UUID grouping validations from same batch run';

COMMENT ON COLUMN validation_consensus.consensus_method IS 'Statistical method used: mode, weighted_average, majority_vote, median';
COMMENT ON COLUMN validation_consensus.agreement_percentage IS 'Percentage of scouts who agreed with final consensus value';
