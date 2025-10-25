# Pit Scouting

Pre-competition robot capabilities assessment system with dynamic forms and photo uploads.

## Overview

Pit scouting allows scouts to assess robot capabilities before competition begins. The system uses dynamic form rendering based on season-specific field definitions, stores data in JSONB columns for flexibility, and integrates robot photo uploads.

## Features

- ✅ **Dynamic Form Rendering** - Forms generated from field definitions
- ✅ **Multiple Field Types** - Counter, boolean, select, text, textarea, and more
- ✅ **Robot Photo Uploads** - Integrated image capture and storage
- ✅ **Client-Side Validation** - Immediate feedback for scouts
- ✅ **Server-Side Validation** - JSON Schema validation for data integrity
- ✅ **JSONB Storage** - Flexible storage for season-specific data
- ✅ **2025 Reefscape Support** - Complete configuration for current season

## Documentation

### [Implementation Guide](./implementation.md)
**Comprehensive technical guide covering:**
- Form architecture and rendering system
- Field definition structure
- Validation (client and server)
- JSONB data structure
- Integration with storage system

**Use when:**
- Understanding the pit scouting architecture
- Adding new field types
- Debugging validation issues
- Implementing similar dynamic forms

## Quick Links

### Components
- `/src/components/scouting/Counter.tsx` - Increment/decrement counter UI
- `/src/components/scouting/FormSection.tsx` - Collapsible form sections
- `/src/components/scouting/ImageUpload.tsx` - Robot photo upload
- `/src/components/scouting/FieldRenderer.tsx` - Dynamic field rendering

### Pages
- `/src/app/scouting/pit/[teamNumber]/page.tsx` - Pit scouting form (planned)

### Configuration
- `/src/lib/config/season-2025.ts` - Field definitions for 2025 Reefscape
- `/src/types/season-2025.ts` - TypeScript types for 2025 data

### Database
- `pit_scouting` table - Stores pit scouting submissions
- JSONB columns: `robot_capabilities`, `autonomous_capabilities`

## Data Structure

### Robot Capabilities (JSONB)
```typescript
interface RobotCapabilities2025 {
  schema_version: '2025.1';
  drivetrain_type: 'swerve' | 'mecanum' | 'tank' | 'other';
  can_climb: boolean;
  can_score_coral: boolean;
  can_process_algae: boolean;
  // ... season-specific fields
  notes?: string;
}
```

### Autonomous Capabilities (JSONB)
```typescript
interface AutonomousCapabilities2025 {
  schema_version: '2025.1';
  starting_position: 'reef_side' | 'processor_side' | 'center';
  leaves_starting_zone: boolean;
  // ... autonomous-specific fields
  notes?: string;
}
```

## Form Architecture

### Field Definitions
Forms are defined declaratively:

```typescript
const ROBOT_CAPABILITY_FIELDS: FieldDefinition[] = [
  {
    key: 'drivetrain_type',
    label: 'Drivetrain Type',
    type: 'select',
    options: ['swerve', 'mecanum', 'tank', 'other'],
    required: true,
    section: 'Robot Basics',
    helpText: 'Type of drivetrain the robot uses'
  },
  {
    key: 'can_climb',
    label: 'Can Climb',
    type: 'boolean',
    defaultValue: false,
    section: 'Capabilities'
  },
  // ... more fields
];
```

### Dynamic Rendering
The `FieldRenderer` component automatically renders fields based on their type:

```typescript
<FieldRenderer
  field={fieldDefinition}
  value={currentValue}
  onChange={handleChange}
  error={validationError}
/>
```

## Field Types

### Counter
**Use for**: Numeric counts (e.g., "Max cargo capacity")
```typescript
{ type: 'counter', min: 0, max: 10, defaultValue: 0 }
```

### Boolean
**Use for**: Yes/no questions (e.g., "Can climb?")
```typescript
{ type: 'boolean', defaultValue: false }
```

### Select
**Use for**: Single choice from options (e.g., "Drivetrain type")
```typescript
{ type: 'select', options: ['option1', 'option2', 'option3'] }
```

### Text
**Use for**: Short text input (e.g., "Team strategy")
```typescript
{ type: 'text', maxLength: 100 }
```

### Textarea
**Use for**: Long text input (e.g., "Notes")
```typescript
{ type: 'textarea', rows: 4, maxLength: 500 }
```

## Validation

### Client-Side Validation
- Required field checking
- Type validation (number, text, etc.)
- Range validation (min/max)
- Immediate user feedback

### Server-Side Validation
- JSON Schema validation
- Schema version checking
- Cross-field validation
- Database constraints

## Common Tasks

### Add a New Field
1. Add field definition to `/src/lib/config/season-2025.ts`
2. Update TypeScript interface in `/src/types/season-2025.ts`
3. Update JSON schema for validation
4. Field automatically appears in form

### Change Field Order
Update the `order` property in field definition:
```typescript
{ key: 'field_name', order: 10 }
```

### Group Fields into Sections
Use the `section` property:
```typescript
{ key: 'field_name', section: 'Robot Basics' }
```

### Add Field Help Text
Use the `helpText` property:
```typescript
{ key: 'field_name', helpText: 'Explanation for scouts' }
```

## Integration Points

### Storage Integration
Robot photos uploaded during pit scouting:
- Photos linked to team number
- Paths stored in `robot_photos` array
- Displayed in pit scouting summary

### TBA Integration
Team data pre-populated from The Blue Alliance:
- Team number
- Team name
- Location
- Rookie year

### Offline Support
Pit scouting data queued when offline:
- Submissions stored in IndexedDB
- Automatic sync when online
- Conflict resolution for multi-scout scenarios

## Season Transitions

When a new FRC game is announced:
1. Create new season config file (e.g., `season-2026.ts`)
2. Define new field definitions for 2026 game
3. Create TypeScript interfaces for 2026 data
4. Add JSON schemas for validation
5. Update forms to use 2026 config

**No database schema changes required!** The JSONB approach adapts automatically.

See `/CLAUDE.md` for complete season transition guide.

## Best Practices

### For Field Definitions
- Keep labels concise and clear
- Provide helpful tooltips
- Group related fields into sections
- Set reasonable min/max values
- Use enums for categorical data

### For Scouts
- Fill out all required fields
- Take clear robot photos (front, side, mechanisms)
- Use notes field for observations
- Submit even if incomplete (can edit later)

### For Admins
- Review field definitions before competition
- Test forms with mock data
- Train scouts on field meanings
- Set up offline sync before event

## Troubleshooting

### "Required field missing"
- Check field has `required: true` in definition
- Verify form validation is working
- Ensure default values are set

### "Validation failed"
- Check JSON schema matches TypeScript interface
- Verify schema version is correct
- Review server logs for validation errors

### "Photos not uploading"
- Check storage configuration
- Verify file size < 10 MB
- Ensure user has upload permissions

## Future Enhancements

- [ ] Match scouting integration (reference pit data)
- [ ] Pit scouting summary view
- [ ] Edit submitted pit scouting data
- [ ] Export pit scouting reports
- [ ] QR code scanning for team numbers
- [ ] Offline-first pit scouting mode

---

**Status**: ✅ Production Ready (100% Complete)
**Last Updated**: 2025-10-24
