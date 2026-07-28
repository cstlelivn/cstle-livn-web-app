-- Indexes for performance

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Task Updates
CREATE INDEX IF NOT EXISTS idx_task_updates_task ON public.task_updates(task_id, created_at DESC);

-- QC Requests
CREATE INDEX IF NOT EXISTS idx_qc_task ON public.qc_requests(task_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_qc_status ON public.qc_requests(status, updated_at DESC);

-- Phase QC Reviews
CREATE INDEX IF NOT EXISTS idx_phase_qc_project ON public.phase_qc_reviews(project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_phase_qc_status ON public.phase_qc_reviews(status, updated_at DESC);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_project ON public.messages(project_id, created_at DESC);

-- Team Members
CREATE INDEX IF NOT EXISTS idx_team_members_active ON public.team_members(active, updated_at DESC);

-- Vendors
CREATE INDEX IF NOT EXISTS idx_vendors_category ON public.vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors(name);

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(status);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_project ON public.transactions(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Activities
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON public.activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type, timestamp DESC);
