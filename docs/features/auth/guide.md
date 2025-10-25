# FRC Scouting System - Authentication Guide

Complete guide to implementing and using the authentication system with Supabase Auth and role-based access control (RBAC).

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Database Setup](#database-setup)
5. [Frontend Implementation](#frontend-implementation)
6. [API Route Protection](#api-route-protection)
7. [Common Patterns](#common-patterns)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The authentication system provides:

- **Supabase Auth Integration** - Secure authentication with email/password
- **Role-Based Access Control** - Three user roles: admin, mentor, scouter
- **Row Level Security (RLS)** - Database-level access control
- **Multi-Team Support** - Users can belong to multiple teams
- **Audit Logging** - Track security-sensitive operations
- **Protected Routes** - Component and API route protection

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ AuthContext  │  │ Login/Signup │  │ ProtectedRoute  │ │
│  │  Provider    │──│  Components  │──│   Component     │ │
│  └──────────────┘  └──────────────┘  └─────────────────┘ │
│         │                                      │           │
│         └──────────────┬───────────────────────┘           │
│                        │                                   │
└────────────────────────┼───────────────────────────────────┘
                         │
                         │ Supabase Client
                         │
┌────────────────────────┼───────────────────────────────────┐
│                        │        Supabase Backend           │
│                        ▼                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  auth.users  │  │user_profiles │  │ team_members    │ │
│  │  (built-in)  │──│   (custom)   │──│   (custom)      │ │
│  └──────────────┘  └──────────────┘  └─────────────────┘ │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │         Row Level Security (RLS) Policies         │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Run Database Migration

Execute the authentication migration in your Supabase SQL Editor:

```bash
# Copy the contents of supabase-auth-migration.sql
# Paste into Supabase SQL Editor and run
```

This creates:
- `user_profiles` table
- `team_members` table
- `audit_log` table
- RLS policies for all tables
- Helper functions for authorization

### 2. Create First Admin User

```sql
-- After signing up your first user, promote them to admin:
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### 3. Wrap Your App with AuthProvider

In `src/app/layout.tsx`:

```tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 4. Use Authentication in Components

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export function MyComponent() {
  const { user, isAuthenticated, isAdmin, signOut } = useAuth();

  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <p>Welcome, {user.profile.display_name || user.profile.email}!</p>
      <p>Role: {user.profile.role}</p>
      {isAdmin && <p>You have admin access!</p>}
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

---

## User Roles & Permissions

### Role Hierarchy

```
admin > mentor > scouter
```

Higher roles inherit all permissions from lower roles.

### Admin

**Full system access**

- ✅ Submit, edit, and delete scouting data
- ✅ View analytics for all teams
- ✅ Manage teams and users
- ✅ Assign roles and permissions
- ✅ View audit logs
- ✅ Manage season configurations
- 🔍 Access scope: **All teams**

**Use cases**: System administrators, lead developers

### Mentor

**Team management and analytics**

- ✅ Submit and edit scouting data
- ✅ View analytics for their team(s)
- ✅ Invite and manage team members
- ✅ Assign scouts to matches
- ❌ Cannot delete data
- ❌ Cannot change user roles
- ❌ Cannot view audit logs
- 🔍 Access scope: **Assigned teams only**

**Use cases**: Team mentors, strategy leads, data analysts

### Scouter

**Data collection only**

- ✅ Submit scouting data
- ❌ Cannot edit others' data
- ❌ Cannot delete data
- ❌ Cannot view analytics
- ❌ Cannot manage team
- 🔍 Access scope: **Own data only**

**Use cases**: Student scouts, volunteer data collectors

### Permission Matrix

| Permission | Admin | Mentor | Scouter |
|------------|-------|--------|---------|
| Submit data | ✅ | ✅ | ✅ |
| Edit data | ✅ | ✅ | ❌ |
| Delete data | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ❌ |
| Manage team | ✅ | ✅ | ❌ |
| Invite members | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |

---

## Database Setup

### Tables Created

#### `user_profiles`

Extends Supabase `auth.users` with custom fields:

```typescript
{
  id: UUID,                      // Links to auth.users
  email: string,
  full_name?: string,
  display_name?: string,
  role: 'admin' | 'mentor' | 'scouter',
  primary_team_number?: number,
  preferred_scout_name?: string,
  is_active: boolean,
  onboarding_completed: boolean,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### `team_members`

Multi-team membership:

```typescript
{
  id: UUID,
  user_id: UUID,                 // References user_profiles
  team_number: number,           // References teams
  team_role: 'admin' | 'mentor' | 'scouter',
  can_submit_data: boolean,
  can_view_analytics: boolean,
  can_manage_team: boolean,
  is_active: boolean,
  joined_at: timestamp
}
```

#### `audit_log`

Security audit trail:

```typescript
{
  id: UUID,
  user_id?: UUID,
  action: string,                // 'login', 'role_change', etc.
  resource_type?: string,
  resource_id?: string,
  old_values?: JSONB,
  new_values?: JSONB,
  ip_address?: string,
  created_at: timestamp
}
```

### Row Level Security (RLS)

All tables have RLS enabled. Example policy:

```sql
-- Users can view team scouting data
CREATE POLICY "Users can view team scouting data"
  ON match_scouting FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      LEFT JOIN team_members tm ON tm.user_id = up.id
      WHERE up.id = auth.uid()
      AND up.is_active = true
      AND (
        up.role = 'admin'
        OR (tm.team_number = match_scouting.team_number AND tm.is_active = true)
      )
    )
  );
```

**Result**: Scouters see only their team's data, admins see everything.

---

## Frontend Implementation

### Using the Auth Hook

```tsx
import { useAuth } from '@/contexts/AuthContext';

function Component() {
  const {
    // State
    user,              // AuthenticatedUser | null
    loading,           // boolean
    error,             // Error | null

    // Getters
    isAuthenticated,   // boolean
    isAdmin,           // boolean
    isMentor,          // boolean
    isScouter,         // boolean

    // Actions
    signIn,            // (data: LoginFormData) => Promise<void>
    signUp,            // (data: SignupFormData) => Promise<void>
    signOut,           // () => Promise<void>
    updateProfile,     // (data: UpdateUserProfileData) => Promise<void>

    // Permission checks
    hasPermission,     // (permission: string) => boolean
    canAccessTeam,     // (teamNumber: number) => Promise<boolean>
  } = useAuth();
}
```

### Login Form Example

```tsx
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <LoginForm
      onSuccess={() => {
        // Redirect after successful login
        router.push('/dashboard');
      }}
      onForgotPassword={() => {
        router.push('/auth/forgot-password');
      }}
      onSignUp={() => {
        router.push('/auth/signup');
      }}
    />
  );
}
```

### Protecting Client Components

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute requireRole="mentor">
      <DashboardContent />
    </ProtectedRoute>
  );
}
```

### Protecting Server Components

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const supabase = createServerClient();
  const user = await getCurrentUser(supabase);

  if (!user || user.profile.role !== 'admin') {
    redirect('/unauthorized');
  }

  return <AdminContent user={user} />;
}
```

### Conditional Rendering by Role

```tsx
function NavigationMenu() {
  const { isAdmin, isMentor, user } = useAuth();

  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>

      {isMentor && (
        <Link href="/analytics">Analytics</Link>
      )}

      {isAdmin && (
        <>
          <Link href="/admin/users">User Management</Link>
          <Link href="/admin/audit">Audit Logs</Link>
        </>
      )}
    </nav>
  );
}
```

---

## API Route Protection

### Basic Authentication

```typescript
// src/app/api/example/route.ts
import { NextRequest } from 'next/server';
import { requireAuth, successResponse } from '@/lib/api/auth-middleware';

