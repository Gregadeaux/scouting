# FRC Scouting System - AI Assistant Guide

**Last Updated**: 2025-10-24
**Project Status**: Active Development - Core Infrastructure Complete

---

## Quick Orientation

This is a **championship-level FRC (FIRST Robotics Competition) scouting system** built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. The system uses a **JSONB hybrid architecture** that separates evergreen data (teams, matches) from season-specific metrics, allowing adaptation to new games without schema migrations.

### Key Architectural Principle
> 60-70% of scouting data remains consistent across seasons (team identification, match structure, reliability metrics). 30-40% changes annually with new game mechanics.

The JSONB hybrid approach means: **relational structure for the evergreen, flexible JSONB for the game-specific**.

---

## Current Application State

### ✅ Fully Implemented & Working

#### 1. **Database Schema & Infrastructure** (100%)
- PostgreSQL + JSONB hybrid schema in `/supabase/migrations/`
- Core tables: `teams`, `events`, `match_schedule`, `match_scouting`, `pit_scouting`, `team_statistics`, `season_config`
- Auth tables: `users`, `user_teams` with RLS policies
- System tables: `import_jobs`, `audit_logs`
- Supabase Storage bucket: `robot-photos` (5MB limit, JPEG/PNG/WebP/GIF)

#### 2. **Authentication & Authorization** (100%)
- Supabase Auth integration (email/password)
- Role-based access control: `admin`, `mentor`, `scouter`
- Multi-team support via `user_teams` junction table
- Protected routes at component and API levels
- AuthContext provider: `/src/contexts/AuthContext.tsx`
- Login/Signup/Password Reset flows complete

#### 3. **Admin Dashboard** (80% - Core Complete)
- ✅ Dashboard home with statistics cards
- ✅ Events management (full CRUD)
- ✅ Teams management (full CRUD)
- ✅ User management (roles, teams, permissions)
- ✅ The Blue Alliance (TBA) import with background jobs
- ✅ Event detail pages with coverage tracking
- ✅ Team detail pages with match history
- ⏳ Matches management (placeholder)
- ⏳ Scouters management (needs implementation)
- ⏳ Scouting data viewer (placeholder)
- ⏳ Seasons configuration (placeholder)

#### 4. **The Blue Alliance (TBA) Integration** (100%)
- TBA API client with rate limiting
- Background import job system
- Smart merge strategies (preserves local data)
- Import teams, match schedules, and results
- Progress tracking with real-time updates
- Worker endpoint: `/api/admin/workers/process-imports`

#### 5. **Service Layer** (100%)
- Repository pattern: Team, Event, Match, ImportJob
- Service layer: TBAApiService, ImportService, TeamService, EventService, MatchService
- Merge strategies for TBA data integration
- All TypeScript errors resolved (except 3 minor issues in unrelated files)

#### 6. **Offline Support Infrastructure** (Core Complete)
- Hexagonal architecture (Core → Infrastructure → Application)
- IndexedDB for local storage
- Submission domain model with Result pattern
- Event bus for decoupled communication
- Retry strategy with exponential backoff
- React hooks: `useOfflineStatus`, `useSubmission`, `useSyncQueue`

#### 7. **Pit Scouting UI Components** (100%)
- Reusable components: Counter, FormSection, ImageUpload, FieldRenderer
- Custom hooks: `useEvents`, `useEventTeams`, `usePitScouting`
- Dynamic form generation from field definitions
- Image upload with drag-and-drop
- Pit scouting page functional

#### 8. **Storage System** (100%)
- Supabase Storage utilities (`/src/lib/supabase/storage.ts`)
- Upload/delete robot photos
- File validation (size, MIME type)
- Public URL generation
- Organized by team/event

#### 9. **2025 Reefscape Configuration** (100%)
- Type definitions: `/src/types/season-2025.ts`
- Field configs: `/src/lib/config/season-2025.ts`
- Validation with JSON Schema
- Point calculation functions
- Game elements: Coral, Algae, Reef, Processors, Nets, Barge, Cage

### ⏳ Partially Implemented

- **Match Scouting Forms**: Backend ready, UI pending
- **Analytics**: Database ready, calculations pending
- **Offline Sync**: Infrastructure ready, final integration pending

### ❌ Not Yet Implemented

- Match scouting form UI
- OPR/DPR/CCWM calculations
- Pick list generation UI
- QR code sync system
- Real-time updates via Supabase Realtime

