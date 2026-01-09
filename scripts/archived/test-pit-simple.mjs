#!/usr/bin/env node

/**
 * Simple test for POST /api/pit-scouting endpoint
 * Uses mock data for team 930
 */

console.log('🧪 Testing POST /api/pit-scouting for Team 930\n');

// Test pit scouting data for team 930
const pitScoutingData = {
  event_key: "2025casd",  // Mock event - replace with real event if it exists
  team_number: 930,
  scout_id: "test-scout-id-123",  // Mock scout ID
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

console.log('📝 Test Data:');
console.log(JSON.stringify(pitScoutingData, null, 2));
console.log('\n🚀 POSTing to http://localhost:3000/api/pit-scouting...\n');

try {
  const response = await fetch('http://localhost:3000/api/pit-scouting', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(pitScoutingData)
  });

  const result = await response.json();

  console.log(`📊 Response Status: ${response.status} ${response.statusText}\n`);

  if (response.ok) {
    console.log('✅ SUCCESS! Pit scouting data submitted\n');
    console.log('Response Data:');
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('❌ FAILED! Error response:\n');
    console.log(JSON.stringify(result, null, 2));

    if (result.data?.errors) {
      console.log('\n🔍 Validation Errors:');
      result.data.errors.forEach(err => {
        console.log(`   - ${err.field}: ${err.message}`);
        if (err.value !== undefined) {
          console.log(`     Value: ${JSON.stringify(err.value)}`);
        }
      });
    }
  }

} catch (error) {
  console.error('❌ Request failed:', error.message);
  console.error('Make sure the dev server is running on port 3000');
  process.exit(1);
}

console.log('\n✨ Test complete!');
