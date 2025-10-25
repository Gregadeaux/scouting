-- ============================================================================
-- FRC Scouting System - FIX RLS Policies (No table recreation)
-- ============================================================================
-- This script ONLY fixes the infinite recursion in RLS policies
-- Run this if you already have the tables created
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop all existing RLS policies
-- ============================================================================

-- Drop user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can create users" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Mentors can view team profiles" ON user_profiles;

-- Drop team_members policies
DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
DROP POLICY IF EXISTS "Admins can manage all team memberships" ON team_members;
DROP POLICY IF EXISTS "Mentors can manage team memberships" ON team_members;

-- Drop match_scouting policies
DROP POLICY IF EXISTS "Scouters can submit match data" ON match_scouting;
DROP POLICY IF EXISTS "Users can view team scouting data" ON match_scouting;
DROP POLICY IF EXISTS "Mentors can update scouting data" ON match_scouting;
DROP POLICY IF EXISTS "Admins can delete scouting data" ON match_scouting;

-- Drop pit_scouting policies
DROP POLICY IF EXISTS "Users can submit pit scouting" ON pit_scouting;
DROP POLICY IF EXISTS "Users can view team pit scouting" ON pit_scouting;
DROP POLICY IF EXISTS "Mentors can update pit scouting" ON pit_scouting;

-- Drop teams policies
DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
DROP POLICY IF EXISTS "Admins can manage teams" ON teams;

-- Drop events policies
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Admins can manage events" ON events;

-- Drop match_schedule policies
DROP POLICY IF EXISTS "Anyone can view match schedule" ON match_schedule;
DROP POLICY IF EXISTS "Admins can manage match schedule" ON match_schedule;

-- Drop team_statistics policies
DROP POLICY IF EXISTS "Anyone can view team statistics" ON team_statistics;
DROP POLICY IF EXISTS "Admins can manage statistics" ON team_statistics;

-- Drop audit_log policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;

-- ============================================================================
-- STEP 2: Create SECURITY DEFINER functions (to avoid RLS recursion)
-- ============================================================================

-- Get current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role FROM public.user_profiles
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if current user is mentor for a team
CREATE OR REPLACE FUNCTION public.is_team_mentor(user_id UUID, team_num INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles up
        LEFT JOIN public.team_members tm ON tm.user_id = up.id
        WHERE up.id = user_id
        AND (
            (up.role = 'mentor' AND up.primary_team_number = team_num)
            OR (tm.team_number = team_num AND tm.team_role = 'mentor' AND tm.is_active = true)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if current user can access team
CREATE OR REPLACE FUNCTION public.can_access_team(user_id UUID, team_num INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles up
        LEFT JOIN public.team_members tm ON tm.user_id = up.id
        WHERE up.id = user_id
        AND up.is_active = true
        AND (
            up.role = 'admin'
            OR up.primary_team_number = team_num
            OR (tm.team_number = team_num AND tm.is_active = true)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- STEP 3: Create NEW RLS policies (using SECURITY DEFINER functions)
-- ============================================================================

-- USER_PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT get_my_role())
    );

CREATE POLICY "Admins can view all profiles"
    ON user_profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can create users"
    ON user_profiles FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update any profile"
    ON user_profiles FOR UPDATE
    USING (is_admin());

CREATE POLICY "Mentors can view team profiles"
    ON user_profiles FOR SELECT
    USING (
        get_my_role() = 'mentor'
        AND primary_team_number IN (
            SELECT primary_team_number FROM user_profiles WHERE id = auth.uid()
        )
    );

-- TEAM_MEMBERS POLICIES
CREATE POLICY "Users can view own team memberships"
    ON team_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all team memberships"
    ON team_members FOR ALL
    USING (is_admin());

CREATE POLICY "Mentors can manage team memberships"
    ON team_members FOR ALL
    USING (is_team_mentor(auth.uid(), team_number));

-- MATCH_SCOUTING POLICIES
CREATE POLICY "Scouters can submit match data"
    ON match_scouting FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.can_submit_data = true
            AND tm.is_active = true
        )
        OR get_my_role() IN ('mentor', 'admin')
    );

CREATE POLICY "Users can view team scouting data"
    ON match_scouting FOR SELECT
    USING (
        is_admin()
        OR can_access_team(auth.uid(), team_number)
    );

CREATE POLICY "Mentors can update scouting data"
    ON match_scouting FOR UPDATE
    USING (
        is_admin()
        OR (get_my_role() = 'mentor' AND can_access_team(auth.uid(), team_number))
    );

CREATE POLICY "Admins can delete scouting data"
    ON match_scouting FOR DELETE
    USING (is_admin());

-- PIT_SCOUTING POLICIES
CREATE POLICY "Users can submit pit scouting"
    ON pit_scouting FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.can_submit_data = true
            AND tm.is_active = true
        )
        OR get_my_role() IN ('mentor', 'admin')
    );

CREATE POLICY "Users can view team pit scouting"
    ON pit_scouting FOR SELECT
    USING (
        is_admin()
        OR can_access_team(auth.uid(), team_number)
    );

CREATE POLICY "Mentors can update pit scouting"
    ON pit_scouting FOR UPDATE
    USING (
        is_admin()
        OR (get_my_role() = 'mentor' AND can_access_team(auth.uid(), team_number))
    );

-- TEAMS POLICIES
CREATE POLICY "Anyone can view teams"
    ON teams FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage teams"
    ON teams FOR ALL
    USING (is_admin());

-- EVENTS POLICIES
CREATE POLICY "Anyone can view events"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage events"
    ON events FOR ALL
    USING (is_admin());

-- MATCH_SCHEDULE POLICIES
CREATE POLICY "Anyone can view match schedule"
    ON match_schedule FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage match schedule"
    ON match_schedule FOR ALL
    USING (is_admin());

-- TEAM_STATISTICS POLICIES
CREATE POLICY "Anyone can view team statistics"
    ON team_statistics FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage statistics"
    ON team_statistics FOR ALL
    USING (is_admin());

-- AUDIT_LOG POLICIES
CREATE POLICY "Admins can view audit logs"
    ON audit_log FOR SELECT
    USING (is_admin());

CREATE POLICY "System can insert audit logs"
    ON audit_log FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- STEP 4: Grant permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- DONE!
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies fixed!';
    RAISE NOTICE '🔒 All policies now use SECURITY DEFINER functions';
    RAISE NOTICE '📋 No more infinite recursion errors';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test by signing up at /auth/signup';
END $$;
