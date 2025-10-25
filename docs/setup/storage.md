# Supabase Storage Setup Guide

## Overview

This guide documents the setup process for the `robot-photos` storage bucket used for pit scouting robot photos in the FRC Scouting System.

## Bucket Configuration

### Bucket Settings
- **Bucket Name**: `robot-photos`
- **Public Access**: Yes (allows public read access to photo URLs)
- **File Size Limit**: 5MB per file
- **Allowed MIME Types**:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`

### Purpose
- Store robot photos captured during pit scouting
- Photos are publicly accessible via URL
- Authenticated users can upload and delete photos
- Photo URLs are stored in the `pit_scouting.photo_urls` field (string array)

---

## Setup Instructions

### Option 1: Supabase Dashboard (Recommended)

1. **Navigate to Storage**
   - Log into your Supabase project dashboard
   - Go to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"** button
   - Enter bucket name: `robot-photos`
   - Toggle **"Public bucket"** to **ON**
   - Click **"Create bucket"**

3. **Configure File Size Limit** (Optional)
   - The 5MB limit is enforced at the application level
   - You can set a server-side limit in bucket settings if desired

4. **Apply RLS Policies** (See SQL section below)

### Option 2: Supabase CLI

```bash
# Create the bucket (if using management API or SQL)
# Note: Most users will use the dashboard for bucket creation

# Create bucket via SQL (run in SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('robot-photos', 'robot-photos', true)
ON CONFLICT (id) DO NOTHING;
```

---

## Row-Level Security (RLS) Policies

Run the following SQL in the **SQL Editor** of your Supabase dashboard:

```sql
-- =====================================================
-- Storage RLS Policies for robot-photos Bucket
-- =====================================================

-- Policy 1: Allow authenticated users to upload
-- This allows any authenticated user to insert (upload) new photos
CREATE POLICY "Authenticated users can upload robot photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'robot-photos');

-- Policy 2: Allow public read access
-- This allows anyone (even unauthenticated) to view photos via URL
CREATE POLICY "Public read access to robot photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'robot-photos');

-- Policy 3: Allow authenticated users to delete
-- This allows authenticated users to delete photos they or others uploaded
-- Note: You may want to restrict this further in production (e.g., only allow
-- users to delete their own uploads by adding user_id checks)
CREATE POLICY "Authenticated users can delete robot photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'robot-photos');
```

### Policy Explanations

**Upload Policy (INSERT)**:
- Only authenticated users can upload photos
- Prevents anonymous users from filling storage
- Applied to all files in `robot-photos` bucket

**Read Policy (SELECT)**:
- Public read access allows photo URLs to work without authentication
- Essential for sharing scouting data with alliance partners
- No authentication required to view photos

**Delete Policy (DELETE)**:
- Authenticated users can remove photos
- Useful for correcting mistakes or removing outdated photos
- **Security Note**: In production, you may want to restrict deletions to:
  - Only the user who uploaded the photo
  - Only users with admin/scouting lead roles
  - Example: `USING (bucket_id = 'robot-photos' AND auth.uid() = owner)`

---

## Verifying the Setup

### 1. Check Bucket Exists
```sql
SELECT * FROM storage.buckets WHERE id = 'robot-photos';
```

Expected result:
```
id            | name          | public | created_at
robot-photos  | robot-photos  | true   | 2025-01-XX ...
```

### 2. Check Policies Are Active
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%robot photos%';
```

Expected result: 3 policies (INSERT, SELECT, DELETE)

### 3. Test Upload (via application)
- Use the `uploadRobotPhoto()` function from `src/lib/supabase/storage.ts`
- Verify the returned URL is accessible
- Check the file appears in Storage dashboard

---

## Application Integration

### Storage Utility Functions

The application uses these functions (located in `src/lib/supabase/storage.ts`):

- `uploadRobotPhoto(file: File): Promise<string>` - Upload photo, returns public URL
- `deleteRobotPhoto(url: string): Promise<void>` - Delete photo by URL
- `getRobotPhotoUrl(filePath: string): string` - Get public URL from file path
- `validateImageFile(file: File)` - Validate file size and MIME type

### Database Integration

Photo URLs are stored in the `pit_scouting` table:

```typescript
// pit_scouting table schema
{
  photo_urls: string[] | null  // Array of public URLs from storage
}
```

**Example**:
```typescript
const photoUrls = [
  'https://your-project.supabase.co/storage/v1/object/public/robot-photos/1641234567890-abc123.jpg',
  'https://your-project.supabase.co/storage/v1/object/public/robot-photos/1641234567891-def456.jpg'
];

// Store in database
await supabase
  .from('pit_scouting')
  .update({ photo_urls: photoUrls })
  .eq('id', pitScoutingId);
```

