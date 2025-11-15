# Consensus Validation Strategy

## Overview

The `ConsensusValidationStrategy` is one of three validation strategies in the ELO-based Scouter Validation System. It validates scouter accuracy by comparing each scouter's submitted values against consensus values calculated from ALL scouts who observed the same team in the same match.

**Location**: `/src/lib/validation/strategies/consensus-validation.strategy.ts`

## Purpose

- **Primary Goal**: Validate scouter accuracy through peer comparison
- **Use Case**: When multiple scouts observe the same match/team
- **Minimum Requirement**: 3 scouts (configurable via `context.minScoutsRequired`)

## Architecture

### Dependencies

1. **ScoutingDataRepository** - Fetches match scouting observations
2. **consolidatePerformanceData()** - Calculates consensus from multiple observations
3. **ELORatingCalculator** - Determines validation outcomes from accuracy scores

### Key Design Patterns

- **Strategy Pattern**: Implements `IValidationStrategy` interface
- **Dependency Injection**: Constructor accepts repository and calculator
- **Reusability**: Uses existing consolidation logic (no duplication)

## How It Works

### 1. Eligibility Check (`canValidate`)

```typescript
async canValidate(context: ValidationContext): Promise<boolean>
```

**Checks**:
- ✅ `matchKey` is provided
- ✅ `teamNumber` is provided
- ✅ Minimum number of scouts (default: 3)

**Returns**: `true` if validation can proceed, `false` otherwise

### 2. Validation Execution (`validate`)

```typescript
async validate(context: ValidationContext): Promise<ValidationResult[]>
```

**Process**:

1. **Fetch Observations**
   - Query all scouting entries for the specified match
   - Filter to the specific team

2. **Calculate Consensus**
   - Use `consolidatePerformanceData()` for each period:
     - `auto_performance`
     - `teleop_performance`
     - `endgame_performance`
   - Consolidation uses:
     - **Mode** for categorical values
     - **Median** for numeric values (with outlier removal)
     - **Majority vote** for booleans

3. **Compare Each Scout**
   - For each scout's observation:
     - Extract all JSONB fields
     - Compare against consensus values
     - Calculate accuracy score (0.0-1.0)

4. **Generate Results**
   - Create a `ValidationResult` for each field for each scout
   - Include metadata: field path, expected/actual values, outcome

**Returns**: Array of `ValidationResult[]` (one per field per scout)

### 3. Field Comparison Logic

#### Boolean Fields
```typescript
compareBooleanField(expected: boolean, actual: boolean): number
```
- **Exact match**: 1.0
- **Mismatch**: 0.0

#### Numeric Fields
```typescript
compareNumericField(expected: number, actual: number): number
```
- **Exact match**: 1.0
- **Off by 1**: 0.8
- **Off by 2**: 0.6
- **Further**: Scaled by relative difference
  ```typescript
  relativeDiff = diff / max(expected, actual, 1)
  score = max(0, 0.6 * (1 - relativeDiff))
  ```

#### Category/String Fields
```typescript
compareCategoryField(expected: unknown, actual: unknown): number
```
- **Exact match**: 1.0
- **Mismatch**: 0.0

### 4. Outcome Determination

```typescript
determineOutcome(accuracyScore: number): ValidationOutcome
```

| Accuracy Score | Outcome Category | Description |
|----------------|------------------|-------------|
| 1.0 | `exact_match` | Perfect accuracy |
| 0.7 - 0.99 | `close_match` | Good but not perfect |
| 0.0 - 0.69 | `mismatch` | Incorrect |

## Example Usage

### Basic Validation

```typescript
import { ConsensusValidationStrategy } from '@/lib/validation/strategies/consensus-validation.strategy';
import { ScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';

const repository = new ScoutingDataRepository();
const strategy = new ConsensusValidationStrategy(repository);

const context = {
  eventKey: '2025casj',
  matchKey: '2025casj_qm15',
  teamNumber: 254,
  seasonYear: 2025,
  minScoutsRequired: 3,
  executionId: crypto.randomUUID(),
};

// Check if validation can proceed
const canValidate = await strategy.canValidate(context);

if (canValidate) {
  // Execute validation
  const results = await strategy.validate(context);

  console.log(`Validated ${results.length} fields across ${new Set(results.map(r => r.scouterId)).size} scouts`);

  // Analyze results
  const exactMatches = results.filter(r => r.outcome === 'exact_match').length;
  const closeMatches = results.filter(r => r.outcome === 'close_match').length;
  const mismatches = results.filter(r => r.outcome === 'mismatch').length;

  console.log(`Exact matches: ${exactMatches}`);
  console.log(`Close matches: ${closeMatches}`);
  console.log(`Mismatches: ${mismatches}`);
}
```

