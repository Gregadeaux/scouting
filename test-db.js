/**
 * Test database access
 * Run with: node test-db.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yiqffkixukbyjdbbroue.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcWZma2l4dWtieWpkYmJyb3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NzUwNzgsImV4cCI6MjA3NjU1MTA3OH0.njfgZ4aBE-RnZxYvOfAd2TmwWpiKZsJHX_cYUawg5vA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabase() {
  console.log('Testing database access...');

  // Test 1: Read teams
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .limit(1);

  if (teamsError) {
    console.error('Error reading teams:', teamsError);
  } else {
    console.log('✅ Can read teams table:', teams?.length, 'records');
  }

  // Test 2: Read user_profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);

  if (profilesError) {
    console.error('Error reading user_profiles:', profilesError);
  } else {
    console.log('✅ Can read user_profiles table:', profiles?.length, 'records');
  }

  // Test 3: Check if user_profiles table accepts inserts
  const testId = 'test-' + Date.now();
  const { error: insertError } = await supabase
    .from('user_profiles')
    .insert({
      id: testId,
      email: `test-${Date.now()}@example.com`,
      role: 'scouter',
      is_active: true,
      email_verified: false,
      onboarding_completed: false
    });

  if (insertError) {
    console.error('❌ Error inserting into user_profiles:', insertError);
  } else {
    console.log('✅ Can insert into user_profiles table');

    // Clean up
    await supabase
      .from('user_profiles')
      .delete()
      .eq('id', testId);
  }
}

testDatabase();