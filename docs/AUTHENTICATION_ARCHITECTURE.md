# Authentication Architecture

This document describes the SOLID-compliant authentication and authorization architecture implemented in the FRC Scouting System.

## Overview

The authentication system follows SOLID principles with a service-oriented architecture that separates concerns into thin presentation layers and robust service layers.

## Architecture Principles

### SOLID Compliance

1. **Single Responsibility Principle**
   - Each service has one well-defined purpose
   - RedirectService: Handles all routing decisions
   - RouteGuardService: Manages route protection logic
   - AuthService: Centralizes authentication operations

2. **Open/Closed Principle**
   - Adding new roles requires changes only to service configuration
   - Components depend on stable service interfaces
   - Easy to extend without modifying existing code

3. **Liskov Substitution Principle**
   - Services can be mocked for testing
   - Consistent interfaces across the application

4. **Interface Segregation Principle**
   - Services expose only necessary methods
   - No forced dependencies on unused functionality

5. **Dependency Inversion Principle**
   - Components depend on service abstractions, not Supabase directly
   - High-level modules don't depend on low-level implementation details

## Service Layer

### 1. RedirectService (`src/lib/services/redirect.service.ts`)

**Purpose**: Single source of truth for all routing decisions

**Key Functions**:
- `getRedirectPathForRole(role)` - Get default landing page for role
- `getRedirectPath(path, isAuthenticated, role, redirect)` - Comprehensive redirect logic
- `isPublicRoute(path)` - Check if route is public
- `isAuthPage(path)` - Check if route is an auth page

**Configuration**:
```typescript
roleDefaults: {
  admin: '/admin',
  mentor: '/dashboard',
  scouter: '/pit-scouting',
}
```

**Usage**:
```typescript
import { getRedirectPathForRole } from '@/lib/services/redirect.service';

const path = getRedirectPathForRole(user.profile.role);
router.push(path);
```

### 2. RouteGuardService (`src/lib/services/route-guard.service.ts`)

**Purpose**: Centralized route protection and access control

**Key Functions**:
- `canAccessRoute(path, isAuthenticated, role)` - Check route access
- `requiresAuth(path)` - Check if route needs authentication
- `getRequiredRoles(path)` - Get roles allowed for route
- `hasRoleAccess(userRole, requiredRole)` - Check role hierarchy

**Route Configuration**:
```typescript
ROUTE_GUARDS = {
  '/admin': ['admin'],
  '/pit-scouting': ['admin', 'mentor', 'scouter'],
  // ...
}
```

**Usage**:
```typescript
import { canAccessRoute } from '@/lib/services/route-guard.service';

const access = canAccessRoute(pathname, isAuthenticated, userRole);
if (!access.allowed) {
  // Handle unauthorized access
}
```

### 3. AuthService (`src/lib/services/auth.service.ts`)

**Purpose**: Abstraction layer for all authentication operations

**Key Functions**:
- `getCurrentUser(supabase)` - Get authenticated user with profile
- `signIn(supabase, credentials)` - Sign in user
- `signOut(supabase)` - Sign out user
- `isAdmin(supabase, userId)` - Check admin status
- `canAccessTeam(supabase, userId, teamNumber)` - Check team access

**Usage**:
```typescript
import { getCurrentUser, signIn } from '@/lib/services/auth.service';

const user = await getCurrentUser(supabase);
const result = await signIn(supabase, { email, password });
```

## Presentation Layer

### Middleware (`src/middleware.ts`)

**Responsibilities**:
- Run on every request before page load
- Check authentication status
- Verify route access permissions
- Redirect unauthenticated users to login
- Redirect authenticated users away from auth pages

**Flow**:
1. Create Supabase client
2. Get session and user role
3. Use `canAccessRoute()` to check access
4. Use `getRedirectPath()` to determine redirect
5. Redirect or allow access

### Root Page (`src/app/page.tsx`)

**Purpose**: Authentication router (fallback to middleware)

Server component that:
- Checks authentication
- Gets user role
- Redirects to role-specific landing page

### AuthContext (`src/contexts/AuthContext.tsx`)

**Responsibilities**:
- Manage global auth state
- Provide auth operations to components
- Handle post-login redirects using RedirectService

**Updated Methods**:
- `signIn()` - Uses `getRedirectPathForRole()` for redirect

## Authentication Flow

### Login Flow

```
User visits /auth/login
    ↓
LoginForm.onSubmit()
    ↓
AuthContext.signIn()
    ↓
AuthService.signIn() (validates credentials)
    ↓
RedirectService.getRedirectPathForRole() (determines destination)
    ↓
Router redirects to:
    - Admin → /admin
    - Mentor → /dashboard
    - Scouter → /pit-scouting
```

### OAuth Flow

```
User clicks "Sign in with Google"
    ↓
OAuth provider authentication
    ↓
Callback to /auth/callback
    ↓
Exchange code for session
    ↓
Get user profile
    ↓
RedirectService.getRedirectPathForRole()
    ↓
Redirect to role-specific page
```

### Protected Route Access