### Custom Minimum Scouts

```typescript
const context = {
  eventKey: '2025casj',
  matchKey: '2025casj_qm15',
  teamNumber: 254,
  seasonYear: 2025,
  minScoutsRequired: 5, // Require 5 scouts instead of 3
  executionId: crypto.randomUUID(),
};
```

## Validation Result Structure

Each `ValidationResult` contains:

```typescript
{
  validationId: 'uuid',
  scouterId: 'scout_name',
  matchScoutingId: 'observation_id',
  matchKey: '2025casj_qm15',
  teamNumber: 254,
  eventKey: '2025casj',
  seasonYear: 2025,

  // Field details
  fieldPath: 'auto_performance.coral_scored_L1',
  expectedValue: 3,  // Consensus value
  actualValue: 2,    // Scout's value

  // Outcome
  outcome: 'close_match',
  accuracyScore: 0.8,
  confidenceLevel: 0.85,

  // Metadata
  validationType: 'consensus',
  validationMethod: 'ConsensusValidationStrategy',
  executionId: 'uuid',
}
```

## Field Paths

Fields are validated from three JSONB periods:

### Auto Performance
```
auto_performance.left_starting_zone (boolean)
auto_performance.coral_scored_L1 (number)
auto_performance.coral_scored_L2 (number)
auto_performance.coral_scored_L3 (number)
auto_performance.coral_scored_L4 (number)
auto_performance.coral_missed (number)
auto_performance.preloaded_piece_scored (boolean)
...
```

### Teleop Performance
```
teleop_performance.coral_scored_L1 (number)
teleop_performance.algae_scored_barge (number)
teleop_performance.algae_scored_processor (number)
teleop_performance.cycles_completed (number)
teleop_performance.defense_effectiveness (category)
...
```

### Endgame Performance
```
endgame_performance.cage_climb_attempted (boolean)
endgame_performance.cage_climb_successful (boolean)
endgame_performance.cage_level_achieved (category: 'shallow' | 'deep')
endgame_performance.endgame_points (number)
...
```

## Error Handling

### ValidationError: Missing Required Fields

```typescript
throw new ValidationError(
  'matchKey is required for consensus validation',
  'MISSING_MATCH_KEY'
);
```

**Cause**: Context missing required fields

**Solution**: Ensure `matchKey`, `teamNumber`, `eventKey`, and `seasonYear` are provided

### ValidationError: Insufficient Scouts

```typescript
throw new ValidationError(
  `Insufficient scouts: found 2, minimum required 3`,
  'INSUFFICIENT_SCOUTS',
  { found: 2, required: 3 }
);
```

**Cause**: Not enough scouts observed the match/team

**Solution**:
- Lower `minScoutsRequired` in context
- Wait for more scouts to submit data
- Skip consensus validation for this match

## Consensus Calculation Details

The strategy uses the existing consolidation logic from `/src/lib/supabase/consolidation.ts`:

### For Numeric Fields
1. Collect all values from all scouts
2. Apply outlier detection (IQR method)
3. Remove outliers
4. Calculate weighted median (using scout reliability weights)
5. Round to nearest integer

### For Boolean Fields
1. Collect all values from all scouts
2. Apply majority voting
3. If tie, default to `false` (conservative)

### For Category Fields
1. Collect all values from all scouts
2. Calculate mode (most common value)
3. If tie, use first occurrence

## Confidence Level Calculation

```typescript
calculateConsensusConfidence(observation, fieldCount): number
```

**Formula**: Logarithmic growth based on field count

- 0 fields: 0.50 confidence
- 10 fields: 0.70 confidence
- 30 fields: 0.85 confidence
- 100+ fields: 0.95 confidence (capped)

**Future Enhancement**: Incorporate scout reliability scores

## Testing

