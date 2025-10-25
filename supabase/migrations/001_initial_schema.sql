-- ============================================================================
-- FRC Scouting System - Championship-Level Database Schema
-- ============================================================================
-- Based on research from Team 1678 (Citrus Circuits) and elite FRC programs
-- PostgreSQL + JSONB hybrid architecture for season-agnostic flexibility
--
-- Architecture: Structure the evergreen, flex the specific
-- - Core entities (teams, events, matches) use traditional relational tables
-- - Season-specific data (scoring, capabilities) uses JSONB columns
-- - Multi-scout support with consolidation views
-- - Predictive analytics with calculated statistics
-- - Offline sync support for unreliable venue WiFi
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- CORE RELATIONAL TABLES (Evergreen Data)
-- ============================================================================

-- Teams: Never changes across seasons
CREATE TABLE IF NOT EXISTS teams (
    team_number INTEGER PRIMARY KEY CHECK (team_number > 0 AND team_number < 100000),
    team_key VARCHAR(20) UNIQUE NOT NULL GENERATED ALWAYS AS ('frc' || team_number::TEXT) STORED,
    team_name VARCHAR(255) NOT NULL,
    team_nickname VARCHAR(100),
    city VARCHAR(100),
    state_province VARCHAR(50),
    country VARCHAR(50) DEFAULT 'USA',
    postal_code VARCHAR(20),
    rookie_year INTEGER CHECK (rookie_year >= 1992 AND rookie_year <= EXTRACT(YEAR FROM CURRENT_DATE)),
    website VARCHAR(255),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teams_location ON teams(state_province, country);
CREATE INDEX idx_teams_rookie ON teams(rookie_year);
COMMENT ON TABLE teams IS 'FRC teams with stable identification data that persists across seasons';

-- Events: Competition structure remains consistent
CREATE TABLE IF NOT EXISTS events (
    event_key VARCHAR(50) PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_code VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1992),
    event_type VARCHAR(50) NOT NULL,
    district VARCHAR(50),
    week INTEGER CHECK (week BETWEEN 0 AND 8),

    -- Location
    city VARCHAR(100),
    state_province VARCHAR(50),
    country VARCHAR(50),

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CHECK (end_date >= start_date),
    CHECK (event_type IN ('regional', 'district', 'district_championship',
                          'championship_subdivision', 'championship', 'offseason'))
);

CREATE INDEX idx_events_year ON events(year);
CREATE INDEX idx_events_district ON events(district, year);
CREATE INDEX idx_events_dates ON events(start_date, end_date);
COMMENT ON TABLE events IS 'FRC competitions with consistent structure across years';

-- Match Schedule: Official match data from The Blue Alliance
CREATE TABLE IF NOT EXISTS match_schedule (
    match_id SERIAL PRIMARY KEY,
    event_key VARCHAR(50) NOT NULL REFERENCES events(event_key) ON DELETE CASCADE,
    match_key VARCHAR(100) UNIQUE NOT NULL,
    comp_level VARCHAR(20) NOT NULL,
    set_number INTEGER,
    match_number INTEGER NOT NULL CHECK (match_number > 0),

    -- Alliance Composition (individual team references)
    red_1 INTEGER REFERENCES teams(team_number),
    red_2 INTEGER REFERENCES teams(team_number),
    red_3 INTEGER REFERENCES teams(team_number),
    blue_1 INTEGER REFERENCES teams(team_number),
    blue_2 INTEGER REFERENCES teams(team_number),
    blue_3 INTEGER REFERENCES teams(team_number),

    -- Official Results (from TBA API)
    red_score INTEGER CHECK (red_score >= 0),
    blue_score INTEGER CHECK (blue_score >= 0),
    winning_alliance VARCHAR(10),

    -- Timing
    scheduled_time TIMESTAMP WITH TIME ZONE,
    actual_time TIMESTAMP WITH TIME ZONE,
    post_result_time TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CHECK (comp_level IN ('qm', 'ef', 'qf', 'sf', 'f')),
    CHECK (winning_alliance IN ('red', 'blue', 'tie', NULL))
);

CREATE INDEX idx_match_event ON match_schedule(event_key);
CREATE INDEX idx_match_comp_level ON match_schedule(comp_level);
CREATE INDEX idx_match_number ON match_schedule(match_number);
CREATE INDEX idx_match_teams ON match_schedule(red_1, red_2, red_3, blue_1, blue_2, blue_3);
COMMENT ON TABLE match_schedule IS 'Official match schedule with alliance composition and results';

-- ============================================================================
-- HYBRID SCOUTING TABLES (JSONB for Season-Specific Data)
-- ============================================================================

