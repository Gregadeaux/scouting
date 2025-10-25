# Phase 3 Service Layer - Required Fixes

## Summary
The Service layer has been successfully created with proper business logic orchestration. However, there are method name mismatches and missing repository methods that need to be addressed.

## Files Created ✅
- `src/lib/services/import.service.ts` (500+ lines)
- `src/lib/services/event.service.ts` (560+ lines)
- `src/lib/services/match.service.ts` (400+ lines)
- `src/lib/services/team.service.ts` (480+ lines)
- `src/lib/services/index.ts` (centralized exports with dependency injection)

## Required Fixes

### 1. Repository Method Name Corrections

**Team Repository:**
- ❌ `findByNumber()` → ✅ `findByTeamNumber()`
- ✅ Already has: `findByEventKey()`, `upsert()`, `bulkUpsert()`, `updateFromTBA()`

**Match Repository:**
- ❌ `findByKey()` → ✅ `findByMatchKey()`
- ✅ Already has: `findByEventKey()`, `upsert()`, `bulkUpsert()`
- ❌ Missing: `findByTeamNumber()` - needed for team match history
- ❌ `updateScores(matchKey, redScore, blueScore, winningAlliance)` has 4 params but repository only accepts 3

**Event Repository:**
- ❌ `findByKey()` → ✅ `findByEventKey()`
- ✅ Already has: `findByYear()`, `upsert()`, `updateFromTBA()`

**Import Job Repository:**
- ❌ `complete(jobId, {...})` → ✅ Use `markCompleted(jobId)` or `markFailed(jobId, errorMessage)`
- ✅ Already has: `create()`, `findById()`, `findByEventKey()`, `updateProgress()`, `updateStatus()`

### 2. Merge Strategy Usage Issues

The services are passing wrong types to merge strategies:
- ❌ Passing `Event` to `merge()` instead of `TBAEvent`
- ❌ Passing `Team` to `merge()` instead of `TBATeam`
- ❌ Passing `MatchSchedule` to `merge()` instead of `TBAMatch`

**Fix:** Merge strategies expect `(existing: LocalType, tbaData: TBAType)` not `(existing, new)`.

### 3. TBA Type Issues

**TBAMatch missing fields:**
- ❌ `tbaMatch.winning_alliance` doesn't exist
- ✅ Should calculate from `tbaMatch.alliances.red.score` vs `tbaMatch.alliances.blue.score`

### 4. Missing Repository Methods

**MatchRepository needs:**
```typescript
findByTeamNumber(teamNumber: number): Promise<MatchSchedule[]>
```

**TeamRepository needs (for search):**
```typescript
search(query: string): Promise<Team[]> // Search by name/location
update(teamNumber: number, updates: Partial<Team>): Promise<void>
```

**ScoutingDataRepository is fine** - uses correct methods already after fixes.

## Recommended Approach

### Option A: Extend Repository Interfaces (Preferred)
Add missing methods to repositories to support service layer needs. This makes the architecture cleaner.

### Option B: Work Around Missing Methods
Services can query broader data and filter in-memory (less efficient but works with existing interfaces).

### Current Status: Option B Implemented
The services have been updated to use workarounds where repository methods don't exist:
- Team match history: Filter event matches by team number
- Team search: Returns empty for now (could be implemented later)
- Global scouting queries: Return empty arrays when no event context

## Files Needing Updates

### Quick Fixes (Just rename methods):
1. `src/lib/services/import.service.ts` - Lines ~195, 204, 268, 272, 279, 292, 335, 395
2. `src/lib/services/event.service.ts` - Line ~515
3. `src/lib/services/match.service.ts` - Lines ~143, 150-155, 195, 219
4. `src/lib/services/team.service.ts` - Already fixed ✅

### Moderate Fixes (Fix merge strategy calls):
1. `src/lib/services/import.service.ts` - Lines ~198, 338, 398 (merge strategy parameter types)
2. `src/lib/services/event.service.ts` - Line ~516 (merge strategy parameter type)

### Complex Fixes (Repository extensions):
1. Add `findByTeamNumber()` to `MatchRepository`
2. Add `search()` and `update()` to `TeamRepository`
3. Fix `updateScores()` signature in `MatchRepository` OR update service to match current signature

## Type Check Results

Current errors: ~30 (down from hundreds)
All errors are in service layer, not in core architecture
No errors in repository layer or strategies

## Next Steps for Phase 4 (API Routes)

Once these fixes are complete:
1. Create API routes that use these services
2. Test import flow end-to-end
3. Build UI components for Event Detail screen
4. Implement background job processor for imports

## Notes

The service layer architecture is solid:
- ✅ Proper separation of concerns
- ✅ Dependency injection pattern
- ✅ Factory functions for testing
- ✅ Comprehensive business logic
- ✅ Error handling
- ✅ Progress tracking (for imports)
- ✅ Parallel data fetching for performance

The issues are primarily **naming mismatches** and **missing helper methods**, not architectural problems.
