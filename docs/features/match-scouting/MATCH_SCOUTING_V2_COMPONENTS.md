# Match Scouting V2 Components

**Status**: Core components implemented and ready for integration
**Date**: 2025-11-12
**Location**: `/src/components/match-scouting-v2/`

## Overview

This document describes the period-specific layout components and control components for the FRC 2025 Reefscape match scouting interface. These components use a spatial, field-based approach where scouts tap directly on field representations to record scoring data.

## Architecture

```
match-scouting-v2/
├── field/
│   ├── ClickableRegion.tsx    (✅ Complete - reusable SVG button)
│   ├── FieldOverlay.tsx        (✅ Complete - field wrapper)
│   └── index.ts
├── periods/
│   ├── AutoPeriod.tsx          (✅ New)
│   ├── TeleopPeriod.tsx        (✅ New)
│   ├── EndgamePeriod.tsx       (✅ New)
│   └── index.ts                (✅ New)
└── controls/
    ├── PeriodTimer.tsx         (✅ Complete - timer component)
    ├── UndoButton.tsx          (✅ New)
    ├── QuickNotes.tsx          (✅ New)
    ├── SubmitButton.tsx        (✅ New)
    └── index.ts                (✅ New)
```

## Components

### Period Components

#### 1. AutoPeriod (`/src/components/match-scouting-v2/periods/AutoPeriod.tsx`)

**Purpose**: Autonomous period scoring interface (0-15 seconds)

**Features**:
- Reef coral scoring zones (L1-L4) in vertical stack
- Visual color coding: L1=green, L2=blue, L3=yellow, L4=red
- Missed counter on the right
- Mobility toggle button (left starting zone)
- Total coral scored summary

**Data Tracked** (from `autoPerformance`):
- `coral_scored_L1` through `coral_scored_L4`
- `coral_missed`
- `left_starting_zone` (boolean)

**Usage**:
```tsx
import { AutoPeriod } from '@/components/match-scouting-v2/periods';

<AutoPeriod />
```

**Interactions**:
- Tap scoring zone to increment
- Long-press (500ms) to decrement
- Tap mobility button to toggle

---

#### 2. TeleopPeriod (`/src/components/match-scouting-v2/periods/TeleopPeriod.tsx`)

**Purpose**: Teleoperated period scoring interface (15-135 seconds)

**Features**:
- Full field view with multiple scoring locations
- Center reef (L1-L4) for coral
- Left processor for algae
- Right barge for algae
- Top net for algae
- Coral stations on left/right sides (visual reference)
- Missed counters in bottom corners
- Bottom stats bar showing totals

**Data Tracked** (from `teleopPerformance`):
- `coral_scored_L1` through `coral_scored_L4`
- `algae_scored_processor`
- `algae_scored_barge`
- `coral_missed`
- `algae_missed`
- `cycles_completed`

**Usage**:
```tsx
import { TeleopPeriod } from '@/components/match-scouting-v2/periods';

<TeleopPeriod />
```

**Note**: Coordinates are approximate and will need refinement based on actual field image dimensions.

---

#### 3. EndgamePeriod (`/src/components/match-scouting-v2/periods/EndgamePeriod.tsx`)

**Purpose**: Endgame period interface (135-150 seconds)

**Features**:
- Centered layout (no field overlay)
- Cage climbing toggles (attempted/successful)
- Continue scoring section (processor, net, trap)
- Robot status toggles (broke, tipped over, was tipped)
- Status summary at bottom

**Data Tracked**:
- From `endgamePerformance`: `cage_climb_attempted`, `cage_climb_successful`, `endgame_points`
- From `teleopPerformance`: Continue algae scoring
- From overall state: `robotBroke`, `tippedOver`, `wasTipped`

**Usage**:
```tsx
import { EndgamePeriod } from '@/components/match-scouting-v2/periods';

<EndgamePeriod />
```

**Special Behavior**:
- Robot status toggles use `toggle('overall', field)` to affect overall match state
- Algae scoring continues to update teleop performance