---

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 3.4 with dark mode
- **Database**: Supabase (PostgreSQL + JSONB)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Icons**: lucide-react
- **Forms**: react-hook-form
- **PWA**: @ducanh2912/next-pwa

### Directory Structure
```
/Users/gregbilletdeaux/Developer/930/scouting/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin dashboard
│   │   ├── api/               # API routes
│   │   ├── auth/              # Auth pages
│   │   ├── pit-scouting/      # Pit scouting
│   │   └── offline/           # Offline testing
│   ├── components/
│   │   ├── ui/                # Reusable UI
│   │   ├── admin/             # Admin components
│   │   ├── auth/              # Auth components
│   │   ├── pit-scouting/      # Pit scouting
│   │   └── offline/           # Offline sync
│   ├── lib/
│   │   ├── supabase/          # DB, validation, storage
│   │   ├── repositories/      # Data access
│   │   ├── services/          # Business logic
│   │   ├── strategies/        # Merge strategies
│   │   ├── config/            # Season configs
│   │   ├── offline/           # Offline hooks
│   │   └── api/               # API helpers
│   ├── core/offline/          # Domain layer
│   ├── infrastructure/offline/ # Infrastructure
│   ├── types/                 # TypeScript types
│   ├── hooks/                 # Custom hooks
│   └── contexts/              # React contexts
├── supabase/migrations/       # Database migrations
├── public/                    # Static assets
└── docs/                      # Documentation (proposed)
```

### Key Design Patterns
1. **JSONB Hybrid**: Relational + JSONB flexibility
2. **Repository Pattern**: Data access abstraction
3. **Service Layer**: Business logic separation
4. **Hexagonal Architecture**: Core → Ports → Adapters
5. **Result Pattern**: Type-safe error handling
6. **Smart Merge**: TBA + local data
7. **Configuration-Driven**: Season adaptation

---

## Documentation Map

### Essential (Keep at Root)
- **`README.md`** - Project overview, quick start
- **`CLAUDE.md`** (this file) - AI assistant guide
- **`scouting_research.md`** - Championship research

### Proposed Organization (`/docs/`)

#### Setup Guides (`/docs/setup/`)
- `SUPABASE_SETUP.md`
- `SUPABASE_AUTH_CONFIG.md`
- `ADMIN_SETUP.md`
- `AUDIT_LOG_SETUP.md`
- `supabase-storage-setup.md`
- `STORAGE_SETUP_CHECKLIST.md`

#### Feature Guides (`/docs/features/`)
- **Admin** (`/docs/features/admin/`)
  - `ADMIN_DASHBOARD_IMPLEMENTATION.md`
  - `ADMIN_QUICK_START.md`
  - `ADMIN_ARCHITECTURE.md`
  - `ADMIN_README.md`
  - `ADMIN_IMPLEMENTATION_SUMMARY.md`
- **Auth** (`/docs/features/auth/`)
  - `AUTHENTICATION.md`
  - `AUTH_QUICK_START.md`
- **Storage** (`/docs/features/storage/`)
  - `STORAGE_IMPLEMENTATION.md`
  - `STORAGE_QUICK_REFERENCE.md`
- **Pit Scouting** (`/docs/features/pit-scouting/`)
  - `PIT_SCOUTING_IMPLEMENTATION.md`
- **Offline** (`/docs/features/offline/`)
  - `OFFLINE_COMPONENTS_SUMMARY.md`
  - `INFRASTRUCTURE_IMPLEMENTATION_STATUS.md`

#### Implementation Summaries (`/docs/progress/` - Archive)
- `PHASE1_COMPLETE.md`
- `PHASE_2_SUMMARY.md`
- `PHASE_3_GUIDE.md`
- `PHASE3_FIXES_NEEDED.md`
- `PHASE3_FIXES_COMPLETE.md`
- `IMPLEMENTATION_SUMMARY.md`

---

## Quick Start for AI Assistants

### When Asked to Work on This Project

1. **Read CLAUDE.md** (this file) - Current state
2. **Check README.md** - Architecture overview
3. **Identify feature area**:
   - Admin? → `/docs/features/admin/`
   - Auth? → `/docs/features/auth/`
   - Offline? → `/src/infrastructure/offline/README.md`
   - Pit scouting? → `/docs/features/pit-scouting/`
