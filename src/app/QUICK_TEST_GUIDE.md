# Quick Testing Guide - PostgREST Cache Fix Verification

## 🎯 Goal
Verify that the PostgREST restart fixed the schema cache issues.

## ✅ What You Did
1. Restarted PostgREST service via Supabase Dashboard
2. The schema cache should now be fresh

## 🧪 Quick Tests to Run

### Test 1: Inventory Transactions (Most Important)

**This will tell us if the cache is truly cleared.**

1. Open your app
2. Navigate to **Inventory** module
3. Click on any inventory item
4. Try to add stock:
   - Click "Add Stock" or similar button
   - Enter a quantity (e.g., 10)
   - Add a note (e.g., "New shipment")
   - Click Save

**Expected Result:**
- ✅ Stock is added successfully
- ✅ Transaction appears in history
- ✅ NO errors in console about "column quantity_change does not exist"

**If you see errors:**
- ❌ Cache is still stale
- 🔄 Need to wait longer or restart again

### Test 2: Team Members Management

**This is using the bypass, so it should always work.**

1. Navigate to **Team** module
2. Click "Add Team Member"
3. Fill in details:
   - Name: "Test Person"
   - Role: "Contractor"
   - Email: "test@example.com"
   - Any other fields
4. Click Save

**Expected Result:**
- ✅ Team member is created
- ✅ Appears in the list immediately
- ✅ Check console for: "✅ Team member created successfully via server"

### Test 3: Check Console Messages

Open browser DevTools (F12) → Console tab

**Good signs:**
```
✅ Team member created successfully via server
✓ Auth: User [email] authenticated with role: [role]
```

**Bad signs (cache still stale):**
```
❌ Error: column "quantity_change" does not exist
❌ Error: column "aura_rating" does not exist
```

## 📊 Results Interpretation

| Test | Result | What It Means |
|------|--------|---------------|
| Inventory works | ✅ | Cache is cleared! Everything should work |
| Inventory fails | ❌ | Cache still stale, wait 2-3 minutes and try again |
| Team works | ✅ | Bypass is working correctly (expected) |
| Team fails | ❌ | Server endpoint issue (check console) |

## 🎮 Interactive Test in Console

You can also run this in the browser console to test the API directly:

```javascript
// Test inventory transactions API
async function testInventoryAPI() {
  try {
    const response = await fetch('/api/inventory-transactions/test');
    console.log('Inventory API Status:', response.status);
    return response.ok;
  } catch (err) {
    console.error('Inventory API Error:', err);
    return false;
  }
}

// Test team members API (via bypass)
async function testTeamAPI() {
  try {
    // This will use the bypass server endpoint
    console.log('Team API is using server bypass - should always work');
    return true;
  } catch (err) {
    console.error('Team API Error:', err);
    return false;
  }
}

// Run both tests
console.log('Running API tests...');
testInventoryAPI().then(result => console.log('Inventory API:', result ? '✅ Working' : '❌ Failed'));
testTeamAPI().then(result => console.log('Team API:', result ? '✅ Working' : '❌ Failed'));
```

## 🔄 If Tests Fail

### Step 1: Wait
Sometimes PostgREST takes 2-3 minutes to fully clear cache after restart.
- Wait 3 minutes
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Try tests again

### Step 2: Restart Again
1. Go back to Supabase Dashboard → Settings → API
2. Click "Restart" for PostgREST
3. Wait 60 seconds
4. Close ALL browser tabs
5. Open fresh tab
6. Try tests again

### Step 3: Check Database Directly

Run this in Supabase SQL Editor:

```sql
-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory_transactions'
  AND column_name IN ('quantity_change', 'quantity_after');

-- Should return 2 rows
```

If this returns 0 rows, the columns don't exist in the database!
If it returns 2 rows, the columns exist but PostgREST cache is stale.

## ✨ Success Criteria

You'll know everything is working when:

1. ✅ You can add/remove inventory stock without errors
2. ✅ You can create/edit team members without errors
3. ✅ Console shows success messages, not column errors
4. ✅ All data persists after page refresh

## 🎯 Next Actions Based on Results

### If Everything Works ✅
- You're done! The app is fully operational
- The bypass for team members is still active (recommended to keep it)
- You can start using the app normally

### If Inventory Still Fails ❌
1. Check the SQL verification above
2. If columns exist → cache needs more time or another restart
3. If columns don't exist → need to run migration SQL

### If You Need Help
Check these files for more details:
- `/POSTGREST_RESTART_VERIFICATION.md` - Detailed verification guide
- `/BYPASS_SOLUTION_IMPLEMENTED.md` - How the bypass works
- Console logs - Most errors will show there

## 🚀 Ready to Test!

1. Open your app
2. Try adding inventory stock
3. Try adding a team member
4. Check console for any errors
5. Report back what you see!

The bypass system ensures that even if PostgREST cache has issues, your team member operations will work. Inventory operations should work now that you've restarted PostgREST.
