# Scouters Management API Routes

Comprehensive API routes for managing scout profiles, certifications, experience tracking, and availability.

## Overview

These routes implement the scouters management feature (SCOUT-10) with full CRUD operations, filtering, search, pagination, and bulk import capabilities.

### Related Files

- **Types**: `/src/types/scouter.ts` - TypeScript type definitions
- **Database**: `/supabase/migrations/010_create_scouters_table.sql` - Database schema
- **Repository**: `/src/lib/repositories/scouter.repository.ts` - Data access layer

---

## Authentication

All routes require **admin authentication**. Requests must include a valid session cookie for a user with the `admin` role.

---

## Routes

### 1. List Scouters

**GET** `/api/admin/scouters`

List all scouters with optional filtering, search, and pagination.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `?page=2` |
| `limit` | number | Items per page (default: 20, max: 100) | `?limit=50` |
| `search` | string | Search by name or email | `?search=john` |
| `experience_level` | string | Filter by experience: `rookie`, `intermediate`, `veteran` | `?experience_level=veteran` |
| `team_number` | number | Filter by team affiliation | `?team_number=930` |
| `certification` | string | Filter by certification (has at least this one) | `?certification=pit_certified` |
| `preferred_role` | string | Filter by preferred role | `?preferred_role=match_scouting` |
| `sortBy` | string | Sort field: `created_at`, `total_matches_scouted`, etc. | `?sortBy=total_matches_scouted` |
| `sortOrder` | string | Sort order: `asc` or `desc` (default: `desc`) | `?sortOrder=asc` |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "team_number": 930,
      "experience_level": "veteran",
      "preferred_role": "both",
      "total_matches_scouted": 150,
      "total_events_attended": 5,
      "certifications": ["pit_certified", "match_certified", "lead_scout"],
      "availability_notes": "Available all weekends",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-11-08T14:22:00Z",
      "email": "john.doe@example.com",
      "full_name": "John Doe",
      "display_name": "JohnD",
      "team_name": "Mukwonago BEARBotics",
      "team_nickname": "BEARBotics"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### Status Codes

- `200` - Success
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not admin)
- `500` - Server error

---

### 2. Create Scouter

**POST** `/api/admin/scouters`

Create a new scouter profile.

#### Request Body

```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "experience_level": "rookie",
  "team_number": 930,
  "preferred_role": "match_scouting",
  "certifications": ["match_certified"],
  "availability_notes": "Available Saturdays only"
}
```

**Required Fields:**
- `user_id` (string, UUID) - Must reference existing user in `user_profiles`
- `experience_level` (string) - One of: `rookie`, `intermediate`, `veteran`

**Optional Fields:**
- `team_number` (number | null) - Must reference existing team
- `preferred_role` (string | null) - One of: `match_scouting`, `pit_scouting`, `both`
- `certifications` (array) - Array of valid certifications
- `availability_notes` (string | null) - Free text notes

#### Valid Certifications

- `pit_certified` - Completed pit scouting training
- `match_certified` - Completed match scouting training
- `lead_scout` - Qualified to coordinate other scouts
- `data_reviewer` - Can review and consolidate scouting data
- `trainer` - Can train new scouts
- `super_scout` - Can perform advanced strategic scouting

#### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "team_number": 930,
    "experience_level": "rookie",
    "preferred_role": "match_scouting",
    "total_matches_scouted": 0,
    "total_events_attended": 0,
    "certifications": ["match_certified"],
    "availability_notes": "Available Saturdays only",
    "created_at": "2024-11-08T15:00:00Z",
    "updated_at": "2024-11-08T15:00:00Z",
    "email": "jane.smith@example.com",
    "full_name": "Jane Smith",
    "display_name": "JaneS",
    "team_name": "Mukwonago BEARBotics",
    "team_nickname": "BEARBotics"
  }
}
```

#### Status Codes

- `201` - Created successfully
- `400` - Invalid input (missing fields, invalid values)
- `404` - User or team not found
- `409` - Conflict (user already has a scouter profile)
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Server error

---

### 3. Get Scouter

**GET** `/api/admin/scouters/{id}`

Get a single scouter by ID.

#### Path Parameters

- `id` (string, UUID) - Scouter ID

#### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "team_number": 930,
    "experience_level": "veteran",
    "preferred_role": "both",
    "total_matches_scouted": 150,
    "total_events_attended": 5,
    "certifications": ["pit_certified", "match_certified", "lead_scout"],
    "availability_notes": "Available all weekends",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-11-08T14:22:00Z",
    "email": "john.doe@example.com",
    "full_name": "John Doe",
    "display_name": "JohnD",
    "team_name": "Mukwonago BEARBotics",
    "team_nickname": "BEARBotics"
  }
}
```