4. **Follow existing patterns**:
   - API route? Copy `/src/app/api/admin/events/route.ts`
   - Service? Copy `/src/lib/services/team.service.ts`
   - Repository? Copy `/src/lib/repositories/team.repository.ts`
   - Component? Copy `/src/components/admin/TeamForm.tsx`
5. **Run type-check**: `npm run type-check`

### Common Tasks

#### Add New Season (2026)
1. Create `/src/types/season-2026.ts`
2. Create `/src/lib/config/season-2026.ts`
3. Update `/src/lib/supabase/validation.ts`
4. Insert into `season_config` table
5. See full guide below

#### Add Admin Entity (Matches)
1. Copy `/src/app/admin/events/page.tsx` → `matches/page.tsx`
2. Create `/src/app/api/admin/matches/route.ts`
3. Create `/src/components/admin/MatchForm.tsx`
4. Update `/src/components/admin/Sidebar.tsx`

#### Create Scouting Form
1. Use `/src/components/ui/FieldRenderer.tsx`
2. Get fields from `/src/lib/config/season-2025.ts`
3. Validate with `/src/lib/supabase/validation.ts`
4. Submit to API endpoint

---

## Known Issues

### TypeScript Errors (3)
1. `src/lib/services/route-guard.service.ts:174` - UserRole type mismatch
2. `src/lib/supabase/storage.ts:232,251` - Protected property access

### Missing Features
- Match scouting form UI
- OPR/DPR/CCWM calculations
- Pick list UI
- QR code sync
- Real-time updates
- Unit/integration tests

### Repository Methods (TODOs)
- `MatchRepository.findByTeamNumber()`
- `TeamRepository.search(query)`
- `EventRepository.findByTeamNumber()`

---

## 📋 Season Transition Guide

When a new FRC game is announced (January), approximately **30-40% of the system** needs updates. The core architecture remains unchanged - that's the beauty of the JSONB hybrid approach!

### Phase 1: Type Definitions (Week 0-1)

#### ✅ 1. Create `src/types/season-YYYY.ts`

**File**: `src/types/season-YYYY.ts` (replace YYYY with year, e.g., 2026)

**Purpose**: Define all season-specific TypeScript interfaces for JSONB data structures

**Required Content**:
```typescript
// 1. Import base types
import { BasePerformanceData, MatchScouting, PitScouting } from './index';

// 2. Define game-specific enums/types
export type GamePieceType = 'piece1' | 'piece2';
export type ScoringLocation = 'location1' | 'location2';
// ... add all categorical types

// 3. Define AutoPerformance interface
export interface AutoPerformanceYYYY extends BasePerformanceData {
  schema_version: 'YYYY.1'; // e.g., '2026.1'
  left_starting_zone: boolean;
  // ... all auto-specific fields
  notes?: string;
}

// 4. Define TeleopPerformance interface
export interface TeleopPerformanceYYYY extends BasePerformanceData {
  schema_version: 'YYYY.1';
  // ... all teleop-specific fields
  cycles_completed: number;
  notes?: string;
}

// 5. Define EndgamePerformance interface
export interface EndgamePerformanceYYYY extends BasePerformanceData {
  schema_version: 'YYYY.1';
  // ... all endgame-specific fields
  endgame_points: number;
  notes?: string;
}

// 6. Define RobotCapabilities interface
export interface RobotCapabilitiesYYYY {
  schema_version: 'YYYY.1';
  // ... robot capabilities
  notes?: string;
}

// 7. Define AutonomousCapabilities interface
export interface AutonomousCapabilitiesYYYY {
  schema_version: 'YYYY.1';
  // ... auto capabilities
  notes?: string;
}

// 8. Create typed aliases
export type MatchScoutingYYYY = MatchScouting<
  AutoPerformanceYYYY,
  TeleopPerformanceYYYY,
  EndgamePerformanceYYYY
>;

export type PitScoutingYYYY = PitScouting<
  RobotCapabilitiesYYYY,
  AutonomousCapabilitiesYYYY
>;

// 9. Create default values for forms
export const DEFAULT_AUTO_PERFORMANCE_YYYY: AutoPerformanceYYYY = {
  schema_version: 'YYYY.1',
  left_starting_zone: false,
  // ... all fields with default values
};

// 10. Point value constants (if applicable)
export const YYYY_POINT_VALUES = {
  auto: { /* ... */ },
  teleop: { /* ... */ },
  endgame: { /* ... */ },
} as const;

// 11. Scoring calculation functions
export function calculateAutoPoints(auto: AutoPerformanceYYYY): number {
  // Implementation
}

export function calculateTeleopPoints(teleop: TeleopPerformanceYYYY): number {
  // Implementation
}

export function calculateEndgamePoints(endgame: EndgamePerformanceYYYY): number {
  // Implementation
}
```

