# Scouter Types Reference

**Created**: 2025-11-08
**Location**: `/src/types/scouter.ts`
**Status**: Complete and Type-Safe

## Overview

This document describes the TypeScript types for the scouter tracking system. These types follow the established patterns in the codebase and provide full type safety for scouter management.

## Table of Contents

1. [Core Types](#core-types)
2. [Enums and Constants](#enums-and-constants)
3. [Input Types](#input-types)
4. [Extended Views](#extended-views)
5. [Query Types](#query-types)
6. [Validation](#validation)
7. [Usage Examples](#usage-examples)

---

## Core Types

### `Scouter`

The main interface representing a scouter in the database.

```typescript
interface Scouter {
  id: string;                         // UUID primary key
  user_id: string;                    // References users.id
  team_number: number | null;         // References teams.team_number
  experience_level: ExperienceLevel;  // 'rookie' | 'intermediate' | 'veteran'
  preferred_role: PreferredRole;      // 'match_scouting' | 'pit_scouting' | 'both' | null
  total_matches_scouted: number;      // Career matches scouted
  total_events_attended: number;      // Career events attended
  certifications: Certification[];    // Array of earned certifications
  availability_notes: string | null;  // Free-form availability text
  created_at: string;                 // ISO 8601 timestamp
  updated_at: string;                 // ISO 8601 timestamp
}
```

**Usage**: Direct database representation, used in repositories and services.

---

## Enums and Constants

### `ExperienceLevel`

```typescript
type ExperienceLevel = 'rookie' | 'intermediate' | 'veteran';
```

- **rookie**: First season, learning the system
- **intermediate**: 1-2 seasons of experience, comfortable with basics
- **veteran**: 3+ seasons, can mentor others and handle complex scenarios

### `PreferredRole`

```typescript
type PreferredRole = 'match_scouting' | 'pit_scouting' | 'both' | null;
```

- **match_scouting**: Observes matches from stands, records robot performance
- **pit_scouting**: Interviews teams in pit area, documents robot capabilities
- **both**: Flexible, can do either role as needed
- **null**: No preference specified

### `Certification`

```typescript
type Certification =
  | 'pit_certified'    // Completed pit scouting training
  | 'match_certified'  // Completed match scouting training
  | 'lead_scout'       // Qualified to coordinate other scouts
  | 'data_reviewer'    // Can review and consolidate scouting data
  | 'trainer'          // Can train new scouts
  | 'super_scout';     // Can perform advanced strategic scouting
```

### Display Labels

Pre-defined label mappings for UI display:

```typescript
const CERTIFICATION_LABELS: Record<Certification, string> = {
  pit_certified: 'Pit Certified',
  match_certified: 'Match Certified',
  lead_scout: 'Lead Scout',
  data_reviewer: 'Data Reviewer',
  trainer: 'Trainer',
  super_scout: 'Super Scout',
};

const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  rookie: 'Rookie',
  intermediate: 'Intermediate',
  veteran: 'Veteran',
};

const PREFERRED_ROLE_LABELS: Record<NonNullable<PreferredRole>, string> = {
  match_scouting: 'Match Scouting',
  pit_scouting: 'Pit Scouting',
  both: 'Both',
};
```

---

## Input Types

### `CreateScouterInput`

Data required to create a new scouter (omits auto-generated fields).

```typescript
interface CreateScouterInput {
  // Required
  user_id: string;
  experience_level: ExperienceLevel;

  // Optional
  team_number?: number | null;
  preferred_role?: PreferredRole;
  certifications?: Certification[];
  availability_notes?: string | null;
}
```

**Usage**: Service layer when creating scouter records.

### `UpdateScouterInput`

Data for updating an existing scouter (all fields optional).

```typescript
interface UpdateScouterInput {
  team_number?: number | null;
  experience_level?: ExperienceLevel;
  preferred_role?: PreferredRole;
  certifications?: Certification[];
  availability_notes?: string | null;
  total_matches_scouted?: number;  // Typically updated by triggers
  total_events_attended?: number;  // Typically updated by triggers
}
```

**Usage**: Service layer when updating scouter records.

### `ScouterRegistrationData`

Simplified form data for initial scouter registration/onboarding.

```typescript
interface ScouterRegistrationData {
  experience_level: ExperienceLevel;
  preferred_role?: PreferredRole;
  team_number?: number;
  availability_notes?: string;
}
```

**Usage**: Form submission in UI components.

---

## Extended Views

### `ScouterWithUser`

Scouter with joined user profile information.

```typescript
interface ScouterWithUser extends Scouter {
  // User profile fields (from join)
  email: string;
  full_name: string | null;
  display_name: string | null;

  // Team information (from join, if team_number is set)
  team_name?: string;
  team_nickname?: string;
}
```

**Usage**: List views, detail pages, anywhere you need to display scouter name/email.

### `ScouterWithStats`

Scouter with user info and performance statistics.

```typescript
interface ScouterWithStats extends ScouterWithUser {
  // Current season statistics
  current_season_matches: number;
  current_season_events: number;

  // Data quality metrics
  avg_confidence_level?: number;
  data_accuracy_score?: number;

  // Activity timeline
  last_scouting_date?: string;
  first_scouting_date?: string;
}
```

**Usage**: Analytics dashboards, lead scout views, performance tracking.

---

## Query Types

### `ScouterFilters`

Comprehensive filtering options for querying scouters.

```typescript
interface ScouterFilters {
  // Relationship filters
  user_id?: string;
  team_number?: number;

  // Classification filters
  experience_level?: ExperienceLevel;
  preferred_role?: PreferredRole;
  has_certification?: Certification;

  // Activity filters
  min_matches_scouted?: number;
  min_events_attended?: number;
  is_active?: boolean;  // Scouted in current season

  // Search
  search?: string;  // Search by name or email

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sort_by?: 'name' | 'experience' | 'matches' | 'events' | 'created_at';
  sort_order?: 'asc' | 'desc';
}
```

**Usage**: API route handlers, repository methods, service layer queries.

---

## Validation

### Type Guards

Runtime validation functions to check values at runtime:

```typescript
// Check if value is a valid ExperienceLevel
function isExperienceLevel(value: unknown): value is ExperienceLevel

// Check if value is a valid PreferredRole
function isPreferredRole(value: unknown): value is PreferredRole

// Check if value is a valid Certification
function isCertification(value: unknown): value is Certification

// Check if array contains only valid certifications
function areCertifications(value: unknown): value is Certification[]
```

**Usage**: Form validation, API input validation, type narrowing.

### Validation Constants

```typescript
const SCOUTER_VALIDATION = {
  experience_level: {
    required: true,
    values: ['rookie', 'intermediate', 'veteran'],
  },
  certifications: {
    required: false,
    maxLength: 10,
    validValues: AVAILABLE_CERTIFICATIONS,
  },
  availability_notes: {
    required: false,
    maxLength: 1000,
  },
  team_number: {
    required: false,
    min: 1,
    max: 99999,
  },
};
```

---

## Usage Examples

### 1. Creating a New Scouter

```typescript
import type { CreateScouterInput, Scouter } from '@/types/scouter';

async function createScouter(userId: string): Promise<Scouter> {
  const input: CreateScouterInput = {
    user_id: userId,
    experience_level: 'rookie',
    preferred_role: 'match_scouting',
    certifications: ['match_certified'],
  };

  return await scouterRepository.create(input);
}
```

### 2. Filtering Scouters

```typescript
import type { ScouterFilters, ScouterWithUser } from '@/types/scouter';

async function findAvailableScouts(): Promise<ScouterWithUser[]> {
  const filters: ScouterFilters = {
    has_certification: 'match_certified',
    experience_level: 'veteran',
    is_active: true,
    sort_by: 'matches',
    sort_order: 'desc',
  };

  return await scouterRepository.findMany(filters);
}
```

### 3. Displaying Scouter Information

```typescript
import {
  EXPERIENCE_LEVEL_LABELS,
  CERTIFICATION_LABELS,
} from '@/types/scouter';
import type { ScouterWithUser } from '@/types/scouter';

function getScouterDisplayData(scouter: ScouterWithUser) {
  return {
    name: scouter.display_name || scouter.full_name || scouter.email,
    experience: EXPERIENCE_LEVEL_LABELS[scouter.experience_level],
    certifications: scouter.certifications.map(
      cert => CERTIFICATION_LABELS[cert]
    ),
  };
}
```

### 4. Validating Input

```typescript
import { isExperienceLevel, areCertifications } from '@/types/scouter';

function validateScouterInput(data: unknown) {
  const { experience_level, certifications } = data;

  if (!isExperienceLevel(experience_level)) {
    throw new Error('Invalid experience level');
  }

  if (certifications && !areCertifications(certifications)) {
    throw new Error('Invalid certifications');
  }

  // Input is valid
}
```

### 5. API Response Type

```typescript
import type { ScouterListResponse } from '@/types/scouter';

async function GET(request: Request): Promise<Response> {
  const scouters = await scouterRepository.findMany(filters);
  const total = await scouterRepository.count(filters);

  const response: ScouterListResponse = {
    success: true,
    data: scouters,
    total,
    limit: 50,
    offset: 0,
    has_more: total > 50,
  };

  return Response.json(response);
}
```

---

## Integration Points

### Database Schema

These types map to the `scouters` table defined in `/supabase/migrations/`.

**Key Mappings**:
- `certifications` column (JSONB) → `Certification[]` type
- `experience_level` column (TEXT with CHECK) → `ExperienceLevel` enum
- `preferred_role` column (TEXT with CHECK) → `PreferredRole` enum

### Existing Types

The scouter types integrate with existing auth and team types:

```typescript
// User relationship
user_id: string // References UserProfile.id from '@/types/auth'

// Team relationship
team_number: number // References Team.team_number from '@/types'
```

### Service Layer

Service methods should use these types:

```typescript
class ScouterService {
  async create(input: CreateScouterInput): Promise<Scouter>
  async update(id: string, input: UpdateScouterInput): Promise<Scouter>
  async findById(id: string): Promise<ScouterWithUser | null>
  async findMany(filters: ScouterFilters): Promise<ScouterWithUser[]>
}
```

---

## Best Practices

### Type Safety

1. **Always use type imports** for types: `import type { Scouter } from '@/types/scouter'`
2. **Use regular imports** for runtime values: `import { CERTIFICATION_LABELS } from '@/types/scouter'`
3. **Use type guards** for runtime validation: `if (isExperienceLevel(value)) { ... }`

### Consistency

1. Follow existing patterns from `auth.ts` and `index.ts`
2. Use JSDoc comments for complex types
3. Prefer readonly arrays for constants: `as const`

### Null Handling

1. Use `| null` for nullable database fields (e.g., `team_number`)
2. Use `| undefined` for optional function parameters
3. Use `?` for optional object properties

---

## Files

- **Main Types**: `/src/types/scouter.ts`
- **Examples**: `/src/types/scouter.example.ts` (documentation only)
- **Documentation**: `/docs/features/scouters/TYPES_REFERENCE.md` (this file)

---

## Next Steps

With types complete, the following can now be implemented:

1. **Repository Layer** (`/src/lib/repositories/scouter.repository.ts`)
   - CRUD operations
   - Complex queries with joins
   - Filtering and pagination

2. **Service Layer** (`/src/lib/services/scouter.service.ts`)
   - Business logic
   - Validation
   - Statistics calculations

3. **API Routes** (`/src/app/api/admin/scouters/route.ts`)
   - REST endpoints
   - Request/response handling
   - Error handling

4. **UI Components** (`/src/components/admin/scouters/`)
   - List views
   - Forms
   - Detail pages

All of these will have full TypeScript type safety and IntelliSense support!

---

**Last Updated**: 2025-11-08
**Type Check Status**: Passing ✓