-- Match Scouting: Multi-scout observations with JSONB flexibility
CREATE TABLE IF NOT EXISTS match_scouting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id INTEGER NOT NULL REFERENCES match_schedule(match_id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL REFERENCES teams(team_number),
    scout_name VARCHAR(100) NOT NULL,
    device_id VARCHAR(50),

    -- Fixed Universal Fields (never change across seasons)
    alliance_color VARCHAR(10) NOT NULL,
    starting_position INTEGER CHECK (starting_position BETWEEN 1 AND 3),

    -- Universal Reliability Tracking
    robot_disconnected BOOLEAN DEFAULT false,
    robot_disabled BOOLEAN DEFAULT false,
    robot_tipped BOOLEAN DEFAULT false,
    foul_count INTEGER DEFAULT 0 CHECK (foul_count >= 0),
    tech_foul_count INTEGER DEFAULT 0 CHECK (tech_foul_count >= 0),
    yellow_card BOOLEAN DEFAULT false,
    red_card BOOLEAN DEFAULT false,

    -- Flexible Season-Specific Performance (JSONB)
    auto_performance JSONB NOT NULL DEFAULT '{}',
    teleop_performance JSONB NOT NULL DEFAULT '{}',
    endgame_performance JSONB NOT NULL DEFAULT '{}',

    -- Universal Qualitative Assessments (1-5 scale)
    defense_rating INTEGER CHECK (defense_rating BETWEEN 1 AND 5),
    driver_skill_rating INTEGER CHECK (driver_skill_rating BETWEEN 1 AND 5),
    speed_rating INTEGER CHECK (speed_rating BETWEEN 1 AND 5),

    -- Free-form observations
    strengths TEXT,
    weaknesses TEXT,
    notes TEXT,

    -- Scout Performance Tracking
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(match_id, team_number, scout_name),
    CHECK (alliance_color IN ('red', 'blue'))
);

-- Indexes for match scouting
CREATE INDEX idx_ms_team ON match_scouting(team_number);
CREATE INDEX idx_ms_match ON match_scouting(match_id);
CREATE INDEX idx_ms_scout ON match_scouting(scout_name);
CREATE INDEX idx_ms_alliance ON match_scouting(alliance_color);
CREATE INDEX idx_ms_created ON match_scouting(created_at);

-- GIN indexes for efficient JSONB queries
CREATE INDEX idx_ms_auto_gin ON match_scouting USING GIN (auto_performance);
CREATE INDEX idx_ms_teleop_gin ON match_scouting USING GIN (teleop_performance);
CREATE INDEX idx_ms_endgame_gin ON match_scouting USING GIN (endgame_performance);

-- Expression indexes for frequently-queried JSONB paths (add as patterns emerge)
-- Example for 2025: mobility tracking
-- CREATE INDEX idx_auto_mobility ON match_scouting
--     ((auto_performance->>'left_starting_zone')::BOOLEAN)
--     WHERE auto_performance ? 'left_starting_zone';

COMMENT ON TABLE match_scouting IS 'Multi-scout match observations with JSONB for season-specific metrics';
COMMENT ON COLUMN match_scouting.auto_performance IS 'Season-specific autonomous period data in JSONB format';
COMMENT ON COLUMN match_scouting.teleop_performance IS 'Season-specific teleoperated period data in JSONB format';
COMMENT ON COLUMN match_scouting.endgame_performance IS 'Season-specific endgame data in JSONB format';

-- Pit Scouting: Pre-competition robot assessment
CREATE TABLE IF NOT EXISTS pit_scouting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_number INTEGER NOT NULL REFERENCES teams(team_number),
    event_key VARCHAR(50) NOT NULL REFERENCES events(event_key) ON DELETE CASCADE,

    -- Fixed Physical Characteristics (relatively stable)
    drive_train VARCHAR(50),
    drive_motors VARCHAR(100),
    programming_language VARCHAR(50),
    robot_weight_lbs DECIMAL(5,2) CHECK (robot_weight_lbs <= 125),
    height_inches DECIMAL(4,1) CHECK (height_inches <= 78),
    width_inches DECIMAL(4,1),
    length_inches DECIMAL(4,1),

    -- Year-Specific Capabilities (JSONB for flexibility)
    robot_capabilities JSONB DEFAULT '{}',
    autonomous_capabilities JSONB DEFAULT '{}',

    -- Media and Documentation
    photo_urls TEXT[],
    robot_features TEXT,
    team_strategy TEXT,
    preferred_starting_position INTEGER,

    -- Interview Notes
    team_goals TEXT,
    team_comments TEXT,
    scouting_notes TEXT,

    -- Metadata
    scouted_by VARCHAR(100) NOT NULL,
    scouted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(team_number, event_key)
);