---

## File Naming Convention

Files are stored with unique names to prevent collisions:

**Format**: `{timestamp}-{random}.{extension}`

**Example**: `1641234567890-abc123.jpg`

**Components**:
- `1641234567890` - Unix timestamp in milliseconds
- `abc123` - Random string (7 characters, base36)
- `jpg` - Original file extension

**Why this approach**:
- Prevents filename collisions (two teams with same photo name)
- Enables chronological sorting
- Random component adds uniqueness
- Preserves original file type

---

## Storage Limits and Quotas

### Supabase Free Tier
- **Storage**: 1GB total
- **Bandwidth**: 2GB/month
- **File Size**: No hard limit (enforced at app level: 5MB)

### Supabase Pro Tier
- **Storage**: 100GB included
- **Bandwidth**: 200GB/month
- **Additional storage**: $0.125/GB/month

### Estimated Usage (FRC Season)

**Assumptions**:
- 60 teams at an event
- 3 photos per team average
- 2MB average photo size (after compression)

**Per-event**: ~360MB (60 teams × 3 photos × 2MB)

**Full season** (10 events): ~3.6GB

**Recommendation**:
- Use Free tier for testing/small events
- Upgrade to Pro for full-season scouting
- Implement photo compression in UI to reduce storage

---

## Security Best Practices

### ✅ Implemented
- Public bucket (necessary for shareable URLs)
- Authenticated uploads only
- File type validation (MIME type checking)
- File size limits (5MB)

### 🔒 Recommended for Production

1. **Rate Limiting**
   - Limit uploads per user per hour
   - Prevent storage abuse

2. **Content Validation**
   - Server-side image validation (verify actual image format)
   - Reject non-image files that claim to be images

3. **Delete Restrictions**
   - Only allow users to delete their own uploads
   - Or: Only allow scouting leads to delete photos

4. **Audit Logging**
   - Track who uploaded/deleted each photo
   - Add `user_id` metadata to uploaded files

5. **Backup Strategy**
   - Regular exports of critical photos
   - Retention policy for old seasons

### Example: Restrict Deletes to Uploader

```sql
-- More restrictive delete policy
DROP POLICY IF EXISTS "Authenticated users can delete robot photos" ON storage.objects;

CREATE POLICY "Users can delete only their own robot photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'robot-photos'
  AND auth.uid() = owner
);
```

---

## Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause**: User is not authenticated or policies are not active

**Solution**:
1. Verify user is authenticated: `const { data: { session } } = await supabase.auth.getSession()`
2. Check policies exist: See "Verifying the Setup" section
3. Ensure bucket is public: Check `storage.buckets` table

### Issue: "413 Payload Too Large"

**Cause**: File exceeds size limit

**Solution**:
1. Application validates at 5MB (see `validateImageFile()`)
2. Check Supabase project settings for global upload limits
3. Compress images before upload

### Issue: "403 Forbidden" when accessing photo URL

**Cause**: Bucket is not public or read policy missing

**Solution**:
1. Verify bucket is public: `SELECT public FROM storage.buckets WHERE id = 'robot-photos'`
2. Check read policy exists: See "Verifying the Setup" section
3. Ensure URL format is correct: `https://{project}.supabase.co/storage/v1/object/public/robot-photos/{filename}`

### Issue: Photos not appearing in Storage dashboard

**Cause**: Upload failed or wrong bucket

**Solution**:
1. Check browser console for errors
2. Verify `bucket_id` in upload function is `'robot-photos'`
3. Test with a small image file (< 1MB)

---

## Maintenance

### Seasonal Cleanup

At the end of each FRC season:

1. **Export Critical Photos**
   - Download photos of noteworthy robots
   - Backup to external storage

2. **Delete Old Photos** (Optional)
   - Free up storage for next season
   - Keep championship event photos as reference

3. **Review Storage Usage**
   ```sql
   -- Check total storage used
   SELECT
     bucket_id,
     COUNT(*) as file_count,
     SUM(CAST(metadata->>'size' AS INTEGER)) / 1024 / 1024 as total_mb
   FROM storage.objects
   WHERE bucket_id = 'robot-photos'
   GROUP BY bucket_id;
   ```

---

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Image Optimization Best Practices](https://supabase.com/docs/guides/storage/image-transformations)

---

**Setup Checklist**:
- [ ] Bucket `robot-photos` created
- [ ] Bucket set to public
- [ ] INSERT policy applied (authenticated uploads)
- [ ] SELECT policy applied (public reads)
- [ ] DELETE policy applied (authenticated deletes)
- [ ] Policies verified in SQL
- [ ] Test upload performed
- [ ] Photo URL accessible publicly
- [ ] Test delete performed

---

Last Updated: 2025-10-24
