-- ============================================================================
-- Update Existing Users with Team Numbers
-- ============================================================================
-- This script updates existing user_profiles with team_number data from auth metadata

-- Update existing user_profiles with team_number from auth.users metadata
UPDATE public.user_profiles up
SET
  primary_team_number = (au.raw_user_meta_data->>'team_number')::INTEGER,
  full_name = COALESCE(up.full_name, au.raw_user_meta_data->>'full_name', ''),
  display_name = COALESCE(up.display_name, au.raw_user_meta_data->>'display_name', au.raw_user_meta_data->>'full_name'),
  updated_at = NOW()
FROM auth.users au
WHERE up.id = au.id
  AND au.raw_user_meta_data->>'team_number' IS NOT NULL
  AND up.primary_team_number IS NULL;

-- Create team_members entries for users who have a team_number but no membership
INSERT INTO public.team_members (
  user_id,
  team_number,
  team_role,
  can_submit_data,
  can_view_analytics,
  can_manage_team,
  is_active
)
SELECT
  au.id,
  (au.raw_user_meta_data->>'team_number')::INTEGER,
  'scouter',
  true,
  false,
  false,
  true
FROM auth.users au
INNER JOIN public.user_profiles up ON au.id = up.id
WHERE au.raw_user_meta_data->>'team_number' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = au.id
      AND tm.team_number = (au.raw_user_meta_data->>'team_number')::INTEGER
  )
ON CONFLICT (user_id, team_number) DO NOTHING;

-- Display results
SELECT
  up.email,
  up.full_name,
  up.primary_team_number,
  au.raw_user_meta_data->>'team_number' as auth_team_number
FROM public.user_profiles up
INNER JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;
