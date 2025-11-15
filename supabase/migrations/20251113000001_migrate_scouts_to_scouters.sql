-- ============================================================================
-- Migrate Scout Names to Scouter Foreign Keys
-- Created: 2025-11-13
--
-- This migration:
-- 1. Creates user accounts for each unique scout name
-- 2. Creates scouter records linked to those users
-- 3. Adds scouter_id column to match_scouting
-- 4. Updates match_scouting records to use scouter_id
-- 5. Makes scout_name nullable (keeping for historical reference)
-- ============================================================================

-- Step 1: Add scouter_id column to match_scouting (nullable initially)
ALTER TABLE match_scouting
ADD COLUMN IF NOT EXISTS scouter_id UUID REFERENCES scouters(id) ON DELETE SET NULL;

-- Step 2: Create a temporary function to extract team number from scout name
CREATE OR REPLACE FUNCTION extract_team_number(scout_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  team_num TEXT;
BEGIN
  -- Extract digits from the scout name (assumes format like "Name 930" or "Name930")
  team_num := (SELECT regexp_replace(scout_name, '[^0-9]', '', 'g'));

  -- Return NULL if no number found or empty
  IF team_num = '' THEN
    RETURN NULL;
  END IF;

  -- Return the last 3-4 digits as team number
  RETURN substring(team_num, length(team_num) - 3)::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Step 3: Create users and scouters for each unique scout name
DO $$
DECLARE
  scout_record RECORD;
  new_user_id UUID;
  new_scouter_id UUID;
  clean_name TEXT;
  team_num INTEGER;
  scout_email TEXT;
  match_count INTEGER;
BEGIN
  -- Loop through all unique scout names
  FOR scout_record IN
    SELECT DISTINCT
      scout_name,
      COUNT(*) as matches_scouted
    FROM match_scouting
    WHERE scout_name IS NOT NULL
      AND scout_name != ''
      AND scout_name != ' '
      AND scout_name NOT LIKE '%Scout%' -- Skip test scout names
    GROUP BY scout_name
  LOOP
    -- Clean up the scout name (remove extra spaces, newlines)
    clean_name := TRIM(regexp_replace(scout_record.scout_name, E'[\\n\\r]+', '', 'g'));

    -- Skip if name is still empty after cleaning
    IF clean_name = '' OR clean_name = ' ' THEN
      CONTINUE;
    END IF;

    -- Extract team number
    team_num := extract_team_number(clean_name);

    -- Generate email (lowercase, no spaces)
    scout_email := lower(regexp_replace(clean_name, '[^a-zA-Z0-9]', '', 'g')) || '@scouting.local';

    -- Check if user already exists with this email
    SELECT id INTO new_user_id
    FROM auth.users
    WHERE email = scout_email;

    -- Create user if doesn't exist
    IF new_user_id IS NULL THEN
      -- Insert into auth.users (Supabase Auth table)
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        uuid_generate_v4(),
        'authenticated',
        'authenticated',
        scout_email,
        crypt('changeme123', gen_salt('bf')), -- Default password (should be changed)
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('name', clean_name, 'imported_from_match_scouting', true),
        false,
        '',
        ''
      )
      RETURNING id INTO new_user_id;

      RAISE NOTICE 'Created user % with email %', clean_name, scout_email;
    ELSE
      RAISE NOTICE 'User already exists: %', scout_email;
    END IF;

    -- Check if scouter already exists
    SELECT id INTO new_scouter_id
    FROM scouters
    WHERE user_id = new_user_id;

    -- Create scouter record if doesn't exist
    IF new_scouter_id IS NULL THEN
      INSERT INTO scouters (
        user_id,
        team_number,
        experience_level,
        total_matches_scouted,
        total_events_attended
      ) VALUES (
        new_user_id,
        team_num,
        CASE
          WHEN scout_record.matches_scouted >= 20 THEN 'veteran'
          WHEN scout_record.matches_scouted >= 10 THEN 'intermediate'
          ELSE 'rookie'
        END,
        scout_record.matches_scouted,
        1 -- Assume at least 1 event
      )
      RETURNING id INTO new_scouter_id;

      RAISE NOTICE 'Created scouter % (team: %, matches: %)', clean_name, team_num, scout_record.matches_scouted;
    ELSE
      RAISE NOTICE 'Scouter already exists for user %', new_user_id;
    END IF;

    -- Update match_scouting records with scouter_id
    UPDATE match_scouting
    SET scouter_id = new_scouter_id
    WHERE scout_name = scout_record.scout_name
      AND scouter_id IS NULL;

    GET DIAGNOSTICS match_count = ROW_COUNT;
    RAISE NOTICE 'Updated % match_scouting records for %', match_count, clean_name;

  END LOOP;

  RAISE NOTICE 'Migration complete!';
END $$;

-- Step 4: Make scout_name nullable (keep for historical reference)
ALTER TABLE match_scouting
ALTER COLUMN scout_name DROP NOT NULL;

-- Step 5: Add index on scouter_id for performance
CREATE INDEX IF NOT EXISTS idx_match_scouting_scouter
ON match_scouting(scouter_id);

-- Step 6: Add comment explaining the change
COMMENT ON COLUMN match_scouting.scouter_id IS 'Foreign key to scouters table. Replaces scout_name string.';
COMMENT ON COLUMN match_scouting.scout_name IS 'Legacy scout name field. Kept for historical reference. Use scouter_id for new data.';

-- Step 7: Clean up temporary function
DROP FUNCTION IF EXISTS extract_team_number(TEXT);

-- ============================================================================
-- Verification Queries (run separately after migration)
-- ============================================================================

-- Verify scouters were created
-- SELECT COUNT(*) as total_scouters FROM scouters;

-- Verify match_scouting was updated
-- SELECT
--   COUNT(*) as total_records,
--   COUNT(scouter_id) as records_with_scouter_id,
--   COUNT(CASE WHEN scouter_id IS NULL THEN 1 END) as records_without_scouter_id
-- FROM match_scouting;

-- View scouters with their match counts
-- SELECT
--   u.email,
--   s.team_number,
--   s.experience_level,
--   s.total_matches_scouted,
--   COUNT(ms.id) as actual_matches
-- FROM scouters s
-- JOIN auth.users u ON u.id = s.user_id
-- LEFT JOIN match_scouting ms ON ms.scouter_id = s.id
-- GROUP BY u.email, s.team_number, s.experience_level, s.total_matches_scouted
-- ORDER BY actual_matches DESC;