export async function GET(request: NextRequest) {
  // Require any authenticated user
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  const { user } = authResult;

  // Your logic here
  const data = { message: `Hello ${user.profile.email}!` };

  return successResponse(data);
}
```

### Require Specific Role

```typescript
import { requireAuth, successResponse } from '@/lib/api/auth-middleware';

export async function POST(request: NextRequest) {
  // Require mentor role or higher
  const authResult = await requireAuth(request, { requireRole: 'mentor' });

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  // Only mentors and admins can reach this code
  // ...
}
```

### Require Team Access

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { teamNumber: string } }
) {
  const teamNumber = parseInt(params.teamNumber);

  // Require access to specific team
  const authResult = await requireAuth(request, { requireTeam: teamNumber });

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  // User has access to this team
  // ...
}
```

### Admin-Only Endpoint

```typescript
import { requireAdmin, successResponse } from '@/lib/api/auth-middleware';

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  // Only admins can delete
  // ...
}
```

---

## Common Patterns

### Check Permission Before Action

```tsx
function DataEditor({ dataId }: { dataId: string }) {
  const { hasPermission, canAccessResource } = useAuth();
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const access = await canAccessResource('match_scouting', dataId);
      setCanEdit(access.canEdit);
    }
    checkAccess();
  }, [dataId]);

  return (
    <div>
      {canEdit ? (
        <EditForm dataId={dataId} />
      ) : (
        <ReadOnlyView dataId={dataId} />
      )}
    </div>
  );
}
```

