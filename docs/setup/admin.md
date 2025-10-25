# Admin Flow Setup Guide

## Overview

The admin flow has been successfully implemented for the FRC Scouting System. This document outlines the components and setup required for the admin functionality.

## Features Implemented

### 1. **Admin Authentication Flow**
- When users with 'admin' role sign in, they are automatically redirected to `/admin`
- Regular users are redirected to `/dashboard`
- Non-admin users attempting to access admin routes are redirected to `/unauthorized`

### 2. **Admin Panel Layout**
- Professional admin panel at `/admin` with sidebar navigation
- Sections include: Dashboard, Events, Teams, **Users** (new), Matches, Scouters, Scouting Data, and Seasons
- Dark mode support throughout

### 3. **User Management Interface** (`/admin/users`)
Complete user management system with:

#### Display Features:
- Comprehensive table showing all users
- Columns: Email, Full Name, Role, Team Assignment, Status, Created Date, Actions
- Pagination support for large user lists
- Search functionality by email/name
- Filter by role (Admin, Mentor, Scouter) or team

#### Management Features:
- **Role Management**: Change user roles between admin, mentor, and scouter
- **Team Assignment**: Assign or unassign users to teams
- **Delete Users**: Remove users with confirmation dialog
- **Status Management**: Activate/deactivate user accounts
- **Bulk Operations**: Ready for bulk actions implementation

### 4. **API Routes Created**

#### `GET /api/admin/users`
- Lists all users with team information
- Supports pagination, search, and filtering
- Admin-only access

#### `PATCH /api/admin/users/[id]`
- Updates user role, team assignment, or status
- Prevents self-modification
- Creates audit log entries

#### `DELETE /api/admin/users/[id]`
- Deletes user from system
- Prevents self-deletion
- Creates audit log entries

### 5. **Security Implementation**
- Role verification on both frontend and backend
- Middleware for route protection (basic implementation)
- Admin operations use service role client for elevated permissions
- All destructive actions require confirmation
- Audit logging for all admin actions

## Files Created/Modified

### New Files Created:
1. `/src/middleware.ts` - Route protection middleware
2. `/src/app/admin/users/page.tsx` - User management interface
3. `/src/app/admin/users/layout.tsx` - Admin-only layout wrapper
4. `/src/app/api/admin/users/route.ts` - User list API
5. `/src/app/api/admin/users/[id]/route.ts` - User update/delete API
6. `/src/components/ui/ConfirmDialog.tsx` - Confirmation dialog component
7. `/src/components/ui/Select.tsx` - Select dropdown component
8. `/src/app/unauthorized/page.tsx` - Unauthorized access page
9. `/src/app/dashboard/page.tsx` - Regular user dashboard
10. `/src/app/auth/logout/route.ts` - Logout route handler

### Modified Files:
1. `/src/contexts/AuthContext.tsx` - Added admin redirect logic
2. `/src/components/admin/Sidebar.tsx` - Added Users navigation item
3. `/src/lib/supabase/server.ts` - Updated for cookie-based auth
4. `/src/app/api/admin/teams/route.ts` - Fixed async client usage

## Database Requirements

Ensure these tables exist in your Supabase database:

```sql
-- User profiles table (should already exist)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    display_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'scouter',
    primary_team_number INTEGER REFERENCES teams(team_number),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table (for team associations)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL REFERENCES teams(team_number) ON DELETE CASCADE,
    team_role user_role NOT NULL DEFAULT 'scouter',
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table (for tracking admin actions)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    new_values JSONB,
    old_values JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Environment Variables Required

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required for admin operations
```

## Testing the Admin Flow

1. **Create an Admin User**:
   ```sql
   -- In Supabase SQL editor
   UPDATE user_profiles
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```

2. **Sign In**:
   - Navigate to `/auth/login`
   - Sign in with admin credentials
   - You should be redirected to `/admin`

3. **Access User Management**:
   - Click "Users" in the sidebar
   - You should see the user management interface

4. **Test Features**:
   - Search for users
   - Filter by role or team
   - Edit a user's role or team
   - Try to delete a test user (with confirmation)

## Security Notes

1. **Service Role Key**: The `SUPABASE_SERVICE_ROLE_KEY` is required for admin operations like deleting users. Keep this secure and never expose it to the client.

2. **RLS Policies**: Ensure Row Level Security is properly configured on your database tables to prevent unauthorized access.

3. **Audit Trail**: All admin actions are logged to the `audit_log` table for accountability.

## Troubleshooting

### Users not showing up
- Check that the `user_profiles` table is populated
- Verify the API route is accessible at `/api/admin/users`
- Check browser console for errors

### Cannot delete users
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in environment
- Check that the user is not trying to delete themselves
- Verify the user exists in both `auth.users` and `user_profiles`

### Admin redirect not working
- Clear browser cookies and try signing in again
- Check that the user's role is set to 'admin' in `user_profiles`
- Verify the AuthContext is properly wrapping the app

## Next Steps

Consider implementing:
1. Bulk user operations (select multiple users for bulk updates)
2. User invite system
3. Export user data to CSV
4. More detailed audit logs with filtering
5. Email notifications for role changes
6. Two-factor authentication for admin users

## Support

For issues or questions about the admin flow, check:
1. Supabase logs for database errors
2. Browser console for client-side errors
3. Network tab for API response issues
4. Server logs for backend errors