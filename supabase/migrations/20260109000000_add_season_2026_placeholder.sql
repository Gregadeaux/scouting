-- ============================================================================
-- Migration: Add 2026 Season Placeholder
-- Date: 2026-01-09
-- Description: Insert placeholder season_config row for 2026 season
--              Update with actual game details after January 10, 2026 reveal
-- ============================================================================

-- Insert 2026 season placeholder configuration
INSERT INTO season_config (
    year,
    game_name,
    game_description,
    match_duration_seconds,
    auto_duration_seconds,
    teleop_duration_seconds,
    kickoff_date,
    championship_start_date,
    championship_end_date,
    auto_schema,
    teleop_schema,
    endgame_schema,
    notes
)
VALUES (
    2026,
    'TBD',  -- Update after game reveal
    'PLACEHOLDER: Update with game description after the January 10, 2026 reveal.',
    150,    -- Standard match duration
    15,     -- Standard auto duration
    135,    -- Standard teleop duration
    '2026-01-10',   -- FRC Kickoff date
    '2026-04-15',   -- Estimated - update when announced
    '2026-04-18',   -- Estimated - update when announced
    -- Auto schema placeholder
    '{
        "type": "object",
        "required": ["schema_version", "left_starting_zone"],
        "properties": {
            "schema_version": {"type": "string", "const": "2026.1"},
            "left_starting_zone": {"type": "boolean"},
            "pieces_scored_low": {"type": "number", "minimum": 0},
            "pieces_scored_mid": {"type": "number", "minimum": 0},
            "pieces_scored_high": {"type": "number", "minimum": 0},
            "pieces_missed": {"type": "number", "minimum": 0},
            "preloaded_piece_type": {"type": "string", "enum": ["piece_a", "piece_b"]},
            "preloaded_piece_scored": {"type": "boolean"},
            "notes": {"type": "string"}
        }
    }'::jsonb,
    -- Teleop schema placeholder
    '{
        "type": "object",
        "required": ["schema_version", "cycles_completed"],
        "properties": {
            "schema_version": {"type": "string", "const": "2026.1"},
            "pieces_scored_low": {"type": "number", "minimum": 0},
            "pieces_scored_mid": {"type": "number", "minimum": 0},
            "pieces_scored_high": {"type": "number", "minimum": 0},
            "pieces_missed": {"type": "number", "minimum": 0},
            "cycles_completed": {"type": "number", "minimum": 0},
            "ground_pickups": {"type": "number", "minimum": 0},
            "station_pickups": {"type": "number", "minimum": 0},
            "defense_time_seconds": {"type": "number", "minimum": 0, "maximum": 135},
            "defense_effectiveness": {"type": "string", "enum": ["none", "minimal", "moderate", "effective", "dominant"]},
            "defended_by_opponent_seconds": {"type": "number", "minimum": 0, "maximum": 135},
            "penalties_caused": {"type": "number", "minimum": 0},
            "notes": {"type": "string"}
        }
    }'::jsonb,
    -- Endgame schema placeholder
    '{
        "type": "object",
        "required": ["schema_version", "endgame_points"],
        "properties": {
            "schema_version": {"type": "string", "const": "2026.1"},
            "endgame_attempted": {"type": "boolean"},
            "endgame_successful": {"type": "boolean"},
            "endgame_action_achieved": {"type": "string", "enum": ["action_1", "action_2", "action_3"]},
            "endgame_start_time_seconds": {"type": "number", "minimum": 120, "maximum": 150},
            "endgame_completion_time_seconds": {"type": "number", "minimum": 0, "maximum": 30},
            "endgame_points": {"type": "number", "minimum": 0},
            "cooperation_with_alliance": {"type": "string"},
            "notes": {"type": "string"}
        }
    }'::jsonb,
    'PLACEHOLDER: This is a stub configuration. Update all fields after the 2026 FRC game reveal on January 10, 2026.'
)
ON CONFLICT (year) DO UPDATE SET
    game_name = EXCLUDED.game_name,
    game_description = EXCLUDED.game_description,
    match_duration_seconds = EXCLUDED.match_duration_seconds,
    auto_duration_seconds = EXCLUDED.auto_duration_seconds,
    teleop_duration_seconds = EXCLUDED.teleop_duration_seconds,
    kickoff_date = EXCLUDED.kickoff_date,
    championship_start_date = EXCLUDED.championship_start_date,
    championship_end_date = EXCLUDED.championship_end_date,
    auto_schema = EXCLUDED.auto_schema,
    teleop_schema = EXCLUDED.teleop_schema,
    endgame_schema = EXCLUDED.endgame_schema,
    notes = EXCLUDED.notes;

-- Add comment for documentation
COMMENT ON COLUMN season_config.notes IS 'Notes about the season configuration. For 2026: This is a placeholder until game reveal.';
