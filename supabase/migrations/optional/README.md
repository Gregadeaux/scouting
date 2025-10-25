# Optional & Deprecated Migrations

This directory contains optional migrations and deprecated files that are **not required** for normal operation.

## ⚠️ Warning

**Do NOT run these files unless you specifically need them!**

The main migrations (001-004) are all you need for a fully functional system.

## 📁 File Descriptions

### Optional: auth_functions_optional.sql

**Purpose**: Provides database RPC functions for authentication checks

**Functions included**:
- `is_admin(user_id)` - Check if user is admin
- `is_team_mentor(user_id, team_number)` - Check if user is team mentor
- `can_access_team(user_id, team_number)` - Check team access

**Why it's optional**:
The application now uses direct SQL queries instead of RPC functions for better performance and simpler code.

**When to use**:
- If you prefer database-side logic for auth checks
- If you want to use these functions in custom SQL queries
- For backwards compatibility with older code

**Status**: ✅ Working, but not required

---

### Development Only: dev_disable_rls.sql

**Purpose**: Disables Row-Level Security (RLS) for development

**What it does**:
- Disables RLS on all tables
- Useful for local development and testing

**⚠️ NEVER USE IN PRODUCTION!**

This removes all security restrictions and allows any authenticated user to access all data.

**When to use**:
- Local development only
- Testing without RLS complexity
- Troubleshooting RLS-related issues

**Status**: ⚠️ Development only - dangerous for production

---

### Optional: rls_policies_v1.sql

**Purpose**: Basic Row-Level Security policies

**What it includes**:
- Basic RLS policies for all tables
- Admin bypass rules
- Team-based access restrictions

**Why it's optional**:
The current application works without RLS enabled. RLS is recommended for production but not required for development.

**When to use**:
- When you're ready to enable RLS
- For production deployments
- When you need database-level security

**Status**: ✅ Working, use when needed

---

### Optional: rls_policies_v2_jwt.sql

**Purpose**: Advanced RLS policies using JWT claims

**What it includes**:
- RLS policies that read user role from JWT
- More efficient than querying user_profiles table
- Requires JWT claims to be set correctly

**Why it's optional**:
This is an alternative to v1 that's more performant but requires additional JWT configuration.

**When to use**:
- When you've configured JWT claims in Supabase Auth
- For better performance with RLS
- Alternative to rls_policies_v1.sql

**Status**: ✅ Working, but requires JWT setup

**Comparison with v1**:
- **v1**: Queries `user_profiles` table for role (slower)
- **v2**: Reads role from JWT claims (faster)

---

### Deprecated: deprecated_auth_migration_v1.sql

**Purpose**: Early attempt at user authentication migration

**Status**: ❌ Deprecated - superseded by 002_user_signup_triggers.sql

**Do not use**: This file contains old migration logic that has been improved and replaced.

---

### Deprecated: deprecated_auth_migration_v2.sql

**Purpose**: Second attempt at user authentication migration

**Status**: ❌ Deprecated - superseded by 002_user_signup_triggers.sql

**Do not use**: This file contains old migration logic that has been improved and replaced.

---

## 🎯 Quick Decision Guide

### "Should I run any of these files?"

**For most users**: **NO** - The main migrations (001-004) are sufficient.

**Exception**: You might want to run RLS policies if:
- You're deploying to production
- You need database-level security
- Your security requirements demand RLS

### "Which RLS policy file should I use?"

```
Do you have JWT claims configured? ──No──> Use rls_policies_v1.sql
         │
         Yes
         │
         └──> Use rls_policies_v2_jwt.sql (better performance)
```

### "When would I use auth_functions_optional.sql?"

Only if:
- You prefer database functions over application queries
- You want to call these functions from SQL directly
- You're migrating from older code that used these functions

## 🔐 Security Considerations

### RLS Policies

**Without RLS** (current default):
- ✅ Simpler development
- ✅ Easier debugging
- ❌ Less secure (relies on application-level checks)

**With RLS** (recommended for production):
- ✅ Database-level security
- ✅ Protection even if application has bugs
- ❌ More complex to debug
- ❌ Requires proper policy configuration

### Development vs Production

| Environment | RLS Enabled? | Which Policies? |
|-------------|--------------|-----------------|
| **Local Dev** | No | None (or use dev_disable_rls.sql) |
| **Staging** | Yes | rls_policies_v1.sql or v2 |
| **Production** | Yes | rls_policies_v2_jwt.sql (if JWT setup) or v1 |

## 📝 Usage Examples

### Enabling RLS (Production)

```bash
# 1. First, enable RLS on all tables
# Run in Supabase SQL Editor:

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_schedule ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

# 2. Then run the appropriate RLS policy file
# Choose ONE:
# - rls_policies_v1.sql (basic, no JWT required)
# - rls_policies_v2_jwt.sql (advanced, requires JWT claims)
```

### Using Auth Functions

```sql
-- After running auth_functions_optional.sql

-- Check if user is admin
SELECT is_admin('user-uuid-here');

-- Check if user can access team
SELECT can_access_team('user-uuid-here', 930);

-- Check if user is team mentor
SELECT is_team_mentor('user-uuid-here', 930);
```

### Disabling RLS (Development Only)

```bash
# WARNING: Development only!
# Run dev_disable_rls.sql in Supabase SQL Editor
```

## 🗂️ File Organization

```
optional/
├── README.md                           ← You are here
├── auth_functions_optional.sql         ← Database RPC functions
├── dev_disable_rls.sql                 ← Disable RLS (dev only)
├── rls_policies_v1.sql                 ← Basic RLS policies
├── rls_policies_v2_jwt.sql             ← Advanced RLS with JWT
├── deprecated_auth_migration_v1.sql    ← Old (don't use)
└── deprecated_auth_migration_v2.sql    ← Old (don't use)
```

## ⚠️ Important Notes

1. **Deprecated files are kept for reference only** - Do not run them
2. **RLS is recommended for production** - But test thoroughly first
3. **dev_disable_rls.sql is dangerous** - Never use in production
4. **Choose ONE RLS approach** - Don't mix v1 and v2

## 📚 Related Documentation

- [Main Migrations README](../README.md)
- [Audit Log Setup](../../../AUDIT_LOG_SETUP.md)
- [Project README](../../../README.md)

---

**Last Updated**: 2025-10-21
