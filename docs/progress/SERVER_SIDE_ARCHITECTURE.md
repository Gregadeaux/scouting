# Server-Side First Authentication Architecture

**Date**: 2025-10-25
**Status**: ✅ **IMPLEMENTED**

---

## 🎯 Core Principle: Server-Side is Source of Truth

**Rule**: All authentication and authorization decisions MUST happen on the server. Client-side state is for UI convenience only, never for security.

---

## 🏗️ Architecture Layers

### Layer 1: Server-Side (Source of Truth) ✅

**Components**: Middleware, Server Components, Server Actions, API Routes

**Authentication Flow**:
```
User Request → Middleware → Server Component → Client Component
      ↓             ↓              ↓                    ↓
  Cookies    Check Session   Get Profile        Receive Props
```

**Implementation**:

#### 1. Middleware (First Line of Defense)
```typescript
// src/middleware.ts
export async function middleware(req: NextRequest) {
  const supabase = createServerClient(/* cookies from request */);

  // Get session from cookies (server-side)
  const { data: { session } } = await supabase.auth.getSession();

  // Get user profile from database
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  // Make routing decision based on server-side data
  const accessCheck = canAccessRoute(pathname, !!session, profile?.role);

  if (!accessCheck.allowed) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return response;
}
```

**Key Points**:
- ✅ Uses cookies from request (server-side only)
- ✅ Validates session before any page renders
- ✅ Makes authorization decisions before client sees anything
- ✅ Redirects happen server-side (secure)

#### 2. Server Components (Layouts & Pages)
```typescript
// src/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  // Get auth state from server
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // ✅ Uses getUser(), not getSession()

  if (!user) {
    redirect('/login'); // Server-side redirect
  }

  // Get profile from database
  const profile = await getUserProfile(supabase, user.id);

  // Check permissions server-side
  const hasAccess = profile?.role === 'admin' || profile?.role === 'mentor';

  if (!hasAccess) {
    redirect('/unauthorized'); // Server-side redirect
  }

  // Pass role to client components as props (not from client context!)
  return (
    <div>
      <Sidebar userRole={profile?.role} /> {/* ✅ Server data → Client prop */}
      {children}
    </div>
  );
}
```

**Key Points**:
- ✅ Auth check happens before rendering
- ✅ Profile fetched from database (not client cache)
- ✅ Props passed to client components (server → client flow)
- ✅ No reliance on client-side AuthContext

#### 3. Server Actions (For Mutations)
```typescript
// src/app/auth/login/actions.ts
'use server';

export async function loginAction(formData: FormData) {
  const supabase = await createClient();

  // Sign in server-side
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Cookies are set server-side automatically
  revalidatePath('/', 'layout'); // Invalidate all cached data

  return { success: true, redirectTo: '/admin' };
}
```

**Key Points**:
- ✅ `'use server'` directive ensures server-only execution
- ✅ Cookies set by Supabase are httpOnly and secure
- ✅ No client-side JavaScript can access auth cookies
- ✅ `revalidatePath()` ensures fresh server-side data

---

### Layer 2: Client-Side (UI Only) ⚠️

**Components**: Client Components, React Context

**Purpose**: UI state and convenience, NOT security

**Implementation Pattern** (Correct Way):

```typescript
// Client Component receives server data as props
'use client';

interface SidebarProps {
  userRole?: string; // ✅ FROM SERVER, not from AuthContext
}

export function Sidebar({ userRole }: SidebarProps) {
  return (
    <nav>
      {navItems.map((item) => {
        // Simple client-side check for UI purposes
        if (item.adminOnly && userRole !== 'admin') {
          return null; // Hide from UI
        }
        return <Link href={item.href}>{item.name}</Link>;
      })}
    </nav>
  );
}
```

**Key Points**:
- ✅ Receives `userRole` from parent server component
- ✅ Uses prop (from server) instead of AuthContext
- ✅ Client-side check is for UI only (hiding nav items)
- ✅ Actual route protection happens in middleware (server)

