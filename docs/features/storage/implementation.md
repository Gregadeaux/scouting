# Supabase Storage Implementation Summary

## Overview

Successfully implemented Supabase Storage infrastructure for robot photos in the FRC Scouting System.

**Date**: 2025-10-24
**Status**: ✅ Complete

---

## 📁 Files Created

### 1. `/supabase-storage-setup.md`
**Purpose**: Complete setup guide for configuring Supabase Storage bucket

**Contents**:
- Bucket configuration instructions (via Dashboard and CLI)
- Row-Level Security (RLS) policies with SQL
- Verification steps
- Application integration examples
- Storage limits and quotas
- Security best practices
- Troubleshooting guide
- Seasonal maintenance procedures

**Key Information**:
- Bucket name: `robot-photos`
- Public bucket: Yes (for shareable URLs)
- File size limit: 5MB
- Allowed types: JPEG, PNG, WebP, GIF

### 2. `/src/lib/supabase/storage.ts`
**Purpose**: TypeScript utilities for storage operations

**Exported Functions**:

#### Core Functions
- `uploadRobotPhoto(file: File): Promise<string>`
  - Validates file (size, MIME type)
  - Generates unique filename (`{timestamp}-{random}.{ext}`)
  - Uploads to `robot-photos` bucket
  - Returns public URL
  - Throws `StorageError` on failure

- `deleteRobotPhoto(url: string): Promise<void>`
  - Extracts file path from public URL
  - Deletes from bucket
  - Throws `StorageError` on failure

- `getRobotPhotoUrl(filePath: string): string`
  - Converts file path to public URL
  - Helper for consistency

- `validateImageFile(file: File): ImageValidationResult`
  - Checks file size (max 5MB)
  - Checks MIME type (jpeg, png, webp, gif)
  - Returns `{ valid: boolean, error?: string }`

#### Batch Functions
- `uploadMultipleRobotPhotos(files: File[]): Promise<string[]>`
  - Uploads multiple photos in sequence
  - Returns array of URLs
  - Throws on any failure (partial uploads may succeed)

- `deleteMultipleRobotPhotos(urls: string[]): Promise<void>`
  - Deletes multiple photos in sequence
  - Throws on any failure (partial deletions may succeed)

#### Utility Functions
- `checkPhotoExists(filePath: string): Promise<boolean>`
  - Checks if file exists in bucket

- `getPhotoMetadata(filePath: string): Promise<FileMetadata>`
  - Gets file metadata (size, content type, created date)
  - Throws if file not found

**Custom Types**:
- `ImageValidationResult` - Validation result interface
- `StorageError` - Custom error class with code and statusCode

**Features**:
- Full TypeScript type safety
- Comprehensive JSDoc comments
- Descriptive error handling
- Unique filename generation to prevent collisions
- Validation before upload
- Public URL generation

### 3. `/test-storage.mjs`
**Purpose**: Test script for storage functionality

**Features**:
- Loads environment variables from `.env.local`
- Validates test image file
- Tests upload functionality
- Verifies URL accessibility (HTTP GET)
- Lists files in bucket
- Tests deletion
- Verifies deletion (404 check)
- Colored terminal output
- Comprehensive error messages

**Usage**:
```bash
# With custom test image
node test-storage.mjs /path/to/test-image.jpg

# Uses test-image.jpg in project root if no path provided
node test-storage.mjs
```

**Test Sequence**:
1. Load environment variables
2. Initialize Supabase client
3. Read and validate test image
4. Upload photo to bucket
5. Verify URL is publicly accessible
6. List files in bucket
7. Delete uploaded photo
8. Verify deletion (404)

---

## 🔐 Required Supabase Configuration

### Step 1: Create Bucket
Via **Supabase Dashboard**:
1. Navigate to **Storage**
2. Click **"New bucket"**
3. Name: `robot-photos`
4. Toggle **"Public bucket"** to **ON**
5. Click **"Create bucket"**

### Step 2: Apply RLS Policies
Run in **SQL Editor**:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload robot photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'robot-photos');