**Test File**: `/src/lib/validation/strategies/__tests__/consensus-validation.strategy.test.ts`

### Test Coverage

✅ `canValidate()` checks
- Missing matchKey
- Missing teamNumber
- Insufficient scouts
- Sufficient scouts

✅ Field comparison logic
- Numeric exact match, off-by-1, off-by-2
- Boolean exact match and mismatch
- Category exact match and mismatch

✅ Outcome determination
- exact_match (1.0)
- close_match (0.7-0.99)
- mismatch (0.0-0.69)

✅ Validation execution
- Missing required fields
- Insufficient scouts
- Successful validation with results

### Running Tests

```bash
# Run all validation tests
npm test -- consensus-validation.strategy.test.ts

# Run with coverage
npm test -- --coverage consensus-validation.strategy.test.ts
```

## Performance Considerations

### Database Queries
- **1 query** to check eligibility (`getMatchScoutingByMatch`)
- **1 query** to fetch observations for validation (`getMatchScoutingByMatch`)
- Queries are cached by repository layer

### Memory Usage
- Minimal: Only loads observations for one match at a time
- Field comparisons are O(n*m) where:
  - n = number of scouts
  - m = number of fields per period (~30-50)

### Optimization Tips
1. **Batch Validation**: Validate multiple matches in parallel
2. **Cache Consolidation**: Store consensus values to avoid recalculation
3. **Field Filtering**: Skip validation for unimportant fields

## Integration with ELO System

Validation results feed into the ELO rating system:

```typescript
// From validation service
const results = await consensusStrategy.validate(context);

// Calculate ELO updates
for (const result of results) {
  const ratingUpdate = eloCalculator.calculateNewRating(
    currentRating,
    result.accuracyScore
  );

  // Store in scouter_elo_history
  await repository.addHistoryEntry({
    scouterId: result.scouterId,
    validationId: result.validationId,
    eloBefore: currentRating,
    eloAfter: ratingUpdate.newRating,
    eloDelta: ratingUpdate.delta,
    outcome: ratingUpdate.outcome,
  });
}
```

## Future Enhancements

### Planned Features
1. **Field Weighting**: Important fields (e.g., scoring) weighted more heavily
2. **Scout Reliability**: Use historical ELO in consensus calculation
3. **Outlier Detection**: Flag scouts with consistently divergent observations
4. **Confidence Thresholds**: Skip validation for low-confidence consensus

### Configuration Options
```typescript
interface ConsensusValidationConfig {
  minScoutsRequired: number;
  confidenceThreshold: number;
  fieldWeights: Record<string, number>;
  excludeFields: string[];
  useScoutWeights: boolean;
}
```

## Related Documentation

- [Validation System Overview](./validation-system-overview.md)
- [TBA Validation Strategy](./tba-validation-strategy.md)
- [ELO Rating Calculator](./elo-rating-calculator.md)
- [Consolidation Algorithms](./consolidation-algorithms.md)

## Troubleshooting

### Issue: Validation fails with "Insufficient scouts"

**Diagnosis**: Not enough scouts observed the match

**Solutions**:
1. Check actual scout count: `repository.getMatchScoutingByMatch(matchKey)`
2. Verify team filter: Ensure scouts observed the correct team
3. Lower minimum threshold: Set `minScoutsRequired: 2`

### Issue: All fields return 0.0 accuracy

**Diagnosis**: Scout data doesn't match expected schema

**Solutions**:
1. Verify JSONB schema version matches season
2. Check field names are correct (e.g., `coral_scored_L1` not `coralScoredL1`)
3. Inspect consensus values: `consolidatePerformanceData(observations)`

### Issue: Numeric comparisons seem unfair

**Diagnosis**: Large magnitude differences skewing scores

**Solutions**:
1. Review comparison logic: `compareNumericField()`
2. Adjust thresholds: Modify 0.8/0.6 constants for tolerance
3. Consider field-specific scoring (future enhancement)

## Questions & Support

For questions or issues with the consensus validation strategy:

1. Check this documentation
2. Review test cases for examples
3. Inspect consolidation logic in `/src/lib/supabase/consolidation.ts`
4. Consult validation system architecture docs

---

**Last Updated**: 2025-11-13
**Version**: 1.0.0
**Status**: Production Ready
