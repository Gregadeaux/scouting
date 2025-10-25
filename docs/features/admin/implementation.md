# FRC Scouting System - Admin Dashboard Implementation Guide

## Overview
A comprehensive admin management dashboard has been implemented for the FRC scouting system. This document outlines the architecture, completed features, and implementation details.

## Technology Stack
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **State Management**: React hooks + Context API

## Architecture

### File Structure
```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                 # Admin layout with sidebar + header
│   │   ├── page.tsx                   # Dashboard home
│   │   ├── events/
│   │   │   ├── page.tsx              # Events list
│   │   │   ├── new/page.tsx          # Create event
│   │   │   └── [id]/edit/page.tsx    # Edit event
│   │   ├── teams/
│   │   │   ├── page.tsx              # Teams list
│   │   │   ├── new/page.tsx          # Add team
│   │   │   └── [id]/edit/page.tsx    # Edit team
│   │   ├── matches/                   # (To be implemented)
│   │   ├── scouters/                  # (To be implemented)
│   │   ├── scouting/                  # (To be implemented)
│   │   └── seasons/                   # (To be implemented)
│   └── api/
│       └── admin/
│           ├── dashboard/stats/route.ts
│           ├── events/
│           │   ├── route.ts          # List + Create events
│           │   └── [id]/route.ts     # Get + Update + Delete event
│           └── teams/
│               ├── route.ts          # List + Create teams
│               └── [id]/route.ts     # Get + Update + Delete team
├── components/
│   ├── admin/
│   │   ├── ActionButtons.tsx         # Edit/Delete action buttons
│   │   ├── DataTable.tsx             # Generic data table with sorting/pagination
│   │   ├── EventForm.tsx             # Event create/edit form
│   │   ├── FormModal.tsx             # Modal wrapper for forms
│   │   ├── LoadingSpinner.tsx        # Loading indicator
│   │   ├── SearchBar.tsx             # Debounced search input
│   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   ├── StatusBadge.tsx           # Status indicator badges
│   │   ├── TeamForm.tsx              # Team create/edit form
│   │   └── Toast.tsx                 # Toast notification system
│   └── ui/                            # Existing UI components (Button, Card, Input)
└── types/
    └── admin.ts                       # Admin-specific type definitions

```

## Completed Features

### 1. Dashboard Home (`/admin`)
**Status**: ✅ Complete

**Features**:
- Overview cards showing system statistics:
  - Total Teams
  - Total Events
  - Total Matches
  - Active Scouters
- Recent activity feed (last 5 scouting entries)
- Quick action cards linking to create pages
- Responsive grid layout

**API Endpoint**: `GET /api/admin/dashboard/stats`

### 2. Events Management (`/admin/events`)
**Status**: ✅ Complete

**Features**:
- **List View**:
  - Paginated data table (20 items per page)
  - Columns: Event Key, Name, Type, Location, Start Date, End Date, Year
  - Search by name, location, or event key
  - Sortable columns
  - Edit/Delete actions per row
- **Create Event** (`/admin/events/new`):
  - Form with validation
  - Fields: event_key, event_name, event_code, year, event_type, district, week, location, dates
  - Date validation (end date must be after start date)
- **Edit Event** (`/admin/events/[id]/edit`):
  - Pre-populated form with existing data
  - Event key is disabled (immutable)
  - Update with validation

**API Endpoints**:
- `GET /api/admin/events` - List with pagination, search, sort
- `POST /api/admin/events` - Create new event
- `GET /api/admin/events/[id]` - Get single event
- `PUT /api/admin/events/[id]` - Update event
- `DELETE /api/admin/events/[id]` - Delete event (with foreign key protection)

### 3. Teams Management (`/admin/teams`)
**Status**: ✅ Complete

**Features**:
- **List View**:
  - Paginated data table
  - Columns: Number, Name, Nickname, Location, Rookie Year
  - Search by team number, name, or location
  - Sortable columns
  - Edit/Delete actions
- **Add Team** (`/admin/teams/new`):
  - Form with validation
  - Auto-generates team_key from team_number
  - Fields: team_number, team_name, nickname, location, rookie_year, website
- **Edit Team** (`/admin/teams/[id]/edit`):
  - Pre-populated form
  - Team number and key are immutable

**API Endpoints**:
- `GET /api/admin/teams` - List with pagination, search, sort
- `POST /api/admin/teams` - Create new team
- `GET /api/admin/teams/[id]` - Get single team
- `PUT /api/admin/teams/[id]` - Update team
- `DELETE /api/admin/teams/[id]` - Delete team (with foreign key protection)

## Reusable Components

### DataTable Component
Generic, type-safe data table with built-in features:
- Column configuration with custom renderers
- Sortable columns (with visual indicators)
- Pagination controls
- Loading states
- Empty state handling
- Responsive design