#### Status Codes

- `200` - Success
- `404` - Scouter not found
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Server error

---

### 4. Update Scouter

**PATCH** `/api/admin/scouters/{id}`

Update an existing scouter (partial update - only provided fields are updated).

#### Path Parameters

- `id` (string, UUID) - Scouter ID

#### Request Body

All fields are optional. Only include fields you want to update.

```json
{
  "experience_level": "intermediate",
  "preferred_role": "both",
  "certifications": ["match_certified", "pit_certified"],
  "team_number": 930,
  "availability_notes": "Now available weekends and some weeknights",
  "total_matches_scouted": 75,
  "total_events_attended": 3
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "team_number": 930,
    "experience_level": "intermediate",
    "preferred_role": "both",
    "total_matches_scouted": 75,
    "total_events_attended": 3,
    "certifications": ["match_certified", "pit_certified"],
    "availability_notes": "Now available weekends and some weeknights",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-11-08T15:30:00Z",
    "email": "john.doe@example.com",
    "full_name": "John Doe",
    "display_name": "JohnD",
    "team_name": "Mukwonago BEARBotics",
    "team_nickname": "BEARBotics"
  }
}
```

#### Status Codes

- `200` - Updated successfully
- `400` - Invalid input
- `404` - Scouter or team not found
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Server error

---

### 5. Delete Scouter

**DELETE** `/api/admin/scouters/{id}`

Delete a scouter profile.

#### Path Parameters

- `id` (string, UUID) - Scouter ID

#### Response

```json
{
  "success": true,
  "message": "Scouter deleted successfully"
}
```

#### Status Codes

- `200` - Deleted successfully
- `404` - Scouter not found
- `409` - Conflict (scouter has associated data)
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Server error

---

### 6. Bulk Import Scouters

**POST** `/api/admin/scouters/import`

Import multiple scouters at once (max 100 per request).

#### Request Body

```json
{
  "scouters": [
    {
      "email": "john@example.com",
      "experience_level": "veteran",
      "team_number": 930,
      "preferred_role": "both",
      "certifications": ["pit_certified", "match_certified", "lead_scout"],
      "availability_notes": "Available weekends"
    },
    {
      "email": "jane@example.com",
      "experience_level": "intermediate",
      "preferred_role": "match_scouting",
      "certifications": ["match_certified"]
    },
    {
      "email": "bob@example.com",
      "experience_level": "rookie"
    }
  ]
}
```

**CSV Import Example:**

You can convert CSV to JSON for import:

```csv
email,experience_level,team_number,preferred_role,certifications,availability_notes
john@example.com,veteran,930,both,"pit_certified,match_certified,lead_scout",Available weekends
jane@example.com,intermediate,930,match_scouting,match_certified,
bob@example.com,rookie,,,,"First year scout"
```

#### Response

```json
{
  "success": true,
  "total": 3,
  "imported": 2,
  "failed": 1,
  "errors": [
    {
      "row": 2,
      "email": "jane@example.com",
      "error": "Scouter profile already exists for this user"
    }
  ]
}
```

#### Status Codes

- `200` - All imported successfully
- `207` - Partial success (some imported, some failed)
- `400` - Invalid request or all imports failed
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Server error

---

## Data Validation

### Experience Levels

- `rookie` - First season, learning the system
- `intermediate` - 1-2 seasons of experience, comfortable with basics
- `veteran` - 3+ seasons, can mentor others and handle complex scenarios

### Preferred Roles

- `match_scouting` - Observes matches from stands
- `pit_scouting` - Interviews teams in pit area
- `both` - Flexible, can do either role
- `null` - No preference specified

