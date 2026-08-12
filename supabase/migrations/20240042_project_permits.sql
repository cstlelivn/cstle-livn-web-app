-- City permit tracking, per project. A project may need several permits
-- (building, electrical, plumbing, demolition, occupancy, etc.), and each
-- permit typically starts as a phone call or inquiry to the city long
-- before a real permit number exists -- this needs to be findable years
-- later, tied to the specific project (and, through it, the client), not
-- scattered across email/notes/memory.
--
-- Two tables:
--   project_permits       -- one row per permit (type, status, numbers, dates)
--   project_permit_events -- append-only log of every call/submission/
--                             inspection/update against that permit, each
--                             with its own reference number and who you
--                             spoke to -- a permit can rack up several of
--                             these before it's actually issued.

CREATE TABLE IF NOT EXISTS public.project_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  permit_type text NOT NULL, -- e.g. "Building", "Electrical", "Plumbing", "Mechanical", "Demolition", "Development", "Occupancy" -- free text, not an enum, since city permit categories vary and this shouldn't need a migration to add one
  status text NOT NULL DEFAULT 'Inquiry' CHECK (status IN (
    'Inquiry', 'Application Submitted', 'Under Review', 'Additional Info Requested',
    'Approved', 'Issued', 'Inspection Required', 'Closed', 'Rejected', 'Expired'
  )),
  permit_number text, -- the real, city-issued permit number, once it exists
  applied_date date,
  issued_date date,
  expiry_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_permits_project ON public.project_permits(project_id);
CREATE INDEX IF NOT EXISTS idx_project_permits_permit_number ON public.project_permits(permit_number) WHERE permit_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_permits_status ON public.project_permits(status);

CREATE TABLE IF NOT EXISTS public.project_permit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id uuid NOT NULL REFERENCES public.project_permits(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'Call', 'Email', 'Submission', 'Inspection', 'Status Update', 'Note'
  )),
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_number text, -- the city's reference number for THIS specific call/submission -- distinct from the permit's own permit_number, which may not exist yet
  contact_name text, -- who at the city (or inspector) this was with, if known
  summary text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_permit_events_permit ON public.project_permit_events(permit_id);
CREATE INDEX IF NOT EXISTS idx_project_permit_events_reference ON public.project_permit_events(reference_number) WHERE reference_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_project_permit_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_permits_touch ON public.project_permits;
CREATE TRIGGER trg_project_permits_touch
  BEFORE UPDATE ON public.project_permits
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_permit_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: this is office/compliance record-keeping, not onsite work -- visible
-- to the same broad roles that can see full project details (Super Admin,
-- Admin, Manager, Accountant, Quality Control -- whatever is_broad_project_
-- viewer() already covers) plus the Supervisor of that specific project.
-- Associates/Contractors never see permits; there's no task-ownership-based
-- carve-out here the way there is for phases/tasks, since permits aren't
-- assigned to individual crew members.
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_permit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_permits_select ON public.project_permits;
CREATE POLICY project_permits_select ON public.project_permits FOR SELECT
  USING (public.is_broad_project_viewer() OR public.is_project_supervisor(project_id));

DROP POLICY IF EXISTS project_permits_insert ON public.project_permits;
CREATE POLICY project_permits_insert ON public.project_permits FOR INSERT
  WITH CHECK (public.is_manager_or_admin() OR public.is_project_supervisor(project_id));

DROP POLICY IF EXISTS project_permits_update ON public.project_permits;
CREATE POLICY project_permits_update ON public.project_permits FOR UPDATE
  USING (public.is_manager_or_admin() OR public.is_project_supervisor(project_id))
  WITH CHECK (public.is_manager_or_admin() OR public.is_project_supervisor(project_id));

DROP POLICY IF EXISTS project_permits_delete ON public.project_permits;
CREATE POLICY project_permits_delete ON public.project_permits FOR DELETE
  USING (public.is_manager_or_admin());

DROP POLICY IF EXISTS project_permit_events_select ON public.project_permit_events;
CREATE POLICY project_permit_events_select ON public.project_permit_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.project_permits pp
    WHERE pp.id = project_permit_events.permit_id
      AND (public.is_broad_project_viewer() OR public.is_project_supervisor(pp.project_id))
  ));

DROP POLICY IF EXISTS project_permit_events_insert ON public.project_permit_events;
CREATE POLICY project_permit_events_insert ON public.project_permit_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_permits pp
    WHERE pp.id = project_permit_events.permit_id
      AND (public.is_manager_or_admin() OR public.is_project_supervisor(pp.project_id))
  ));

-- Events are an append-only audit log of what was actually said/done on a
-- call -- editable only by Manager/Admin (to fix a typo), never deletable,
-- so a permit's history can't be quietly rewritten later.
DROP POLICY IF EXISTS project_permit_events_update ON public.project_permit_events;
CREATE POLICY project_permit_events_update ON public.project_permit_events FOR UPDATE
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());
