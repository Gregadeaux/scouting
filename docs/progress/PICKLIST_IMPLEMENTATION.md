# Pick List Generation Implementation

**Issue**: #15 - Implement Pick List Generation Algorithm
**Status**: ✅ Complete - Ready to Test
**Date**: 2025-10-30

---

## Overview

Comprehensive pick list generation system for FRC alliance selection using Multi-Criteria Decision Analysis (MCDA). Ranks teams based on OPR, DPR, CCWM, scouting observations, and reliability metrics with customizable weighting strategies.

---

## Architecture

### 1. Type System (`/src/types/picklist.ts`)

Defines complete type structure for pick list generation:

- **`PickListWeights`**: Configurable weights for 10 different metrics
- **`PickListTeam`**: Team data with computed scores, rankings, strengths/weaknesses
- **`PickListStrategy`**: Pre-built or custom strategy definitions
- **`PickList`**: Complete pick list with metadata and statistics
- **`PickListOptions`**: Generation options (minMatches, includeNotes, etc.)
- **`NormalizedMetric`**: Normalization results with original/normalized values

### 2. Algorithm (`/src/lib/algorithms/picklist.ts`)

**Multi-Criteria Decision Analysis (MCDA) Implementation:**

```typescript
1. Normalize all metrics to 0-1 scale
   - Standard min-max normalization: (value - min) / (max - min)
   - DPR is inverted (lower is better)
   - Handle edge cases (all values same, missing data)

2. Calculate composite score
   score = Σ(weight_i × normalized_metric_i) / Σ(weights)

3. Rank teams by composite score (descending)

4. Extract insights
   - Strengths: metrics in top 30% (normalized ≥ 0.7)
   - Weaknesses: metrics in bottom 30% (normalized ≤ 0.3)
```

**Key Functions:**
- `normalizeMetric()` - Min-max normalization with optional inversion
- `normalizeAllMetrics()` - Batch normalize all teams
- `calculateCompositeScore()` - Apply weights and calculate final score
- `extractStrengths()` - Identify high-performing areas
- `extractWeaknesses()` - Identify improvement areas
- `rankTeams()` - Main entry point, returns ranked `PickListTeam[]`
- `validateWeights()` - Validate weight configuration
- `calculatePickListStatistics()` - Metadata calculations

### 3. Service Layer (`/src/lib/services/picklist.service.ts`)

**Pre-built Strategies:**

| Strategy | Focus | Key Weights |
|----------|-------|-------------|
| **BALANCED** | Well-rounded teams | CCWM 0.25, OPR 0.15, balanced rest |
| **OFFENSIVE** | Scoring ability | OPR 0.30, Auto 0.15, Teleop 0.15 |
| **DEFENSIVE** | Defense & reliability | DPR 0.30, Endgame 0.15, Reliability 0.15 |
| **RELIABLE** | Consistency | Reliability 0.20, CCWM 0.20, Endgame 0.15 |

**Service Methods:**
- `generatePickList(eventKey, strategyId, options)` - Pre-built strategy
- `generateCustomPickList(eventKey, weights, options)` - Custom weights
- `markTeamAsPicked(pickList, teamNumber)` - Track selections
- `exportToCSV(pickList)` - CSV export with all metrics
- `getStrategies()` - List available strategies

**Data Sources:**
- `team_statistics` table: OPR, DPR, CCWM, avg scores, reliability
- `teams` table: Team names and nicknames
- `match_scouting` table: Qualitative notes, strengths, weaknesses

### 4. API Endpoints

#### GET `/api/admin/picklist/[eventKey]`
Generate pick list with pre-built strategy.

