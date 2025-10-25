# Supabase Setup Guide

Complete guide for setting up Supabase database connection and authentication.

## Table of Contents
1. [Database Connection Setup](#database-connection-setup)
2. [Authentication Configuration](#authentication-configuration)
3. [Testing](#testing)
4. [Troubleshooting](#troubleshooting)

---

## Database Connection Setup

### ✅ Prerequisites

- Database schema created in Supabase
- `.env.local` file exists in project root

### 1. Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and log in
2. Click on your project (where you created the tables)
3. Navigate to: **Project Settings** (gear icon) → **API**
4. Copy these three values:

   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...` - this is secret!)

### 2. Update `.env.local` File

Open `.env.local` in the project root and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-ACTUAL-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-ACTUAL-SERVICE-KEY
```

**Security Notes:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Safe to expose (public)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Safe to expose (rate-limited)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` - **KEEP SECRET!** Never commit to git or expose in browser

### 3. Install Dependencies

```bash
npm install
```

This will install `tsx` (to run the test script) and ensure all packages are up to date.

### 4. Test the Database Connection

```bash
npm run test:db
```

This will:
- ✅ Verify your credentials are correct
- ✅ Check connection to Supabase
- ✅ Count records in each table
- ✅ Confirm everything is working

Expected output:
```
🔍 Testing Supabase Connection...

Test 1: Basic Connection...
✅ Connected successfully!

Test 2: Checking table record counts...
  ✅ teams: 0 records
  ✅ events: 0 records
  ✅ match_schedule: 0 records
  ✅ scouters: 0 records
  ✅ season_config: 0 records
  ✅ match_scouting: 0 records
  ✅ pit_scouting: 0 records

🎉 Supabase connection test complete!
```

---

## Authentication Configuration

### ⚡ Quick Setup (5 minutes)

#### 1. Enable Email Authentication

1. Open your Supabase project dashboard
2. Go to **Authentication** → **Providers**
3. Find **Email** and toggle it **ON**
4. Configure:
   - ✅ **Enable Email provider**: ON
   - **Confirm email**: ON (recommended) or OFF for testing
   - **Secure email change**: ON

#### 2. Set Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**:
   ```
   Development: http://localhost:3000
   Production: https://yourdomain.com
   ```

3. Add **Redirect URLs**:
   ```
   http://localhost:3000/**
   https://yourdomain.com/**
   ```

#### 3. Run the Auth Migration

1. Open **SQL Editor** in Supabase
2. Copy ALL of `supabase-auth-migration.sql` from the project root
3. Paste and click **Run**
4. Wait for "Success"

#### 4. Create Admin User

1. Sign up at `http://localhost:3000/auth/signup`
2. In Supabase SQL Editor, run:
   ```sql
   UPDATE user_profiles
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```

✅ **Done!** You can now sign in as admin.

### 📧 Email Confirmation Options

#### Option A: Require Email Confirmation (Production)

**Best for production** - prevents fake accounts

1. **Authentication** → **Providers** → **Email**
2. **Confirm email**: ON
3. Users must click email link before signing in

#### Option B: Skip Email Confirmation (Testing)

**Best for development** - sign in immediately

1. **Authentication** → **Providers** → **Email**
2. **Confirm email**: OFF
3. Users can sign in right after signup

**⚠️ Remember to enable for production!**

### 🛠️ Custom SMTP (Optional)

By default, Supabase sends emails (limited to 3/hour on free tier).

**For production**, use your own email service:

1. **Authentication** → **Settings** → **SMTP Settings**
2. Enable custom SMTP
3. Enter your email provider details

**Recommended providers:**
- SendGrid (100 free emails/day)
- Mailgun (1,000 free emails/month)
- AWS SES (very cheap)

---

## Testing

### Start the Development Server

```bash
npm run dev
```

Visit: **http://localhost:3000/admin**

### Test Authentication Flow

#### Test Signup
```
1. Go to: http://localhost:3000/auth/signup
2. Fill out the form
3. (If email confirmation ON) Check email and click link
4. Should see success message
```

#### Test Login
```
1. Go to: http://localhost:3000/auth/login
2. Enter email and password
3. Should redirect to /dashboard
```

#### Test Password Reset
```
1. Go to: http://localhost:3000/auth/forgot-password
2. Enter email
3. Check email for reset link
4. Click link and set new password
```

### Start Using the Admin Dashboard

Now you can:
- 📊 View the dashboard at `/admin`
- 👥 Add teams at `/admin/teams`
- 🏆 Create events at `/admin/events`
- 🔍 Manage all your data

---

## Troubleshooting

### Database Connection Issues

#### Error: "Invalid API key"
- Double-check you copied the **anon key**, not the service role key
- Make sure there are no extra spaces in `.env.local`

#### Error: "Failed to connect"
- Verify the `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check your internet connection
- Ensure your Supabase project is active (not paused)

#### Error: "Permission denied"
- You may need to configure Row Level Security (RLS) policies
- For development, you can temporarily disable RLS on tables

### Authentication Issues

#### "Email not confirmed"
- Check spam folder
- Or disable email confirmation for testing
- Or manually confirm in **Authentication** → **Users** → click user → **Confirm email**

#### "Invalid redirect URL"
- Add your domain to redirect URLs
- Include `http://localhost:3000/**` for development

#### "User not found"
- Check if user was created: **Authentication** → **Users**
- Check if trigger created profile:
  ```sql
  SELECT * FROM user_profiles WHERE email = 'your-email@example.com';
  ```

#### RLS blocking access
- Verify migration ran successfully
- Check policies exist:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
  ```

### General Issues

1. Check that `.env.local` is in the project root (same folder as `package.json`)
2. Restart the dev server after changing `.env.local`
3. Check the Supabase dashboard for any errors

---

## 📝 Row Level Security (Optional)

By default, your tables might have RLS enabled. For development, you can disable it:

1. Go to Supabase Dashboard → **Table Editor**
2. Click on a table (e.g., `teams`)
3. Click **"RLS disabled"** toggle to turn it off
4. Repeat for all tables

**Note:** In production, you should enable RLS and create proper security policies!

---

## ✅ Setup Checklist

### Database Connection
- [ ] Copied Project URL from Supabase
- [ ] Copied anon key from Supabase
- [ ] Copied service role key from Supabase
- [ ] Updated `.env.local` with all three values
- [ ] Ran `npm install`
- [ ] Ran `npm run test:db` successfully

### Authentication
- [ ] Email provider enabled
- [ ] Site URL set to `http://localhost:3000`
- [ ] Redirect URLs include localhost
- [ ] Migration `supabase-auth-migration.sql` executed
- [ ] First user signed up
- [ ] First user promoted to admin
- [ ] Login works

### Application
- [ ] Started dev server with `npm run dev`
- [ ] Visited `/admin` and saw the dashboard
- [ ] Can authenticate and access protected routes

Once all steps are complete, you're ready to start using the scouting system! 🎉

---

## 📚 Related Documentation

- [Authentication Guide](/docs/features/auth/guide.md) - Complete authentication architecture
- [Auth Quick Start](/docs/features/auth/quick-start.md) - Quick setup walkthrough
- [Admin Setup](/docs/setup/admin.md) - Admin dashboard configuration
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth) - Official documentation

---

**Last Updated**: 2025-10-24
