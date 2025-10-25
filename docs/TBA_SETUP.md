# The Blue Alliance Integration Setup Guide

This guide walks through setting up the TBA integration for the FRC Scouting System.

## Prerequisites

- Supabase project configured
- Admin access to the scouting system
- TBA account (free)

## Step 1: Get TBA API Key

1. Visit https://www.thebluealliance.com/account
2. Log in or create an account
3. Navigate to "Account" → "Read API Keys"
4. Click "Create New Key"
5. Give it a description (e.g., "FRC Scouting System - Development")
6. Save the generated key securely

## Step 2: Configure Environment

Add your TBA API key to the environment file:

```bash
# .env.local
TBA_API_KEY=your_api_key_here_from_step_1
```

**Security Note:** Never commit `.env.local` to version control. The `.gitignore` file already excludes it.

## Step 3: Apply Database Migration

The import jobs table must exist in your database.

**Option A: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/005_import_jobs.sql`
3. Copy the SQL content
4. Paste into SQL Editor
5. Click "Run"

**Option B: Supabase CLI**
```bash
supabase db push
```

## Step 4: Verify Setup

Test your TBA integration:

```bash
# Start development server
npm run dev

# Test TBA API connectivity (create this test file)
npx tsx test-tba-api.ts
```

If successful, you should see:
```
✅ TBA API connection successful
✅ Event data retrieved
✅ Teams data retrieved
✅ Matches data retrieved
```

## Step 5: Test Import Flow

1. Navigate to admin panel: http://localhost:3000/admin/events
2. Click on an event (or create one with a valid TBA event key like "2025txaus")
3. Click "Import from TBA"
4. Select import options and start
5. Watch the progress bar
6. Verify data appears after import completes

## Step 6: Setup Worker (Production)

For production, set up automated background processing:

**Option A: Vercel Cron Jobs**

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/workers/process-imports",
    "schedule": "*/2 * * * *"
  }]
}
```

This runs the worker every 2 minutes.

**Option B: External Cron Service**

Use a service like cron-job.org or GitHub Actions:
```bash
curl -X POST https://your-domain.com/api/admin/workers/process-imports \
  -H "Authorization: Bearer ${WORKER_SECRET}"
```

Schedule to run every 1-5 minutes.

**Option C: Manual Trigger**

For small deployments, manually trigger imports:
```bash
curl -X POST http://localhost:3000/api/admin/workers/process-imports
```

## Troubleshooting

### Error: "TBA_API_KEY is not configured"

- Ensure `.env.local` contains your API key
- Restart the development server after adding the key
- Verify no typos in the environment variable name

### Error: "Import job stuck in 'pending'"

- The worker needs to be triggered
- Call POST `/api/admin/workers/process-imports`
- Or wait for cron job to run

### Error: "Failed to fetch from TBA API"

- Check TBA service status: https://www.thebluealliance.com/
- Verify API key is valid (not expired or revoked)
- Check rate limiting (max 100 requests per 60 seconds)

### Error: "Event not found on TBA"

- Verify event key format (e.g., "2025txaus" not "2025-txaus")
- Check event exists on TBA: https://www.thebluealliance.com/event/2025txaus
- Ensure year matches (2025 events in 2025 database)

## Testing TBA Connectivity

Create a test file `test-tba-api.ts`:

```typescript
// test-tba-api.ts
import { TBAApiService } from './src/services/tba/TBAApiService';

async function testTBA() {
  const service = new TBAApiService();

  try {
    // Test event fetch
    const event = await service.getEvent('2025txaus');
    console.log('✅ Event data retrieved:', event.name);

    // Test teams fetch
    const teams = await service.getEventTeams('2025txaus');
    console.log('✅ Teams data retrieved:', teams.length, 'teams');

    // Test matches fetch
    const matches = await service.getEventMatches('2025txaus');
    console.log('✅ Matches data retrieved:', matches.length, 'matches');

    console.log('\n✅ TBA API connection successful!');
  } catch (error) {
    console.error('❌ TBA API test failed:', error);
    process.exit(1);
  }
}

testTBA();
```

Run with:
```bash
npx tsx test-tba-api.ts
```

## Next Steps

- Set up monitoring for import job failures
- Configure alerts for TBA API errors
- Add caching layer for frequently accessed data (optional)
- Test with multiple concurrent imports

## Performance Tips

1. **Batch Operations**: Import jobs process data in batches for efficiency
2. **Rate Limiting**: The system respects TBA's 100 req/60s limit automatically
3. **Background Processing**: Imports run asynchronously to not block the UI
4. **Progress Tracking**: Real-time updates keep users informed

## Security Considerations

1. **API Key Storage**: Keep TBA API key in environment variables only
2. **Worker Endpoints**: Protect worker endpoints in production
3. **Data Validation**: All imported data is validated before insertion
4. **Error Logging**: Sensitive data is not logged in errors

## Support Resources

- **TBA API Documentation**: https://www.thebluealliance.com/apidocs/v3
- **TBA Status Page**: https://www.thebluealliance.com/
- **Main Documentation**: See README.md for architecture details
- **Database Schema**: See supabase-schema.sql for table structures

---

**Need Help?**

- Check logs in Supabase Dashboard → Logs
- Review import job warnings in database
- Consult main README for architecture details
- File an issue with specific error messages and context