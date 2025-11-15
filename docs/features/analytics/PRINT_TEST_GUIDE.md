# Analytics Report Print Testing Guide

**Date**: 2025-11-11
**Related**: SCOUT-88, SCOUT-90, SCOUT-91
**Purpose**: Verify that charts are now visible when printing

---

## Quick Test Steps

### 1. Start the Development Server

```bash
npm run dev
```

Server should start at: http://localhost:3003 (or 3000)

---

### 2. Navigate to a Report Page

**URL Format**:
```
http://localhost:3003/analytics/[eventKey]/report
```

**Example** (replace with actual event key from your database):
```
http://localhost:3003/analytics/2024casd/report
```

---

### 3. Verify Charts Display on Screen

Before testing print, confirm charts are visible on screen:

- ✅ **Top 5 Teams Radar Charts** should be visible
  - Each team should have its own radar chart (pentagon/hexagon shape)
  - Colors should be distinct (blue, green, amber, red, violet)
  - Statistics table should appear next to each radar chart

- ✅ **OPR Rankings Table** should be visible
  - Table with team numbers and statistics
  - Breakdown columns

- ✅ **8 Boxplot Charts** should be visible:
  1. All Coral (L1+L2+L3+L4)
  2. Coral Level 1
  3. Coral Level 2
  4. Coral Level 3
  5. Coral Level 4
  6. All Algae (Processor+Barge)
  7. Algae Processor
  8. Algae Barge

Each boxplot should show:
- Blue dots (match performances)
- Green boxes (Q1-Q3 range)
- Dark green line (median)
- Gray whiskers (min/max)

---

### 4. Open Print Preview

**Mac**: Press `Cmd + P`
**Windows**: Press `Ctrl + P`

A print dialog should open with a preview pane.

---

### 5. Check Print Preview Settings

Before inspecting the preview, ensure these settings:

1. **Destination**:
   - Select "Save as PDF" or your printer

2. **Orientation**:
   - Should show "Landscape" (the page was set to landscape)
   - If not, manually select "Landscape"

3. **Color**:
   - Select "Color" (not black and white)
   - This preserves the blue, green, amber, red colors

4. **Background Graphics**:
   - Enable "Background graphics" (Chrome/Edge)
   - Ensures colors and backgrounds print

---

### 6. Verify Charts in Print Preview

Scroll through the print preview and check:

#### Page 1: Radar Charts
- [ ] Can see all radar charts (pentagon/hexagon shapes)
- [ ] Charts have colors (not blank)
- [ ] Charts have proper size (not tiny or huge)
- [ ] Statistics tables visible next to charts
- [ ] Team numbers are readable

#### Page 2: OPR Table
- [ ] Breakdown table is complete
- [ ] All columns visible
- [ ] Text is readable

#### Page 3+: Boxplots
- [ ] All 8 boxplot categories are visible
- [ ] Each chart shows blue dots (match points)
- [ ] Green boxes are visible (Q1-Q3)
- [ ] Median lines are visible (dark green)
- [ ] Whiskers are visible (gray lines)
- [ ] Team numbers on X-axis are readable
- [ ] Y-axis labels are readable

---

### 7. Test PDF Export

1. In print dialog, select "Save as PDF" as destination
2. Click "Save" or "Print"
3. Choose a location and save the PDF
4. Open the saved PDF in a PDF viewer
5. Verify all charts are visible in the PDF

---

### 8. Test in Different Browsers

Repeat steps 2-7 in:
- [ ] Chrome
- [ ] Safari (Mac)
- [ ] Firefox
- [ ] Edge (Windows)

Charts should be visible in all browsers.

---

## Expected Results

### ✅ PASS Criteria

- All radar charts are visible in print preview
- All boxplots are visible in print preview
- Charts have colors (blue, green, amber, red, etc.)
- Charts are properly sized (not too small or too large)
- Text is readable
- No blank white spaces where charts should be
- PDF export works correctly
- Works in all major browsers

### ❌ FAIL Criteria

- Any chart appears as blank white space
- Charts are invisible in print preview
- Charts are visible on screen but not in print
- PDF export shows blank spaces
- Charts are too small to read
- Browser crashes or errors

