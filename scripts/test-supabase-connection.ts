#!/usr/bin/env tsx
/**
 * Test Supabase Connection
 *
 * This script tests the connection to your Supabase database
 * Run with: npm run test:db
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local file manually
try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');

  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();

    if (key && value) {
      process.env[key] = value;
    }
  });
} catch (error) {
  console.error('⚠️  Could not load .env.local file');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔍 Testing Supabase Connection...\n');
console.log(`URL: ${supabaseUrl}`);
console.log(`Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
console.log('');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test 1: Check if we can connect
    console.log('Test 1: Basic Connection...');
    const { data, error } = await supabase.from('teams').select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Connection failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Connected successfully!\n');

    // Test 2: Count records in each table
    console.log('Test 2: Checking table record counts...');

    const tables = ['teams', 'events', 'match_schedule', 'scouters', 'season_config', 'match_scouting', 'pit_scouting'];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ⚠️  ${table}: Error - ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: ${count} records`);
      }
    }

    console.log('\n🎉 Supabase connection test complete!');
    console.log('\nNext steps:');
    console.log('  1. Start the dev server: npm run dev');
    console.log('  2. Visit the admin dashboard: http://localhost:3000/admin');
    console.log('  3. Add some teams and events!');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

testConnection();
