# Match Scouting API Endpoint

RESTful API endpoint for submitting and retrieving match scouting observations.

## Base URL
`/api/match-scouting`

---

## POST - Submit Match Scouting Observation

Submit a new match scouting observation with season-specific JSONB validation.

### Authentication
**Required** - User must be authenticated

### Request Body

```typescript
{
  // Required core fields
  match_id: number;              // FK to match_schedule table
  team_number: number;           // FK to teams table
  scout_name: string;            // Name of scout submitting data

  // Required JSONB performance data (season-specific)
  auto_performance: {
    schema_version: "2025.1";    // Must match supported version
    // ... season-specific auto fields
  };
  teleop_performance: {
    schema_version: "2025.1";
    // ... season-specific teleop fields
  };
  endgame_performance: {
    schema_version: "2025.1";
    // ... season-specific endgame fields
  };

  // Optional fixed fields
  alliance_color?: "red" | "blue";  // Defaults to "blue"
  starting_position?: 1 | 2 | 3;    // Robot's starting position

  // Optional reliability tracking (defaults to false/0)
  robot_disconnected?: boolean;
  robot_disabled?: boolean;
  robot_tipped?: boolean;
  foul_count?: number;
  tech_foul_count?: number;
  yellow_card?: boolean;
  red_card?: boolean;

  // Optional qualitative ratings (1-5 scale)
  defense_rating?: number;
  driver_skill_rating?: number;
  speed_rating?: number;

  // Optional free-form observations
  strengths?: string;
  weaknesses?: string;
  notes?: string;

  // Optional metadata
  confidence_level?: number;      // Scout's confidence (1-5)
  device_id?: string;             // For offline sync tracking
}
```

### Example Request (2025 Reefscape)

```json
{
  "match_id": 1234,
  "team_number": 930,
  "scout_name": "Alice Smith",
  "alliance_color": "red",
  "starting_position": 2,
  "auto_performance": {
    "schema_version": "2025.1",
    "left_starting_zone": true,
    "algae_scored_net": 2,
    "algae_scored_processor": 1,
    "coral_l1_scored": 0,
    "coral_l2_scored": 0,
    "coral_l3_scored": 0,
    "coral_l4_scored": 1,
    "notes": "Smooth autonomous, 3-piece"
  },
  "teleop_performance": {
    "schema_version": "2025.1",
    "algae_scored_net": 8,
    "algae_scored_processor": 3,
    "coral_l1_scored": 2,
    "coral_l2_scored": 1,
    "coral_l3_scored": 1,
    "coral_l4_scored": 0,
    "algae_removed_reef": 0,
    "algae_removed_processor": 0,
    "cycles_completed": 6,
    "notes": "Fast cycles, good driver"
  },
  "endgame_performance": {
    "schema_version": "2025.1",
    "park_location": "shallow",
    "climb_level": "none",
    "climbed_successfully": false,
    "cage_time_seconds": 8,
    "endgame_points": 2,
    "notes": "Parked in shallow zone"
  },
  "defense_rating": 3,
  "driver_skill_rating": 4,
  "speed_rating": 5,
  "strengths": "Excellent cycle speed, reliable scoring",
  "weaknesses": "No climbing capability",
  "notes": "Strong match overall",
  "confidence_level": 5
}
```

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "match_id": 1234,
    "team_number": 930,
    "scout_name": "Alice Smith",
    "alliance_color": "red",
    "starting_position": 2,
    "robot_disconnected": false,
    "robot_disabled": false,
    "robot_tipped": false,
    "foul_count": 0,
    "tech_foul_count": 0,
    "yellow_card": false,
    "red_card": false,
    "auto_performance": { /* ... */ },
    "teleop_performance": { /* ... */ },
    "endgame_performance": { /* ... */ },
    "defense_rating": 3,
    "driver_skill_rating": 4,
    "speed_rating": 5,
    "strengths": "Excellent cycle speed, reliable scoring",
    "weaknesses": "No climbing capability",
    "notes": "Strong match overall",
    "confidence_level": 5,
    "created_at": "2025-10-24T12:00:00Z",
    "updated_at": "2025-10-24T12:00:00Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Required Fields
```json
{
  "success": false,
  "error": "Missing required fields: scout_name, auto_performance",
  "errors": {
    "missing_fields": ["scout_name", "auto_performance"]
  }
}
```

