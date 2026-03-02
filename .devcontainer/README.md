# Dev Container

This devcontainer runs the FRC Scouting app in an isolated Node 20 environment. It connects to your **remote Supabase project** — no local database required.

## First-Time Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your credentials in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Project Settings > API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase Project Settings > API
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Project Settings > API
   - `TBA_API_KEY` — from [thebluealliance.com/account](https://www.thebluealliance.com/account)
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — optional, rate limiting only

3. Start the dev server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## Notes

- `npm install` runs automatically on container creation.
- Port 3000 is forwarded and you'll get a VSCode notification when the server is ready.
- `.env.local` is gitignored — never commit it.
