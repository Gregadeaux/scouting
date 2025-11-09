/**
 * Script to calculate OPR/DPR/CCWM for an event
 * Usage: npx tsx scripts/calculate-opr.ts <eventKey>
 */

import { createServiceClient } from '../src/lib/supabase/server';
import { createMatchRepository } from '../src/lib/repositories';
import { createOPRService } from '../src/lib/services/opr.service';

async function calculateOPR(eventKey: string) {
  console.log(`Calculating OPR/DPR/CCWM for event: ${eventKey}`);

  try {
    const supabase = createServiceClient();
    const matchRepo = createMatchRepository(supabase);
    const oprService = createOPRService(matchRepo, supabase);

    console.log('Fetching matches and calculating metrics...');
    const results = await oprService.calculateOPRMetrics(eventKey);

    console.log('\n=== Calculation Results ===');
    console.log(`Event: ${results.eventKey}`);
    console.log(`Total Matches: ${results.totalMatches}`);
    console.log(`Teams Calculated: ${results.opr.length}`);
    console.log(`Calculated At: ${results.calculatedAt}`);

    if (results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      results.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log('\n=== Top 10 Teams by OPR ===');
    const topOPR = results.opr
      .sort((a, b) => b.opr - a.opr)
      .slice(0, 10);

    topOPR.forEach((team, index) => {
      const dpr = results.dpr.find(d => d.teamNumber === team.teamNumber);
      const ccwm = results.ccwm.find(c => c.teamNumber === team.teamNumber);
      console.log(
        `${index + 1}. Team ${team.teamNumber}: OPR=${team.opr.toFixed(2)}, DPR=${dpr?.dpr.toFixed(2) || 'N/A'}, CCWM=${ccwm?.ccwm.toFixed(2) || 'N/A'}`
      );
    });

    console.log('\n✅ Statistics successfully calculated and stored in database');
  } catch (error) {
    console.error('\n❌ Error calculating OPR:', error);
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Get event key from command line
const eventKey = process.argv[2];

if (!eventKey) {
  console.error('Usage: npx tsx scripts/calculate-opr.ts <eventKey>');
  console.error('Example: npx tsx scripts/calculate-opr.ts 2025wimu');
  process.exit(1);
}

calculateOPR(eventKey);
