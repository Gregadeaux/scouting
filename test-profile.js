const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yiqffkixukbyjdbbroue.supabase.co';
const supabaseServiceKey = 'sb_secret_wgMPYQWGm-kO1T9LY3hjHA_3NlTqKCY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfileInsert() {
  const testId = require('crypto').randomUUID();
  const timestamp = Date.now();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: testId,
      email: `testprofile${timestamp}@example.com`,
      full_name: 'Test Profile',
      display_name: 'Test Display',
      role: 'scouter',
      is_active: true,
      email_verified: false,
      onboarding_completed: false,
      preferred_scout_name: 'Test Scout'
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting profile:', error);
  } else {
    console.log('Profile created successfully:', data);
  }
}

testProfileInsert();
