# Admin Dashboard Quick Start Guide

## What's Working Now

### ✅ Fully Implemented
- **Dashboard Home** (`/admin`)
  - Statistics cards
  - Quick actions
  - Recent activity feed

- **Events Management** (`/admin/events`)
  - Full CRUD (Create, Read, Update, Delete)
  - Search and filtering
  - Pagination
  - Form validation

- **Teams Management** (`/admin/teams`)
  - Full CRUD
  - Search by number or name
  - Pagination
  - Form validation

### 🚧 Placeholder Pages (Ready for Implementation)
- Matches Management (`/admin/matches`)
- Scouters Management (`/admin/scouters`)
- Scouting Data (`/admin/scouting`)
- Seasons Configuration (`/admin/seasons`)

## Getting Started

### 1. Access the Admin Dashboard
```
http://localhost:3000/admin
```

### 2. Test Existing Features

#### Create an Event
1. Go to `/admin/events`
2. Click "Create Event"
3. Fill out the form
4. Submit

#### Add a Team
1. Go to `/admin/teams`
2. Click "Add Team"
3. Fill out the form (team_key auto-generates)
4. Submit

## File Organization Pattern

Every entity follows the same structure. Here's the pattern used for Events and Teams:

### Page Files
```
src/app/admin/[entity]/
├── page.tsx              # List view with table
├── new/page.tsx         # Create form
└── [id]/edit/page.tsx   # Edit form
```

### Component Files
```
src/components/admin/
└── [Entity]Form.tsx     # Reusable form component
```

### API Files
```
src/app/api/admin/[entity]/
├── route.ts             # GET (list) + POST (create)
└── [id]/route.ts        # GET (single) + PUT (update) + DELETE
```

## How to Implement a New Entity (Example: Matches)

### Step 1: Create the List Page
Copy from `src/app/admin/events/page.tsx` and adapt:

```tsx
// src/app/admin/matches/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MatchSchedule } from '@/types'; // Use existing type
import { Column, PaginationConfig } from '@/types/admin';
import { DataTable } from '@/components/admin/DataTable';
import { SearchBar } from '@/components/admin/SearchBar';
import { ActionButtons } from '@/components/admin/ActionButtons';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/admin/Toast';

export default function MatchesPage() {
  // Copy state management from EventsPage
  // Update API endpoint to /api/admin/matches
  // Define columns specific to MatchSchedule
  // Implement fetch, sort, search, delete handlers
}
```

### Step 2: Define Table Columns
```tsx
const columns: Column<MatchSchedule>[] = [
  {
    key: 'match_number',
    header: 'Match #',
    sortable: true,
  },
  {
    key: 'event_key',
    header: 'Event',
    sortable: true,
  },
  {
    key: 'comp_level',
    header: 'Type',
    render: (value) => value.toUpperCase(),
  },
  // Red alliance teams
  {
    key: 'red_1',
    header: 'Red Alliance',
    render: (value, row) => {
      const teams = [row.red_1, row.red_2, row.red_3].filter(Boolean);
      return teams.join(', ');
    },
  },
  // Blue alliance teams
  {
    key: 'blue_1',
    header: 'Blue Alliance',
    render: (value, row) => {
      const teams = [row.blue_1, row.blue_2, row.blue_3].filter(Boolean);
      return teams.join(', ');
    },
  },
  {
    key: 'match_id',
    header: 'Actions',
    render: (value) => (
      <ActionButtons
        onEdit={() => router.push(`/admin/matches/${value}/edit`)}
        onDelete={() => handleDelete(value)}
      />
    ),
  },
];
```

### Step 3: Create the Form Component
```tsx
// src/components/admin/MatchForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { MatchFormData, FormErrors } from '@/types/admin';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface MatchFormProps {
  initialData?: Partial<MatchFormData>;
  onSubmit: (data: MatchFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export function MatchForm({ initialData, onSubmit, onCancel, isEdit }: MatchFormProps) {
  // State for form data
  const [formData, setFormData] = useState<MatchFormData>({ /* defaults */ });

  // State for events dropdown
  const [events, setEvents] = useState<Event[]>([]);

  // Fetch events for dropdown
  useEffect(() => {
    fetchEvents();
  }, []);

  // Validation logic
  const validate = (): boolean => {
    // Validate required fields
    // Check no duplicate teams in same alliance
    // Return true if valid
  };

  // Render form with dropdowns and inputs
  return (
    <form onSubmit={handleSubmit}>
      {/* Event selector */}
      {/* Match number and type */}
      {/* Red alliance team inputs */}
      {/* Blue alliance team inputs */}
      {/* Submit/Cancel buttons */}
    </form>
  );
}
```

### Step 4: Create the API Routes

#### List and Create
```ts
// src/app/api/admin/matches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  // Parse query params (page, limit, sortBy, sortOrder, search)
  // Build Supabase query with filters
  // Return paginated response
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  // Validate required fields
  // Insert into match_schedule table
  // Return created record
}
```

#### Single Item Operations
```ts
// src/app/api/admin/matches/[id]/route.ts
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Fetch single match by match_id
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // Update match by match_id
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // Delete match by match_id
}
```

### Step 5: Create the New/Edit Pages
Copy from `src/app/admin/events/new/page.tsx` and adapt.

## Reusable Components Reference

### DataTable
```tsx
<DataTable
  columns={columns}           // Column definitions
  data={items}               // Array of data
  loading={loading}          // Boolean loading state
  pagination={pagination}    // { page, limit, total }
  onSort={handleSort}       // (key, direction) => void
  onPageChange={handlePageChange}  // (page) => void
  emptyMessage="No items"   // Empty state message
/>
```

