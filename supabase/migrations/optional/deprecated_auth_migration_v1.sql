-- ============================================================================
-- FRC Scouting System - Authentication & Authorization Migration
-- ============================================================================
-- Implements Supabase Auth with role-based access control (RBAC)
-- Roles: admin, mentor, scouter
--
-- This migration adds:
-- - User profiles table linked to auth.users
-- - Role-based access control (RBAC) with enum type
-- - Row Level Security (RLS) policies for all tables
-- - Audit logging for sensitive operations
-- - Team membership for multi-team support
-- ============================================================================

-- ============================================================================
-- ENUMS & TYPES
-- ============================================================================

-- User roles with hierarchical permissions
-- admin: Full access to system configuration, user management, all data
-- mentor: Can manage team data, assign scouts, view analytics
-- scouter: Can submit scouting data, view assigned matches
CREATE TYPE user_role AS ENUM ('admin', 'mentor', 'scouter');

-- ============================================================================
-- USER PROFILES
-- ============================================================================

-- User profiles extending Supabase Auth
CREATE TABLE IF NOT EXISTS user_profiles (
    -- Primary key links to auth.users
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- User Information
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    display_name VARCHAR(100),

    -- Role & Permissions
    role user_role NOT NULL DEFAULT 'scouter',

    -- Team Association (can be null for admins managing multiple teams)
    primary_team_number INTEGER REFERENCES teams(team_number),

    -- Scouting Preferences
    preferred_scout_name VARCHAR(100), -- Name to appear on scouting records
    device_id VARCHAR(50), -- Track which device they use most

    -- Account Status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,

    -- Onboarding & Training
    onboarding_completed BOOLEAN DEFAULT false,
    training_completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_by UUID REFERENCES auth.users(id),

    -- Constraints
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_team ON user_profiles(primary_team_number);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;

COMMENT ON TABLE user_profiles IS 'User profiles with role-based access control for FRC scouting system';
COMMENT ON COLUMN user_profiles.role IS 'User role: admin (full access), mentor (team management), scouter (data entry)';
COMMENT ON COLUMN user_profiles.primary_team_number IS 'Primary team affiliation, can be null for multi-team admins';

-- ============================================================================
-- TEAM MEMBERSHIP (Multi-Team Support)
-- ============================================================================

-- Allows users to be associated with multiple teams
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relationships
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL REFERENCES teams(team_number) ON DELETE CASCADE,

    -- Role within this specific team (can differ from global role)
    team_role user_role NOT NULL DEFAULT 'scouter',

    -- Access Control
    can_submit_data BOOLEAN DEFAULT true,
    can_view_analytics BOOLEAN DEFAULT false,
    can_manage_team BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Constraints
    UNIQUE(user_id, team_number),
    CHECK (left_at IS NULL OR left_at >= joined_at)
);

CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_number);
CREATE INDEX idx_team_members_active ON team_members(is_active) WHERE is_active = true;

COMMENT ON TABLE team_members IS 'Multi-team membership allowing users to scout for multiple teams';

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

-- Track sensitive operations for security and compliance
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who & When
    user_id UUID REFERENCES auth.users(id),
    email VARCHAR(255),

    -- What
    action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'role_change', 'data_delete', etc.
    resource_type VARCHAR(50), -- 'match_scouting', 'user_profile', etc.
    resource_id VARCHAR(255), -- ID of affected resource

    -- Details
    old_values JSONB,
    new_values JSONB,
    metadata JSONB, -- IP address, user agent, etc.

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);

COMMENT ON TABLE audit_log IS 'Audit trail for security-sensitive operations';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
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
-- USER_PROFILES POLICIES
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
        AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()) -- Cannot change own role
    );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert new users
CREATE POLICY "Admins can create users"
    ON user_profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Mentors can view profiles from their team
CREATE POLICY "Mentors can view team profiles"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'mentor'
            AND up.primary_team_number = user_profiles.primary_team_number
        )
    );

-- ============================================================================
-- TEAM_MEMBERS POLICIES
-- ============================================================================

-- Users can view their own memberships
CREATE POLICY "Users can view own team memberships"
    ON team_members FOR SELECT
    USING (user_id = auth.uid());

-- Admins can manage all team memberships
CREATE POLICY "Admins can manage all team memberships"
    ON team_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Mentors can manage memberships for their team
CREATE POLICY "Mentors can manage team memberships"
    ON team_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'mentor'
            AND up.primary_team_number = team_members.team_number
        )
    );

-- ============================================================================
-- MATCH_SCOUTING POLICIES
-- ============================================================================

-- Scouters can insert their own data
CREATE POLICY "Scouters can submit match data"
    ON match_scouting FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.is_active = true
            AND (
                -- Check if user has permission via team membership
                EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.user_id = auth.uid()
                    AND tm.can_submit_data = true
                    AND tm.is_active = true
                )
                OR up.role IN ('mentor', 'admin')
            )
        )
    );

-- Users can view scouting data from their teams
CREATE POLICY "Users can view team scouting data"
    ON match_scouting FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            LEFT JOIN team_members tm ON tm.user_id = up.id
            WHERE up.id = auth.uid()
            AND up.is_active = true
            AND (
                up.role = 'admin'
                OR (tm.team_number = match_scouting.team_number AND tm.is_active = true)
            )
        )
    );

