# 🧪 Realtime Testing Guide - Step by Step

This guide walks you through testing all realtime features in the Cstle Livn Admin Panel.

## Prerequisites

✅ **Run the SQL setup script first**: `/src/db/enable-realtime.sql` in your Supabase Dashboard SQL Editor

## 🎯 Test 1: Team Management Realtime

### Setup
1. Open two browser windows side-by-side
2. Log into your admin panel in both
3. Navigate to "Team Management" in both windows

### Test: Add Team Member
**Window 1:**
1. Click "Add Team Member"
2. Fill in details:
   - Name: "John Test"
   - Role: "Finishing Specialist"
   - Email: "john@test.com"
   - Phone: "555-0123"
   - Skills: "Trim Work, Crown Molding"
3. Click "Save"

**Window 2:**
- ✅ **Expected**: "John Test" should appear in the team list within 1-2 seconds
- ❌ **If not working**: Check browser console for WebSocket connection status

### Test: Edit Team Member
**Window 1:**
1. Find "John Test" in the list
2. Click the "Edit" button
3. Change name to "John Updated"
4. Click "Save Changes"

**Window 2:**
- ✅ **Expected**: Name should update to "John Updated" immediately
- ❌ **If not working**: Verify realtime subscription is active in console

### Test: Delete Team Member
**Window 1:**
1. Click the delete icon (trash) next to "John Updated"
2. Confirm deletion

**Window 2:**
- ✅ **Expected**: "John Updated" should disappear from the list immediately
- ❌ **If not working**: Check for DELETE event in realtime subscription

## 🎯 Test 2: Projects Realtime

### Setup
Navigate to "Projects" in both windows

### Test: Create Project
**Window 1:**
1. Click "Create Project"
2. Enter project details
3. Save

**Window 2:**
- ✅ **Expected**: New project appears instantly

### Test: Update Project Status
**Window 1:**
1. Click on a project
2. Change status from "Planning" to "In Progress"
3. Save

**Window 2:**
- ✅ **Expected**: Project status updates immediately in list view
- ✅ **Expected**: Progress bar updates if viewing project details

## 🎯 Test 3: Inventory Transactions Realtime

### Setup
1. Navigate to "Inventory" in both windows
2. Click on any inventory item to open detail view in Window 1

### Test: Receive Stock
**Window 1:**
1. Click "Receive Stock"
2. Enter quantity: 50
3. Reference: "PO-12345"
4. Notes: "Test realtime"
5. Submit

**Window 2:**
- ✅ **Expected**: 
  - Quantity in inventory list updates immediately
  - If viewing same item details, transaction appears in history

### Test: Issue Stock
**Window 1:**
1. Click "Issue Stock"
2. Enter quantity: 10
3. Submit

**Window 2:**
- ✅ **Expected**: Quantity decreases immediately in both windows

## 🎯 Test 4: CRM Leads Realtime

### Setup
Navigate to "CRM" module in both windows

### Test: New Lead from Website
1. Go to your website booking form
2. Submit a new booking
3. Return to admin panel

**Both Windows:**
- ✅ **Expected**: New lead appears instantly in the leads pipeline
- ✅ **Expected**: Lead count updates in dashboard

### Test: Update Lead Status
**Window 1:**
1. Drag a lead from "New Lead" to "Contacted"
2. Or click lead and change status

**Window 2:**
- ✅ **Expected**: Lead moves between columns immediately
- ✅ **Expected**: Status updates in list view

## 🎯 Test 5: Tasks Realtime

### Setup
Navigate to a project with tasks in both windows

### Test: Create Task
**Window 1:**
1. Click "Add Task"
2. Enter task details
3. Assign to a team member
4. Save

**Window 2:**
- ✅ **Expected**: Task appears immediately in task list
- ✅ **Expected**: Kanban board updates if in kanban view

### Test: Update Task Status
**Window 1:**
1. Drag task from "To Do" to "In Progress"
2. Or change status in task dialog

**Window 2:**
- ✅ **Expected**: Task moves between columns instantly
- ✅ **Expected**: Progress indicators update

## 🎯 Test 6: Multi-User Collaboration

### Setup
1. **User A**: Log in as Manager
2. **User B**: Log in as Associate (different browser/device)

### Test: Team Assignment
**User A (Manager):**
1. Go to Projects
2. Assign a team member to a project
3. Save

**User B (Team Member):**
- ✅ **Expected**: Assignment appears in "My Projects" immediately
- ✅ **Expected**: Notification appears (if notifications enabled)

### Test: Task Completion
**User B (Team Member):**
1. Mark task as "Completed"
2. Add completion notes

**User A (Manager):**
- ✅ **Expected**: Task status updates immediately
- ✅ **Expected**: Project progress bar updates
- ✅ **Expected**: Notification appears for task completion

## 🎯 Test 7: Filter Persistence

### Test: Realtime Respects Filters
**Both Windows:**
1. Apply a filter (e.g., "Active" team members only)
2. Apply search (e.g., search for "John")

**Window 1:**
1. Add a new team member named "John Active" with status "Active"

**Window 2:**
- ✅ **Expected**: "John Active" appears because it matches filters
- ✅ **Expected**: Filtered count updates