---

## Troubleshooting

### Issue: Charts Still Not Visible in Print

**Check**:
1. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear browser cache
3. Restart dev server
4. Check browser console for errors (F12 → Console tab)

### Issue: Charts Too Small

**Possible Cause**: Browser zoom level
**Fix**:
- Reset zoom to 100% (Cmd+0 / Ctrl+0)
- In print dialog, check "Scale" is set to 100%

### Issue: Colors Not Showing

**Check**:
- Print dialog: "Color" selected (not "Black and white")
- Print dialog: "Background graphics" enabled

### Issue: Charts Cut Off

**Check**:
- Print dialog: Orientation is "Landscape"
- Print dialog: Margins are set to "Default" or "Minimum"

### Issue: Charts Visible on Screen but Not Print

**This was the original bug - should now be fixed**

If still happening:
1. Check that you're running the latest code
2. Run `npm run type-check` to ensure no errors
3. Check browser console for JavaScript errors
4. Try a different browser

---

## Technical Verification

### Check the Fix Was Applied

1. **Verify TeamRadarProfile.tsx**:
```bash
grep -n "ResponsiveContainer" src/components/analytics/TeamRadarProfile.tsx
```
Should return: **no results** (ResponsiveContainer removed)

2. **Verify GamePieceBoxplotFull.tsx**:
```bash
grep -n "ResponsiveContainer" src/components/analytics/GamePieceBoxplotFull.tsx
```
Should return: **no results** (ResponsiveContainer removed)

3. **Verify Fixed Dimensions**:
```bash
grep -n "width={" src/components/analytics/TeamRadarProfile.tsx
```
Should show: `width={400}` on radar charts

```bash
grep -n "width={" src/components/analytics/GamePieceBoxplotFull.tsx
```
Should show: `width={Math.max(800, boxplotStats.length * 100)}`

4. **Verify Print CSS**:
```bash
grep -n "size: letter landscape" src/app/analytics/[eventKey]/report/page.tsx
```
Should return: line number where landscape is set

---

## Performance Check

### Load Time
- Report page should load within 2-3 seconds
- Charts should render immediately (no loading spinners after data loads)

### Print Dialog
- Should open instantly (< 1 second)
- Print preview should render within 2-3 seconds

### PDF Generation
- Should complete within 5 seconds
- File size should be reasonable (< 5MB for typical report)

---

## Reporting Issues

If charts are still not visible after following this guide:

1. **Take Screenshots**:
   - Screen view (charts visible)
   - Print preview (charts missing/visible)
   - Browser console errors

2. **Collect Information**:
   - Browser name and version
   - Operating system
   - Event key used for testing
   - Any console errors

3. **Create Issue**:
   - Title: "Print visibility issue in [browser] on [OS]"
   - Include screenshots and information
   - Note which specific charts are affected

---

## Success Confirmation

Once testing is complete and all charts are visible:

1. Mark SCOUT-88 as "Ready for Testing" → "Done"
2. Verify related tickets (SCOUT-90, SCOUT-91) still work correctly
3. Consider deploying to staging/production

---

## Additional Notes

### Why Landscape Orientation?

- Boxplots can be 800-1000px wide (10 teams × 100px)
- Radar charts are 400px wide, often multiple per page
- Portrait letter = ~612px wide (too narrow)
- Landscape letter = ~792px wide (optimal)

### Why Fixed Dimensions?

- ResponsiveContainer doesn't work reliably in print mode
- Fixed dimensions work in both screen and print
- Dimensions chosen to fit well on both screen and paper

### Browser Compatibility

The fix uses standard SVG rendering, which works in all modern browsers:
- Chrome/Chromium: Full support
- Safari: Full support
- Firefox: Full support
- Edge: Full support

No browser-specific workarounds needed.

---

## Next Steps After Successful Testing

1. ✅ Mark print fix tickets as complete
2. Consider server-side PDF generation for better reliability
3. Add user-configurable print options (which charts to include)
4. Add print preview component in the UI
5. Consider adding report templates

---

**Last Updated**: 2025-11-11
**Status**: Ready for Testing
