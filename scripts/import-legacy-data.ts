import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface LegacyRow {
  teamNumber: string;
  matchNumber: string;
  scouterName: string;
  allianceColor: string;
  leave: string;
  autoAlgaeProcessor: string;
  autoAlgaeNet: string;
  autoCoralL1: string;
  autoCoralL2: string;
  autoCoralL3: string;
  autoCoralL4: string;
  teleAlgaeProcessor: string;
  teleAlgaeNet: string;
  coralL1: string;
  coralL2: string;
  coralL3: string;
  coralL4: string;
  climb: string;
  driverConfidence: string;
  intakePreference: string;
  disabled: string;
  defenseRating: string;
  comments: string;
}

function parseClimbResult(climb: string): {
  cage_climb_attempted: boolean;
  cage_climb_successful: boolean;
  cage_level_achieved?: 'shallow' | 'deep';
} {
  const trimmed = climb.trim();

  if (trimmed === 'Successful Deep Cage') {
    return { cage_climb_attempted: true, cage_climb_successful: true, cage_level_achieved: 'deep' };
  } else if (trimmed === 'Attempted Deep Cage') {
    return { cage_climb_attempted: true, cage_climb_successful: false };
  } else if (trimmed === 'Successful Shallow Cage') {
    return { cage_climb_attempted: true, cage_climb_successful: true, cage_level_achieved: 'shallow' };
  } else if (trimmed === 'Attempted Shallow Cage') {
    return { cage_climb_attempted: true, cage_climb_successful: false };
  } else {
    // Park, None, UNSELECTED, etc.
    return { cage_climb_attempted: false, cage_climb_successful: false };
  }
}

function parseDisabledStatus(disabled: string): boolean {
  return disabled !== 'No' && disabled.trim().length > 0;
}

function parseRating(value: string): number | null {
  const rating = parseInt(value);
  // Only return rating if it's valid (1-5), otherwise return null
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return null;
  }
  return rating;
}

function parseTSV(tsv: string): LegacyRow[] {
  const lines = tsv.trim().split('\n');
  const rows: LegacyRow[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Data rows are tab-separated
    const columns = line.split('\t');
    if (columns.length < 22 || !columns[0] || columns[0] === '0') continue;

    rows.push({
      teamNumber: columns[0],
      matchNumber: columns[1],
      scouterName: columns[2],
      allianceColor: columns[3],
      leave: columns[4],
      autoAlgaeProcessor: columns[5],
      autoAlgaeNet: columns[6],
      autoCoralL1: columns[7],
      autoCoralL2: columns[8],
      autoCoralL3: columns[9],
      autoCoralL4: columns[10],
      teleAlgaeProcessor: columns[11],
      teleAlgaeNet: columns[12],
      coralL1: columns[13],
      coralL2: columns[14],
      coralL3: columns[15],
      coralL4: columns[16],
      climb: columns[17],
      driverConfidence: columns[18],
      intakePreference: columns[19],
      disabled: columns[20],
      defenseRating: columns[21] || '0',
      comments: columns[22] || '',
    });
  }

  return rows;
}

