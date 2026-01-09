# Scouters Management API - Implementation Summary

**Feature**: SCOUT-10 - Scouters Management API Routes
**Date**: 2024-11-08
**Status**: ✅ Complete - Ready for Frontend Integration

---

## Overview

Comprehensive API routes for managing scout profiles, including experience tracking, certifications, team affiliations, and availability management.

---

## Files Created

### API Routes

1. **`/src/app/api/admin/scouters/route.ts`** (268 lines)
   - `GET` - List scouters with filtering, search, and pagination
   - `POST` - Create new scouter profile

2. **`/src/app/api/admin/scouters/[id]/route.ts`** (278 lines)
   - `GET` - Get single scouter by ID
   - `PATCH` - Update scouter (partial update)
   - `DELETE` - Delete scouter

3. **`/src/app/api/admin/scouters/import/route.ts`** (262 lines)
   - `POST` - Bulk import scouters (max 100 per request)
   - Validates each row, returns detailed success/error report

### Documentation

4. **`/src/app/api/admin/scouters/README.md`** (Comprehensive API documentation)
   - All endpoints documented with examples
   - Request/response formats
   - Error handling
   - Data validation rules
   - Testing examples

5. **`SCOUTERS_API_IMPLEMENTATION.md`** (This file)
   - Implementation summary

---

## Key Features

### Authentication & Authorization
- ✅ All routes require **admin authentication**
- ✅ Uses `requireAdmin()` middleware from `/src/lib/api/auth-middleware.ts`
- ✅ Returns 401 if not authenticated, 403 if not admin

### List Scouters (GET /api/admin/scouters)
- ✅ Pagination (page, limit)
- ✅ Search by name or email (joins user_profiles table)
- ✅ Filter by:
  - Experience level (rookie, intermediate, veteran)
  - Team number
  - Certification (JSONB array contains)
  - Preferred role
- ✅ Sorting (any field, asc/desc)
- ✅ Returns flattened data with user profile and team info
- ✅ Pagination metadata (total, has_more)

### Create Scouter (POST /api/admin/scouters)
- ✅ Validates required fields (user_id, experience_level)
- ✅ Type guards for experience_level, preferred_role, certifications
- ✅ Checks for duplicate user_id
- ✅ Verifies user exists in user_profiles
- ✅ Verifies team exists (if team_number provided)
- ✅ Returns created scouter with joined data

### Get Scouter (GET /api/admin/scouters/[id])
- ✅ Fetch single scouter by UUID
- ✅ Joins user_profiles and teams
- ✅ Returns 404 if not found

### Update Scouter (PATCH /api/admin/scouters/[id])
- ✅ Partial update (only provided fields)
- ✅ Validates all fields with type guards
- ✅ Verifies scouter exists before update
- ✅ Verifies team exists (if updating team_number)
- ✅ Validates activity counters (non-negative numbers)
- ✅ Returns 400 if no valid fields to update
- ✅ Auto-updates updated_at timestamp

### Delete Scouter (DELETE /api/admin/scouters/[id])
- ✅ Verifies scouter exists
- ✅ Handles CASCADE constraints
- ✅ Returns 409 if foreign key constraint violation
- ✅ Returns success message

### Bulk Import (POST /api/admin/scouters/import)
- ✅ Accepts array of scouters (max 100)
- ✅ Validates each row individually
- ✅ Finds user by email
- ✅ Checks for existing scouter profile
- ✅ Verifies team exists (if provided)
- ✅ Returns detailed success/error report per row
- ✅ Status codes: 200 (all success), 207 (partial), 400 (all failed)

---

## Data Validation

### Experience Levels
- `rookie` - First season
- `intermediate` - 1-2 seasons
- `veteran` - 3+ seasons

### Preferred Roles
- `match_scouting` - Match observations
- `pit_scouting` - Pit interviews
- `both` - Flexible
- `null` - No preference

### Certifications (JSONB Array)
- `pit_certified` - Pit training complete
- `match_certified` - Match training complete
- `lead_scout` - Can coordinate scouts
- `data_reviewer` - Can review/consolidate data
- `trainer` - Can train new scouts
- `super_scout` - Advanced strategic scouting

---

## Type Safety

All routes use TypeScript types from `/src/types/scouter.ts`:
- ✅ `CreateScouterInput` - Create operations
- ✅ `UpdateScouterInput` - Update operations
- ✅ `ScouterWithUser` - Response type with joined fields
- ✅ Type guards: `isExperienceLevel()`, `isPreferredRole()`, `areCertifications()`

**TypeScript Compilation**: ✅ All files pass `npm run type-check` with no errors

---

## Database Integration

### Tables
- **Primary**: `scouters`
- **Joins**: `user_profiles` (for name/email), `teams` (for team name)

