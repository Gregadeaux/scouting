# TBA Validation Strategy

**Location**: `/src/lib/validation/strategies/tba-validation.strategy.ts`

**Purpose**: Validates scouting data accuracy by comparing aggregated alliance totals against The Blue Alliance (TBA) official match data.

---

## Overview

The TBA Validation Strategy is one of the core validation approaches in the ELO-based Scouter Validation System. Unlike consensus validation (which compares scouter-to-scouter), TBA validation compares our scouting data against **official match results** from The Blue Alliance.

### Key Challenge: Alliance-Level Data

TBA provides **alliance-level totals** (3 teams combined), not per-team breakdowns. This means we must:

1. **Aggregate** all 3 teams on an alliance
2. **Compare** the total against TBA
3. **Distribute** any discrepancies proportionally across teams

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│          TBAValidationStrategy                  │
│          implements IValidationStrategy         │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │   TBA    │  │  Match   │  │ Scouting │
  │  Service │  │   Repo   │  │   Repo   │
  └──────────┘  └──────────┘  └──────────┘
```

### Dependencies

- **TBAApiService**: Fetches official match data with `score_breakdown`
- **MatchRepository**: Gets alliance composition (red_1, red_2, red_3, etc.)
- **ScoutingDataRepository**: Retrieves scouting entries for validation

---

## Validation Process

### Step 1: Check Feasibility (`canValidate`)

Before running validation, verify:
- ✅ Match key is provided
- ✅ TBA has match data
- ✅ Match has `score_breakdown` (game-specific scoring details)
- ✅ Match has been played (`post_result_time` exists)

```typescript
async canValidate(context: ValidationContext): Promise<boolean> {
  // Must have match key
  if (!context.matchKey) return false;

  // Fetch TBA match data
  const tbaMatch = await this.getTBAMatchData(context.matchKey);
  if (!tbaMatch) return false;

  // Must have score breakdown and results
  if (!tbaMatch.score_breakdown || !tbaMatch.post_result_time) {
    return false;
  }

  return true;
}
```

### Step 2: Aggregate Scouting Data

For each alliance (red and blue):

1. **Get team composition** from `match_schedule`
   - Red: teams at red_1, red_2, red_3
   - Blue: teams at blue_1, blue_2, blue_3

2. **Fetch scouting data** for each team in the match

3. **Extract field values** from JSONB:
   - `auto_performance.coral_scored_L1`
   - `teleop_performance.coral_scored_L1`
   - `endgame_performance.cage_climb_successful`
   - etc.

4. **Sum across all teams**:
   - Red alliance coral L1 total = red_1 + red_2 + red_3
   - Blue alliance coral L1 total = blue_1 + blue_2 + blue_3

### Step 3: Compare Against TBA

TBA's `score_breakdown` structure (example for 2025 Reefscape):

```json
{
  "red": {
    "coralL1Total": 5,
    "coralL2Total": 3,
    "algaeBargeTotal": 10,
    "autoMobilityCount": 2,
    "cageClimbCount": 1
  },
  "blue": {
    "coralL1Total": 4,
    "coralL2Total": 4,
    "algaeBargeTotal": 8,
    "autoMobilityCount": 3,
    "cageClimbCount": 2
  }
}
```

**Field Mappings** (defined in `FIELD_MAPPINGS_2025`):

| TBA Field | Scouting Paths | Aggregation |
|-----------|---------------|-------------|
| `coralL1Total` | `auto_performance.coral_scored_L1`<br>`teleop_performance.coral_scored_L1` | sum |
| `coralL2Total` | `auto_performance.coral_scored_L2`<br>`teleop_performance.coral_scored_L2` | sum |
| `algaeBargeTotal` | `teleop_performance.algae_scored_barge` | sum |
| `autoMobilityCount` | `auto_performance.left_starting_zone` | boolean_count |
| `cageClimbCount` | `endgame_performance.cage_climb_successful` | boolean_count |

### Step 4: Distribute Discrepancies Proportionally

**Example Scenario**:
- **TBA says**: Red alliance scored 10 coral on L1
- **We scouted**:
  - Team 930: 4 coral L1
  - Team 148: 3 coral L1
  - Team 1477: 1 coral L1
  - **Total**: 8 coral L1

**Discrepancy**: 10 - 8 = **2 pieces off**

**Proportional Distribution**:
```typescript
Team 930 error  = 2 * (4 / 8) = 1.0 pieces
Team 148 error  = 2 * (3 / 8) = 0.75 pieces
Team 1477 error = 2 * (1 / 8) = 0.25 pieces
```

**Accuracy Scores**:
```typescript
// Relative error for each team
Team 930:  relativeError = 1.0 / 10 = 0.10 → score = 0.90
Team 148:  relativeError = 0.75 / 10 = 0.075 → score = 0.925
Team 1477: relativeError = 0.25 / 10 = 0.025 → score = 0.975
```

### Step 5: Generate Validation Results

For each team and each field:

```typescript
{
  validationId: "uuid",
  scouterId: "scout_name",
  matchScoutingId: "scouting_entry_id",
  matchKey: "2025casj_qm1",
  teamNumber: 930,
  eventKey: "2025casj",
  seasonYear: 2025,
  fieldPath: "teleop_performance.coral_scored_L1",

  // Expected is TBA's alliance total
  expectedValue: 10,

  // Actual is this team's contribution
  actualValue: 4,

  // Outcome based on accuracy
  outcome: "close_match", // or "exact_match" / "mismatch"

  // Accuracy score (0.0 to 1.0)
  accuracyScore: 0.90,

  // Lower confidence for TBA (alliance-level, not per-team)
  confidenceLevel: 0.6,

  validationType: "tba",
  validationMethod: "TBAValidationStrategy",
  executionId: "uuid",

  notes: "Alliance total from TBA: 10, Scouted total: 8, Team contribution: 4, Proportional error: 1.00"
}
```

---

## Confidence Level: 0.6

TBA validation has **lower confidence** than consensus validation because:

1. **Alliance-level comparison**: We're comparing 3-team totals, not individual team performance
2. **Proportional distribution**: Error is distributed mathematically, not based on actual team performance
3. **Assumption of equal contribution**: If a team didn't contribute, we can't tell from TBA data alone

**Use Cases**:
- ✅ Validate overall accuracy when multiple scouts aren't available
- ✅ Catch major errors (e.g., team scored 20 when alliance total was 10)
- ✅ Supplement consensus validation for higher confidence
- ❌ Not suitable for precise per-team accuracy assessment

---

## Field Mapping System

Field mappings are **season-specific** and must be updated each year.

### 2025 Reefscape Mappings

```typescript
const FIELD_MAPPINGS_2025: TBAFieldMapping[] = [
  {
    tbaField: 'coralL1Total',
    scoutingPaths: [
      'auto_performance.coral_scored_L1',
      'teleop_performance.coral_scored_L1'
    ],
    aggregationMethod: 'sum',
  },
  // ... more mappings
];
```

### Aggregation Methods

1. **`sum`**: Add numeric values
   - Used for: Game pieces scored, points, cycles
   - Example: Coral scored, Algae scored

2. **`boolean_count`**: Count true values
   - Used for: Binary achievements
   - Example: Left starting zone (mobility), Successful climbs

### Adding New Season Mappings

When the 2026 game is announced:

1. Create new mapping array `FIELD_MAPPINGS_2026`
2. Map TBA fields to your scouting JSONB paths
3. Update field selection logic to detect season
4. Test with sample TBA data

---

## Error Handling

### Missing TBA Data

If TBA doesn't have `score_breakdown` for a match:
- `canValidate()` returns `false`
- Strategy is skipped for that match
- No validation results are created

### Incomplete Scouting Data

If fewer than `MIN_TEAMS_REQUIRED` (default: 2) teams have scouting data:
- Alliance validation is skipped
- No results are generated for that alliance

### Field Mismatch

If TBA has a field that we don't map:
- Field is skipped (no error)
- Validation continues with other fields

If we map a field that TBA doesn't have:
- Field is skipped (no error)
- Common when TBA data is incomplete

---

## Performance Considerations

### Batch Processing

When validating an entire event:
1. Fetch **all matches** for event once (single TBA API call)
2. Cache match schedule data
3. Process alliances in parallel where possible

### Rate Limiting

TBA API has rate limits (100 requests/minute):
- Use existing `TBAApiService` with built-in rate limiting
- Batch match fetches by event
- Cache TBA data to minimize API calls

### Database Queries

- Fetch all scouting entries for a match in one query
- Use joins to get alliance composition
- Minimize repository calls in loops

---

## Testing Strategy

### Unit Tests

```typescript
describe('TBAValidationStrategy', () => {
  it('should aggregate alliance totals correctly', () => {
    // Mock scouting data for 3 teams
    // Assert correct aggregation
  });

  it('should distribute errors proportionally', () => {
    // Given: TBA total = 10, Scouted = 8
    // Team contributions: [4, 3, 1]
    // Assert: errors = [1.0, 0.75, 0.25]
  });

  it('should calculate accuracy scores correctly', () => {
    // Test edge cases: perfect match, large error, zero contribution
  });

  it('should skip validation when TBA data missing', async () => {
    // Mock missing score_breakdown
    // Assert: canValidate returns false
  });
});
```

### Integration Tests

```typescript
describe('TBAValidationStrategy Integration', () => {
  it('should validate a complete match with all teams', async () => {
    // Insert match schedule
    // Insert scouting data
    // Mock TBA API response
    // Run validation
    // Assert correct results
  });

  it('should handle partial scouting data', async () => {
    // Only 2 of 3 teams scouted
    // Assert validation runs with available data
  });
});
```

### Manual Testing Checklist

- [ ] Run validation on real event with TBA data
- [ ] Verify accuracy scores make sense
- [ ] Check proportional error distribution
- [ ] Test with missing scouting data
- [ ] Test with incomplete TBA data
- [ ] Verify notes field provides useful context

---

## Usage Examples

### Standalone Validation

```typescript
import { TBAValidationStrategy } from '@/lib/validation/strategies/tba-validation.strategy';