**Query Parameters:**
- `strategy`: Strategy ID (BALANCED, OFFENSIVE, DEFENSIVE, RELIABLE) - default: BALANCED
- `minMatches`: Minimum matches played (default: 5)
- `includeNotes`: Include detailed scout notes (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "eventKey": "2025cafr",
    "eventName": "Fresno Regional",
    "year": 2025,
    "teams": [
      {
        "teamNumber": 254,
        "teamName": "The Cheesy Poofs",
        "rank": 1,
        "compositeScore": 0.8542,
        "opr": 75.5,
        "dpr": 20.3,
        "ccwm": 55.2,
        "strengths": ["High offensive output (OPR)", "Reliable endgame"],
        "weaknesses": [],
        "picked": false
      }
    ],
    "strategy": { "id": "BALANCED", "name": "Balanced", ... },
    "generatedAt": "2025-10-30T...",
    "totalTeams": 42,
    "minMatchesFilter": 5,
    "metadata": {
      "avgCompositeScore": 0.6234,
      "medianCompositeScore": 0.6150,
      "stdDevCompositeScore": 0.1234,
      "teamsFiltered": 3,
      "avgOPR": 62.45,
      "avgDPR": 22.18,
      "avgCCWM": 40.27,
      "warnings": []
    }
  }
}
```

#### POST `/api/admin/picklist/[eventKey]`
Generate pick list with custom weights.

**Body:**
```json
{
  "weights": {
    "opr": 0.20,
    "dpr": 0.15,
    "ccwm": 0.30,
    "autoScore": 0.10,
    "teleopScore": 0.10,
    "endgameScore": 0.05,
    "reliability": 0.05,
    "driverSkill": 0.03,
    "defenseRating": 0.01,
    "speedRating": 0.01
  },
  "minMatches": 5,
  "includeNotes": true
}
```

**Response:** Same as GET endpoint

#### GET `/api/admin/picklist/[eventKey]/export/csv`
Export pick list as downloadable CSV file.

**Query Parameters:**
- `strategy`: Strategy ID (default: BALANCED)
- `minMatches`: Minimum matches played (default: 5)
- `filename`: Custom filename (default: `picklist-{eventKey}-{strategy}-{date}.csv`)

**Response:**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="picklist-2025cafr-balanced-2025-10-30.csv"`

**CSV Columns:**
Rank, Team, Team Name, Nickname, Score, OPR, DPR, CCWM, Matches, Avg Auto, Avg Teleop, Avg Endgame, Reliability %, Driver Skill, Defense, Speed, Strengths, Weaknesses, Picked

---

## Metrics Used

| Metric | Source | Type | Range | Notes |
|--------|--------|------|-------|-------|
| **OPR** | `team_statistics.opr` | Objective | 0-150+ | Offensive Power Rating |
| **DPR** | `team_statistics.dpr` | Objective | 0-150+ | Defensive Power Rating (inverted) |
| **CCWM** | `team_statistics.ccwm` | Objective | -50 to +50 | OPR - DPR |
| **Auto Score** | `team_statistics.avg_auto_score` | Objective | 0-50+ | Average autonomous points |
| **Teleop Score** | `team_statistics.avg_teleop_score` | Objective | 0-100+ | Average teleoperated points |
| **Endgame Score** | `team_statistics.avg_endgame_score` | Objective | 0-30+ | Average endgame points |
| **Reliability** | `team_statistics.reliability_score` | Objective | 0-100% | % matches without issues |
| **Driver Skill** | `team_statistics.avg_driver_skill` | Subjective | 1-5 | Scout ratings |
| **Defense Rating** | `team_statistics.avg_defense_rating` | Subjective | 1-5 | Scout ratings |
| **Speed Rating** | `team_statistics.avg_speed_rating` | Subjective | 1-5 | Scout ratings |

---

## Unit Tests

**Location:** `/tests/lib/algorithms/picklist.test.ts`

**Coverage:** 42 comprehensive tests

### Test Suites

1. **`normalizeMetric`** (6 tests)
   - Standard normalization
   - Min/max edge cases
   - Inversion for DPR
   - Zero range handling
   - Clamping to [0, 1]

2. **`normalizeAllMetrics`** (5 tests)
   - Batch normalization
   - OPR normalization correctness
   - DPR inversion
   - Missing optional metrics
   - Empty array handling

3. **`calculateCompositeScore`** (4 tests)
   - Weighted sum calculation
   - CCWM heavy weighting
   - Zero weights edge case
   - Weight sum normalization