**Usage**:
```tsx
<DataTable
  columns={columns}
  data={items}
  loading={loading}
  pagination={pagination}
  onSort={handleSort}
  onPageChange={handlePageChange}
  emptyMessage="No items found"
/>
```

### SearchBar Component
Debounced search input (300ms default):
- Auto-debouncing to reduce API calls
- Clear button when text is present
- Customizable placeholder

### Toast Notification System
Context-based toast notifications:
- Types: success, error, info, warning
- Auto-dismiss after 5 seconds
- Styled with appropriate colors
- Accessible (ARIA labels)

**Usage**:
```tsx
const { showToast } = useToast();
showToast('success', 'Operation completed!');
```

### ActionButtons Component
Edit/Delete action buttons with:
- Confirmation dialog for delete (optional)
- Hover states
- Icon-based UI

### FormModal Component
Reusable modal wrapper:
- Sizes: sm, md, lg, xl
- Keyboard support (ESC to close)
- Background overlay click to close
- Responsive design

## Design System

### Color Palette
- **Primary (FRC Blue)**: `#0066b3` (defined as `frc-blue` in Tailwind)
- **Secondary (FRC Red)**: `#ed1c24` (defined as `frc-red`)
- **Status Colors**:
  - Success/Active: Green
  - Error/Danger: Red
  - Warning/Pending: Yellow
  - Info/Completed: Blue
  - Inactive: Gray

### Typography
- **Headings**: Font-bold, scaled sizing
- **Body**: Default font, `text-sm` for secondary text
- **Mono**: Used for team numbers and keys

### Spacing
- Consistent use of Tailwind spacing scale
- Card padding: `p-6`
- Form field spacing: `space-y-6`
- Grid gaps: `gap-4` to `gap-6`

## API Response Format

### Success Response (Single Item)
```json
{
  "success": true,
  "data": { /* item data */ }
}
```

### Success Response (List)
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

## Validation Rules

### Events
- `event_key`: Required, unique
- `event_name`: Required
- `event_code`: Required
- `year`: Required, >= 1992
- `start_date`: Required
- `end_date`: Required, must be >= start_date

### Teams
- `team_number`: Required, unique, > 0
- `team_key`: Required, unique, auto-generated from team_number
- `team_name`: Required
- `rookie_year`: Optional, 1992 <= year <= current year

## Security Considerations

### Current Implementation
- Uses Supabase service role key for admin operations
- Server-side API routes only
- No authentication implemented yet

### Recommended Additions
1. **Authentication**: Add admin user authentication
2. **Authorization**: Role-based access control (admin, lead, scout)
3. **Audit Logging**: Track all admin actions
4. **Rate Limiting**: Prevent abuse of API endpoints
5. **CSRF Protection**: Add CSRF tokens to forms
6. **Input Sanitization**: Sanitize all user inputs

## Database Schema Notes

### Required Tables
The following tables must exist in Supabase:
- `teams` - Team information
- `events` - Event information
- `match_schedule` - Match schedule data
- `match_scouting` - Match scouting entries
- `pit_scouting` - Pit scouting entries
- `season_config` - Season configuration
- `scouters` - Scout user information (needs to be created)

