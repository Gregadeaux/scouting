# Match Scouting V2 - Contextual Field-Based Interface

A spatial, no-scroll match scouting interface where buttons exist at field locations matching real game elements.

## 🎯 Design Philosophy

**Contextual Scouting**: Buttons are placed spatially where actions occur on the field, reducing cognitive load and improving accuracy. Inspired by Citrus Circuits (Team 1678) scouting methodology.

## 📁 Structure

```
src/components/match-scouting-v2/
├── MatchScoutingInterface.tsx    # Main container component
├── periods/
│   ├── AutoPeriod.tsx            # Autonomous period (0-15s)
│   ├── TeleopPeriod.tsx          # Teleoperated period (15-135s)
│   └── EndgamePeriod.tsx         # Endgame period (120-150s)
├── field/
│   ├── FieldOverlay.tsx          # SVG wrapper with field image
│   └── ClickableRegion.tsx       # Reusable button component
├── controls/
│   ├── PeriodTimer.tsx           # Match timer with auto-advance
│   ├── UndoButton.tsx            # Undo last action
│   ├── QuickNotes.tsx            # Fast event buttons
│   └── SubmitButton.tsx          # Submit with confirmation
└── modals/
    └── PreMatchSetup.tsx         # Match/team/scout setup
```

## 🚀 Usage

### Basic Setup

```tsx
import { MatchScoutingProvider } from '@/contexts/MatchScoutingContext';
import { MatchScoutingInterface } from '@/components/match-scouting-v2/MatchScoutingInterface';

export default function Page() {
  return (
    <MatchScoutingProvider>
      <MatchScoutingInterface />
    </MatchScoutingProvider>
  );
}
```

### Using the Hook

```tsx
import { useMatchScouting } from '@/contexts/MatchScoutingContext';

function MyComponent() {
  const { state, increment, decrement, toggle } = useMatchScouting();

  return (
    <div>
      <p>Coral L1: {state.autoPerformance.coral_scored_L1}</p>
      <button onClick={() => increment('auto', 'coral_scored_L1')}>+</button>
      <button onClick={() => decrement('auto', 'coral_scored_L1')}>-</button>
    </div>
  );
}
```

## 📱 Touch Interactions

- **Tap**: Increment counter
- **Long Press (500ms)**: Decrement counter
- **Haptic Feedback**: 30ms tap, 50ms long-press
- **Touch Targets**: Minimum 60px (exceeds iOS 44px guideline)

## 🎨 Period Layouts

### Auto Period (0-15s)
- Reef coral scoring (L1-L4) - vertical stack at center
- Mobility toggle (left starting zone)
- Missed counter

### Teleop Period (15-135s)
- Full field view with all scoring zones
- Reef (center), Processor (left), Barge (right), Net (top)
- Coral stations (left/right with L1-L4)
- Dropped counters

### Endgame Period (120-150s)
- Cage climb interface (shallow/deep)
- Trap scoring
- Robot status toggles (broke, tipped)

## 🔧 Key Features

### State Management
- **Context + useReducer** - No external dependencies
- **Undo Stack** - Time-travel debugging
- **Auto-advance Periods** - Based on match timer

### Touch-Friendly
- Large buttons (60px+)
- Visual feedback on press
- Haptic vibration (where supported)
- Landscape orientation preferred

### Offline Support Ready
- State persists in memory
- Can be integrated with IndexedDB
- QR code sync (future enhancement)

## 📋 Data Schema

Matches existing database schema:

```typescript
interface MatchScoutingState {
  // Match metadata
  matchKey: string;
  teamNumber: number;
  allianceColor: 'red' | 'blue';
  robotPosition: 1 | 2 | 3;

  // Performance data
  autoPerformance: AutoPerformance2025;
  teleopPerformance: TeleopPerformance2025;
  endgamePerformance: EndgamePerformance2025;

  // Overall match
  fouls: number;
  techFouls: number;
  cards: ('yellow' | 'red')[];
  defenseRating: number;
  driverSkillRating: number;
}
```

## 🎯 Next Steps

### Required Before Production

1. **Field Images** (`/public/field-images/`)
   - `reefscape-auto.png` - Top-down auto view
   - `reefscape-teleop.png` - Full field teleop view
   - `reefscape-endgame.png` (optional - simple layout)

2. **Coordinate Refinement**
   - Map actual field dimensions to SVG coordinates
   - Use official FIRST field drawings as reference
   - Test positioning on tablets

3. **API Integration**
   - Connect to `/api/match-scouting` endpoint
   - Add offline queue support
   - Handle submission errors

4. **Testing**
   - Tablet testing (iPad, Android)
   - Touch target verification
   - Period transition timing
   - Offline mode testing

### Optional Enhancements

- QR code data export/import
- Real-time sync indicators
- Camera integration for robot photos
- Voice notes support
- Multi-scout comparison view

## 🐛 Known Issues

- Screen orientation lock requires user permission on iOS
- Haptic feedback not supported on all devices
- Field background images are placeholders

## 📚 Resources

- [Official Field Drawings](https://firstfrc.blob.core.windows.net/frc2025/FieldAssets/2025FieldDrawings-FieldLayoutAndMarking.pdf)
- [Game Manual](https://firstfrc.blob.core.windows.net/frc2025/Manual/2025GameManual.pdf)
- [Citrus Circuits Scouting](https://www.citruscircuits.org/scouting.html)

## 🎨 Customization

### Adding Custom Scoring Zones

```tsx
<ClickableRegion
  shape="circle"
  coords={{ cx: 877, cy: 402, r: 50 }}
  label="Custom Zone"
  count={state.autoPerformance.custom_field}
  color="#10b981"
  onClick={() => increment('auto', 'custom_field')}
  onLongPress={() => decrement('auto', 'custom_field')}
/>
```

### Changing Colors

```tsx
// Period colors in PeriodTimer.tsx
const PERIOD_COLORS: Record<Period, string> = {
  auto: 'bg-blue-600',    // Change to your preference
  teleop: 'bg-green-600',
  endgame: 'bg-orange-600',
};
```

## 🤝 Contributing

When adding new features:
1. Follow existing component patterns
2. Maintain 60px minimum touch targets
3. Add haptic feedback where appropriate
4. Update this README
5. Test on actual tablets

---

**Status**: ✅ Core implementation complete, ready for field image integration and testing

**Version**: 2.0.0 (Contextual Design)

**Last Updated**: 2025-11-12