4. **`extractStrengths`** (6 tests)
   - High OPR identification
   - Strong defense (low DPR)
   - Excellent CCWM
   - Reliability detection
   - Custom threshold
   - Average performer (no strengths)

5. **`extractWeaknesses`** (5 tests)
   - Low OPR identification
   - Poor defense (high DPR)
   - Low CCWM
   - Unreliable robot
   - Custom threshold

6. **`rankTeams`** (8 tests)
   - Minimum matches filter
   - Ranking by composite score
   - Correct rank assignment
   - Team metadata preservation
   - Strengths/weaknesses inclusion
   - Initial picked status
   - Empty result handling

7. **`validateWeights`** (4 tests)
   - Valid balanced weights
   - Negative weight detection
   - All-zero warning
   - Unusual sum warning

8. **`calculatePickListStatistics`** (4 tests)
   - Average composite score
   - Median calculation
   - Standard deviation
   - Average OPR/DPR/CCWM
   - Empty list handling

**Test Results:**
```
✓ 42 tests passed (42)
  Duration: 8ms
  Coverage: 100% of algorithm functions
```

---

## Usage Examples

### Basic Pick List Generation

```bash
# Generate balanced pick list
curl "http://localhost:3000/api/admin/picklist/2025cafr?strategy=BALANCED&minMatches=5" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate offensive pick list (prioritize scoring)
curl "http://localhost:3000/api/admin/picklist/2025cafr?strategy=OFFENSIVE" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate defensive pick list (prioritize defense)
curl "http://localhost:3000/api/admin/picklist/2025cafr?strategy=DEFENSIVE&minMatches=8" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Download CSV export
curl "http://localhost:3000/api/admin/picklist/2025cafr/export/csv?strategy=BALANCED" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o picklist.csv
```

### Custom Weights

```bash
curl -X POST "http://localhost:3000/api/admin/picklist/2025cafr" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "weights": {
      "opr": 0.25,
      "dpr": 0.10,
      "ccwm": 0.30,
      "autoScore": 0.15,
      "teleopScore": 0.10,
      "endgameScore": 0.05,
      "reliability": 0.03,
      "driverSkill": 0.01,
      "defenseRating": 0.01,
      "speedRating": 0.00
    },
    "minMatches": 6,
    "includeNotes": true
  }'
```

### Programmatic Usage

```typescript
import { createPickListService } from '@/lib/services/picklist.service';
import { createServiceClient } from '@/lib/supabase/server';

// Generate pick list
const supabase = createServiceClient();
const service = createPickListService(supabase);

const pickList = await service.generatePickList(
  '2025cafr',
  'BALANCED',
  { minMatches: 5, includeNotes: true }
);

console.log(`Generated pick list with ${pickList.teams.length} teams`);
console.log(`Top pick: Team ${pickList.teams[0].teamNumber} - ${pickList.teams[0].teamName}`);

// Export to CSV
const csv = service.exportToCSV(pickList);
console.log(csv);

// Mark team as picked
const updatedList = service.markTeamAsPicked(pickList, 254);
```

---

## Integration Requirements

### Prerequisites

1. **OPR/DPR/CCWM must be calculated first:**
   ```bash
   POST /api/admin/statistics/opr
   {
     "eventKey": "2025cafr",
     "forceRecalculate": false
   }
   ```

2. **Database tables:**
   - `team_statistics` must have rows for the event with non-null `opr`, `dpr`, `ccwm`
   - `teams` table for team names
   - `match_scouting` for qualitative notes (optional)

3. **Minimum data:**
   - At least 3 teams with calculated statistics
   - Recommended: 5+ matches per team for accurate rankings

### Error Handling

**No OPR calculated:**
```json
{
  "error": "No team statistics found for event 2025cafr. Have you calculated OPR/DPR/CCWM?",
  "hint": "Calculate OPR/DPR/CCWM first using POST /api/admin/statistics/opr"
}
```

