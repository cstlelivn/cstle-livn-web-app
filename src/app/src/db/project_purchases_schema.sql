-- EXTEND INVENTORY TRANSACTIONS FOR PROJECT PURCHASES
-- This extends the existing inventory_transactions table to support project-linked purchases

-- Add project and phase columns to inventory_transactions
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS phase_name text,
ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS date timestamptz DEFAULT now();

-- Create indexes for project-related queries
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_id 
ON public.inventory_transactions(project_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_phase_name 
ON public.inventory_transactions(phase_name);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type 
ON public.inventory_transactions(type);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date 
ON public.inventory_transactions(date DESC);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_phase 
ON public.inventory_transactions(project_id, phase_name, type);

-- Comments for documentation
COMMENT ON COLUMN public.inventory_transactions.project_id IS 'Links purchase to a specific project';
COMMENT ON COLUMN public.inventory_transactions.phase_name IS 'Project phase this purchase is for (e.g., Planning, Wall Priming)';
COMMENT ON COLUMN public.inventory_transactions.unit_cost IS 'Cost per unit for this transaction';
COMMENT ON COLUMN public.inventory_transactions.total_cost IS 'Total cost (quantity_change * unit_cost)';
COMMENT ON COLUMN public.inventory_transactions.vendor_id IS 'Vendor/supplier for this purchase';
COMMENT ON COLUMN public.inventory_transactions.date IS 'Date of the transaction (can differ from created_at)';
