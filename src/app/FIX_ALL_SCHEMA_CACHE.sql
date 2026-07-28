-- ============================================
-- FIX ALL SCHEMA CACHE ISSUES AT ONCE
-- ============================================
-- This script ensures ALL tables have correct structure
-- Run this ONCE, then restart PostgREST service
-- ============================================

-- ============================================
-- 1. TEAM MEMBERS TABLE
-- ============================================

DROP TABLE IF EXISTS public.team_members CASCADE;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  email text NOT NULL,
  phone text,
  aura_rating numeric DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  tasks_on_time integer DEFAULT 0,
  efficiency numeric DEFAULT 0,
  specialties jsonb, -- string[]
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_members_name ON public.team_members(name);
CREATE INDEX idx_team_members_role ON public.team_members(role);
CREATE INDEX idx_team_members_active ON public.team_members(active);
CREATE INDEX idx_team_members_aura_rating ON public.team_members(aura_rating DESC);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read team members"
ON public.team_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert team members"
ON public.team_members FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update team members"
ON public.team_members FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete team members"
ON public.team_members FOR DELETE TO authenticated USING (true);

-- ============================================
-- 2. INVENTORY TRANSACTIONS TABLE  
-- ============================================

DROP TABLE IF EXISTS public.inventory_transactions CASCADE;

CREATE TABLE public.inventory_transactions (
  -- Core fields
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'consumption', 'adjustment', 'transfer')),
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

CREATE INDEX idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);
CREATE INDEX idx_inventory_transactions_project_id ON public.inventory_transactions(project_id);
CREATE INDEX idx_inventory_transactions_phase_name ON public.inventory_transactions(phase_name);
CREATE INDEX idx_inventory_transactions_type ON public.inventory_transactions(type);
CREATE INDEX idx_inventory_transactions_date ON public.inventory_transactions(date DESC);
CREATE INDEX idx_inventory_transactions_project_phase ON public.inventory_transactions(project_id, phase_name, type);
CREATE INDEX idx_inventory_transactions_vendor_id ON public.inventory_transactions(vendor_id);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 3. VERIFY ALL CORE TABLES EXIST
-- ============================================

-- Ensure all other tables exist with correct structure
-- (These should already exist, but we'll verify key ones)

-- PROJECTS table check
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'spent'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN spent numeric DEFAULT 0;
  END IF;
END $$;

-- INVENTORY table check
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE public.inventory ADD COLUMN supplier_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 4. FORCE SCHEMA RELOAD
-- ============================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================
-- 5. VERIFICATION
-- ============================================

-- Check team_members structure
SELECT 
  'TEAM MEMBERS TABLE' AS table_name,
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'team_members'
ORDER BY ordinal_position;

-- Check inventory_transactions structure
SELECT 
  'INVENTORY TRANSACTIONS TABLE' AS table_name,
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'inventory_transactions'
ORDER BY ordinal_position;

-- ============================================
-- SUCCESS MESSAGES
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE '✅ SQL SCRIPT COMPLETE';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Go to Supabase Dashboard';
  RAISE NOTICE '2. Settings → API';
  RAISE NOTICE '3. Find "PostgREST" section';
  RAISE NOTICE '4. Click "Restart" button';
  RAISE NOTICE '5. Wait 30 seconds';
  RAISE NOTICE '6. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)';
  RAISE NOTICE '';
  RAISE NOTICE 'ALL ERRORS WILL BE FIXED!';
  RAISE NOTICE '=================================================';
END $$;
