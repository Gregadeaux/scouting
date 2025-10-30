# JSONB Data Display Components

Reusable React components for displaying JSONB scouting data in human-readable format with proper labels, grouping, and interaction features.

## Components

### `JSONBDataDisplay`

Main component for displaying JSONB data with section grouping and collapsible UI.

#### Props

```typescript
interface JSONBDataDisplayProps {
  data: Record<string, any>;           // JSONB data object to display
  seasonConfig: {                      // Season configuration with field definitions
    autoFields?: FieldDefinition[];
    teleopFields?: FieldDefinition[];
    endgameFields?: FieldDefinition[];
  };
  sections?: string[];                 // Optional: Filter to specific sections
  compact?: boolean;                   // Compact mode for dense display (default: false)
  collapsible?: boolean;               // Allow sections to collapse (default: true)
  showCopy?: boolean;                  // Show copy-to-clipboard button (default: true)
  title?: string;                      // Optional title for the section
}
```

#### Usage Example

```tsx
import { JSONBDataDisplay } from '@/components/scouting';
import { REEFSCAPE_CONFIG } from '@/lib/config/season-2025';

function MatchDataView({ matchScouting }) {
  return (
    <div>
      <JSONBDataDisplay
        data={matchScouting.auto_performance}
        seasonConfig={REEFSCAPE_CONFIG}
        title="Autonomous Performance"
        compact={false}
        collapsible={true}
        showCopy={true}
      />
    </div>
  );
}
```

#### Features

- Automatically detects period type from schema_version and data structure
- Groups fields by section (defined in field definitions)
- Displays human-readable labels instead of raw JSONB keys
- Converts enum values to readable text
- Collapsible sections with expand/collapse functionality
- Copy-to-clipboard for entire data object
- Responsive grid layouts (adapts to screen size)
- Dark mode support
- Handles missing/null values gracefully

#### Layout Modes

**Standard Mode** (`compact={false}`):
- 2-column grid on desktop, 1-column on mobile
- More spacious layout with clear field labels
- Shows help text tooltips on hover
- Good for detailed review

**Compact Mode** (`compact={true}`):
- 4-column grid on desktop, 2-column on mobile
- Maximizes information density
- Minimal spacing between fields
- Perfect for at-a-glance viewing or dashboards

---

### `JSONBDataDisplayInline`

Simplified component for inline display without section grouping.

#### Props

```typescript
interface JSONBDataDisplayInlineProps {
  data: Record<string, any>;
  seasonConfig: { ... };
  showCopy?: boolean;
}
```

#### Usage Example

```tsx
import { JSONBDataDisplayInline } from '@/components/scouting';
import { REEFSCAPE_CONFIG } from '@/lib/config/season-2025';

function QuickMatchSummary({ autoPerformance }) {
  return (
    <JSONBDataDisplayInline
      data={autoPerformance}
      seasonConfig={REEFSCAPE_CONFIG}
      showCopy={false}
    />
  );
}
```

---

### `FieldDisplay`

Individual field renderer with type-specific formatting.

#### Props

```typescript
interface FieldDisplayProps {
  field: FieldDefinition;  // Field definition from season config
  value: any;              // The field value
  compact?: boolean;       // Compact display mode
}
```

#### Supported Field Types

- **`counter`**: Displays as number with optional range indicator
- **`number`**: Displays as formatted number
- **`boolean`**: Displays as checkmark (✓) or X with color
- **`select`**: Displays as colored badge with enum label
- **`rating`**: Displays as 1-5 star rating
- **`text`/`textarea`**: Displays as text with truncation if long
- **`timer`**: Displays as MM:SS format

#### Usage Example

```tsx
import { FieldDisplay } from '@/components/scouting';

function CustomField({ fieldDef, value }) {
  return (
    <FieldDisplay
      field={fieldDef}
      value={value}
      compact={false}
    />
  );
}
```

---

### `FieldDisplayCompact`

Minimalist version of FieldDisplay for ultra-dense layouts.

