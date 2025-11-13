const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yiqffkixukbyjdbbroue.supabase.co';
const supabaseServiceKey = 'sb_secret_wgMPYQWGm-kO1T9LY3hjHA_3NlTqKCY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSignup() {
  const timestamp = Date.now();
  const email = `testuser${timestamp}@example.com`;

  console.log('Testing signup with email:', email);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: 'TestPassword123',
      options: {
        data: {
          full_name: 'Test User',
          team_number: 930
        }
      }
    });

    if (error) {
      console.error('Signup error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('Signup success:', data);
    }
  } catch (err) {
    console.error('Caught error:', err);
  }
}

testSignup();
