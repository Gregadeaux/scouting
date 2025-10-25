# Database Migrations

This directory contains all database schema migrations for the FRC Scouting System. Migrations are numbered sequentially and should be run in order.

## 📋 Migration Order

Run these migrations **in order** in your Supabase SQL Editor:

### Required Migrations

| # | File | Description | Status |
|---|------|-------------|--------|
| **001** | `001_initial_schema.sql` | **Core database schema** - Creates all tables (teams, events, matches, scouting, users, etc.) | ⚠️ **REQUIRED** |
| **002** | `002_user_signup_triggers.sql` | **User signup automation** - Creates triggers to auto-populate user profiles from auth metadata | ⚠️ **REQUIRED** |
| **003** | `003_audit_log.sql` | **Audit logging** - Creates audit log table and triggers for tracking admin actions | ⚠️ **REQUIRED** |
| **004** | `004_backfill_user_data.sql` | **Data migration** - Updates existing users with team numbers from auth metadata | ✅ Run once after 002 |

### Optional Migrations

Located in `./optional/` - only use if needed:

| File | Description | When to Use |
|------|-------------|-------------|
| `auth_functions_optional.sql` | Database RPC functions for auth checks | Optional - app uses direct queries instead |
| `dev_disable_rls.sql` | Disables RLS policies for development | **Development only** - NOT for production |
| `rls_policies_v1.sql` | Row-Level Security policies (basic) | If you need to enable RLS |
| `rls_policies_v2_jwt.sql` | RLS policies using JWT claims | Alternative RLS approach |
| `deprecated_auth_migration_v*.sql` | Old auth migration attempts | **Deprecated** - do not use |

## 🚀 Quick Start (New Database)

If setting up a **brand new database**, run these in order:

```bash
# In Supabase SQL Editor, run each file in this order:
1. 001_initial_schema.sql
2. 002_user_signup_triggers.sql
3. 003_audit_log.sql
```

That's it! Migration 004 is only needed if you have existing users.

## 📖 Detailed Migration Guide

### 001_initial_schema.sql

**Purpose**: Creates the complete database schema

**What it does**:
- ✅ Creates `teams` table (FRC teams)
- ✅ Creates `events` table (competitions)
- ✅ Creates `match_schedule` table (match data)
- ✅ Creates `match_scouting` table (scouting observations)
- ✅ Creates `pit_scouting` table (pre-match robot data)
- ✅ Creates `season_config` table (game-specific rules)
- ✅ Creates `team_statistics` table (calculated metrics)
- ✅ Creates `user_profiles` table (user accounts)
- ✅ Creates `team_members` table (team membership)
- ✅ Creates views for consolidated data
- ✅ Adds sample teams (254, 1678, 1114, 930, 118)
- ✅ Adds 2025 Reefscape season config

**Required**: Yes - this is the foundation

**Run when**: First time setting up the database

---

### 002_user_signup_triggers.sql

**Purpose**: Automates user profile creation during signup

**What it does**:
- ✅ Creates `handle_new_user()` function
- ✅ Sets up trigger on `auth.users` table
- ✅ Auto-creates `user_profiles` record when user signs up
- ✅ Auto-populates `primary_team_number` from signup metadata
- ✅ Auto-creates `team_members` entry if user provided team number
- ✅ Includes `backfill_user_profiles()` function for existing users

**Required**: Yes - without this, user signups won't create profiles

**Run when**: After 001, before users start signing up

**Dependencies**: Requires `user_profiles` and `team_members` tables from 001

---

### 003_audit_log.sql

**Purpose**: Tracks all administrative actions for security and compliance

**What it does**:
- ✅ Creates `admin_audit_log` table
- ✅ Sets up indexes for performance
- ✅ Creates `log_user_profile_changes()` function
- ✅ Sets up trigger to auto-log user profile changes
- ✅ Tracks: user created, updated, role changed, deleted
- ✅ Stores before/after values for updates

**Required**: Yes - needed for admin dashboard activity feed

**Run when**: After 001 and 002

**Dependencies**: Requires `user_profiles` table from 001

**What gets logged automatically**:
- User account creation
- Role changes (scouter → mentor → admin)
- Team assignments
- Account activation/deactivation
- User deletion

---

### 004_backfill_user_data.sql

**Purpose**: Updates existing user profiles with data from auth metadata

**What it does**:
- ✅ Updates `user_profiles.primary_team_number` from auth metadata
- ✅ Creates `team_members` entries for users with team numbers
- ✅ Displays results to verify updates

