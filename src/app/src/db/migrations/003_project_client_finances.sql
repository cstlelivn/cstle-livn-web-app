-- Migration: Project-Client Finance System
-- This migration creates tables for tracking project budgets, client payments, and expenses

-- ============================================
-- 1. Add finance fields to projects table
-- ============================================
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS budget_total DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_spent DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_status TEXT DEFAULT 'On Track';

-- Note: budget_remaining will be calculated in application layer since PostgreSQL 
-- generated columns require specific syntax that may vary

-- ============================================
-- 2. Add finance fields to clients table
-- ============================================
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS total_billed DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10, 2) DEFAULT 0;

-- Note: account_balance will be calculated in application layer

-- ============================================
-- 3. Create payments_received table
-- ============================================
CREATE TABLE IF NOT EXISTS payments_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'E-Transfer', -- E-Transfer, Cash, Cheque, Credit Card, Bank Transfer, etc.
  reference_number TEXT, -- Cheque number, transaction ID, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for payments_received
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments_received(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments_received(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments_received(payment_date DESC);

-- ============================================
-- 4. Create project_expenses table
-- ============================================
CREATE TABLE IF NOT EXISTS project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_amount DECIMAL(10, 2) NOT NULL,
  expense_category TEXT NOT NULL DEFAULT 'General', -- Materials, Labor, Equipment, Subcontractor, Permits, etc.
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for project_expenses
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON project_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON project_expenses(vendor_id);

-- ============================================
-- 5. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE payments_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments_received (drop existing first)
DROP POLICY IF EXISTS "Users can view all payments" ON payments_received;
CREATE POLICY "Users can view all payments"
  ON payments_received FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert payments" ON payments_received;
CREATE POLICY "Authenticated users can insert payments"
  ON payments_received FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update payments" ON payments_received;
CREATE POLICY "Authenticated users can update payments"
  ON payments_received FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete payments" ON payments_received;
CREATE POLICY "Authenticated users can delete payments"
  ON payments_received FOR DELETE
  USING (auth.role() = 'authenticated');

-- RLS Policies for project_expenses (drop existing first)
DROP POLICY IF EXISTS "Users can view all expenses" ON project_expenses;
CREATE POLICY "Users can view all expenses"
  ON project_expenses FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON project_expenses;
CREATE POLICY "Authenticated users can insert expenses"
  ON project_expenses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update expenses" ON project_expenses;
CREATE POLICY "Authenticated users can update expenses"
  ON project_expenses FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON project_expenses;
CREATE POLICY "Authenticated users can delete expenses"
  ON project_expenses FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- 6. Create functions for automatic calculations
-- ============================================

-- Function to update project budget_spent when expenses are added/updated/deleted
CREATE OR REPLACE FUNCTION update_project_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total spent from project_expenses and inventory_transactions
  UPDATE projects
  SET budget_spent = COALESCE(
    (
      SELECT SUM(expense_amount)
      FROM project_expenses
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0
  ) + COALESCE(
    (
      SELECT SUM(total_cost)
      FROM inventory_transactions
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
      AND type = 'use'
    ), 0
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for project_expenses
DROP TRIGGER IF EXISTS trigger_update_budget_on_expense_insert ON project_expenses;
CREATE TRIGGER trigger_update_budget_on_expense_insert
  AFTER INSERT ON project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_budget_spent();

DROP TRIGGER IF EXISTS trigger_update_budget_on_expense_update ON project_expenses;
CREATE TRIGGER trigger_update_budget_on_expense_update
  AFTER UPDATE ON project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_budget_spent();

DROP TRIGGER IF EXISTS trigger_update_budget_on_expense_delete ON project_expenses;
CREATE TRIGGER trigger_update_budget_on_expense_delete
  AFTER DELETE ON project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_budget_spent();

-- Function to update client account balance when payments are added/updated/deleted
CREATE OR REPLACE FUNCTION update_client_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total paid from payments_received
  UPDATE clients
  SET total_paid = COALESCE(
    (
      SELECT SUM(payment_amount)
      FROM payments_received
      WHERE client_id = COALESCE(NEW.client_id, OLD.client_id)
    ), 0
  )
  WHERE id = COALESCE(NEW.client_id, OLD.client_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for payments_received
DROP TRIGGER IF EXISTS trigger_update_balance_on_payment_insert ON payments_received;
CREATE TRIGGER trigger_update_balance_on_payment_insert
  AFTER INSERT ON payments_received
  FOR EACH ROW
  EXECUTE FUNCTION update_client_account_balance();

DROP TRIGGER IF EXISTS trigger_update_balance_on_payment_update ON payments_received;
CREATE TRIGGER trigger_update_balance_on_payment_update
  AFTER UPDATE ON payments_received
  FOR EACH ROW
  EXECUTE FUNCTION update_client_account_balance();

DROP TRIGGER IF EXISTS trigger_update_balance_on_payment_delete ON payments_received;
CREATE TRIGGER trigger_update_balance_on_payment_delete
  AFTER DELETE ON payments_received
  FOR EACH ROW
  EXECUTE FUNCTION update_client_account_balance();

-- Function to update client total_billed from project budgets
CREATE OR REPLACE FUNCTION update_client_total_billed()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Get the client_id from the project
  SELECT client INTO v_client_id
  FROM projects
  WHERE id = COALESCE(NEW.id, OLD.id);
  
  IF v_client_id IS NOT NULL THEN
    -- Calculate total billed from all projects for this client
    UPDATE clients
    SET total_billed = COALESCE(
      (
        SELECT SUM(budget_total)
        FROM projects
        WHERE client = v_client_id
      ), 0
    )
    WHERE id = v_client_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for projects (budget changes)
DROP TRIGGER IF EXISTS trigger_update_billed_on_project_update ON projects;
CREATE TRIGGER trigger_update_billed_on_project_update
  AFTER UPDATE OF budget_total ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_client_total_billed();

DROP TRIGGER IF EXISTS trigger_update_billed_on_project_insert ON projects;
CREATE TRIGGER trigger_update_billed_on_project_insert
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_client_total_billed();

-- Function to update budget_status based on spending
CREATE OR REPLACE FUNCTION update_project_budget_status()
RETURNS TRIGGER AS $$
DECLARE
  v_percent_spent DECIMAL;
BEGIN
  IF NEW.budget_total > 0 THEN
    v_percent_spent := (NEW.budget_spent / NEW.budget_total) * 100;
    
    IF v_percent_spent >= 100 THEN
      NEW.budget_status := 'Over Budget';
    ELSIF v_percent_spent >= 90 THEN
      NEW.budget_status := 'At Risk';
    ELSIF v_percent_spent >= 75 THEN
      NEW.budget_status := 'Warning';
    ELSE
      NEW.budget_status := 'On Track';
    END IF;
  ELSE
    NEW.budget_status := 'Not Set';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for project budget status
DROP TRIGGER IF EXISTS trigger_update_project_budget_status ON projects;
CREATE TRIGGER trigger_update_project_budget_status
  BEFORE UPDATE OF budget_spent, budget_total ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_budget_status();

-- ============================================
-- 7. Add updated_at trigger for new tables
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON payments_received;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON payments_received
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON project_expenses;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. Grant permissions
-- ============================================
GRANT ALL ON payments_received TO authenticated;
GRANT ALL ON payments_received TO anon;
GRANT ALL ON project_expenses TO authenticated;
GRANT ALL ON project_expenses TO anon;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Run this in your Supabase SQL Editor
-- After running, enable realtime on the new tables using enable-realtime.sql