# Legacy Data Import for 2025wimu Event

## Overview

This directory contains the legacy scouting data from the 2025 Wisconsin-Milwaukee Regional that needs to be imported into the new database.

## Files

- `2025wimu-legacy.tsv` - Tab-separated values file containing all match scouting data
- `import-legacy-data.ts` - TypeScript script to transform and import the data

## Data Format

The TSV file has the following columns:

1. Team Number
2. Match Number
3. Scouter Name
4. Alliance Color
5. Leave (auto)
6. Auto Algae Processor
7. Auto Algae Net
8. Auto Coral L1-L4
9. Tele Algae Processor
10. Tele Algae Net
11. Coral L1-L4 (teleop)
12. Climb
13. Driver Confidence
14. Intake Preference
15. Disabled?
16. Defense Rating

## Updating the Data File

The current `2025wimu-legacy.tsv` file contains a sample of the data. To import all your data:

1. Open `2025wimu-legacy.tsv` in a text editor
2. Copy all the valid rows from your spreadsheet (skip header row if adding to existing file)
3. Paste them at the end of the file
4. Save the file

**Note:** Make sure to:
- Keep the tab-separated format
- Remove any empty rows (rows with just "0" values)
- Ensure all fields are present for each row

## Running the Import

1. Set your environment variables:
```bash
export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

2. Run the import script:
```bash
npx tsx scripts/import-legacy-data.ts
```

## What the Script Does

1. Creates the 2025wimu event if it doesn't exist
2. Creates team records for all teams in the data
3. Creates match schedule entries
4. Transforms legacy data to 2025 schema format:
   - Maps auto fields to `auto_performance` JSONB
   - Maps teleop fields to `teleop_performance` JSONB
   - Maps endgame fields to `endgame_performance` JSONB
5. Inserts all match scouting records

## Data Transformation

The script performs these transformations:

### Climb Result Mapping
- "Successful Deep Cage" → `deep_success`
- "Attempted Deep Cage" → `deep_attempt`
- "Successful Shallow Cage" → `shallow_success`
- "Attempted Shallow Cage" → `shallow_attempt`
- "Park" → `park`
- "None" or "UNSELECTED" → `none`

### Intake Preference
Parses combined intake preference strings into arrays:
- "Human Player Station" → `['human_player']`
- "Ground Pickup" → `['ground']`
- "Human Player Station Ground Pickup" → `['human_player', 'ground']`

### Disabled Status
- "No" → false
- Anything else → true

## Verification

After running the import, verify the data:

1. Check the console output for success/error counts
2. Query the database:
```sql
SELECT COUNT(*) FROM match_scouting WHERE event_id IN (
  SELECT id FROM events WHERE event_key = '2025wimu'
);
```

3. View the data in the admin dashboard at `/admin/scouting-data`

## Troubleshooting

**Issue: "Event not found" error**
- The script will automatically create the event if it doesn't exist

**Issue: Parsing errors**
- Check that the TSV file is properly formatted
- Ensure no rows have missing columns
- Remove any rows with invalid data

**Issue: Duplicate data errors**
- The script doesn't currently check for duplicates
- If you need to re-run, delete existing data first:
```sql
DELETE FROM match_scouting WHERE event_id IN (
  SELECT id FROM events WHERE event_key = '2025wimu'
);
```

## Next Steps

After importing:

1. Review the data in the admin dashboard
2. Run analytics/statistics calculations
3. Generate team performance reports
4. Create pick lists based on the data
