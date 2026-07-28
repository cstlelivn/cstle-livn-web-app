# 🚀 Quick Database Fix - 2 Minutes

## Problem
```
Error: Could not find the 'quantity_after' column of 'inventory_transactions'
```

## Solution
Run 2 SQL scripts in your Supabase Dashboard.

---

## Step 1: Open Supabase SQL Editor

1. Go to your **Supabase Dashboard**
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

---

## Step 2: Run First Script

**Copy and paste this:**

```sql
-- INVENTORY TRANSACTIONS BASE TABLE
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
  type text NOT NULL,
  quantity_change numeric NOT NULL,
  quantity_after numeric NOT NULL,
  reference text,
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated users to read inventory transactions"
ON public.inventory_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert inventory transactions"
ON public.inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow users to update own inventory transactions"
ON public.inventory_transactions FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Allow users to delete own inventory transactions"
ON public.inventory_transactions FOR DELETE TO authenticated USING (created_by = auth.uid());
```

Click **Run** ▶️

---

## Step 3: Run Second Script

**Copy and paste this:**

```sql
-- EXTEND FOR PROJECT PURCHASES
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS phase_name text,
ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS date timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_id ON public.inventory_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_phase_name ON public.inventory_transactions(phase_name);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON public.inventory_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_phase ON public.inventory_transactions(project_id, phase_name, type);
```

Click **Run** ▶️

---

## Step 4: Refresh Browser

Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)

---

## ✅ Done!

Your app should now work without errors. Try:
1. Creating a new inventory item
2. Linking it to a project
3. Viewing it in the Purchases tab

---

## If You Still Get Errors

1. Go back to SQL Editor
2. Run this check:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'inventory_transactions' 
   ORDER BY ordinal_position;
   ```
3. Verify you see `quantity_after` in the list
4. Hard refresh browser again

---

**Need more details?** See `/FIX_INVENTORY_TRANSACTIONS_SCHEMA.md`