**Example**: See `src/types/season-2025.ts` for complete reference

---

#### ✅ 2. Update `src/types/index.ts`

**File**: `src/types/index.ts`

**Change Required**: Update the export statement at the bottom

**Location**: Line ~480 (end of file)

```typescript
// BEFORE (exports only 2025):
export type * from './season-2025';

// AFTER (exports both 2025 and new season):
export type * from './season-2025';
export type * from './season-2026'; // Add new line
```

**Why**: This makes all new season types available throughout the codebase

---

### Phase 2: Configuration System (Week 1-2)

#### ✅ 3. Create `src/lib/config/season-YYYY.ts`

**File**: `src/lib/config/season-YYYY.ts`

**Purpose**: Define field definitions for form generation and JSON schemas for validation

**Required Content**:
```typescript
// 1. Import season-specific types
import type {
  AutoPerformanceYYYY,
  TeleopPerformanceYYYY,
  EndgamePerformanceYYYY,
  // ... all relevant types
} from '@/types/season-YYYY';

// 2. Season metadata
export const SEASON_YYYY_CONFIG = {
  year: YYYY,
  gameName: 'GameName',
  gameDescription: 'Description...',
  matchDuration: 150,
  autoDuration: 15,
  teleopDuration: 135,
  kickoffDate: 'YYYY-01-DD',
  championshipStartDate: 'YYYY-04-DD',
  championshipEndDate: 'YYYY-04-DD',
  rulesManualUrl: 'https://...',
  gameAnimationUrl: 'https://...',
} as const;

// 3. Field definitions for each period
export const AUTO_FIELDS_YYYY: FieldDefinition[] = [
  {
    key: 'field_name',
    label: 'Human Readable Label',
    type: 'counter' | 'boolean' | 'select' | 'text' | ...,
    defaultValue: ...,
    required?: true,
    min?: 0,
    max?: 10,
    options?: [...],
    helpText?: 'Explanation for scouts',
    section?: 'Group Name',
    order?: 10,
  },
  // ... all auto fields
];

export const TELEOP_FIELDS_YYYY: FieldDefinition[] = [
  // ... all teleop fields
];

export const ENDGAME_FIELDS_YYYY: FieldDefinition[] = [
  // ... all endgame fields
];

// 4. JSON Schemas for validation
export const AUTO_SCHEMA_YYYY = {
  type: 'object',
  required: ['schema_version', /* ... */],
  properties: {
    schema_version: { type: 'string', const: 'YYYY.1' },
    // ... all properties with types, min/max, enums
  },
};

export const TELEOP_SCHEMA_YYYY = { /* ... */ };
export const ENDGAME_SCHEMA_YYYY = { /* ... */ };

// 5. Export combined config
export const GAME_NAME_CONFIG = {
  ...SEASON_YYYY_CONFIG,
  autoFields: AUTO_FIELDS_YYYY,
  teleopFields: TELEOP_FIELDS_YYYY,
  endgameFields: ENDGAME_FIELDS_YYYY,
  autoSchema: AUTO_SCHEMA_YYYY,
  teleopSchema: TELEOP_SCHEMA_YYYY,
  endgameSchema: ENDGAME_SCHEMA_YYYY,
} as const;
```

**Example**: See `src/lib/config/season-2025.ts`

**Non-programmers can edit this file!** The field definitions are declarative and self-documenting.

---

### Phase 3: Validation System (Week 1-2)

#### ✅ 4. Update `src/lib/supabase/validation.ts`

**File**: `src/lib/supabase/validation.ts`

**Changes Required**: Add three new validator functions

**Location**: After the 2025 validators (~line 110)