---

### Control Components

#### 4. UndoButton (`/src/components/match-scouting-v2/controls/UndoButton.tsx`)

**Purpose**: Undo the last data entry action

**Features**:
- Circular button with undo icon
- Badge showing number of actions available to undo
- Disabled state when undo stack is empty
- 60px minimum touch target

**Usage**:
```tsx
import { UndoButton } from '@/components/match-scouting-v2/controls';

<UndoButton />
```

**Behavior**:
- Calls `undo()` from `useMatchScouting()`
- Disabled when `state.undoStack.length === 0`
- Shows count badge in red circle

---

#### 5. QuickNotes (`/src/components/match-scouting-v2/controls/QuickNotes.tsx`)

**Purpose**: Quickly add timestamped notes during match

**Features**:
- Expandable panel with toggle button
- Four quick action buttons: Tipped, Defended, Broke, Penalty
- Notes list with timestamps
- Remove button for each note
- Badge showing note count

**Usage**:
```tsx
import { QuickNotes } from '@/components/match-scouting-v2/controls';

<QuickNotes />
```

**Behavior**:
- Auto-generates timestamp `[HH:MM:SS]` for each note
- Stores notes in `state.quickNotes`
- Color-coded buttons for different event types

---

#### 6. SubmitButton (`/src/components/match-scouting-v2/controls/SubmitButton.tsx`)

**Purpose**: Submit scouting data with confirmation

**Features**:
- Large green button (70px min height)
- Confirmation modal with data review
- Match info summary
- Data totals preview
- Warning for robot issues
- Loading state during submission
- Disabled after submission

**Usage**:
```tsx
import { SubmitButton } from '@/components/match-scouting-v2/controls';

<SubmitButton onSubmit={async () => {
  // Custom submission logic
  await saveToDatabase();
}} />
```

**Props**:
- `onSubmit?: () => Promise<void>` - Optional custom submission handler
- `className?: string` - Additional CSS classes

**Confirmation Modal Shows**:
- Match key, team number, alliance color
- Total coral scored (auto + teleop)
- Total algae scored
- Mobility status
- Climb status
- Number of quick notes
- Robot issue warnings

---

## Context Integration

All components use the `useMatchScouting()` hook from `MatchScoutingContext`:

```tsx
import { useMatchScouting } from '@/contexts/MatchScoutingContext';

const {
  state,           // Current scouting data
  increment,       // Increment counter: (period, field)
  decrement,       // Decrement counter: (period, field)
  toggle,          // Toggle boolean: (period, field)
  addNote,         // Add quick note: (text)
  removeNote,      // Remove note: (index)
  undo,            // Undo last action
  submit,          // Submit data
  startMatch,      // Start match timer
  advancePeriod,   // Move to next period
  setPeriod,       // Jump to specific period
} = useMatchScouting();
```

## Touch Interaction Patterns

All clickable regions support:

1. **Tap** - Primary action (usually increment)
2. **Long Press** (500ms) - Secondary action (usually decrement)
3. **Haptic Feedback** - Vibration on supported devices
   - 30ms for tap
   - 50ms for long press

**Minimum Touch Target**: 60px for accessibility

## Field Coordinates

All period components use approximate field coordinates based on standard FRC field dimensions:

- **ViewBox**: `0 0 1755 805` (field dimensions in cm)
- **Center**: (877, 402)
- **Coordinates**: Will need refinement based on actual field imagery

**To Update Coordinates**:
1. Load field image in design tool
2. Measure scoring zone centers in pixels
3. Convert to viewBox coordinate system
4. Update component coordinate constants

## Styling

All components use:
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Dark mode** not currently implemented
- **Responsive** but optimized for tablet landscape (1024x768)

## Demo Page

A demo page is available at `/match-scouting-demo` that showcases all components:

```
src/app/match-scouting-demo/page.tsx
```

**Features**:
- Full match flow demonstration
- Manual period navigation
- All controls visible and functional
- Uses `MatchScoutingProvider` wrapper

