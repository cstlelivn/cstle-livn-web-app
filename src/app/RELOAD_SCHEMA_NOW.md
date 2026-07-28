# 🔄 Reload Supabase Schema Cache

## The Problem

You've successfully run the SQL migration, but Supabase's PostgREST API layer has a **stale schema cache**. 

Error: `"Could not find the 'quantity_after' column of 'inventory_transactions' in the schema cache"`

The column EXISTS in the database, but the API layer doesn't know about it yet.

---

## Solution: Reload the Schema (2 methods)

### Method 1: Reload Schema via SQL (FASTEST ⚡)

1. **Go to Supabase Dashboard** → **SQL Editor**
2. **Run this command:**

```sql
NOTIFY pgrst, 'reload schema';
```

3. **Wait 5-10 seconds**
4. **Hard refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)

---

### Method 2: Restart PostgREST Service

If Method 1 doesn't work:

1. **Go to Supabase Dashboard** → **Settings** → **API**
2. Scroll down to **"PostgREST"**
3. Click **"Restart Service"** or **"Reload Schema"** button
4. Wait 30 seconds
5. **Hard refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)

---

### Method 3: Verify the Column Exists (Debugging)

**Run this SQL to confirm the column is actually there:**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'inventory_transactions' 
ORDER BY ordinal_position;
```

You should see:
- ✅ `quantity_after` (type: numeric)
- ✅ `quantity_change` (type: numeric)
- ✅ `project_id` (type: uuid)
- ✅ `phase_name` (type: text)
- ✅ `unit_cost` (type: numeric)
- ✅ `total_cost` (type: numeric)
- ✅ `vendor_id` (type: uuid)
- ✅ `date` (type: timestamptz)

---

## Why This Happens

PostgREST caches the database schema for performance. When you add new columns via SQL, the cache doesn't automatically update. You must manually reload it.

This is a known behavior in Supabase/PostgREST deployments.

---

## After Reloading

Once the schema is reloaded:

1. **Test creating an inventory item** - should work ✅
2. **Test linking to a project** - should work ✅
3. **Check the Purchases tab** - should show data ✅

The errors will be gone permanently!