- Omits labels in some cases
- Uses icons for booleans without text
- Truncates long text aggressively
- Perfect for grid cells

---

## Architecture

### How It Works

1. **Schema Detection**: Component reads `schema_version` from JSONB data
2. **Period Identification**: Analyzes data structure to determine if auto/teleop/endgame
3. **Field Mapping**: Looks up field definitions from season config
4. **Grouping**: Organizes fields by section
5. **Rendering**: Uses type-specific renderers for each field

### Data Flow

```
JSONB Data Object
    ↓
JSONBDataDisplay
    ↓
Field Mapping (key → FieldDefinition)
    ↓
Section Grouping
    ↓
FieldDisplay (for each field)
    ↓
Type-specific Renderer
```

---

## Field Definitions

Field definitions come from season configuration files:

```typescript
// From /src/lib/config/season-2025.ts
export const AUTO_FIELDS_2025: FieldDefinition[] = [
  {
    key: 'left_starting_zone',
    label: 'Left Starting Zone?',
    type: 'boolean',
    defaultValue: false,
    required: true,
    section: 'Mobility',
    order: 1,
    helpText: 'Did the robot completely leave the starting zone?',
  },
  // ... more fields
];
```

### FieldDefinition Interface

```typescript
interface FieldDefinition {
  key: string;                          // JSONB property key
  label: string;                        // Human-readable label
  type: FieldType;                      // Field type (counter, boolean, etc.)
  defaultValue: unknown;                // Default value for forms
  required?: boolean;                   // Is field required?
  min?: number;                         // Min value (for numbers)
  max?: number;                         // Max value (for numbers)
  options?: Array<{                     // Options for select fields
    value: string | number;
    label: string;
  }>;
  helpText?: string;                    // Tooltip help text
  section?: string;                     // Section grouping
  order?: number;                       // Display order
}
```

---

## Styling

### Tailwind Classes Used

- **Layout**: `grid`, `grid-cols-*`, `gap-*`, `space-y-*`
- **Colors**: `text-gray-*`, `bg-gray-*`, `dark:*` variants
- **Borders**: `border`, `rounded-lg`, `border-gray-*`
- **Interactive**: `hover:*`, `cursor-pointer`, `transition-*`
- **Typography**: `font-medium`, `text-sm`, `text-xs`, `truncate`

### Dark Mode Support

All components support dark mode via Tailwind's `dark:` variant:

```tsx
className="text-gray-900 dark:text-gray-100"
className="bg-white dark:bg-gray-800"
className="border-gray-200 dark:border-gray-700"
```

---

## Responsive Design

### Breakpoints

- **Mobile** (`< 768px`): Single column or 2-column grid
- **Tablet** (`768px - 1024px`): 2-column or 3-column grid
- **Desktop** (`> 1024px`): 3-column or 4-column grid

### Example Grid Configuration

```tsx
// Standard mode
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// Compact mode
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1">
```

---

## Examples

### Example 1: Match Scouting Dashboard

```tsx
import { JSONBDataDisplay } from '@/components/scouting';
import { REEFSCAPE_CONFIG } from '@/lib/config/season-2025';

function MatchScoutingDashboard({ match }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <CardTitle>Auto</CardTitle>
        <JSONBDataDisplay
          data={match.auto_performance}
          seasonConfig={REEFSCAPE_CONFIG}
          compact={true}
          collapsible={false}
        />
      </Card>

      <Card>
        <CardTitle>Teleop</CardTitle>
        <JSONBDataDisplay
          data={match.teleop_performance}
          seasonConfig={REEFSCAPE_CONFIG}
          compact={true}
          collapsible={false}
        />
      </Card>

      <Card>
        <CardTitle>Endgame</CardTitle>
        <JSONBDataDisplay
          data={match.endgame_performance}
          seasonConfig={REEFSCAPE_CONFIG}
          compact={true}
          collapsible={false}
        />
      </Card>
    </div>
  );
}
```

