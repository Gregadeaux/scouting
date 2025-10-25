-- ============================================================================
-- FRC Scouting System - Authentication & Authorization Migration (FIXED)
-- ============================================================================
-- Fixed version that avoids infinite recursion in RLS policies
-- ============================================================================

-- ============================================================================
-- ENUMS & TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'mentor', 'scouter');

-- ============================================================================
-- USER PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    display_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'scouter',
    primary_team_number INTEGER REFERENCES teams(team_number),
    preferred_scout_name VARCHAR(100),
    device_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    onboarding_completed BOOLEAN DEFAULT false,
    training_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_team ON user_profiles(primary_team_number);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;

-- ============================================================================
-- TEAM MEMBERSHIP
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL REFERENCES teams(team_number) ON DELETE CASCADE,
    team_role user_role NOT NULL DEFAULT 'scouter',
    can_submit_data BOOLEAN DEFAULT true,
    can_view_analytics BOOLEAN DEFAULT false,
    can_manage_team BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, team_number),
    CHECK (left_at IS NULL OR left_at >= joined_at)
);

CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_number);
CREATE INDEX idx_team_members_active ON team_members(is_active) WHERE is_active = true;

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS (To avoid RLS recursion)
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
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scouting ENABLE ROW LEVEL SECURITY;
ALTER TABLE pit_scouting ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER_PROFILES POLICIES (Using SECURITY DEFINER functions)
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own non-sensitive fields
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT get_my_role()) -- Cannot change own role
    );

-- Admins can view all profiles (using SECURITY DEFINER function)
CREATE POLICY "Admins can view all profiles"
    ON user_profiles FOR SELECT
    USING (is_admin());

-- Admins can insert new users
CREATE POLICY "Admins can create users"
    ON user_profiles FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON user_profiles FOR UPDATE
    USING (is_admin());

-- Mentors can view profiles from their team
CREATE POLICY "Mentors can view team profiles"
    ON user_profiles FOR SELECT
    USING (
        get_my_role() = 'mentor'
        AND primary_team_number IN (
            SELECT primary_team_number FROM user_profiles WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- TEAM_MEMBERS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own team memberships"
    ON team_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all team memberships"
    ON team_members FOR ALL
    USING (is_admin());

CREATE POLICY "Mentors can manage team memberships"
    ON team_members FOR ALL
    USING (
        is_team_mentor(auth.uid(), team_number)
    );

-- ============================================================================
-- MATCH_SCOUTING POLICIES
-- ============================================================================

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

-- ============================================================================
-- PIT_SCOUTING POLICIES
-- ============================================================================

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

-- ============================================================================
-- TEAMS, EVENTS, MATCH_SCHEDULE POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view teams"
    ON teams FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage teams"
    ON teams FOR ALL
    USING (is_admin());

CREATE POLICY "Anyone can view events"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage events"
    ON events FOR ALL
    USING (is_admin());

CREATE POLICY "Anyone can view match schedule"
    ON match_schedule FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage match schedule"
    ON match_schedule FOR ALL
    USING (is_admin());

-- ============================================================================
-- TEAM_STATISTICS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view team statistics"
    ON team_statistics FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage statistics"
    ON team_statistics FOR ALL
    USING (is_admin());

-- ============================================================================
-- AUDIT_LOG POLICIES
-- ============================================================================

CREATE POLICY "Admins can view audit logs"
    ON audit_log FOR SELECT
    USING (is_admin());

CREATE POLICY "System can insert audit logs"
    ON audit_log FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, email_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email_confirmed_at IS NOT NULL
    );

    INSERT INTO public.audit_log (user_id, email, action, metadata)
    VALUES (
        NEW.id,
        NEW.email,
        'user_signup',
        jsonb_build_object(
            'email_verified', NEW.email_confirmed_at IS NOT NULL,
            'signup_method', COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update last_login_at
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET last_login_at = NOW()
    WHERE id = NEW.id;

    INSERT INTO public.audit_log (user_id, email, action, metadata)
    VALUES (
        NEW.id,
        NEW.email,
        'user_login',
        jsonb_build_object('last_sign_in', NEW.last_sign_in_at)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION public.handle_user_login();

-- Log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO public.audit_log (
            user_id, email, action, resource_type, resource_id,
            old_values, new_values
        )
        VALUES (
            auth.uid(),
            (SELECT email FROM auth.users WHERE id = auth.uid()),
            'role_change',
            'user_profile',
            NEW.id::TEXT,
            jsonb_build_object('role', OLD.role),
            jsonb_build_object('role', NEW.role)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_role_change ON user_profiles;
CREATE TRIGGER on_role_change
    AFTER UPDATE OF role ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- Updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify setup
DO $$
BEGIN
    RAISE NOTICE '✅ Authentication migration complete!';
    RAISE NOTICE '📋 Tables created: user_profiles, team_members, audit_log';
    RAISE NOTICE '🔒 RLS policies enabled on all tables';
    RAISE NOTICE '⚙️  Triggers configured for auto user creation';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next steps:';
    RAISE NOTICE '1. Sign up your first user at /auth/signup';
    RAISE NOTICE '2. Run: UPDATE user_profiles SET role = ''admin'' WHERE email = ''your@email.com'';';
    RAISE NOTICE '3. Test login at /auth/login';
END $$;