### Constraints
- `user_id` - UNIQUE, FK to auth.users, CASCADE delete
- `team_number` - FK to teams
- `experience_level` - CHECK constraint (rookie, intermediate, veteran)
- `preferred_role` - CHECK constraint (match_scouting, pit_scouting, both, null)
- `certifications` - JSONB array with GIN index

### Auto-Incrementing Counters
- `total_matches_scouted` - Updated by trigger on match_scouting INSERT
- `total_events_attended` - Calculated from distinct events scouted
- Can be manually adjusted by admins via PATCH endpoint

---

## Error Handling

All routes follow consistent error response format:

```typescript
{
  error: string,
  details?: string  // Optional additional context
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `207` - Multi-status (partial success in bulk import)
- `400` - Bad request (validation errors)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not admin)
- `404` - Not found
- `409` - Conflict (duplicate, constraint violation)
- `500` - Internal server error

---

## Query Examples

### List veteran scouts from team 930
```
GET /api/admin/scouters?experience_level=veteran&team_number=930
```

### Search for scouts by name
```
GET /api/admin/scouters?search=john&limit=50
```

### Find scouts with lead_scout certification
```
GET /api/admin/scouters?certification=lead_scout
```

### Get top scouts by matches scouted
```
GET /api/admin/scouters?sortBy=total_matches_scouted&sortOrder=desc&limit=10
```

---

## Integration Patterns

### Follows Existing Patterns
- ✅ Auth middleware usage (same as `/api/admin/events/`)
- ✅ Response format (same as `/api/admin/teams/`)
- ✅ Error handling (consistent with codebase)
- ✅ Pagination structure (matches existing endpoints)
- ✅ TypeScript types and validation

### Database Queries
- Uses Supabase service client (bypasses RLS for admin operations)
- Joins user_profiles and teams in single query (efficient)
- Counts with `{ count: 'exact' }` for pagination
- Uses `.single()` for single-record fetches
- Handles PGRST116 (not found) and 23503 (FK violation) error codes

---

## Testing Checklist

### Manual Testing (Recommended)

1. **Authentication**
   - [ ] Unauthorized requests return 401
   - [ ] Non-admin users return 403
   - [ ] Admin users can access all routes

2. **List Scouters**
   - [ ] Returns paginated results
   - [ ] Search filters work (name, email)
   - [ ] Experience level filter works
   - [ ] Team number filter works
   - [ ] Certification filter works
   - [ ] Sorting works (asc/desc)
   - [ ] User profile and team data are joined

3. **Create Scouter**
   - [ ] Creates with required fields only
   - [ ] Creates with all optional fields
   - [ ] Rejects missing required fields
   - [ ] Rejects invalid experience_level
   - [ ] Rejects invalid preferred_role
   - [ ] Rejects invalid certifications
   - [ ] Rejects duplicate user_id
   - [ ] Rejects non-existent user_id
   - [ ] Rejects non-existent team_number

4. **Get Scouter**
   - [ ] Returns scouter by ID
   - [ ] Returns 404 for non-existent ID
   - [ ] Includes user profile data
   - [ ] Includes team data (if team_number set)

5. **Update Scouter**
   - [ ] Updates single field
   - [ ] Updates multiple fields
   - [ ] Partial update works (omitted fields unchanged)
   - [ ] Rejects invalid values
   - [ ] Returns 404 for non-existent ID
   - [ ] Updates updated_at timestamp

6. **Delete Scouter**
   - [ ] Deletes scouter successfully
   - [ ] Returns 404 for non-existent ID
   - [ ] Handles CASCADE properly (deletes with user)
   - [ ] Returns 409 if constraint violation

7. **Bulk Import**
   - [ ] Imports all valid rows
   - [ ] Reports errors for invalid rows
   - [ ] Continues processing after errors
   - [ ] Returns detailed error report
   - [ ] Respects 100 row limit

### E2E Testing (Next Step)
Create `/tests/e2e/admin/scouters.spec.ts` with Playwright tests covering all routes.

---

## Next Steps for Frontend Integration

To complete the scouters management feature:

### 1. Admin UI Page
**File**: `/src/app/admin/scouters/page.tsx`
- Scouters list table
- Search and filter controls
- Create/edit/delete buttons
- Pagination controls
- Follow pattern from `/src/app/admin/events/page.tsx`

### 2. Scouter Form Component
**File**: `/src/components/admin/ScouterForm.tsx`
- User selection (dropdown or autocomplete)
- Experience level select
- Team number select (optional)
- Preferred role select
- Certifications multi-select
- Availability notes textarea
- Follow pattern from `/src/components/admin/EventForm.tsx`

### 3. React Hook
**File**: `/src/hooks/useScouters.ts`
```typescript
export function useScouters(filters?: ScouterFilters) {
  // Fetch scouters list with SWR
  // Return { scouters, loading, error, mutate }
}

