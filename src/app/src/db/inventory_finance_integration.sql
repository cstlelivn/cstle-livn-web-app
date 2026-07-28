-- ================================================================
-- INVENTORY → PROJECT → FINANCE INTEGRATION SCHEMA
-- ================================================================
-- This migration enhances the integration between inventory, projects, 
-- and finance systems to ensure proper data flow and financial tracking.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. EXTEND INVENTORY TABLE
-- ----------------------------------------------------------------
-- Add project and phase tracking directly to inventory items
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phase_name text,
ADD COLUMN IF NOT EXISTS total_cost numeric GENERATED ALWAYS AS (quantity * cost) STORED,
ADD COLUMN IF NOT EXISTS linked_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Create indexes for inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_project_id ON public.inventory(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_phase_name ON public.inventory(phase_name);

-- Comments
COMMENT ON COLUMN public.inventory.project_id IS 'Project this inventory item is linked to (if any)';
COMMENT ON COLUMN public.inventory.phase_name IS 'Project phase this item belongs to';
COMMENT ON COLUMN public.inventory.total_cost IS 'Computed: quantity * cost';
COMMENT ON COLUMN public.inventory.linked_transaction_id IS 'Financial transaction record for this purchase';

-- ----------------------------------------------------------------
-- 2. EXTEND TRANSACTIONS TABLE FOR INVENTORY LINKING
-- ----------------------------------------------------------------
-- Add inventory and client tracking to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phase_name text,
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reference text;

-- Create indexes for transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_inventory_id ON public.transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_transactions_phase_name ON public.transactions(phase_name);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON public.transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_project ON public.transactions(type, project_id);

-- Comments
COMMENT ON COLUMN public.transactions.inventory_id IS 'Links to inventory item if this is an inventory purchase';
COMMENT ON COLUMN public.transactions.phase_name IS 'Project phase for this transaction';
COMMENT ON COLUMN public.transactions.client_id IS 'Auto-detected from project if applicable';
COMMENT ON COLUMN public.transactions.reference IS 'Reference number or description';

-- ----------------------------------------------------------------
-- 3. EXTEND PROJECTS TABLE
-- ----------------------------------------------------------------
-- Add financial tracking fields
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS total_spent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS project_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Update existing projects to use budget as project_price if not set
UPDATE public.projects 
SET project_price = budget 
WHERE project_price = 0 AND budget > 0;

-- Comments
COMMENT ON COLUMN public.projects.total_spent IS 'Sum of all purchase and expense transactions';
COMMENT ON COLUMN public.projects.total_income IS 'Sum of all client payment transactions';
COMMENT ON COLUMN public.projects.project_price IS 'Total project contract value';
COMMENT ON COLUMN public.projects.client_id IS 'Client this project belongs to';

-- ----------------------------------------------------------------
-- 4. CREATE FUNCTION TO AUTO-CREATE TRANSACTION WHEN INVENTORY LINKED
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_inventory_purchase_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id uuid;
  v_transaction_id uuid;
BEGIN
  -- Only create transaction if inventory item is linked to a project
  IF NEW.project_id IS NOT NULL AND NEW.quantity > 0 AND NEW.cost > 0 THEN
    
    -- Get client_id from project
    SELECT client_id INTO v_client_id
    FROM public.projects
    WHERE id = NEW.project_id;
    
    -- Create transaction record
    INSERT INTO public.transactions (
      type,
      inventory_id,
      project_id,
      phase_name,
      client_id,
      amount,
      description,
      date,
      vendor_id,
      category,
      reference,
      status
    ) VALUES (
      'purchase',
      NEW.id,
      NEW.project_id,
      NEW.phase_name,
      v_client_id,
      -(NEW.quantity * NEW.cost), -- Negative for expense
      CONCAT(NEW.name, ' (', COALESCE(NEW.category, 'Inventory'), ') purchase'),
      COALESCE(NEW.last_restocked, now()),
      NEW.supplier_id,
      COALESCE(NEW.category, 'Inventory'),
      CONCAT('INV-', NEW.id),
      'Completed'
    )
    RETURNING id INTO v_transaction_id;
    
    -- Link transaction back to inventory
    NEW.linked_transaction_id := v_transaction_id;
    
    -- Update project total_spent
    UPDATE public.projects
    SET total_spent = COALESCE(total_spent, 0) + (NEW.quantity * NEW.cost)
    WHERE id = NEW.project_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- 5. CREATE TRIGGER FOR AUTO-TRANSACTION CREATION
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_create_inventory_purchase_transaction ON public.inventory;
CREATE TRIGGER trigger_create_inventory_purchase_transaction
  BEFORE INSERT ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION create_inventory_purchase_transaction();

-- ----------------------------------------------------------------
-- 6. CREATE FUNCTION TO UPDATE TRANSACTION WHEN INVENTORY UPDATED
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_inventory_purchase_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id uuid;
  v_old_total numeric;
  v_new_total numeric;
BEGIN
  -- Calculate old and new totals
  v_old_total := OLD.quantity * OLD.cost;
  v_new_total := NEW.quantity * NEW.cost;
  
  -- If project or phase changed, or cost/quantity changed
  IF (OLD.project_id IS DISTINCT FROM NEW.project_id) OR 
     (OLD.phase_name IS DISTINCT FROM NEW.phase_name) OR
     (v_old_total <> v_new_total) THEN
    
    -- Get client_id from new project
    IF NEW.project_id IS NOT NULL THEN
      SELECT client_id INTO v_client_id
      FROM public.projects
      WHERE id = NEW.project_id;
    END IF;
    
    -- Update linked transaction if it exists
    IF NEW.linked_transaction_id IS NOT NULL THEN
      UPDATE public.transactions
      SET 
        project_id = NEW.project_id,
        phase_name = NEW.phase_name,
        client_id = v_client_id,
        amount = -(NEW.quantity * NEW.cost),
        description = CONCAT(NEW.name, ' (', COALESCE(NEW.category, 'Inventory'), ') purchase'),
        vendor_id = NEW.supplier_id,
        category = COALESCE(NEW.category, 'Inventory'),
        updated_at = now()
      WHERE id = NEW.linked_transaction_id;
      
      -- Update old project if project changed
      IF OLD.project_id IS NOT NULL AND OLD.project_id <> NEW.project_id THEN
        UPDATE public.projects
        SET total_spent = GREATEST(0, COALESCE(total_spent, 0) - v_old_total)
        WHERE id = OLD.project_id;
      END IF;
      
      -- Update new project
      IF NEW.project_id IS NOT NULL THEN
        UPDATE public.projects
        SET total_spent = COALESCE(total_spent, 0) - v_old_total + v_new_total
        WHERE id = NEW.project_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- 7. CREATE TRIGGER FOR INVENTORY UPDATE
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_update_inventory_purchase_transaction ON public.inventory;
CREATE TRIGGER trigger_update_inventory_purchase_transaction
  AFTER UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_purchase_transaction();

-- ----------------------------------------------------------------
-- 8. CREATE FUNCTION TO HANDLE INVENTORY DELETION
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_inventory_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft delete the linked transaction (mark as voided)
  IF OLD.linked_transaction_id IS NOT NULL THEN
    UPDATE public.transactions
    SET 
      status = 'Voided',
      description = CONCAT('[VOIDED] ', description),
      updated_at = now()
    WHERE id = OLD.linked_transaction_id;
    
    -- Update project total_spent
    IF OLD.project_id IS NOT NULL THEN
      UPDATE public.projects
      SET total_spent = GREATEST(0, COALESCE(total_spent, 0) - (OLD.quantity * OLD.cost))
      WHERE id = OLD.project_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- 9. CREATE TRIGGER FOR INVENTORY DELETION
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_handle_inventory_deletion ON public.inventory;
CREATE TRIGGER trigger_handle_inventory_deletion
  BEFORE DELETE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION handle_inventory_deletion();

-- ----------------------------------------------------------------
-- 10. CREATE VIEW FOR PROJECT FINANCIAL SUMMARY
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW public.project_financial_summary AS
SELECT 
  p.id,
  p.title,
  p.client,
  p.client_id,
  p.project_price,
  p.budget,
  
  -- Income
  COALESCE(SUM(CASE WHEN t.type = 'client_payment' THEN t.amount ELSE 0 END), 0) as total_income,
  
  -- Expenses
  COALESCE(ABS(SUM(CASE WHEN t.type IN ('purchase', 'project_cost', 'expense') THEN t.amount ELSE 0 END)), 0) as total_spent,
  
  -- Calculations
  COALESCE(SUM(CASE WHEN t.type = 'client_payment' THEN t.amount ELSE 0 END), 0) - 
  COALESCE(ABS(SUM(CASE WHEN t.type IN ('purchase', 'project_cost', 'expense') THEN t.amount ELSE 0 END)), 0) as balance,
  
  COALESCE(SUM(CASE WHEN t.type = 'client_payment' THEN t.amount ELSE 0 END), 0) - 
  COALESCE(ABS(SUM(CASE WHEN t.type IN ('purchase', 'project_cost', 'expense') THEN t.amount ELSE 0 END)), 0) as profit,
  
  -- Margin calculation
  CASE 
    WHEN p.project_price > 0 THEN 
      (COALESCE(SUM(CASE WHEN t.type = 'client_payment' THEN t.amount ELSE 0 END), 0) - 
       COALESCE(ABS(SUM(CASE WHEN t.type IN ('purchase', 'project_cost', 'expense') THEN t.amount ELSE 0 END)), 0)) / p.project_price
    ELSE 0
  END as margin,
  
  p.status,
  p.progress
  
FROM public.projects p
LEFT JOIN public.transactions t ON t.project_id = p.id AND t.status <> 'Voided'
GROUP BY p.id, p.title, p.client, p.client_id, p.project_price, p.budget, p.status, p.progress;

-- ----------------------------------------------------------------
-- 11. CREATE VIEW FOR PHASE FINANCIAL SUMMARY
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW public.phase_financial_summary AS
SELECT 
  t.project_id,
  t.phase_name,
  
  -- Purchases
  COALESCE(ABS(SUM(CASE WHEN t.type = 'purchase' THEN t.amount ELSE 0 END)), 0) as phase_purchases,
  
  -- Other costs
  COALESCE(ABS(SUM(CASE WHEN t.type IN ('project_cost', 'expense') THEN t.amount ELSE 0 END)), 0) as phase_other_costs,
  
  -- Total
  COALESCE(ABS(SUM(CASE WHEN t.type IN ('purchase', 'project_cost', 'expense') THEN t.amount ELSE 0 END)), 0) as phase_total_cost,
  
  COUNT(DISTINCT t.id) as transaction_count,
  COUNT(DISTINCT t.inventory_id) as inventory_items_count
  
FROM public.transactions t
WHERE t.phase_name IS NOT NULL AND t.status <> 'Voided'
GROUP BY t.project_id, t.phase_name;

-- ----------------------------------------------------------------
-- 12. ENABLE RLS ON TRANSACTIONS (if not already enabled)
-- ----------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated users to update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated users to delete transactions" ON public.transactions;

-- Create policies
CREATE POLICY "Allow authenticated users to read transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete transactions"
ON public.transactions FOR DELETE
TO authenticated
USING (true);

-- ----------------------------------------------------------------
-- 13. GRANT PERMISSIONS
-- ----------------------------------------------------------------
GRANT SELECT ON public.project_financial_summary TO authenticated;
GRANT SELECT ON public.phase_financial_summary TO authenticated;

-- ----------------------------------------------------------------
-- MIGRATION COMPLETE
-- ----------------------------------------------------------------
-- This schema now supports:
-- ✅ Inventory items linked to projects and phases
-- ✅ Automatic transaction creation when inventory is linked
-- ✅ Automatic project spending updates
-- ✅ Cascade updates when inventory is modified
-- ✅ Soft deletion when inventory is removed
-- ✅ Financial views for real-time reporting
-- ----------------------------------------------------------------
