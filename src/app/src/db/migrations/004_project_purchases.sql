-- ============================================
-- Migration: Create project_purchases table
-- Description: Dedicated table for project purchases with full receipt-style data
-- Date: 2024-11-24
-- ============================================

-- Create project_purchases table
CREATE TABLE IF NOT EXISTS public.project_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  item_name text NOT NULL,
  vendor text NOT NULL, -- Store vendor name as text for flexibility
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for project_purchases
CREATE INDEX IF NOT EXISTS idx_project_purchases_project_id ON public.project_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_purchases_phase_name ON public.project_purchases(phase_name);
CREATE INDEX IF NOT EXISTS idx_project_purchases_purchase_date ON public.project_purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_purchases_inventory_id ON public.project_purchases(inventory_id);

-- Enable RLS on project_purchases
ALTER TABLE public.project_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_purchases
DROP POLICY IF EXISTS "Users can view all purchases" ON public.project_purchases;
CREATE POLICY "Users can view all purchases"
  ON public.project_purchases FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert purchases" ON public.project_purchases;
CREATE POLICY "Authenticated users can insert purchases"
  ON public.project_purchases FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update purchases" ON public.project_purchases;
CREATE POLICY "Authenticated users can update purchases"
  ON public.project_purchases FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete purchases" ON public.project_purchases;
CREATE POLICY "Authenticated users can delete purchases"
  ON public.project_purchases FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_project_purchases_updated_at ON public.project_purchases;
CREATE TRIGGER trigger_update_project_purchases_updated_at
  BEFORE UPDATE ON public.project_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_project_purchases_updated_at();

-- Add comment to table
COMMENT ON TABLE public.project_purchases IS 'Stores project purchases with full receipt-style data and optional inventory linkage';
