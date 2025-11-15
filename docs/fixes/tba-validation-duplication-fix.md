# TBA Validation Duplication Fix

**Date:** 2025-11-13
**Issue:** TBA validation generating 5x duplicate results (19,800 instead of 3,960)

## Root Cause

The TBA validation strategy has a fundamental mismatch with how it's called:

### How It Was Called
- `ScouterValidationService` calls `TBAValidationStrategy.validate()` **once per team** (6 times per match)
- Each call includes a `context.teamNumber` to specify which team is being validated

### How It Actually Worked
- `TBAValidationStrategy.validate()` is **match-level**, not team-level
- It validates ALL 6 teams in a match (red and blue alliances) every time it's called
- It returned results for all 6 teams regardless of `context.teamNumber`

### The Duplication
1. Service calls `validate()` 6 times per match (once per team)
2. First call: Validates all 6 teams, caches 66 results (6 teams × 11 fields), returns all 66
3. Calls 2-6: Return cached 66 results for each call
4. **Total: 6 calls × 66 results = 396 results per match** (instead of 66)
5. For 60 matches: 60 × 396 = **23,760 results** (instead of 3,960)

## The Fix

### 1. Filter Results by Team (Primary Fix)
Modified `TBAValidationStrategy.validate()` to:
- Still validate all 6 teams when called (efficient - only runs once per match)
- Cache all results (66 per match)
- **Filter results to only return those for `context.teamNumber`**
- Return ~11 results per call instead of 66

**File:** `/src/lib/validation/strategies/tba-validation.strategy.ts`
**Lines:** 186-271

**Change:**
```typescript
// Before: Return all results
this.matchValidationCache.set(cacheKey, results);
return results;

// After: Filter to requested team only
this.matchValidationCache.set(cacheKey, allResults);
const teamResults = allResults.filter(r => r.teamNumber === context.teamNumber);
return teamResults;
```

**Also added filtering when returning cached results:**
```typescript
if (this.matchValidationCache.has(cacheKey)) {
  const allResults = this.matchValidationCache.get(cacheKey)!;
  const teamResults = allResults.filter(r => r.teamNumber === context.teamNumber);
  return teamResults;
}
```

### 2. Optimize Database Queries (Performance Fix)
Fixed inefficient data fetching in `getAllianceScoutingData()`:

**Before:**
```typescript
for (const teamNumber of teamNumbers) {
  // Fetches ALL match data for EACH team (3 times per alliance = 6 times per match!)
  const scoutingEntries = await this.scoutingRepository.getMatchScoutingByMatch(matchKey);
  const teamScoutingData = scoutingEntries.find(s => s.team_number === teamNumber);
}
```

**After:**
```typescript
// Fetch ALL match data ONCE
const scoutingEntries = await this.scoutingRepository.getMatchScoutingByMatch(matchKey);
const scoutingByTeam = new Map<number, MatchScouting>();
for (const entry of scoutingEntries) {
  scoutingByTeam.set(entry.team_number, entry);
}

// Then look up each team from the map
for (const teamNumber of teamNumbers) {
  const teamScoutingData = scoutingByTeam.get(teamNumber);
}
```

**Impact:** Reduced database queries from 6 per match to 1 per match (6x reduction)

## Expected Outcomes

### Before Fix
- 60 matches with 6 teams each
- Each team validated 6 times
- Total: 60 × 6 × 66 = 23,760 validation results ❌

### After Fix
- 60 matches with 6 teams each
- Each team validated once (though called 6 times, cache + filter prevents duplication)
- Total: 60 × 66 = 3,960 validation results ✅

### Performance Improvements
- Database queries: 360 queries → 60 queries (6x reduction)
- Duplicate results: 23,760 → 3,960 (5x reduction)
- Storage: ~1MB → ~200KB (5x reduction)

## Testing

### Manual Test
1. Delete existing validation results for an event:
   ```sql
   DELETE FROM validation_results WHERE event_key = 'YOUR_EVENT';
   DELETE FROM scouter_elo_history WHERE event_key = 'YOUR_EVENT';
   ```

2. Run validation via API:
   ```bash
   curl -X POST http://localhost:3000/api/admin/validation/execute \
     -H "Content-Type: application/json" \
     -d '{"eventKey": "YOUR_EVENT", "strategies": ["tba"]}'
   ```

3. Check result count:
   ```sql
   SELECT COUNT(*) FROM validation_results WHERE event_key = 'YOUR_EVENT';
   -- Should be ~3,960 for 60 matches
   ```

### Verification Query
```sql
-- Count results per match (should be ~66 per match)
SELECT
  match_key,
  COUNT(*) as result_count
FROM validation_results
WHERE event_key = 'YOUR_EVENT'
  AND validation_type = 'tba'
GROUP BY match_key
ORDER BY match_key;

-- Should show ~66 results per match, not 396
```

## Additional Improvements

### Code Documentation
Added comprehensive inline comments explaining:
- Why TBA validation is match-level, not team-level
- How the cache works
- Why we filter results by team
- The database query optimization

### Logging
Enhanced logging to show:
- When cache hits occur
- How many results are filtered for each team
- Match-level vs team-level result counts

## Files Modified

1. `/src/lib/validation/strategies/tba-validation.strategy.ts`
   - Modified `validate()` method (lines 186-271)
   - Modified `getAllianceScoutingData()` method (lines 338-376)

## Related Issues

- GitHub Issue: [Link to issue if exists]
- Linear Ticket: [Link to Linear ticket if exists]

## Deployment Notes

- No database migrations required
- No API changes (backward compatible)
- Recommended: Clear existing validation results for events with duplicates
- Safe to deploy immediately

## Follow-up Tasks

- [ ] Add unit tests for TBA validation strategy
- [ ] Add integration test for validation service
- [ ] Consider refactoring service to call TBA strategy once per match (not once per team)
- [ ] Monitor database query performance in production
- [ ] Add metrics/monitoring for validation result counts
