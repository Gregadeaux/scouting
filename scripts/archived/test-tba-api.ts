/**
 * Test script for TBA API Service
 * Run with: npx tsx test-tba-api.ts
 */

import { createTBAApiService, type ITBAApiService } from './src/lib/services/tba-api.service';
import { TBAApiError } from './src/types/tba';

async function testTBAApiService() {
  console.log('🧪 Testing TBA API Service...\n');

  // Initialize service (will use TBA_API_KEY from environment)
  let service: ITBAApiService;

  try {
    service = createTBAApiService({
      enableLogging: true,
      // For testing, you can provide an API key here if not in .env
      // apiKey: 'your-test-key'
    });
    console.log('✅ Service initialized successfully\n');
  } catch (error) {
    console.error('❌ Failed to initialize service:', error);
    console.log('\n⚠️  Make sure TBA_API_KEY is set in your .env.local file');
    console.log('   Get your key from: https://www.thebluealliance.com/account\n');
    process.exit(1);
  }

  // Test 1: Health check
  console.log('1. Testing health check...');
  try {
    const isHealthy = await service.isHealthy();
    console.log(`   ${isHealthy ? '✅' : '❌'} Health status: ${isHealthy}\n`);
  } catch (error) {
    console.error('   ❌ Health check failed:', error);
  }

  // Test 2: Get event details (using a known 2024 event as 2025 events may not exist yet)
  const testEventKey = '2024txaus'; // Austin District Event 2024
  console.log(`2. Testing getEvent("${testEventKey}")...`);
  try {
    const event = await service.getEvent(testEventKey);
    console.log(`   ✅ Event retrieved: ${event.name}`);
    console.log(`      - Location: ${event.city}, ${event.state_prov}`);
    console.log(`      - Dates: ${event.start_date} to ${event.end_date}\n`);
  } catch (error) {
    if (error instanceof TBAApiError) {
      console.error(`   ❌ TBA API Error: ${error.toString()}`);
    } else {
      console.error('   ❌ Unexpected error:', error);
    }
  }

  // Test 3: Get event teams
  console.log(`3. Testing getEventTeams("${testEventKey}")...`);
  try {
    const teams = await service.getEventTeams(testEventKey);
    console.log(`   ✅ Retrieved ${teams.length} teams`);
    if (teams.length > 0) {
      console.log(`      Sample teams:`);
      teams.slice(0, 3).forEach(team => {
        console.log(`      - ${team.team_number}: ${team.nickname}`);
      });
    }
    console.log();
  } catch (error) {
    if (error instanceof TBAApiError) {
      console.error(`   ❌ TBA API Error: ${error.toString()}`);
    } else {
      console.error('   ❌ Unexpected error:', error);
    }
  }

  // Test 4: Get event matches
  console.log(`4. Testing getEventMatches("${testEventKey}")...`);
  try {
    const matches = await service.getEventMatches(testEventKey);
    console.log(`   ✅ Retrieved ${matches.length} matches`);

    // Count by competition level
    const matchCounts = matches.reduce((acc, match) => {
      acc[match.comp_level] = (acc[match.comp_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`      Match breakdown:`);
    Object.entries(matchCounts).forEach(([level, count]) => {
      console.log(`      - ${level}: ${count} matches`);
    });
    console.log();
  } catch (error) {
    if (error instanceof TBAApiError) {
      console.error(`   ❌ TBA API Error: ${error.toString()}`);
    } else {
      console.error('   ❌ Unexpected error:', error);
    }
  }

  // Test 5: Get team details
  const testTeamKey = 'frc930'; // Mukwonago BEARs
  console.log(`5. Testing getTeam("${testTeamKey}")...`);
  try {
    const team = await service.getTeam(testTeamKey);
    console.log(`   ✅ Team retrieved: ${team.nickname}`);
    console.log(`      - Location: ${team.city}, ${team.state_prov}`);
    console.log(`      - Rookie Year: ${team.rookie_year}\n`);
  } catch (error) {
    if (error instanceof TBAApiError) {
      console.error(`   ❌ TBA API Error: ${error.toString()}`);
    } else {
      console.error('   ❌ Unexpected error:', error);
    }
  }

  // Test 6: Error handling - invalid event key
  console.log('6. Testing error handling with invalid event key...');
  try {
    await service.getEvent('invalid-key');
    console.log('   ❌ Should have thrown an error for invalid key\n');
  } catch (error) {
    if (error instanceof TBAApiError) {
      console.log(`   ✅ Correctly caught error: ${error.message}\n`);
    } else {
      console.error('   ❌ Unexpected error type:', error);
    }
  }

  // Test 7: Rate limiting simulation (optional - uncomment to test)
  /*
  console.log('7. Testing rate limiting (making 10 rapid requests)...');
  const startTime = Date.now();
  try {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(service.getEvent(testEventKey));
    }
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    console.log(`   ✅ Completed 10 requests in ${duration}ms\n`);
  } catch (error) {
    console.error('   ❌ Rate limiting test failed:', error);
  }
  */

  console.log('🎉 TBA API Service tests completed!');
}

// Run the tests
testTBAApiService().catch(console.error);