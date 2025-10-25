# Merge Strategies

This directory contains merge strategies for TBA import operations, defining how to merge external data with local database records.

## Overview

When importing data from The Blue Alliance (TBA), we need to decide how to handle conflicts between TBA data and local data. Merge strategies encapsulate these business rules in a reusable, testable way.

## Architecture

```
strategies/
├── merge-strategies.ts   # Team, Event, and Match merge strategies
└── index.ts             # Centralized exports
```

## Strategy Pattern Benefits

1. **Encapsulation**: Merge logic is isolated from repository/service code
2. **Reusability**: Strategies can be used across multiple services
3. **Testability**: Easy to unit test merge logic independently
4. **Flexibility**: Easy to change merge behavior without touching other code
5. **Type Safety**: TypeScript ensures correct data types

## Merge Strategies

### Team Merge Strategy

**Philosophy**: TBA is the source of truth for official data, but preserve local customizations.

```typescript
import { MergeStrategies } from '@/lib/strategies';

const existingTeam = await teamRepo.findByTeamNumber(930);
const tbaTeam = await tbaClient.getTeam('frc930');

const mergedTeam = MergeStrategies.team.merge(existingTeam, tbaTeam);
// Result: TBA data with local notes/customizations preserved

await teamRepo.upsert(mergedTeam);
```

**Merge Rules**:
- TBA data takes precedence for all official fields
- Local-only fields (notes, custom_data) are preserved
- If TBA field is null/missing, local value is preserved as fallback

**Example**:
```typescript
// Existing local team
const local = {
  team_number: 930,
  team_name: 'BEARs', // Outdated
  city: 'Mukwonago',
  notes: 'Great autonomous', // Local field
};

// TBA data
const tba = {
  team_number: 930,
  nickname: 'Mukwonago BEARs', // Updated name
  city: 'Mukwonago',
  state_prov: 'Wisconsin',
  rookie_year: 2002,
};

// Merged result
const merged = MergeStrategies.team.merge(local, tba);
// {
//   team_number: 930,
//   team_name: 'Mukwonago BEARs', // TBA value
//   city: 'Mukwonago',
//   state_province: 'Wisconsin', // TBA value
//   rookie_year: 2002, // TBA value
//   notes: 'Great autonomous', // Preserved local value
// }
```

### Event Merge Strategy

**Philosophy**: TBA is the complete source of truth for all event data.

```typescript
import { MergeStrategies } from '@/lib/strategies';

const existingEvent = await eventRepo.findByEventKey('2025txaus');
const tbaEvent = await tbaClient.getEvent('2025txaus');

const mergedEvent = MergeStrategies.event.merge(existingEvent, tbaEvent);
// Result: TBA data completely replaces local data

await eventRepo.upsert(mergedEvent);
```

**Merge Rules**:
- TBA data completely replaces local data
- Event type codes are mapped to our EventType enum
- Optional fields (district, week) are set to undefined if missing

**Event Type Mapping**:
```typescript
TBA Code → Our EventType
0  → 'regional'
1  → 'district'
2  → 'district_championship'
3  → 'championship_subdivision'
4  → 'championship'
5  → 'district_championship' (Division)
6  → 'offseason' (Festival of Champions)
99 → 'offseason'
100 → 'offseason' (Preseason)
```

**Example**:
```typescript
const tbaEvent = {
  key: '2025txaus',
  name: 'FRC Greater Austin District Event',
  event_code: 'txaus',
  event_type: 1, // District
  year: 2025,
  district: {
    abbreviation: 'tx',
    display_name: 'FIRST In Texas',
  },
  week: 3,
  city: 'Austin',
  state_prov: 'Texas',
  country: 'USA',
  start_date: '2025-03-20',
  end_date: '2025-03-22',
};

const merged = MergeStrategies.event.merge(null, tbaEvent);
// {
//   event_key: '2025txaus',
//   event_name: 'FRC Greater Austin District Event',
//   event_type: 'district', // Mapped from code 1
//   district: 'tx',
//   week: 3,
//   year: 2025,
//   city: 'Austin',
//   state_province: 'Texas',
//   country: 'USA',
//   start_date: '2025-03-20',
//   end_date: '2025-03-22',
// }
```