### Multi-Team User

```tsx
async function getUserTeams(userId: string) {
  const memberships = await getUserTeamMemberships(supabase, userId);

  return memberships.map(m => ({
    teamNumber: m.team_number,
    role: m.team_role,
    canManage: m.can_manage_team,
  }));
}
```

### Invite User to Team

```tsx
// Admin or mentor invites scouter
async function inviteToTeam(email: string, teamNumber: number) {
  const { user, error } = await authSignUp(supabase, {
    email,
    password: generateTemporaryPassword(),
    team_number: teamNumber,
  });

  if (error) throw error;

  // Add to team_members
  await addTeamMember(supabase, user!.id, teamNumber, 'scouter');

  // Send invitation email
  await sendInvitationEmail(email, teamNumber);
}
```

---

## Security Best Practices

### ✅ Always Use RLS

Row Level Security is your first line of defense:

- Never disable RLS in production
- Test policies with different user roles
- Use helper functions (`is_admin`, `can_access_team`) in policies

### ✅ Validate on Server

Client-side checks are UX, not security:

```tsx
// ❌ BAD: Only client-side check
function DeleteButton() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  // Calls unprotected API
  return <button onClick={() => deleteData()}>Delete</button>;
}

// ✅ GOOD: Server-side validation
export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Blocked at API level
  }

  // Safe to proceed
}
```

### ✅ Use Environment Variables

Never commit credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-only, NEVER expose to client
```

### ✅ Password Requirements

Enforce strong passwords:

```typescript
// Already implemented in validatePasswordStrength()
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
```

### ✅ Audit Important Actions

```typescript
// Log sensitive operations
INSERT INTO audit_log (user_id, action, resource_type, resource_id)
VALUES (auth.uid(), 'role_change', 'user_profile', target_user_id);
```

---

## Troubleshooting

### User Not Found After Signup

**Symptom**: Sign up succeeds but user profile doesn't exist

**Cause**: Trigger `on_auth_user_created` may not have fired

**Solution**:
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Manually create profile
INSERT INTO user_profiles (id, email, role)
VALUES ('user-id-from-auth.users', 'email@example.com', 'scouter');
```

### RLS Policy Blocks Admin

**Symptom**: Admin user cannot access data

**Cause**: Policy may be too restrictive or user role not set

**Solution**:
```sql
-- Check user role
SELECT id, email, role FROM user_profiles WHERE email = 'admin@example.com';

-- Update role if needed
UPDATE user_profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

### Session Expires Immediately

**Symptom**: User signed out after page refresh

**Cause**: Cookie/session storage issue

**Solution**:
- Check browser allows cookies
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project settings for JWT expiry

### Can't Access Team Data

**Symptom**: User can't see their team's scouting data

**Cause**: Missing team_members entry or inactive membership

**Solution**:
```sql
-- Check team memberships
SELECT * FROM team_members WHERE user_id = 'user-id' AND is_active = true;

-- Add team membership
INSERT INTO team_members (user_id, team_number, team_role, can_submit_data, is_active)
VALUES ('user-id', 930, 'scouter', true, true);
```

---

## Next Steps

1. **Run the migration**: Execute `supabase-auth-migration.sql`
2. **Create admin user**: Sign up and promote to admin role
3. **Test authentication**: Try login/signup flows
4. **Protect routes**: Add `ProtectedRoute` to sensitive pages
5. **Secure APIs**: Use `requireAuth` middleware
6. **Invite team members**: Use admin panel to add users

## Support

For issues or questions:
- Check [Supabase Auth docs](https://supabase.com/docs/guides/auth)
- Review RLS policies in Supabase dashboard
- Check audit logs for failed authentication attempts

---

**Last Updated**: 2025-10-20
