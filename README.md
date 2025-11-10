# FRC Scouting System - Championship Level

A production-ready FIRST Robotics Competition scouting and analytics platform built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. **Based on research from championship-winning teams like 1678 (Citrus Circuits)**, implementing proven patterns for multi-scout data collection, season-agnostic architecture, and predictive analytics.

## 🏆 Championship-Level Features

- **PostgreSQL + JSONB Hybrid Architecture** - Future-proof design separates evergreen data (teams, matches) from season-specific metrics
- **Multi-Scout Support** - Team 1678-style consolidation with 3 scouts per robot, majority voting, and weighted averaging
- **Predictive Analytics** - OPR, DPR, CCWM calculations for strategic alliance selection
- **Season-Agnostic Design** - Adapts to new games without schema changes using flexible JSONB columns
- **Offline-First** - QR code and sync queue support for unreliable venue WiFi
- **Configuration-Driven** - Non-programmers can adapt to new seasons by editing config files

## 📊 Architecture: Structure the Evergreen, Flex the Specific

This system implements the core insight from analyzing dozens of championship-level scouting systems:

> **60-70% of scouting data remains consistent across seasons** (team identification, match structure, reliability metrics)
> **30-40% changes annually** with new game mechanics

### Core Relational Tables (Never Change)
- `teams` - FRC team identification (team numbers assigned at registration)
- `events` - Competition structure (regionals, districts, championships)
- `match_schedule` - 3v3 alliance composition, official results from The Blue Alliance
- `season_config` - Yearly game definitions and validation schemas

### Hybrid Scouting Tables (JSONB Flexibility)
- `match_scouting` - Multi-scout observations with JSONB for auto/teleop/endgame
- `pit_scouting` - Pre-competition robot assessment with capabilities in JSONB
- `team_statistics` - Calculated OPR/DPR/CCWM and pick list rankings

### Support Infrastructure
- `sync_queue` - Offline data synchronization for QR codes
- `consolidated_match_data` (view) - Multi-scout aggregation with majority voting

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Supabase account and project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Supabase:
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the contents of `supabase-schema.sql`
   - Copy your project URL and API keys from Project Settings > API

3. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

### E2E Test Setup

The project uses Playwright for end-to-end testing. Test credentials are managed via environment variables for security.

1. **Configure test credentials**:
```bash
cp .env.test.example .env.test
```

Edit `.env.test` with valid test user credentials:
```env
# Test User Credentials (regular scouter)
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=YourTestPassword123!

# Test Admin Credentials (admin user)
TEST_ADMIN_EMAIL=your-admin@example.com
TEST_ADMIN_PASSWORD=YourAdminPassword123!
```

**Important**:
- `.env.test` is gitignored and should NEVER be committed to version control
- These should be actual credentials for a test user in your Supabase project
- Create dedicated test accounts - do not use production credentials

2. **Run tests**:
```bash
# Run all E2E tests
npm run test:e2e

# Run tests with PWA/service worker enabled
npm run test:e2e:pwa

# Run unit tests
npm test

# Run unit tests with coverage
npm run test:coverage
```

3. **Create test users in Supabase**:
   - Go to Authentication > Users in your Supabase dashboard
   - Create a test user with the email from your `.env.test`
   - Assign appropriate role in the `users` table
   - Add team membership in `user_teams` table if needed

### Test Structure

```
tests/
├── e2e/                      # Playwright E2E tests
│   ├── auth/                # Authentication tests
│   ├── helpers/             # Test utilities
│   └── *.spec.ts           # Test files
├── helpers/                 # Shared test helpers
└── *.spec.ts               # Additional test files
```

## 📁 Project Structure

