# 🚨 FIX DATABASE SETUP - Complete Solution

## ⚠️ Error You're Seeing

```
ERROR: 42P01: relation "public.inventory_transactions" does not exist
```

This means the `inventory_transactions` table hasn't been created yet.

---

## ✅ COMPLETE FIX (3 Steps in Correct Order)

### Step 1: Create the Inventory Transactions Table FIRST

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Click "SQL Editor"** (in left sidebar)
4. **Copy the script below**
5. **Paste and click "Run"**

```sql
-- =====================================================
-- CREATE INVENTORY TRANSACTIONS TABLE
-- =====================================================
-- This must be run BEFORE enabling Realtime

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reference_type TEXT CHECK (reference_type IN ('purchase', 'usage', 'return', 'adjustment', 'project', 'vendor', 'other')),
  reference_id UUID,
  notes TEXT,
  performed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id 
  ON public.inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type 
  ON public.inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at 
  ON public.inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference 
  ON public.inventory_transactions(reference_type, reference_id);

-- Enable RLS
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view inventory transactions"
  ON public.inventory_transactions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert inventory transactions"
  ON public.inventory_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update inventory transactions"
  ON public.inventory_transactions FOR UPDATE
  USING (true);

-- Verification
SELECT 'inventory_transactions table created successfully!' AS status;
```

**Expected Output**: `"inventory_transactions table created successfully!"`

---

### Step 2: Enable Realtime for ALL Tables

Now that the table exists, enable Realtime:

```sql
-- =====================================================
-- ENABLE REALTIME FOR ALL TABLES
-- =====================================================

-- Step 1: Set REPLICA IDENTITY to FULL
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_updates REPLICA IDENTITY FULL;
ALTER TABLE public.qc_requests REPLICA IDENTITY FULL;
ALTER TABLE public.phase_qc_reviews REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.team_members REPLICA IDENTITY FULL;
ALTER TABLE public.vendors REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.inventory REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.activities REPLICA IDENTITY FULL;
ALTER TABLE public.task_templates REPLICA IDENTITY FULL;

-- Step 2: Add tables to supabase_realtime publication
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'users', 'projects', 'tasks', 'task_updates', 'qc_requests',
    'phase_qc_reviews', 'messages', 'team_members', 'vendors',
    'clients', 'leads', 'inventory', 'inventory_transactions',
    'transactions', 'activities', 'task_templates'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      RAISE NOTICE '✅ Added % to realtime', tbl;
    EXCEPTION 
      WHEN duplicate_object THEN
        RAISE NOTICE '✅ % already in realtime', tbl;
      WHEN undefined_object THEN
        RAISE WARNING '❌ supabase_realtime publication does not exist!';
        RAISE WARNING '   Go to: Database > Replication > Enable Realtime';
    END;
  END LOOP;
END $$;

-- Step 3: Verify setup
SELECT 
  tablename,
  CASE 
    WHEN tablename = ANY(
      SELECT tablename::text 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
    ) THEN '✅ Enabled'
    ELSE '❌ Not Enabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN (
    'users', 'projects', 'tasks', 'task_updates', 'qc_requests',
    'phase_qc_reviews', 'messages', 'team_members', 'vendors',
    'clients', 'leads', 'inventory', 'inventory_transactions',
    'transactions', 'activities', 'task_templates'
  )
ORDER BY tablename;
```

**Expected Output**: All 16 tables should show "✅ Enabled"

---

### Step 3: Refresh Your Application

1. Go back to your admin panel
2. **Hard refresh**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Check browser console (F12) - warnings should be gone

---

## 🧪 Test It Works

1. Open your app in **two browser tabs** side by side
2. In **Tab 1**: Add inventory or create a project
3. In **Tab 2**: Watch it appear instantly (within 1-2 seconds)

**If it works**: ✅ You're done!

---

## 🐛 TROUBLESHOOTING

### Problem: "relation does not exist" for other tables

If you get errors about other missing tables (users, projects, tasks, etc.), you need to run the **complete schema first**:

1. Open `/src/db/schema.sql`
2. Copy the ENTIRE file
3. Paste in Supabase SQL Editor
4. Click "Run"
5. Then come back and run Steps 1 and 2 above

---

### Problem: "undefined_object" Error

**Error**:
```
❌ Publication supabase_realtime does not exist
```

**Solution**:
1. Go to **Database** → **Replication** in Supabase Dashboard
2. Look for "**Publications**" section
3. Click **"Enable Realtime"** or create `supabase_realtime` publication
4. Re-run Step 2 above

---

### Problem: "TypeError: Failed to fetch"

This is a **Supabase connection error**. Check:

1. **Environment Variables**:
   - Open your Supabase Dashboard → Settings → API
   - Verify `SUPABASE_URL` matches "Project URL"
   - Verify `SUPABASE_ANON_KEY` matches "anon public" key

2. **Browser Console** (F12):
   - Look for specific error messages
   - Check Network tab for failed requests
   - Look for CORS errors

3. **Hard Refresh**:
   - Clear browser cache
   - Press Ctrl+Shift+R (or Cmd+Shift+R)
   - Try in incognito/private mode

---

## 📋 Verification Checklist

After running all scripts:

- [ ] `inventory_transactions` table exists (Step 1 completed)
- [ ] All 16 tables show "✅ Enabled" in SQL output (Step 2 completed)
- [ ] Refreshed app with Ctrl+Shift+R (hard refresh)
- [ ] No console warnings about Realtime
- [ ] Tested with two browser tabs - changes sync instantly
- [ ] No "TypeError: Failed to fetch" errors

---

## 🔍 Manual Verification

To verify everything is set up correctly:

```sql
-- Check if inventory_transactions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'inventory_transactions'
) AS table_exists;
-- Expected: true

-- Check if Realtime publication exists
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
-- Expected: 1 row

-- Check tables in publication
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
-- Expected: 16 rows (all your tables)
```

---

## 🆘 Still Having Issues?

### If schema.sql fails to run:

It might be too large. Run it in sections:
1. First: All `CREATE TABLE` statements
2. Second: All `CREATE INDEX` statements  
3. Third: All `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements
4. Fourth: All `CREATE POLICY` statements

### If you're starting fresh:

Follow this exact order:
1. **First**: `/src/db/schema.sql` (creates all tables)
2. **Second**: `/src/db/inventory_transactions_schema.sql` (creates inventory_transactions)
3. **Third**: Step 2 above (enables Realtime)
4. **Fourth**: `/src/db/indexes.sql` (optional - performance indexes)
5. **Fifth**: `/src/db/policies.sql` (optional - if not in schema.sql)

---

## ✅ Success Indicators

After successful setup:

- ✅ No console warnings about Realtime
- ✅ No "relation does not exist" errors
- ✅ Changes sync instantly across tabs
- ✅ No "Failed to fetch" errors
- ✅ Inventory system works with transactions

---

## 📚 Next Steps

Once this is working:

1. **Test Inventory System**: `/INVENTORY_TESTING_CHECKLIST.md`
2. **Upgrade to Full Inventory**: `/INVENTORY_SYSTEM_SUMMARY.md`
3. **Configure Permissions**: `/ADMIN_PANEL_GUIDE.md`

---

**Time to Fix**: 5 minutes  
**Difficulty**: Easy (just copy-paste-run in order)  
**Impact**: Fixes all database and Realtime errors  

---

**Last Updated**: 2025-01-07  
**Status**: Complete Solution ✅
