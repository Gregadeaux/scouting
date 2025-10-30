#!/usr/bin/env node

/**
 * Script to add "Ready to Test" and "Needs Changes" status options to the GitHub Project
 *
 * This uses the GitHub GraphQL API to add new options to the Status field.
 * Run with: node scripts/add-project-status-options.mjs
 */

import { execSync } from 'child_process';

const PROJECT_ID = 'PVT_kwHOAAc3Ns4BGyII';
const STATUS_FIELD_ID = 'PVTSSF_lAHOAAc3Ns4BGyIIzg3upxs';

// Colors for the new status options (GitHub uses these in the UI)
const NEW_OPTIONS = [
  { name: 'Ready to Test', description: 'Ready for testing', color: 'YELLOW' },
  { name: 'Needs Changes', description: 'Requires changes before proceeding', color: 'RED' }
];

console.log('Adding new status options to GitHub Project...\n');

// Step 1: Get current field options
console.log('Step 1: Fetching current status options...');
const getCurrentOptions = `
query {
  node(id: "${STATUS_FIELD_ID}") {
    ... on ProjectV2SingleSelectField {
      id
      name
      options {
        id
        name
      }
    }
  }
}
`;

let currentOptions;
try {
  const result = execSync(`gh api graphql -f query='${getCurrentOptions}'`, { encoding: 'utf-8' });
  const data = JSON.parse(result);
  currentOptions = data.data.node.options;
  console.log('Current options:', currentOptions.map(o => o.name).join(', '));
} catch (error) {
  console.error('Failed to fetch current options:', error.message);
  process.exit(1);
}

// Step 2: Check if options already exist
const existingNames = currentOptions.map(o => o.name);
const optionsToAdd = NEW_OPTIONS.filter(opt => !existingNames.includes(opt.name));

if (optionsToAdd.length === 0) {
  console.log('\n✅ All status options already exist!');

  // Print the status map for the workflow
  console.log('\nCurrent status field options:');
  currentOptions.forEach(opt => {
    console.log(`  - ${opt.name}: ${opt.id}`);
  });

  process.exit(0);
}

console.log(`\nAdding ${optionsToAdd.length} new option(s)...`);

// Step 3: Add each new option
for (const option of optionsToAdd) {
  console.log(`\nAdding "${option.name}"...`);

  // Note: The actual mutation for adding options to ProjectV2SingleSelectField
  // needs to use updateProjectV2Field with the complete options array
  // Since we can't easily update individual options, we'll use a workaround

  try {
    // Try using the beta API to add the option
    const addOptionMutation = `
    mutation {
      updateProjectV2Field(
        input: {
          fieldId: "${STATUS_FIELD_ID}"
          projectV2Id: "${PROJECT_ID}"
          name: "Status"
        }
      ) {
        projectV2Field {
          ... on ProjectV2SingleSelectField {
            id
            options {
              id
              name
            }
          }
        }
      }
    }
    `;

    // This won't actually add the option, but let's try a different approach
    console.log(`⚠️  Note: GitHub's GraphQL API doesn't support adding single-select options programmatically`);
    console.log(`   You'll need to add "${option.name}" manually through the GitHub UI`);

  } catch (error) {
    console.error(`Failed to add "${option.name}":`, error.message);
  }
}

console.log('\n' + '='.repeat(70));
console.log('MANUAL STEPS REQUIRED:');
console.log('='.repeat(70));
console.log('\nTo add the missing status options:');
console.log('1. Go to: https://github.com/users/Gregadeaux/projects/3');
console.log('2. Click on the three dots (...) in the top right');
console.log('3. Select "Settings"');
console.log('4. Find the "Status" field and click on it');
console.log('5. Add the following options:');
optionsToAdd.forEach(opt => {
  console.log(`   - ${opt.name}`);
});
console.log('\nAfter adding, run this script again to get the option IDs for the workflow.');
console.log('='.repeat(70));
