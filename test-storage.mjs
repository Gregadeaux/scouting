#!/usr/bin/env node

/**
 * @file Test script for Supabase Storage robot photos functionality
 * @description Tests upload, URL generation, and deletion of robot photos
 *
 * Usage:
 *   1. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   2. Run: node test-storage.mjs
 *   3. Provide path to a test image when prompted
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Load environment variables
function loadEnv() {
  try {
    const envPath = join(__dirname, '.env.local');
    if (!existsSync(envPath)) {
      throw new Error('.env.local not found');
    }

    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};

    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key.trim()] = value.trim();
      }
    });

    return envVars;
  } catch (error) {
    logError(`Failed to load .env.local: ${error.message}`);
    process.exit(1);
  }
}

// Validate image file
function validateImageFile(filePath, fileBuffer) {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

  // Check file exists
  if (!existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  // Check file size
  if (fileBuffer.length > MAX_SIZE) {
    const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds 5MB limit`,
    };
  }

  // Check file extension
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}

// Generate unique filename
function generateUniqueFilename(originalFilename) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9);
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  return `${timestamp}-${randomString}.${extension}`;
}

// Main test function
async function runTests() {
  log('\n=== Supabase Storage Test Suite ===\n', 'bright');

  // Load environment variables
  logInfo('Loading environment variables...');
  const env = loadEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logError('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  logSuccess('Environment variables loaded');

  // Initialize Supabase client
  logInfo('Initializing Supabase client...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  logSuccess('Supabase client initialized');

  // Get test image path from command line or use default
  const testImagePath = process.argv[2] || join(__dirname, 'test-image.jpg');

  log(`\nTest image: ${testImagePath}\n`, 'cyan');

  if (!existsSync(testImagePath)) {
    logWarning('Test image not found. Please provide a path:');
    logWarning(`  node test-storage.mjs /path/to/test-image.jpg`);
    logWarning('\nOr create a test-image.jpg in the project root.');
    process.exit(1);
  }

  // Read test file
  logInfo('Reading test image...');
  const fileBuffer = readFileSync(testImagePath);
  const originalFilename = basename(testImagePath);
  logSuccess(`Read ${(fileBuffer.length / 1024).toFixed(2)}KB from ${originalFilename}`);

  // Validate file
  logInfo('Validating image file...');
  const validation = validateImageFile(testImagePath, fileBuffer);
  if (!validation.valid) {
    logError(`Validation failed: ${validation.error}`);
    process.exit(1);
  }
  logSuccess('File validation passed');

  // Generate unique filename
  const uniqueFilename = generateUniqueFilename(originalFilename);
  logInfo(`Generated filename: ${uniqueFilename}`);

  // Test 1: Upload
  log('\n--- Test 1: Upload Photo ---', 'yellow');
  let uploadedUrl = null;

  try {
    const { data, error } = await supabase.storage
      .from('robot-photos')
      .upload(uniqueFilename, fileBuffer, {
        cacheControl: '3600',
        contentType: `image/${uniqueFilename.split('.').pop()}`,
      });

    if (error) {
      logError(`Upload failed: ${error.message}`);
      if (error.message.includes('new row violates row-level security policy')) {
        logWarning('RLS Policy Error: You may need to authenticate or check storage policies');
      }
      process.exit(1);
    }

    logSuccess(`Uploaded to: ${data.path}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('robot-photos')
      .getPublicUrl(data.path);

    uploadedUrl = urlData.publicUrl;
    logSuccess(`Public URL: ${uploadedUrl}`);
  } catch (error) {
    logError(`Upload error: ${error.message}`);
    process.exit(1);
  }

  // Test 2: Verify URL is accessible
  log('\n--- Test 2: Verify URL Accessibility ---', 'yellow');
  try {
    const response = await fetch(uploadedUrl);
    if (response.ok) {
      logSuccess(`URL is accessible (HTTP ${response.status})`);
      logInfo(`Content-Type: ${response.headers.get('content-type')}`);
      logInfo(`Content-Length: ${response.headers.get('content-length')} bytes`);
    } else {
      logError(`URL returned HTTP ${response.status}`);
    }
  } catch (error) {
    logError(`Failed to fetch URL: ${error.message}`);
  }

  // Test 3: List files in bucket
  log('\n--- Test 3: List Files in Bucket ---', 'yellow');
  try {
    const { data, error } = await supabase.storage
      .from('robot-photos')
      .list('', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      logError(`List failed: ${error.message}`);
    } else {
      logSuccess(`Found ${data.length} file(s) in bucket`);
      data.slice(0, 5).forEach((file) => {
        logInfo(`  - ${file.name} (${(file.metadata?.size / 1024).toFixed(2)}KB)`);
      });
    }
  } catch (error) {
    logError(`List error: ${error.message}`);
  }

  // Test 4: Delete uploaded file
  log('\n--- Test 4: Delete Photo ---', 'yellow');
  try {
    const { error } = await supabase.storage
      .from('robot-photos')
      .remove([uniqueFilename]);

    if (error) {
      logError(`Delete failed: ${error.message}`);
      if (error.message.includes('row-level security policy')) {
        logWarning('RLS Policy Error: You may need to authenticate to delete files');
      }
    } else {
      logSuccess(`Deleted: ${uniqueFilename}`);
    }
  } catch (error) {
    logError(`Delete error: ${error.message}`);
  }

  // Test 5: Verify deletion
  log('\n--- Test 5: Verify Deletion ---', 'yellow');
  try {
    const response = await fetch(uploadedUrl);
    if (response.status === 404) {
      logSuccess('Photo successfully deleted (HTTP 404)');
    } else if (response.ok) {
      logWarning('Photo still accessible after deletion (may be cached)');
    } else {
      logInfo(`URL returned HTTP ${response.status}`);
    }
  } catch (error) {
    logError(`Verification error: ${error.message}`);
  }

  // Summary
  log('\n=== Test Summary ===\n', 'bright');
  logInfo('If all tests passed:');
  logSuccess('  - Bucket is correctly configured');
  logSuccess('  - RLS policies allow authenticated uploads');
  logSuccess('  - Public URLs are accessible');
  logSuccess('  - Deletion works (if authenticated)');

  log('\nNext steps:', 'cyan');
  logInfo('1. Review Supabase Storage dashboard');
  logInfo('2. Verify RLS policies (see supabase-storage-setup.md)');
  logInfo('3. Test with actual authentication in your app');
  logInfo('4. Implement photo upload in pit scouting forms');

  log('\n');
}

// Run tests
runTests().catch((error) => {
  logError(`\nUnexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
