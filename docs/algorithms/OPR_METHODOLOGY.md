# OPR/DPR/CCWM Methodology

## Overview

This document explains the mathematical algorithms used to calculate **OPR (Offensive Power Rating)**, **DPR (Defensive Power Rating)**, and **CCWM (Calculated Contribution to Winning Margin)** in the FRC scouting system.

These metrics are the gold standard for FRC strategy and alliance selection, providing objective statistical measures of team performance.

---

## OPR (Offensive Power Rating)

### What is OPR?

OPR predicts a team's average point contribution to their alliance score. It answers the question: "If this team plays in a match, how many points will they likely contribute?"

### Mathematical Approach

OPR uses **linear algebra** (specifically least squares regression) to solve a system of equations:

1. **Observation**: For each match, the alliance score equals the sum of each team's OPR
   ```
   Alliance Score = Team1_OPR + Team2_OPR + Team3_OPR
   ```

2. **System of Equations**: With many matches, we create a system:
   ```
   Match 1 Red:  OPR_254 + OPR_1678 + OPR_1114 = 120
   Match 1 Blue: OPR_930 + OPR_118  + OPR_2056 = 95
   Match 2 Red:  OPR_254 + OPR_930  + OPR_3476 = 110
   ... (continues for all matches)
   ```

3. **Matrix Form**: Express as `A × x = b`
   - **A**: Coefficient matrix (which teams played in each alliance)
   - **x**: OPR values (what we're solving for)
   - **b**: Alliance scores (known from match results)

4. **Solving**: Use least squares regression
   ```
   x = (A^T × A)^(-1) × A^T × b
   ```

### Implementation Details

```typescript
// Build coefficient matrix
const A = [
  [1, 1, 1, 0, 0, 0],  // Match 1 Red (teams 1,2,3)
  [0, 0, 0, 1, 1, 1],  // Match 1 Blue (teams 4,5,6)
  // ... more rows
];

// Score vector
const b = [120, 95, ...]; // Alliance scores

// Solve using mathjs
const oprValues = solve(A, b); // Least squares solution
```

### Edge Cases

1. **Singular Matrix**: When teams always play together, use pseudo-inverse (Moore-Penrose)
2. **Insufficient Data**: Need at least 3 matches with 3+ unique teams
3. **Missing Teams**: Handle gracefully when alliance has < 3 teams

---

## DPR (Defensive Power Rating)

### What is DPR?

DPR measures the average points a team's **opponents** score. Lower DPR indicates better defense.

### Mathematical Approach

Similar to OPR, but uses **opponent scores**:

- Red alliance teams → use blue_score
- Blue alliance teams → use red_score

```
For Red Alliance:  DPR_team1 + DPR_team2 + DPR_team3 = Blue_Score
For Blue Alliance: DPR_team4 + DPR_team5 + DPR_team6 = Red_Score
```

### Interpretation

- **Low DPR (< 50)**: Strong defensive team, limits opponent scoring
- **Average DPR (~70)**: Typical defensive performance
- **High DPR (> 90)**: Weak defense, allows high opponent scores

---

## CCWM (Calculated Contribution to Winning Margin)

### What is CCWM?

CCWM = OPR - DPR

It measures a team's **net contribution** to winning. This is often considered the most holistic single metric.

### Interpretation

- **Positive CCWM**: Team contributes to winning (scores more than allows)
- **Zero CCWM**: Neutral impact
- **Negative CCWM**: Team detracts from winning (allows more than scores)

### Why CCWM Matters

CCWM balances offense and defense:

| Team | OPR | DPR | CCWM | Analysis |
|------|-----|-----|------|----------|
| A    | 100 | 60  | 40   | Elite all-around |
| B    | 120 | 100 | 20   | High-scoring but poor defense |
| C    | 60  | 40  | 20   | Low-scoring but great defense |
| D    | 50  | 70  | -20  | Below average overall |

Teams B and C have the same CCWM but different styles - important for alliance strategy!

---

## Statistical Properties

### Validation Checks

Our implementation validates results:

1. **Sum Consistency**: Average OPR should ≈ average match score / 3
2. **Zero Sum**: Average CCWM should be near 0 (wins balance losses)
3. **Reasonable Ranges**:
   - OPR typically 0-150 (game dependent)
   - DPR typically 30-100
   - CCWM typically -50 to +50

### Confidence Factors

Results are more reliable when:
- Teams have played ≥ 5 matches
- Event has ≥ 30 completed matches
- Teams play diverse opponents
- Matrix condition number is low

---

## Alliance Selection Strategy

### Using Metrics for Picks

1. **First Picks**: Highest CCWM teams (top 8)
2. **Second Picks**: Consider complementary strengths
   - Need offense? High OPR
   - Need defense? Low DPR
   - Need consistency? Low standard deviation
3. **Specialty Roles**:
   - **Defensive bot**: DPR < field average - 1σ
   - **Scoring machine**: OPR > field average + 1.5σ
   - **Balanced bot**: Both OPR and DPR in top 40%

### Advanced Considerations

- **Schedule Strength**: Teams may have inflated/deflated metrics based on opponents
- **Trend Analysis**: Is team improving over time?
- **Consistency**: Standard deviation of match scores
- **Synergy**: Some teams work better together

---

## Implementation Architecture

### Service Layer (`/src/lib/services/opr.service.ts`)
- Orchestrates calculation flow
- Manages caching (1-hour TTL)
- Handles database persistence

### Algorithm Layer (`/src/lib/algorithms/`)
- `opr.ts`: Core OPR calculation
- `dpr.ts`: DPR calculation
- `ccwm.ts`: CCWM calculation and recommendations

### API Layer (`/src/app/api/admin/statistics/`)
- `opr/route.ts`: Calculate and retrieve metrics
- `recommendations/route.ts`: Alliance selection recommendations

### Database Storage
- Table: `team_statistics`
- Columns: `opr`, `dpr`, `ccwm`, `matches_played_official`
- Indexed by: `(team_number, event_key)`

---

## Performance Optimization

### Caching Strategy
- Cache valid for 1 hour
- Automatic recalculation when new matches added
- Manual refresh available via API

### Computation Efficiency
- Matrix operations using mathjs library
- Batch database updates
- Parallel calculation of OPR/DPR

### Typical Performance
- 40 teams, 100 matches: < 2 seconds
- 60 teams, 150 matches: < 5 seconds

---

## Testing

### Unit Tests (`/src/lib/algorithms/__tests__/`)
- Known dataset validation
- Edge case handling
- Mathematical property verification

### Integration Testing
- API endpoint testing
- Database persistence
- Cache invalidation

### Test Data Sets
1. **Perfect Consistency**: All teams score exactly 30 → OPR = 30 for all
2. **Clear Tiers**: Strong teams (OPR ~50) vs weak (OPR ~20)
3. **Singular Matrix**: Teams always together → pseudo-inverse handling

---

## References

1. [The Blue Alliance OPR Explanation](https://www.thebluealliance.com/opr)
2. [Caleb Sykes OPR Paper](https://www.chiefdelphi.com/t/opr-calculation/105347)
3. [FRC Blog: Understanding OPR, DPR, and CCWM](https://blog.thebluealliance.com/2017/10/05/the-math-behind-opr/)
4. [Linear Algebra and Least Squares](https://en.wikipedia.org/wiki/Least_squares)

---

## Future Enhancements

### Planned Improvements
- **Component OPR**: Separate auto, teleop, endgame contributions
- **xOPR**: Expected OPR based on schedule strength
- **Normalized metrics**: Account for game scoring inflation/deflation
- **Confidence intervals**: Statistical uncertainty bounds
- **Real-time updates**: Recalculate after each match via websockets

### Research Topics
- Machine learning predictions using OPR as features
- Network analysis of team interactions
- Bayesian approaches for early-season predictions
- Time-series analysis for performance trends

---

**Last Updated**: 2024-10-29
**Implementation Status**: ✅ Complete and tested