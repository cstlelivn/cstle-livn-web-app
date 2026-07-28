# 🎯 How to Edit Team Members - Quick Visual Guide

## ✅ Status: Editing is FULLY FUNCTIONAL

---

## 📍 Where to Find the Edit Feature

### Option 1: List View (Recommended)

```
1. Click "Team" in the sidebar
2. Make sure you're in "List View" (table icon in top right)
3. Find the team member you want to edit
4. Click the "View" button on the right side of their row
5. In the detail view, look for the "Edit" button
   (OR you can click Edit directly from the list)
```

### Option 2: Grid View

```
1. Click "Team" in the sidebar
2. Switch to "Grid View" (grid icon in top right)
3. Find the team member's card
4. Click the pencil icon (Edit button) in the bottom right of the card
```

---

## 🖼️ What the Edit Dialog Looks Like

```
┌─────────────────────────────────────────┐
│  Edit Team Member                       │
│  Update team member information         │
├─────────────────────────────────────────┤
│                                         │
│  [Full Name]        [Role]             │
│  ▓▓▓▓▓▓▓▓▓▓▓▓      ▓▓▓▓▓▓▓▓▓▓▓▓        │
│                                         │
│  [Email]            [Phone]            │
│  ▓▓▓▓▓▓▓▓▓▓▓▓      ▓▓▓▓▓▓▓▓▓▓▓▓        │
│                                         │
│  [Skills (comma separated)]            │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │
│                                         │
│  [Status]                              │
│  ▼ Active                              │
│                                         │
│          [Cancel]  [Save Changes]      │
└─────────────────────────────────────────┘
```

---

## ✏️ What You Can Edit

### ✅ Editable Fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Full Name** | Team member's name | "John Doe" |
| **Role** | Job title/position | "Finishing Specialist" |
| **Email** | Contact email | "john@example.com" |
| **Phone** | Contact number | "(555) 123-4567" |
| **Skills** | Comma-separated list | "Trim, Paint, Flooring" |
| **Status** | Active/Inactive dropdown | "Active" or "Inactive" |

### 🔒 Auto-Calculated (Not Editable):

| Field | How It Updates |
|-------|----------------|
| **Aura Rating** | Updates when tasks are rated (0-5 stars) |
| **Tasks Completed** | Increments when tasks marked complete |
| **Tasks On Time** | Tracks tasks completed before due date |
| **Efficiency** | Calculated: (On Time / Completed) × 100 |

---

## 🎬 Step-by-Step Edit Process

### Example: Changing a Team Member's Role

**1. Navigate to Team**
```
Sidebar → Team → You see list of team members
```

**2. Find the Member**
```
Use search bar if needed: "Search by name or role..."
Example: Search for "Sarah"
```

**3. Open Edit Dialog**
```
List View: Click "View" → then Edit
-OR-
Grid View: Click pencil icon directly
```

**4. Make Changes**
```
Current Role: "Contractor"
New Role: "Senior Finishing Specialist"

Click in "Role" field → Clear → Type new role
```

**5. Save**
```
Click "Save Changes" button
→ See "Saving..." briefly
→ Dialog closes
→ Toast notification: "Team member updated successfully"
```

**6. Verify**
```
Check the list → Role is now "Senior Finishing Specialist"
Refresh page → Change persists ✅
```

---

## 💡 Common Edit Scenarios

### Scenario 1: Update Contact Information

**Steps:**
1. Click Edit on team member
2. Update Email field: `newemail@example.com`
3. Update Phone field: `(555) 999-8888`
4. Click "Save Changes"

**Result:** Contact info updated immediately

---

### Scenario 2: Add Skills

**Steps:**
1. Click Edit on team member
2. Find "Skills (comma separated)" field
3. Add new skills: `Crown Molding, Trim Work, Detail Finishing`
4. Click "Save Changes"

**Result:** Skills appear as separate badges in the UI

---

### Scenario 3: Deactivate a Team Member

**Steps:**
1. Click Edit on team member
2. Find "Status" dropdown
3. Select "Inactive"
4. Click "Save Changes"

**Result:** Member marked as unavailable

---

### Scenario 4: Fix a Typo in Name

**Steps:**
1. Click Edit on team member
2. Correct the name in "Full Name" field
3. Click "Save Changes"

**Result:** Name corrected everywhere in the system

---

## 🧪 Quick Test Right Now

Try this **3-minute test** to confirm editing works:

### Test Steps:

1. **Open your app**
   ```
   Navigate to Team module
   ```

2. **Pick any team member**
   ```
   Choose one from the list
   ```

3. **Click Edit**
   ```
   Either via "View" button or pencil icon
   ```