const strategy = new TBAValidationStrategy();

const context: ValidationContext = {
  eventKey: '2025casj',
  matchKey: '2025casj_qm1',
  seasonYear: 2025,
  executionId: crypto.randomUUID(),
};

// Check if validation is possible
if (await strategy.canValidate(context)) {
  // Run validation
  const results = await strategy.validate(context);

  console.log(`Generated ${results.length} validation results`);

  // Process results
  for (const result of results) {
    console.log(
      `Team ${result.teamNumber} - ${result.fieldPath}: ` +
      `accuracy ${result.accuracyScore.toFixed(2)}`
    );
  }
}
```

### Event-Wide Validation

```typescript
import { TBAValidationStrategy } from '@/lib/validation/strategies/tba-validation.strategy';
import { createMatchRepository } from '@/lib/repositories/match.repository';

const strategy = new TBAValidationStrategy();
const matchRepo = createMatchRepository();

const eventKey = '2025casj';
const matches = await matchRepo.findByEventKey(eventKey);

const allResults: ValidationResult[] = [];

for (const match of matches) {
  const context: ValidationContext = {
    eventKey,
    matchKey: match.match_key,
    seasonYear: 2025,
    executionId: crypto.randomUUID(),
  };

  if (await strategy.canValidate(context)) {
    const results = await strategy.validate(context);
    allResults.push(...results);
  }
}