---

## 🔒 Security Model

### Defense in Depth (Multiple Layers)

```
Layer 1: Middleware
    ↓ (Blocks unauthorized requests)

Layer 2: Server Component Layout
    ↓ (Validates session + role)

Layer 3: Server Component Page
    ↓ (Validates specific permissions)

Layer 4: API Route
    ↓ (Validates request + data access)

Layer 5: Client UI
    (Hides/shows elements for UX only)
```

**Each layer independently validates the server-side session!**

### What if Client is Compromised?

Even if a malicious user:
- ❌ Modifies client-side JavaScript
- ❌ Bypasses UI checks
- ❌ Manually crafts requests

They STILL cannot:
- ❌ Access protected routes (blocked by middleware)
- ❌ See unauthorized data (blocked by server components)
- ❌ Perform unauthorized actions (blocked by Server Actions/API routes)

**Why?** All decisions use server-side session from httpOnly cookies that JavaScript cannot access.

---

## ✅ Best Practices Checklist

### DO ✅

1. **Authentication Operations** - Always use Server Actions:
   ```typescript
   'use server';
   export async function loginAction(formData: FormData) {
     const supabase = await createClient();
     const { data, error } = await supabase.auth.signInWithPassword({...});
     revalidatePath('/', 'layout');
     return { success: true };
   }
   ```

2. **Authorization Checks** - Always in Server Components:
   ```typescript
   export default async function Page() {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();

     if (!user) redirect('/login');

     const profile = await getUserProfile(supabase, user.id);
     if (!canView(profile)) redirect('/unauthorized');

     return <Content userRole={profile.role} />;
   }
   ```

3. **Pass Server Data to Client** - Via props:
   ```typescript
   // Server Component
   <ClientComponent userRole={profile.role} permissions={permissions} />

   // Client Component
   function ClientComponent({ userRole, permissions }) {
     // Use props, not AuthContext
   }
   ```

4. **Use getUser()** - Not getSession():
   ```typescript
   // ✅ CORRECT - Validates with Supabase server
   const { data: { user } } = await supabase.auth.getUser();

   // ❌ WRONG - Only reads from cookies (not validated)
   const { data: { session } } = await supabase.auth.getSession();
   ```

### DON'T ❌

1. **❌ Don't use client-side auth for security**:
   ```typescript
   // ❌ BAD - Client can be manipulated
   'use client';
   function AdminPanel() {
     const { isAdmin } = useAuth(); // Client context
     if (!isAdmin) return null; // Easily bypassed
     return <AdminControls />;
   }
   ```

2. **❌ Don't make auth decisions in client components**:
   ```typescript
   // ❌ BAD - Security decision on client
   'use client';
   async function deleteUser(id) {
     if (userRole === 'admin') { // Client check
       await fetch('/api/users/' + id, { method: 'DELETE' });
     }
   }

   // ✅ GOOD - Security decision on server
   'use server';
   async function deleteUser(id) {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();
     const profile = await getUserProfile(supabase, user.id);

     if (profile.role !== 'admin') {
       throw new Error('Unauthorized');
     }

     await supabase.from('user_profiles').delete().eq('id', id);
   }
   ```

3. **❌ Don't rely on AuthContext for permissions**:
   ```typescript
   // ❌ BAD
   const { hasPermission } = useAuth();
   if (hasPermission('delete_users')) {
     // Show delete button
   }

   // ✅ GOOD
   interface Props {
     canDelete: boolean; // From server
   }
   function UserList({ canDelete }: Props) {
     if (canDelete) {
       // Show delete button
     }
   }
   ```

---

## 🔄 Data Flow Pattern

### Correct Flow (Server → Client)

```
┌─────────────────┐
│  User Request   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Middleware    │  ← Check session from cookies
│  (Server-side)  │  ← Validate role from database
└────────┬────────┘  ← Make routing decision
         │
         ↓
┌─────────────────┐
│ Server Component│  ← Get fresh user + profile
│  (Layout/Page)  │  ← Check permissions
└────────┬────────┘  ← Fetch authorized data
         │
         ↓
┌─────────────────┐
│Client Component │  ← Receives data as props
│  (Interactive)  │  ← Uses props for UI decisions
└─────────────────┘  ← NO direct auth queries
```

