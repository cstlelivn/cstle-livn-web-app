-- ============================================
-- Migration: Convert project_purchases to project_transactions
-- Description: Upgrade purchases table to support both purchases and payments
-- Date: 2024-11-24
-- ============================================

-- Step 1: Rename table (if starting fresh, you can skip the drop and create new)
-- If you already have data in project_purchases, run this:
-- ALTER TABLE IF EXISTS public.project_purchases RENAME TO project_transactions;

-- Step 2: Create new table with transaction support
CREATE TABLE IF NOT EXISTS public.project_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Transaction type: 'purchase' or 'payment'
  transaction_type text NOT NULL DEFAULT 'purchase' CHECK (transaction_type IN ('purchase', 'payment')),
  
  -- Common fields for both types
  phase_name text,
  vendor_or_recipient text NOT NULL, -- Vendor (for purchases) or Recipient (for payments)
  item_or_description text NOT NULL, -- Item name (for purchases) or Description (for payments)
  total_cost numeric NOT NULL DEFAULT 0,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  
  -- Purchase-specific fields (nullable for payments)
  quantity numeric, -- Only for purchases
  unit_cost numeric, -- Only for purchases
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  link_to_inventory boolean DEFAULT false,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_transactions_project_id ON public.project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_transactions_transaction_type ON public.project_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_project_transactions_phase_name ON public.project_transactions(phase_name);
CREATE INDEX IF NOT EXISTS idx_project_transactions_transaction_date ON public.project_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_transactions_inventory_id ON public.project_transactions(inventory_id);

-- Enable RLS
ALTER TABLE public.project_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view all transactions" ON public.project_transactions;
CREATE POLICY "Users can view all transactions"
  ON public.project_transactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.project_transactions;
CREATE POLICY "Authenticated users can insert transactions"
  ON public.project_transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update transactions" ON public.project_transactions;
CREATE POLICY "Authenticated users can update transactions"
  ON public.project_transactions FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete transactions" ON public.project_transactions;
CREATE POLICY "Authenticated users can delete transactions"
  ON public.project_transactions FOR DELETE
  USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_project_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_transactions_updated_at ON public.project_transactions;
CREATE TRIGGER trigger_update_project_transactions_updated_at
  BEFORE UPDATE ON public.project_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_project_transactions_updated_at();

-- Add comment
COMMENT ON TABLE public.project_transactions IS 'Stores project transactions including purchases and payments with full receipt-style data';

-- ============================================
-- MIGRATION FROM project_purchases (if you have existing data)
-- ============================================
-- Run this ONLY if you have existing project_purchases data to migrate:
-- 
-- INSERT INTO public.project_transactions (
--   id, project_id, transaction_type, phase_name, 
--   vendor_or_recipient, item_or_description, total_cost, 
--   transaction_date, notes, quantity, unit_cost, 
--   inventory_id, link_to_inventory, created_by, created_at, updated_at
-- )
-- SELECT 
--   id, project_id, 'purchase' as transaction_type, phase_name,
--   vendor as vendor_or_recipient, item_name as item_or_description, total_cost,
--   purchase_date as transaction_date, notes, quantity, unit_cost,
--   inventory_id, CASE WHEN inventory_id IS NOT NULL THEN true ELSE false END as link_to_inventory,
--   created_by, created_at, updated_at
-- FROM public.project_purchases;
-- 
-- -- Then drop the old table:
-- -- DROP TABLE IF EXISTS public.project_purchases;