### Example 2: Team Detail Page

```tsx
import { JSONBDataDisplay } from '@/components/scouting';
import { REEFSCAPE_CONFIG } from '@/lib/config/season-2025';

function TeamDetailPage({ team, matches }) {
  return (
    <div className="space-y-6">
      {matches.map((match) => (
        <Card key={match.id}>
          <CardHeader>
            <CardTitle>Match {match.match_number}</CardTitle>
          </CardHeader>
          <CardContent>
            <JSONBDataDisplay
              data={match.auto_performance}
              seasonConfig={REEFSCAPE_CONFIG}
              title="Autonomous"
              compact={false}
              collapsible={true}
            />

            <JSONBDataDisplay
              data={match.teleop_performance}
              seasonConfig={REEFSCAPE_CONFIG}
              title="Teleoperated"
              compact={false}
              collapsible={true}
            />

            <JSONBDataDisplay
              data={match.endgame_performance}
              seasonConfig={REEFSCAPE_CONFIG}
              title="Endgame"
              compact={false}
              collapsible={true}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Example 3: Section Filtering

```tsx
// Only show scoring-related sections
<JSONBDataDisplay
  data={teleopPerformance}
  seasonConfig={REEFSCAPE_CONFIG}
  sections={['Coral Scoring', 'Algae Scoring']}
  compact={true}
/>
```

---

## Testing

### Demo Page

Visit `/admin/scouting-data-demo` to see all component variations:

- Standard vs Compact layouts
- Auto/Teleop/Endgame periods
- Inline display
- Section filtering
- Three-period side-by-side comparison

### Manual Testing Checklist

- [ ] All field types render correctly
- [ ] Boolean fields show checkmarks/X
- [ ] Select fields show human-readable labels
- [ ] Numbers display with proper formatting
- [ ] Collapsible sections expand/collapse smoothly
- [ ] Copy-to-clipboard works
- [ ] Dark mode works
- [ ] Responsive on mobile
- [ ] Help tooltips appear on hover
- [ ] Missing/null values handled gracefully

---

## Future Enhancements

### Potential Improvements

1. **Filtering**: Add search/filter within displayed data
2. **Sorting**: Allow sorting fields by value, name, or custom order
3. **Export**: Add export to CSV or Excel functionality
4. **Comparison**: Side-by-side comparison of multiple matches
5. **Highlighting**: Highlight exceptional values (high/low)
6. **Animations**: Smooth transitions when expanding/collapsing
7. **Print**: Print-optimized styling
8. **Accessibility**: Enhanced keyboard navigation and screen reader support

### Season Transition

When adding a new season (e.g., 2026):

1. Create field definitions in `/src/lib/config/season-2026.ts`
2. Update `/src/types/season-2026.ts` with interfaces
3. No changes needed to these display components!

The component automatically detects season from `schema_version` and uses the appropriate field definitions.

---

## Files

```
src/components/scouting/
├── JSONBDataDisplay.tsx      # Main display component
├── FieldDisplay.tsx           # Individual field renderer
├── index.ts                   # Barrel exports
└── README.md                  # This file

src/app/admin/scouting-data-demo/
└── page.tsx                   # Demo/test page

tests/
└── scouting-data-display.spec.ts  # E2E tests (Playwright)
```

---

## Dependencies

- **React**: Core framework
- **lucide-react**: Icons (Check, X, Copy, ChevronDown, Info)
- **Tailwind CSS**: Styling
- **Season Config**: Field definitions from `/src/lib/config/season-YYYY.ts`
- **Type Definitions**: Interfaces from `/src/types/`

---

## Contributing

When adding new field types:

1. Add the type to `FieldType` in `/src/lib/config/season-2025.ts`
2. Implement renderer in `FieldDisplay.tsx` (in the switch statement)
3. Add compact version in `FieldDisplayCompact.tsx`
4. Update this README with examples
5. Test with sample data on demo page

---

## License

Part of the FRC Scouting System. See main project README for license information.