```typescript
// Add these imports at top
import type {
  AutoPerformanceYYYY,
  TeleopPerformanceYYYY,
  EndgamePerformanceYYYY,
} from '@/types/season-YYYY';
import {
  AUTO_SCHEMA_YYYY,
  TELEOP_SCHEMA_YYYY,
  ENDGAME_SCHEMA_YYYY,
} from '@/lib/config/season-YYYY';

// Add these functions
export function validateAutoPerformanceYYYY(
  data: any
): ValidationResult {
  return validateJSONB(data, AUTO_SCHEMA_YYYY);
}

export function validateTeleopPerformanceYYYY(
  data: any
): ValidationResult {
  return validateJSONB(data, TELEOP_SCHEMA_YYYY);
}

export function validateEndgamePerformanceYYYY(
  data: any
): ValidationResult {
  return validateJSONB(data, ENDGAME_SCHEMA_YYYY);
}

// Add type guards
export function isAutoPerformanceYYYY(data: any): data is AutoPerformanceYYYY {
  const result = validateAutoPerformanceYYYY(data);
  return result.valid;
}

export function isTeleopPerformanceYYYY(data: any): data is TeleopPerformanceYYYY {
  const result = validateTeleopPerformanceYYYY(data);
  return result.valid;
}

export function isEndgamePerformanceYYYY(data: any): data is EndgamePerformanceYYYY {
  const result = validateEndgamePerformanceYYYY(data);
  return result.valid;
}

// Add combined validator
export function validateMatchScoutingDataYYYY(data: {
  auto_performance: any;
  teleop_performance: any;
  endgame_performance: any;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const autoResult = validateAutoPerformanceYYYY(data.auto_performance);
  if (!autoResult.valid) {
    errors.push(
      ...autoResult.errors.map((e) => ({
        ...e,
        field: `auto_performance.${e.field}`,
      }))
    );
  }

  const teleopResult = validateTeleopPerformanceYYYY(data.teleop_performance);
  if (!teleopResult.valid) {
    errors.push(
      ...teleopResult.errors.map((e) => ({
        ...e,
        field: `teleop_performance.${e.field}`,
      }))
    );
  }

  const endgameResult = validateEndgamePerformanceYYYY(data.endgame_performance);
  if (!endgameResult.valid) {
    errors.push(
      ...endgameResult.errors.map((e) => ({
        ...e,
        field: `endgame_performance.${e.field}`,
      }))
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

**Pattern**: Copy the 2025 validators and replace `2025` with `YYYY`

---

### Phase 4: Database Configuration (Week 1-2)

#### ✅ 5. Insert into `season_config` table

**Method**: Run SQL in Supabase SQL Editor

**SQL to Execute**:
```sql
INSERT INTO season_config (
    year,
    game_name,
    game_description,
    auto_schema,
    teleop_schema,
    endgame_schema,
    match_duration_seconds,
    auto_duration_seconds,
    teleop_duration_seconds,
    kickoff_date,
    championship_start_date,
    championship_end_date,
    rules_manual_url,
    game_animation_url,
    notes
)
VALUES (
    YYYY,
    'Game Name',
    'Full game description explaining mechanics...',
    '{"type": "object", "properties": {...}}'::jsonb,  -- Copy from config file
    '{"type": "object", "properties": {...}}'::jsonb,
    '{"type": "object", "properties": {...}}'::jsonb,
    150,
    15,
    135,
    'YYYY-01-DD',
    'YYYY-04-DD',
    'YYYY-04-DD',
    'https://link-to-manual.pdf',
    'https://youtube.com/...',
    'Any additional notes about the season'
)
ON CONFLICT (year) DO UPDATE SET
    game_name = EXCLUDED.game_name,
    game_description = EXCLUDED.game_description,
    auto_schema = EXCLUDED.auto_schema,
    teleop_schema = EXCLUDED.teleop_schema,
    endgame_schema = EXCLUDED.endgame_schema,
    kickoff_date = EXCLUDED.kickoff_date,
    championship_start_date = EXCLUDED.championship_start_date,
    championship_end_date = EXCLUDED.championship_end_date,
    rules_manual_url = EXCLUDED.rules_manual_url,
    game_animation_url = EXCLUDED.game_animation_url,
    notes = EXCLUDED.notes;
