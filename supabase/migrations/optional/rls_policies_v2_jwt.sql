-- ============================================================================
-- FRC Scouting System - RLS Policies Using JWT Claims (PROPER FIX)
-- ============================================================================
-- This uses JWT claims to store the user role, avoiding infinite recursion
-- This is the PRODUCTION-READY solution
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can create users" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Mentors can view team profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
DROP POLICY IF EXISTS "Admins can manage all team memberships" ON team_members;
DROP POLICY IF EXISTS "Mentors can manage team memberships" ON team_members;
DROP POLICY IF EXISTS "Scouters can submit match data" ON match_scouting;
DROP POLICY IF EXISTS "Users can view team scouting data" ON match_scouting;
DROP POLICY IF EXISTS "Mentors can update scouting data" ON match_scouting;
DROP POLICY IF EXISTS "Admins can delete scouting data" ON match_scouting;

-- ============================================================================
-- STEP 2: Function to update JWT claims when role changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_jwt_claims()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's JWT claims with their role
    UPDATE auth.users
    SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb) ||
        jsonb_build_object('role', NEW.role::text)
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update JWT when role changes
DROP TRIGGER IF EXISTS on_user_role_update ON user_profiles;
CREATE TRIGGER on_user_role_update
    AFTER INSERT OR UPDATE OF role ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_jwt_claims();

-- ============================================================================
-- STEP 3: Helper function to get role from JWT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role_from_jwt()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'role',
        'scouter'
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 4: Create simple RLS policies using JWT claims
-- ============================================================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scouting ENABLE ROW LEVEL SECURITY;

-- USER_PROFILES policies
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON user_profiles FOR SELECT
    USING (get_my_role_from_jwt() = 'admin');

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
    ON user_profiles FOR UPDATE
    USING (get_my_role_from_jwt() = 'admin');

CREATE POLICY "Admins can insert profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (get_my_role_from_jwt() = 'admin');

-- MATCH_SCOUTING policies
CREATE POLICY "Anyone authenticated can view scouting"
    ON match_scouting FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can insert scouting"
    ON match_scouting FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and mentors can update scouting"
    ON match_scouting FOR UPDATE
    USING (get_my_role_from_jwt() IN ('admin', 'mentor'));

CREATE POLICY "Admins can delete scouting"
    ON match_scouting FOR DELETE
    USING (get_my_role_from_jwt() = 'admin');

-- TEAMS policies (everyone can read, only admins can modify)
CREATE POLICY "Anyone can view teams"
    ON teams FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage teams"
    ON teams FOR ALL
    USING (get_my_role_from_jwt() = 'admin');

-- ============================================================================
-- STEP 5: Update existing users' JWT claims
-- ============================================================================

-- Sync existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN
        SELECT id, role FROM user_profiles
    LOOP
        UPDATE auth.users
        SET raw_app_meta_data =
            COALESCE(raw_app_meta_data, '{}'::jsonb) ||
            jsonb_build_object('role', user_record.role::text)
        WHERE id = user_record.id;
    END LOOP;

    RAISE NOTICE '✅ Updated JWT claims for existing users';
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies fixed using JWT claims!';
    RAISE NOTICE '🔒 No more infinite recursion';
    RAISE NOTICE '📋 User roles now stored in JWT tokens';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Users need to re-login for JWT to update';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test:';
    RAISE NOTICE '1. Sign up at /auth/signup';
    RAISE NOTICE '2. UPDATE user_profiles SET role = ''admin'' WHERE email = ''your@email.com'';';
    RAISE NOTICE '3. LOGOUT and LOGIN again (to refresh JWT)';
END $$;
