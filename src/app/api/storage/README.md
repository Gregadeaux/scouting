# Storage API Routes

Organized API routes for robot photo uploads to Supabase Storage.

## Overview

These routes provide a clean, RESTful API for managing robot photos with:
- **Organized path structure**: `{teamNumber}/{eventKey}/{timestamp}-{filename}`
- **Consistent responses**: Returns both URL and path for database storage
- **Better error handling**: Clear validation and error messages
- **Authentication**: Protected upload/delete, public URL generation

## Endpoints

### 1. Upload Photo

**POST** `/api/storage/upload`

Upload a robot photo with organized path structure.

**Authentication**: Required

**Request**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | ✅ | Image file (JPEG, PNG, WebP, GIF) |
| teamNumber | string | ✅ | Team number (e.g., "930") |
| eventKey | string | ✅ | Event key (e.g., "2025txaus") |

**Validation**:
- File size: Max 5MB
- File types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "url": "https://...supabase.co/storage/v1/object/public/robot-photos/930/2025txaus/1735155600000-abc123.jpg",
    "path": "930/2025txaus/1735155600000-abc123.jpg"
  }
}
```

**Usage Example**:
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
// Save data.path to database (pit_scouting.photo_urls)
// Display data.url in UI
```

---

### 2. Delete Photo

**DELETE** `/api/storage/delete`

Delete a robot photo from storage.

**Authentication**: Required

**Request Options**:

**Option A**: Query parameter
```
DELETE /api/storage/delete?path=930/2025txaus/1735155600000-abc123.jpg
```

**Option B**: Request body
```json
{
  "path": "930/2025txaus/1735155600000-abc123.jpg"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

**Usage Example**:
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

### 3. Get Public URL

**GET** `/api/storage/url`

Generate a public URL for a file path.

**Authentication**: Not required (public URLs)

**Request**: Query parameter
```
GET /api/storage/url?path=930/2025txaus/1735155600000-abc123.jpg
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "url": "https://...supabase.co/storage/v1/object/public/robot-photos/930/2025txaus/1735155600000-abc123.jpg"
  }
}
```

**Note**: This does NOT verify the file exists. The URL will return 404 if the file doesn't exist.

**Usage Example**:
```typescript
const response = await fetch(`/api/storage/url?path=${encodeURIComponent(path)}`);
const { data } = await response.json();
// Use data.url to display image
```

---

## Path Structure

Files are organized by team and event:

```
robot-photos/
├── 930/
│   ├── 2025txaus/
│   │   ├── 1735155600000-abc123.jpg
│   │   └── 1735155700000-def456.jpg
│   └── 2025txhou/
│       └── 1735155800000-ghi789.jpg
└── 1234/
    └── 2025txaus/
        └── 1735155900000-jkl012.jpg
```

**Benefits**:
- Easy to find photos for a specific team/event
- Natural organization for cleanup
- Supports team/event filtering in future features

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common Status Codes**:
- `400` - Bad Request (validation error, missing parameters)
- `401` - Unauthorized (not logged in)
- `500` - Internal Server Error (upload/delete failed)

---

## Comparison to Legacy Routes

### Legacy Routes

**Upload**: `/api/upload-photo`
- ❌ Flat file structure (all files in root)
- ❌ Only returns URL
- ❌ No organization by team/event

**Delete**: `/api/delete-photo`
- ❌ Accepts URL instead of path
- ❌ Extra parsing to extract path from URL

### New Routes

**Upload**: `/api/storage/upload`
- ✅ Organized path structure: `{teamNumber}/{eventKey}/{filename}`
- ✅ Returns both URL and path
- ✅ Better for database storage and future features

**Delete**: `/api/storage/delete`
- ✅ Accepts path directly (no URL parsing needed)
- ✅ Supports both query param and body
- ✅ More flexible API design

**URL**: `/api/storage/url` (new)
- ✅ Generate public URL from path
- ✅ No auth required
- ✅ Useful for display/preview features

---

## Integration with Pit Scouting

When saving pit scouting data, store the **path** in the database:

```typescript
// Upload photo
const formData = new FormData();
formData.append('file', imageFile);
formData.append('teamNumber', teamNumber.toString());
formData.append('eventKey', eventKey);