-- Allow public read access
CREATE POLICY "Public read access to robot photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'robot-photos');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete robot photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'robot-photos');
```

### Step 3: Verify Setup
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'robot-photos';

-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%robot photos%';
```

---

## 🧪 Testing the Implementation

### Method 1: Using Test Script

```bash
# 1. Ensure you have a test image
# Create or download a small JPEG/PNG image

# 2. Run the test script
node test-storage.mjs /path/to/test-image.jpg

# 3. Check output for:
#    - ✓ Upload successful
#    - ✓ URL accessible
#    - ✓ File listed in bucket
#    - ✓ Delete successful
#    - ✓ URL returns 404
```

### Method 2: Manual Testing in Code

```typescript
import {
  uploadRobotPhoto,
  deleteRobotPhoto,
  validateImageFile,
  StorageError,
} from '@/lib/supabase/storage';

// Example: Upload photo from file input
async function handlePhotoUpload(file: File) {
  // Validate
  const validation = validateImageFile(file);
  if (!validation.valid) {
    console.error('Invalid file:', validation.error);
    return;
  }

  try {
    // Upload
    const url = await uploadRobotPhoto(file);
    console.log('Uploaded:', url);

    // Save URL to database (pit_scouting.photo_urls)
    await supabase
      .from('pit_scouting')
      .update({
        photo_urls: [...existingUrls, url]
      })
      .eq('id', pitScoutingId);

  } catch (error) {
    if (error instanceof StorageError) {
      console.error('Storage error:', error.message, error.code);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Example: Delete photo
async function handlePhotoDelete(url: string) {
  try {
    await deleteRobotPhoto(url);
    console.log('Deleted successfully');

    // Remove URL from database
    await supabase
      .from('pit_scouting')
      .update({
        photo_urls: existingUrls.filter(u => u !== url)
      })
      .eq('id', pitScoutingId);

  } catch (error) {
    if (error instanceof StorageError) {
      console.error('Delete failed:', error.message);
    }
  }
}
```

---

## 📊 Database Integration

### Schema
Photo URLs are stored in the `pit_scouting` table:

```sql
CREATE TABLE pit_scouting (
  id UUID PRIMARY KEY,
  team_number INTEGER,
  photo_urls TEXT[],  -- Array of public URLs
  -- ... other fields
);
```

### TypeScript Type (Existing)
```typescript
interface PitScouting {
  id: string;
  team_number: number;
  photo_urls: string[] | null;
  // ...
}
```

### Example Data
```typescript
{
  id: "uuid-here",
  team_number: 930,
  photo_urls: [
    "https://project.supabase.co/storage/v1/object/public/robot-photos/1641234567890-abc123.jpg",
    "https://project.supabase.co/storage/v1/object/public/robot-photos/1641234567891-def456.jpg"
  ],
  // ...
}
```

---

## 🎯 Usage Patterns

### Pattern 1: Single Photo Upload
```typescript
import { uploadRobotPhoto } from '@/lib/supabase/storage';

const url = await uploadRobotPhoto(file);
// Save to database: pit_scouting.photo_urls = [...existing, url]
```

### Pattern 2: Multiple Photo Upload
```typescript
import { uploadMultipleRobotPhotos } from '@/lib/supabase/storage';

const urls = await uploadMultipleRobotPhotos([file1, file2, file3]);
// Save to database: pit_scouting.photo_urls = urls
```

### Pattern 3: Photo Deletion
```typescript
import { deleteRobotPhoto } from '@/lib/supabase/storage';

await deleteRobotPhoto(url);
// Update database: remove URL from pit_scouting.photo_urls array
```

### Pattern 4: Validation Before Upload
```typescript
import { validateImageFile } from '@/lib/supabase/storage';

const result = validateImageFile(file);
if (!result.valid) {
  showError(result.error);
  return;
}
// Proceed with upload
```

---

## 🔒 Security Features