### Certifications

All certifications are stored in a JSONB array. Valid values:
- `pit_certified` - Completed pit scouting training
- `match_certified` - Completed match scouting training
- `lead_scout` - Qualified to coordinate other scouts
- `data_reviewer` - Can review and consolidate scouting data
- `trainer` - Can train new scouts
- `super_scout` - Can perform advanced strategic scouting

---

## Database Schema

The `scouters` table structure:

```sql
CREATE TABLE scouters (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  team_number INTEGER REFERENCES teams(team_number),
  experience_level TEXT NOT NULL DEFAULT 'rookie',
  preferred_role TEXT,
  total_matches_scouted INTEGER NOT NULL DEFAULT 0,
  total_events_attended INTEGER NOT NULL DEFAULT 0,
  certifications JSONB NOT NULL DEFAULT '[]'::JSONB,
  availability_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (experience_level IN ('rookie', 'intermediate', 'veteran')),
  CHECK (preferred_role IS NULL OR preferred_role IN ('match_scouting', 'pit_scouting', 'both'))
);
```

---

## Row-Level Security (RLS)

The `scouters` table has RLS policies:

- **Scouts** can view and update their own record (availability_notes only)
- **Mentors** can view scouters from their team
- **Admins** have full access (view, create, update, delete all records)

These API routes use the service client which bypasses RLS, but the routes enforce admin-only access via middleware.

---

## Auto-Incrementing Counters

The `total_matches_scouted` and `total_events_attended` fields are automatically updated by database triggers when:

- A match scouting entry is submitted
- A pit scouting entry is submitted at a new event

Admins can also manually adjust these counters via the PATCH endpoint if needed.

---

## Example Usage

### JavaScript/TypeScript

```typescript
// List scouters with filters
const response = await fetch('/api/admin/scouters?experience_level=veteran&limit=50', {
  credentials: 'include', // Include session cookie
});
const { data, pagination } = await response.json();

// Create new scouter
const newScouter = await fetch('/api/admin/scouters', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    experience_level: 'rookie',
    team_number: 930,
    preferred_role: 'match_scouting',
    certifications: ['match_certified'],
  }),
});

// Update scouter
const updated = await fetch('/api/admin/scouters/550e8400-e29b-41d4-a716-446655440000', {
  method: 'PATCH',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    experience_level: 'intermediate',
    certifications: ['match_certified', 'pit_certified'],
  }),
});

// Bulk import
const importResult = await fetch('/api/admin/scouters/import', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scouters: [
      {
        email: 'scout1@example.com',
        experience_level: 'rookie',
      },
      {
        email: 'scout2@example.com',
        experience_level: 'intermediate',
        team_number: 930,
      },
    ],
  }),
});
```

---

## Error Handling

All routes follow consistent error response format:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

Common error scenarios:
- **400** - Invalid input (validation errors)
- **401** - Not authenticated (no session cookie)
- **403** - Not authorized (user is not admin)
- **404** - Resource not found
- **409** - Conflict (duplicate, constraint violation)
- **500** - Server error (logged to console)

---

## Testing

To test these routes:

1. **Authenticate as admin** via `/api/auth/login`
2. **Use the routes** with the session cookie
3. **Check responses** match expected format
4. **Verify database** changes are persisted

### Example with curl:

```bash
# Login and save cookie
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# List scouters
curl -b cookies.txt http://localhost:3000/api/admin/scouters

# Create scouter
curl -b cookies.txt -X POST http://localhost:3000/api/admin/scouters \
  -H "Content-Type: application/json" \
  -d '{"user_id":"123...","experience_level":"rookie"}'
```

---

## Next Steps

To complete the scouters management feature:

1. **Create frontend UI** (`/src/app/admin/scouters/page.tsx`)
2. **Add Scouter form component** (`/src/components/admin/ScouterForm.tsx`)
3. **Add to admin sidebar** (`/src/components/admin/Sidebar.tsx`)
4. **Create React hooks** (`/src/hooks/useScouters.ts`)
5. **Write E2E tests** (`/tests/e2e/admin/scouters.spec.ts`)

See the admin events and teams implementations for reference patterns.
