-- ============================================
-- NUCLEAR OPTION: Complete Table Recreation
-- ============================================
-- This completely drops and recreates the table
-- Use this when schema cache refuses to update
-- ============================================

-- STEP 1: Drop the entire table (this will delete all data!)
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;

-- STEP 2: Create the table from scratch with ALL columns
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

-- STEP 3: Create all indexes
CREATE INDEX idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);
CREATE INDEX idx_inventory_transactions_project_id ON public.inventory_transactions(project_id);
CREATE INDEX idx_inventory_transactions_phase_name ON public.inventory_transactions(phase_name);
CREATE INDEX idx_inventory_transactions_type ON public.inventory_transactions(type);
CREATE INDEX idx_inventory_transactions_date ON public.inventory_transactions(date DESC);
CREATE INDEX idx_inventory_transactions_project_phase ON public.inventory_transactions(project_id, phase_name, type);

-- STEP 4: Enable RLS
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create all policies
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

-- STEP 6: FORCE schema reload
NOTIFY pgrst, 'reload schema';

-- STEP 7: Verify the table structure
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'inventory_transactions' 
ORDER BY ordinal_position;

-- ============================================
-- ⚠️ WARNING: This drops all existing transaction data!
-- Only use this if you don't have important data yet
-- or if you've backed it up first
-- ============================================
