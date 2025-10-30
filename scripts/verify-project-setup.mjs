#!/usr/bin/env node

/**
 * Script to verify GitHub Project is configured correctly for status sync
 *
 * This checks that all required status options exist and provides
 * recommendations if any are missing.
 *
 * Run with: node scripts/verify-project-setup.mjs
 */

import { execSync } from 'child_process';

const PROJECT_ID = 'PVT_kwHOAAc3Ns4BGyII';
const STATUS_FIELD_ID = 'PVTSSF_lAHOAAc3Ns4BGyIIzg3upxs';

// Status options that should exist based on your label scheme
const RECOMMENDED_STATUSES = [
  'Todo',
  'In Progress',
  'Ready to Test',
  'Needs Changes',
  'Done'
];

console.log('🔍 Verifying GitHub Project Configuration\n');
console.log('='.repeat(70));

// Fetch current field options
console.log('\nFetching current status options from project...');

const query = `
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
  const result = execSync(`gh api graphql -f query='${query}'`, { encoding: 'utf-8' });
  const data = JSON.parse(result);
  currentOptions = data.data.node.options;
} catch (error) {
  console.error('❌ Failed to fetch project options:', error.message);
  console.error('\nMake sure you have the GitHub CLI installed and authenticated:');
  console.error('  gh auth login');
  process.exit(1);
}

// Display current options
console.log('\n📊 Current Status Options:');
console.log('='.repeat(70));
currentOptions.forEach((opt, index) => {
  console.log(`${index + 1}. ${opt.name}`);
  console.log(`   ID: ${opt.id}`);
});

// Check for missing options
const existingNames = currentOptions.map(o => o.name.toLowerCase());
const missing = RECOMMENDED_STATUSES.filter(
  rec => !existingNames.includes(rec.toLowerCase())
);

console.log('\n' + '='.repeat(70));
if (missing.length === 0) {
  console.log('✅ All recommended status options are present!');
} else {
  console.log(`⚠️  Missing ${missing.length} recommended status option(s):\n`);
  missing.forEach(name => {
    console.log(`   - ${name}`);
  });

  console.log('\n📝 To add missing options:');
  console.log('1. Go to: https://github.com/users/Gregadeaux/projects/3');
  console.log('2. Click the three dots (...) menu → Settings');
  console.log('3. Find the "Status" field and click the pencil icon to edit');
  console.log('4. Click "+ Add option" for each missing status');
  console.log('5. Run this script again to verify\n');
}

// Display label-to-status mapping
console.log('='.repeat(70));
console.log('\n🏷️  Label → Status Mapping:');
console.log('='.repeat(70));
console.log('\nThe workflow will map these labels to statuses:');
console.log('  status: todo          → Todo');
console.log('  status: in progress   → In Progress');
console.log('  status: ready to test → Ready to Test');
console.log('  status: needs changes → Needs Changes');
console.log('  status: done          → Done');

// Display workflow status
console.log('\n' + '='.repeat(70));
console.log('📋 Workflow Status:');
console.log('='.repeat(70));

const workflowPath = '.github/workflows/sync-issue-status.yml';
try {
  execSync(`test -f ${workflowPath}`);
  console.log(`✅ Workflow file exists: ${workflowPath}`);
  console.log('\nThe workflow will automatically:');
  console.log('  • Trigger when labels are added/removed from issues');
  console.log('  • Match labels starting with "status:" to project statuses');
  console.log('  • Update the project item status to match the label');
} catch {
  console.log(`❌ Workflow file not found: ${workflowPath}`);
}

console.log('\n' + '='.repeat(70));
console.log('\n💡 Next Steps:');
if (missing.length > 0) {
  console.log('1. Add the missing status options (see instructions above)');
  console.log('2. Re-run this script to verify: node scripts/verify-project-setup.mjs');
  console.log('3. Push the workflow to GitHub: git push');
  console.log('4. Test by adding a status label to an issue');
} else {
  console.log('1. Push the workflow to GitHub: git push');
  console.log('2. Test by adding a status label to an issue');
  console.log('3. Check the Actions tab to see the workflow run');
}
console.log('='.repeat(70) + '\n');
