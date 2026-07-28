# ⚡ QUICK FIX - 3 Copy-Paste Steps

## Your Current Error

You're seeing this in Supabase SQL Editor:
```
ERROR: 42P01: relation "public.inventory_transactions" does not exist
```

---

## ✅ Solution (5 Minutes)

### Step 1️⃣: Create Missing Table

**Copy this entire script** and run it in Supabase SQL Editor:

```sql
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

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id 
  ON public.inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type 
  ON public.inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at 
  ON public.inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference 
  ON public.inventory_transactions(reference_type, reference_id);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory transactions"
  ON public.inventory_transactions FOR SELECT USING (true);

CREATE POLICY "Users can insert inventory transactions"
  ON public.inventory_transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update inventory transactions"
  ON public.inventory_transactions FOR UPDATE USING (true);
```

Click **"Run"** → Should complete without errors

---

### Step 2️⃣: Enable Realtime

**Copy this entire script** and run it in Supabase SQL Editor:

```sql
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
    EXCEPTION 
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN 
        RAISE WARNING 'Enable Realtime in Database > Replication first';
    END;
  END LOOP;
END $$;

SELECT 
  tablename,
  CASE 
    WHEN tablename = ANY(
      SELECT tablename::text FROM pg_publication_tables 
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

Click **"Run"** → All tables should show "✅ Enabled"

---

### Step 3️⃣: Refresh Your App

1. Go to your admin panel
2. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
3. Warnings should be gone!

---

## ✅ Done!

Test it:
- Open app in 2 tabs
- Create something in Tab 1
- See it appear instantly in Tab 2

---

## 🐛 If Step 2 Shows Warning

If you see:
```
WARNING: Enable Realtime in Database > Replication first
```

Do this:
1. Go to **Database** → **Replication** in Supabase Dashboard
2. Click **"Enable Realtime"** 
3. Re-run Step 2

---

## 📚 More Help

**Complete guide**: [`/FIX_DATABASE_SETUP_NOW.md`](/FIX_DATABASE_SETUP_NOW.md)
