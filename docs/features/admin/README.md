# FRC Scouting System - Admin Dashboard

## Quick Access

### 🚀 Access Points
- **Dashboard Home**: http://localhost:3000/admin
- **Events Management**: http://localhost:3000/admin/events
- **Teams Management**: http://localhost:3000/admin/teams
- **Component Showcase**: http://localhost:3000/admin/components-showcase

### 📚 Documentation
- **[Full Implementation Guide](./ADMIN_DASHBOARD_IMPLEMENTATION.md)** - Complete technical documentation
- **[Quick Start Guide](./ADMIN_QUICK_START.md)** - Developer guide for implementing new features
- **[Implementation Summary](./ADMIN_IMPLEMENTATION_SUMMARY.md)** - Project overview and file listing

## What's Included

### ✅ Fully Working Features
1. **Events Management** - Complete CRUD operations for FRC events
2. **Teams Management** - Complete CRUD operations for FRC teams
3. **Dashboard Home** - Statistics overview and quick actions
4. **Reusable Component Library** - 9 production-ready components

### 🚧 Placeholder Pages (Ready for Implementation)
- Matches Management
- Scouters Management
- Scouting Data Viewer
- Seasons Configuration

## Getting Started

### Prerequisites
```bash
# Ensure you have Node.js 18+ installed
node --version

# Install dependencies (if not already done)
npm install
```

### Environment Setup
Create or verify `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Run Development Server
```bash
npm run dev
```

Then visit: http://localhost:3000/admin

## File Structure

```
src/
├── app/admin/                     # Admin pages
│   ├── layout.tsx                # Layout with sidebar
│   ├── page.tsx                  # Dashboard home
│   ├── events/                   # Events CRUD (✅ Complete)
│   ├── teams/                    # Teams CRUD (✅ Complete)
│   ├── matches/                  # Matches (🚧 Placeholder)
│   ├── scouters/                 # Scouters (🚧 Placeholder)
│   ├── scouting/                 # Scouting data (🚧 Placeholder)
│   └── seasons/                  # Seasons (🚧 Placeholder)
├── app/api/admin/                # API routes
│   ├── dashboard/stats/          # Dashboard statistics
│   ├── events/                   # Events API (✅ Complete)
│   └── teams/                    # Teams API (✅ Complete)
├── components/admin/             # Reusable components
│   ├── ActionButtons.tsx
│   ├── DataTable.tsx
│   ├── EventForm.tsx
│   ├── FormModal.tsx
│   ├── LoadingSpinner.tsx
│   ├── SearchBar.tsx
│   ├── Sidebar.tsx
│   ├── StatusBadge.tsx
│   ├── TeamForm.tsx
│   └── Toast.tsx
└── types/
    └── admin.ts                  # Admin type definitions
```

## Component Library

### DataTable
Generic, sortable, paginated table component.

**Example:**
```tsx
import { DataTable } from '@/components/admin/DataTable';
import { Column } from '@/types/admin';

const columns: Column<MyType>[] = [
  { key: 'id', header: 'ID', sortable: true },
  { key: 'name', header: 'Name', sortable: true },
];

<DataTable
  columns={columns}
  data={items}
  loading={loading}
  pagination={pagination}
  onSort={handleSort}
  onPageChange={handlePageChange}
/>
```

### Toast Notifications
Context-based notification system.

**Example:**
```tsx
import { useToast } from '@/components/admin/Toast';

const { showToast } = useToast();

showToast('success', 'Operation successful!');
showToast('error', 'Something went wrong');
```

### SearchBar
Debounced search input component.

**Example:**
```tsx
import { SearchBar } from '@/components/admin/SearchBar';

<SearchBar
  onSearch={(query) => setSearchQuery(query)}
  placeholder="Search..."
/>
```

### Other Components
- **StatusBadge** - Colored status indicators
- **ActionButtons** - Edit/Delete with confirmation
- **FormModal** - Modal wrapper for forms
- **LoadingSpinner** - Loading indicator (3 sizes)

See the **Component Showcase** page at `/admin/components-showcase` for live examples.

## API Routes

### Pattern
All admin APIs follow RESTful conventions:
- `GET /api/admin/[entity]` - List with pagination
- `POST /api/admin/[entity]` - Create new
- `GET /api/admin/[entity]/[id]` - Get single
- `PUT /api/admin/[entity]/[id]` - Update
- `DELETE /api/admin/[entity]/[id]` - Delete

### Query Parameters
- `page` - Page number
- `limit` - Items per page
- `sortBy` - Column to sort
- `sortOrder` - 'asc' or 'desc'
- `search` - Search query

### Response Format
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

## Database Tables

### Required Tables
The following Supabase tables must exist:
- ✅ `teams` - Team information
- ✅ `events` - Event information
- ✅ `match_schedule` - Match data
- ✅ `match_scouting` - Scouting entries
- ✅ `pit_scouting` - Pit scouting
- ✅ `season_config` - Season configs
- ❌ `scouters` - Scout users (needs creation)

### Create Scouters Table
Run this SQL in Supabase:
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

CREATE INDEX idx_scouters_team ON scouters(team_affiliation);
CREATE INDEX idx_scouters_active ON scouters(active);
```

