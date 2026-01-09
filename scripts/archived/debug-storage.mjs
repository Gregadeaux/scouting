#!/usr/bin/env node

/**
 * Debug script to test storage access with anon key
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yiqffkixukbyjdbbroue.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcWZma2l4dWtieWpkYmJyb3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NzUwNzgsImV4cCI6MjA3NjU1MTA3OH0.njfgZ4aBE-RnZxYvOfAd2TmwWpiKZsJHX_cYUawg5vA';
const SERVICE_ROLE_KEY = 'sb_secret_wgMPYQWGm-kO1T9LY3hjHA_3NlTqKCY';

console.log('🔍 Testing Storage Access\n');

// Test with ANON key
console.log('1️⃣  Testing with ANON key...');
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

const { data: anonBuckets, error: anonError } = await anonClient.storage.listBuckets();

if (anonError) {
  console.log('❌ ANON key error:', anonError);
} else {
  console.log(`✅ ANON key response: ${anonBuckets.length} buckets`);
  anonBuckets.forEach(b => console.log(`   - ${b.name} (public: ${b.public})`));
}

console.log();

// Test with SERVICE ROLE key
console.log('2️⃣  Testing with SERVICE ROLE key...');
const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const { data: serviceBuckets, error: serviceError } = await serviceClient.storage.listBuckets();

if (serviceError) {
  console.log('❌ SERVICE ROLE error:', serviceError);
} else {
  console.log(`✅ SERVICE ROLE response: ${serviceBuckets.length} buckets`);
  serviceBuckets.forEach(b => console.log(`   - ${b.name} (public: ${b.public})`));
}

console.log('\n📊 Analysis:');
console.log(`ANON can see: ${anonBuckets?.length || 0} buckets`);
console.log(`SERVICE ROLE can see: ${serviceBuckets?.length || 0} buckets`);

if ((anonBuckets?.length || 0) === 0 && (serviceBuckets?.length || 0) > 0) {
  console.log('\n⚠️  ISSUE: Anon key cannot see buckets, but service role can!');
  console.log('This is likely due to RLS policies on storage.buckets table.');
  console.log('\nℹ️  This is NORMAL behavior - anon keys typically cannot list buckets.');
  console.log('But they CAN upload/download from public buckets!');
  console.log('\n🔧 Testing actual upload with anon key...');

  // Try to upload with anon key
  const testFile = new Blob(['test content'], { type: 'text/plain' });
  const filename = `test-${Date.now()}.txt`;

  const { data: uploadData, error: uploadError } = await anonClient.storage
    .from('robot-photos')
    .upload(filename, testFile);

  if (uploadError) {
    console.log('❌ Upload failed:', uploadError.message);
  } else {
    console.log('✅ Upload SUCCESS! File uploaded to robot-photos bucket');
    console.log('   Path:', uploadData.path);

    // Clean up
    await anonClient.storage.from('robot-photos').remove([filename]);
    console.log('   (Test file deleted)');
  }
}
