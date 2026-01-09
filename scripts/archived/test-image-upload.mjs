#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const client = createClient(
  'https://yiqffkixukbyjdbbroue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcWZma2l4dWtieWpkYmJyb3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NzUwNzgsImV4cCI6MjA3NjU1MTA3OH0.njfgZ4aBE-RnZxYvOfAd2TmwWpiKZsJHX_cYUawg5vA'
);

// Create a tiny 1x1 PNG
const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const blob = new Blob([pngData], { type: 'image/png' });

console.log('🧪 Testing image upload with anon key to robot-photos bucket...');

const result = await client.storage
  .from('robot-photos')
  .upload('test-' + Date.now() + '.png', blob);

if (result.error) {
  console.log('❌ Upload failed:', result.error.message);
  console.log('Error details:', JSON.stringify(result.error, null, 2));
} else {
  console.log('✅ Upload SUCCESS!');
  console.log('Path:', result.data.path);

  // Get public URL
  const { data: urlData } = client.storage.from('robot-photos').getPublicUrl(result.data.path);
  console.log('Public URL:', urlData.publicUrl);

  // Clean up
  await client.storage.from('robot-photos').remove([result.data.path]);
  console.log('✅ Test file deleted');
}
