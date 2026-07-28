# 🔧 Fixed Database Migration Scripts

## Run These Scripts in Supabase SQL Editor

---

## Script 1: Create/Update Inventory Transactions Table

**Copy and paste this into Supabase SQL Editor:**

```sql
-- 1) Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read inventory transactions"
  ON public.inventory_transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert inventory transactions"
  ON public.inventory_transactions;
DROP POLICY IF EXISTS "Allow users to update own inventory transactions"
  ON public.inventory_transactions;
DROP POLICY IF EXISTS "Allow users to delete own inventory transactions"
  ON public.inventory_transactions;

-- 2) Create table if it doesn't exist (base columns)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
  type text NOT NULL,
  quantity_change numeric NOT NULL,
  quantity_after numeric NOT NULL,
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Make sure all required columns exist (especially created_by)
ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS created_by uuid
    REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_transactions
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- 4) Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id
  ON public.inventory_transactions(inventory_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at
  ON public.inventory_transactions(created_at DESC);

-- 5) Enable RLS
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 6) Re-create policies using the (now guaranteed) created_by column
CREATE POLICY "Allow authenticated users to read inventory transactions"
ON public.inventory_transactions
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert inventory transactions"
ON public.inventory_transactions
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update own inventory transactions"
ON public.inventory_transactions
FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Allow users to delete own inventory transactions"
ON public.inventory_transactions
FOR DELETE TO authenticated
USING (created_by = auth.uid());
```

**Click Run** ▶️

---

## Script 2: Add Project Purchase Columns

**Copy and paste this into Supabase SQL Editor:**

```sql
-- Add project-related columns
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS phase_name text;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS date timestamptz DEFAULT now();

-- Create indexes for project purchases
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_id ON public.inventory_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_phase_name ON public.inventory_transactions(phase_name);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON public.inventory_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_phase ON public.inventory_transactions(project_id, phase_name, type);
```

**Click Run** ▶️

---

## Script 3: Verify Everything Works

**Run this to check the table structure:**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'inventory_transactions' 
ORDER BY ordinal_position;
```

You should see all these columns:
- id
- inventory_id
- type
- quantity_change
- **quantity_after** ✅
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

---

## After Running Scripts

1. **Hard refresh your browser**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Test the inventory system - it should work without errors

---

## What Was Fixed

The original script had these issues:
1. **IF NOT EXISTS doesn't work for policies** - policies need to be dropped first
2. **Multiple ALTER TABLE statements in one** - split into individual statements
3. **Clearer error handling** - each column addition is separate

This new approach:
- Drops existing policies first (safe to do)
- Creates table if needed
- Adds missing columns one at a time
- Recreates all policies cleanly
