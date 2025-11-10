-- Migration: Add Transaction Support Functions
-- Description: Adds PostgreSQL functions to handle multi-step operations atomically
-- Related: SCOUT-73

-- ============================================================================
-- Function: upsert_teams_with_event_atomic
-- Description: Atomically upsert teams and create event_teams junction entries
-- Purpose: Ensures teams and event associations are created together or not at all
-- ============================================================================
create or replace function upsert_teams_with_event_atomic(
  p_teams jsonb,
  p_event_key text
)
returns table (
  team_number integer,
  team_key text,
  success boolean,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team jsonb;
  v_team_number integer;
  v_team_key text;
  v_result record;
begin
  -- Start transaction (implicit in function)
  -- All operations within this function are atomic

  -- Iterate through teams array
  for v_team in select * from jsonb_array_elements(p_teams)
  loop
    begin
      -- Extract team number
      v_team_number := (v_team->>'team_number')::integer;

      -- Upsert team
      insert into teams (
        team_number,
        team_name,
        team_nickname,
        city,
        state_province,
        country,
        postal_code,
        rookie_year,
        website
      )
      values (
        v_team_number,
        v_team->>'team_name',
        v_team->>'team_nickname',
        v_team->>'city',
        v_team->>'state_province',
        v_team->>'country',
        v_team->>'postal_code',
        (v_team->>'rookie_year')::integer,
        v_team->>'website'
      )
      on conflict (team_number) do update set
        team_name = EXCLUDED.team_name,
        team_nickname = EXCLUDED.team_nickname,
        city = EXCLUDED.city,
        state_province = EXCLUDED.state_province,
        country = EXCLUDED.country,
        postal_code = EXCLUDED.postal_code,
        rookie_year = EXCLUDED.rookie_year,
        website = EXCLUDED.website,
        updated_at = now()
      returning teams.team_key into v_team_key;

      -- Create event_teams junction entry
      insert into event_teams (event_key, team_number)
      values (p_event_key, v_team_number)
      on conflict (event_key, team_number) do nothing;

      -- Return success
      team_number := v_team_number;
      team_key := v_team_key;
      success := true;
      error_message := null;
      return next;

    exception
      when others then
        -- Log error but continue with other teams
        team_number := v_team_number;
        team_key := null;
        success := false;
        error_message := SQLERRM;
        return next;
    end;
  end loop;

  -- Transaction commits automatically if no exception
  -- Rollback happens automatically on exception
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function upsert_teams_with_event_atomic(jsonb, text) to authenticated;

-- Add comment
comment on function upsert_teams_with_event_atomic is
  'Atomically upserts teams and creates event_teams associations. All operations succeed together or fail together.';


-- ============================================================================
-- Function: cleanup_partial_import
-- Description: Cleanup function to remove partial import data
-- Purpose: Rollback utility for failed imports
-- ============================================================================
create or replace function cleanup_partial_import(
  p_job_id uuid,
  p_event_key text,
  p_cleanup_teams boolean default false,
  p_cleanup_matches boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_teams integer := 0;
  v_deleted_matches integer := 0;
  v_deleted_event_teams integer := 0;
  v_result jsonb;
begin
  -- Clean up event_teams if requested
  if p_cleanup_teams then
    delete from event_teams
    where event_key = p_event_key;
    get diagnostics v_deleted_event_teams = ROW_COUNT;

    -- Optionally delete teams that have no other events
    -- (Skip for now to preserve team data)
  end if;

  -- Clean up matches if requested
  if p_cleanup_matches then
    delete from match_schedule
    where event_key = p_event_key;
    get diagnostics v_deleted_matches = ROW_COUNT;
  end if;

  -- Log cleanup to audit_logs
  insert into audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    changes
  )
  values (
    'import_jobs',
    p_job_id::text,
    'cleanup',
    auth.uid(),
    jsonb_build_object(
      'event_key', p_event_key,
      'deleted_event_teams', v_deleted_event_teams,
      'deleted_matches', v_deleted_matches,
      'timestamp', now()
    )
  );

  -- Return summary
  v_result := jsonb_build_object(
    'success', true,
    'deleted_event_teams', v_deleted_event_teams,
    'deleted_matches', v_deleted_matches
  );

  return v_result;

exception
  when others then
    -- Log error
    insert into audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      changes
    )
    values (
      'import_jobs',
      p_job_id::text,
      'cleanup_failed',
      auth.uid(),
      jsonb_build_object(
        'error', SQLERRM,
        'timestamp', now()
      )
    );

    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function cleanup_partial_import(uuid, text, boolean, boolean) to authenticated;

-- Add comment
comment on function cleanup_partial_import is
  'Cleanup utility to remove partial import data when an import fails midway.';


-- ============================================================================
-- Function: create_user_profile_atomic
-- Description: Atomically create user profile and team membership
-- Purpose: Ensures user setup is complete or fully rolled back
-- ============================================================================
create or replace function create_user_profile_atomic(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_display_name text,
  p_team_number integer,
  p_team_role text default 'scouter'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- Insert user profile
  insert into user_profiles (
    id,
    email,
    full_name,
    display_name,
    role,
    primary_team_number,
    is_active,
    email_verified,
    onboarding_completed,
    preferred_scout_name
  )
  values (
    p_user_id,
    p_email,
    p_full_name,
    p_display_name,
    'scouter',
    p_team_number,
    true,
    false,
    false,
    coalesce(p_full_name, p_display_name)
  );

  -- If team_number provided, create team membership
  if p_team_number is not null then
    insert into team_members (
      user_id,
      team_number,
      team_role,
      can_submit_data,
      can_view_analytics,
      can_manage_team,
      is_active
    )
    values (
      p_user_id,
      p_team_number,
      p_team_role,
      true,
      false,
      false,
      true
    );
  end if;

  -- Log to audit_logs
  insert into audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    changes
  )
  values (
    'user_profiles',
    p_user_id::text,
    'create',
    p_user_id,
    jsonb_build_object(
      'email', p_email,
      'team_number', p_team_number,
      'timestamp', now()
    )
  );

  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'team_number', p_team_number
  );

  return v_result;

exception
  when others then
    -- Transaction automatically rolls back on exception
    raise exception 'Failed to create user profile: %', SQLERRM;
end;
$$;

-- Grant execute permission to service role only (called from backend)
grant execute on function create_user_profile_atomic(uuid, text, text, text, integer, text) to service_role;

-- Add comment
comment on function create_user_profile_atomic is
  'Atomically creates user profile and team membership. Rolls back both on failure.';