### Match Merge Strategy

**Philosophy**: TBA is source of truth for schedule and scores. Scouting data is never touched (it's in a separate table).

```typescript
import { MergeStrategies } from '@/lib/strategies';

const existingMatch = await matchRepo.findByMatchKey('2025txaus_qm1');
const tbaMatch = await tbaClient.getMatch('2025txaus_qm1');

const mergedMatch = MergeStrategies.match.merge(existingMatch, tbaMatch);
// Result: TBA schedule/scores, scouting data unaffected

await matchRepo.upsert(mergedMatch);
```

**Merge Rules**:
- TBA data replaces all schedule fields (times, alliance composition)
- Scores are updated from TBA (only if match has been played)
- Winning alliance is automatically calculated
- Unix timestamps are converted to ISO strings
- Team keys (e.g., "frc930") are converted to team numbers (930)

**Example**:
```typescript
const tbaMatch = {
  key: '2025txaus_qm1',
  event_key: '2025txaus',
  comp_level: 'qm',
  match_number: 1,
  alliances: {
    red: {
      score: 85,
      team_keys: ['frc930', 'frc148', 'frc1477'],
    },
    blue: {
      score: 92,
      team_keys: ['frc118', 'frc624', 'frc3005'],
    },
  },
  time: 1711800000, // Unix timestamp
  actual_time: 1711800120,
};

const merged = MergeStrategies.match.merge(null, tbaMatch);
// {
//   match_key: '2025txaus_qm1',
//   event_key: '2025txaus',
//   comp_level: 'qm',
//   match_number: 1,
//   red_1: 930,
//   red_2: 148,
//   red_3: 1477,
//   blue_1: 118,
//   blue_2: 624,
//   blue_3: 3005,
//   red_score: 85,
//   blue_score: 92,
//   winning_alliance: 'blue', // Automatically calculated
//   scheduled_time: '2025-03-30T14:00:00.000Z', // Converted from Unix
//   actual_time: '2025-03-30T14:02:00.000Z',
// }
```

## Interface

All merge strategies implement the `IMergeStrategy` interface:

```typescript
export interface IMergeStrategy<TLocal, TTBA> {
  merge(local: TLocal | null, tba: TTBA): Partial<TLocal>;
}
```

Where:
- `TLocal`: Local database entity type
- `TTBA`: TBA API response type
- `local`: Existing record (null if new)
- `tba`: Data from TBA API
- Returns: Partial entity ready for upsert

## Usage Patterns

### Pattern 1: Single Record Import

```typescript
import { MergeStrategies } from '@/lib/strategies';
import { createTeamRepository } from '@/lib/repositories';

const teamRepo = createTeamRepository();
const tbaClient = createTBAClient();

async function importTeam(teamNumber: number) {
  // Get local and TBA data
  const localTeam = await teamRepo.findByTeamNumber(teamNumber);
  const tbaTeam = await tbaClient.getTeam(`frc${teamNumber}`);

  // Merge
  const mergedTeam = MergeStrategies.team.merge(localTeam, tbaTeam);

  // Upsert
  return await teamRepo.upsert(mergedTeam);
}
```

### Pattern 2: Bulk Import

```typescript
import { MergeStrategies } from '@/lib/strategies';
import { createTeamRepository } from '@/lib/repositories';

const teamRepo = createTeamRepository();

async function importEventTeams(eventKey: string, tbaTeams: TBATeam[]) {
  // Merge all teams
  const mergedTeams = await Promise.all(
    tbaTeams.map(async (tbaTeam) => {
      const localTeam = await teamRepo.findByTeamNumber(tbaTeam.team_number);
      return MergeStrategies.team.merge(localTeam, tbaTeam);
    })
  );

  // Bulk upsert
  return await teamRepo.bulkUpsert(mergedTeams);
}
```

### Pattern 3: Update Results Only

```typescript
import { MergeStrategies } from '@/lib/strategies';
import { createMatchRepository } from '@/lib/repositories';

const matchRepo = createMatchRepository();

async function updateMatchScores(eventKey: string, tbaMatches: TBAMatch[]) {
  // Filter to only played matches
  const playedMatches = tbaMatches.filter(
    m => m.alliances.red.score >= 0 && m.alliances.blue.score >= 0
  );

  // Merge and update
  for (const tbaMatch of playedMatches) {
    const localMatch = await matchRepo.findByMatchKey(tbaMatch.key);
    const mergedMatch = MergeStrategies.match.merge(localMatch, tbaMatch);
    await matchRepo.upsert(mergedMatch);
  }
}
```

## Extending with Custom Strategies

To create a new merge strategy:

```typescript
import type { IMergeStrategy } from '@/lib/strategies';
import type { MyEntity, TBAMyEntity } from '@/types';

export class MyEntityMergeStrategy implements IMergeStrategy<MyEntity, TBAMyEntity> {
  merge(local: MyEntity | null, tba: TBAMyEntity): Partial<MyEntity> {
    // Define your merge logic
    return {
      // Required fields from TBA
      id: tba.id,
      name: tba.name,

      // Preserve local customizations
      notes: local?.notes,

      // Conditional merge
      description: tba.description || local?.description,
    };
  }
}

// Add to MergeStrategies export
export const MergeStrategies = {
  team: new TeamMergeStrategy(),
  event: new EventMergeStrategy(),
  match: new MatchMergeStrategy(),
  myEntity: new MyEntityMergeStrategy(), // Add your strategy
} as const;
```

## Testing Strategies

Strategies are easy to unit test because they're pure functions:

```typescript
import { TeamMergeStrategy } from '@/lib/strategies';

describe('TeamMergeStrategy', () => {
  const strategy = new TeamMergeStrategy();

  it('should merge TBA data with null local data', () => {
    const tbaTeam = {
      team_number: 930,
      key: 'frc930',
      nickname: 'BEARs',
      name: 'Mukwonago High School',
      city: 'Mukwonago',
      state_prov: 'Wisconsin',
      country: 'USA',
      rookie_year: 2002,
    };

    const result = strategy.merge(null, tbaTeam);

    expect(result.team_number).toBe(930);
    expect(result.team_name).toBe('BEARs');
    expect(result.city).toBe('Mukwonago');
  });

  it('should preserve local notes when merging', () => {
    const localTeam = {
      team_number: 930,
      team_name: 'BEARs',
      notes: 'Strong defense',
    };

    const tbaTeam = {
      team_number: 930,
      nickname: 'Mukwonago BEARs',
      // ... other TBA fields
    };

    const result = strategy.merge(localTeam, tbaTeam);

    expect(result.notes).toBe('Strong defense');
  });
});
```

## Best Practices

1. **Always use strategies**: Never merge data manually in services
2. **Test thoroughly**: Unit test edge cases (null data, missing fields)
3. **Document rules**: Clearly explain merge philosophy in comments
4. **Handle nulls**: Check for null/undefined in local data
5. **Type safety**: Use TypeScript to ensure correct types
6. **Immutability**: Don't mutate input data, return new objects

## When to Create a New Strategy

Create a new merge strategy when:
- Importing a new entity type from TBA
- Different merge rules are needed (e.g., season-specific logic)
- Complex transformation logic is required
- Multiple services need the same merge behavior

## Related Documentation

- [TBA API Documentation](https://www.thebluealliance.com/apidocs/v3)
- [Repository Pattern](../repositories/README.md)
- [Service Layer](../../services/README.md) (Future Phase 3)
