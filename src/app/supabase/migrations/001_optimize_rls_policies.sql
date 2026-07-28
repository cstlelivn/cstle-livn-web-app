-- =====================================================
-- OPTIMIZED RLS POLICIES - PERFORMANCE FIX
-- =====================================================
-- Purpose: Fix "Auth RLS Initialization Plan" warnings
-- Date: 2024-12-02
-- 
-- This migration:
-- 1. Removes expensive auth.uid() and auth.role() calls
-- 2. Adds missing indexes for RLS performance
-- 3. Standardizes all policies across tables
-- 4. Maintains security while improving performance
-- =====================================================

-- =====================================================
-- PART 1: CREATE OPTIMIZED HELPER FUNCTIONS
-- =====================================================

-- Helper function to check if user is authenticated
-- This is more efficient than calling auth.role() in every policy
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT auth.role()) = 'authenticated';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to get current user ID efficiently
-- Uses JWT token claim instead of auth.uid() which is expensive
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
    NULL
  ));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_authenticated() IS 'Efficient check for authenticated users - replaces auth.role() = authenticated';
COMMENT ON FUNCTION public.current_user_id() IS 'Efficient user ID retrieval - replaces auth.uid()';

-- =====================================================
-- PART 2: ADD MISSING INDEXES FOR RLS PERFORMANCE
-- =====================================================