## Implementing New Features

### Step-by-Step Guide
1. **Read the Quick Start Guide**: See `ADMIN_QUICK_START.md`
2. **Copy an existing implementation**: Start with Events or Teams
3. **Update types**: Add to `src/types/admin.ts`
4. **Create pages**: List, New, Edit
5. **Create form component**: Reusable form
6. **Create API routes**: RESTful endpoints
7. **Test thoroughly**: All CRUD operations

### Example: Adding Matches
See detailed example in `ADMIN_QUICK_START.md`

## Development Workflow

### Adding a New Feature
```bash
# 1. Create branch
git checkout -b feature/matches-management

# 2. Implement pages and components
# - Copy from events/teams
# - Update types and forms
# - Create API routes

# 3. Test locally
npm run dev

# 4. Test all CRUD operations
# - Create new item
# - Edit existing item
# - Delete item
# - Search and sort

# 5. Commit and push
git add .
git commit -m "feat: add matches management"
git push
```

### Testing Checklist
- [ ] List page loads and displays data
- [ ] Search works correctly
- [ ] Sorting works on all columns
- [ ] Pagination works
- [ ] Create form validates and submits
- [ ] Edit form loads existing data
- [ ] Delete prompts for confirmation
- [ ] Toast notifications appear
- [ ] Loading states show during API calls
- [ ] Responsive design works on mobile

## Troubleshooting

### Common Issues

**Events/Teams not loading**
- Check Supabase connection
- Verify environment variables
- Check browser console for errors

**API errors**
- Verify Supabase service role key
- Check table names (case-sensitive)
- Review Supabase RLS policies

**TypeScript errors**
- Run `npm run build` to check
- Ensure types are imported correctly
- Check for missing properties

**Toast not appearing**
- Ensure page is wrapped in ToastProvider
- Check admin layout.tsx

## Production Deployment

### Build
```bash
npm run build
```

### Environment Variables
Set these in your production environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Security Recommendations
1. Add authentication
2. Implement role-based access control
3. Enable rate limiting
4. Add audit logging
5. Set up CSRF protection

## Performance

### Current Optimizations
- Pagination (20 items per page)
- Debounced search (300ms)
- Efficient Supabase queries
- React component optimization

### Future Optimizations
- Add React Query for caching
- Implement virtual scrolling
- Add code splitting
- Optimize images

## Browser Support
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS 14+, Android latest

## Contributing

### Code Style
- TypeScript strict mode
- Functional components only
- Hooks for state management
- Tailwind for styling
- Consistent naming conventions

### Component Guidelines
1. Always use TypeScript
2. Export interfaces/props
3. Add JSDoc comments for complex logic
4. Follow existing patterns
5. Update documentation

## Support

### Resources
- [Implementation Guide](./ADMIN_DASHBOARD_IMPLEMENTATION.md)
- [Quick Start Guide](./ADMIN_QUICK_START.md)
- [Component Showcase](/admin/components-showcase)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)

### Getting Help
1. Check the documentation files
2. Review existing implementations
3. Check the component showcase
4. Review type definitions in `/src/types/`

## Project Status

### Completion
- ✅ Core Features: 100% (Events & Teams)
- 🚧 Additional Features: 0% (4 entities pending)
- ✅ Documentation: 100%
- ✅ Component Library: 100%
- **Overall: 40% Complete**

### Next Steps
1. Implement Matches Management (High Priority)
2. Create Scouters table and management (High Priority)
3. Implement Scouting Data Viewer (Medium Priority)
4. Add Authentication (Medium Priority)
5. Implement Seasons Configuration (Low Priority)

## License
Part of the FRC Scouting System project.

---

**Created**: 2025-10-20
**Last Updated**: 2025-10-20
**Version**: 1.0
**Status**: Production Ready (Core Features)
