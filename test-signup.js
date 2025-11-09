/**
 * Direct test of Supabase signup
 * Run with: node test-signup.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yiqffkixukbyjdbbroue.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcWZma2l4dWtieWpkYmJyb3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NzUwNzgsImV4cCI6MjA3NjU1MTA3OH0.njfgZ4aBE-RnZxYvOfAd2TmwWpiKZsJHX_cYUawg5vA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test123!Pass';

  console.log('Testing signup with:', { email: testEmail });

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          team_number: 930,
          role: 'scouter'
        }
      }
    });

    if (error) {
      console.error('Signup error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('Signup success!', data);
    }
  } catch (err) {
    console.error('Caught error:', err);
  }
}

testSignup();