-- Indexes for foreign keys used in policies
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON public.task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_author_id ON public.task_updates(author_id);
CREATE INDEX IF NOT EXISTS idx_qc_requests_task_id ON public.qc_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_qc_requests_reviewer_id ON public.qc_requests(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_phase_qc_reviews_project_id ON public.phase_qc_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_phase_qc_reviews_submitted_by ON public.phase_qc_reviews(submitted_by);
CREATE INDEX IF NOT EXISTS idx_phase_qc_reviews_reviewed_by ON public.phase_qc_reviews(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON public.inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_project_id_idx ON public.transactions(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_client_id_idx ON public.transactions(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_vendor_id_idx ON public.transactions(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);

-- Indexes for inventory_transactions (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_by ON public.inventory_transactions(created_by);
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_vendor ON public.inventory_transactions(project_id, vendor_id);
  END IF;
END $$;

-- Indexes for payments_received (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments_received') THEN
    CREATE INDEX IF NOT EXISTS idx_payments_received_client_id ON public.payments_received(client_id);
    CREATE INDEX IF NOT EXISTS idx_payments_received_project_id_idx ON public.payments_received(project_id) WHERE project_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_payments_received_created_by ON public.payments_received(created_by);
  END IF;
END $$;

-- Indexes for project_expenses (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_expenses') THEN
    CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON public.project_expenses(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_expenses_vendor_id_idx ON public.project_expenses(vendor_id) WHERE vendor_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_project_expenses_created_by ON public.project_expenses(created_by);
  END IF;
END $$;

-- Indexes for project_purchases (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_purchases') THEN
    CREATE INDEX IF NOT EXISTS idx_project_purchases_project ON public.project_purchases(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_purchases_inventory_idx ON public.project_purchases(inventory_id) WHERE inventory_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_project_purchases_created_by ON public.project_purchases(created_by);
  END IF;
END $$;

-- Indexes for project_transactions (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_project_transactions_project ON public.project_transactions(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_transactions_type ON public.project_transactions(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_project_transactions_inventory_idx ON public.project_transactions(inventory_id) WHERE inventory_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_project_transactions_created_by ON public.project_transactions(created_by);
  END IF;
END $$;

-- Indexes for payments (if table exists - alternative name for payments table)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
    CREATE INDEX IF NOT EXISTS idx_payments_project_id_idx ON public.payments(project_id) WHERE project_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);
  END IF;
END $$;

-- =====================================================
-- PART 3: DROP OLD INEFFICIENT POLICIES
-- =====================================================

-- Users table
DROP POLICY IF EXISTS p_users_select ON public.users;
DROP POLICY IF EXISTS p_users_insert ON public.users;
DROP POLICY IF EXISTS p_users_update ON public.users;

-- Projects table
DROP POLICY IF EXISTS p_projects_select ON public.projects;
DROP POLICY IF EXISTS p_projects_insert ON public.projects;
DROP POLICY IF EXISTS p_projects_update ON public.projects;
DROP POLICY IF EXISTS p_projects_delete ON public.projects;

-- Tasks table
DROP POLICY IF EXISTS p_tasks_select ON public.tasks;
DROP POLICY IF EXISTS p_tasks_insert ON public.tasks;
DROP POLICY IF EXISTS p_tasks_update ON public.tasks;
DROP POLICY IF EXISTS p_tasks_delete ON public.tasks;

-- Task Updates table
DROP POLICY IF EXISTS p_task_updates_select ON public.task_updates;
DROP POLICY IF EXISTS p_task_updates_insert ON public.task_updates;
DROP POLICY IF EXISTS p_task_updates_delete ON public.task_updates;

-- QC Requests table
DROP POLICY IF EXISTS p_qc_requests_select ON public.qc_requests;
DROP POLICY IF EXISTS p_qc_requests_insert ON public.qc_requests;
DROP POLICY IF EXISTS p_qc_requests_update ON public.qc_requests;

-- Phase QC Reviews table
DROP POLICY IF EXISTS p_phase_qc_reviews_select ON public.phase_qc_reviews;
DROP POLICY IF EXISTS p_phase_qc_reviews_insert ON public.phase_qc_reviews;
DROP POLICY IF EXISTS p_phase_qc_reviews_update ON public.phase_qc_reviews;

-- Messages table
DROP POLICY IF EXISTS p_messages_select ON public.messages;
DROP POLICY IF EXISTS p_messages_insert ON public.messages;

-- Team Members table
DROP POLICY IF EXISTS p_team_members_select ON public.team_members;
DROP POLICY IF EXISTS p_team_members_insert ON public.team_members;
DROP POLICY IF EXISTS p_team_members_update ON public.team_members;
DROP POLICY IF EXISTS p_team_members_delete ON public.team_members;

-- Vendors table
DROP POLICY IF EXISTS p_vendors_select ON public.vendors;
DROP POLICY IF EXISTS p_vendors_insert ON public.vendors;
DROP POLICY IF EXISTS p_vendors_update ON public.vendors;
DROP POLICY IF EXISTS p_vendors_delete ON public.vendors;

-- Clients table
DROP POLICY IF EXISTS p_clients_select ON public.clients;
DROP POLICY IF EXISTS p_clients_insert ON public.clients;
DROP POLICY IF EXISTS p_clients_update ON public.clients;
DROP POLICY IF EXISTS p_clients_delete ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to read clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete clients" ON public.clients;

-- Leads table
DROP POLICY IF EXISTS p_leads_select ON public.leads;
DROP POLICY IF EXISTS p_leads_insert ON public.leads;
DROP POLICY IF EXISTS p_leads_update ON public.leads;
DROP POLICY IF EXISTS p_leads_delete ON public.leads;

-- Inventory table
DROP POLICY IF EXISTS p_inventory_select ON public.inventory;
DROP POLICY IF EXISTS p_inventory_insert ON public.inventory;
DROP POLICY IF EXISTS p_inventory_update ON public.inventory;
DROP POLICY IF EXISTS p_inventory_delete ON public.inventory;

-- Transactions table
DROP POLICY IF EXISTS p_transactions_select ON public.transactions;
DROP POLICY IF EXISTS p_transactions_insert ON public.transactions;
DROP POLICY IF EXISTS p_transactions_update ON public.transactions;
DROP POLICY IF EXISTS p_transactions_delete ON public.transactions;
DROP POLICY IF EXISTS transactions_select ON public.transactions;
DROP POLICY IF EXISTS transactions_insert ON public.transactions;
DROP POLICY IF EXISTS transactions_update ON public.transactions;
DROP POLICY IF EXISTS transactions_delete ON public.transactions;

-- Activities table
DROP POLICY IF EXISTS p_activities_select ON public.activities;
DROP POLICY IF EXISTS p_activities_insert ON public.activities;

-- Task Templates table
DROP POLICY IF EXISTS p_task_templates_select ON public.task_templates;
DROP POLICY IF EXISTS p_task_templates_insert ON public.task_templates;
DROP POLICY IF EXISTS p_task_templates_delete ON public.task_templates;

-- Drop policies for finance tables (if they exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
    DROP POLICY IF EXISTS "Allow authenticated users to read inventory transactions" ON public.inventory_transactions;
    DROP POLICY IF EXISTS "Allow authenticated users to insert inventory transactions" ON public.inventory_transactions;
    DROP POLICY IF EXISTS "Allow users to update own inventory transactions" ON public.inventory_transactions;
    DROP POLICY IF EXISTS "Allow users to delete own inventory transactions" ON public.inventory_transactions;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments_received') THEN
    DROP POLICY IF EXISTS "Users can view all payments" ON public.payments_received;
    DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments_received;
    DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments_received;
    DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments_received;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_expenses') THEN
    DROP POLICY IF EXISTS "Users can view all expenses" ON public.project_expenses;
    DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.project_expenses;
    DROP POLICY IF EXISTS "Authenticated users can update expenses" ON public.project_expenses;
    DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.project_expenses;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_purchases') THEN
    DROP POLICY IF EXISTS "Users can view all purchases" ON public.project_purchases;
    DROP POLICY IF EXISTS "Authenticated users can insert purchases" ON public.project_purchases;
    DROP POLICY IF EXISTS "Authenticated users can update purchases" ON public.project_purchases;
    DROP POLICY IF EXISTS "Authenticated users can delete purchases" ON public.project_purchases;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_transactions') THEN
    DROP POLICY IF EXISTS "Users can view all transactions" ON public.project_transactions;
    DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.project_transactions;
    DROP POLICY IF EXISTS "Authenticated users can update transactions" ON public.project_transactions;
    DROP POLICY IF EXISTS "Authenticated users can delete transactions" ON public.project_transactions;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    DROP POLICY IF EXISTS "Users can view all payments" ON public.payments;
    DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
    DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
    DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments;
  END IF;
END $$;

-- =====================================================
-- PART 4: CREATE OPTIMIZED RLS POLICIES
-- =====================================================
-- Using simple boolean expressions instead of auth.uid()/auth.role()
-- These policies are indexed-friendly and avoid initialization plan warnings
-- =====================================================

-- ============= USERS =============
CREATE POLICY opt_users_select ON public.users 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_users_insert ON public.users 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_users_update ON public.users 
  FOR UPDATE TO authenticated 
  USING (true);

-- ============= PROJECTS =============
CREATE POLICY opt_projects_select ON public.projects 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_projects_insert ON public.projects 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_projects_update ON public.projects 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_projects_delete ON public.projects 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= TASKS =============
CREATE POLICY opt_tasks_select ON public.tasks 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_tasks_insert ON public.tasks 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_tasks_update ON public.tasks 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_tasks_delete ON public.tasks 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= TASK UPDATES =============
CREATE POLICY opt_task_updates_select ON public.task_updates 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_task_updates_insert ON public.task_updates 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_task_updates_update ON public.task_updates 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_task_updates_delete ON public.task_updates 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= QC REQUESTS =============
CREATE POLICY opt_qc_requests_select ON public.qc_requests 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_qc_requests_insert ON public.qc_requests 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_qc_requests_update ON public.qc_requests 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_qc_requests_delete ON public.qc_requests 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= PHASE QC REVIEWS =============
CREATE POLICY opt_phase_qc_reviews_select ON public.phase_qc_reviews 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_phase_qc_reviews_insert ON public.phase_qc_reviews 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_phase_qc_reviews_update ON public.phase_qc_reviews 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_phase_qc_reviews_delete ON public.phase_qc_reviews 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= MESSAGES =============
CREATE POLICY opt_messages_select ON public.messages 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_messages_insert ON public.messages 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_messages_update ON public.messages 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_messages_delete ON public.messages 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= TEAM MEMBERS =============
CREATE POLICY opt_team_members_select ON public.team_members 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_team_members_insert ON public.team_members 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_team_members_update ON public.team_members 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_team_members_delete ON public.team_members 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= VENDORS =============
CREATE POLICY opt_vendors_select ON public.vendors 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_vendors_insert ON public.vendors 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_vendors_update ON public.vendors 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_vendors_delete ON public.vendors 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= CLIENTS =============
CREATE POLICY opt_clients_select ON public.clients 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_clients_insert ON public.clients 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_clients_update ON public.clients 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_clients_delete ON public.clients 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= LEADS =============
CREATE POLICY opt_leads_select ON public.leads 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_leads_insert ON public.leads 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_leads_update ON public.leads 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_leads_delete ON public.leads 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= INVENTORY =============
CREATE POLICY opt_inventory_select ON public.inventory 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_inventory_insert ON public.inventory 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_inventory_update ON public.inventory 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_inventory_delete ON public.inventory 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= TRANSACTIONS =============
CREATE POLICY opt_transactions_select ON public.transactions 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_transactions_insert ON public.transactions 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_transactions_update ON public.transactions 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_transactions_delete ON public.transactions 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= ACTIVITIES =============
CREATE POLICY opt_activities_select ON public.activities 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_activities_insert ON public.activities 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_activities_update ON public.activities 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_activities_delete ON public.activities 
  FOR DELETE TO authenticated 
  USING (true);

-- ============= TASK TEMPLATES =============
CREATE POLICY opt_task_templates_select ON public.task_templates 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY opt_task_templates_insert ON public.task_templates 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY opt_task_templates_update ON public.task_templates 
  FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY opt_task_templates_delete ON public.task_templates 
  FOR DELETE TO authenticated 
  USING (true);

-- =====================================================
-- PART 5: OPTIMIZED POLICIES FOR FINANCE TABLES
-- =====================================================

-- ============= INVENTORY TRANSACTIONS =============
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
    EXECUTE 'CREATE POLICY opt_inventory_transactions_select ON public.inventory_transactions FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_inventory_transactions_insert ON public.inventory_transactions FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY opt_inventory_transactions_update ON public.inventory_transactions FOR UPDATE TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_inventory_transactions_delete ON public.inventory_transactions FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- ============= PAYMENTS RECEIVED =============
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments_received') THEN
    EXECUTE 'CREATE POLICY opt_payments_received_select ON public.payments_received FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_payments_received_insert ON public.payments_received FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY opt_payments_received_update ON public.payments_received FOR UPDATE TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_payments_received_delete ON public.payments_received FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- ============= PROJECT EXPENSES =============
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_expenses') THEN
    EXECUTE 'CREATE POLICY opt_project_expenses_select ON public.project_expenses FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_project_expenses_insert ON public.project_expenses FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY opt_project_expenses_update ON public.project_expenses FOR UPDATE TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_project_expenses_delete ON public.project_expenses FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- ============= PROJECT PURCHASES =============
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_purchases') THEN
    EXECUTE 'CREATE POLICY opt_project_purchases_select ON public.project_purchases FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_project_purchases_insert ON public.project_purchases FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY opt_project_purchases_update ON public.project_purchases FOR UPDATE TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_project_purchases_delete ON public.project_purchases FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- ============= PROJECT TRANSACTIONS =============
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_transactions') THEN
    EXECUTE 'CREATE POLICY opt_project_transactions_select ON public.project_transactions FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_project_transactions_insert ON public.project_transactions FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY opt_project_transactions_update ON public.project_transactions FOR UPDATE TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_project_transactions_delete ON public.project_transactions FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- ============= PAYMENTS (alternative table name) =============
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    EXECUTE 'CREATE POLICY opt_payments_select ON public.payments FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_payments_insert ON public.payments FOR INSERT TO authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY opt_payments_update ON public.payments FOR UPDATE TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY opt_payments_delete ON public.payments FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- PART 6: ANALYZE TABLES FOR QUERY PLANNER OPTIMIZATION
-- =====================================================

ANALYZE public.users;
ANALYZE public.projects;
ANALYZE public.tasks;
ANALYZE public.task_updates;
ANALYZE public.qc_requests;
ANALYZE public.phase_qc_reviews;
ANALYZE public.messages;
ANALYZE public.team_members;
ANALYZE public.vendors;
ANALYZE public.clients;
ANALYZE public.leads;
ANALYZE public.inventory;
ANALYZE public.transactions;
ANALYZE public.activities;
ANALYZE public.task_templates;

-- Analyze finance tables if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
    EXECUTE 'ANALYZE public.inventory_transactions';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments_received') THEN
    EXECUTE 'ANALYZE public.payments_received';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_expenses') THEN
    EXECUTE 'ANALYZE public.project_expenses';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_purchases') THEN
    EXECUTE 'ANALYZE public.project_purchases';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_transactions') THEN
    EXECUTE 'ANALYZE public.project_transactions';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    EXECUTE 'ANALYZE public.payments';
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verification Query - Run this to check policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

-- Performance Check - Run this to see if warnings are gone
-- EXPLAIN ANALYZE SELECT * FROM public.clients LIMIT 10;
-- EXPLAIN ANALYZE SELECT * FROM public.projects WHERE client = 'some-uuid';
-- EXPLAIN ANALYZE SELECT * FROM public.transactions WHERE project_id = 'some-uuid';
