# Storage Quick Reference

**Quick reference for robot photo storage operations**

---

## 🚀 Common Operations

### Upload a Photo
```typescript
import { uploadRobotPhoto } from '@/lib/supabase/storage';

const url = await uploadRobotPhoto(file);
// Returns: "https://project.supabase.co/storage/v1/object/public/robot-photos/1234567890-abc123.jpg"
```

### Delete a Photo
```typescript
import { deleteRobotPhoto } from '@/lib/supabase/storage';

await deleteRobotPhoto(url);
```

### Validate Before Upload
```typescript
import { validateImageFile } from '@/lib/supabase/storage';

const result = validateImageFile(file);
if (!result.valid) {
  alert(result.error); // "File size (7.2MB) exceeds maximum allowed size of 5MB"
  return;
}
```

### Upload Multiple Photos
```typescript
import { uploadMultipleRobotPhotos } from '@/lib/supabase/storage';

const urls = await uploadMultipleRobotPhotos([file1, file2, file3]);
// Returns: ["url1", "url2", "url3"]
```

---

## 📝 Database Operations

### Save Photo URLs to Database
```typescript
import { supabase } from '@/lib/supabase/client';

// Add photo URL to existing array
const { error } = await supabase
  .from('pit_scouting')
  .update({
    photo_urls: [...existingUrls, newUrl]
  })
  .eq('id', pitScoutingId);
```

### Remove Photo URL from Database
```typescript
// Remove deleted URL from array
const { error } = await supabase
  .from('pit_scouting')
  .update({
    photo_urls: existingUrls.filter(url => url !== deletedUrl)
  })
  .eq('id', pitScoutingId);
```

### Fetch Photo URLs
```typescript
const { data } = await supabase
  .from('pit_scouting')
  .select('photo_urls')
  .eq('id', pitScoutingId)
  .single();

const urls = data?.photo_urls || [];
```

---

## 🎨 React Component Examples

### File Input with Upload
```typescript
function PhotoUpload() {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadRobotPhoto(file);
      // Save to database
      await savePhotoUrl(url);
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      onChange={handleUpload}
      disabled={uploading}
    />
  );
}
```

### Photo Gallery
```typescript
function PhotoGallery({ urls }: { urls: string[] }) {
  const handleDelete = async (url: string) => {
    if (!confirm('Delete this photo?')) return;

    try {
      await deleteRobotPhoto(url);
      // Update state/database
    } catch (error) {
      alert('Delete failed');
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {urls.map((url, i) => (
        <div key={i} className="relative">
          <img src={url} alt={`Robot ${i + 1}`} className="w-full h-auto" />
          <button
            onClick={() => handleDelete(url)}
            className="absolute top-2 right-2 bg-red-500 text-white p-1"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## ⚙️ Configuration

### Bucket Settings
- **Bucket name**: `robot-photos`
- **Public**: Yes
- **Max file size**: 5MB
- **Allowed types**: JPEG, PNG, WebP, GIF

### RLS Policies
- **Upload**: Authenticated users only
- **Read**: Public (anyone with URL)
- **Delete**: Authenticated users only

---

## 🔧 Setup Commands

### SQL (run in Supabase SQL Editor)
```sql
-- Apply RLS policies
CREATE POLICY "Authenticated users can upload robot photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'robot-photos');

CREATE POLICY "Public read access to robot photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'robot-photos');

CREATE POLICY "Authenticated users can delete robot photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'robot-photos');
```

### Test Script
```bash
# Test upload/delete functionality
node test-storage.mjs /path/to/test-image.jpg
```

---

## 🐛 Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| "new row violates RLS policy" | Not authenticated | Check user is logged in |
| "413 Payload Too Large" | File > 5MB | Validate before upload |
| "403 Forbidden" | Bucket not public | Set bucket to public |
| Invalid MIME type | Wrong file type | Only upload images |

---

## 📚 Full Documentation

- **Setup Guide**: `/supabase-storage-setup.md`
- **Implementation Details**: `/STORAGE_IMPLEMENTATION.md`
- **Source Code**: `/src/lib/supabase/storage.ts`
- **Test Script**: `/test-storage.mjs`
