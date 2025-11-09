-- ============================================================================
-- Create User Profiles and Team Members Tables
-- ============================================================================
-- This migration creates the missing user_profiles and team_members tables
-- that are referenced by triggers but were not properly created in migrations
-- ============================================================================

-- Create user role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'mentor', 'scouter');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_profiles table
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

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_team ON user_profiles(primary_team_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL REFERENCES teams(team_number),
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
    UNIQUE(user_id, team_number)
);

-- Create indexes for team_members
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_number);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(team_role);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(is_active) WHERE is_active = true;

-- Create user_teams table (legacy name, can be a view for compatibility)
CREATE OR REPLACE VIEW user_teams AS
SELECT * FROM team_members;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can do everything" ON user_profiles
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for team_members
CREATE POLICY "Users can view own memberships" ON team_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Team mentors can view team members" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
                AND tm.team_number = team_members.team_number
                AND tm.team_role IN ('admin', 'mentor')
                AND tm.is_active = true
        )
    );

CREATE POLICY "Service role can do everything on team_members" ON team_members
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON user_teams TO authenticated;

-- Comments
COMMENT ON TABLE user_profiles IS 'User profile information extending auth.users';
COMMENT ON TABLE team_members IS 'Team membership and permissions for users';
COMMENT ON VIEW user_teams IS 'Legacy view for compatibility with older code';