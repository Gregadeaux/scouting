# Supabase Storage Setup Checklist

**Follow this checklist to configure robot photo storage**

---

## 📋 Pre-Setup

- [ ] You have access to your Supabase project dashboard
- [ ] You have the Supabase project URL and anon key in `.env.local`
- [ ] You have reviewed `supabase-storage-setup.md`

---

## 🪣 Step 1: Create Storage Bucket

### Via Supabase Dashboard

1. [ ] Log into [Supabase Dashboard](https://app.supabase.com)
2. [ ] Navigate to your project
3. [ ] Click **Storage** in the left sidebar
4. [ ] Click **"New bucket"** button
5. [ ] Enter bucket name: `robot-photos`
6. [ ] Toggle **"Public bucket"** to **ON** (important!)
7. [ ] Click **"Create bucket"**
8. [ ] Verify bucket appears in list

---

## 🔐 Step 2: Apply RLS Policies

### Via SQL Editor

1. [ ] Click **SQL Editor** in the left sidebar
2. [ ] Click **"New query"**
3. [ ] Copy and paste the following SQL:

```sql
-- =====================================================
-- Storage RLS Policies for robot-photos Bucket
-- =====================================================

-- Policy 1: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload robot photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'robot-photos');

-- Policy 2: Allow public read access
CREATE POLICY "Public read access to robot photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'robot-photos');

-- Policy 3: Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete robot photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'robot-photos');
```

4. [ ] Click **"Run"** button
5. [ ] Verify success message appears

---

## ✅ Step 3: Verify Configuration

### Check Bucket Exists

1. [ ] In SQL Editor, run:
```sql
SELECT * FROM storage.buckets WHERE id = 'robot-photos';
```

2. [ ] Verify result shows:
   - `id` = `robot-photos`
   - `name` = `robot-photos`
   - `public` = `true`

### Check Policies Exist

1. [ ] In SQL Editor, run:
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%robot photos%'
ORDER BY cmd;
```

2. [ ] Verify 3 policies returned:
   - `Authenticated users can delete robot photos` (DELETE)
   - `Authenticated users can upload robot photos` (INSERT)
   - `Public read access to robot photos` (SELECT)

---

## 🧪 Step 4: Test Storage

### Option A: Using Test Script

1. [ ] Ensure you have a test image (JPEG/PNG, < 5MB)
2. [ ] Run test script:
```bash
node test-storage.mjs /path/to/test-image.jpg
```
3. [ ] Verify all tests pass:
   - [ ] ✓ Upload successful
   - [ ] ✓ URL accessible (HTTP 200)
   - [ ] ✓ File listed in bucket
   - [ ] ✓ Delete successful
   - [ ] ✓ URL returns 404 after deletion

### Option B: Manual Test via Dashboard

1. [ ] Go to **Storage** → **robot-photos**
2. [ ] Click **"Upload file"**
3. [ ] Select a test image
4. [ ] Verify file appears in list
5. [ ] Click on file name
6. [ ] Click **"Copy URL"**
7. [ ] Open URL in browser
8. [ ] Verify image loads
9. [ ] Delete file from dashboard
10. [ ] Refresh URL in browser
11. [ ] Verify 404 error

---

## 📊 Step 5: Verify Database Integration

The `pit_scouting` table already has a `photo_urls` column (TEXT[]).

1. [ ] Verify column exists:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pit_scouting'
  AND column_name = 'photo_urls';
```

Expected result:
```
column_name  | data_type
photo_urls   | ARRAY
```

2. [ ] Test inserting photo URLs:
```sql
-- Insert test data
INSERT INTO pit_scouting (team_number, event_key, photo_urls)
VALUES (
  930,
  '2025fake',
  ARRAY[
    'https://your-project.supabase.co/storage/v1/object/public/robot-photos/test-1.jpg',
    'https://your-project.supabase.co/storage/v1/object/public/robot-photos/test-2.jpg'
  ]
)
RETURNING id, photo_urls;
```

3. [ ] Verify data inserted correctly
4. [ ] Delete test row:
```sql
DELETE FROM pit_scouting WHERE event_key = '2025fake';
```

---

## 🎉 Step 6: Final Verification

- [ ] Bucket `robot-photos` exists and is public
- [ ] 3 RLS policies applied (INSERT, SELECT, DELETE)
- [ ] Test upload succeeded
- [ ] Public URLs are accessible
- [ ] Test deletion succeeded
- [ ] Database `photo_urls` column works
- [ ] `test-storage.mjs` script runs successfully

---

## 📝 Post-Setup Notes

### Storage Limits

**Free Tier**:
- 1GB storage
- 2GB bandwidth/month

**Pro Tier** (recommended for full season):
- 100GB storage
- 200GB bandwidth/month

### Estimated Usage
- **Per event** (60 teams, 3 photos each, 2MB avg): ~360MB
- **Full season** (10 events): ~3.6GB

**Recommendation**: Upgrade to Pro tier before first major event.

### Next Steps

1. [ ] Review `STORAGE_IMPLEMENTATION.md` for usage patterns
2. [ ] Review `STORAGE_QUICK_REFERENCE.md` for code examples
3. [ ] Implement photo upload in pit scouting form
4. [ ] Implement photo gallery display
5. [ ] Test with real scouting workflow

---

## 🆘 Troubleshooting

### Upload Fails with RLS Policy Error

**Problem**: "new row violates row-level security policy"

**Solution**:
- Ensure user is authenticated before upload
- Check INSERT policy exists for `authenticated` role
- Verify `bucket_id = 'robot-photos'` in policy

### Public URLs Return 403 Forbidden

**Problem**: Can't access photo URLs

**Solution**:
- Verify bucket is public (check `storage.buckets` table)
- Ensure SELECT policy exists for `public` role
- Clear browser cache and retry

### Delete Fails with RLS Policy Error

**Problem**: "new row violates row-level security policy"

**Solution**:
- Ensure user is authenticated before delete
- Check DELETE policy exists for `authenticated` role

### Test Script Fails

**Problem**: `test-storage.mjs` errors

**Solution**:
- Verify `.env.local` has correct Supabase credentials
- Check test image file exists and is < 5MB
- Ensure bucket is created and public
- Review RLS policies

---

## 📞 Support Resources

- **Setup Guide**: `supabase-storage-setup.md`
- **Implementation Guide**: `STORAGE_IMPLEMENTATION.md`
- **Quick Reference**: `STORAGE_QUICK_REFERENCE.md`
- **Source Code**: `src/lib/supabase/storage.ts`
- **Supabase Docs**: https://supabase.com/docs/guides/storage

---

**Setup Complete!** ✅

Your Supabase Storage is now configured for robot photos. You can begin integrating photo upload/display into the pit scouting forms.

---

**Completion Date**: _____________

**Verified By**: _____________
