# Migration 009: Add match_key Foreign Key Constraint

## Problem
Migration 008 added `match_key` to `match_scouting` as a convenience field, but it has no foreign key constraint. This led to:
- Using the wrong FK name in queries (`match_scouting_match_key_fkey` didn't exist)
- Having to use pattern matching (`LIKE`) instead of proper joins
- No data integrity guarantees on match_key values

## Solution
Add a proper foreign key constraint from `match_scouting.match_key` to `match_schedule.match_key`.

## What Migration 009 Does
1. **Ensures data integrity** - Backfills any NULL/empty match_key values from match_schedule
2. **Makes column NOT NULL** - match_key should always have a value
3. **Adds FK constraint** - `match_scouting_match_key_fkey` → `match_schedule(match_key)`
4. **Cascade deletes** - If a match is deleted, related scouting data is removed

## Benefits
- **Cleaner queries** - Can use Supabase's FK join syntax
- **Data integrity** - Invalid match_key values are prevented
- **Better performance** - Join on indexed unique key instead of pattern matching
- **Self-documenting** - Schema shows the relationship

## How to Apply

### Option 1: Via Supabase Dashboard
1. Go to Supabase Dashboard → Database → SQL Editor
2. Copy the contents of `supabase/migrations/009_add_match_key_fk.sql`
3. Run the SQL
4. Verify success

### Option 2: Via Supabase CLI (if linked)
```bash
npx supabase db push
```

### Option 3: Via MCP (if authenticated)
Can use the `mcp__supabase__apply_migration` tool

## Code Changes Already Made
The repository code (`src/lib/repositories/scouting-data.repository.ts`) has been updated to use the new FK constraint:

**Before (temporary fix):**
```typescript
match_schedule!match_scouting_match_id_fkey(...)
```

**After (proper solution with migration 009):**
```typescript
match_schedule!match_scouting_match_key_fkey(...)
```

## Testing After Migration
1. Load the scouting data page: `/admin/scouting`
2. Select an event from the dropdown
3. Verify data loads without 500 errors
4. Check that match details show correctly

## Rollback (if needed)
```sql
-- Remove FK constraint
ALTER TABLE match_scouting
DROP CONSTRAINT IF EXISTS match_scouting_match_key_fkey;

-- Make column nullable again
ALTER TABLE match_scouting
ALTER COLUMN match_key DROP NOT NULL;
```

## Notes
- The `match_id` FK remains the primary relationship
- `match_key` FK is for convenience and data integrity
- Having two FKs to the same table is valid and useful here
- Migration is safe - it backfills data before adding constraints