console.log(`Total validations: ${allResults.length}`);
```

### Combining with Consensus Validation

```typescript
import { TBAValidationStrategy } from '@/lib/validation/strategies/tba-validation.strategy';
import { ConsensusValidationStrategy } from '@/lib/validation/strategies/consensus-validation.strategy';

const tbaStrategy = new TBAValidationStrategy();
const consensusStrategy = new ConsensusValidationStrategy();

const context: ValidationContext = {
  eventKey: '2025casj',
  matchKey: '2025casj_qm1',
  seasonYear: 2025,
};

const results: ValidationResult[] = [];

// Try consensus first (higher confidence)
if (await consensusStrategy.canValidate(context)) {
  const consensusResults = await consensusStrategy.validate(context);
  results.push(...consensusResults);
}

// Supplement with TBA validation
if (await tbaStrategy.canValidate(context)) {
  const tbaResults = await tbaStrategy.validate(context);
  results.push(...tbaResults);
}

// Now you have results from both strategies
// Consensus: confidence 0.8-1.0, per-field accuracy
// TBA: confidence 0.6, alliance-level validation
```

---

## Limitations and Considerations

### Limitations

1. **Alliance-level only**: Cannot detect if one team over-reported and another under-reported (canceling out)
2. **TBA data availability**: Not all fields may be in TBA's `score_breakdown`
3. **Time lag**: TBA data may not be available immediately after matches
4. **Season-specific**: Requires manual field mapping updates each year

### When to Use TBA Validation

✅ **Good for**:
- Validating scouting coverage at events with limited scouts
- Catching major data entry errors
- Supplementing consensus validation
- Post-event analysis

❌ **Not good for**:
- Precise per-team accuracy (use consensus instead)
- Real-time validation (TBA data may lag)
- Fields TBA doesn't track

### Complementary Strategies

TBA validation works best when **combined with**:
1. **Consensus validation**: High-precision per-field comparison
2. **Manual validation**: Admin override for edge cases
3. **Statistical analysis**: Outlier detection across events

---

## Configuration

### Adjustable Parameters

```typescript
// In TBAValidationStrategy constructor
private readonly CONFIDENCE_LEVEL = 0.6; // Fixed confidence for TBA
private readonly MIN_TEAMS_REQUIRED = 2;  // Minimum teams for validation
```

### Season-Specific Mappings

To add a new season:

1. Create new mapping array (see Field Mapping System above)
2. Update constructor or add season detection logic
3. Test with sample TBA data for that season

---

## Future Enhancements

### Planned Improvements

1. **Dynamic field mapping**: Load mappings from database based on season_config
2. **Partial field validation**: Validate subset of fields if TBA data incomplete
3. **Confidence adjustment**: Calculate confidence based on scout count and alliance agreement
4. **Historical comparison**: Compare against previous years' TBA accuracy
5. **Alliance role detection**: Weight errors based on team's role in alliance (scorer vs defender)

### Research Opportunities

- Analyze correlation between TBA validation and consensus validation
- Identify fields where TBA is most/least reliable
- Develop machine learning model to predict per-team contributions from alliance totals

---

## References

- [The Blue Alliance API Documentation](https://www.thebluealliance.com/apidocs/v3)
- [ELO Validation System Overview](/docs/features/validation/elo-validation-overview.md)
- [Consensus Validation Strategy](/docs/features/validation/consensus-validation-strategy.md)
- [Season Type Definitions](/src/types/season-2025.ts)
- [TBA API Service](/src/lib/services/tba-api.service.ts)

---

**Last Updated**: 2025-11-13
**Status**: Production-Ready
**Confidence Level**: 0.6 (Alliance-Level Comparison)
