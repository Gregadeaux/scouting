/**
 * Test signup API
 */

const testEmail = `testuser${Date.now()}@example.com`;

fetch('http://localhost:3000/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: testEmail,
    password: 'Test123!Pass',
    full_name: 'New Test User',
    team_number: 930
  })
})
.then(res => res.json())
.then(data => {
  console.log('Response:', data);
})
.catch(err => {
  console.error('Error:', err);
});