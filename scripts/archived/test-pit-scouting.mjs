#!/usr/bin/env node

/**
 * Test script for POST /api/pit-scouting endpoint
 * Tests submitting pit scouting data for team 930
 */

const SUPABASE_URL = 'https://yiqffkixukbyjdbbroue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcWZma2l4dWtieWpkYmJyb3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NDcxNzEsImV4cCI6MjA2MDIyMzE3MX0.PBCXmZRt2s8KbsKSSbXXjgdVrE7Kbf9gJ0-wnNjfzos';

async function testPitScouting() {
  console.log('🧪 Testing POST /api/pit-scouting for Team 930\n');

  // First, get an event and user for testing
  console.log('📋 Step 1: Getting test data from database...');

  // Get a 2025 event
  const eventsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/events?year=eq.2025&order=start_date.desc&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  const events = await eventsResponse.json();

  if (!events || events.length === 0) {
    console.error('❌ No 2025 events found in database');
    process.exit(1);
  }

  const event = events[0];
  console.log(`   ✓ Using event: ${event.event_key} - ${event.name}`);

  // Check if team 930 exists
  const teamResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/teams?team_number=eq.930`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  const teams = await teamResponse.json();

  if (!teams || teams.length === 0) {
    console.error('❌ Team 930 not found in database');
    process.exit(1);
  }

  console.log(`   ✓ Found team: ${teams[0].team_number} - ${teams[0].name}`);

  // Get a user for scout_id
  const profilesResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  const profiles = await profilesResponse.json();

  if (!profiles || profiles.length === 0) {
    console.error('❌ No profiles found in database');
    process.exit(1);
  }

  const scoutId = profiles[0].id;
  console.log(`   ✓ Using scout ID: ${scoutId}\n`);

  // Construct test pit scouting data
  console.log('📝 Step 2: Creating test pit scouting data...');

  const pitScoutingData = {
    event_key: event.event_key,
    team_number: 930,
    scout_id: scoutId,
    robot_capabilities: {
      schema_version: "2025.1",
      can_handle_coral: true,
      can_handle_algae: true,
      preferred_game_piece: "coral",
      max_coral_capacity: 6,
      max_algae_capacity: 4,
      can_score_reef: true,
      max_reef_level: "level_4",
      can_score_processor: true,
      scoring_consistency: "very_consistent",
      estimated_cycle_time_seconds: 8,
      can_barge_load: true,
      can_deep_dive: true,
      deep_dive_consistency: "very_consistent",
      can_shallow_climb: true,
      shallow_climb_consistency: "very_consistent",
      programming_features: ["autonomous", "vision_tracking", "driver_assistance"],
      notes: "Excellent all-around robot with strong coral scoring capabilities"
    },
    autonomous_capabilities: {
      schema_version: "2025.1",
      auto_scoring_capability: true,
      auto_max_coral_pieces: 4,
      auto_max_algae_pieces: 2,
      auto_preferred_starting_position: 2,
      auto_leaves_starting_zone: true,
      auto_reef_scoring: true,
      auto_processor_scoring: false,
      auto_barge_interaction: false,
      auto_success_rate_estimate: 85,
      auto_strategy_description: "Starts center, scores 4 coral in reef, exits zone",
      notes: "Very reliable autonomous routine"
    },
    drive_train: "swerve",
    drive_motors: "NEO",
    programming_language: "Java",
    robot_weight_lbs: 118,
    height_inches: 42,
    width_inches: 28,
    length_inches: 32,
    physical_description: "Compact swerve drive with elevator mechanism and dual-roller intake",
    team_strategy: "Focus on reef scoring cycles with strong defense capabilities",
    preferred_starting_position: 2,
    team_goals: "Win division, qualify for worlds",
    team_comments: "Very experienced team with consistent robot design",
    notes: "Team 930 - Mukwonago BEARs - great robot this year!"
  };

  console.log('   ✓ Test data created\n');

  // Make POST request to local API
  console.log('🚀 Step 3: POSTing to /api/pit-scouting...');

  try {
    const response = await fetch('http://localhost:3000/api/pit-scouting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(pitScoutingData)
    });

    const result = await response.json();

    console.log(`   Status: ${response.status} ${response.statusText}\n`);

    if (response.ok) {
      console.log('✅ SUCCESS! Pit scouting data submitted\n');
      console.log('📊 Response Data:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('❌ FAILED! Error response:\n');
      console.log(JSON.stringify(result, null, 2));

      if (result.data?.errors) {
        console.log('\n🔍 Validation Errors:');
        result.data.errors.forEach(err => {
          console.log(`   - ${err.field}: ${err.message} (value: ${JSON.stringify(err.value)})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  }

  // Test GET endpoint
  console.log('\n📥 Step 4: Testing GET /api/pit-scouting...');

  try {
    const getResponse = await fetch(
      `http://localhost:3000/api/pit-scouting?team_number=930&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    const getResult = await getResponse.json();

    console.log(`   Status: ${getResponse.status} ${getResponse.statusText}\n`);

    if (getResponse.ok) {
      console.log(`✅ Retrieved ${getResult.data.data.length} observations for team 930`);
      console.log(`   Total observations: ${getResult.data.pagination.total}`);
    } else {
      console.log('❌ GET request failed:\n');
      console.log(JSON.stringify(getResult, null, 2));
    }

  } catch (error) {
    console.error('❌ GET request failed:', error.message);
  }

  console.log('\n✨ Test complete!');
}

// Run the test
testPitScouting().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
