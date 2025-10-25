# Authentication Quick Start Guide

Get authentication up and running in 10 minutes!

## Step 1: Run Database Migration (2 minutes)

1. Open your Supabase project at [supabase.com](https://supabase.com)
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase-auth-migration.sql`
4. Paste and click **Run**
5. Wait for "Success. No rows returned"

✅ You now have user tables, RLS policies, and triggers!

## Step 2: Create Your Admin Account (1 minute)

1. Sign up through your app (or we'll create UI in Step 4)
2. Run this SQL to promote yourself to admin:

```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

✅ You're now an admin!

## Step 3: Add AuthProvider to Your App (2 minutes)

Edit `src/app/layout.tsx`:

```tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
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

✅ Auth context now available everywhere!

## Step 4: Create Login Page (3 minutes)

Create `src/app/auth/login/page.tsx`:

```tsx
'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <LoginForm
        onSuccess={() => router.push('/dashboard')}
        onSignUp={() => router.push('/auth/signup')}
      />
    </div>
  );
}
```

Create `src/app/auth/signup/page.tsx`:

```tsx
'use client';

import { SignupForm } from '@/components/auth/SignupForm';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <SignupForm
        onSuccess={() => router.push('/auth/verify-email')}
        onSignIn={() => router.push('/auth/login')}
      />
    </div>
  );
}
```

✅ You now have login and signup pages!

## Step 5: Test It! (2 minutes)

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/auth/login`
3. Sign in with your admin account
4. You should see a successful login!

✅ Authentication is working!

---

## What You Get

### 🎯 Three User Roles

- **Admin**: Full access to everything
- **Mentor**: Manage teams, view analytics
- **Scouter**: Submit scouting data only

### 🔒 Security Features

- Row Level Security (RLS) at database level
- Protected API routes
- Audit logging
- Session management

### 🛠️ Developer Tools

```tsx
// In any component:
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <div>
      <p>Logged in as: {user?.profile.email}</p>
      <p>Role: {user?.profile.role}</p>
      {isAdmin && <p>You're an admin!</p>}
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

---

## Common Tasks

### Protect a Page

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requireRole="admin">
      <h1>Admin Only Content</h1>
    </ProtectedRoute>
  );
}
```

### Protect an API Route

```tsx
import { requireAuth, successResponse } from '@/lib/api/auth-middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, { requireRole: 'mentor' });

  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401/403 error
  }

  const { user } = authResult;
  return successResponse({ message: 'Success!', user });
}
```

### Invite a New User (as Admin)

```sql
-- They sign up via /auth/signup
-- Then you assign them to a team:
INSERT INTO team_members (user_id, team_number, team_role, can_submit_data, is_active)
VALUES (
  'user-id-from-user_profiles',
  930,
  'scouter',
  true,
  true
);
```

---

## Next Steps

1. ✅ **Read full docs**: See `AUTHENTICATION.md` for complete guide
2. 🎨 **Customize UI**: Update colors/styles in auth components
3. 👥 **Add team members**: Build admin UI for user management
4. 📊 **Protect data**: Add `requireAuth` to all API routes
5. 🔍 **Add analytics**: Build admin dashboard with audit logs

---

## Need Help?

**Common Issues:**

| Problem | Solution |
|---------|----------|
| "User not found" after signup | Check trigger fired: `SELECT * FROM user_profiles;` |
| Can't access team data | Add team_members entry for user |
| Session expires immediately | Check cookie settings in browser |
| RLS blocks admin | Verify role: `SELECT role FROM user_profiles WHERE id = auth.uid();` |

**Still stuck?** Check `AUTHENTICATION.md` troubleshooting section.

---

**You're all set! 🚀**

Authentication is now protecting your FRC scouting system. Build something awesome!
