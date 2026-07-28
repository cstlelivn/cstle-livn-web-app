-- =====================================================
-- COMPLETE FINANCE SYSTEM - DATABASE MIGRATION
-- =====================================================
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE file
-- 2. Go to Supabase SQL Editor
-- 3. Paste and click "Run"
-- 4. Wait for "Success. No rows returned"
-- =====================================================

-- Clean up existing functions first (safe to run multiple times)
-- =====================================================
DROP FUNCTION IF EXISTS update_transactions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_project_transactions_updated_at() CASCADE;

-- Clean up existing tables (if they exist)
-- =====================================================
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.project_transactions CASCADE;


-- =====================================================
-- TABLE 1: transactions (GLOBAL FINANCE)
-- Purpose: All company financial transactions
-- Used by: Finance Module, Analytics, Reports
-- =====================================================
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core transaction fields
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
  
  -- Optional relationships
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  phase_name text,
  
  -- Additional details
  notes text,
  payment_method text, -- Cash, E-transfer, Card, Cheque, etc.
  recipient_or_vendor text, -- Name of recipient/vendor for display
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_category ON public.transactions(category);
CREATE INDEX idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX idx_transactions_project_id ON public.transactions(project_id);
CREATE INDEX idx_transactions_client_id ON public.transactions(client_id);
CREATE INDEX idx_transactions_vendor_id ON public.transactions(vendor_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all authenticated users)
CREATE POLICY "transactions_select" ON public.transactions 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "transactions_insert" ON public.transactions 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "transactions_update" ON public.transactions 
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "transactions_delete" ON public.transactions 
  FOR DELETE TO authenticated USING (true);

-- Auto-update trigger for updated_at
CREATE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- Grant permissions
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;


-- =====================================================
-- TABLE 2: project_transactions (PROJECT-SPECIFIC)
-- Purpose: Project-linked financial transactions
-- Used by: Project Details, Project Finance Tab
-- =====================================================
CREATE TABLE public.project_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core transaction fields
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name text,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
  
  -- Optional relationships
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  
  -- Additional details
  notes text,
  payment_method text,
  recipient_or_vendor text,
  
  -- Purchase-specific fields (for materials/equipment)
  quantity numeric,
  unit_cost numeric,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_project_transactions_project_id ON public.project_transactions(project_id);
CREATE INDEX idx_project_transactions_type ON public.project_transactions(type);
CREATE INDEX idx_project_transactions_category ON public.project_transactions(category);
CREATE INDEX idx_project_transactions_date ON public.project_transactions(date DESC);
CREATE INDEX idx_project_transactions_phase_name ON public.project_transactions(phase_name);
CREATE INDEX idx_project_transactions_client_id ON public.project_transactions(client_id);
CREATE INDEX idx_project_transactions_vendor_id ON public.project_transactions(vendor_id);
CREATE INDEX idx_project_transactions_inventory_id ON public.project_transactions(inventory_id);
CREATE INDEX idx_project_transactions_status ON public.project_transactions(status);

-- Enable Row Level Security
ALTER TABLE public.project_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all authenticated users)
CREATE POLICY "project_transactions_select" ON public.project_transactions 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "project_transactions_insert" ON public.project_transactions 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "project_transactions_update" ON public.project_transactions 
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "project_transactions_delete" ON public.project_transactions 
  FOR DELETE TO authenticated USING (true);

-- Auto-update trigger for updated_at
CREATE FUNCTION update_project_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_transactions_updated_at
  BEFORE UPDATE ON public.project_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_project_transactions_updated_at();

-- Grant permissions
GRANT ALL ON public.project_transactions TO authenticated;
GRANT ALL ON public.project_transactions TO service_role;


-- =====================================================
-- DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.transactions IS 'Global finance: All company income and expenses';
COMMENT ON COLUMN public.transactions.type IS 'Transaction type: income or expense (lowercase)';
COMMENT ON COLUMN public.transactions.category IS 'Category: client_payment, materials, labor, subcontractor, equipment, etc.';
COMMENT ON COLUMN public.transactions.amount IS 'Amount in dollars (always positive, type determines income/expense)';
COMMENT ON COLUMN public.transactions.recipient_or_vendor IS 'Display name of recipient or vendor';

COMMENT ON TABLE public.project_transactions IS 'Project-specific: Income and expenses linked to projects';
COMMENT ON COLUMN public.project_transactions.type IS 'Transaction type: income or expense (lowercase)';
COMMENT ON COLUMN public.project_transactions.category IS 'Category: client_payment, materials, labor, etc.';
COMMENT ON COLUMN public.project_transactions.quantity IS 'Quantity (for material purchases)';
COMMENT ON COLUMN public.project_transactions.unit_cost IS 'Unit cost (for material purchases)';
COMMENT ON COLUMN public.project_transactions.inventory_id IS 'Link to inventory item if applicable';


-- =====================================================
-- ✅ MIGRATION COMPLETE
-- =====================================================
-- Both tables created with:
--   ✓ Unified schema (type, category, amount, etc.)
--   ✓ Proper constraints and checks
--   ✓ Performance indexes
--   ✓ RLS policies
--   ✓ Auto-update triggers
--   ✓ Full relationships to projects, clients, vendors
-- 
-- Next steps:
--   1. Verify in Supabase Table Editor
--   2. Test adding transactions via API
--   3. Verify data appears in Finance Module
-- =====================================================