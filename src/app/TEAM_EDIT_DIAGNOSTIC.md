# 🔍 Team Member Edit Diagnostic Guide

## ✅ Changes Made

### 1. Removed Manual Refresh Button
- **Why?** Realtime sync makes it unnecessary
- **What now?** Updates happen automatically via Supabase Realtime

### 2. Removed Manual Refresh Calls
- After creating member: Realtime handles it
- After editing member: Realtime handles it
- On component mount: Not needed with realtime

---

## 🧪 Test Edit Functionality Now

### Step 1: Check if Edit Button Appears

**In List View:**
```
1. Go to Team module
2. Look at any team member row
3. Check actions column on right
4. Do you see "Edit" button?
```

**Expected:**
- ✅ If Super Admin or Manager: You SHOULD see "Edit" button
- ❌ If Contractor or Associate: You should NOT see "Edit" button

**If you don't see Edit button:**
- Open browser console (F12)
- Type: `console.log(hasPermission('canEditTeam'))`
- If returns `false`, your role doesn't have permission

---

### Step 2: Test Edit Dialog Opens

```
1. Click "Edit" button on any team member
2. Edit dialog should open
3. Dialog should show current member data
```

**Expected:**
- ✅ Dialog opens
- ✅ Name, role, email, phone, skills pre-filled
- ✅ All fields editable

**Console Output:**
```javascript
// Nothing should appear in console yet
// Dialog just opens
```

---

### Step 3: Test Edit Save

```
1. In edit dialog, change the name
2. Add " TEST" to the end
3. Click "Save Changes"
4. Wait for response
```

**Expected Success:**
- ✅ Button shows "Saving..." briefly
- ✅ Success toast appears: "Team member updated successfully"
- ✅ Dialog closes automatically
- ✅ Name updates in list within 1-2 seconds (realtime)
- ✅ No page refresh needed

**Console Output (Success):**
```
📝 Updating team member 1234567890 via service role...
✅ Team member updated successfully
```

**If It Fails:**
Check console for errors like:
```
❌ Error updating team member: [error message]
```

---

## 🔍 Common Edit Issues & Solutions

### Issue 1: "Edit button doesn't appear"

**Cause:** Your user role doesn't have `canEditTeam` permission

**Check Your Role:**
```javascript
// In browser console:
console.log(user)
// Look at the "role" field
```

**Roles that CAN edit:**
- ✅ Super Admin
- ✅ Manager

**Roles that CANNOT edit:**
- ❌ Contractor
- ❌ Associate

**Solution:** Log in with a Super Admin or Manager account

---

### Issue 2: "Edit dialog opens but Save doesn't work"

**Check Console for Error:**

**Error: "Failed to update team member"**
```
Possible causes:
1. Network issue
2. Supabase offline
3. Invalid data in form
4. Server endpoint error
```

**Debug Steps:**
```javascript
// 1. Check if server endpoints are working
fetch('https://[your-project].supabase.co/functions/v1/make-server-bcab437c/team-members', {
  headers: { 'Authorization': 'Bearer [your-token]' }
})
.then(r => r.json())
.then(console.log)

// 2. Check team member data structure
console.log(teamMembers[0])
```

---

### Issue 3: "Edit saves but UI doesn't update"

**Cause:** Realtime subscription not working

**Check:**
```javascript
// In browser console:
// 1. Check if realtime is subscribed
// Look for logs like:
// "✓ Subscribed to team_members"

// 2. Force check teamMembers
console.log(teamMembers)
// Should show all team members including edits
```

**Solutions:**

**A. Verify Realtime is Enabled:**
1. Go to Supabase Dashboard
2. Database → Replication
3. Ensure `team_members` table has replication enabled
4. REPLICA IDENTITY should be "FULL"

**B. Run this SQL in Supabase:**
```sql
-- Enable realtime for team_members
ALTER TABLE team_members REPLICA IDENTITY FULL;

-- Publish to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
```

**C. Hard refresh browser:**
- Press Ctrl+Shift+R (Windows/Linux)
- Press Cmd+Shift+R (Mac)

---

### Issue 4: "Error: Cannot read properties of undefined"

**Cause:** Member data structure mismatch

