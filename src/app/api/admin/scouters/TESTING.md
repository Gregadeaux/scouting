# Testing Scouters API Routes

Quick reference for testing the scouters management API endpoints.

## Prerequisites

1. **Admin User**: Login credentials for testing: `gregadeaux@gmail.com` : `Gerg2010`
2. **Local Server**: Start dev server with `npm run dev`
3. **Database**: Ensure Supabase is running with migrations applied

---

## Test Users

You'll need existing users in `user_profiles` to create scouter profiles:

```sql
-- Check existing users
SELECT id, email, full_name, role FROM user_profiles LIMIT 5;
```

---

## Test Data Setup

### 1. Create Test Users (if needed)

```sql
-- Insert test users via Supabase dashboard or API
INSERT INTO user_profiles (id, email, full_name, display_name, role, is_active, primary_team_number)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'test.scout1@example.com', 'Test Scout 1', 'Scout1', 'scouter', true, 930),
  ('22222222-2222-2222-2222-222222222222', 'test.scout2@example.com', 'Test Scout 2', 'Scout2', 'scouter', true, 930),
  ('33333333-3333-3333-3333-333333333333', 'test.scout3@example.com', 'Test Scout 3', 'Scout3', 'scouter', true, NULL);
```

---

## Manual Testing with Browser Console

### Step 1: Login as Admin

```javascript
// Open browser console on http://localhost:3000
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'gregadeaux@gmail.com',
    password: 'Gerg2010'
  }),
  credentials: 'include'
});
const loginData = await loginResponse.json();
console.log('Login:', loginData);
```

### Step 2: List Scouters (Empty Initially)

```javascript
const listResponse = await fetch('/api/admin/scouters?limit=20', {
  credentials: 'include'
});
const listData = await listResponse.json();
console.log('Scouters:', listData);
```

### Step 3: Create First Scouter

```javascript
const createResponse = await fetch('/api/admin/scouters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    user_id: '11111111-1111-1111-1111-111111111111', // Replace with real user_id
    experience_level: 'rookie',
    team_number: 930,
    preferred_role: 'match_scouting',
    certifications: ['match_certified'],
    availability_notes: 'Available weekends only'
  })
});
const createData = await createResponse.json();
console.log('Created:', createData);
// Save the ID: const scouterId = createData.data.id;
```

### Step 4: Get Scouter

```javascript
const scouterId = 'YOUR_SCOUTER_ID_FROM_CREATE'; // Replace
const getResponse = await fetch(`/api/admin/scouters/${scouterId}`, {
  credentials: 'include'
});
const getData = await getResponse.json();
console.log('Scouter:', getData);
```

### Step 5: Update Scouter

```javascript
const updateResponse = await fetch(`/api/admin/scouters/${scouterId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    experience_level: 'intermediate',
    certifications: ['match_certified', 'pit_certified'],
    availability_notes: 'Now available weeknights too'
  })
});
const updateData = await updateResponse.json();
console.log('Updated:', updateData);
```

### Step 6: Test Filters

```javascript
// Filter by experience level
const filterResponse = await fetch('/api/admin/scouters?experience_level=intermediate', {
  credentials: 'include'
});
console.log('Filtered:', await filterResponse.json());

// Filter by team
const teamResponse = await fetch('/api/admin/scouters?team_number=930', {
  credentials: 'include'
});
console.log('Team 930:', await teamResponse.json());

// Search by name
const searchResponse = await fetch('/api/admin/scouters?search=Test', {
  credentials: 'include'
});
console.log('Search:', await searchResponse.json());
```

### Step 7: Bulk Import

```javascript
const importResponse = await fetch('/api/admin/scouters/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    scouters: [
      {
        email: 'test.scout2@example.com',
        experience_level: 'veteran',
        team_number: 930,
        preferred_role: 'both',
        certifications: ['pit_certified', 'match_certified', 'lead_scout']
      },
      {
        email: 'test.scout3@example.com',
        experience_level: 'rookie'
      }
    ]
  })
});
const importData = await importResponse.json();
console.log('Import Result:', importData);
```

### Step 8: Delete Scouter (Cleanup)

```javascript
const deleteResponse = await fetch(`/api/admin/scouters/${scouterId}`, {
  method: 'DELETE',
  credentials: 'include'
});
const deleteData = await deleteResponse.json();
console.log('Deleted:', deleteData);
```

---

## Test with curl

### Setup

```bash
# Login and save cookie
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gregadeaux@gmail.com","password":"Gerg2010"}'
```

### List Scouters

```bash
curl -b cookies.txt http://localhost:3000/api/admin/scouters
```

### Create Scouter

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/admin/scouters \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "11111111-1111-1111-1111-111111111111",
    "experience_level": "rookie",
    "team_number": 930,
    "preferred_role": "match_scouting",
    "certifications": ["match_certified"]
  }'
```

