# Admin Dashboard Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      User Browser                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Admin Dashboard UI (React 19)                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │ Events   │  │  Teams   │  │ Matches  │  ...       │ │
│  │  │  CRUD    │  │   CRUD   │  │   CRUD   │            │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            │ │
│  │       │             │             │                    │ │
│  │       └─────────────┴─────────────┘                    │ │
│  │                     │                                   │ │
│  │         ┌───────────▼───────────┐                      │ │
│  │         │  Reusable Components  │                      │ │
│  │         │  (DataTable, Forms,   │                      │ │
│  │         │   Toast, etc.)        │                      │ │
│  │         └───────────────────────┘                      │ │
│  └────────────────────┬───────────────────────────────────┘ │
└────────────────────────┼────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js 15 Server (App Router)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  API Routes                             │ │
│  │  /api/admin/events    /api/admin/teams                 │ │
│  │  /api/admin/matches   /api/admin/scouters              │ │
│  │  /api/admin/scouting  /api/admin/seasons               │ │
│  └────────────────────┬───────────────────────────────────┘ │
└────────────────────────┼────────────────────────────────────┘
                         │ Supabase SDK
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase (PostgreSQL)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  teams │ events │ match_schedule │ match_scouting     │ │
│  │  pit_scouting │ season_config │ scouters             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Layout                              │
│  ┌─────────────┐  ┌────────────────────────────────────┐   │
│  │             │  │         Top Header Bar              │   │
│  │  Sidebar    │  │  (User info, notifications)         │   │
│  │  Navigation │  └────────────────────────────────────┘   │
│  │             │  ┌────────────────────────────────────┐   │
│  │  - Events   │  │                                     │   │
│  │  - Teams    │  │        Page Content                 │   │
│  │  - Matches  │  │      (Dynamic Routes)               │   │
│  │  - Scouters │  │                                     │   │
│  │  - Scouting │  │   ┌─────────────────────────────┐  │   │
│  │  - Seasons  │  │   │   List View (DataTable)     │  │   │
│  │             │  │   │   or Form (Create/Edit)     │  │   │
│  │             │  │   └─────────────────────────────┘  │   │
│  └─────────────┘  └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow - List View

```
┌─────────────────────────────────────────────────────────────┐
│  1. User visits /admin/events                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. EventsPage component loads                               │
│     - Initialize state (loading, pagination, sort)           │
│     - Call fetchEvents()                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. API Request: GET /api/admin/events?page=1&limit=20      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. API Route Handler                                        │
│     - Parse query params                                     │
│     - Build Supabase query                                   │
│     - Apply filters, sorting, pagination                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Supabase Query                                           │
│     SELECT * FROM events                                     │
│     WHERE ... ORDER BY ... LIMIT ... OFFSET ...              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Response back to client                                  │
│     { data: [...], pagination: {...} }                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. EventsPage updates state                                 │
│     - setEvents(data)                                        │
│     - setPagination(...)                                     │
│     - setLoading(false)                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  8. DataTable renders with data                              │
│     - Shows table rows                                       │
│     - Enables sorting, pagination                            │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow - Create/Edit

```
┌─────────────────────────────────────────────────────────────┐
│  1. User clicks "Create Event" or "Edit"                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Navigate to form page                                    │
│     /admin/events/new or /admin/events/[id]/edit            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (if edit)
┌─────────────────────────────────────────────────────────────┐
│  3. Fetch existing data                                      │
│     GET /api/admin/events/[id]                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. EventForm renders with data                              │
│     - Initialize form state                                  │
│     - Pre-populate if editing                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. User fills form and submits                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Validate form data                                       │
│     - Check required fields                                  │
│     - Validate formats                                       │
│     - Show errors if invalid                                 │
└────────────────────┬────────────────────────────────────────┘
                     │ (if valid)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Submit to API                                            │
│     POST /api/admin/events (create)                          │
│     PUT /api/admin/events/[id] (update)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  8. API validates and saves to Supabase                      │
│     INSERT INTO ... or UPDATE ... SET ...                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  9. Response to client                                       │
│     { success: true, data: {...} }                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  10. Show success toast + redirect to list                   │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
AdminLayout
├── ToastProvider (context)
├── Sidebar
│   └── Navigation Links
├── Header
│   └── User Info
└── Page Content (children)
    │
    ├── EventsPage (List)
    │   ├── SearchBar
    │   ├── Button (Create)
    │   └── DataTable
    │       ├── Table Header (sortable)
    │       ├── Table Rows
    │       │   └── ActionButtons (Edit/Delete)
    │       └── Pagination Controls
    │
    ├── NewEventPage (Create)
    │   └── Card
    │       └── EventForm
    │           ├── Input fields
    │           ├── Dropdowns
    │           └── Submit/Cancel buttons
    │
    └── EditEventPage (Edit)
        └── LoadingSpinner (while fetching)
        └── Card
            └── EventForm (pre-populated)
