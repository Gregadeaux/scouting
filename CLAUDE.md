# FRC Scouting System - AI Assistant Guide

**Last Updated**: 2026-01-09
**Current Season**: 2025 Reefscape (2026 game releases Jan 10, 2026)

---

## Quick Overview

Championship-level FRC scouting system built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Supabase**. Uses a **JSONB hybrid architecture** where ~60-70% of code is evergreen (teams, matches, auth) and ~30-40% is season-specific (game mechanics stored in JSONB).

### Key Principle
> Relational structure for the evergreen, flexible JSONB for the game-specific.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 3.4, dark mode |
| Database | Supabase (PostgreSQL + JSONB) |
| Auth | Supabase Auth (email/password, roles) |
| Storage | Supabase Storage (robot photos) |
| Testing | Playwright (E2E), Vitest (unit) |

---

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run type-check   # TypeScript validation (run before commits)
npm run test         # Run Playwright E2E tests
npm run lint         # ESLint check
```

---

## Project Tracking

**Linear Team**: 930-Scouting
**Issue Prefix**: SCOUT-XXX

### When Starting Work
1. Find the Linear issue (or create one if missing)
2. Mark status as "In Progress"
3. Use branch name from Linear: `feature/scout-XXX-description`

### When Finishing Work
1. Verify `npm run build` succeeds (no TypeScript/ESLint errors)
2. Update Linear issue status to "Ready to Test"
3. If creating PR, link Linear issue using magic words (e.g., "Fixes SCOUT-123")

### Status Flow
`Backlog` → `Todo` → `In Progress` → `Ready to Test` → `Done`

---

## Coding Standards

### Must Follow
- **No `any` type** - ESLint will fail the build
- **Run `npm run type-check`** before committing
- **Test credentials**: Use `.env.test` (see `.env.test.example`)

### UI Design
- Prioritize clarity and efficient screen space
- More information visible = less scrolling (without sacrificing usability)
- Follow existing component patterns in `/src/components/ui/`

### Patterns to Copy
| Task | Reference File |
|------|----------------|
| API Route | `/src/app/api/admin/events/route.ts` |
| Service | `/src/lib/services/team.service.ts` |
| Repository | `/src/lib/repositories/team.repository.ts` |
| Admin Page | `/src/app/admin/events/page.tsx` |
| Form Component | `/src/components/admin/TeamForm.tsx` |

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard pages
│   ├── analytics/         # Analytics pages
│   ├── api/               # API routes
│   ├── auth/              # Auth pages
│   └── pit-scouting/      # Pit scouting page
├── components/
│   ├── ui/                # Reusable UI components
│   ├── admin/             # Admin-specific components
│   ├── analytics/         # Charts, visualizations
│   └── match-scouting-v2/ # Match scouting interface
├── lib/
│   ├── supabase/          # DB client, validation, storage
│   ├── repositories/      # Data access layer
│   ├── services/          # Business logic
│   ├── config/            # Season configurations
│   └── algorithms/        # OPR, ELO calculations
├── types/                 # TypeScript type definitions
│   ├── index.ts           # Core types (evergreen)
│   └── season-2025.ts     # 2025 Reefscape types
└── contexts/              # React contexts (Auth, etc.)
```

---

## Season Transition Guide

When a new FRC game is announced (January), approximately **30-40% of the system** needs updates. The core architecture remains unchanged - that's the beauty of the JSONB hybrid approach!

### Phase 1: Type Definitions (Week 0-1)

#### 1. Create `src/types/season-YYYY.ts`

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

**Reference**: See `src/types/season-2025.ts` for complete example

---

#### 2. Update `src/types/index.ts`

Add export at the bottom of the file:

```typescript
// BEFORE:
export type * from './season-2025';

// AFTER:
export type * from './season-2025';
export type * from './season-2026'; // Add new line
```

---

### Phase 2: Configuration System (Week 1-2)

#### 3. Create `src/lib/config/season-YYYY.ts`

**Purpose**: Define field definitions for form generation and JSON schemas for validation

```typescript
// 1. Import season-specific types
import type {
  AutoPerformanceYYYY,
  TeleopPerformanceYYYY,
  EndgamePerformanceYYYY,
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
    type: 'counter' | 'boolean' | 'select' | 'text',
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

**Reference**: See `src/lib/config/season-2025.ts`

---

### Phase 3: Validation System (Week 1-2)

#### 4. Update `src/lib/supabase/validation.ts`

Add after existing 2025 validators:

```typescript
// Add imports at top
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

// Add validator functions
export function validateAutoPerformanceYYYY(data: unknown): ValidationResult {
  return validateJSONB(data, AUTO_SCHEMA_YYYY);
}

export function validateTeleopPerformanceYYYY(data: unknown): ValidationResult {
  return validateJSONB(data, TELEOP_SCHEMA_YYYY);
}

