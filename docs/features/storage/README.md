# Storage

Robot photo upload and management using Supabase Storage.

## Overview

The storage system provides secure, scalable file storage for robot photos captured during pit scouting. Built on Supabase Storage with automatic image optimization and access control.

## Features

- ✅ **Image Upload** - Drag-and-drop and click-to-upload interfaces
- ✅ **Automatic Optimization** - Compression and resizing for web performance
- ✅ **Bucket Management** - Public and private storage buckets
- ✅ **Signed URLs** - Time-limited secure access to private files
- ✅ **Access Control** - Row Level Security for file permissions
- ✅ **Pit Scouting Integration** - Seamless integration with robot assessment forms

## Documentation

### [Implementation Guide](./implementation.md)
**Comprehensive technical guide covering:**
- Storage architecture and bucket setup
- Upload implementation with TypeScript
- Access control and RLS policies
- Image optimization strategies
- Error handling and retry logic

**Use when:**
- Implementing new upload features
- Understanding storage architecture
- Debugging upload issues
- Adding new storage buckets

### [Quick Reference](./quick-reference.md)
**Fast reference for common operations:**
- Upload a file
- Download a file
- Delete a file
- Get signed URL
- List files in bucket

**Use when:**
- Quick code snippets
- Common operations reference
- Integration with other features

## Quick Links

### Components
- `/src/components/scouting/ImageUpload.tsx` - Drag-and-drop upload UI
- `/src/components/scouting/ImageGallery.tsx` - Image display and management (planned)

### Library Code
- `/src/lib/supabase/storage.ts` - Storage utilities and helpers
- `/src/lib/supabase/client.ts` - Supabase client with storage access

### Setup
- `/docs/setup/storage.md` - Initial storage configuration guide

## Architecture

### Storage Buckets

#### `robot-photos` (Public)
**Purpose**: Robot images for pit scouting

**Access**: Public read, authenticated write

**Configuration:**
```sql
-- Created with RLS enabled
-- Policies allow:
-- - Anyone to read (public bucket)
-- - Authenticated scouts to upload
-- - Only admins to delete
```

**File Structure:**
```
robot-photos/
├── {team_number}/
│   ├── {timestamp}_{filename}.jpg
│   ├── {timestamp}_{filename}.jpg
│   └── ...
```

### Upload Flow

1. **Client Selection**: User selects image via drag-and-drop or file picker
2. **Client Validation**: Check file type, size (max 10MB)
3. **Optional Compression**: Resize large images client-side
4. **Upload to Bucket**: Upload to Supabase Storage with metadata
5. **Database Update**: Store file path in pit_scouting record
6. **Display Confirmation**: Show thumbnail and success message

### Access Control

Files are protected with Row Level Security:
- **Public Read**: Anyone can view robot photos (for analysis/strategy)
- **Authenticated Upload**: Only scouts can upload photos
- **Admin Delete**: Only admins can delete files
- **Audit Trail**: All operations logged

## Common Tasks

### Upload a Robot Photo
```typescript
import { uploadRobotPhoto } from '@/lib/supabase/storage';

const file = // File from input
const result = await uploadRobotPhoto(teamNumber, file);

if (result.error) {
  console.error('Upload failed:', result.error);
} else {
  console.log('Uploaded to:', result.data.path);
}
```

### Get Public URL
```typescript
import { getPublicUrl } from '@/lib/supabase/storage';

const url = getPublicUrl('robot-photos', 'team/1234/photo.jpg');
// Returns: https://project.supabase.co/storage/v1/object/public/robot-photos/team/1234/photo.jpg
```

### Delete a File (Admin Only)
```typescript
import { deleteFile } from '@/lib/supabase/storage';

const { error } = await deleteFile('robot-photos', 'team/1234/photo.jpg');
```

## Integration with Pit Scouting

Robot photos are stored in the `pit_scouting` table:

```typescript
interface PitScouting {
  id: string;
  team_number: number;
  robot_photos?: string[]; // Array of storage paths
  // ... other fields
}
```

Photos are automatically linked when uploaded during pit scouting session.

## File Size and Type Restrictions

### Allowed File Types
- `image/jpeg`
- `image/png`
- `image/webp`

### Size Limits
- **Maximum**: 10 MB per file
- **Recommended**: < 5 MB for optimal upload speed
- **Auto-resize**: Images > 2000px width are resized client-side

### Compression
- JPEG: Quality 85%
- PNG: Lossless compression
- WebP: Quality 80% (when supported)

## Troubleshooting

### "Upload failed: File too large"
- Ensure file is < 10 MB
- Check compression is working
- Verify client-side validation

### "Access denied"
- Check user is authenticated
- Verify RLS policies in Supabase
- Confirm bucket exists and is configured

### "Slow uploads"
- Check network connection
- Verify file size is reasonable
- Consider implementing upload progress indicator

### "Image not displaying"
- Verify file path is correct
- Check bucket is public (if using public URL)
- Ensure file was uploaded successfully

## Performance Optimization

### Client-Side Optimization
- Resize images before upload
- Compress JPEG images
- Use WebP when browser supports it
- Show upload progress indicator

### Server-Side Optimization
- CDN caching for public images
- Lazy loading with thumbnails
- Image transformation URLs
- Batch uploads for multiple files

## Future Enhancements

- [ ] Thumbnail generation
- [ ] Image annotation (mark robot features)
- [ ] Bulk upload from device camera roll
- [ ] Offline upload queue
- [ ] Image gallery UI component

---

**Status**: ✅ Production Ready (100% Complete)
**Last Updated**: 2025-10-24
