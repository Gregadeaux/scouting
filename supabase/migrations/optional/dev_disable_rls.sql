-- ============================================================================
-- FRC Scouting System - DISABLE RLS for Development
-- ============================================================================
-- This temporarily disables RLS so you can test authentication
-- WITHOUT the infinite recursion errors
--
-- ⚠️ FOR DEVELOPMENT ONLY! Re-enable for production
-- ============================================================================

-- Disable RLS on all tables
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_scouting DISABLE ROW LEVEL SECURITY;
ALTER TABLE pit_scouting DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_schedule DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_statistics DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ RLS disabled on all tables';
    RAISE NOTICE '🔓 All authenticated users now have full access';
    RAISE NOTICE '⚠️  This is for DEVELOPMENT only!';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 You can now test authentication:';
    RAISE NOTICE '1. Sign up at /auth/signup';
    RAISE NOTICE '2. Promote to admin: UPDATE user_profiles SET role = ''admin'' WHERE email = ''your@email.com'';';
    RAISE NOTICE '3. Login at /auth/login';
    RAISE NOTICE '';
    RAISE NOTICE '📝 To re-enable RLS later, run: ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;';
END $$;