### Get Scouter

```bash
curl -b cookies.txt http://localhost:3000/api/admin/scouters/SCOUTER_ID
```

### Update Scouter

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/admin/scouters/SCOUTER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "experience_level": "intermediate",
    "certifications": ["match_certified", "pit_certified"]
  }'
```

### Delete Scouter

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/admin/scouters/SCOUTER_ID
```

---

## Validation Test Cases

### Test Invalid Experience Level

```javascript
const invalidExp = await fetch('/api/admin/scouters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 'VALID_USER_ID',
    experience_level: 'expert' // Invalid - should be rookie/intermediate/veteran
  })
});
// Expected: 400 with error message
```

### Test Invalid Preferred Role

```javascript
const invalidRole = await fetch('/api/admin/scouters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 'VALID_USER_ID',
    experience_level: 'rookie',
    preferred_role: 'invalid_role' // Invalid
  })
});
// Expected: 400 with error message
```

### Test Duplicate User

```javascript
// Create scouter for user
const first = await fetch('/api/admin/scouters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 'VALID_USER_ID',
    experience_level: 'rookie'
  })
});

// Try to create another scouter for same user
const duplicate = await fetch('/api/admin/scouters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 'VALID_USER_ID',
    experience_level: 'veteran'
  })
});
// Expected: 409 Conflict
```

### Test Non-existent User

```javascript
const nonExistent = await fetch('/api/admin/scouters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    user_id: '00000000-0000-0000-0000-000000000000',
    experience_level: 'rookie'
  })
});
// Expected: 404 Not Found
```

### Test Invalid Certifications

```javascript
const invalidCerts = await fetch('/api/admin/scouters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 'VALID_USER_ID',
    experience_level: 'rookie',
    certifications: ['invalid_cert', 'another_invalid'] // Invalid
  })
});
// Expected: 400 with error message
```

---

## Pagination Test

```javascript
// Create multiple scouters first (or use bulk import)
// Then test pagination

// Page 1
const page1 = await fetch('/api/admin/scouters?limit=2&page=1', {
  credentials: 'include'
});
const p1Data = await page1.json();
console.log('Page 1:', p1Data.pagination);

// Page 2
const page2 = await fetch('/api/admin/scouters?limit=2&page=2', {
  credentials: 'include'
});
const p2Data = await page2.json();
console.log('Page 2:', p2Data.pagination);

// Verify has_more
console.log('Has more:', p1Data.pagination.has_more);
```

---

## Bulk Import Test Cases

### Valid Import

```javascript
const validImport = await fetch('/api/admin/scouters/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    scouters: [
      {
        email: 'user1@example.com',
        experience_level: 'rookie'
      },
      {
        email: 'user2@example.com',
        experience_level: 'intermediate',
        team_number: 930
      }
    ]
  })
});
const result = await validImport.json();
console.log('Import:', result);
// Check: result.imported, result.failed, result.errors
```

### Partial Failure

```javascript
const partialImport = await fetch('/api/admin/scouters/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    scouters: [
      {
        email: 'valid@example.com',
        experience_level: 'rookie'
      },
      {
        email: 'nonexistent@example.com', // Will fail
        experience_level: 'veteran'
      },
      {
        email: 'valid@example.com', // Will fail - duplicate
        experience_level: 'intermediate'
      }
    ]
  })
});
const partialResult = await partialImport.json();
console.log('Partial Import:', partialResult);
// Expected: 207 status, some imported, some failed with error details
```

---

## Performance Test

### Create 50 Scouters via Import