**Invalid strategy:**
```json
{
  "error": "Invalid strategy: INVALID",
  "available": ["BALANCED", "OFFENSIVE", "DEFENSIVE", "RELIABLE"]
}
```

**No teams meet criteria:**
```json
{
  "success": true,
  "data": {
    "teams": [],
    "metadata": {
      "warnings": ["No teams met the minimum matches criteria (10 matches). Consider lowering the threshold."]
    }
  }
}
```

---

## Testing Recommendations

### Unit Tests
✅ All 42 tests passing

### Integration Testing

1. **Setup Test Event:**
   - Import event from The Blue Alliance
   - Calculate OPR/DPR/CCWM
   - Verify team_statistics populated

2. **Test All Strategies:**
   ```bash
   GET /api/admin/picklist/2025cafr?strategy=BALANCED
   GET /api/admin/picklist/2025cafr?strategy=OFFENSIVE
   GET /api/admin/picklist/2025cafr?strategy=DEFENSIVE
   GET /api/admin/picklist/2025cafr?strategy=RELIABLE
   ```

3. **Verify Ranking Logic:**
   - OFFENSIVE should rank high-OPR teams first
   - DEFENSIVE should rank low-DPR teams first
   - RELIABLE should rank high-reliability teams first

4. **Test Edge Cases:**
   - Event with few teams (<10)
   - Event with incomplete data (some teams <5 matches)
   - Custom weights with extreme values
   - Custom weights with all zeros (should warn)

5. **CSV Export:**
   - Download CSV
   - Verify all columns present
   - Import into Excel/Sheets
   - Check for formatting issues

### Performance Testing

- Event with 40+ teams: Should complete in <2 seconds
- Multiple concurrent requests: Should handle 10+ simultaneous
- Large pick list (60+ teams): Should generate and return efficiently

---

## Future Enhancements

### Potential Improvements

1. **Machine Learning Integration:**
   - Historical performance prediction
   - Alliance synergy analysis
   - Playoff success probability

2. **Real-time Updates:**
   - Recalculate as new match data arrives
   - WebSocket/SSE for live pick list

3. **Advanced Metrics:**
   - Head-to-head win rates
   - Alliance compatibility scoring
   - Playoff specialization (eliminations vs. qualifications)

4. **UI Components:**
   - Interactive pick list viewer
   - Drag-and-drop alliance simulation
   - Weight configuration wizard

5. **Caching:**
   - Cache generated pick lists
   - Invalidate on new OPR calculation
   - Redis/Vercel KV integration

6. **Export Formats:**
   - PDF with charts
   - JSON for external tools
   - Excel with pivot tables

---

## Files Modified/Created

### Created Files
- `/src/types/picklist.ts` - Type definitions (153 lines)
- `/src/lib/algorithms/picklist.ts` - MCDA algorithm (405 lines)
- `/src/lib/services/picklist.service.ts` - Service layer (393 lines)
- `/src/app/api/admin/picklist/[eventKey]/route.ts` - GET/POST endpoints (221 lines)
- `/src/app/api/admin/picklist/[eventKey]/export/csv/route.ts` - CSV export (105 lines)
- `/tests/lib/algorithms/picklist.test.ts` - Unit tests (712 lines)

### No Files Modified
All changes are additive - no existing files were modified.

---

## Deployment Checklist

- [x] TypeScript compilation passes
- [x] Unit tests pass (42/42)
- [x] Next.js build succeeds
- [x] API endpoints implement auth middleware
- [x] Error handling comprehensive
- [x] Documentation complete
- [ ] Integration tests with real data
- [ ] Performance benchmarks
- [ ] Admin UI components
- [ ] End-user documentation

---

## Support & Documentation

**GitHub Issue:** #15
**Implementation Date:** 2025-10-30
**Developer:** Claude (Sonnet 4.5)
**Test Coverage:** 100% of algorithm functions
**Status:** ✅ Ready to Test

For questions or issues, refer to:
- Inline code documentation (JSDoc comments)
- Unit tests for usage examples
- This implementation guide