**Required**: Only if you have existing users who signed up before migration 002

**Run when**: After 002 and 003, if you have existing users

**Safe to run multiple times**: Yes - uses `ON CONFLICT` to prevent duplicates

**Example output**:
```
Updated 2 users with team numbers
Created 2 team_members entries
```

---

## 🔧 How to Run Migrations

### Using Supabase Dashboard

1. Open your Supabase project
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the contents of each migration file (in order)
5. Click **Run**
6. Verify success (check for green "Success" message)

### Using Supabase CLI

```bash
# Initialize Supabase (if not done)
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run individual files
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
psql $DATABASE_URL -f supabase/migrations/002_user_signup_triggers.sql
psql $DATABASE_URL -f supabase/migrations/003_audit_log.sql
```

## ✅ Verification Checklist

After running migrations, verify everything works:

### After Migration 001
```sql
-- Check tables exist
SELECT COUNT(*) FROM teams;        -- Should return 5 (sample teams)
SELECT COUNT(*) FROM events;       -- Should return 0
SELECT COUNT(*) FROM season_config; -- Should return 1 (2025 Reefscape)
```

### After Migration 002
```sql
-- Check trigger exists
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';
-- Should return: on_auth_user_created
```

### After Migration 003
```sql
-- Check audit log table exists
SELECT COUNT(*) FROM admin_audit_log;
-- Should return 0 (or more if you've made changes)

-- Check trigger exists
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'user_profiles';
-- Should return: user_profile_audit_trigger
```

### After Migration 004
```sql
-- Check users have team numbers
SELECT
  email,
  primary_team_number,
  (SELECT COUNT(*) FROM team_members WHERE user_id = user_profiles.id) as team_memberships
FROM user_profiles;
-- Should show team numbers populated
```

## 🐛 Troubleshooting

### Error: "relation already exists"

**Solution**: That migration was already run. Skip to the next one.

### Error: "permission denied"

**Solution**: Make sure you're running as the database owner or have sufficient privileges. In Supabase Dashboard SQL Editor, you have full permissions automatically.

### Error: "column does not exist"

**Solution**: You probably skipped a migration. Run the earlier migrations first.

### Error: "function does not exist"

**Solution**: Migration 002 or 003 didn't run successfully. Re-run them.

## 📝 Migration Naming Convention

```
NNN_descriptive_name.sql
```

- **NNN**: Three-digit sequential number (001, 002, 003...)
- **descriptive_name**: Snake_case description of what the migration does
- **.sql**: SQL file extension

### Examples
- ✅ `001_initial_schema.sql`
- ✅ `002_user_signup_triggers.sql`
- ✅ `003_audit_log.sql`
- ❌ `migration.sql` (no number)
- ❌ `1-schema.sql` (not zero-padded)
- ❌ `add-users.sql` (uses hyphens instead of underscores)

## 🔄 Adding New Migrations

When adding a new migration:

1. **Number sequentially**: Next available number (005, 006, etc.)
2. **Descriptive name**: Clearly describe what it does
3. **Idempotent if possible**: Use `IF NOT EXISTS`, `OR REPLACE`, `ON CONFLICT`
4. **Include rollback**: Consider adding a rollback script
5. **Update this README**: Document what it does and when to run it

### Migration Template

```sql
-- ============================================================================
-- Migration: NNN_description
-- ============================================================================
-- Purpose: [What this migration does]
-- Dependencies: [What migrations must run first]
-- Safe to re-run: [Yes/No]

-- Create new objects
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- ...
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_name ON table(column);

-- Comments for documentation
COMMENT ON TABLE new_table IS 'Description of what this table stores';

-- Grants
GRANT SELECT ON new_table TO authenticated;
```

## 📚 Related Documentation

- [AUDIT_LOG_SETUP.md](../../AUDIT_LOG_SETUP.md) - Audit logging system details
- [README.md](../../README.md) - Main project documentation
- [CLAUDE.md](../../CLAUDE.md) - Season transition guide for AI assistants

## 🔐 Security Notes

- **Never commit** production database credentials
- **Test migrations** on a development database first
- **Backup** your production database before running migrations
- **Review changes** in each migration file before running
- **Audit logs** are immutable - cannot be deleted or modified

## 📞 Support

If you encounter issues with migrations:

1. Check the Troubleshooting section above
2. Review the Supabase logs (Database → Logs)
3. Verify you ran migrations in order
4. Check for error messages in the SQL Editor output

---

**Last Updated**: 2025-10-21
**Current Schema Version**: 004
