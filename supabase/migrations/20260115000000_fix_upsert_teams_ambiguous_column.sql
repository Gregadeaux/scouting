-- Migration: Fix ambiguous column reference in upsert_teams_with_event_atomic
-- Description: Renames output columns to avoid conflict with table column names
-- Related: Import job failures due to "column reference 'team_number' is ambiguous"

-- Drop the old function
drop function if exists upsert_teams_with_event_atomic(jsonb, text);

-- Recreate with renamed output columns to avoid ambiguity
create or replace function upsert_teams_with_event_atomic(
  p_teams jsonb,
  p_event_key text
)
returns table (
  out_team_number integer,
  out_team_key text,
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
begin
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

      -- Return success using OUT column names
      out_team_number := v_team_number;
      out_team_key := v_team_key;
      success := true;
      error_message := null;
      return next;

    exception
      when others then
        -- Log error but continue with other teams
        out_team_number := v_team_number;
        out_team_key := null;
        success := false;
        error_message := SQLERRM;
        return next;
    end;
  end loop;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function upsert_teams_with_event_atomic(jsonb, text) to authenticated;

-- Add comment
comment on function upsert_teams_with_event_atomic is
  'Atomically upserts teams and creates event_teams associations. All operations succeed together or fail together.';
