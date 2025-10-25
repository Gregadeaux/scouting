-- ============================================================================
-- Authentication Helper Functions (OPTIONAL)
-- ============================================================================
-- NOTE: These database functions are OPTIONAL. The auth checks are now handled
-- directly in TypeScript for better developer experience.
--
-- You can run this file if you prefer to use database functions for performance,
-- but it's not required for the admin panel to work.
--
-- To use: Run this file in your Supabase SQL Editor

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id;

  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is a mentor for a specific team
CREATE OR REPLACE FUNCTION is_team_mentor(user_id UUID, team_num INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  is_mentor BOOLEAN;
BEGIN
  -- Check if user is admin (admins have access to everything)
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id;

  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a mentor for this specific team
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_members.user_id = is_team_mentor.user_id
      AND team_members.team_number = team_num
      AND team_members.team_role = 'mentor'
      AND team_members.is_active = TRUE
  ) INTO is_mentor;

  RETURN is_mentor;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can access team data
CREATE OR REPLACE FUNCTION can_access_team(user_id UUID, team_num INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_access BOOLEAN;
BEGIN
  -- Check if user is admin (admins have access to everything)
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id;

  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a member of this team
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_members.user_id = can_access_team.user_id
      AND team_members.team_number = team_num
      AND team_members.is_active = TRUE
  ) INTO has_access;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_team_mentor(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_team(UUID, INTEGER) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION is_admin(UUID) IS 'Check if a user has admin role';
COMMENT ON FUNCTION is_team_mentor(UUID, INTEGER) IS 'Check if a user is a mentor for a specific team';
COMMENT ON FUNCTION can_access_team(UUID, INTEGER) IS 'Check if a user can access data for a specific team';
