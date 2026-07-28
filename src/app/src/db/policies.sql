-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_qc_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for all tables
-- IMPORTANT: You must also enable Realtime in the Supabase Dashboard:
-- 1. Go to Database > Replication
-- 2. Enable replication for all tables
-- 3. Or run: ALTER TABLE table_name REPLICA IDENTITY FULL; for each table

-- Set replica identity to FULL for all tables (required for realtime DELETE events)
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_updates REPLICA IDENTITY FULL;
ALTER TABLE public.qc_requests REPLICA IDENTITY FULL;
ALTER TABLE public.phase_qc_reviews REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.team_members REPLICA IDENTITY FULL;
ALTER TABLE public.vendors REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.inventory REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.activities REPLICA IDENTITY FULL;
ALTER TABLE public.task_templates REPLICA IDENTITY FULL;

-- Add tables to realtime publication (only if not already added)
DO $$
BEGIN
  -- Check if publication exists, if not it will be created automatically by Supabase
  -- Add each table to the publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_updates;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qc_requests;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.phase_qc_reviews;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendors;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_templates;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Simple permissive policies for development
-- TODO: Refine these based on role-based permissions later

-- Users
CREATE POLICY IF NOT EXISTS p_users_select ON public.users FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_users_insert ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_users_update ON public.users FOR UPDATE USING (true);

-- Projects
CREATE POLICY IF NOT EXISTS p_projects_select ON public.projects FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_projects_insert ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_projects_update ON public.projects FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS p_projects_delete ON public.projects FOR DELETE USING (true);

-- Tasks
CREATE POLICY IF NOT EXISTS p_tasks_select ON public.tasks FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_tasks_insert ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_tasks_update ON public.tasks FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS p_tasks_delete ON public.tasks FOR DELETE USING (true);

-- Task Updates
CREATE POLICY IF NOT EXISTS p_task_updates_select ON public.task_updates FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_task_updates_insert ON public.task_updates FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_task_updates_delete ON public.task_updates FOR DELETE USING (true);

-- QC Requests
CREATE POLICY IF NOT EXISTS p_qc_requests_select ON public.qc_requests FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_qc_requests_insert ON public.qc_requests FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_qc_requests_update ON public.qc_requests FOR UPDATE USING (true);

-- Phase QC Reviews
CREATE POLICY IF NOT EXISTS p_phase_qc_reviews_select ON public.phase_qc_reviews FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_phase_qc_reviews_insert ON public.phase_qc_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_phase_qc_reviews_update ON public.phase_qc_reviews FOR UPDATE USING (true);

-- Messages
CREATE POLICY IF NOT EXISTS p_messages_select ON public.messages FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_messages_insert ON public.messages FOR INSERT WITH CHECK (true);

-- Team Members
CREATE POLICY IF NOT EXISTS p_team_members_select ON public.team_members FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_team_members_insert ON public.team_members FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_team_members_update ON public.team_members FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS p_team_members_delete ON public.team_members FOR DELETE USING (true);

-- Vendors
CREATE POLICY IF NOT EXISTS p_vendors_select ON public.vendors FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_vendors_insert ON public.vendors FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_vendors_update ON public.vendors FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS p_vendors_delete ON public.vendors FOR DELETE USING (true);

-- Clients
CREATE POLICY IF NOT EXISTS p_clients_select ON public.clients FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_clients_insert ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_clients_update ON public.clients FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS p_clients_delete ON public.clients FOR DELETE USING (true);

-- Leads
CREATE POLICY IF NOT EXISTS p_leads_select ON public.leads FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_leads_insert ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_leads_update ON public.leads FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS p_leads_delete ON public.leads FOR DELETE USING (true);

-- Inventory
CREATE POLICY IF NOT EXISTS p_inventory_select ON public.inventory FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_inventory_insert ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_inventory_update ON public.inventory FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS p_inventory_delete ON public.inventory FOR DELETE USING (true);

-- Transactions
CREATE POLICY IF NOT EXISTS p_transactions_select ON public.transactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_transactions_insert ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_transactions_update ON public.transactions FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS p_transactions_delete ON public.transactions FOR DELETE USING (true);

-- Activities
CREATE POLICY IF NOT EXISTS p_activities_select ON public.activities FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_activities_insert ON public.activities FOR INSERT WITH CHECK (true);

-- Task Templates
CREATE POLICY IF NOT EXISTS p_task_templates_select ON public.task_templates FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS p_task_templates_insert ON public.task_templates FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS p_task_templates_delete ON public.task_templates FOR DELETE USING (true);