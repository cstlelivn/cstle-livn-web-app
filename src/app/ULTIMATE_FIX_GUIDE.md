# 🎯 ULTIMATE FIX GUIDE - Schema Cache Issue

## Current Error
```
Could not find the 'quantity_change' column of 'inventory_transactions' in the schema cache
```

This means PostgREST's API cache is completely out of sync with your database.

---

## 🚀 RECOMMENDED SOLUTION (Do This Now)

### Step 1: Restart PostgREST Service

This is the **safest** and **fastest** solution:

1. **Open Supabase Dashboard** in a new tab
2. Go to **Settings** (left sidebar)
3. Click **API**
4. Scroll down to find **"PostgREST"** or **"API Service"** section
5. Click the **"Restart"** button (might say "Restart Service" or "Reload Schema")
6. **Wait 30 seconds** for the service to fully restart
7. **Go back to your app**
8. **Hard refresh browser**: 
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
9. Try creating an inventory item again

### Expected Result
✅ Errors should be completely gone!

---

## 🔧 ALTERNATIVE SOLUTION (If Restart Doesn't Work)

If restarting PostgREST doesn't fix it, the table structure might be wrong.

### Check Current Table Structure

Run this in **Supabase SQL Editor**:

```sql
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'inventory_transactions' 
ORDER BY ordinal_position;
```

**Expected columns:**
- id
- inventory_id
- type
- **quantity_change** ← Should be here!
- **quantity_after** ← Should be here!
- reference
- notes
- created_by
- created_at
- updated_at
- project_id
- phase_name
- unit_cost
- total_cost
- vendor_id
- date

### If Columns Are Missing:

**Option A: If you DON'T have important transaction data yet:**

Run `/NUCLEAR_FIX_SCHEMA.sql` - this drops and recreates the table cleanly.

**Option B: If you HAVE important data:**

1. First run `/BACKUP_FIRST.sql` to backup your data
2. Then run `/NUCLEAR_FIX_SCHEMA.sql` to recreate the table
3. Then restore data from backup

---

## 📋 Complete Checklist

- [ ] Restart PostgREST service in Supabase Dashboard
- [ ] Wait 30 seconds
- [ ] Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- [ ] Test creating inventory item
- [ ] If still failing, check table structure with SQL query above
- [ ] If columns missing, run NUCLEAR_FIX_SCHEMA.sql
- [ ] Restart PostgREST again
- [ ] Hard refresh browser again
- [ ] Test again

---

## 🎯 Quick Reference

| Issue | Solution |
|-------|----------|
| Schema cache stale | Restart PostgREST service |
| Restart didn't work | Run NUCLEAR_FIX_SCHEMA.sql |
| Have important data | Run BACKUP_FIRST.sql first |
| Still not working | Pause/Resume entire project |

---

## 💡 Why This Happens

Supabase uses PostgREST as an API layer over PostgreSQL. PostgREST caches your database schema for performance. When you modify the database directly with SQL (like adding columns), the cache doesn't automatically know about it.

**The Fix**: You must tell PostgREST to reload its cache by:
1. Running `NOTIFY pgrst, 'reload schema';` in SQL, AND
2. Restarting the PostgREST service

Both steps are required for a reliable cache clear.

---

## ✅ After It's Fixed

Once working, you should be able to:
- ✅ Create new inventory items
- ✅ Link inventory to projects
- ✅ View purchases in the Purchases tab
- ✅ See financial data update automatically

The errors will be permanently gone!

---

**Files Available:**
- `/FORCE_SCHEMA_RELOAD.md` - Detailed solutions
- `/NUCLEAR_FIX_SCHEMA.sql` - Complete table recreation
- `/BACKUP_FIRST.sql` - Data backup script
- `/VERIFY_MIGRATION.sql` - Verification queries
