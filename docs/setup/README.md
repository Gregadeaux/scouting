# Setup Guides

Step-by-step guides for configuring your FRC Scouting System development environment.

## Quick Start (First Time Setup)

Follow these guides in order:

1. **[Supabase Setup](./supabase.md)** ⭐ Start here
   - Database connection configuration
   - Authentication provider setup
   - Environment variables
   - Testing your connection

2. **[Admin Setup](./admin.md)**
   - Admin dashboard configuration
   - User roles and permissions
   - Creating your first admin user

3. **[Storage Setup](./storage.md)**
   - Supabase Storage buckets for robot photos
   - File upload configuration
   - Access policies

4. **[Audit Log Setup](./audit-log.md)** (Optional)
   - Security audit logging
   - Tracking admin actions

## Setup Checklist

### Core Requirements
- [ ] Node.js 18+ installed
- [ ] Supabase account created
- [ ] Project cloned from repository
- [ ] Dependencies installed (`npm install`)

### Database Setup
- [ ] Supabase project created
- [ ] Database schema applied (`supabase-schema.sql`)
- [ ] Environment variables configured (`.env.local`)
- [ ] Connection tested (`npm run test:db`)

### Authentication Setup
- [ ] Email provider enabled in Supabase
- [ ] Redirect URLs configured
- [ ] Auth migration applied
- [ ] First admin user created

### Feature Setup
- [ ] Admin dashboard accessible
- [ ] Storage buckets created
- [ ] Audit logging enabled (optional)

## Troubleshooting

If you encounter issues during setup:

1. **Check Prerequisites**: Ensure Node.js 18+ and npm are installed
2. **Verify Environment**: Confirm `.env.local` has correct Supabase credentials
3. **Database Connection**: Run `npm run test:db` to verify connection
4. **Clear Cache**: Try `rm -rf .next && npm run dev`
5. **Check Logs**: Review console output and Supabase logs

## Common Issues

### "Cannot connect to Supabase"
- Verify Project URL in `.env.local`
- Check Supabase project is not paused
- Ensure API keys are correct

### "Permission denied"
- Check Row Level Security policies in Supabase
- Verify user has correct role in `user_profiles` table
- Review auth migration was applied

### "Missing environment variables"
- Ensure `.env.local` exists in project root
- Restart dev server after changing environment variables
- Check all required variables are set

## Next Steps

After completing setup:

- **[Admin Quick Start](/docs/features/admin/quick-start.md)** - Learn to use the admin dashboard
- **[Authentication Guide](/docs/features/auth/guide.md)** - Understand the auth system
- **[Pit Scouting](/docs/features/pit-scouting/)** - Start scouting robots

---

**Last Updated**: 2025-10-24
