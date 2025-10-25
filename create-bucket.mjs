#!/usr/bin/env node

/**
 * Script to create the robot-photos bucket using service role key
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yiqffkixukbyjdbbroue.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.error('Make sure .env.local is loaded or pass it as an environment variable');
  process.exit(1);
}

console.log('🔧 Creating robot-photos bucket with service role...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  try {
    // List existing buckets
    console.log('📋 Listing existing buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      process.exit(1);
    }

    console.log(`Found ${buckets.length} existing buckets:`);
    buckets.forEach(b => console.log(`  - ${b.name} (public: ${b.public})`));
    console.log();

    // Check if robot-photos already exists
    const existing = buckets.find(b => b.name === 'robot-photos');
    if (existing) {
      console.log('✅ robot-photos bucket already exists!');
      console.log(`   Public: ${existing.public}`);
      console.log(`   ID: ${existing.id}`);
      return;
    }

    // Create the bucket
    console.log('🪣 Creating robot-photos bucket...');
    const { data: newBucket, error: createError } = await supabase.storage.createBucket('robot-photos', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      process.exit(1);
    }

    console.log('✅ Bucket created successfully!');
    console.log('   Name:', newBucket.name);
    console.log('   Public:', true);
    console.log('\n📝 Now applying RLS policies...\n');

    // Apply RLS policies
    const policies = [
      {
        name: 'Authenticated users can upload robot photos',
        sql: `
          CREATE POLICY "Authenticated users can upload robot photos"
          ON storage.objects FOR INSERT
          TO authenticated
          WITH CHECK (bucket_id = 'robot-photos');
        `
      },
      {
        name: 'Public read access to robot photos',
        sql: `
          CREATE POLICY "Public read access to robot photos"
          ON storage.objects FOR SELECT
          TO public
          USING (bucket_id = 'robot-photos');
        `
      },
      {
        name: 'Authenticated users can delete robot photos',
        sql: `
          CREATE POLICY "Authenticated users can delete robot photos"
          ON storage.objects FOR DELETE
          TO authenticated
          USING (bucket_id = 'robot-photos');
        `
      }
    ];

    console.log('⚠️  Note: RLS policies must be created via SQL Editor in Supabase Dashboard');
    console.log('Run these SQL statements:\n');
    policies.forEach(p => {
      console.log(p.sql);
      console.log();
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();
