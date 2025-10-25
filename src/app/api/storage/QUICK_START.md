# Storage API - Quick Start Guide

## 30-Second Overview

New organized storage API for robot photos with team/event path structure.

```typescript
// Upload
const result = await uploadPhoto(imageFile, 930, '2025txaus');
// Returns: { url: "https://...", path: "930/2025txaus/..." }

// Store path in database (recommended)
pitScoutingData.photo_urls = [result.path];

// Display: Generate URL from path
const url = await getPhotoUrl(result.path);
<img src={url} alt="Robot" />

// Delete
await deletePhoto(result.path);
```

---

## API Endpoints

| Method | Endpoint | Auth? | Purpose |
|--------|----------|-------|---------|
| POST | `/api/storage/upload` | ✅ | Upload photo |
| DELETE | `/api/storage/delete` | ✅ | Delete photo |
| GET | `/api/storage/url` | ❌ | Get public URL |

---

## Upload Example

### Using Service Function (Recommended)
```typescript
import { uploadPhoto } from '@/lib/services/storage-api.service';

const result = await uploadPhoto(file, teamNumber, eventKey);
// Returns: { url: string, path: string }
```

### Using Fetch Directly
```typescript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('teamNumber', '930');
formData.append('eventKey', '2025txaus');

const response = await fetch('/api/storage/upload', {
  method: 'POST',
  body: formData,
});

const { data } = await response.json();
// data = { url: "...", path: "..." }
```

---

## Delete Example

### Using Service Function (Recommended)
```typescript
import { deletePhoto } from '@/lib/services/storage-api.service';

await deletePhoto(path);
```

### Using Fetch Directly
```typescript
// Option A: Query parameter
await fetch(`/api/storage/delete?path=${encodeURIComponent(path)}`, {
  method: 'DELETE',
});

// Option B: Request body
await fetch('/api/storage/delete', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ path }),
});
```

---

## Get URL Example

### Using Service Function (Recommended)
```typescript
import { getPhotoUrl } from '@/lib/services/storage-api.service';

const url = await getPhotoUrl(path);
```

### Using Fetch Directly
```typescript
const response = await fetch(
  `/api/storage/url?path=${encodeURIComponent(path)}`
);

const { data } = await response.json();
// data = { url: "..." }
```

---

## Path Structure

```
robot-photos/
  └── {teamNumber}/          (e.g., 930)
      └── {eventKey}/        (e.g., 2025txaus)
          └── {timestamp}-{random}.{ext}
```

**Example**: `930/2025txaus/1735155600000-abc123.jpg`

---

## Validation

### File Requirements
- Max size: 5MB
- Types: JPEG, PNG, WebP, GIF

### Pre-Upload Validation
```typescript
import { validateImageFile } from '@/lib/services/storage-api.service';

const validation = validateImageFile(file);
if (!validation.valid) {
  alert(validation.error);
  return;
}

await uploadPhoto(file, teamNumber, eventKey);
```

---

## Common Patterns

### Upload Multiple Photos
```typescript
import { uploadMultiplePhotos } from '@/lib/services/storage-api.service';

const results = await uploadMultiplePhotos(
  [file1, file2, file3],
  teamNumber,
  eventKey
);

const paths = results.map(r => r.path);
// Save paths to database
```

### Store Path, Display URL
```typescript
// 1. Upload and save path
const { path } = await uploadPhoto(file, 930, '2025txaus');
pitScoutingData.photo_urls = [path];

// 2. Later, when displaying
const url = await getPhotoUrl(path);
<img src={url} alt="Robot" />
```

### Extract Info from Path
```typescript
import { extractPathInfo } from '@/lib/services/storage-api.service';

const info = extractPathInfo('930/2025txaus/1735155600000-abc123.jpg');
// Returns: { teamNumber: '930', eventKey: '2025txaus' }
```

---

## Error Handling

All endpoints return consistent errors:

```typescript
try {
  await uploadPhoto(file, 930, '2025txaus');
} catch (error) {
  // error.message contains user-friendly message
  alert(`Upload failed: ${error.message}`);
}
```

**Common Errors**:
- "File size exceeds maximum of 5MB"
- "Invalid file type. Allowed types: ..."
- "You must be logged in to upload photos"
- "Team number is required"
- "Event key is required"

---

## Full Integration Example

```typescript
import {
  uploadPhoto,
  getPhotoUrl,
  deletePhoto,
  validateImageFile,
} from '@/lib/services/storage-api.service';

// Component for uploading robot photos
function RobotPhotoUpload({ teamNumber, eventKey, onSave }) {
  const [photos, setPhotos] = useState<string[]>([]);

  const handleUpload = async (files: File[]) => {
    // Validate all files first
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
    }

    // Upload all files
    const results = await Promise.all(
      files.map(file => uploadPhoto(file, teamNumber, eventKey))
    );

    // Store paths in state
    const paths = results.map(r => r.path);
    setPhotos([...photos, ...paths]);
  };

  const handleDelete = async (path: string) => {
    await deletePhoto(path);
    setPhotos(photos.filter(p => p !== path));
  };

  const handleSave = () => {
    onSave({ photo_urls: photos });
  };

  return (
    <div>
      {/* Upload UI */}
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleUpload(Array.from(e.target.files || []))}
      />

      {/* Display photos */}
      {photos.map(path => (
        <PhotoDisplay
          key={path}
          path={path}
          onDelete={() => handleDelete(path)}
        />
      ))}

      <button onClick={handleSave}>Save</button>
    </div>
  );
}

function PhotoDisplay({ path, onDelete }) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    getPhotoUrl(path).then(setUrl);
  }, [path]);

  return (
    <div>
      <img src={url} alt="Robot" />
      <button onClick={onDelete}>Delete</button>
    </div>
  );
}
```

---

## Migration from Legacy Routes

### Before
```typescript
// Upload
const formData = new FormData();
formData.append('file', file);
const response = await fetch('/api/upload-photo', {
  method: 'POST',
  body: formData,
});
const { url } = await response.json();
// Save URL (not ideal)

// Delete
await fetch('/api/delete-photo', {
  method: 'DELETE',
  body: JSON.stringify({ url }),
});
```

### After
```typescript
// Upload
const { path, url } = await uploadPhoto(file, teamNumber, eventKey);
// Save path (recommended)

// Delete
await deletePhoto(path);
```

---

## Testing

```bash
# Upload
curl -X POST http://localhost:3000/api/storage/upload \
  -F "file=@robot.jpg" \
  -F "teamNumber=930" \
  -F "eventKey=2025txaus"

# Get URL
curl "http://localhost:3000/api/storage/url?path=930/2025txaus/file.jpg"

# Delete
curl -X DELETE "http://localhost:3000/api/storage/delete?path=930/2025txaus/file.jpg"
```

---

## Documentation

- **Full API Reference**: `/src/app/api/storage/README.md`
- **Implementation Summary**: `/STORAGE_API_IMPLEMENTATION.md`
- **Service Functions**: `/src/lib/services/storage-api.service.ts`

---

## Best Practices

✅ **DO**:
- Store **paths** in database
- Generate **URLs** on display
- Validate files before upload
- Handle errors gracefully
- Use service functions (cleaner than fetch)

❌ **DON'T**:
- Store URLs in database (not portable)
- Skip file validation
- Ignore error messages
- Upload files > 5MB
- Use legacy routes (deprecated)

---

**Ready to Use!** Import service functions and start uploading photos with organized path structure.