```

**Why**: This enables runtime schema lookups and provides metadata for the admin interface

---

### Phase 5: Documentation (Week 2-3)

#### ✅ 6. Update `README.md`

**File**: `README.md`

**Sections to Update**:

1. **"🎮 YYYY Game Name" section** (around line 113)
   - Replace or add alongside 2025 section
   - Document new game pieces, scoring locations, endgame mechanics

2. **Example JSONB structures** (around line 122-158)
   - Show example auto/teleop/endgame JSON for new game
   - Help developers understand data structure

3. **"Season Transition" section** (around line 185)
   - Update year references (2025 → 2026 becomes 2026 → 2027)

**Example Addition**:
```markdown
## 🎮 2026 NewGame

### Game Elements
- **GamePiece1** (description) and **GamePiece2** (description)
- **ScoringLocation** for scoring
- **EndgameChallenge**: Description of endgame

### Data Collection Structure

**Autonomous Period (15s):**
\```typescript
{
  schema_version: "2026.1",
  left_starting_zone: true,
  piece1_scored: 3,
  // ... example fields
}
\```
```

---

### Phase 6: API Integration (Week 3-4)

#### ✅ 7. Update API Routes (Optional but Recommended)

**Files to Consider**:
- `src/app/api/match-scouting/route.ts` (when you create it)
- Any routes that validate JSONB data

**Change**: Add schema version detection and route to appropriate validator

```typescript
// Example in API route
import { validateMatchScoutingData2025 } from '@/lib/supabase/validation';
import { validateMatchScoutingData2026 } from '@/lib/supabase/validation';

// In POST handler:
const schemaVersion = body.auto_performance.schema_version;

let validationResult;
if (schemaVersion === '2025.1') {
  validationResult = validateMatchScoutingData2025(body);
} else if (schemaVersion === '2026.1') {
  validationResult = validateMatchScoutingData2026(body);
} else {
  return errorResponse('Unknown schema version', 400);
}
```

---

### Phase 7: Form Components (Week 3-6)

#### ✅ 8. Create Scouting Forms (Not Yet Built)

**Future Files** (when implementing forms):
- `src/components/scouting/MatchScoutingForm.tsx`
- `src/components/scouting/PitScoutingForm.tsx`

**What to Update**:
- Import field definitions from new season config
- Use `FieldDefinition[]` to dynamically generate form fields
- Switch between seasons based on active year

**Dynamic Form Example**:
```typescript
import { AUTO_FIELDS_2026 } from '@/lib/config/season-2026';

// Iterate over field definitions to render form
AUTO_FIELDS_2026.map(field => (
  <FormField key={field.key} definition={field} />
))
```

---

## 🎯 Quick Reference: Files That Change Every Season

| File | Action | Complexity |
|------|--------|------------|
| `src/types/season-YYYY.ts` | **CREATE NEW** | High - Define all interfaces |
| `src/types/index.ts` | **UPDATE** - Add export | Low - One line |
| `src/lib/config/season-YYYY.ts` | **CREATE NEW** | High - Define all fields |
| `src/lib/supabase/validation.ts` | **UPDATE** - Add validators | Medium - Copy/paste pattern |
| Database `season_config` | **INSERT** - Add row | Low - SQL statement |
| `README.md` | **UPDATE** - Document game | Low - Markdown |
| API routes | **UPDATE** - Add version routing | Medium - Optional |
| Form components | **UPDATE** - Import new config | Low - When forms exist |

---

## 🔄 Files That NEVER Change Between Seasons

These files implement the core architecture and remain stable:

- ✅ `supabase-schema.sql` - Database structure
- ✅ `src/types/index.ts` (core types) - Base interfaces
- ✅ `src/lib/supabase/client.ts` - Supabase connection
- ✅ `src/lib/supabase/server.ts` - Server-side client
- ✅ `src/lib/supabase/consolidation.ts` - Multi-scout algorithms
- ✅ `src/lib/api/response.ts` - API helpers
- ✅ All UI components (`Button.tsx`, `Card.tsx`, etc.)

**This stability is the key benefit of the JSONB hybrid architecture!**

---

## 📝 Step-by-Step Workflow for AI Assistants

When user says: *"Let's add support for the 2026 game"*

### Week 0: Kickoff Analysis
1. Watch game reveal video / read game manual
2. Identify:
   - Game pieces and their types
   - Scoring locations and point values
   - Autonomous routines
   - Teleoperated cycles
   - Endgame challenges
   - Special mechanics (amplification, bonuses, etc.)

### Week 1: Type System
1. Create `src/types/season-2026.ts`
   - Define enums for categorical data
   - Create Auto/Teleop/Endgame interfaces
   - Add default values
   - Write point calculation functions
