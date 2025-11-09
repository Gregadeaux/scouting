# Scouter Repository

Repository for managing scouter (scout) data following the established repository pattern.

## Overview

The `ScouterRepository` provides CRUD operations and specialized queries for managing scouters - the individuals who collect match and pit scouting data at events.

## Features

- Full CRUD operations (Create, Read, Update, Delete)
- Search and filtering capabilities
- Team affiliation queries
- Experience level filtering
- Certification-based queries
- Performance tracking (matches scouted, reliability scores)
- User profile integration

## Usage

### Creating a Repository Instance

```typescript
import { createScouterRepository } from '@/lib/repositories/scouter.repository';

// Use default service client
const scouterRepo = createScouterRepository();

// Or provide a custom client
const customRepo = createScouterRepository(customSupabaseClient);
```

### Basic Operations

#### Find by ID

```typescript
const scouter = await scouterRepo.findById('uuid-here');
if (scouter) {
  console.log(`Found: ${scouter.scout_name}`);
}
```

#### Find by User ID

```typescript
const scouter = await scouterRepo.findByUserId('user-uuid');
```

#### Find All with Filtering

```typescript
// Get all active scouters
const activeScouters = await scouterRepo.findAll({
  active: true,
  limit: 50,
  offset: 0,
  orderBy: 'scout_name',
  orderDirection: 'asc'
});

// Search by name
const results = await scouterRepo.findAll({
  search: 'john',
  limit: 10
});

// Filter by experience level
const advanced = await scouterRepo.findAll({
  experience_level: 'advanced',
  active: true
});

// Filter by team and role
const teamLeads = await scouterRepo.findAll({
  team_number: 930,
  role: 'lead'
});
```

#### Find by Team Number

```typescript
const teamScouters = await scouterRepo.findByTeamNumber(930);
console.log(`Team 930 has ${teamScouters.length} scouters`);
```

#### Find by Experience Level

```typescript
const experts = await scouterRepo.findByExperienceLevel('expert');
```

### Creating a Scouter

```typescript
const newScouter = await scouterRepo.create({
  scout_name: 'John Doe',
  email: 'john@example.com',
  team_affiliation: 930,
  role: 'scout',
  experience_level: 'intermediate',
  certifications: ['match_scouting', 'pit_scouting'],
  preferred_position: 'blue1',
  active: true
});
```

### Updating a Scouter

```typescript
await scouterRepo.update('scouter-id', {
  experience_level: 'advanced',
  certifications: ['match_scouting', 'pit_scouting', 'lead_scout'],
  reliability_score: 85
});
```

### Deleting a Scouter

```typescript
await scouterRepo.delete('scouter-id');
```

### Performance Tracking

#### Increment Matches Count

```typescript
// Call this after a scouter submits a match scouting form
await scouterRepo.incrementMatchesCount('scouter-id');
```

#### Update Reliability Score

```typescript
// Update based on data quality metrics (0-100)
await scouterRepo.updateReliabilityScore('scouter-id', 92);
```

### Counting Scouters

```typescript
// Total count
const total = await scouterRepo.count();

// Count with filters
const activeCount = await scouterRepo.count({
  active: true,
  team_number: 930
});

const certifiedCount = await scouterRepo.count({
  certification: 'match_scouting',
  experience_level: 'advanced'
});
```

## Types

### ExperienceLevel

```typescript
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
```

### ExtendedScouter

Extends the base `Scouter` type from `@/types/admin` with additional fields:

```typescript
interface ExtendedScouter {
  id: string;
  user_id?: string; // Link to user_profiles
  scout_name: string;
  team_affiliation?: number;
  role?: 'lead' | 'scout' | 'admin';
  email?: string;
  phone?: string;
  experience_level?: ExperienceLevel;
  certifications?: string[]; // JSONB array
  matches_scouted?: number;
  reliability_score?: number; // 0-100
  preferred_position?: string;
  notes?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}
```

### CreateScouterInput

```typescript
interface CreateScouterInput {
  user_id?: string;
  scout_name: string; // Required
  team_affiliation?: number;
  role?: 'lead' | 'scout' | 'admin';
  email?: string;
  phone?: string;
  experience_level?: ExperienceLevel;
  certifications?: string[];
  preferred_position?: string;
  notes?: string;
  active?: boolean; // Defaults to true
}
```

### UpdateScouterInput

All fields are optional:

```typescript
interface UpdateScouterInput {
  scout_name?: string;
  team_affiliation?: number;
  role?: 'lead' | 'scout' | 'admin';
  email?: string;
  phone?: string;
  experience_level?: ExperienceLevel;
  certifications?: string[];
  preferred_position?: string;
  notes?: string;
  active?: boolean;
  matches_scouted?: number;
  reliability_score?: number;
}
```

