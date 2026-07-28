# 🔥 Force Schema Reload - Complete Solution

## Problem
PostgREST schema cache is completely stale and won't update, even after running `NOTIFY pgrst, 'reload schema'`.

## Solutions (Try in Order)

---

### ✅ Option 1: Restart PostgREST (SAFEST, TRY THIS FIRST)

1. **Go to Supabase Dashboard**
2. **Settings** → **API**
3. Find the **"PostgREST"** section
4. Click **"Restart"** or **"Reload Schema"** button
5. **Wait 30 seconds** for the service to restart
6. **Hard refresh your browser** (Ctrl+Shift+R / Cmd+Shift+R)
7. Try creating an inventory item again

---

### ✅ Option 2: Recreate Table (If Option 1 Fails)

⚠️ **WARNING: This will delete all data in `inventory_transactions` table!**

Only do this if:
- You don't have important transaction data yet, OR
- You've backed up the data first

**Run this in Supabase SQL Editor:**

```sql
-- Drop and recreate the entire table
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;

CREATE TABLE public.inventory_transactions (
  -- Core fields
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
  type text NOT NULL,
  quantity_change numeric NOT NULL,
  quantity_after numeric NOT NULL,
  reference text,
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Project purchase fields
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name text,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  date timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);
CREATE INDEX idx_inventory_transactions_project_id ON public.inventory_transactions(project_id);
CREATE INDEX idx_inventory_transactions_type ON public.inventory_transactions(type);
CREATE INDEX idx_inventory_transactions_date ON public.inventory_transactions(date DESC);

-- Enable RLS
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read inventory transactions"
ON public.inventory_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert inventory transactions"
ON public.inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow users to update own inventory transactions"
ON public.inventory_transactions FOR UPDATE TO authenticated
USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "Allow users to delete own inventory transactions"
ON public.inventory_transactions FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- Force reload
NOTIFY pgrst, 'reload schema';
```

Then:
1. **Wait 10 seconds**
2. **Restart PostgREST** (Dashboard → Settings → API → Restart)
3. **Wait 30 seconds**
4. **Hard refresh browser**

---

### ✅ Option 3: Manual Cache Clear (Advanced)

If Options 1 and 2 don't work, try clearing Supabase's cache manually:

1. **Go to Supabase Dashboard**
2. **Project Settings** → **API**
3. Look for **"Schema Cache"** or **"API Settings"**
4. Find and click **"Clear Schema Cache"** or **"Reload Config"**
5. **Wait 30 seconds**
6. **Hard refresh browser**

---

### ✅ Option 4: Full Project Restart (Last Resort)

1. **Go to Supabase Dashboard**
2. **Project Settings** → **General**
3. Find **"Pause Project"**
4. Click **Pause** and wait 1 minute
5. Click **Resume Project** and wait 2 minutes
6. **Hard refresh browser**

This forces a complete restart of all Supabase services.

---

## Verify It Worked

After trying any option, verify with this SQL:

```sql
-- Check table exists and has all columns
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'inventory_transactions' 
ORDER BY ordinal_position;
```

You should see these columns:
- ✅ `quantity_change` (numeric)
- ✅ `quantity_after` (numeric)
- ✅ `project_id` (uuid)
- ✅ All other required columns

---

## Why This Keeps Happening

PostgREST (Supabase's API layer) aggressively caches database schema for performance. When you run DDL (Data Definition Language) commands like `ALTER TABLE` or `CREATE TABLE`, the cache doesn't always automatically update.

**Solution**: Always run `NOTIFY pgrst, 'reload schema'` after schema changes, AND restart the PostgREST service.

---

## Prevention for Future

**After ANY database schema changes:**

1. Run `NOTIFY pgrst, 'reload schema';` in SQL Editor
2. Restart PostgREST service (Dashboard → Settings → API)
3. Wait 30 seconds before testing
4. Hard refresh browser

This two-step process ensures the cache is cleared.