### Implemented
- ✅ Public bucket (necessary for shareable photo URLs)
- ✅ Authenticated uploads only (RLS policy)
- ✅ Public read access (RLS policy)
- ✅ Authenticated deletes (RLS policy)
- ✅ File size validation (5MB max)
- ✅ MIME type validation (images only)
- ✅ Unique filenames (prevents collisions)

### Production Recommendations
See `supabase-storage-setup.md` for:
- Rate limiting strategies
- Server-side content validation
- Restricting deletes to uploader only
- Audit logging
- Backup strategies

---

## 📈 Storage Estimates

### Per-Event (60 teams)
- 3 photos per team average
- 2MB average per photo (compressed)
- **Total: ~360MB per event**

### Full Season (10 events)
- **Total: ~3.6GB**

### Supabase Tier Recommendations
- **Free Tier (1GB)**: Testing, small events (1-2 events)
- **Pro Tier (100GB)**: Full season scouting (recommended)

---

## 🚀 Next Steps for Integration

### 1. Pit Scouting Form Component
Create form with file input for photos:

```typescript
// components/scouting/PitScoutingForm.tsx
import { uploadRobotPhoto, validateImageFile } from '@/lib/supabase/storage';

function PitScoutingForm() {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        continue;
      }

      try {
        const url = await uploadRobotPhoto(file);
        setPhotoUrls(prev => [...prev, url]);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handlePhotoUpload}
      />
      {/* Display uploaded photos */}
    </div>
  );
}
```

### 2. Photo Gallery Component
Display photos in pit scouting view:

```typescript
// components/scouting/PhotoGallery.tsx
function PhotoGallery({ urls }: { urls: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {urls.map((url, i) => (
        <img key={i} src={url} alt={`Robot photo ${i + 1}`} />
      ))}
    </div>
  );
}
```

### 3. Photo Management
Add delete functionality:

```typescript
import { deleteRobotPhoto } from '@/lib/supabase/storage';

const handlePhotoDelete = async (url: string) => {
  if (!confirm('Delete this photo?')) return;

  try {
    await deleteRobotPhoto(url);
    setPhotoUrls(prev => prev.filter(u => u !== url));
    // Update database
  } catch (error) {
    console.error('Delete failed:', error);
  }
};
```

---

## 🐛 Troubleshooting

### Issue: "new row violates row-level security policy"
**Cause**: User not authenticated or policies not configured

**Solutions**:
1. Verify user is logged in: `supabase.auth.getSession()`
2. Check RLS policies exist (see setup guide)
3. Ensure bucket is public (for reads)

### Issue: "413 Payload Too Large"
**Cause**: File exceeds 5MB limit

**Solutions**:
1. Validate file size before upload using `validateImageFile()`
2. Compress images before upload
3. Check Supabase project upload limits

### Issue: "403 Forbidden" on photo URLs
**Cause**: Bucket not public or read policy missing

**Solutions**:
1. Verify bucket is public: Check Storage dashboard
2. Apply read policy: See setup guide
3. Check URL format is correct

---

## 📚 References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Image Optimization](https://supabase.com/docs/guides/storage/image-transformations)

---

## ✅ Implementation Checklist

**Setup**:
- [ ] Create `robot-photos` bucket in Supabase
- [ ] Set bucket to public
- [ ] Apply INSERT policy (authenticated uploads)
- [ ] Apply SELECT policy (public reads)
- [ ] Apply DELETE policy (authenticated deletes)
- [ ] Verify policies in SQL Editor

**Testing**:
- [ ] Run `node test-storage.mjs` successfully
- [ ] Verify uploaded photo URL is accessible
- [ ] Verify deletion works
- [ ] TypeScript compiles without errors

**Integration** (Future):
- [ ] Create pit scouting form with file input
- [ ] Implement photo upload UI
- [ ] Add photo gallery display
- [ ] Implement photo deletion
- [ ] Update database with photo URLs
- [ ] Add loading states and error handling
- [ ] Test with real scouting workflow

---

**Implementation Complete**: All core storage utilities and documentation created. Ready for UI integration.

Last Updated: 2025-10-24
