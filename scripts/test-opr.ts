#!/usr/bin/env tsx

/**
 * Test script for OPR/DPR/CCWM calculation
 *
 * Run with: npx tsx scripts/test-opr.ts
 */

import { calculateOPR } from '../src/lib/algorithms/opr';
import { calculateDPR } from '../src/lib/algorithms/dpr';
import { calculateCCWM } from '../src/lib/algorithms/ccwm';
import type { MatchSchedule } from '../src/types';

// Create test match data
const testMatches: MatchSchedule[] = [
  {
    match_id: 1,
    event_key: '2025test',
    match_key: '2025test_qm1',
    comp_level: 'qm',
    match_number: 1,
    red_1: 254,
    red_2: 1678,
    red_3: 1114,
    blue_1: 930,
    blue_2: 118,
    blue_3: 2056,
    red_score: 120,
    blue_score: 95,
  },
  {
    match_id: 2,
    event_key: '2025test',
    match_key: '2025test_qm2',
    comp_level: 'qm',
    match_number: 2,
    red_1: 254,
    red_2: 930,
    red_3: 3476,
    blue_1: 1678,
    blue_2: 1114,
    blue_3: 118,
    red_score: 105,
    blue_score: 110,
  },
  {
    match_id: 3,
    event_key: '2025test',
    match_key: '2025test_qm3',
    comp_level: 'qm',
    match_number: 3,
    red_1: 1114,
    red_2: 2056,
    red_3: 3476,
    blue_1: 254,
    blue_2: 930,
    blue_3: 118,
    red_score: 88,
    blue_score: 102,
  },
  {
    match_id: 4,
    event_key: '2025test',
    match_key: '2025test_qm4',
    comp_level: 'qm',
    match_number: 4,
    red_1: 1678,
    red_2: 930,
    red_3: 2056,
    blue_1: 1114,
    blue_2: 3476,
    blue_3: 254,
    red_score: 95,
    blue_score: 108,
  },
  {
    match_id: 5,
    event_key: '2025test',
    match_key: '2025test_qm5',
    comp_level: 'qm',
    match_number: 5,
    red_1: 118,
    red_2: 254,
    red_3: 3476,
    blue_1: 1678,
    blue_2: 930,
    blue_3: 1114,
    red_score: 92,
    blue_score: 115,
  },
];

async function runTest() {
  console.log('🤖 FRC OPR/DPR/CCWM Test Script');
  console.log('================================\n');

  console.log('Test Data:');
  console.log(`- ${testMatches.length} matches`);
  console.log(`- Teams: 254, 1678, 1114, 930, 118, 2056, 3476`);
  console.log('\nMatch Results:');
  testMatches.forEach(m => {
    console.log(`  ${m.match_key}: Red ${m.red_score} - ${m.blue_score} Blue`);
  });

  console.log('\n📊 Calculating OPR...');
  const oprResults = await calculateOPR('2025test', testMatches);

  console.log('\n📊 Calculating DPR...');
  const dprResults = await calculateDPR('2025test', testMatches);

  console.log('\n📊 Calculating CCWM...');
  const ccwmResults = await calculateCCWM('2025test', oprResults.teams, dprResults.teams);

  console.log('\n========== RESULTS ==========\n');

  // Create a combined view
  const teamMap = new Map<number, any>();

  oprResults.teams.forEach(t => {
    teamMap.set(t.teamNumber, {
      teamNumber: t.teamNumber,
      opr: t.opr,
      matchesPlayed: t.matchesPlayed
    });
  });

  dprResults.teams.forEach(t => {
    const existing = teamMap.get(t.teamNumber);
    if (existing) {
      existing.dpr = t.dpr;
    }
  });

  ccwmResults.teams.forEach(t => {
    const existing = teamMap.get(t.teamNumber);
    if (existing) {
      existing.ccwm = t.ccwm;
    }
  });

  // Sort by CCWM (best teams first)
  const teams = Array.from(teamMap.values()).sort((a, b) => b.ccwm - a.ccwm);

  console.log('Team Rankings (sorted by CCWM):');
  console.log('╔══════════╦═════════╦═════════╦═════════╦═════════╦═══════════╗');
  console.log('║   Team   ║   OPR   ║   DPR   ║  CCWM   ║ Matches ║   Rank    ║');
  console.log('╠══════════╬═════════╬═════════╬═════════╬═════════╬═══════════╣');

  teams.forEach((team, index) => {
    const rank = index + 1;
    const teamStr = String(team.teamNumber).padEnd(8);
    const oprStr = team.opr.toFixed(1).padStart(7);
    const dprStr = team.dpr.toFixed(1).padStart(7);
    const ccwmStr = team.ccwm.toFixed(1).padStart(7);
    const matchesStr = String(team.matchesPlayed).padStart(7);
    const rankStr = `#${rank}`.padStart(9);

    console.log(`║ ${teamStr} ║ ${oprStr} ║ ${dprStr} ║ ${ccwmStr} ║ ${matchesStr} ║ ${rankStr} ║`);
  });

  console.log('╚══════════╩═════════╩═════════╩═════════╩═════════╩═══════════╝');

  // Statistics
  console.log('\n📈 Field Statistics:');
  console.log(`  Average OPR: ${ccwmResults.statistics.averageOPR}`);
  console.log(`  Average DPR: ${ccwmResults.statistics.averageDPR}`);
  console.log(`  Average CCWM: ${ccwmResults.statistics.averageCCWM}`);
  console.log(`  Median CCWM: ${ccwmResults.statistics.medianCCWM}`);
  console.log(`  Std Dev CCWM: ${ccwmResults.statistics.stdDevCCWM}`);

  // Alliance recommendations
  console.log('\n🏆 Alliance Selection Recommendations:');

  const topTeams = teams.slice(0, 3);
  console.log('\nFirst Picks (Top 3 by CCWM):');
  topTeams.forEach(t => {
    console.log(`  • Team ${t.teamNumber}: CCWM ${t.ccwm.toFixed(1)} (OPR: ${t.opr.toFixed(1)}, DPR: ${t.dpr.toFixed(1)})`);
  });

  const defensiveTeams = teams.filter(t => t.dpr < ccwmResults.statistics.averageDPR - 5);
  if (defensiveTeams.length > 0) {
    console.log('\nDefensive Specialists (Low DPR):');
    defensiveTeams.forEach(t => {
      console.log(`  • Team ${t.teamNumber}: DPR ${t.dpr.toFixed(1)} (${(ccwmResults.statistics.averageDPR - t.dpr).toFixed(1)} below average)`);
    });
  }

  // Warnings
  if (oprResults.warnings.length > 0 || dprResults.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    [...oprResults.warnings, ...dprResults.warnings].forEach(w => {
      console.log(`  • ${w}`);
    });
  }

  console.log('\n✅ Test completed successfully!\n');
}

// Run the test
runTest().catch(error => {
  console.error('❌ Error running test:', error);
  process.exit(1);
});