#### 400 Bad Request - Validation Failed
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": {
    "validation_errors": [
      {
        "field": "auto_performance.algae_scored_net",
        "message": "Field 'algae_scored_net' must be >= 0",
        "value": -1
      },
      {
        "field": "teleop_performance.schema_version",
        "message": "Field 'schema_version' must be '2025.1'",
        "value": "2024.1"
      }
    ]
  }
}
```

#### 400 Bad Request - Unknown Schema Version
```json
{
  "success": false,
  "error": "Unknown schema version: 2026.1. Supported versions: 2025.1",
  "errors": {
    "schema_version": "2026.1"
  }
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 409 Conflict - Duplicate Observation
```json
{
  "success": false,
  "error": "Duplicate observation: This scout has already submitted data for this team in this match",
  "errors": {
    "constraint": "match_id, team_number, scout_name",
    "match_id": 1234,
    "team_number": 930,
    "scout_name": "Alice Smith"
  }
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Database error: <error details>"
}
```

---

## GET - Retrieve Match Scouting Observations

Fetch match scouting observations with filtering and pagination.

### Authentication
**Required** - User must be authenticated

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `match_id` | number | No | - | Filter by specific match |
| `team_number` | number | No | - | Filter by specific team |
| `event_key` | string | No | - | Filter by event (joins through matches) |
| `scout_name` | string | No | - | Filter by scout name |
| `limit` | number | No | 50 | Max results per page (max 200) |
| `offset` | number | No | 0 | Pagination offset |

### Example Requests

```bash
# Get all observations for a specific match
GET /api/match-scouting?match_id=1234

# Get all observations for a team at an event
GET /api/match-scouting?team_number=930&event_key=2025casd

# Get all observations by a specific scout
GET /api/match-scouting?scout_name=Alice+Smith

# Paginated results
GET /api/match-scouting?limit=20&offset=40

# Combined filters
GET /api/match-scouting?event_key=2025casd&team_number=930&limit=10
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "match_id": 1234,
        "team_number": 930,
        "scout_name": "Alice Smith",
        "alliance_color": "red",
        "starting_position": 2,
        "auto_performance": { /* ... */ },
        "teleop_performance": { /* ... */ },
        "endgame_performance": { /* ... */ },
        "defense_rating": 3,
        "driver_skill_rating": 4,
        "speed_rating": 5,
        "created_at": "2025-10-24T12:00:00Z",
        "match": {
          "match_key": "2025casd_qm42",
          "event_key": "2025casd",
          "comp_level": "qm",
          "match_number": 42,
          "scheduled_time": "2025-03-15T14:30:00Z",
          "event": {
            "event_name": "San Diego Regional",
            "event_code": "casd",
            "year": 2025
          }
        }
      },
      // ... more observations
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 127,
      "has_more": true
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Parameters
```json
{
  "success": false,
  "error": "Invalid team_number parameter"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Database error: <error details>"
}
```

---

## Schema Version Support

The API automatically routes to the appropriate validator based on the `schema_version` field in the JSONB performance data.

### Currently Supported Versions
- **2025.1** - Reefscape game (2025 season)

### Adding New Season Support

When a new FRC season is announced:

1. Create season types: `src/types/season-YYYY.ts`
2. Create season config: `src/lib/config/season-YYYY.ts`
3. Add validators: `src/lib/supabase/validation.ts`
4. Update this route to support new schema version

See `CLAUDE.md` for complete season transition guide.

---

## Database Schema

The `match_scouting` table uses a hybrid structure:

**Fixed Columns** (never change):
- `id`, `match_id`, `team_number`, `scout_name`
- `alliance_color`, `starting_position`
- Reliability tracking (disconnected, disabled, tipped, fouls)
- Qualitative ratings (defense, driver skill, speed)
- Free-form notes

**JSONB Columns** (season-specific):
- `auto_performance` - Autonomous period data
- `teleop_performance` - Teleoperated period data
- `endgame_performance` - Endgame period data

Each JSONB field **must** include a `schema_version` field for validation routing.

---

## Multi-Scout Consolidation

Multiple scouts can observe the same team in the same match. The database enforces a unique constraint on `(match_id, team_number, scout_name)`.

For consolidated data across multiple scouts, use the `consolidated_match_data` view or aggregation queries (not part of this endpoint).

---

## Validation

All JSONB data is validated against JSON schemas defined in:
- `src/lib/config/season-2025.ts` (or respective year)

Validation checks:
- Required fields are present
- Field types are correct (number, string, boolean)
- Numeric values are within min/max bounds
- Enum values are valid
- Schema version matches expected version

---

## Testing

### Manual Testing with curl

```bash
# POST - Submit observation
curl -X POST http://localhost:3000/api/match-scouting \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-auth-token=..." \
  -d @test-observation.json

# GET - Fetch observations
curl "http://localhost:3000/api/match-scouting?team_number=930" \
  -H "Cookie: sb-auth-token=..."
```

### Test with Supabase Auth

Ensure you have a valid Supabase auth session cookie. You can obtain this by:
1. Logging into the web app
2. Copying the `sb-*` cookies from browser DevTools
3. Using them in API requests

---

## Performance Considerations

### Indexes
The database includes indexes on:
- `match_id` - Fast filtering by match
- `team_number` - Fast filtering by team
- `scout_name` - Fast filtering by scout
- `created_at` - Fast ordering and pagination
- GIN indexes on JSONB columns - Fast JSONB queries

### Query Optimization
- The GET endpoint joins with `match_schedule` and `events` tables
- Uses `select(*, match(...))` to embed related data
- Limits results to max 200 per request
- Uses `count: 'exact'` for pagination metadata

### Rate Limiting
Not currently implemented. Consider adding rate limiting for production:
- Per-user submission limits
- Per-device submission limits
- API-wide request limits

---

## Future Enhancements

- [ ] PATCH endpoint for updating observations
- [ ] DELETE endpoint for removing observations
- [ ] Bulk submission endpoint (array of observations)
- [ ] Real-time subscriptions using Supabase Realtime
- [ ] Export to CSV/JSON
- [ ] Advanced filtering (date ranges, rating thresholds)
- [ ] Aggregation endpoints (stats by team, scout performance)
- [ ] Rate limiting and request throttling
- [ ] API versioning (`/api/v1/match-scouting`)