### SearchBar
```tsx
<SearchBar
  onSearch={handleSearch}    // (query: string) => void
  placeholder="Search..."
  debounceMs={300}          // Optional, defaults to 300ms
/>
```

### Toast
```tsx
const { showToast } = useToast();

// Usage
showToast('success', 'Operation successful!');
showToast('error', 'Something went wrong');
showToast('info', 'Information message');
showToast('warning', 'Warning message');
```

### ActionButtons
```tsx
<ActionButtons
  onEdit={() => router.push(`/admin/items/${id}/edit`)}
  onDelete={() => handleDelete(id)}
  confirmDelete={true}      // Optional, defaults to true
  deleteMessage="Are you sure?"  // Optional custom message
/>
```

### FormModal
```tsx
<FormModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="lg"                 // sm | md | lg | xl
>
  {/* Form content */}
</FormModal>
```

## Common Patterns

### Fetching Data with Pagination
```tsx
const fetchItems = useCallback(async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      sortBy,
      sortOrder,
      ...(searchQuery && { search: searchQuery }),
    });

    const response = await fetch(`/api/admin/[entity]?${params}`);
    if (response.ok) {
      const data = await response.json();
      setItems(data.data);
      setPagination((prev) => ({ ...prev, total: data.pagination.total }));
    } else {
      showToast('error', 'Failed to fetch items');
    }
  } catch (error) {
    console.error('Error fetching items:', error);
    showToast('error', 'An error occurred');
  } finally {
    setLoading(false);
  }
}, [pagination.page, pagination.limit, sortBy, sortOrder, searchQuery]);
```

### Form Submission
```tsx
const handleSubmit = async (data: FormData) => {
  try {
    const response = await fetch('/api/admin/[entity]', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      showToast('success', 'Item created successfully');
      router.push('/admin/[entity]');
    } else {
      const error = await response.json();
      showToast('error', error.error || 'Failed to create item');
    }
  } catch (error) {
    console.error('Error creating item:', error);
    showToast('error', 'An error occurred');
  }
};
```

### Delete with Confirmation
```tsx
const handleDelete = async (id: string | number) => {
  try {
    const response = await fetch(`/api/admin/[entity]/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      showToast('success', 'Item deleted successfully');
      fetchItems(); // Refresh list
    } else {
      const error = await response.json();
      showToast('error', error.error || 'Failed to delete item');
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    showToast('error', 'An error occurred');
  }
};
```

## Type Definitions

### Adding Form Types
Add to `src/types/admin.ts`:

```typescript
export interface MatchFormData {
  event_key: string;
  match_key: string;
  comp_level: 'qm' | 'ef' | 'qf' | 'sf' | 'f';
  set_number?: number;
  match_number: number;
  red_1?: number;
  red_2?: number;
  red_3?: number;
  blue_1?: number;
  blue_2?: number;
  blue_3?: number;
  scheduled_time?: string;
}
```

## Database Access

### Supabase Query Examples
```typescript
// List with filters
const { data, error, count } = await supabase
  .from('table_name')
  .select('*', { count: 'exact' })
  .or('field1.ilike.%search%,field2.ilike.%search%')
  .order('field', { ascending: true })
  .range(offset, offset + limit - 1);

// Insert
const { data, error } = await supabase
  .from('table_name')
  .insert([{ /* data */ }])
  .select()
  .single();

// Update
const { data, error } = await supabase
  .from('table_name')
  .update({ /* data */ })
  .eq('id', id)
  .select()
  .single();

// Delete
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id);
```

## Testing Checklist

For each new entity implementation:

- [ ] List page loads and displays data
- [ ] Search functionality works
- [ ] Sorting works on all sortable columns
- [ ] Pagination works correctly
- [ ] Create form validates required fields
- [ ] Create form submits and redirects
- [ ] Edit form loads with existing data
- [ ] Edit form updates and redirects
- [ ] Delete prompts for confirmation
- [ ] Delete removes item and refreshes list
- [ ] Toast notifications appear for success/error
- [ ] Loading states display during API calls
- [ ] Empty state shows when no data
- [ ] Responsive design works on mobile

## Common Issues & Solutions

### Issue: Import errors for types
**Solution**: Make sure to import from the correct location:
```tsx
import { Event, Team, MatchSchedule } from '@/types';
import { Column, PaginationConfig } from '@/types/admin';
```

### Issue: Supabase queries failing
**Solution**: Check:
1. Environment variables are set
2. Table names match exactly (case-sensitive)
3. Supabase RLS policies allow access
4. Service role key is used in server routes

### Issue: Form not validating
**Solution**: Make sure validate() is called in handleSubmit and returns boolean

### Issue: Toast not showing
**Solution**: Ensure page is wrapped in ToastProvider (should be in admin layout)

## Next Steps

1. **Implement Matches Management** - Highest priority
2. **Create Scouters Table** - Required for scouters management
3. **Implement Scouters Management** - User registration
4. **Implement Scouting Data Viewer** - Most complex (JSONB handling)
5. **Implement Seasons Configuration** - Read-only viewer

## Need Help?

- Review existing implementations in `/app/admin/events/` and `/app/admin/teams/`
- Check type definitions in `/src/types/index.ts` and `/src/types/admin.ts`
- Refer to component documentation in `/src/components/admin/`
- See full documentation in `ADMIN_DASHBOARD_IMPLEMENTATION.md`

---

**Pro Tip**: When implementing a new entity, start by copying the Events implementation and do a find-replace for "event" → "your_entity". Then customize the columns and form fields.