export function useScouter(id: string) {
  // Fetch single scouter
  // Return { scouter, loading, error, mutate }
}
```

### 4. Admin Sidebar
**File**: `/src/components/admin/Sidebar.tsx`
Add "Scouters" link in navigation menu.

### 5. Bulk Import UI (Optional)
**File**: `/src/components/admin/ScouterImportForm.tsx`
- CSV upload
- JSON input
- Progress indicator
- Error display

---

## API Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/scouters` | List scouters with filters |
| `POST` | `/api/admin/scouters` | Create new scouter |
| `GET` | `/api/admin/scouters/[id]` | Get single scouter |
| `PATCH` | `/api/admin/scouters/[id]` | Update scouter |
| `DELETE` | `/api/admin/scouters/[id]` | Delete scouter |
| `POST` | `/api/admin/scouters/import` | Bulk import scouters |

---

## Code Quality

- ✅ **Type Safety**: All TypeScript, no `any` types
- ✅ **Error Handling**: Comprehensive try-catch, specific error messages
- ✅ **Validation**: Type guards, constraint checks, FK verification
- ✅ **Consistency**: Follows existing codebase patterns
- ✅ **Documentation**: Inline comments, comprehensive README
- ✅ **Edge Cases**: Handles not found, duplicates, FK violations
- ✅ **Performance**: Single-query joins, efficient pagination

---

## Related Files Reference

### Types
- `/src/types/scouter.ts` - All scouter-related types and type guards

### Database
- `/supabase/migrations/010_create_scouters_table.sql` - Schema, indexes, RLS, triggers

### Repository (For Future Service Layer)
- `/src/lib/repositories/scouter.repository.ts` - Data access layer (has some outdated field names)

### Auth
- `/src/lib/api/auth-middleware.ts` - Authentication helpers

### Existing Admin Routes (Reference Patterns)
- `/src/app/api/admin/events/route.ts`
- `/src/app/api/admin/events/[id]/route.ts`
- `/src/app/api/admin/teams/route.ts`
- `/src/app/api/admin/teams/[id]/route.ts`

---

## Implementation Notes

### Design Decisions

1. **Service Client vs Repository**
   - Used Supabase service client directly (bypasses RLS)
   - Repository layer exists but has outdated field names
   - Direct queries are simpler and follow existing admin route patterns

2. **Joined Queries**
   - Single query joins user_profiles and teams for efficiency
   - Flattens response structure for easier frontend consumption
   - Avoids N+1 queries

3. **PATCH vs PUT**
   - Used PATCH for partial updates (common REST pattern)
   - Only updates provided fields
   - Explicit validation for each field

4. **Bulk Import Strategy**
   - Process rows sequentially (not parallel)
   - Continue on error (don't fail entire batch)
   - Return detailed per-row error report
   - 100 row limit prevents timeout

5. **Type Validation**
   - Uses type guards from `/src/types/scouter.ts`
   - Validates at API boundary before database insertion
   - Clear error messages for validation failures

---

## Performance Considerations

- **Indexes**: GIN index on certifications JSONB for efficient filtering
- **Joins**: Single query with LEFT JOIN (teams may be null)
- **Pagination**: Uses LIMIT/OFFSET with total count
- **Search**: Uses ILIKE on joined user_profiles fields (consider full-text search for large datasets)

---

## Security

- ✅ Admin-only access enforced by middleware
- ✅ Input validation prevents SQL injection
- ✅ Type guards prevent invalid data
- ✅ Foreign key constraints enforced at database level
- ✅ RLS policies in place (bypassed by service client for admin operations)
- ✅ CASCADE delete on user removal (automatic cleanup)

---

## Maintenance

### Future Enhancements

1. **Statistics Endpoint** (`GET /api/admin/scouters/stats`)
   - Total scouters by experience level
   - Total scouters by certification
   - Average matches per scouter
   - Most active scouters

2. **Leaderboard Endpoint** (`GET /api/admin/scouters/leaderboard`)
   - Use `scouter_leaderboard` view from migration
   - Sorted by matches scouted
   - Skill level calculation

3. **CSV Export** (`GET /api/admin/scouters/export`)
   - Export filtered scouters to CSV
   - Include all fields

4. **Assignment Endpoint** (`POST /api/admin/scouters/assign`)
   - Assign scouters to matches
   - Respect availability and preferences

---

## Success Criteria

- ✅ All routes compile without TypeScript errors
- ✅ Comprehensive input validation
- ✅ Consistent error handling
- ✅ Follows existing codebase patterns
- ✅ Detailed API documentation
- ✅ Ready for frontend integration
- ⏳ E2E tests (next step)
- ⏳ Frontend UI (next step)

---

**Status**: Ready for frontend integration and testing. All API routes are complete, documented, and follow best practices.