export function validateEndgamePerformanceYYYY(data: unknown): ValidationResult {
  return validateJSONB(data, ENDGAME_SCHEMA_YYYY);
}

// Add type guards
export function isAutoPerformanceYYYY(data: unknown): data is AutoPerformanceYYYY {
  return validateAutoPerformanceYYYY(data).valid;
}

export function isTeleopPerformanceYYYY(data: unknown): data is TeleopPerformanceYYYY {
  return validateTeleopPerformanceYYYY(data).valid;
}

export function isEndgamePerformanceYYYY(data: unknown): data is EndgamePerformanceYYYY {
  return validateEndgamePerformanceYYYY(data).valid;
}

// Add combined validator
export function validateMatchScoutingDataYYYY(data: {
  auto_performance: unknown;
  teleop_performance: unknown;
  endgame_performance: unknown;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const autoResult = validateAutoPerformanceYYYY(data.auto_performance);
  if (!autoResult.valid) {
    errors.push(...autoResult.errors.map((e) => ({
      ...e,
      field: `auto_performance.${e.field}`,
    })));
  }

  const teleopResult = validateTeleopPerformanceYYYY(data.teleop_performance);
  if (!teleopResult.valid) {
    errors.push(...teleopResult.errors.map((e) => ({
      ...e,
      field: `teleop_performance.${e.field}`,
    })));
  }

  const endgameResult = validateEndgamePerformanceYYYY(data.endgame_performance);
  if (!endgameResult.valid) {
    errors.push(...endgameResult.errors.map((e) => ({
      ...e,
      field: `endgame_performance.${e.field}`,
    })));
  }

  return { valid: errors.length === 0, errors };
}
```

---

### Phase 4: Database Configuration (Week 1-2)

#### 5. Insert into `season_config` table

Run in Supabase SQL Editor:

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
    'Full game description...',
    '{"type": "object", "properties": {...}}'::jsonb,
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
    'Notes'
)
ON CONFLICT (year) DO UPDATE SET
    game_name = EXCLUDED.game_name,
    game_description = EXCLUDED.game_description,
    auto_schema = EXCLUDED.auto_schema,
    teleop_schema = EXCLUDED.teleop_schema,
    endgame_schema = EXCLUDED.endgame_schema;
```

---

### Phase 5: Update Forms & Analytics (Week 2-3)

#### 6. Update Match Scouting Form

- Import 2026 field definitions from config
- Add season detection logic based on event year
- Update field overlay for new game field layout

**Components to update**:
- `src/components/match-scouting-v2/MatchScoutingInterface.tsx`
- `src/components/match-scouting-v2/field/FieldOverlay.tsx`
- Period components (Auto, Teleop, Endgame)

#### 7. Update Analytics

- Update OPR calculation for new scoring elements
- Update radar chart categories
- Update boxplot categories for new game pieces

**Components to update**:
- `src/components/analytics/TeamRadarProfile.tsx`
- `src/components/analytics/GamePieceBoxplot.tsx`
- `src/lib/algorithms/opr.ts`

---

## Quick Reference: Files That Change Per Season

| File | Action | Complexity |
|------|--------|------------|
| `src/types/season-YYYY.ts` | CREATE | High |
| `src/types/index.ts` | UPDATE (1 line) | Low |
| `src/lib/config/season-YYYY.ts` | CREATE | High |
| `src/lib/supabase/validation.ts` | UPDATE | Medium |
| Database `season_config` | INSERT | Low |
| Match scouting components | UPDATE | Medium |
| Analytics components | UPDATE | Medium |

## Files That NEVER Change Between Seasons

- Database schema (PostgreSQL structure)
- Core types in `src/types/index.ts`
- Supabase client configuration
- Auth system
- UI components (Button, Card, etc.)
- Repository/Service patterns

---

## Testing Checklist (New Season)

- [ ] `npm run type-check` passes
- [ ] New types exported from `src/types/index.ts`
- [ ] Validation accepts valid data, rejects invalid
- [ ] Database `season_config` row exists
- [ ] Default values compile correctly
- [ ] Point calculations match official scoring
- [ ] Forms render all fields
- [ ] Analytics display new metrics

---

## Common Mistakes

1. **Forgetting type export** → Import errors everywhere
2. **Mismatched schema_version** → Validation always fails
3. **Missing validators** → Cannot validate new season data
4. **No database row** → Runtime schema lookups fail
5. **Using `any` type** → Build fails (ESLint)

---

## 2026 Season Status

**Linear Project**: [2026 Season Preparation - REEFSCAPE→NEW GAME](https://linear.app/gregadeaux/project/2026-season-preparation-reefscape→new-game-cbf296db9625)

**Issues**: SCOUT-95 through SCOUT-104

**First task** (Jan 10): SCOUT-95 - Watch game reveal and document mechanics