const uploadResponse = await fetch('/api/storage/upload', {
  method: 'POST',
  body: formData,
});

const { data } = await uploadResponse.json();

// Save to database
const pitScoutingData = {
  team_number: teamNumber,
  event_key: eventKey,
  photo_urls: [data.path], // Store path, not URL!
  // ... other fields
};

// When displaying, generate URL from path
const urlResponse = await fetch(`/api/storage/url?path=${encodeURIComponent(path)}`);
const { data: urlData } = await urlResponse.json();
// Display: <img src={urlData.url} />
```

**Why store path instead of URL?**
- Paths are stable, URLs may change (e.g., if Supabase project is moved)
- Easier to migrate to different storage backend
- Smaller storage footprint in database

---

## Testing

### Manual Testing

1. **Upload a photo**:
```bash
curl -X POST http://localhost:3000/api/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@robot.jpg" \
  -F "teamNumber=930" \
  -F "eventKey=2025txaus"
```

2. **Get URL from path**:
```bash
curl "http://localhost:3000/api/storage/url?path=930/2025txaus/1735155600000-abc123.jpg"
```

3. **Delete photo**:
```bash
curl -X DELETE "http://localhost:3000/api/storage/delete?path=930/2025txaus/1735155600000-abc123.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Migration Guide

To migrate from legacy routes to new routes:

### Before (Legacy)
```typescript
// Upload
const formData = new FormData();
formData.append('file', imageFile);
const response = await fetch('/api/upload-photo', {
  method: 'POST',
  body: formData,
});
const { url } = await response.json();
// Save URL to database

// Delete
await fetch('/api/delete-photo', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url }),
});
```

### After (New)
```typescript
// Upload
const formData = new FormData();
formData.append('file', imageFile);
formData.append('teamNumber', '930');
formData.append('eventKey', '2025txaus');
const response = await fetch('/api/storage/upload', {
  method: 'POST',
  body: formData,
});
const { data } = await response.json();
// Save data.path to database

// Delete
await fetch(`/api/storage/delete?path=${encodeURIComponent(path)}`, {
  method: 'DELETE',
});

// Get URL (when displaying)
const urlResponse = await fetch(`/api/storage/url?path=${encodeURIComponent(path)}`);
const { data: urlData } = await urlResponse.json();
// Display: <img src={urlData.url} />
```

---

## Future Enhancements

Potential additions:
- **Batch upload**: `/api/storage/upload-batch` for multiple files
- **List photos**: `/api/storage/list?teamNumber=930&eventKey=2025txaus`
- **Metadata**: `/api/storage/metadata?path=...` (size, created date, etc.)
- **Cleanup**: `/api/storage/cleanup?eventKey=2025txaus` (delete old event photos)

---

## Security Notes

- ✅ **Authentication**: Upload and delete require logged-in user
- ✅ **File validation**: Size (5MB) and MIME type checks
- ✅ **Unique filenames**: Timestamp + random string prevents collisions
- ✅ **Public URLs**: Anyone can view photos (appropriate for FRC scouting)
- ⚠️ **No RLS policies**: Currently relying on API-level auth
  - Consider adding Supabase Storage RLS policies for defense-in-depth

---

## Related Files

- **API Routes**:
  - `/src/app/api/storage/upload/route.ts` - Upload endpoint
  - `/src/app/api/storage/delete/route.ts` - Delete endpoint
  - `/src/app/api/storage/url/route.ts` - URL generation endpoint

- **Utilities**:
  - `/src/lib/supabase/storage.ts` - Client-side storage utilities
  - `/src/lib/api/response.ts` - API response helpers

- **Legacy Routes** (can be deprecated):
  - `/src/app/api/upload-photo/route.ts`
  - `/src/app/api/delete-photo/route.ts`

- **Supabase**:
  - Bucket: `robot-photos` (created in Supabase Storage)
  - Path structure: `{teamNumber}/{eventKey}/{timestamp}-{filename}`
