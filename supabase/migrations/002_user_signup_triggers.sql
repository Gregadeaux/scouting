-- ============================================================================
-- Fix User Signup - Create Trigger to Auto-Create User Profiles
-- ============================================================================
-- This trigger automatically creates a user_profiles record when a new user
-- signs up through Supabase Auth, including their team_number from metadata

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile from auth.users data
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    display_name,
    primary_team_number,
    preferred_scout_name,
    role,
    is_active,
    email_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
    CASE
      WHEN NEW.raw_user_meta_data->>'team_number' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'team_number')::INTEGER
      ELSE NULL
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'scouter', -- Default role for new users (admins must be promoted manually)
    true,
    NEW.email_confirmed_at IS NOT NULL
  );

  -- If user has a team_number, also create a team_members entry
  IF NEW.raw_user_meta_data->>'team_number' IS NOT NULL THEN
    INSERT INTO public.team_members (
      user_id,
      team_number,
      team_role,
      can_submit_data,
      can_view_analytics,
      can_manage_team,
      is_active
    )
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'team_number')::INTEGER,
      'scouter',
      true,
      false,
      false,
      true
    )
    ON CONFLICT (user_id, team_number) DO NOTHING; -- Prevent duplicates
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.team_members TO authenticated;

-- Also create a function to update existing users who don't have profiles
-- (useful for fixing existing data)
CREATE OR REPLACE FUNCTION backfill_user_profiles()
RETURNS void AS $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN
    SELECT * FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.user_profiles)
  LOOP
    INSERT INTO public.user_profiles (
      id,
      email,
      full_name,
      display_name,
      primary_team_number,
      preferred_scout_name,
      role,
      is_active,
      email_verified
    )
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'full_name', ''),
      COALESCE(auth_user.raw_user_meta_data->>'display_name', auth_user.raw_user_meta_data->>'full_name'),
      CASE
        WHEN auth_user.raw_user_meta_data->>'team_number' IS NOT NULL
        THEN (auth_user.raw_user_meta_data->>'team_number')::INTEGER
        ELSE NULL
      END,
      COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.email),
      'scouter',
      true,
      auth_user.email_confirmed_at IS NOT NULL
    );

    -- If user has a team_number, create team_members entry
    IF auth_user.raw_user_meta_data->>'team_number' IS NOT NULL THEN
      INSERT INTO public.team_members (
        user_id,
        team_number,
        team_role,
        can_submit_data,
        can_view_analytics,
        can_manage_team,
        is_active
      )
      VALUES (
        auth_user.id,
        (auth_user.raw_user_meta_data->>'team_number')::INTEGER,
        'scouter',
        true,
        false,
        false,
        true
      )
      ON CONFLICT (user_id, team_number) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user_profiles and team_members entries when a new auth user signs up';
COMMENT ON FUNCTION backfill_user_profiles() IS 'Backfills user_profiles for existing auth users who do not have a profile';