```javascript
// Assumes you have 50 users in user_profiles
const users = []; // Array of 50 user emails
const scouters = users.map(email => ({
  email,
  experience_level: 'rookie'
}));

const bulkResponse = await fetch('/api/admin/scouters/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ scouters })
});

const bulkResult = await bulkResponse.json();
console.log('Bulk create:', bulkResult);
console.log('Time:', bulkResult.time); // If you add timing to response
```

---

## Database Verification

After creating/updating scouters, verify in database:

```sql
-- View all scouters
SELECT
  s.*,
  up.email,
  up.full_name,
  t.team_name
FROM scouters s
JOIN user_profiles up ON up.id = s.user_id
LEFT JOIN teams t ON t.team_number = s.team_number
ORDER BY s.created_at DESC;

-- Check certifications (JSONB)
SELECT
  email,
  certifications,
  jsonb_array_length(certifications) as cert_count
FROM scouters s
JOIN user_profiles up ON up.id = s.user_id;

-- Verify auto-increment counters
SELECT
  email,
  total_matches_scouted,
  total_events_attended
FROM scouters s
JOIN user_profiles up ON up.id = s.user_id;
```

---

## Cleanup After Testing

```sql
-- Delete test scouters
DELETE FROM scouters
WHERE user_id IN (
  SELECT id FROM user_profiles
  WHERE email LIKE 'test.scout%@example.com'
);

-- Or delete all scouters
TRUNCATE TABLE scouters CASCADE;
```

---

## Automated Test Script

Save as `test-scouters-api.js`:

```javascript
const baseUrl = 'http://localhost:3000';
let cookies = '';

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'gregadeaux@gmail.com',
      password: 'Gerg2010'
    })
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    cookies = setCookie.split(';')[0];
  }

  console.log('✅ Logged in');
}

async function testList() {
  const response = await fetch(`${baseUrl}/api/admin/scouters`, {
    headers: { Cookie: cookies }
  });
  const data = await response.json();
  console.log('✅ List:', data.data.length, 'scouters');
  return data;
}

async function testCreate(userId) {
  const response = await fetch(`${baseUrl}/api/admin/scouters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies
    },
    body: JSON.stringify({
      user_id: userId,
      experience_level: 'rookie',
      team_number: 930,
      certifications: ['match_certified']
    })
  });
  const data = await response.json();
  console.log('✅ Created:', data.data.id);
  return data.data.id;
}

async function testUpdate(scouterId) {
  const response = await fetch(`${baseUrl}/api/admin/scouters/${scouterId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies
    },
    body: JSON.stringify({
      experience_level: 'intermediate',
      certifications: ['match_certified', 'pit_certified']
    })
  });
  const data = await response.json();
  console.log('✅ Updated:', data.success);
}

async function testDelete(scouterId) {
  const response = await fetch(`${baseUrl}/api/admin/scouters/${scouterId}`, {
    method: 'DELETE',
    headers: { Cookie: cookies }
  });
  const data = await response.json();
  console.log('✅ Deleted:', data.success);
}

async function runTests() {
  try {
    await login();
    await testList();

    // Note: Replace with actual user_id from your database
    const userId = '11111111-1111-1111-1111-111111111111';
    const scouterId = await testCreate(userId);
    await testUpdate(scouterId);
    await testDelete(scouterId);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();
```

Run with:
```bash
node test-scouters-api.js
```

---

## Troubleshooting

### 401 Unauthorized
- Check that you're logged in
- Cookie may have expired - login again
- Verify `credentials: 'include'` in fetch options

### 403 Forbidden
- User is not admin
- Check user role: `SELECT role FROM user_profiles WHERE email = 'your@email.com'`

### 404 User Not Found
- User doesn't exist in `user_profiles`
- Check: `SELECT id FROM user_profiles WHERE id = 'YOUR_UUID'`

### 409 Duplicate
- User already has a scouter profile
- Check: `SELECT * FROM scouters WHERE user_id = 'YOUR_UUID'`

### 500 Server Error
- Check server console for error details
- Verify database connection
- Check Supabase logs

---

## Next Steps

After manual testing:
1. Create E2E tests with Playwright (`/tests/e2e/admin/scouters.spec.ts`)
2. Build frontend UI (`/src/app/admin/scouters/page.tsx`)
3. Create React hooks (`/src/hooks/useScouters.ts`)