**To View**:
```bash
npm run dev
# Navigate to http://localhost:3000/match-scouting-demo
```

## Next Steps

### Integration Tasks

1. **Field Images**
   - [ ] Add actual field images to `/public/field-images/`
   - [ ] Refine scoring zone coordinates
   - [ ] Test overlay alignment

2. **API Integration**
   - [ ] Create `/api/match-scouting/submit` endpoint
   - [ ] Connect `SubmitButton.onSubmit` to API
   - [ ] Add error handling and retry logic

3. **Offline Support**
   - [ ] Integrate with offline infrastructure
   - [ ] Add to submission queue when offline
   - [ ] Show sync status

4. **Match Setup**
   - [ ] Create pre-match setup screen
   - [ ] Select event, match, team, position
   - [ ] Load match schedule from TBA

5. **Testing**
   - [ ] Add Playwright E2E tests
   - [ ] Test touch interactions on tablets
   - [ ] Verify data accuracy

### Enhancements

- [ ] Add defense timer
- [ ] Add cycle counter with auto-increment
- [ ] Add pickup location tracking
- [ ] Add driver skill rating UI
- [ ] Add photo capture for notes
- [ ] Add real-time validation
- [ ] Add sound effects (optional)
- [ ] Add dark mode support

## Known Issues

1. **Field Image Placeholders**: Background images reference `/field-images/*.png` which don't exist yet
2. **Coordinate Approximation**: All scoring zone coordinates are approximate and need refinement
3. **Net Scoring**: Currently increments processor count (needs separate field in data model)
4. **Trap Scoring**: Currently increments endgame_points directly (needs proper field)

## File Summary

**New Files Created**:
```
✅ src/components/match-scouting-v2/periods/AutoPeriod.tsx
✅ src/components/match-scouting-v2/periods/TeleopPeriod.tsx
✅ src/components/match-scouting-v2/periods/EndgamePeriod.tsx
✅ src/components/match-scouting-v2/periods/index.ts
✅ src/components/match-scouting-v2/controls/UndoButton.tsx
✅ src/components/match-scouting-v2/controls/QuickNotes.tsx
✅ src/components/match-scouting-v2/controls/SubmitButton.tsx
✅ src/components/match-scouting-v2/controls/index.ts
✅ src/app/match-scouting-demo/page.tsx
✅ src/lib/utils.ts (added cn utility)
```

**Modified Files**:
```
✅ src/contexts/MatchScoutingContext.tsx (fixed type imports)
✅ src/components/match-scouting-v2/field/ClickableRegion.tsx (fixed useRef type)
```

**Compilation Status**: ✅ All files compile without errors

---

## Code Examples

### Full Integration Example

```tsx
'use client';

import { MatchScoutingProvider, useMatchScouting } from '@/contexts/MatchScoutingContext';
import { AutoPeriod, TeleopPeriod, EndgamePeriod } from '@/components/match-scouting-v2/periods';
import { PeriodTimer, UndoButton, QuickNotes, SubmitButton } from '@/components/match-scouting-v2/controls';

function MatchScoutingInterface() {
  const { state } = useMatchScouting();

  const renderPeriod = () => {
    switch (state.currentPeriod) {
      case 'auto': return <AutoPeriod />;
      case 'teleop': return <TeleopPeriod />;
      case 'endgame': return <EndgamePeriod />;
      default: return <div>Setup or Submitted</div>;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <PeriodTimer />
      <div className="flex-1 min-h-0">{renderPeriod()}</div>
      <div className="p-4 bg-white border-t flex items-center gap-4">
        <UndoButton />
        <QuickNotes />
        <SubmitButton onSubmit={async () => {
          await fetch('/api/match-scouting/submit', {
            method: 'POST',
            body: JSON.stringify(state),
          });
        }} />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <MatchScoutingProvider>
      <MatchScoutingInterface />
    </MatchScoutingProvider>
  );
}
```

---

**Last Updated**: 2025-11-12
**Next Review**: After field image integration
