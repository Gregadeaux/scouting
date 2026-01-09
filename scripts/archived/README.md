# Archived Development Scripts

These scripts were used during development for debugging and testing various features. They have been archived to clean up the project root directory.

## Scripts

| Script | Purpose |
|--------|---------|
| `check_user.mjs` | Debug user authentication state |
| `create-bucket.mjs` | Create Supabase storage bucket |
| `debug-storage.mjs` | Debug storage operations |
| `test-authenticated-upload.mjs` | Test authenticated file uploads |
| `test-db.js` | Test database connectivity |
| `test-existing-profile.js` | Test user profile operations |
| `test-image-upload.html` | Browser-based image upload testing |
| `test-image-upload.mjs` | Node.js image upload testing |
| `test-pit-scouting.mjs` | Test pit scouting submission |
| `test-pit-simple.mjs` | Simplified pit scouting test |
| `test-scout19.sh` | Shell script for scout testing |
| `test-signup-api.js` | Test signup API endpoint |
| `test-signup-fix.js` | Debug signup issues |
| `test-signup.js` | Basic signup flow test |
| `test-storage.mjs` | Test Supabase storage |
| `test-tba-api.ts` | Test The Blue Alliance API integration |

## Usage

These scripts may require environment variables from `.env.local`. Most are one-off debugging tools and may not work with the current codebase without modification.

## Note

For current testing, use the official test suite:
- `npm test` - Unit tests with Vitest
- `npm run test:e2e` - E2E tests with Playwright

Archived: 2026-01-09