-- Mentors and admins can update scouting data
CREATE POLICY "Mentors can update scouting data"
    ON match_scouting FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            LEFT JOIN team_members tm ON tm.user_id = up.id
            WHERE up.id = auth.uid()
            AND (
                up.role = 'admin'
                OR (up.role = 'mentor' AND tm.team_number = match_scouting.team_number)
            )
        )
    );

-- Only admins can delete scouting data
CREATE POLICY "Admins can delete scouting data"
    ON match_scouting FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- PIT_SCOUTING POLICIES
-- ============================================================================

-- Similar policies for pit scouting
CREATE POLICY "Users can submit pit scouting"
    ON pit_scouting FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.is_active = true
            AND (
                EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.user_id = auth.uid()
                    AND tm.can_submit_data = true
                    AND tm.is_active = true
                )
                OR up.role IN ('mentor', 'admin')
            )
        )
    );

CREATE POLICY "Users can view team pit scouting"
    ON pit_scouting FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            LEFT JOIN team_members tm ON tm.user_id = up.id
            WHERE up.id = auth.uid()
            AND up.is_active = true
            AND (
                up.role = 'admin'
                OR (tm.team_number = pit_scouting.team_number AND tm.is_active = true)
            )
        )
    );

CREATE POLICY "Mentors can update pit scouting"
    ON pit_scouting FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            LEFT JOIN team_members tm ON tm.user_id = up.id
            WHERE up.id = auth.uid()
            AND (
                up.role = 'admin'
                OR (up.role = 'mentor' AND tm.team_number = pit_scouting.team_number)
            )
        )
    );

-- ============================================================================
-- TEAMS, EVENTS, MATCH_SCHEDULE POLICIES (Read-Only for Most Users)
-- ============================================================================

-- Everyone can view teams
CREATE POLICY "Anyone can view teams"
    ON teams FOR SELECT
    USING (true);

-- Only admins can modify teams
CREATE POLICY "Admins can manage teams"
    ON teams FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Everyone can view events
CREATE POLICY "Anyone can view events"
    ON events FOR SELECT
    USING (true);

-- Only admins can modify events
CREATE POLICY "Admins can manage events"
    ON events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Everyone can view match schedule
CREATE POLICY "Anyone can view match schedule"
    ON match_schedule FOR SELECT
    USING (true);

-- Only admins can modify match schedule
CREATE POLICY "Admins can manage match schedule"
    ON match_schedule FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- TEAM_STATISTICS POLICIES
-- ============================================================================

-- Anyone authenticated can view statistics
CREATE POLICY "Anyone can view team statistics"
    ON team_statistics FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only admins can modify statistics (typically done by system)
CREATE POLICY "Admins can manage statistics"
    ON team_statistics FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- AUDIT_LOG POLICIES
-- ============================================================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- System can insert audit logs (done via triggers/functions)
CREATE POLICY "System can insert audit logs"
    ON audit_log FOR INSERT
    WITH CHECK (true); -- Controlled by application logic

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function to automatically create user profile on signup
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

    -- Log the signup
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

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update last_login_at
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET last_login_at = NOW()
    WHERE id = NEW.id;

    -- Log the login
    INSERT INTO public.audit_log (user_id, email, action, metadata)
    VALUES (
        NEW.id,
        NEW.email,
        'user_login',
        jsonb_build_object(
            'last_sign_in', NEW.last_sign_in_at
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users update (login events)
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION public.handle_user_login();

-- Function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO public.audit_log (
            user_id,
            email,
            action,
            resource_type,
            resource_id,
            old_values,
            new_values
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

-- Trigger for role changes
DROP TRIGGER IF EXISTS on_role_change ON user_profiles;
CREATE TRIGGER on_role_change
    AFTER UPDATE OF role ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- Apply updated_at trigger to new tables
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS FOR AUTHORIZATION
-- ============================================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is mentor for a team
CREATE OR REPLACE FUNCTION public.is_team_mentor(user_id UUID, team_num INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles up
        LEFT JOIN team_members tm ON tm.user_id = up.id
        WHERE up.id = user_id
        AND (
            (up.role = 'mentor' AND up.primary_team_number = team_num)
            OR (tm.team_number = team_num AND tm.team_role = 'mentor' AND tm.is_active = true)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access team data
CREATE OR REPLACE FUNCTION public.can_access_team(user_id UUID, team_num INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles up
        LEFT JOIN team_members tm ON tm.user_id = up.id
        WHERE up.id = user_id
        AND up.is_active = true
        AND (
            up.role = 'admin'
            OR up.primary_team_number = team_num
            OR (tm.team_number = team_num AND tm.is_active = true)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA - INITIAL ADMIN USER
-- ============================================================================

-- NOTE: After running this migration, you need to:
-- 1. Sign up your first user via Supabase Auth
-- 2. Manually update their role to 'admin' in the user_profiles table
-- 3. That admin can then invite and manage other users
--
-- Example SQL to promote first user to admin:
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'FRC Scouting System with Supabase Auth and RBAC';