```

## State Management

### Page-Level State (React Hooks)
```typescript
// List View State
const [items, setItems] = useState<T[]>([]);
const [loading, setLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState('');
const [pagination, setPagination] = useState<PaginationConfig>({
  page: 1,
  limit: 20,
  total: 0,
});
const [sortBy, setSortBy] = useState<string>('created_at');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

// Form State
const [formData, setFormData] = useState<FormData>({...});
const [errors, setErrors] = useState<FormErrors>({});
const [submitting, setSubmitting] = useState(false);
```

### Global State (Context)
```typescript
// Toast Context (global notifications)
const ToastContext = createContext<ToastContextType>();

// Usage across components
const { showToast } = useToast();
showToast('success', 'Operation completed!');
```

## Type System

```
src/types/
├── index.ts                    # Core types (Team, Event, etc.)
│   ├── Team
│   ├── Event
│   ├── MatchSchedule
│   ├── MatchScouting
│   ├── PitScouting
│   └── SeasonConfig
│
├── season-2025.ts             # 2025 season-specific types
│   ├── AutoPerformance2025
│   ├── TeleopPerformance2025
│   └── EndgamePerformance2025
│
└── admin.ts                   # Admin-specific types
    ├── Scouter
    ├── Column<T>
    ├── PaginationConfig
    ├── EventFormData
    ├── TeamFormData
    └── DashboardStats
```

## API Route Pattern

```typescript
// List + Create
// src/app/api/admin/[entity]/route.ts

export async function GET(request: NextRequest) {
  // 1. Parse query params (page, limit, sortBy, sortOrder, search)
  // 2. Build Supabase query with filters
  // 3. Execute query with pagination
  // 4. Return { data, pagination }
}

export async function POST(request: NextRequest) {
  // 1. Parse request body
  // 2. Validate required fields
  // 3. Insert into Supabase
  // 4. Return created record
}

// Single Item Operations
// src/app/api/admin/[entity]/[id]/route.ts

export async function GET(request, { params }) {
  // 1. Extract ID from params
  // 2. Query single record
  // 3. Return record or 404
}

export async function PUT(request, { params }) {
  // 1. Extract ID from params
  // 2. Parse request body
  // 3. Update record in Supabase
  // 4. Return updated record
}

export async function DELETE(request, { params }) {
  // 1. Extract ID from params
  // 2. Delete from Supabase
  // 3. Handle foreign key constraints
  // 4. Return success/error
}
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                         teams                                │
│  - team_number (PK)                                          │
│  - team_key                                                  │
│  - team_name                                                 │
│  - team_nickname                                             │
│  - city, state_province, country                             │
│  - rookie_year                                               │
│  - website                                                   │
│  - created_at, updated_at                                    │
└─────────────────────────────────────────────────────────────┘
                     ▲
                     │ FK: team_affiliation
                     │
┌─────────────────────────────────────────────────────────────┐
│                       scouters                               │
│  - id (PK, UUID)                                             │
│  - scout_name                                                │
│  - team_affiliation (FK → teams)                             │
│  - role (lead/scout/admin)                                   │
│  - email, phone                                              │
│  - active                                                    │
│  - created_at, updated_at                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        events                                │
│  - event_key (PK)                                            │
│  - event_name                                                │
│  - event_code                                                │
│  - year                                                      │
│  - event_type                                                │
│  - district, week                                            │
│  - city, state_province, country                             │
│  - start_date, end_date                                      │
│  - created_at, updated_at                                    │
└─────────────────────────────────────────────────────────────┘
                     ▲
                     │ FK: event_key
                     │
┌─────────────────────────────────────────────────────────────┐
│                    match_schedule                            │
│  - match_id (PK)                                             │
│  - event_key (FK → events)                                   │
│  - match_key                                                 │
│  - comp_level (qm/ef/qf/sf/f)                                │
│  - match_number                                              │
│  - red_1, red_2, red_3 (FK → teams)                          │
│  - blue_1, blue_2, blue_3 (FK → teams)                       │
│  - red_score, blue_score                                     │
│  - winning_alliance                                          │
│  - scheduled_time, actual_time                               │
│  - created_at, updated_at                                    │
└─────────────────────────────────────────────────────────────┘
                     ▲
                     │ FK: match_id
                     │
┌─────────────────────────────────────────────────────────────┐
│                    match_scouting                            │
│  - id (PK, UUID)                                             │
│  - match_id (FK → match_schedule)                            │
│  - team_number (FK → teams)                                  │
│  - scout_name                                                │
│  - alliance_color                                            │
│  - starting_position                                         │
│  - robot_disconnected, robot_disabled, etc.                  │
│  - foul_count, tech_foul_count                               │
│  - auto_performance (JSONB) ◄── Season-specific              │
│  - teleop_performance (JSONB) ◄── Season-specific            │
│  - endgame_performance (JSONB) ◄── Season-specific           │
│  - defense_rating, driver_skill_rating                       │
│  - strengths, weaknesses, notes                              │
│  - created_at, updated_at                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     season_config                            │
│  - year (PK)                                                 │
│  - game_name                                                 │
│  - game_description                                          │
│  - auto_schema (JSONB)                                       │
│  - teleop_schema (JSONB)                                     │
│  - endgame_schema (JSONB)                                    │
│  - capabilities_schema (JSONB)                               │
│  - match_duration_seconds                                    │
│  - auto_duration_seconds                                     │
│  - teleop_duration_seconds                                   │
│  - kickoff_date                                              │
│  - rules_manual_url                                          │
│  - created_at, updated_at                                    │
└─────────────────────────────────────────────────────────────┘
```

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Browser)                         │
│  - Uses Supabase Anon Key                                    │
│  - Limited permissions                                       │
│  - Row Level Security (RLS) applies                          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Server)                     │
│  - Uses Supabase Service Role Key                            │
│  - Full database access                                      │
│  - Bypasses RLS                                              │
│  - Validates all inputs                                      │
└────────────────────┬────────────────────────────────────────┘
                     │ Supabase SDK
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase (PostgreSQL)                       │
│  - Row Level Security (RLS) policies                         │
│  - Foreign key constraints                                   │
│  - Data validation                                           │
└─────────────────────────────────────────────────────────────┘

Future: Add Authentication
┌─────────────────────────────────────────────────────────────┐
│  User → Login → JWT Token → Verified Routes → Database      │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│  Client-Side Optimizations                                   │
│  ✓ Debounced search (300ms)                                  │
│  ✓ Pagination (20 items per page)                            │
│  ✓ React memo for expensive renders                          │
│  ✓ Lazy loading for code splitting                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Server-Side Optimizations                                   │
│  ✓ Efficient Supabase queries (select specific columns)      │
│  ✓ Database indexes on frequently queried columns            │
│  ✓ Query result caching (future)                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Network Optimizations                                       │
│  ✓ Compressed API responses                                  │
│  ✓ HTTP/2 multiplexing                                       │
│  ✓ CDN for static assets (future)                            │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Design

```
Mobile (< 768px)          Tablet (768-1024px)      Desktop (> 1024px)
┌──────────────┐          ┌────────────────────┐   ┌────────────────────────┐
│   Overlay    │          │  Collapsible       │   │  Fixed Sidebar (256px) │
│   Sidebar    │          │  Sidebar           │   │                        │
│              │          │                    │   │  ┌──────────────────┐  │
│  ┌────────┐  │          │  ┌──────────────┐  │   │  │   Sidebar        │  │
│  │ Menu   │  │          │  │  Content     │  │   │  │   Always Visible │  │
│  │ Button │  │          │  │  Area        │  │   │  └──────────────────┘  │
│  └────────┘  │          │  │              │  │   │                        │
│              │          │  │  Full Width  │  │   │  ┌──────────────────┐  │
│  Content     │          │  │              │  │   │  │   Content Area   │  │
│  Full Width  │          │  └──────────────┘  │   │  │   (Remaining)    │  │
│              │          │                    │   │  └──────────────────┘  │
└──────────────┘          └────────────────────┘   └────────────────────────┘

Stack cards          2-column grid              3-4 column grid
Single column        Compressed table           Full table with all columns
```

---

**Architecture Version**: 1.0
**Last Updated**: 2025-10-20
**Status**: Production Ready (Core Features)
