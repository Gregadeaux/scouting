const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yiqffkixukbyjdbbroue.supabase.co';
const supabaseServiceKey = 'sb_secret_wgMPYQWGm-kO1T9LY3hjHA_3NlTqKCY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  // Test 1: Can we query user_profiles?
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, email')
    .limit(1);

  if (profilesError) {
    console.error('Error querying user_profiles:', profilesError);
  } else {
    console.log('User profiles query successful. Found', profiles?.length || 0, 'profiles');
  }

  // Test 2: Check auth.users via admin API
  try {
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (usersError) {
      console.error('Error listing users:', usersError);
    } else {
      console.log('Auth users query successful. Found', users?.length || 0, 'users');
    }
  } catch (err) {
    console.error('Admin API error:', err);
  }
}

testConnection();
