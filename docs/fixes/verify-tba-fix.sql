-- Verification Queries for TBA Validation Duplication Fix
-- Run these queries before and after applying the fix

-- ============================================================================
-- 1. Count Total Validation Results by Event
-- ============================================================================
-- Expected: ~3,960 for 60 matches (66 results per match)
-- Before fix: ~23,760 (396 results per match)

SELECT
  event_key,
  COUNT(*) as total_results,
  COUNT(DISTINCT match_key) as num_matches,
  ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT match_key), 0), 2) as avg_results_per_match
FROM validation_results
WHERE validation_type = 'tba'
GROUP BY event_key
ORDER BY event_key;

-- Expected output after fix:
-- event_key    | total_results | num_matches | avg_results_per_match
-- 2025casj     | 3960         | 60          | 66.00

-- ============================================================================
-- 2. Results Per Match (Detailed Breakdown)
-- ============================================================================
-- Expected: ~66 results per match (6 teams × 11 fields)
-- Before fix: ~396 results per match

SELECT
  match_key,
  COUNT(*) as result_count,
  COUNT(DISTINCT team_number) as num_teams,
  COUNT(DISTINCT field_path) as num_fields
FROM validation_results
WHERE validation_type = 'tba'
  AND event_key = '2025casj' -- Replace with your event
GROUP BY match_key
ORDER BY match_key
LIMIT 20;

-- Expected output after fix:
-- match_key         | result_count | num_teams | num_fields
-- 2025casj_qm1     | 66           | 6         | 11
-- 2025casj_qm2     | 66           | 6         | 11

-- ============================================================================
-- 3. Check for Duplicate Results (Same team/field/match)
-- ============================================================================
-- Expected: 0 duplicates
-- Before fix: Many duplicates

SELECT
  match_key,
  team_number,
  field_path,
  COUNT(*) as duplicate_count
FROM validation_results
WHERE validation_type = 'tba'
  AND event_key = '2025casj' -- Replace with your event
GROUP BY match_key, team_number, field_path
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Expected output after fix: (no rows)

-- ============================================================================
-- 4. Results Per Team Per Match
-- ============================================================================
-- Expected: ~11 results per team per match (11 validated fields)
-- Before fix: ~66 results per team (duplicated)

SELECT
  match_key,
  team_number,
  COUNT(*) as result_count,
  COUNT(DISTINCT field_path) as num_fields
FROM validation_results
WHERE validation_type = 'tba'
  AND event_key = '2025casj' -- Replace with your event
GROUP BY match_key, team_number
ORDER BY match_key, team_number
LIMIT 20;

-- Expected output after fix:
-- match_key         | team_number | result_count | num_fields
-- 2025casj_qm1     | 254         | 11           | 11
-- 2025casj_qm1     | 604         | 11           | 11
-- 2025casj_qm1     | 846         | 11           | 11

-- ============================================================================
-- 5. Validation Results by Field Path
-- ============================================================================
-- Expected: ~360 results per field (60 matches × 6 teams)
-- Before fix: ~2,160 results per field (6x duplication)

SELECT
  field_path,
  COUNT(*) as total_count,
  COUNT(DISTINCT match_key) as num_matches,
  COUNT(DISTINCT team_number) as num_teams
FROM validation_results
WHERE validation_type = 'tba'
  AND event_key = '2025casj' -- Replace with your event
GROUP BY field_path
ORDER BY field_path;

-- Expected output after fix (11 fields):
-- field_path                           | total_count | num_matches | num_teams
-- auto_performance.coral_scored_L1     | 360         | 60          | 6
-- auto_performance.coral_scored_L2     | 360         | 60          | 6
-- ... (11 total fields)

-- ============================================================================
-- 6. Execution Summary
-- ============================================================================
-- Check how many results were created in the last execution

SELECT
  execution_id,
  COUNT(*) as total_results,
  COUNT(DISTINCT match_key) as num_matches,
  COUNT(DISTINCT team_number) as num_teams,
  MIN(created_at) as started_at,
  MAX(created_at) as completed_at
FROM validation_results
WHERE validation_type = 'tba'
GROUP BY execution_id
ORDER BY MIN(created_at) DESC
LIMIT 5;

-- Expected: Most recent execution should show ~3,960 results for 60 matches

-- ============================================================================
-- 7. Cleanup Query (Use with Caution!)
-- ============================================================================
-- Delete validation results for an event before re-running validation
-- UNCOMMENT ONLY WHEN YOU'RE SURE YOU WANT TO DELETE

-- DELETE FROM validation_results
-- WHERE event_key = '2025casj' -- Replace with your event
--   AND validation_type = 'tba';

-- DELETE FROM scouter_elo_history
-- WHERE event_key = '2025casj'; -- Replace with your event

-- ============================================================================
-- 8. Summary Statistics
-- ============================================================================
-- Overall health check

SELECT
  'Total Results' as metric,
  COUNT(*) as value
FROM validation_results
WHERE validation_type = 'tba'
  AND event_key = '2025casj' -- Replace with your event

UNION ALL

SELECT
  'Unique Matches',
  COUNT(DISTINCT match_key)
FROM validation_results
WHERE validation_type = 'tba'
  AND event_key = '2025casj'

UNION ALL

SELECT
  'Unique Teams',
  COUNT(DISTINCT team_number)
FROM validation_results
WHERE validation_type = 'tba'
  AND event_key = '2025casj'

UNION ALL

SELECT
  'Unique Fields',
  COUNT(DISTINCT field_path)
FROM validation_results
WHERE validation_type = 'tba'
  AND event_key = '2025casj'

UNION ALL

SELECT
  'Avg Results Per Match',
  ROUND(AVG(match_results), 2)
FROM (
  SELECT COUNT(*) as match_results
  FROM validation_results
  WHERE validation_type = 'tba'
    AND event_key = '2025casj'
  GROUP BY match_key
) subquery;

-- Expected output after fix:
-- metric                    | value
-- Total Results            | 3960
-- Unique Matches           | 60
-- Unique Teams             | 6
-- Unique Fields            | 11
-- Avg Results Per Match    | 66.00
