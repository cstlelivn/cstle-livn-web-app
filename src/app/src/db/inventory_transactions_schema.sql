-- INVENTORY TRANSACTIONS
-- Tracks all stock movements (purchases, consumption, adjustments, transfers)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'purchase', 'consumption', 'adjustment', 'transfer'
  quantity_change numeric NOT NULL, -- positive for in, negative for out
  quantity_after numeric NOT NULL, -- snapshot of quantity after this transaction
  reference text, -- invoice number, project name, etc.
  notes text, -- reason for adjustment, additional details
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_inventory_transactions_updated_at 
BEFORE UPDATE ON public.inventory_transactions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Policies (adjust based on your auth setup)
-- Allow authenticated users to read all transactions
CREATE POLICY "Allow authenticated users to read inventory transactions"
ON public.inventory_transactions FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert transactions
CREATE POLICY "Allow authenticated users to insert inventory transactions"
ON public.inventory_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own transactions (optional, typically transactions are immutable)
CREATE POLICY "Allow users to update own inventory transactions"
ON public.inventory_transactions FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Allow users to delete their own transactions (optional, typically transactions are immutable)
CREATE POLICY "Allow users to delete own inventory transactions"
ON public.inventory_transactions FOR DELETE
TO authenticated
USING (created_by = auth.uid());