CREATE INDEX idx_ps_team ON pit_scouting(team_number);
CREATE INDEX idx_ps_event ON pit_scouting(event_key);
CREATE INDEX idx_ps_drivetrain ON pit_scouting(drive_train);
CREATE INDEX idx_ps_capabilities_gin ON pit_scouting USING GIN (robot_capabilities);
CREATE INDEX idx_ps_auto_cap_gin ON pit_scouting USING GIN (autonomous_capabilities);

COMMENT ON TABLE pit_scouting IS 'Pre-competition robot assessment with capabilities in JSONB';
COMMENT ON COLUMN pit_scouting.robot_capabilities IS 'Season-specific robot capabilities (scoring mechanisms, game piece handling, etc.)';
COMMENT ON COLUMN pit_scouting.autonomous_capabilities IS 'Autonomous routine capabilities and preferences';

-- ============================================================================
-- CONFIGURATION & METADATA
-- ============================================================================

-- Season Configuration: Track yearly game schemas
CREATE TABLE IF NOT EXISTS season_config (
    year INTEGER PRIMARY KEY CHECK (year >= 2020),
    game_name VARCHAR(100) NOT NULL,
    game_description TEXT,

    -- JSON Schemas for validation
    auto_schema JSONB,
    teleop_schema JSONB,
    endgame_schema JSONB,
    capabilities_schema JSONB,

    -- Game Configuration
    match_duration_seconds INTEGER DEFAULT 150,
    auto_duration_seconds INTEGER DEFAULT 15,
    teleop_duration_seconds INTEGER DEFAULT 135,

    -- Configuration metadata
    kickoff_date DATE,
    championship_start_date DATE,
    championship_end_date DATE,

    -- Documentation
    rules_manual_url VARCHAR(255),
    game_animation_url VARCHAR(255),
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE season_config IS 'Year-specific game configurations and JSONB validation schemas';

-- ============================================================================
-- ANALYTICS & STATISTICS
-- ============================================================================

-- Team Statistics: Calculated predictive metrics
CREATE TABLE IF NOT EXISTS team_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_number INTEGER NOT NULL REFERENCES teams(team_number),
    event_key VARCHAR(50) NOT NULL REFERENCES events(event_key) ON DELETE CASCADE,

    -- Match Count
    matches_scouted INTEGER DEFAULT 0,
    matches_played_official INTEGER DEFAULT 0,

    -- Average Scores
    avg_total_score DECIMAL(6,2),
    avg_auto_score DECIMAL(6,2),
    avg_teleop_score DECIMAL(6,2),
    avg_endgame_score DECIMAL(6,2),

    -- Calculated Ratings (per Team 1678 methodology)
    opr DECIMAL(7,2), -- Offensive Power Rating
    dpr DECIMAL(7,2), -- Defensive Power Rating
    ccwm DECIMAL(7,2), -- Calculated Contribution to Winning Margin

    -- Success Rates
    endgame_success_rate DECIMAL(5,2) CHECK (endgame_success_rate BETWEEN 0 AND 100),
    auto_mobility_rate DECIMAL(5,2) CHECK (auto_mobility_rate BETWEEN 0 AND 100),
    reliability_score DECIMAL(5,2) CHECK (reliability_score BETWEEN 0 AND 100),

    -- Qualitative Averages
    avg_defense_rating DECIMAL(3,2),
    avg_driver_skill DECIMAL(3,2),
    avg_speed_rating DECIMAL(3,2),

    -- Pick List Rankings
    first_pick_ability DECIMAL(7,2),
    second_pick_ability DECIMAL(7,2),
    overall_rank INTEGER,

    -- Calculation Metadata
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    calculation_method VARCHAR(50) DEFAULT 'standard',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(team_number, event_key)
);

CREATE INDEX idx_ts_team ON team_statistics(team_number);
CREATE INDEX idx_ts_event ON team_statistics(event_key);
CREATE INDEX idx_ts_opr ON team_statistics(opr DESC NULLS LAST);
CREATE INDEX idx_ts_first_pick ON team_statistics(first_pick_ability DESC NULLS LAST);

COMMENT ON TABLE team_statistics IS 'Calculated predictive metrics and statistical aggregations per team per event';

-- ============================================================================
-- OFFLINE SYNC SUPPORT
-- ============================================================================

-- Sync Queue: For QR code and offline-first data collection
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    data_payload JSONB NOT NULL,

    -- Sync Status
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'processing', 'synced', 'failed', 'conflict')),
    sync_error TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE,

    -- Conflict Resolution
    conflicts JSONB,
    resolved_by VARCHAR(100),
    resolution_notes TEXT
);