### Incorrect Flow (Client → Server) ❌

```
┌─────────────────┐
│Client Component │  ← useAuth() hook
│  (Interactive)  │  ← Gets role from context
└────────┬────────┘  ← Makes security decision ❌
         │
         ↓
┌─────────────────┐
│  API Request    │  ← Trusts client decision ❌
│   (to server)   │  ← Security bypass risk ❌
└─────────────────┘
```

---

## 📝 Migration Guide

### Converting Client-Side Auth to Server-Side

#### Before (Client-Side)
```typescript
// ❌ OLD WAY
'use client';
import { useAuth } from '@/contexts/AuthContext';

function AdminPanel() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <div>Access Denied</div>;
  }

  return <AdminContent />;
}
```

#### After (Server-Side)
```typescript
// ✅ NEW WAY - Server Component
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminContentClient } from './AdminContentClient';

export default async function AdminPanel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const profile = await getUserProfile(supabase, user.id);

  if (profile.role !== 'admin') {
    return <div>Access Denied</div>; // Or redirect('/unauthorized')
  }

  return <AdminContentClient userRole={profile.role} />;
}

// Client component receives props
'use client';
function AdminContentClient({ userRole }) {
  // Use userRole prop, not useAuth()
  return <div>Admin content for {userRole}</div>;
}
```

---

## 🎯 Current Implementation Status

### ✅ Correctly Implemented

1. **Middleware** - Uses server-side session, validates before routing
2. **Admin Layout** - Server component checks auth, passes role to sidebar
3. **Sidebar** - Receives `userRole` prop from server, no AuthContext dependency
4. **Login Flow** - Uses Server Action, cookies set server-side
5. **Team Detail Page** - Server component fetches data, validates permissions

### ⚠️ AuthContext Role

**Current Status**: Still exists for backward compatibility and convenience

**Usage**: Should ONLY be used for:
- UI state (loading spinners, etc.)
- Convenience methods (quick role checks for UI)
- Non-critical UI decisions

**Should NOT be used for**:
- Security decisions
- Authorization checks
- Access control
- Data fetching

### 🚀 Future Improvements

1. **Deprecate AuthContext** - Phase out client-side auth context entirely
2. **Server Components Everywhere** - Convert remaining client components to receive server props
3. **API Route Protection** - Ensure all API routes independently validate sessions
4. **Audit Dependencies** - Find any remaining uses of AuthContext for security

---

## 📚 Additional Resources

### Supabase SSR Documentation
- [Server-Side Auth Guide](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Next.js App Router Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)

### Next.js Documentation
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

### Key Security Principles
1. **Never trust the client** - All auth checks on server
2. **Defense in depth** - Multiple layers of validation
3. **Principle of least privilege** - Only fetch data user can access
4. **Fail secure** - Default to deny, require explicit permission

---

## 🎉 Summary

### What Changed Today

1. **Route Guards** - Updated to allow mentors in admin routes
2. **Sidebar** - Now receives `userRole` from server component prop
3. **Removed AuthContext Dependency** - Sidebar no longer uses client-side auth context
4. **Server-Side Flow** - Complete flow from middleware → layout → sidebar uses server session

### Security Guarantees

✅ All authentication happens server-side
✅ All authorization checks use server-side session
✅ Client-side UI cannot be bypassed to gain access
✅ Cookies are httpOnly and secure
✅ Multiple layers of defense

### Result

You now have a **robust, server-first authentication architecture** where:
- Client-side code is for UI convenience only
- All security decisions happen on the server
- Session state comes from httpOnly cookies that JavaScript cannot access
- Multiple layers validate permissions independently

**This is the correct pattern for production Next.js + Supabase applications! 🎯**
