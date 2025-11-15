# Event Analytics Report - Implementation Plan

**Linear Project**: [Event Analytics Report](https://linear.app/gregadeaux/project/event-analytics-report-7898681e35a5)
**Created**: 2025-11-11
**Status**: Planning Complete

---

## Overview

Create a printable/exportable Event Analytics Report that provides a comprehensive snapshot of event analytics optimized for printing rather than interactivity. The report will include radar charts for top teams, boxplot distributions for game pieces, and OPR rankings with breakdown details.

---

## Features

### 1. Individual Team Radar Charts (Top 5)
- Show **5 separate radar charts** (one per top team by OPR)
- Each chart displays: OPR, CCWM, Auto, Teleop, Endgame, Reliability
- All metrics normalized to 0-100 scale relative to event maximum
- Print-optimized with no hover states

### 2. Game Piece Boxplot Distributions (8 Categories)
- **Full-width boxplot** for each category
- Categories displayed in order:
  1. All Coral (L1+L2+L3+L4)
  2. Coral Level 1
  3. Coral Level 2
  4. Coral Level 3
  5. Coral Level 4
  6. All Algae (Processor+Barge)
  7. Algae Processor
  8. Algae Barge
- Top 10 teams per category
- Stacked vertically (no pagination)

### 3. OPR Rankings with Breakdown Details
- Table columns: Team Number, OPR, DPR, CCWM, Reliability %, Breakdown Matches
- Show specific match numbers where breakdowns occurred
- Display breakdown types (disabled, disconnected, tipped)
- Example: "Q12 (disabled), Q15 (tipped)"

---

## Linear Issues

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| [SCOUT-89](https://linear.app/gregadeaux/issue/SCOUT-89) | Create Report Page Route and Layout Structure | High | Backlog |
| [SCOUT-90](https://linear.app/gregadeaux/issue/SCOUT-90) | Create Individual Radar Chart Component for Top 5 Teams | High | Backlog |
| [SCOUT-91](https://linear.app/gregadeaux/issue/SCOUT-91) | Create Full-Width Boxplot Sections for All 8 Categories | High | Backlog |
| [SCOUT-92](https://linear.app/gregadeaux/issue/SCOUT-92) | Create OPR Rankings Table with Breakdown Details | High | Backlog |
| [SCOUT-93](https://linear.app/gregadeaux/issue/SCOUT-93) | Integrate All Components into Report Page Layout | High | Backlog |
| [SCOUT-94](https://linear.app/gregadeaux/issue/SCOUT-94) | Testing and Print Optimization for Analytics Report | Medium | Backlog |

---

## Implementation Order

### Phase 1: Foundation (SCOUT-89)
**Goal**: Set up the report page route and print-optimized layout

**Tasks**:
1. Create `/src/app/analytics/[eventKey]/report/page.tsx`
2. Add print CSS media queries (`@media print`)
3. Configure page breaks between sections
4. Add "Generate Report" button on main analytics page
5. Create print-friendly header/footer with event name and timestamp

**Files to Create**:
- `/src/app/analytics/[eventKey]/report/page.tsx`
- `/src/app/analytics/[eventKey]/report/report.css` (print styles)

**Files to Modify**:
- `/src/app/analytics/[eventKey]/page.tsx` (add report button)

---

### Phase 2: Radar Charts (SCOUT-90)
**Goal**: Create individual radar chart component for top 5 teams

**Tasks**:
1. Create `TeamRadarProfile` component
2. Calculate normalized metrics (0-100 scale)
3. Fetch and sort teams by OPR
4. Render 5 individual charts
5. Add team number labels

**Files to Create**:
- `/src/components/analytics/report/TeamRadarProfile.tsx`

**Reference**:
- `/src/components/analytics/TeamComparison.tsx` (existing radar chart)

**Data Source**:
- `/api/analytics/event/[eventKey]` → `TeamStatistics[]`

**Normalization Logic**:
```typescript
// Find event maximums
const maxOPR = Math.max(...allEventStats.map(s => s.opr || 0), 1);
const maxCCWM = Math.max(...allEventStats.map(s => s.ccwm || 0), 1);
// ... etc

// Normalize per team
const normalizedOPR = (team.opr / maxOPR) * 100;
```

---

### Phase 3: Boxplot Sections (SCOUT-91)
**Goal**: Create full-width boxplot sections for all 8 categories

**Tasks**:
1. Create `GamePieceBoxplotReport` component
2. Remove pagination logic (show all categories)
3. Render 8 separate boxplot charts
4. Add clear section titles
5. Show top 10 teams per category

**Files to Create**:
- `/src/components/analytics/report/GamePieceBoxplotReport.tsx`

**Reference**:
- `/src/components/analytics/GamePieceBoxplot.tsx` (existing boxplot)

**Data Source**:
- `/api/analytics/game-pieces/[eventKey]` → `TeamData[]`

**Key Changes from Existing Component**:
- Remove `useState` for pagination
- Remove pagination controls
- Loop through all 8 metrics instead of showing one at a time
- Stack charts vertically with clear headings

---

### Phase 4: OPR Table with Breakdowns (SCOUT-92)
**Goal**: Create OPR rankings table with breakdown match details

**Tasks**:
1. Create `OPRRankingsWithBreakdowns` component
2. Fetch team statistics and breakdown data in parallel
3. Merge data to show breakdown matches alongside OPR
4. Format breakdown matches as readable string
5. Sort by OPR descending

**Files to Create**:
- `/src/components/analytics/report/OPRRankingsWithBreakdowns.tsx`

**Reference**:
- `/src/components/analytics/OPRLeaderboard.tsx` (existing OPR table)

**Data Sources**:
1. `/api/analytics/event/[eventKey]` → `TeamStatistics[]`
2. `/api/analytics/breakdowns/[eventKey]` → `TeamBreakdownData[]`

**Data Merging Logic**:
```typescript
interface TeamWithBreakdowns {
  team_number: number;
  opr: number;
  dpr: number;
  ccwm: number;
  reliability_score: number;
  breakdown_matches: string; // Formatted: "Q12 (disabled), Q15 (tipped)"
}

// Merge logic
const mergedData = teamStats.map(team => {
  const breakdowns = breakdownData.find(b => b.team_number === team.team_number);

  const breakdownStr = breakdowns
    ? breakdowns.breakdown_matches
        .map(m => `${formatMatchLevel(m.comp_level)}${m.match_number} (${m.breakdown_types.join(', ')})`)
        .join(', ')
    : 'None';

  return {
    ...team,
    breakdown_matches: breakdownStr,
  };
});
```

**Helper Function**:
```typescript
function formatMatchLevel(comp_level: string): string {
  const levels: Record<string, string> = {
    'qm': 'Q',
    'qf': 'QF',
    'sf': 'SF',
    'f': 'F',
  };
  return levels[comp_level] || comp_level.toUpperCase();
}
```

---

### Phase 5: Integration (SCOUT-93)
**Goal**: Assemble all components into final report page

**Tasks**:
1. Import all report components
2. Fetch all data in parallel using `Promise.all`
3. Implement section structure with headers
4. Add page breaks between sections
5. Add loading states
6. Add error handling
7. Add print button

**Report Structure**:
```tsx
<div className="report-container">
  {/* Header */}
  <header className="report-header">
    <h1>Event Analytics Report for {eventName}</h1>
    <p>Generated: {new Date().toLocaleString()}</p>
    <button onClick={() => window.print()}>Print/Export PDF</button>
  </header>

  {/* Section 1: Top 5 Teams Profiles */}
  <section className="report-section page-break-after">
    <h2>Top 5 Teams Profiles</h2>
    {top5Teams.map(team => (
      <TeamRadarProfile key={team.team_number} team={team} eventStats={allStats} />
    ))}
  </section>

  {/* Section 2: Game Piece Distribution */}
  <section className="report-section page-break-after">
    <h2>Game Piece Scoring Distribution</h2>
    <GamePieceBoxplotReport eventKey={eventKey} />
  </section>

  {/* Section 3: OPR Rankings */}
  <section className="report-section">
    <h2>Top OPR Rankings & Reliability</h2>
    <OPRRankingsWithBreakdowns eventKey={eventKey} />
  </section>
</div>
```

**CSS (Print Styles)**:
```css
@media print {
  .report-container {
    max-width: 100%;
    padding: 0;
  }

  .page-break-after {
    page-break-after: always;
  }

  .report-header button {
    display: none; /* Hide print button when printing */
  }

  /* Remove interactive elements */
  button,
  .no-print {
    display: none !important;
  }

  /* Ensure charts don't break */
  .recharts-wrapper {
    page-break-inside: avoid;
  }
}

@page {
  size: letter portrait;
  margin: 0.5in;
}
```

**Data Fetching**:
```tsx
const [data, setData] = useState<ReportData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  async function fetchReportData() {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [statsRes, gamePieceRes, breakdownsRes, eventRes] = await Promise.all([
        fetch(`/api/analytics/event/${eventKey}`),
        fetch(`/api/analytics/game-pieces/${eventKey}`),
        fetch(`/api/analytics/breakdowns/${eventKey}`),
        fetch(`/api/admin/events/${eventKey}`), // For event name
      ]);

      const [statsData, gamePieceData, breakdownsData, eventData] = await Promise.all([
        statsRes.json(),
        gamePieceRes.json(),
        breakdownsRes.json(),
        eventRes.json(),
      ]);

      setData({
        teamStats: statsData.data,
        gamePieceData: gamePieceData.data,
        breakdowns: breakdownsData.data,
        event: eventData.data,
      });
    } catch (err) {
      setError('Failed to load report data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  fetchReportData();
}, [eventKey]);
```

---

### Phase 6: Testing (SCOUT-94)
**Goal**: Comprehensive testing and optimization

**Test Scenarios**:

1. **Happy Path**: Full event with all data
   - 30+ teams
   - All teams have OPR, game piece data, some breakdowns
   - Verify all sections render correctly

2. **Minimal Data**: New event with only 3 teams
   - Less than 5 teams (should show only available teams)
   - Less than 10 teams for boxplots
   - Verify graceful handling

3. **No Breakdowns**: Event with perfect reliability
   - All teams have 0 breakdowns
   - "None" should appear in breakdown column

4. **High Breakdowns**: Event with many failures
   - Multiple teams with 3+ breakdowns each
   - Verify breakdown string doesn't overflow table

5. **Print Output**:
   - Test Chrome print preview
   - Test Firefox print preview
   - Test Safari print preview
   - Verify page breaks
   - Test grayscale mode
   - Export as PDF and verify quality

**Playwright Test**:
```typescript
// tests/analytics/report.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Event Analytics Report', () => {
  test('should display all report sections', async ({ page }) => {
    await page.goto('/analytics/2024caoc/report');

    // Wait for data to load
    await expect(page.locator('h1')).toContainText('Event Analytics Report');

    // Verify sections exist
    await expect(page.locator('h2').filter({ hasText: 'Top 5 Teams Profiles' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Game Piece Scoring Distribution' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Top OPR Rankings' })).toBeVisible();

    // Verify radar charts (should be 5)
    const radarCharts = page.locator('.recharts-radar-chart');
    await expect(radarCharts).toHaveCount(5);

    // Verify boxplots (should be 8)
    const boxplots = page.locator('.game-piece-boxplot-section');
    await expect(boxplots).toHaveCount(8);

    // Verify OPR table
    const oprTable = page.locator('table');
    await expect(oprTable).toBeVisible();
  });

  test('should allow printing', async ({ page }) => {
    await page.goto('/analytics/2024caoc/report');

    const printButton = page.locator('button', { hasText: 'Print' });
    await expect(printButton).toBeVisible();

    // Note: Can't actually test print dialog, but can verify button exists
  });
});
```

**Edge Cases to Handle**:
```typescript
// Handle less than 5 teams
const top5Teams = allTeams
  .sort((a, b) => (b.opr || 0) - (a.opr || 0))
  .slice(0, Math.min(5, allTeams.length));

// Handle no breakdown data
const breakdownStr = breakdowns && breakdowns.breakdown_matches.length > 0
  ? breakdowns.breakdown_matches
      .map(m => `${formatMatchLevel(m.comp_level)}${m.match_number} (${m.breakdown_types.join(', ')})`)
      .join(', ')
  : 'None';

// Handle missing game piece data
if (!gamePieceData || gamePieceData.teams.length === 0) {
  return <div>No game piece data available for this event.</div>;
}
```

---

## API Endpoints (Already Available)

All required API endpoints already exist:

### 1. Team Statistics
**Endpoint**: `/api/analytics/event/[eventKey]`
**Returns**: `TeamStatistics[]`
**Fields**: `team_number`, `opr`, `dpr`, `ccwm`, `reliability_score`, `avg_auto_score`, `avg_teleop_score`, `avg_endgame_score`, `matches_scouted`

### 2. Game Piece Data
**Endpoint**: `/api/analytics/game-pieces/[eventKey]`
**Returns**: `{ teams: TeamData[] }`
**Fields per team**: `teamNumber`, `matches: TeamMatchData[]`
**Match data**: `matchNumber`, `coralL1`, `coralL2`, `coralL3`, `coralL4`, `algaeProcessor`, `algaeBarge`, `allCoral`, `allAlgae`

### 3. Breakdown Data
**Endpoint**: `/api/analytics/breakdowns/[eventKey]`
**Returns**: `{ teams: TeamBreakdownData[] }`
**Fields per team**: `team_number`, `total_breakdowns`, `breakdown_matches: BreakdownMatch[]`
**Breakdown match**: `team_number`, `match_number`, `comp_level`, `match_key`, `breakdown_types: string[]`

---

## File Structure

```
src/
├── app/
│   └── analytics/
│       └── [eventKey]/
│           ├── page.tsx (existing - add report button)
│           └── report/
│               ├── page.tsx (new - main report page)
│               └── report.css (new - print styles)
│
├── components/
│   └── analytics/
│       ├── GamePieceBoxplot.tsx (existing - reference)
│       ├── TeamComparison.tsx (existing - reference)
│       ├── OPRLeaderboard.tsx (existing - reference)
│       └── report/
│           ├── TeamRadarProfile.tsx (new)
│           ├── GamePieceBoxplotReport.tsx (new)
│           └── OPRRankingsWithBreakdowns.tsx (new)
│
└── tests/
    └── analytics/
        └── report.spec.ts (new - Playwright tests)
```

---

## Design Considerations

### Print Optimization
- **Page Size**: 8.5" x 11" (letter) or A4, portrait orientation
- **Margins**: 0.5" on all sides
- **Font Size**: Minimum 10pt for body text, 14pt+ for headings
- **Colors**: Grayscale-friendly (avoid red/green only distinctions)
- **Page Breaks**: Between major sections, never within charts
- **Charts**: Static rendering, no tooltips, no hover states

### Accessibility
- Ensure sufficient color contrast
- Use patterns in addition to color for distinctions
- Provide text alternatives for visual data
- Maintain logical reading order

### Performance
- Fetch all data in parallel
- Target < 3 seconds for report generation
- Lazy load chart libraries if needed
- Optimize chart rendering for print

---

## Success Criteria

✅ Report generates successfully with all sections
✅ Top 5 teams by OPR show individual radar charts
✅ All 8 game piece categories show boxplots with top 10 teams
✅ OPR table includes breakdown match details
✅ Print output is professional and clear
✅ Page breaks occur at logical locations
✅ All data is accurate and traceable to source
✅ Graceful handling of missing/incomplete data
✅ Works in Chrome, Firefox, and Safari
✅ PDF export looks professional
✅ Report generates in < 3 seconds

---

## Timeline Estimate

- **Phase 1** (SCOUT-89): 2-3 hours
- **Phase 2** (SCOUT-90): 2-3 hours
- **Phase 3** (SCOUT-91): 3-4 hours
- **Phase 4** (SCOUT-92): 2-3 hours
- **Phase 5** (SCOUT-93): 2-3 hours
- **Phase 6** (SCOUT-94): 3-4 hours

**Total**: 14-20 hours

---

## Dependencies

- Existing analytics components (reference only)
- Existing API endpoints (all available)
- Recharts library (already installed)
- Next.js 15 App Router (already in use)

**No new dependencies required!**

---

## Future Enhancements (Out of Scope)

- Export to Excel/CSV
- Custom report templates
- Scheduled report generation
- Email report delivery
- Real-time updates
- Interactive filtering on report page
- Multi-event comparison reports

---

## References

- [Linear Project](https://linear.app/gregadeaux/project/event-analytics-report-7898681e35a5)
- [SCOUT-89](https://linear.app/gregadeaux/issue/SCOUT-89) - Report Page Route
- [SCOUT-90](https://linear.app/gregadeaux/issue/SCOUT-90) - Radar Charts
- [SCOUT-91](https://linear.app/gregadeaux/issue/SCOUT-91) - Boxplots
- [SCOUT-92](https://linear.app/gregadeaux/issue/SCOUT-92) - OPR Table
- [SCOUT-93](https://linear.app/gregadeaux/issue/SCOUT-93) - Integration
- [SCOUT-94](https://linear.app/gregadeaux/issue/SCOUT-94) - Testing

---

**Last Updated**: 2025-11-11
**Status**: Planning Complete - Ready for Implementation