```
frc-scouting-system/
├── supabase-schema.sql          # Championship-level database schema
├── scouting_research.md          # Research document (Team 1678 analysis)
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # REST API endpoints
│   │   │   ├── teams/           # Team management
│   │   │   ├── matches/         # Match schedule
│   │   │   └── scouting/        # Scouting data submission
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/ui/            # Reusable React components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   ├── lib/                      # Core utilities
│   │   ├── config/              # Season configurations
│   │   │   └── season-2025.ts   # 2025 Reefscape config
│   │   ├── supabase/            # Database utilities
│   │   │   ├── client.ts        # Client-side Supabase
│   │   │   ├── server.ts        # Server-side Supabase
│   │   │   ├── validation.ts    # JSONB validation
│   │   │   └── consolidation.ts # Multi-scout consolidation
│   │   ├── api/                 # API helpers
│   │   │   └── response.ts      # Standard responses
│   │   ├── analytics/           # Predictive metrics (TODO)
│   │   └── sync/                # Offline sync (TODO)
│   └── types/                    # TypeScript definitions
│       ├── index.ts             # Core types
│       └── season-2025.ts       # 2025 season-specific types
├── public/                       # Static assets
└── .env.local                    # Environment variables (gitignored)
```

## 🎮 2025 Reefscape Game

### Game Elements
- **Coral** (PVC pipes) and **Algae** (inflatable balls) - Two game piece types
- **Reef** structures with levels (L1-L4) for scoring
- **Processors** for game piece management
- **Nets** for Algae scoring
- **Endgame**: Barge parking (shallow/deep) or Cage climbing (low/mid/high) with suspension bonus

### Data Collection Structure

**Autonomous Period (15s):**
```typescript
{
  schema_version: "2025.1",
  left_starting_zone: true,
  coral_scored_reef: 2,
  algae_scored_net: 1,
  reef_level_achieved: "L3",
  // ... more fields
}
```

**Teleoperated Period (2:15):**
```typescript
{
  schema_version: "2025.1",
  coral_scored_reef: 8,
  algae_scored_net: 3,
  cycles_completed: 12,
  cycle_time_avg_seconds: 9.8,
  // ... pickup locations, defense, etc.
}
```

**Endgame Period:**
```typescript
{
  schema_version: "2025.1",
  barge_successful: true,
  barge_position: "deep",
  cage_climb_successful: false,
  suspension_successful: false,
  endgame_points: 8,
}
```

## 🔧 Key Workflows

### Multi-Scout Data Collection

1. **Multiple scouts observe same robot** (recommended: 3 scouts per robot like Team 1678)
2. Each scout submits observations independently
3. **Consolidation algorithms merge data:**
   - Majority voting for booleans (robot_disconnected, yellow_card, etc.)
   - Weighted averaging for numeric values (scores, cycle times)
   - Combined notes from all scouts

```typescript
import { consolidateMatchScoutingObservations } from '@/lib/supabase/consolidation';

// Get all observations for Team 930 in Match 15
const observations = await supabase
  .from('match_scouting')
  .select('*')
  .eq('match_id', matchId)
  .eq('team_number', 930);

// Consolidate multiple scout observations
const consolidated = consolidateMatchScoutingObservations(observations.data);
```

## 🌐 The Blue Alliance (TBA) Integration