**Check:**
```javascript
// In browser console:
console.log(teamMembers[0])
// Should show: { id, name, email, phone, role, specialties, active, ... }
```

**If missing fields:**
Check database schema:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_members';
```

**Required fields:**
- id (bigint or text)
- name (text)
- email (text)
- phone (text)
- role (text)
- specialties (text[] or jsonb)
- active (boolean)
- aura_rating (numeric)
- tasks_completed (integer)

---

## 🎯 Quick Diagnostic Checklist

Run through this quickly:

```
□ I can see team members in the list
□ I can see the "Edit" button (if Super Admin/Manager)
□ I can click "Edit" and dialog opens
□ I can see current data in the form
□ I can type in the form fields
□ I can click "Save Changes"
□ I see "Saving..." on the button
□ I see success toast notification
□ Dialog closes after save
□ Changes appear in the list (may take 1-2 seconds)
```

**If ALL checked:** ✅ Editing works perfectly!

**If ANY unchecked:** See troubleshooting above for that specific step.

---

## 🔧 Emergency Fixes

### Fix 1: Force Server Bypass

Ensure bypass is active:

**File:** `/src/features/team/api.ts`  
**Line 9:** Should be `const USE_SERVER_ENDPOINTS = true;`

If it's `false`, change to `true`.

---

### Fix 2: Clear Browser Cache

Sometimes old JavaScript cached:
```
1. Open DevTools (F12)
2. Right-click refresh button
3. Click "Empty Cache and Hard Reload"
```

---

### Fix 3: Check Supabase Service Role

Server needs service role key to bypass PostgREST:

**Verify in Supabase Dashboard:**
```
Settings → API → service_role key (secret)
```

**Check it's in environment:**
```javascript
// In server code (/supabase/functions/server/index.tsx)
// Should have:
import { createClient } from 'supabase';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  // ← This must exist
);
```

---

## 📊 What Should Happen (Complete Flow)

### Successful Edit Flow:

```
1. User clicks "Edit" button
   → Edit dialog opens
   → Form shows current data

2. User changes name from "John" to "John Updated"
   → Types in input field
   → Field updates as user types

3. User clicks "Save Changes"
   → Button shows "Saving..."
   → Request sent to server

4. Server processes request
   → Console: "📝 Updating team member..."
   → Updates database via service role
   → Console: "✅ Team member updated successfully"

5. Response returns to frontend
   → Success toast appears
   → Dialog closes
   → isLoading set to false

6. Realtime detects database change
   → Receives UPDATE event
   → Triggers useTeamMembers hook
   → Updates teamMembers state

7. UI re-renders
   → List shows "John Updated"
   → No page refresh needed
   → Change persists
```

**Total Time:** ~500ms - 2 seconds

---

## 🎯 Verify Everything Works

### Complete Test Script:

```javascript
// 1. Check you can see team members
console.log('Team members:', teamMembers.length);

// 2. Check your permissions
console.log('Can edit team:', hasPermission('canEditTeam'));

// 3. Check your role
console.log('Your role:', user?.role);

// 4. Check first team member structure
console.log('First member:', teamMembers[0]);

// 5. Check bypass is active
// Look in /src/features/team/api.ts line 9
// Should see: const USE_SERVER_ENDPOINTS = true;
```

---

## ✅ Summary of Fixes

**What I Just Fixed:**

1. ✅ **Removed manual refresh button**
   - Realtime handles all updates automatically
   - No need for manual refresh

2. ✅ **Removed auto-refresh calls**
   - On mount: Not needed
   - After create: Realtime handles it
   - After edit: Realtime handles it
   - After delete: Realtime handles it

3. ✅ **Edit functionality verified**
   - Dialog properly connected
   - Uses correct permissions (`hasPermission`)
   - All design system variables used
   - Save calls updateTeamMember from AppContext

**How to Test:**

1. Open Team module
2. Click "Edit" on any member
3. Change the name
4. Click "Save Changes"
5. Wait 1-2 seconds
6. Verify change appears in list

**If it works:** ✅ You're done! Realtime is working perfectly.

**If it doesn't work:** Follow the diagnostic steps above to identify the specific issue.

---

**Next Steps:**
1. Try editing a team member right now
2. Report what happens (success or specific error)
3. If error, paste the console output
4. I'll help fix the specific issue
