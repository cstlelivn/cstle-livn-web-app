-- Estimating & profitability tool, migration 2 of 4: the estimate pipeline
-- itself -- one row per prospective job moving through Leads -> Site
-- Capture -> AI Analysis -> Scope & Takeoff -> Project Plan -> Pricing ->
-- Proposal -> Customer Approval. Takeoff/pricing/proposal/approval land in
-- migration 3; this migration is the estimate shell plus everything
-- captured on-site (notes, measurements, documents, photos).
--
-- Deliberately its own pipeline, not the existing `projects` table --
-- `projects` is wired to phases/tasks/QC/warranty/closed-project immutability,
-- all post-contract concepts. A real `projects` row only gets created once
-- a customer actually approves (migration 4). An estimate always links to
-- an existing `clients` row (the app's one real "customer" entity) and can
-- optionally trace back to the `leads` row it started from, so this
-- connects to CRM instead of duplicating it.

CREATE TABLE IF NOT EXISTS public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  name text NOT NULL, -- job/project name, e.g. "Basement development"
  site_address text,
  status text NOT NULL DEFAULT 'lead' CHECK (status IN (
    'lead', 'estimating', 'proposal_sent', 'approved', 'converted', 'declined', 'lost'
  )),
  -- Sequential gates, one boolean per screen -- mirrors the phase-QC-gate
  -- pattern already used elsewhere (checkPhaseQCReadiness / phase.gates).
  capture_confirmed boolean NOT NULL DEFAULT false,
  analysis_confirmed boolean NOT NULL DEFAULT false,
  scope_confirmed boolean NOT NULL DEFAULT false,
  plan_confirmed boolean NOT NULL DEFAULT false,
  pricing_confirmed boolean NOT NULL DEFAULT false,
  proposal_approved boolean NOT NULL DEFAULT false, -- internal approval to send
  customer_approved boolean NOT NULL DEFAULT false,
  -- AI Analysis output (Screen 3) -- organized notes/facts/scope/questions.
  -- Kept as jsonb here since it's read-only structured AI output, not
  -- something queried/joined on; takeoff lines (which DO get queried,
  -- reordered, and priced) are their own table in migration 3.
  ai_analysis jsonb,
  ai_analysis_generated_at timestamptz,
  scope_of_work text, -- human-editable after AI drafts it
  project_plan jsonb, -- AI-generated step sequence/research/permits/risks/closeout
  project_plan_generated_at timestamptz,
  capture_notes text,
  capture_walkthrough text,
  converted_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimates_client ON public.estimates(client_id);
CREATE INDEX IF NOT EXISTS idx_estimates_lead ON public.estimates(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created ON public.estimates(created_at DESC);

DROP TRIGGER IF EXISTS trg_estimates_touch ON public.estimates;
CREATE TRIGGER trg_estimates_touch
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.touch_estimating_updated_at();

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimates_select ON public.estimates;
CREATE POLICY estimates_select ON public.estimates FOR SELECT
  USING (public.can_view_estimating());

DROP POLICY IF EXISTS estimates_insert ON public.estimates;
CREATE POLICY estimates_insert ON public.estimates FOR INSERT
  WITH CHECK (public.can_run_estimating());

DROP POLICY IF EXISTS estimates_update ON public.estimates;
CREATE POLICY estimates_update ON public.estimates FOR UPDATE
  USING (public.can_run_estimating())
  WITH CHECK (public.can_run_estimating());

-- No delete policy -- an estimate is never hard-deleted (matches the
-- ON DELETE RESTRICT convention used for tasks/permits with real history);
-- a lost/declined estimate just changes status.

-- ---------------------------------------------------------------------------
-- Site capture -- measurements and documents are real rows (queryable,
-- editable, deletable individually); notes/walkthrough are plain text
-- columns on the estimate itself (capture_notes/capture_walkthrough,
-- above) since they're just freeform text with no internal structure
-- worth normalizing.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimate_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL, -- kept as text, not numeric -- source data is a
                        -- hand-typed field measurement ("85", "12 x 14"),
                        -- not something this table does arithmetic on
  unit text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estimate_measurements_estimate ON public.estimate_measurements(estimate_id);

CREATE TABLE IF NOT EXISTS public.estimate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  name text NOT NULL,
  note text, -- manual summary of what's in the document -- real parsing is
             -- explicitly out of scope for this build, per the source spec
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estimate_documents_estimate ON public.estimate_documents(estimate_id);

ALTER TABLE public.estimate_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimate_measurements_select ON public.estimate_measurements;
CREATE POLICY estimate_measurements_select ON public.estimate_measurements FOR SELECT
  USING (public.can_view_estimating());
DROP POLICY IF EXISTS estimate_measurements_write ON public.estimate_measurements;
CREATE POLICY estimate_measurements_write ON public.estimate_measurements FOR ALL
  USING (public.can_run_estimating())
  WITH CHECK (public.can_run_estimating());

DROP POLICY IF EXISTS estimate_documents_select ON public.estimate_documents;
CREATE POLICY estimate_documents_select ON public.estimate_documents FOR SELECT
  USING (public.can_view_estimating());
DROP POLICY IF EXISTS estimate_documents_write ON public.estimate_documents;
CREATE POLICY estimate_documents_write ON public.estimate_documents FOR ALL
  USING (public.can_run_estimating())
  WITH CHECK (public.can_run_estimating());

-- ---------------------------------------------------------------------------
-- Estimate media -- site photos, R2-backed via the same signed-URL
-- prepare/complete flow as task_media (20240027), kept as its own table
-- rather than adding an estimate_id column to task_media: task_media's
-- validation trigger, RLS, and the R2 free-tier guard all assume a real
-- project/task, and an estimate isn't one yet.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimate_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  content_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  media_kind text NOT NULL CHECK (media_kind IN ('photo', 'video', 'audio', 'document')),
  caption text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  upload_status text NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'ready', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_estimate_media_estimate
  ON public.estimate_media(estimate_id, created_at DESC) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_estimate_media_touch ON public.estimate_media;
CREATE TRIGGER trg_estimate_media_touch
  BEFORE UPDATE ON public.estimate_media
  FOR EACH ROW EXECUTE FUNCTION public.touch_estimating_updated_at();

ALTER TABLE public.estimate_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimate_media_select ON public.estimate_media;
CREATE POLICY estimate_media_select ON public.estimate_media FOR SELECT
  USING (public.can_view_estimating());
DROP POLICY IF EXISTS estimate_media_write ON public.estimate_media;
CREATE POLICY estimate_media_write ON public.estimate_media FOR ALL
  USING (public.can_run_estimating())
  WITH CHECK (public.can_run_estimating());
