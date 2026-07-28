-- =============================================================================
-- Migration: Projects phase system, template engine, procurement, QC, inspection
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. project_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  project_type  text,
  version       text DEFAULT '1.0',
  active        boolean DEFAULT true,
  default_duration_days integer DEFAULT 30,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. phase_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phase_templates (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_template_id  uuid REFERENCES public.project_templates(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  description          text,
  position             integer NOT NULL DEFAULT 0,
  default_duration_days integer DEFAULT 7,
  required             boolean DEFAULT true,
  completion_rules     jsonb DEFAULT '{}',
  qc_checklist         jsonb DEFAULT '[]',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. task_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id     uuid REFERENCES public.phase_templates(id) ON DELETE CASCADE,
  project_template_id   uuid REFERENCES public.project_templates(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  description           text,
  task_type             text DEFAULT 'Administrative',
  position              integer NOT NULL DEFAULT 0,
  default_duration_days integer DEFAULT 1,
  priority              text DEFAULT 'Medium',
  required              boolean DEFAULT true,
  suggested_role        text,
  procurement_lead_time integer,
  inspection_required   boolean DEFAULT false,
  evidence_required     boolean DEFAULT false,
  default_dependency    text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. procurement_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procurement_templates (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id    uuid REFERENCES public.phase_templates(id) ON DELETE CASCADE,
  task_template_id     uuid REFERENCES public.task_templates(id) ON DELETE SET NULL,
  item_name            text NOT NULL,
  description          text,
  quantity             numeric DEFAULT 1,
  unit                 text DEFAULT 'unit',
  lead_time_days       integer DEFAULT 7,
  procurement_strategy text DEFAULT 'just-in-time',
  notes                text,
  created_at           timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. project_phases (normalized, replaces JSON phases column)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_phases (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL,
  phase_template_id   uuid REFERENCES public.phase_templates(id) ON DELETE SET NULL,
  name                text NOT NULL,
  description         text,
  position            integer NOT NULL DEFAULT 0,
  status              text DEFAULT 'Not Started',
  start_date          date,
  end_date            date,
  progress            integer DEFAULT 0,
  qc_status           text DEFAULT 'Not Started',
  phase_lead_id       uuid,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON public.project_phases(project_id);

-- ---------------------------------------------------------------------------
-- 6. procurement_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procurement_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL,
  phase_id                uuid REFERENCES public.project_phases(id) ON DELETE SET NULL,
  task_id                 uuid,
  item_name               text NOT NULL,
  description             text,
  quantity                numeric DEFAULT 1,
  unit                    text DEFAULT 'unit',
  status                  text DEFAULT 'Not Reviewed',
  required_on_site_date   date,
  recommended_order_date  date,
  lead_time_days          integer DEFAULT 7,
  buffer_days             integer DEFAULT 2,
  procurement_strategy    text DEFAULT 'just-in-time',
  supplier                text,
  assigned_buyer          uuid,
  delivery_location       text,
  delivery_confirmed      boolean DEFAULT false,
  notes                   text,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procurement_items_project_id ON public.procurement_items(project_id);
CREATE INDEX IF NOT EXISTS idx_procurement_items_phase_id   ON public.procurement_items(phase_id);

-- ---------------------------------------------------------------------------
-- 7. phase_qc_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phase_qc_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL,
  phase_id          uuid REFERENCES public.project_phases(id) ON DELETE CASCADE,
  status            text DEFAULT 'Not Started',
  submitted_by      uuid,
  submitted_at      timestamptz,
  reviewed_by       uuid,
  reviewed_at       timestamptz,
  result            text,
  checklist_answers jsonb DEFAULT '{}',
  notes             text,
  evidence_urls     jsonb DEFAULT '[]',
  rejection_reason  text,
  conditions        text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phase_qc_records_phase_id ON public.phase_qc_records(phase_id);

-- ---------------------------------------------------------------------------
-- 8. inspection_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inspection_records (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL,
  phase_id             uuid REFERENCES public.project_phases(id) ON DELETE SET NULL,
  task_id              uuid,
  inspection_type      text NOT NULL,
  authority            text,
  permit_number        text,
  requested_date       date,
  scheduled_date       date,
  completed_date       date,
  result               text DEFAULT 'Not Requested',
  deficiency_notes     text,
  reinspection_required boolean DEFAULT false,
  not_applicable       boolean DEFAULT false,
  not_applicable_reason text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_records_project_id ON public.inspection_records(project_id);

-- ---------------------------------------------------------------------------
-- 9. Extend tasks table
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type           text DEFAULT 'Administrative',
  ADD COLUMN IF NOT EXISTS phase_id            uuid REFERENCES public.project_phases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_date          date,
  ADD COLUMN IF NOT EXISTS dependency_task_id  uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blocked_by          text,
  ADD COLUMN IF NOT EXISTS override_reason     text,
  ADD COLUMN IF NOT EXISTS procurement_item_id uuid REFERENCES public.procurement_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inspection_id       uuid REFERENCES public.inspection_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_required         boolean DEFAULT true;

-- ---------------------------------------------------------------------------
-- 10. project_activity_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_activity_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL,
  user_id       uuid,
  action        text NOT NULL,
  object_type   text,
  object_id     uuid,
  prev_value    jsonb,
  new_value     jsonb,
  reason        text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_activity_log_project_id ON public.project_activity_log(project_id);

-- ---------------------------------------------------------------------------
-- 11. Migrate existing JSON phases → project_phases rows (safe, one-time)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  proj      RECORD;
  ph        RECORD;
  ph_json   jsonb;
  ph_item   jsonb;
  pos       integer;
BEGIN
  FOR proj IN SELECT id, phases, start_date FROM public.projects WHERE phases IS NOT NULL LOOP
    -- Only migrate if there are no project_phases rows yet for this project
    IF NOT EXISTS (SELECT 1 FROM public.project_phases WHERE project_id = proj.id::uuid) THEN
      BEGIN
        ph_json := proj.phases;
        IF jsonb_typeof(ph_json) = 'array' THEN
          pos := 0;
          FOR ph_item IN SELECT * FROM jsonb_array_elements(ph_json) LOOP
            INSERT INTO public.project_phases (
              project_id, name, position, status,
              start_date, end_date, created_at, updated_at
            )
            VALUES (
              proj.id::uuid,
              ph_item->>'name',
              pos,
              'Not Started',
              CASE WHEN proj.start_date IS NOT NULL
                   THEN proj.start_date + (
                     COALESCE((SELECT SUM((e->>'days')::int)
                               FROM jsonb_array_elements(ph_json) WITH ORDINALITY AS t(e, rn)
                               WHERE t.rn <= pos), 0)
                   ) * INTERVAL '1 day'
                   ELSE NULL END,
              NULL,
              now(), now()
            );
            pos := pos + 1;
          END LOOP;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Skip any project that fails JSON parsing
        NULL;
      END;
    END IF;
  END LOOP;
END;
$$;
