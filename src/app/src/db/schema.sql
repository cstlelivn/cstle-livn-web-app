-- USERS (maps to your existing auth system)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'Associate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  location text,
  budget numeric DEFAULT 0,
  spent numeric DEFAULT 0,
  progress numeric DEFAULT 0,
  status text DEFAULT 'Planning',
  phase text,
  phases jsonb, -- PhaseWithDuration[]
  start_date timestamptz,
  end_date timestamptz,
  description text,
  team jsonb, -- number[] of team member IDs
  color text DEFAULT '#748B7B',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'To Do',
  priority text NOT NULL DEFAULT 'Medium',
  assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  due_date timestamptz,
  progress numeric DEFAULT 0,
  tags jsonb, -- string[]
  phase text,
  completed_date timestamptz,
  review_feedback text,
  rating numeric,
  rating_metrics jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- TASK UPDATES (comments/photos)
CREATE TABLE IF NOT EXISTS public.task_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- QC REVIEWS
CREATE TABLE IF NOT EXISTS public.qc_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PHASE QC REVIEWS
CREATE TABLE IF NOT EXISTS public.phase_qc_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  feedback text,
  notes text,
  tasks_completed integer DEFAULT 0,
  tasks_total integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- MESSAGES (project-scoped)
CREATE TABLE IF NOT EXISTS public.messages (
  id bigserial PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- TEAM MEMBERS
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  email text NOT NULL,
  phone text,
  aura_rating numeric DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  tasks_on_time integer DEFAULT 0,
  efficiency numeric DEFAULT 0,
  specialties jsonb, -- string[]
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- VENDORS
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  rating numeric DEFAULT 0,
  total_projects integer DEFAULT 0,
  on_time_delivery numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  contact jsonb, -- { email, phone, address }
  services jsonb, -- string[]
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  status text DEFAULT 'Lead',
  projects_count integer DEFAULT 0,
  total_value numeric DEFAULT 0,
  source text,
  notes text,
  last_contact timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- LEADS
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_form text, -- 'contact' or 'booking'
  first_name text,
  last_name text,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  project_address text, -- renamed from 'address' for clarity
  estimated_value numeric DEFAULT 0, -- Estimated project value
  consultation_date timestamptz,
  service_type text, -- for booking form
  project_type text, -- alternative service type field
  project_details text, -- for booking form
  message text, -- for contact form
  links text, -- URLs submitted by user
  company text,
  status text DEFAULT 'New Lead',
  source text DEFAULT 'Website Booking',
  notes text, -- admin internal notes
  last_contact timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  type text NOT NULL DEFAULT 'Consumable',
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'unit',
  min_stock numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  supplier_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  location text,
  last_restocked timestamptz,
  last_used timestamptz,
  assigned_to text,
  status text,
  condition text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  transaction_type text NOT NULL, -- 'expense', 'payment', etc. (database uses transaction_type, not type)
  category text,
  amount numeric NOT NULL,
  description text,
  date timestamptz NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  status text DEFAULT 'Completed',
  phase_name text, -- Phase this transaction belongs to
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PROJECT PURCHASES
CREATE TABLE IF NOT EXISTS public.project_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  item_name text NOT NULL,
  vendor text NOT NULL,
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

-- ACTIVITIES
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  action text NOT NULL,
  target text,
  target_id text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  type text
);

-- TASK TEMPLATES
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'Medium',
  tags jsonb, -- string[]
  created_at timestamptz NOT NULL DEFAULT now()
);

-- REMINDERS (local only, not migrated to DB for now)
-- Kept in localStorage for simplicity

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_qc_requests_updated_at BEFORE UPDATE ON public.qc_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phase_qc_reviews_updated_at BEFORE UPDATE ON public.phase_qc_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_purchases_updated_at BEFORE UPDATE ON public.project_purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();