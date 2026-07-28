-- ============================================
-- COMPLETE FIX: Schema + Reload
-- ============================================
-- This script does EVERYTHING in one go:
-- 1. Ensures all columns exist
-- 2. Reloads the PostgREST schema cache
-- 3. Verifies the setup
--
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- STEP 1: Ensure all columns exist
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS quantity_after numeric NOT NULL DEFAULT 0;

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

-- STEP 2: Create missing indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_id 
ON public.inventory_transactions(project_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_phase_name 
ON public.inventory_transactions(phase_name);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type 
ON public.inventory_transactions(type);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date 
ON public.inventory_transactions(date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_phase 
ON public.inventory_transactions(project_id, phase_name, type);

-- STEP 3: CRITICAL - Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- STEP 4: Verify columns exist
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'inventory_transactions'
    AND column_name = 'quantity_after';
  
  IF col_count = 0 THEN
    RAISE EXCEPTION 'ERROR: quantity_after column still missing!';
  ELSE
    RAISE NOTICE 'SUCCESS: quantity_after column exists!';
  END IF;
END $$;

-- Display final column list
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'inventory_transactions' 
ORDER BY ordinal_position;
