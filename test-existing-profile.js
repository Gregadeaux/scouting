/**
 * Check existing user profile
 * Run with: node test-existing-profile.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yiqffkixukbyjdbbroue.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcWZma2l4dWtieWpkYmJyb3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NzUwNzgsImV4cCI6MjA3NjU1MTA3OH0.njfgZ4aBE-RnZxYvOfAd2TmwWpiKZsJHX_cYUawg5vA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfile() {
  // Known user ID from the login test
  const userId = 'f207a3c9-fc37-460f-b2ff-057f72f517e3';

  console.log('Checking profile for user:', userId);

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
  } else {
    console.log('Profile found:', profile);
  }

  // Check all profiles
  const { data: allProfiles, error: allError } = await supabase
    .from('user_profiles')
    .select('id, email, role, created_at');

  if (allError) {
    console.error('Error fetching all profiles:', allError);
  } else {
    console.log('\nAll profiles in database:', allProfiles);
  }
}

checkProfile();