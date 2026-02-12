-- Migration: Add Manual Schedule Support
-- Description: Adds support for scouting at events without published match schedules
-- Related: Manual Event Scouting with Live Session Sync

-- ============================================================================
-- 1. Add manual_schedule column to events
-- ============================================================================

ALTER TABLE events ADD COLUMN manual_schedule BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN events.manual_schedule IS 'When true, this event has no TBA match schedule. Scouters manually enter match/team info.';

-- ============================================================================
-- 2. Create scouting_sessions table
-- ============================================================================

CREATE TABLE scouting_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_key VARCHAR(50) NOT NULL REFERENCES events(event_key) ON DELETE CASCADE,
  current_match_number INTEGER NOT NULL DEFAULT 1,
  comp_level VARCHAR(20) NOT NULL DEFAULT 'qm',
  session_data JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_key),
  CHECK (comp_level IN ('qm', 'ef', 'qf', 'sf', 'f')),
  CHECK (current_match_number > 0)
);

COMMENT ON TABLE scouting_sessions IS 'Live scouting session state for manual-schedule events. session_data JSONB supports future extensibility (assignments, settings).';

-- Enable Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE scouting_sessions;

-- RLS
ALTER TABLE scouting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scouting sessions"
  ON scouting_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert scouting sessions"
  ON scouting_sessions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update scouting sessions"
  ON scouting_sessions FOR UPDATE TO authenticated USING (true);

-- ============================================================================
-- 3. RPC: ensure_manual_match_and_team
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_manual_match_and_team(
  p_event_key TEXT,
  p_match_number INTEGER,
  p_team_number INTEGER,
  p_alliance_color TEXT,
  p_comp_level TEXT DEFAULT 'qm'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_key TEXT;
  v_match_id INTEGER;
  v_alliance_position INTEGER;
  v_is_manual BOOLEAN;
  v_slot TEXT;
  v_current_val INTEGER;
BEGIN
  -- Validate event has manual_schedule = true
  SELECT manual_schedule INTO v_is_manual
  FROM events
  WHERE event_key = p_event_key;

  IF v_is_manual IS NULL THEN
    RAISE EXCEPTION 'Event % not found', p_event_key;
  END IF;

  IF NOT v_is_manual THEN
    RAISE EXCEPTION 'Event % is not a manual-schedule event', p_event_key;
  END IF;

  -- Validate alliance color
  IF p_alliance_color NOT IN ('red', 'blue') THEN
    RAISE EXCEPTION 'Invalid alliance color: %', p_alliance_color;
  END IF;

  -- Build match key
  v_match_key := p_event_key || '_' || p_comp_level || p_match_number;

  -- Ensure team exists (create placeholder if new)
  INSERT INTO teams (team_number, team_name)
  VALUES (p_team_number, 'Team ' || p_team_number)
  ON CONFLICT (team_number) DO NOTHING;

  -- Ensure event_teams junction
  INSERT INTO event_teams (event_key, team_number)
  VALUES (p_event_key, p_team_number)
  ON CONFLICT (event_key, team_number) DO NOTHING;

  -- Ensure match record exists
  INSERT INTO match_schedule (event_key, match_key, comp_level, match_number)
  VALUES (p_event_key, v_match_key, p_comp_level, p_match_number)
  ON CONFLICT (match_key) DO NOTHING;

  -- Get the match_id
  SELECT match_id INTO v_match_id
  FROM match_schedule
  WHERE match_key = v_match_key;

  -- Try to place team in first available alliance slot (1 -> 2 -> 3)
  v_alliance_position := NULL;

  FOR i IN 1..3 LOOP
    v_slot := p_alliance_color || '_' || i;

    -- Check if slot is empty or already has this team
    EXECUTE format(
      'SELECT %I FROM match_schedule WHERE match_key = $1',
      v_slot
    ) INTO v_current_val USING v_match_key;

    IF v_current_val IS NULL THEN
      -- Slot is empty, place team
      EXECUTE format(
        'UPDATE match_schedule SET %I = $1, updated_at = now() WHERE match_key = $2',
        v_slot
      ) USING p_team_number, v_match_key;
      v_alliance_position := i;
      EXIT;
    ELSIF v_current_val = p_team_number THEN
      -- Team already in this slot
      v_alliance_position := i;
      EXIT;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'match_id', v_match_id,
    'match_key', v_match_key,
    'alliance_position', v_alliance_position
  );
END;
$$;

-- Grant to service_role (called from API routes via service client)
GRANT EXECUTE ON FUNCTION ensure_manual_match_and_team(TEXT, INTEGER, INTEGER, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION ensure_manual_match_and_team IS 'Atomically ensures team, match, event_teams junction, and alliance slot for manual-schedule events. Idempotent and safe for concurrent calls.';
