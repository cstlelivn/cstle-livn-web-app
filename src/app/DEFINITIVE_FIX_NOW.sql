-- ============================================
-- DEFINITIVE FIX - Run This Entire Script
-- ============================================
-- This script will:
-- 1. Check current state
-- 2. Drop and recreate table cleanly
-- 3. Verify structure
-- 4. Force schema reload
-- ============================================

-- STEP 1: Check if table exists and what columns it has
DO $$
BEGIN
  RAISE NOTICE '=== CURRENT STATE ===';
END $$;

SELECT 
  'Current columns in inventory_transactions:' AS info,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'inventory_transactions'
ORDER BY ordinal_position;

-- STEP 2: Backup existing data (if any)
CREATE TABLE IF NOT EXISTS inventory_transactions_backup_temp AS
SELECT * FROM public.inventory_transactions;

-- STEP 3: Drop the problematic table completely
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;

DO $$
BEGIN
  RAISE NOTICE '=== TABLE DROPPED ===';
END $$;

-- STEP 4: Create table with ALL required columns
CREATE TABLE public.inventory_transactions (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core transaction fields
  inventory_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'consumption', 'adjustment', 'transfer')),
  quantity_change numeric NOT NULL,
  quantity_after numeric NOT NULL,
  reference text,
  notes text,
  
  -- Audit fields
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

DO $$
BEGIN
  RAISE NOTICE '=== TABLE CREATED ===';
END $$;

-- STEP 5: Create all necessary indexes
CREATE INDEX idx_inventory_transactions_inventory_id 
  ON public.inventory_transactions(inventory_id);

CREATE INDEX idx_inventory_transactions_created_at 
  ON public.inventory_transactions(created_at DESC);

CREATE INDEX idx_inventory_transactions_project_id 
  ON public.inventory_transactions(project_id);

CREATE INDEX idx_inventory_transactions_phase_name 
  ON public.inventory_transactions(phase_name);

CREATE INDEX idx_inventory_transactions_type 
  ON public.inventory_transactions(type);

CREATE INDEX idx_inventory_transactions_date 
  ON public.inventory_transactions(date DESC);

CREATE INDEX idx_inventory_transactions_project_phase 
  ON public.inventory_transactions(project_id, phase_name, type);

CREATE INDEX idx_inventory_transactions_vendor_id 
  ON public.inventory_transactions(vendor_id);

DO $$
BEGIN
  RAISE NOTICE '=== INDEXES CREATED ===';
END $$;

-- STEP 6: Enable Row Level Security
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read inventory transactions" 
  ON public.inventory_transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert inventory transactions" 
  ON public.inventory_transactions;
DROP POLICY IF EXISTS "Allow users to update own inventory transactions" 
  ON public.inventory_transactions;
DROP POLICY IF EXISTS "Allow users to delete own inventory transactions" 
  ON public.inventory_transactions;

CREATE POLICY "Allow authenticated users to read inventory transactions"
  ON public.inventory_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert inventory transactions"
  ON public.inventory_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow users to update own inventory transactions"
  ON public.inventory_transactions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Allow users to delete own inventory transactions"
  ON public.inventory_transactions
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

DO $$
BEGIN
  RAISE NOTICE '=== RLS POLICIES CREATED ===';
END $$;

-- STEP 8: Verify the new structure
SELECT 
  '=== VERIFICATION: New table structure ===' AS info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'inventory_transactions'
ORDER BY ordinal_position;

-- STEP 9: CRITICAL - Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '=== SCHEMA RELOAD NOTIFIED ===';
  RAISE NOTICE 'Now go to Dashboard -> Settings -> API -> Restart PostgREST Service';
  RAISE NOTICE 'Then wait 30 seconds and hard refresh your browser';
END $$;

-- STEP 10: Test insert (optional - comment out if you want)
-- INSERT INTO public.inventory_transactions (
--   inventory_id,
--   type,
--   quantity_change,
--   quantity_after,
--   reference,
--   notes
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'purchase',
--   10,
--   10,
--   'Test',
--   'Testing schema'
-- );

-- Clean up backup
DROP TABLE IF EXISTS inventory_transactions_backup_temp;

DO $$
BEGIN
  RAISE NOTICE '=== COMPLETE ===';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Go to Supabase Dashboard';
  RAISE NOTICE '2. Settings -> API';
  RAISE NOTICE '3. Click "Restart" for PostgREST service';
  RAISE NOTICE '4. Wait 30 seconds';
  RAISE NOTICE '5. Hard refresh browser (Ctrl+Shift+R)';
END $$;
