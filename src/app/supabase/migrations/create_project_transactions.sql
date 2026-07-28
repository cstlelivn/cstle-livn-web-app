-- Create project_transactions table for tracking purchases and payments
-- This is separate from inventory_transactions which handles actual inventory movements

CREATE TABLE IF NOT EXISTS public.project_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name text,
  type text NOT NULL CHECK (type IN ('purchase', 'payment')),
  amount numeric NOT NULL DEFAULT 0,
  reference text, -- vendor name for purchases, payee name for payments
  description text, -- item description or payment purpose
  notes text,
  date timestamptz NOT NULL DEFAULT now(),
  
  -- Purchase-specific fields (only used when type = 'purchase')
  quantity numeric,
  unit_cost numeric,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_transactions_project_id ON public.project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_transactions_phase_name ON public.project_transactions(phase_name);
CREATE INDEX IF NOT EXISTS idx_project_transactions_type ON public.project_transactions(type);
CREATE INDEX IF NOT EXISTS idx_project_transactions_date ON public.project_transactions(date);
CREATE INDEX IF NOT EXISTS idx_project_transactions_inventory_id ON public.project_transactions(inventory_id);

-- Enable RLS
ALTER TABLE public.project_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view project transactions"
  ON public.project_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert project transactions"
  ON public.project_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update project transactions"
  ON public.project_transactions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete project transactions"
  ON public.project_transactions
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_transactions_updated_at()
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

COMMENT ON TABLE public.project_transactions IS 'Tracks all financial transactions for projects including purchases and payments';
COMMENT ON COLUMN public.project_transactions.type IS 'Transaction type: purchase (materials/tools) or payment (labor/services)';
COMMENT ON COLUMN public.project_transactions.reference IS 'Vendor name for purchases, payee name for payments';
COMMENT ON COLUMN public.project_transactions.inventory_id IS 'Links to inventory item if this purchase affects inventory';