**Window 1:**
1. Add a team member named "Sarah Inactive" with status "Inactive"

**Window 2:**
- ✅ **Expected**: "Sarah Inactive" does NOT appear (filtered out)
- ✅ **Expected**: Total count updates but filtered view stays correct

## 🎯 Test 8: Performance & Race Conditions

### Test: Rapid Updates
**Window 1:**
1. Rapidly update the same team member's name 5 times in quick succession

**Window 2:**
- ✅ **Expected**: Updates appear smoothly without flashing
- ✅ **Expected**: Final state matches last update
- ✅ **Expected**: No duplicate entries

### Test: Simultaneous Edits
**Window 1:**
1. Start editing team member "John"
2. Change name to "John A"

**Window 2 (at the same time):**
1. Start editing the same "John"
2. Change name to "John B"

**Result:**
- ✅ **Expected**: Last write wins (either "John A" or "John B")
- ✅ **Expected**: Both windows show the same final state
- ⚠️ **Note**: This is expected behavior - no conflict resolution needed for basic fields

## 🎯 Test 9: Network Resilience

### Test: Temporary Disconnect
1. Open browser DevTools (F12)
2. Go to Network tab
3. Set to "Offline"
4. Wait 5 seconds
5. Set back to "Online"

**Expected:**
- ✅ Realtime reconnects automatically
- ✅ Console shows reconnection message
- ✅ Any missed updates arrive after reconnection

## 🎯 Test 10: Large Data Sets

### Test: Performance with Many Items
1. Ensure you have 50+ team members
2. Open both windows
3. Add a new member

**Expected:**
- ✅ Update appears within 2 seconds even with large list
- ✅ No UI lag or freezing
- ✅ Scroll position maintained

## 📊 Success Criteria

For realtime to be considered "fully working":

- [ ] All CRUD operations sync across windows
- [ ] Updates appear within 1-2 seconds
- [ ] Filters and searches are respected
- [ ] No memory leaks (check DevTools Memory profiler)
- [ ] Clean unsubscribe on page navigation
- [ ] Console shows "✅ Realtime WebSockets Connected"
- [ ] No errors in browser console
- [ ] Works across different user sessions

## 🔍 Debugging Checklist

If realtime is not working:

### 1. Check Browser Console

**Good output:**
```
✅ Realtime WebSockets Connected - Live updates enabled
```

**Bad output:**
```
⚠️ Realtime Setup Required
→ Run /src/db/enable-realtime.sql in your Supabase SQL Editor
```

### 2. Verify Supabase Setup

Run in Supabase SQL Editor:
```sql
-- Check if tables are in publication
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

Should show all tables including:
- team_members
- projects
- tasks
- inventory
- inventory_transactions
- etc.

### 3. Check Network Tab

1. Open DevTools → Network
2. Filter by "WS" (WebSocket)
3. You should see active WebSocket connections
4. Check messages tab to see realtime events

### 4. Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`

### 5. Test Direct Supabase Connection

```javascript
// Paste in browser console
const { createClient } = await import('./utils/supabase/client');
const supabase = createClient();

const channel = supabase
  .channel('test')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'team_members' },
    (payload) => console.log('Realtime event:', payload)
  )
  .subscribe((status) => console.log('Channel status:', status));

// Then try adding a team member and watch console
```

## 🎉 What Success Looks Like

### In Browser Console:
```
✅ Realtime WebSockets Connected - Live updates enabled
✅ Team member created successfully via PostgREST
[Realtime Event] INSERT team_members: {id: "...", name: "John Test", ...}
```

### In the UI:
- Changes appear instantly
- No loading spinners for realtime updates
- Smooth transitions
- Consistent data across all windows
- No duplicate entries
- Proper sorting maintained

### In DevTools:
- Active WebSocket connection
- Realtime events streaming
- No memory leaks
- CPU usage stays low

## 📝 Report Template

If you find issues, report using this format:

```
**Test:** [Test name from above]
**Window 1 Action:** [What you did]
**Window 2 Expected:** [What should happen]
**Window 2 Actual:** [What actually happened]
**Console Output:** [Any errors or warnings]
**Browser:** [Chrome/Firefox/Safari version]
**Network:** [Online/Offline/Slow 3G]
```

## ✅ Final Checklist

Before considering realtime "complete":

- [ ] Team Management: Create/Edit/Delete syncs
- [ ] Projects: CRUD operations sync
- [ ] Tasks: Status changes sync
- [ ] Inventory: Stock movements sync
- [ ] Leads: Pipeline updates sync
- [ ] Vendors: Updates sync
- [ ] Clients: Updates sync
- [ ] Transactions: New entries sync
- [ ] Filters work correctly with realtime
- [ ] Search works correctly with realtime
- [ ] Multi-user collaboration tested
- [ ] Performance acceptable with 100+ items
- [ ] No console errors
- [ ] WebSocket connection stable

## 🚀 Performance Benchmarks

Expected performance:

- **Update Latency**: < 2 seconds
- **Large List (100+ items)**: Update within 3 seconds
- **Memory Usage**: < 50MB increase per window
- **CPU Usage**: < 5% when idle, < 15% during updates
- **Network**: ~5KB/min for active subscriptions

Your realtime system is now fully operational! 🎊