### ScouterQueryOptions

Extends base `QueryOptions` with scouter-specific filters:

```typescript
interface ScouterQueryOptions {
  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';

  // Filters
  search?: string; // Search by name
  experience_level?: ExperienceLevel;
  team_number?: number;
  certification?: string; // Check if array contains this certification
  role?: 'lead' | 'scout' | 'admin';
  active?: boolean;
}
```

## Query Examples

### Find All Active Team Leads

```typescript
const leads = await scouterRepo.findAll({
  role: 'lead',
  active: true,
  orderBy: 'scout_name',
  orderDirection: 'asc'
});
```

### Find Certified Match Scouts

```typescript
const matchScouts = await scouterRepo.findAll({
  certification: 'match_scouting',
  active: true,
  orderBy: 'reliability_score',
  orderDirection: 'desc'
});
```

### Paginated List with Search

```typescript
const page = 1;
const limit = 20;

const results = await scouterRepo.findAll({
  search: 'smith',
  team_number: 930,
  limit,
  offset: (page - 1) * limit
});

const total = await scouterRepo.count({
  search: 'smith',
  team_number: 930
});

console.log(`Page ${page} of ${Math.ceil(total / limit)}`);
```

### Find High-Performing Scouts

```typescript
const topScouts = await scouterRepo.findAll({
  active: true,
  orderBy: 'reliability_score',
  orderDirection: 'desc',
  limit: 10
});
```

## Error Handling

All repository methods throw typed errors from `base.repository`:

```typescript
try {
  const scouter = await scouterRepo.findById('invalid-id');
} catch (error) {
  if (error instanceof EntityNotFoundError) {
    console.error('Scouter not found');
  } else if (error instanceof DatabaseOperationError) {
    console.error('Database error:', error.message);
  } else if (error instanceof RepositoryError) {
    console.error('Repository error:', error.message);
  }
}
```

## Integration with Services

### Example Service Usage

```typescript
import { createScouterRepository } from '@/lib/repositories/scouter.repository';

export class ScouterService {
  private repo = createScouterRepository();

  async assignScouterToMatch(scouterId: string, matchKey: string) {
    // Business logic here
    await this.repo.incrementMatchesCount(scouterId);
  }

  async calculateReliability(scouterId: string) {
    const scouter = await this.repo.findById(scouterId);
    // Calculate based on data quality metrics
    const score = calculateScore(scouter);
    await this.repo.updateReliabilityScore(scouterId, score);
  }
}
```

## Database Requirements

The repository assumes a `scouters` table with the following structure:

```sql
CREATE TABLE scouters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  scout_name TEXT NOT NULL,
  team_affiliation INTEGER REFERENCES teams(team_number),
  role TEXT CHECK (role IN ('lead', 'scout', 'admin')),
  email TEXT,
  phone TEXT,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  certifications JSONB DEFAULT '[]'::jsonb,
  matches_scouted INTEGER DEFAULT 0,
  reliability_score INTEGER CHECK (reliability_score >= 0 AND reliability_score <= 100),
  preferred_position TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_scouters_user_id ON scouters(user_id);
CREATE INDEX idx_scouters_team_affiliation ON scouters(team_affiliation);
CREATE INDEX idx_scouters_experience_level ON scouters(experience_level);
CREATE INDEX idx_scouters_active ON scouters(active);
CREATE INDEX idx_scouters_reliability_score ON scouters(reliability_score DESC);
CREATE INDEX idx_scouters_certifications ON scouters USING GIN(certifications);
```

## Best Practices

1. **Always use factory function**: Use `createScouterRepository()` for consistent dependency injection
2. **Handle null returns**: `findById` and `findByUserId` return `null` if not found
3. **Validate scores**: Reliability scores must be 0-100
4. **Use pagination**: Always paginate when fetching multiple records
5. **Filter by active status**: Most queries should filter `active: true`
6. **Track performance**: Use `incrementMatchesCount` after every submission
7. **Update reliability**: Regularly update reliability scores based on data quality

## Related Files

- `/src/types/admin.ts` - Base `Scouter` type definition
- `/src/lib/repositories/base.repository.ts` - Base interfaces and error types
- `/src/lib/repositories/team.repository.ts` - Similar repository pattern example
- `/src/lib/supabase/server.ts` - Supabase client creation

## Future Enhancements

- Add assignment tracking (which matches are assigned to which scouts)
- Add performance analytics (accuracy, consistency metrics)
- Add scheduling integration (availability, preferences)
- Add training/certification management
- Add team leader approvals workflow