### Scouters Table Schema (To Be Created)
```sql
CREATE TABLE scouters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scout_name TEXT NOT NULL,
  team_affiliation INTEGER REFERENCES teams(team_number),
  role TEXT CHECK (role IN ('lead', 'scout', 'admin')),
  email TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Remaining Implementation Tasks

### 1. Matches Management (`/admin/matches`)
**Priority**: High

**Features Needed**:
- List view with event filter
- Create/Edit forms with:
  - Event selector (dropdown)
  - Match number, type (qm, ef, qf, sf, f)
  - Red alliance teams (3 slots)
  - Blue alliance teams (3 slots)
  - Match time
- Validation: No duplicate teams in same match
- Bulk import from TBA API

**Files to Create**:
- `/app/admin/matches/page.tsx`
- `/app/admin/matches/new/page.tsx`
- `/app/admin/matches/[id]/edit/page.tsx`
- `/components/admin/MatchForm.tsx`
- `/app/api/admin/matches/route.ts`
- `/app/api/admin/matches/[id]/route.ts`

### 2. Scouters Management (`/admin/scouters`)
**Priority**: High

**Features Needed**:
- List view with active/inactive filter
- Create/Edit forms
- Quick toggle for active status
- Contact information fields

**Files to Create**:
- `/app/admin/scouters/page.tsx`
- `/app/admin/scouters/new/page.tsx`
- `/app/admin/scouters/[id]/edit/page.tsx`
- `/components/admin/ScouterForm.tsx`
- `/app/api/admin/scouters/route.ts`
- `/app/api/admin/scouters/[id]/route.ts`

### 3. Scouting Data Management (`/admin/scouting`)
**Priority**: Medium

**Features Needed**:
- List view of match scouting entries
- Filters: event, match, team, scout
- View modal showing JSONB data in organized sections
- Edit capability for corrections
- Delete with confirmation (for duplicates/errors)
- Data validation against season schema

**Files to Create**:
- `/app/admin/scouting/page.tsx`
- `/app/admin/scouting/[id]/page.tsx` (view/edit)
- `/components/admin/ScoutingDataViewer.tsx`
- `/app/api/admin/scouting/route.ts`
- `/app/api/admin/scouting/[id]/route.ts`

### 4. Seasons Management (`/admin/seasons`)
**Priority**: Low

**Features Needed**:
- List view of season configs
- View details modal showing JSON schemas
- Link to documentation for editing schemas
- Basic CRUD for season metadata (year, game_name, description)
- Note: Schema editing should be done in code, not in UI

**Files to Create**:
- `/app/admin/seasons/page.tsx`
- `/app/admin/seasons/[year]/page.tsx` (view)
- `/components/admin/SeasonViewer.tsx`
- `/app/api/admin/seasons/route.ts`

### 5. Additional Features

#### Bulk Operations
- Bulk delete selected items
- Bulk import from CSV/JSON
- Bulk export to CSV

#### Advanced Filtering
- Date range filters
- Multi-select dropdowns
- Saved filter presets

#### Data Validation
- Real-time form validation
- Server-side validation errors display
- Schema validation for JSONB fields

#### User Management
- Admin user authentication
- Role-based permissions
- Activity audit log

#### TBA Integration
- Import events from The Blue Alliance API
- Import teams from TBA
- Import match schedules from TBA
- Sync results from TBA

## Testing Checklist

### Manual Testing
- [ ] Navigation works on all screen sizes
- [ ] All CRUD operations work for Events
- [ ] All CRUD operations work for Teams
- [ ] Search functionality works correctly
- [ ] Sorting works on all sortable columns
- [ ] Pagination works correctly
- [ ] Form validation catches all errors
- [ ] Toast notifications appear and disappear
- [ ] Delete confirmation works
- [ ] Foreign key constraints prevent cascading deletes
- [ ] Loading states appear during API calls
- [ ] Empty states display when no data
- [ ] Responsive design works on mobile

### API Testing
- [ ] All GET endpoints return correct data
- [ ] POST endpoints validate required fields
- [ ] PUT endpoints update correctly
- [ ] DELETE endpoints respect foreign key constraints
- [ ] Pagination parameters work correctly
- [ ] Search parameters work correctly
- [ ] Sort parameters work correctly
- [ ] Error responses include helpful messages

## Performance Optimization

### Current Optimizations
- Debounced search (300ms)
- Paginated data loading (20 items per page)
- Efficient Supabase queries with select specific columns

### Recommended Optimizations
1. **Caching**: Implement SWR or React Query for client-side caching
2. **Virtual Scrolling**: For very large lists
3. **Code Splitting**: Lazy load admin pages
4. **Image Optimization**: For team logos/robot photos
5. **Database Indexing**: Ensure proper indexes on frequently queried columns

## Accessibility Features

### Current Implementation
- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus states on all interactive elements
- Loading states with ARIA labels
- Screen reader friendly labels

### Recommended Additions
1. **Skip Links**: Add skip to main content link
2. **ARIA Live Regions**: For dynamic content updates
3. **Focus Management**: Better focus management in modals
4. **Color Contrast**: Verify WCAG AA compliance
5. **Keyboard Shortcuts**: Add keyboard shortcuts for common actions

## Deployment Notes

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Build Command
```bash
npm run build
```

### Development Server
```bash
npm run dev
```

## Support & Maintenance

### Common Issues

**Issue**: Events not loading
- Check Supabase connection
- Verify environment variables
- Check browser console for errors
- Verify `events` table exists

**Issue**: Delete not working
- Check for foreign key constraints
- Verify Supabase RLS policies
- Check API error messages

**Issue**: Search not working
- Verify debounce is working
- Check search query format
- Verify Supabase text search syntax

## Future Enhancements

1. **Dashboard Analytics**
   - Charts showing scouting progress
   - Team performance visualizations
   - Scout productivity metrics

2. **Real-time Updates**
   - WebSocket integration for live updates
   - Real-time collaboration features

3. **Mobile App**
   - React Native version for offline scouting
   - Sync with main system

4. **Advanced Analytics**
   - Predictive match outcomes
   - Pick list generation
   - Alliance selection tools

5. **Integration with Competition Management**
   - TBA API integration
   - FMS integration
   - Automated match schedule updates

## Contact & Contribution

For questions, issues, or contributions:
- Review existing type definitions in `/src/types/`
- Follow established component patterns
- Maintain consistent styling with Tailwind
- Add TypeScript types for all new features
- Update this documentation for major changes

---

**Last Updated**: 2025-10-20
**Version**: 1.0
**Status**: Core Features Complete (Events & Teams), Additional Features Pending