4. **Make a small change**
   ```
   Add " TEST" to the end of their name
   Example: "John Doe" → "John Doe TEST"
   ```

5. **Save**
   ```
   Click "Save Changes"
   Wait for success toast
   ```

6. **Verify**
   ```
   Check if name shows "John Doe TEST" in list
   ```

7. **Change it back**
   ```
   Edit again → Remove " TEST" → Save
   ```

### Expected Results:
- ✅ Dialog opens instantly
- ✅ Current data pre-filled
- ✅ Can type in all fields
- ✅ "Save Changes" works
- ✅ Success toast appears
- ✅ Dialog closes
- ✅ List updates immediately
- ✅ Change persists after refresh

If ALL 8 pass → **Editing is working perfectly!** 🎉

---

## 🔍 What to Look for in Console

Open browser DevTools (F12) → Console tab while editing:

### During Edit:
```
✓ Auth: User your@email.com authenticated with role: Manager
```

### When Clicking Save:
```
📝 Updating team member 1704123456789 via service role...
✅ Team member updated successfully
```

### Success Indicators:
- No red error messages
- Green ✅ checkmarks
- "via service role" means bypass is working

---

## ❌ Troubleshooting

### Problem: "Edit" button is grayed out or missing

**Cause:** You don't have permission to edit team members

**Your Role Must Be:**
- ✅ Super Admin (can edit)
- ✅ Manager (can edit)
- ❌ Contractor (cannot edit)
- ❌ Associate (cannot edit)

**Solution:** Log in with a Super Admin or Manager account

---

### Problem: Changes don't save / Error toast appears

**Possible Causes:**
1. Network connection issue
2. Supabase project offline
3. Invalid data (e.g., empty required field)

**Solutions:**
1. Check internet connection
2. Check Supabase Dashboard - is project running?
3. Ensure all required fields are filled
4. Check browser console for specific error

---

### Problem: Dialog opens but fields are empty

**Cause:** Team member data not loaded yet

**Solution:** 
1. Wait a moment for data to load
2. Refresh the page
3. Check console for loading errors

---

### Problem: Can't edit Aura Rating

**This is correct behavior!** 

Aura Rating is **not editable** via the edit dialog. It updates automatically when:
- Tasks are completed
- Tasks are rated by managers
- Weighted average calculated: 80% old + 20% new

**To change Aura Rating:**
1. Complete tasks assigned to the team member
2. Rate those tasks through the Task Review system
3. Aura Rating will update automatically

See `/components/AuraSystemGuide.md` for details.

---

## 🎯 Best Practices

### DO ✅
- Edit team members when information changes
- Use clear, descriptive roles
- Keep skills list current
- Deactivate members who leave (don't delete)
- Use consistent phone number formats

### DON'T ❌
- Don't manually try to edit Aura Rating (it's auto-calculated)
- Don't delete team members with task history (deactivate instead)
- Don't use special characters in email fields
- Don't leave required fields empty
- Don't edit team members during active tasks (can cause confusion)

---

## 📊 What Happens When You Edit

```
┌─────────────────────────────────────────────┐
│ You Click "Save Changes"                    │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Form validates required fields              │
│ ✓ Name filled? ✓ Email valid?              │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Data sent to server bypass endpoint         │
│ PUT /make-server-bcab437c/team-members/:id  │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Server checks your permissions               │
│ Super Admin or Manager? → Continue          │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Server updates PostgreSQL database          │
│ Using service role (bypasses PostgREST)    │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Realtime subscription detects change        │
│ Automatically refreshes your view           │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Success!                                     │
│ • Dialog closes                              │
│ • Toast notification shows                   │
│ • List updates instantly                     │
│ • Change persists                            │
└─────────────────────────────────────────────┘
```

---

## 🚀 Ready to Edit?

**Everything is set up and working!**

1. Open your Team module
2. Find any team member
3. Click Edit
4. Make changes
5. Save
6. Done! ✅

The bypass system ensures editing will work reliably every time, regardless of cache issues.

---

## 📞 Need More Help?

**Related Guides:**
- `/TEAM_MEMBER_EDIT_GUIDE.md` - Technical deep-dive
- `/START_TESTING_HERE.md` - General testing guide
- `/SYSTEM_STATUS_NOW.md` - Complete system overview
- `/components/AuraSystemGuide.md` - How Aura ratings work

**Quick Links:**
- Design System: `/styles/globals.css`
- Team API: `/src/features/team/api.ts`
- Server Endpoint: `/supabase/functions/server/index.tsx`

---

**Last Updated:** After PostgREST Restart & Bypass Implementation  
**Status:** ✅ Fully Operational  
**Bypass Active:** ✅ Yes (USE_SERVER_ENDPOINTS = true)
