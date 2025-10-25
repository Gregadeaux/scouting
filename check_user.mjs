import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Check auth users
const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
if (authError) {
  console.error('Auth error:', authError);
} else {
  console.log('\n=== Auth Users ===');
  authData.users.forEach(user => {
    console.log(`Email: ${user.email}, ID: ${user.id}, Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
  });
}

// Check user profiles
const { data: profiles, error: profileError } = await supabase
  .from('user_profiles')
  .select('*');

if (profileError) {
  console.error('Profile error:', profileError);
} else {
  console.log('\n=== User Profiles ===');
  profiles.forEach(profile => {
    console.log(`Email: ${profile.email}, Role: ${profile.role}, Active: ${profile.is_active}, ID: ${profile.id}`);
  });
}
