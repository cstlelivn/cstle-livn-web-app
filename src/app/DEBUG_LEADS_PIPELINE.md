# Debugging Leads & Sales Pipeline

## Changes Made

I've added comprehensive debugging and a manual refresh feature to help diagnose why your Sales Pipeline isn't showing the lead you created.

### 1. **Added Manual Refresh Button**
- Location: Sales Pipeline card in CRM Module
- Click the "Refresh" button to manually reload leads and clients data
- The button shows a spinning icon while loading

### 2. **Added Console Logging**
The following console logs will now appear in your browser's console:

#### Lead Creation Flow:
```
➕ Creating lead with input: {...}
✅ Lead created successfully: {...}
```

#### Lead List Fetching:
```
🔍 Leads API - listLeads(): { count: 1, leads: [...], statuses: [...] }
```

#### Lead Refresh:
```
🔄 Refreshing leads...
✅ Leads refreshed: 1 leads
```

#### CRM Module Data:
```
📊 CRM Module - Leads Data: { totalLeads: 1, isLoading: false, ... }
```

#### Pipeline Calculation:
```
📈 Pipeline Stages: {
  stages: [...],
  filteredLeadsCount: 1,
  statusBreakdown: { new: 1, contacted: 0, ... },
  allStatuses: ['New']
}
```

## How to Debug

### Step 1: Open Browser Console
1. Open your app in the browser
2. Press F12 or right-click → Inspect
3. Go to the "Console" tab

### Step 2: Check for Errors
Look for any red error messages. Common issues:
- Database connection errors
- Permission errors
- Real-time subscription errors (expected if you haven't run the SQL script)

### Step 3: Verify Lead Creation
1. Try creating a new lead
2. Check the console for:
   - `➕ Creating lead with input:` - Shows the data being sent
   - `✅ Lead created successfully:` - Confirms the lead was saved
   - Check the `status` field in the created lead data

### Step 4: Check Lead List
1. Click the "Refresh" button on the Sales Pipeline card
2. Check the console for:
   - `🔄 Refreshing leads...`
   - `🔍 Leads API - listLeads():` - Shows all leads from database
   - `📊 CRM Module - Leads Data:` - Shows leads in the component
   - `📈 Pipeline Stages:` - Shows the pipeline calculation

### Step 5: Verify Data Transformation
In the Pipeline Stages log, check:
- `filteredLeadsCount` - Should match your total leads
- `statusBreakdown.new` - Should show count of "New" status leads
- `allStatuses` - Shows all status values (should be ["New", "New", ...])

## Common Issues & Solutions

### Issue 1: Lead Created But Not Showing
**Symptoms:** Toast shows "Lead created" but pipeline stays at 0

**Causes:**
1. Real-time not enabled (you haven't run the SQL script yet)
2. Manual refresh not working
3. Data filtering issue

**Solution:**
1. Click the "Refresh" button
2. Check console logs for the lead data
3. Verify the lead status is "New Lead" in database (it gets transformed to "New" for display)

### Issue 2: Pipeline Shows 0 Despite Having Leads
**Symptoms:** Console shows leads exist but pipeline shows 0

**Causes:**
1. Status mismatch (database has "New Lead", pipeline looks for "New")
2. Filtering removing leads

**Solution:**
Check the console log `📈 Pipeline Stages:` and look at:
- `allStatuses` array - What status values do your leads have?
- `statusBreakdown` - Are they being counted in the right category?

### Issue 3: Real-Time Not Working
**Symptoms:** Need to refresh browser to see new leads

**This is EXPECTED!** You mentioned you haven't run the real-time SQL script yet.

**Solution:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the script from `/FIX_REALTIME_NOW.md`
4. After running the script, real-time updates will work automatically

## Next Steps

1. **Open the browser console** and check what logs appear
2. **Create a new lead** or click **"Refresh"** on the pipeline
3. **Copy the console output** and share it with me if you need help diagnosing the issue
4. **Run the real-time SQL script** when ready to enable automatic updates

## Expected Behavior

### Without Real-Time (Current State):
- Create lead → Toast appears → **Click "Refresh" button** → Pipeline updates
- Browser console shows all the debug logs

### With Real-Time (After SQL Script):
- Create lead → Toast appears → **Pipeline updates automatically** ✨
- No need to click "Refresh" button
- All changes sync instantly across all browser tabs

---

**Note:** All the debugging logs I added are harmless and can be removed later once everything is working. They're very useful for diagnosing issues during setup!