async function importData() {
  console.log('Starting match scouting data import for 2025wimu event...\n');

  const EVENT_KEY = '2025wimu';
  const SEASON = 2025;

  // Read the TSV file
  const dataPath = path.join(process.cwd(), 'data', '2025wimu-legacy.tsv');
  const legacyData = fs.readFileSync(dataPath, 'utf-8');

  // Parse the TSV data
  const rows = parseTSV(legacyData);
  console.log(`Parsed ${rows.length} rows from legacy data\n`);

  // Get the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('event_key')
    .eq('event_key', EVENT_KEY)
    .single();

  if (eventError || !event) {
    console.error('Event 2025wimu not found. Please ensure the event exists in the database.');
    console.error('Error:', eventError);
    return;
  }

  console.log(`Found event: ${EVENT_KEY}\n`);

  // Import scouting data
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const row of rows) {
    // Skip rows with invalid alliance color
    const allianceColor = row.allianceColor.toLowerCase();
    if (allianceColor !== 'red' && allianceColor !== 'blue') {
      const errorMsg = `Team ${row.teamNumber} Match ${row.matchNumber}: Invalid alliance color '${row.allianceColor}' (must be Red or Blue)`;
      errors.push(errorMsg);
      errorCount++;
      continue;
    }

    // Build auto_performance JSONB (matching AutoPerformance2025)
    const autoPerformance = {
      schema_version: '2025.1',
      left_starting_zone: row.leave === 'TRUE',
      coral_scored_L1: parseInt(row.autoCoralL1) || 0,
      coral_scored_L2: parseInt(row.autoCoralL2) || 0,
      coral_scored_L3: parseInt(row.autoCoralL3) || 0,
      coral_scored_L4: parseInt(row.autoCoralL4) || 0,
      coral_missed: 0,
      preloaded_piece_scored: false,
      notes: '',
    };

    // Build teleop_performance JSONB (matching TeleopPerformance2025)
    const teleopPerformance = {
      schema_version: '2025.1',
      coral_scored_L1: parseInt(row.coralL1) || 0,
      coral_scored_L2: parseInt(row.coralL2) || 0,
      coral_scored_L3: parseInt(row.coralL3) || 0,
      coral_scored_L4: parseInt(row.coralL4) || 0,
      coral_missed: 0,
      algae_scored_barge: parseInt(row.teleAlgaeNet) || 0, // Net = Barge
      algae_scored_processor: parseInt(row.teleAlgaeProcessor) || 0,
      algae_missed: 0,
      cycles_completed: 0,
      ground_pickup_coral: 0,
      station_pickup_coral: 0,
      ground_pickup_algae: 0,
      reef_pickup_algae: 0,
      lollipop_pickup_algae: 0,
      defense_time_seconds: 0,
      defended_by_opponent_seconds: 0,
      penalties_caused: 0,
      notes: '',
    };

    // Build endgame_performance JSONB (matching EndgamePerformance2025)
    const climbData = parseClimbResult(row.climb);
    const endgamePerformance = {
      schema_version: '2025.1',
      cage_climb_attempted: climbData.cage_climb_attempted,
      cage_climb_successful: climbData.cage_climb_successful,
      ...(climbData.cage_level_achieved && { cage_level_achieved: climbData.cage_level_achieved }),
      endgame_points: 0,
      notes: '',
    };

    // Get match_id and match_key from match_schedule
    const { data: matchData, error: matchError } = await supabase
      .from('match_schedule')
      .select('match_id, match_key')
      .eq('event_key', EVENT_KEY)
      .eq('match_number', parseInt(row.matchNumber))
      .eq('comp_level', 'qm')
      .single();

    if (matchError || !matchData) {
      const errorMsg = `Could not find match ${row.matchNumber} for team ${row.teamNumber}`;
      errors.push(errorMsg);
      errorCount++;
      continue;
    }

    // Upsert scouting data (update if exists, insert if new)
    const { error: insertError } = await supabase
      .from('match_scouting')
      .upsert({
        match_id: matchData.match_id,
        match_key: matchData.match_key,
        team_number: parseInt(row.teamNumber),
        scout_name: row.scouterName,
        alliance_color: allianceColor,
        auto_performance: autoPerformance,
        teleop_performance: teleopPerformance,
        endgame_performance: endgamePerformance,
        driver_skill_rating: parseRating(row.driverConfidence),
        defense_rating: parseRating(row.defenseRating),
        robot_disabled: parseDisabledStatus(row.disabled),
        notes: row.comments || `Intake: ${row.intakePreference}`,
      }, {
        onConflict: 'match_id,team_number,scout_name',
      });

    if (insertError) {
      const errorMsg = `Team ${row.teamNumber} Match ${row.matchNumber}: ${insertError.message}`;
      errors.push(errorMsg);
      errorCount++;
    } else {
      successCount++;
      if (successCount % 50 === 0) {
        console.log(`Imported ${successCount} entries...`);
      }
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Successfully imported: ${successCount} entries`);
  console.log(`Errors: ${errorCount} entries`);

  if (errors.length > 0) {
    console.log(`\nFirst 10 errors:`);
    errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
  }
}

importData().catch(console.error);