```
User navigates to protected route
    ↓
Middleware intercepts request
    ↓
RouteGuardService.canAccessRoute()
    ↓
If unauthorized:
    - Not authenticated → /auth/login?redirect=...
    - Wrong role → /unauthorized
If authorized:
    - Allow access
```

### Root Page Access

```
User visits /
    ↓
Middleware checks authentication
    ↓
RedirectService.getRedirectPath()
    ↓
If authenticated:
    - Admin → /admin
    - Mentor → /dashboard
    - Scouter → /pit-scouting
If not authenticated:
    - → /auth/login
```

## Role-Based Routing

### Admin
- **Landing**: `/admin`
- **Access**: All routes
- **Restrictions**: None

### Mentor (Future)
- **Landing**: `/dashboard`
- **Access**: Team management, analytics, scouting
- **Restrictions**: No user management, no system settings

### Scouter
- **Landing**: `/pit-scouting`
- **Access**: Scouting forms, own data
- **Restrictions**: No analytics, no team management

## Adding a New Role

To add a new role, update only the service layer:

1. **Add to type definition** (`src/types/auth.ts`):
```typescript
export type UserRole = 'admin' | 'mentor' | 'scouter' | 'viewer';
```

2. **Add to RedirectService** (`redirect.service.ts`):
```typescript
roleDefaults: {
  // ...
  viewer: '/analytics',
}
```

3. **Add permissions** (`route-guard.service.ts`):
```typescript
ROUTE_GUARDS = {
  '/analytics': ['admin', 'mentor', 'viewer'],
  // ...
}
```

4. **Update role hierarchy** (if needed):
```typescript
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  mentor: 3,
  viewer: 2,
  scouter: 1,
};
```

## Testing

### Manual Testing Checklist

- [ ] **Login as Admin**
  - Redirects to `/admin`
  - Can access all routes

- [ ] **Login as Scouter**
  - Redirects to `/pit-scouting`
  - Cannot access `/admin`
  - Redirected from `/dashboard` to `/pit-scouting`

- [ ] **Login as Mentor** (future)
  - Redirects to `/dashboard`
  - Cannot access `/admin`

- [ ] **Visit `/` while authenticated**
  - Redirects based on role

- [ ] **Visit `/auth/login` while authenticated**
  - Redirects to role's landing page

- [ ] **Visit protected route while unauthenticated**
  - Redirects to `/auth/login?redirect=...`

- [ ] **OAuth login**
  - Redirects to role-specific page

### Unit Testing

Services can be easily unit tested:

```typescript
import { getRedirectPathForRole } from '@/lib/services/redirect.service';

describe('RedirectService', () => {
  it('redirects scouter to pit-scouting', () => {
    expect(getRedirectPathForRole('scouter')).toBe('/pit-scouting');
  });
});
```

## Migration Notes

### Before (Scattered Logic)

- Redirect logic in 5+ locations
- Hard to maintain consistency
- Difficult to add new roles
- Direct Supabase dependencies in components

### After (Centralized Services)

- Single source of truth in services
- Easy to maintain and extend
- Add roles by updating configuration
- Components depend on service abstractions

## Best Practices

1. **Never hardcode redirects in components**
   - Use `RedirectService.getRedirectPathForRole()`

2. **Always use services for auth operations**
   - Don't call Supabase directly from components

3. **Centralize route protection**
   - Update `ROUTE_GUARDS` in `route-guard.service.ts`

4. **Document role changes**
   - Update this documentation when adding roles

## Troubleshooting

### User not redirecting after login
- Check `AuthContext.signIn()` uses `RedirectService`
- Verify role in `user_profiles` table
- Check browser console for errors

### Unauthorized access to route
- Verify `ROUTE_GUARDS` includes the route
- Check user's role in database
- Ensure middleware is running

### Infinite redirect loop
- Check `isPublicRoute()` and `isAuthPage()` logic
- Verify middleware doesn't redirect to itself
- Check `getRedirectPath()` logic

## File Structure

```
src/
├── lib/
│   ├── services/
│   │   ├── auth.service.ts          # Auth operations
│   │   ├── redirect.service.ts      # Routing logic
│   │   └── route-guard.service.ts   # Access control
│   └── supabase/
│       └── auth.ts                   # Low-level auth functions
├── contexts/
│   └── AuthContext.tsx               # Global auth state
├── middleware.ts                     # Route protection
└── app/
    ├── page.tsx                      # Auth router
    ├── auth/
    │   ├── login/page.tsx
    │   └── callback/route.ts         # OAuth callback
    └── dashboard/page.tsx
```

## Future Enhancements

1. **Mentor Role Implementation**
   - Create mentor-specific pages
   - Define subset of admin features
   - Update route guards

2. **Permission-Based Access**
   - Fine-grained permissions beyond roles
   - Feature flags per user
   - Team-specific access

3. **Session Management**
   - Token refresh handling
   - Session timeout warnings
   - Multiple device management

4. **Audit Logging**
   - Log authentication events
   - Track route access attempts
   - Security monitoring

---

**Last Updated**: 2025-01-24
**Version**: 1.0
**Maintained by**: FRC Scouting System Team