CREATE INDEX idx_sync_status ON sync_queue(sync_status, created_at);
CREATE INDEX idx_sync_device ON sync_queue(device_id);
CREATE INDEX idx_sync_type ON sync_queue(data_type);

COMMENT ON TABLE sync_queue IS 'Offline data synchronization queue for QR codes and unreliable network scenarios';

-- ============================================================================
-- VIEWS FOR DATA CONSOLIDATION
-- ============================================================================

-- Consolidated Match Data: Multi-scout aggregation
CREATE OR REPLACE VIEW consolidated_match_data AS
SELECT
    ms.match_id,
    ms.team_number,
    ms.alliance_color,
    m.event_key,
    e.year,

    -- Scout Count
    COUNT(DISTINCT ms.scout_name) as scout_count,

    -- Majority vote for booleans
    MODE() WITHIN GROUP (ORDER BY ms.robot_disconnected) as robot_disconnected,
    MODE() WITHIN GROUP (ORDER BY ms.robot_disabled) as robot_disabled,
    MODE() WITHIN GROUP (ORDER BY ms.robot_tipped) as robot_tipped,

    -- Average fouls
    ROUND(AVG(ms.foul_count)) as avg_foul_count,
    ROUND(AVG(ms.tech_foul_count)) as avg_tech_foul_count,

    -- Average ratings
    ROUND(AVG(ms.defense_rating), 1) as avg_defense_rating,
    ROUND(AVG(ms.driver_skill_rating), 1) as avg_driver_skill,
    ROUND(AVG(ms.speed_rating), 1) as avg_speed_rating,

    -- JSONB aggregation (merge multiple scout observations)
    jsonb_agg(ms.auto_performance) as all_auto_data,
    jsonb_agg(ms.teleop_performance) as all_teleop_data,
    jsonb_agg(ms.endgame_performance) as all_endgame_data,

    -- Combined notes
    STRING_AGG(ms.notes, ' | ' ORDER BY ms.scout_name) as combined_notes,
    STRING_AGG(ms.scout_name, ', ' ORDER BY ms.scout_name) as scouts,

    -- Timing
    MAX(ms.created_at) as last_updated
FROM match_scouting ms
JOIN match_schedule m ON ms.match_id = m.match_id
JOIN events e ON m.event_key = e.event_key
GROUP BY ms.match_id, ms.team_number, ms.alliance_color, m.event_key, e.year;

COMMENT ON VIEW consolidated_match_data IS 'Aggregated multi-scout observations with majority voting and averaging';

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_schedule_updated_at
    BEFORE UPDATE ON match_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_scouting_updated_at
    BEFORE UPDATE ON match_scouting
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pit_scouting_updated_at
    BEFORE UPDATE ON pit_scouting
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_season_config_updated_at
    BEFORE UPDATE ON season_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_statistics_updated_at
    BEFORE UPDATE ON team_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert sample teams
INSERT INTO teams (team_number, team_name, team_nickname, city, state_province, country, rookie_year)
VALUES
    (254, 'The Cheesy Poofs', 'Cheesy Poofs', 'San Jose', 'CA', 'USA', 1999),
    (1678, 'Citrus Circuits', 'Citrus Circuits', 'Davis', 'CA', 'USA', 2005),
    (1114, 'Simbotics', 'Simbotics', 'St. Catharines', 'ON', 'Canada', 2003),
    (930, 'Mukwonago BEARs', 'BEARs', 'Mukwonago', 'WI', 'USA', 2002),
    (118, 'The Robonauts', 'Robonauts', 'Houston', 'TX', 'USA', 1996)
ON CONFLICT (team_number) DO NOTHING;

-- Insert 2025 season configuration with Reefscape game
INSERT INTO season_config (
    year,
    game_name,
    game_description,
    kickoff_date,
    championship_start_date,
    championship_end_date
)
VALUES (
    2025,
    'Reefscape',
    'Robots score Coral (PVC pipes) and Algae (inflatable balls) on Reef structures, manage Processors, and complete Barge parking or Cage climbing in endgame.',
    '2025-01-04',
    '2025-04-16',
    '2025-04-19'
)
ON CONFLICT (year) DO UPDATE SET
    game_name = EXCLUDED.game_name,
    game_description = EXCLUDED.game_description,
    kickoff_date = EXCLUDED.kickoff_date,
    championship_start_date = EXCLUDED.championship_start_date,
    championship_end_date = EXCLUDED.championship_end_date;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

-- Grant permissions (adjust as needed for your Supabase setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
