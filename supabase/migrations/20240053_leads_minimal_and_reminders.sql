-- 1) Let a lead be created with just a name. leads.email was NOT NULL,
--    which blocked "add a lead with just a name, fill in details later" --
--    a real, explicit requirement. clients.email stays NOT NULL (a real
--    client record still needs a contact method); the app enforces that a
--    lead must have an email before it can be converted to a client.
ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;

-- 2) Real, database-backed follow-up reminders for a lead or client
--    (call / email / visit / general follow-up). This replaces a
--    browser-localStorage-only implementation that only the creator, on
--    that one browser, could ever see -- not a usable shared CRM feature
--    for a team.
CREATE TABLE IF NOT EXISTS public.crm_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Denormalized display fields, captured at creation time, so the
  -- notification bell can render a reminder without joining back to
  -- leads/clients (and still shows something sensible if the lead/client
  -- is later deleted, since lead_id/client_id cascade-delete the reminder
  -- but this row itself is what NotificationBell reads).
  lead_name text,
  client_name text,
  contact_email text,
  contact_phone text,
  type text NOT NULL DEFAULT 'follow-up',
  due_date date NOT NULL,
  due_time time,
  notes text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (type IN ('call', 'email', 'visit', 'follow-up')),
  CHECK (lead_id IS NOT NULL OR client_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_crm_reminders_due_date ON public.crm_reminders(due_date) WHERE NOT completed;
CREATE INDEX IF NOT EXISTS idx_crm_reminders_lead_id ON public.crm_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_client_id ON public.crm_reminders(client_id);

ALTER TABLE public.crm_reminders ENABLE ROW LEVEL SECURITY;

-- Same CRM visibility/edit rules as leads/clients themselves
-- (can_view_crm/can_edit_crm already exist from 20240023).
DROP POLICY IF EXISTS crm_reminders_select ON public.crm_reminders;
DROP POLICY IF EXISTS crm_reminders_insert ON public.crm_reminders;
DROP POLICY IF EXISTS crm_reminders_update ON public.crm_reminders;
DROP POLICY IF EXISTS crm_reminders_delete ON public.crm_reminders;
CREATE POLICY crm_reminders_select ON public.crm_reminders FOR SELECT USING (public.can_view_crm());
CREATE POLICY crm_reminders_insert ON public.crm_reminders FOR INSERT WITH CHECK (public.can_edit_crm());
CREATE POLICY crm_reminders_update ON public.crm_reminders FOR UPDATE USING (public.can_edit_crm()) WITH CHECK (public.can_edit_crm());
CREATE POLICY crm_reminders_delete ON public.crm_reminders FOR DELETE USING (public.can_edit_crm());
