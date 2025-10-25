# OAuth Setup Guide - Google Authentication

This guide walks you through setting up Google OAuth for your FRC Scouting application.

## Table of Contents
- [Overview](#overview)
- [Google OAuth Setup](#google-oauth-setup)
- [Supabase Configuration](#supabase-configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Adding Apple OAuth (Future)](#adding-apple-oauth-future)

---

## Overview

Your app now supports two authentication methods:
1. **Email/Password** (existing)
2. **Google OAuth** (new)

**What's been implemented:**
- ✅ Google OAuth sign-in button in LoginForm and SignupForm
- ✅ OAuth callback handler at `/auth/callback`
- ✅ Auth context updated with `signInWithOAuth()` method
- ✅ Type definitions for OAuth providers
- ✅ Role-based redirects after OAuth login

**What you need to configure:**
- ⚙️ Google Cloud Console credentials
- ⚙️ Supabase Auth provider settings

**Note:** Apple OAuth is not currently implemented since it requires an Apple Developer account ($99/year). See [Adding Apple OAuth](#adding-apple-oauth-future) section if you want to add it later.

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Name it something like "FRC Scouting App"

### Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in required fields:
   - **App name**: FRC Scouting System
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. Add test users (optional, for testing)
6. Save and continue

### Step 3: Create OAuth Client ID

1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Choose **Web application** as application type
4. Configure:

   **Name**: FRC Scouting Web Client

   **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://<your-domain>.com
   https://<your-supabase-project-ref>.supabase.co
   ```

   **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/callback
   https://<your-domain>.com/auth/callback
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```

5. Click **CREATE**
6. **Save your credentials**:
   - Client ID: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Enable Google Auth Platform

1. Go to [Google Auth Platform Console](https://console.cloud.google.com/apis/credentials/consent)
2. Ensure the following scopes are enabled:
   - `openid` (add manually if missing)
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`

---

## Supabase Configuration

### Step 1: Navigate to Auth Providers

1. Open your Supabase project dashboard
2. Go to **Authentication** → **Providers**
3. You'll see a list of OAuth providers

### Step 2: Enable Google Provider

1. Find **Google** in the providers list
2. Click to expand it
3. Toggle **Enable Sign in with Google**
4. Enter your credentials from Google Cloud Console:
   - **Client ID**: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`
5. Click **Save**

### Step 3: Configure Site URL

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Set **Site URL**:
   ```
   https://your-production-domain.com
   ```
   For development:
   ```
   http://localhost:3000
   ```

### Step 4: Configure Redirect URLs

1. Add redirect URLs under **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://your-production-domain.com/auth/callback
   ```

2. These must match what you configured in Google Cloud Console!

---

## Testing

### Local Development Testing

1. Start your Next.js dev server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/auth/login`

3. Click **"Continue with Google"**

4. You should be redirected to Google's login page

5. After authenticating, you should be redirected back to your app at `/auth/callback`

6. The callback handler will:
   - Exchange the authorization code for a session
   - Create a user profile (if first login via OAuth)
   - Redirect to `/dashboard` or `/admin` based on role

### What to Check

✅ **First OAuth Login**:
- User profile is created in `user_profiles` table
- Default role is assigned (probably `scouter`)
- User is redirected to dashboard

✅ **Subsequent OAuth Logins**:
- User session is restored
- No duplicate profiles created
- Role-based redirect works

✅ **OAuth + Email Accounts**:
- If a user signs up with email first, then uses OAuth with the same email, they should be the same account (Supabase handles this automatically)

### Test Google OAuth

1. Click "Continue with Google"
2. Sign in with your Google account
3. Verify redirect to dashboard (or `/admin` for admin users)
4. Check `user_profiles` table for new entry with:
   - Email from Google account
   - Full name populated
   - `email_verified: true`
   - Default role assigned

---

## Troubleshooting

### Common Issues

#### 1. "Redirect URI mismatch" error

**Cause**: The redirect URI in your Google OAuth settings doesn't match the one Supabase is using.

**Fix**:
- Check **Authorized redirect URIs** in Google Cloud Console
- Ensure they include: `https://<your-project-ref>.supabase.co/auth/v1/callback`

#### 2. "Invalid client" error

**Cause**: Client ID or Client Secret is incorrect.

**Fix**:
- Double-check credentials in Supabase dashboard
- Regenerate credentials in Google Cloud Console if needed

#### 3. User profile not created after OAuth login

**Cause**: The `handle_new_user()` trigger might not be set up.

**Fix**:
- Check if migration `002_user_signup_triggers.sql` has been applied
- Manually create profile if needed:
  ```sql
  SELECT handle_new_user();
  SELECT backfill_user_profiles();
  ```

#### 4. OAuth works in development but not production

**Cause**: Redirect URLs not configured for production domain.

**Fix**:
- Add production URLs to Google Cloud Console
- Add production URLs to Supabase Auth settings
- Update Site URL in Supabase to production domain

### Debug Mode

To see detailed OAuth errors:

1. Check browser console for errors
2. Check Supabase logs:
   - Go to **Logs** → **Auth Logs** in Supabase dashboard
   - Look for failed OAuth attempts
3. Check Next.js server logs:
   ```bash
   # In terminal where dev server is running
   # Look for "Error exchanging code for session"
   ```

---

## Security Considerations

### 1. Keep Credentials Secret

- **Never commit** OAuth credentials to Git
- Store in environment variables (Vercel, Railway, etc.)
- Use `.env.local` for local development (already in `.gitignore`)

### 2. Use HTTPS in Production

- OAuth providers require HTTPS for production
- Use a custom domain with SSL certificate
- Vercel/Netlify provide this automatically

### 3. Validate Redirect URLs

- Only allow known redirect URLs
- Don't use wildcards in production
- The callback route validates the session

### 4. Monitor Auth Logs

- Regularly check Supabase auth logs
- Look for suspicious login patterns
- Set up alerts for failed attempts


---

## Next Steps

Once OAuth is working:

1. **Customize user onboarding**:
   - Prompt OAuth users to select their team
   - Collect additional profile information
   - Guide users through role selection (if applicable)

2. **Update user profile trigger**:
   - Modify `handle_new_user()` to handle OAuth metadata
   - Extract name from OAuth provider data
   - Set appropriate default role

3. **Add team association**:
   - Allow users to join a team after OAuth signup
   - Implement team invitation system
   - Auto-assign role based on team context

4. **Email verification**:
   - OAuth providers verify email automatically
   - Set `email_verified: true` for OAuth users
   - Skip email verification step

5. **Analytics**:
   - Track which auth methods users prefer
   - Monitor OAuth signup vs. email signup rates
   - Optimize UX based on data

---

## Support

If you encounter issues not covered in this guide:

1. Check [Supabase OAuth Docs](https://supabase.com/docs/guides/auth/social-login)
2. Check [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
3. Check [Apple Sign In Docs](https://developer.apple.com/sign-in-with-apple/)
4. Review Supabase auth logs for specific error messages

---

## Adding Apple OAuth (Future)

If you get an Apple Developer account ($99/year) in the future, adding Apple OAuth support is straightforward:

### Code Changes Needed

1. **Update the OAuthProvider type** (`src/types/auth.ts`):
   ```typescript
   export type OAuthProvider = 'google' | 'apple';
   ```

2. **Add Apple button to LoginForm** (`src/components/auth/LoginForm.tsx`):
   - Copy the Google button
   - Change provider to 'apple'
   - Update button text and icon

3. **Add Apple button to SignupForm** (`src/components/auth/SignupForm.tsx`):
   - Same as LoginForm

4. **Configure Apple in Supabase**:
   - Follow the original setup guide (see git history for full Apple setup instructions)
   - Create App ID, Services ID, and signing key in Apple Developer Portal
   - Generate JWT secret and add to Supabase
   - Remember: Secrets expire every 6 months!

The OAuth callback handler already supports any provider, so no changes needed there.

---

**Last Updated**: 2025-10-21
**Version**: 2.0 (Google-only)