This system includes a comprehensive integration with [The Blue Alliance API](https://www.thebluealliance.com/apidocs) for automatic event data import.

### Features

- **Automated Data Import**: Import teams, match schedules, and results from TBA with one click
- **Background Processing**: Import jobs run asynchronously with real-time progress tracking
- **Smart Merge**: TBA data is intelligently merged with local data, preserving custom fields
- **Conflict Resolution**: Configurable strategies for handling data conflicts
- **Rate Limiting**: Respects TBA's API limits (100 requests per 60 seconds)
- **Error Handling**: Comprehensive error recovery with detailed logging

### Setup

1. **Obtain TBA API Key**
   - Visit https://www.thebluealliance.com/account
   - Generate a Read API Key
   - Add to `.env.local`:
     ```bash
     TBA_API_KEY=your_api_key_here
     ```

2. **Apply Database Migration**
   - The `import_jobs` table tracks import progress
   - Migration file: `supabase/migrations/005_import_jobs.sql`
   - Apply via Supabase Dashboard or CLI

3. **Configure Worker** (Optional)
   - Import jobs can be processed manually via API endpoint
   - Or set up a cron job to call `/api/admin/workers/process-imports`
   - Recommended: Every 1-5 minutes during events

### Usage

#### Admin Panel Import Flow

1. Navigate to an event detail page: `/admin/events/[eventKey]`
2. Click "Import from TBA" button
3. Select what to import:
   - **Teams**: Team information (number, name, location, rookie year)
   - **Match Schedule**: All scheduled matches with alliances
   - **Results**: Match scores (only for completed matches)
4. Click "Start Import"
5. Monitor progress in real-time
6. Review warnings if any items failed to import

#### Manual Import via API

```bash
# Start import job
curl -X POST http://localhost:3000/api/admin/events/2025txaus/import-tba \
  -H "Content-Type: application/json" \
  -d '{"importTeams":true,"importMatches":true,"importResults":false}'

# Returns: {"success":true,"data":{"job_id":"..."}}

# Check job status
curl http://localhost:3000/api/admin/import-jobs/{JOB_ID}

# Process pending jobs (trigger worker)
curl -X POST http://localhost:3000/api/admin/workers/process-imports
```

### Architecture

The TBA integration follows a service-oriented architecture with SOLID principles:

```
TBA API
   ↓
TBAApiService (Phase 1)
   ↓
ImportService (Phase 3)
   ↓
Repositories (Phase 2) → MergeStrategies (Phase 2)
   ↓
Database (Supabase)
   ↓
API Routes (Phase 4)
   ↓
React Components (Phase 5)
```

**Key Components:**

- **TBAApiService**: HTTP client with rate limiting and retry logic
- **ImportService**: Orchestrates background import jobs
- **MergeStrategies**: Smart data merging (Team, Event, Match)
- **Repositories**: Data access layer with CRUD operations
- **API Routes**: Thin controllers exposing service functionality
- **React Components**: Presentation layer with real-time updates

### Data Flow

1. **Import Initiated**: User clicks "Import from TBA" in admin panel
2. **Job Created**: API creates `import_job` record with status='pending'
3. **Worker Triggered**: Background worker picks up pending job
4. **TBA Fetch**: Service fetches data from TBA API with rate limiting
5. **Data Merge**: MergeStrategies combine TBA data with local customizations
6. **Database Update**: Repositories perform bulk upsert operations
7. **Progress Tracking**: Job progress updated throughout process
8. **Completion**: Job marked complete/failed, UI refreshes data

### Smart Merge Behavior

The system uses intelligent merge strategies to preserve local data:

**Teams:**
- TBA is source of truth for: name, location, rookie year, website
- Local data preserved: notes, custom fields, internal IDs

**Matches:**
- TBA is source of truth for: schedule, scores, alliances
- Local data preserved: scouting data, assignments, notes

**Events:**
- TBA is source of truth for: all official event data
- Conflicts rare since events are centrally managed

### Error Handling

Import jobs handle errors gracefully:

- **TBA API Errors**: Logged, job marked failed with error message
- **Rate Limits**: Automatic backoff and retry
- **Partial Failures**: Individual item failures logged as warnings, import continues
- **Network Errors**: Retried with exponential backoff (3 attempts)
- **Validation Errors**: Logged, item skipped, import continues

### Performance Considerations

- **Bulk Operations**: Teams and matches inserted in batches for efficiency
- **Parallel Fetching**: Multiple TBA API calls when rate limits allow
- **Pagination**: Large datasets fetched in pages
- **Caching**: Consider adding Redis cache for frequently accessed TBA data (future enhancement)

### Monitoring

Import jobs store detailed metrics:

- Total items to process
- Items processed successfully
- Progress percentage
- Warnings (non-fatal errors)
- Fatal errors
- Processing time

Access via:
- Admin panel UI (real-time progress display)
- Database queries on `import_jobs` table
- API endpoint: `/api/admin/import-jobs/[jobId]`

### Troubleshooting

**Import job stuck in 'pending':**
- Ensure worker endpoint is being called
- Check logs for errors
- Manually trigger: `POST /api/admin/workers/process-imports`

**TBA API errors:**
- Verify API key is valid and not rate-limited
- Check TBA status: https://www.thebluealliance.com/
- Review error messages in import job details

**Data not showing after import:**
- Check import job status and warnings
- Verify event_key matches TBA format (e.g., "2025txaus")
- Check database directly for imported records

### Season Transition (2025 → 2026)

**Non-programmers can adapt to new games!**

1. Edit `src/lib/config/season-2026.ts`:
   - Update game name and description
   - Define new field definitions for forms
   - Update JSON schemas for validation

2. Create `src/types/season-2026.ts`:
   - Define new game piece types
   - Create interfaces for auto/teleop/endgame

3. Run database migration:
```sql
INSERT INTO season_config (year, game_name, ...) VALUES (2026, 'NewGame', ...);
```

**That's it!** The JSONB columns adapt automatically. No schema migrations required.

## 📊 Analytics & Statistics

### Predictive Metrics (Team 1678 Methodology)

- **OPR** (Offensive Power Rating) - Expected point contribution
- **DPR** (Defensive Power Rating) - Expected defensive impact
- **CCWM** (Calculated Contribution to Winning Margin) - Overall value

### Pick List Generation

Statistics are calculated per team per event:
- Endgame success rates
- Auto mobility rates
- Reliability scores (disconnections, fouls)
- First/second pick ability rankings

Query the `team_statistics` table or `consolidated_match_data` view for analytics dashboards.

## 🔌 API Endpoints

### Teams
- `GET /api/teams` - List all teams (pagination supported)
- `POST /api/teams` - Create new team

### Match Schedule
- `GET /api/matches` - List matches (filter by event)
- `POST /api/matches` - Create match

### Scouting Data
- `GET /api/scouting` - Query scouting observations (filter by team, match, scout)
- `POST /api/scouting` - Submit scouting observation

All endpoints return standardized JSON responses:
```json
{
  "success": true,
  "data": { ... }
}
```

## 🛠️ Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build production bundle
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript compilation check
npm run format       # Format code with Prettier
```

## 📚 Documentation

- **[SCHEMA.md](./SCHEMA.md)** - Complete database schema documentation
- **[SCOUT_GUIDE.md](./SCOUT_GUIDE.md)** - Scout training materials and best practices
- **[scouting_research.md](./scouting_research.md)** - Research analysis from championship teams

## 🎯 Next Steps

### Immediate Implementation Priorities

1. **Build scouting forms** using field definitions from `src/lib/config/season-2025.ts`
2. **Implement API routes** for match scouting submission and retrieval
3. **Create analytics dashboard** displaying OPR/DPR/CCWM rankings
4. **Set up offline sync** with QR code generation for unreliable WiFi
5. **Deploy to Vercel** with environment variables configured

### Optional Enhancements

- The Blue Alliance API integration for automatic match schedule imports
- Real-time dashboard updates using Supabase Realtime
- Mobile-optimized scouting forms (PWA)
- Pick list editor with drag-and-drop alliance simulation
- Historical cross-season analysis comparing team performance

## 🏗️ Architecture Decisions

### Why PostgreSQL + JSONB over MongoDB?

**Pros:**
- ACID compliance and data integrity constraints
- Powerful relational joins for cross-table queries
- GIN indexes make JSONB queries as fast as MongoDB
- Single database technology (Supabase provides PostgreSQL)
- Familiar SQL for most developers

**Cons:**
- Slightly more complex schema design vs pure document store
- Need to understand JSON operators (`->`, `->>`, `@>`)

### Why Supabase over Firebase?

- **PostgreSQL** is more powerful than Firestore for complex queries
- **Row Level Security (RLS)** provides fine-grained access control
- **Realtime** subscriptions like Firebase
- **Storage** and **Auth** built-in
- **Open source** - can self-host if needed

## 🤝 Contributing

This scouting system implements patterns proven by championship-winning teams. Contributions should maintain:

1. **Season-agnostic architecture** - Don't hardcode 2025 game logic outside config files
2. **Type safety** - All JSONB data has TypeScript interfaces
3. **Multi-scout support** - Consolidation must remain functional
4. **Configuration-driven** - Non-programmers should be able to adapt to 2026

## 📖 Research Credits

This system is based on published research and whitepapers from:

- **Team 1678 (Citrus Circuits)** - Multi-scout consolidation algorithms
- **FReCon, ScoutRadioz, Peregrine** - Season-agnostic architectures
- **The Blue Alliance** - Standardized data schemas

See [scouting_research.md](./scouting_research.md) for full analysis.

## 📄 License

MIT

## 🆘 Support

- **FRC Technical Questions**: [Chief Delphi Forums](https://www.chiefdelphi.com/)
- **Database/Supabase Issues**: [Supabase Discussions](https://github.com/supabase/supabase/discussions)
- **System Issues**: Open an issue in this repository

---

**Built for Team 930** | Powered by Next.js 15 + Supabase | Based on Championship-Level Research