2. Update `src/types/index.ts` export

### Week 2: Configuration
1. Create `src/lib/config/season-2026.ts`
   - Define metadata (dates, URLs)
   - Create field definitions (60-100 fields typically)
   - Write JSON schemas matching interfaces
2. Update `src/lib/supabase/validation.ts`
   - Add validator functions (copy 2025 pattern)
   - Add type guards
3. Insert into `season_config` table in database

### Week 3: Documentation & Testing
1. Update `README.md` with game description
2. Test TypeScript compilation: `npm run type-check`
3. Verify validation works with sample data

### Week 4+: Application Layer
1. Update/create form components
2. Update API routes for version routing
3. Build analytics specific to new game
4. Test with scouts using mock data

---

## 🧪 Testing Checklist

After adding a new season, verify:

- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] New types are exported from `src/types/index.ts`
- [ ] Validation functions accept valid data and reject invalid data
- [ ] Database `season_config` row exists for new year
- [ ] Default values compile and match interface
- [ ] Point calculation functions return correct values
- [ ] README documents new game mechanics
- [ ] Forms (when built) render correctly with field definitions

---

## 💡 Tips for Success

### For AI Assistants
- **Always maintain schema_version fields** - Critical for data migrations
- **Follow naming conventions**: `AutoPerformanceYYYY`, `validateAutoPerformanceYYYY`
- **Copy existing patterns** - 2025 files are reference templates
- **Preserve backwards compatibility** - Don't remove old season support

### For Developers
- **Start early** - Kickoff is early January, have system ready by Week 2
- **Test with mock data** - Create sample JSONB before real scouting
- **Scout feedback** - Field definitions should match what scouts can observe
- **Iterate quickly** - You can update field definitions without schema migrations!

### Non-Technical Contributors
- **You can edit** `src/lib/config/season-YYYY.ts` - It's declarative!
- **Field definitions** are self-documenting - labels, types, help text
- **JSON schemas** follow a pattern - copy from similar fields
- **No database changes needed** - JSONB adapts automatically

---

## 🚨 Common Mistakes to Avoid

1. **Forgetting to export new types** from `src/types/index.ts`
   - Symptom: Import errors in other files
   - Fix: Add `export type * from './season-YYYY';`

2. **Mismatched schema_version strings**
   - Symptom: Validation always fails
   - Fix: Ensure `const: 'YYYY.1'` matches interface

3. **Missing validators in validation.ts**
   - Symptom: Cannot validate new season data
   - Fix: Add all three validators + type guards + combined validator

4. **Forgetting database season_config**
   - Symptom: No schema available for runtime lookups
   - Fix: Run INSERT SQL in Supabase

5. **Hardcoding year in multiple places**
   - Symptom: Tedious updates across files
   - Fix: Use constants from season config

---

## 📞 Questions?

If implementing a new season and unsure about any step:

1. **Reference existing season**: `season-2025.ts` is the gold standard
2. **Check this guide**: Every required file is documented above
3. **Verify tests pass**: `npm run type-check` catches most issues
4. **Ask specific questions**: Include which phase/file you're working on

---

**Remember**: The whole point of this architecture is that adding a new season is **mostly configuration, not code changes**. If you find yourself modifying core files beyond what's listed here, you may be doing something wrong!

Last Updated: 2025-10-20
- When I ask to add features, make sure there is a github issue with proper labels and milestone assignment to track it with. If there is one, reference it to refresh yourself on the requirements and acceptance criteria. Ask additional questions as needed when we begin work on a ticket.
- When testing in Playwright, you can use login credentials gregadeaux@gmail.com : Gerg2010
- when designing UI elements - focus on clarity and efficient use of screen space. Would prefer more information be on the screen at once to limit scrolling, if possible. Don't sacrifice usability for that, but do an honest assesment
- Once you are finished with a feature, update the github issue, setting its status to "ready to test". When I ask you to test the project, go through all of the github issues for ones with the status "ready to test", and verify for accuracy and usability. If it needs updates, make a comment on the github issue and then set the status to "needs changes". If it is completed, mark it as completed.
- Do not use the 'any' type. ESLint will error when building
- When we start working on a feature, find the appropriate github issue and mark its status as 'in progress'
- When working with github issues and projects, please use the status property to mark things as "In Progress", "Ready to Test", "Needs Changes", and "Done