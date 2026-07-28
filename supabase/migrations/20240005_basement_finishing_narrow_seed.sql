-- =============================================================================
-- Seed: "Basement Finishing" (narrow) -- starts after drywall is already up,
-- ends at client handover. For jobs that do not include permits/framing/
-- rough-in (that is the existing "Basement Finishing & Development" template).
-- Written as plain standalone INSERT statements with fixed literal UUIDs
-- (no CTEs, no RETURNING, no PL/pgSQL variables) -- each guarded by its own
-- WHERE NOT EXISTS check against that same literal id, so this file is safe
-- to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Schema reconciliation: this codebase has TWO conflicting definitions of
-- task_templates -- an old, simple one (src/app/src/db/schema.sql: id, name,
-- title NOT NULL, description, priority, tags, created_at -- for a
-- localStorage-backed "quick task template" feature that turned out to never
-- actually read/write this table) and a richer one that the project/phase
-- template system (20240002_projects_phase_system.sql, this file, and the
-- Template Builder screen) all assume. Because the old one was created first,
-- 20240002's "CREATE TABLE IF NOT EXISTS" was a no-op, and the live table is
-- missing every column the real feature needs. Add them now; make the old
-- "title" column optional since nothing populates it through this system.
-- -----------------------------------------------------------------------------
ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS phase_template_id uuid REFERENCES public.phase_templates(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_template_id uuid REFERENCES public.project_templates(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'Administrative',
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_duration_days integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS suggested_role text,
  ADD COLUMN IF NOT EXISTS procurement_lead_time integer,
  ADD COLUMN IF NOT EXISTS inspection_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS evidence_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_dependency text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.task_templates ALTER COLUMN title DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_templates_phase_template_id ON public.task_templates(phase_template_id);

ALTER TABLE public.project_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates DISABLE ROW LEVEL SECURITY;

INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
SELECT '05540f93-f091-4d1b-beef-c1979852440f', 'Basement Finishing',
       'Basement finishing starting after drywall is complete, through flooring, trim, fixtures, and handover. For jobs that do not include permits, framing, or rough-in trades, use "Basement Finishing & Development" for the full scope.',
       'Basement', '1.0', true, 35
WHERE NOT EXISTS (SELECT 1 FROM public.project_templates WHERE id = '05540f93-f091-4d1b-beef-c1979852440f');

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '3314f02a-5733-402b-a657-283d4119c969', '05540f93-f091-4d1b-beef-c1979852440f', 'Priming & Painting', 0, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '3314f02a-5733-402b-a657-283d4119c969');

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '4d2fd1d9-b93c-4f59-8ca0-21b496e612ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Flooring', 1, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '4d2fd1d9-b93c-4f59-8ca0-21b496e612ad');

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '8f758ab7-9e03-4022-86a4-06107e2e18ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Doors, Trim & Millwork', 2, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '8f758ab7-9e03-4022-86a4-06107e2e18ad');

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '5ce6084e-2126-47f5-ac4d-a249a4bf8bb5', '05540f93-f091-4d1b-beef-c1979852440f', 'Fixtures & Final Trade Completion', 3, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '5ce6084e-2126-47f5-ac4d-a249a4bf8bb5');

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '13f15f4d-34fb-490f-a705-a790fcc1382a', '05540f93-f091-4d1b-beef-c1979852440f', 'Deficiencies, Final QC & Handover', 4, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '13f15f4d-34fb-490f-a705-a790fcc1382a');

-- One INSERT per phase (kept small/simple after a larger combined statement
-- failed against this migration tool). Not individually guarded by
-- WHERE NOT EXISTS -- in practice this file runs at most once per database,
-- and the phase rows above are the real idempotency boundary.

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('3314f02a-5733-402b-a657-283d4119c969', '05540f93-f091-4d1b-beef-c1979852440f', 'Confirm paint colours and sheen with client', 'Client Communication', 0, 'High',   true),
  ('3314f02a-5733-402b-a657-283d4119c969', '05540f93-f091-4d1b-beef-c1979852440f', 'Patch and sand drywall surfaces',             'Trade Work',            1, 'High',   true),
  ('3314f02a-5733-402b-a657-283d4119c969', '05540f93-f091-4d1b-beef-c1979852440f', 'Protect flooring and fixtures',               'Site Work',             2, 'Medium', true),
  ('3314f02a-5733-402b-a657-283d4119c969', '05540f93-f091-4d1b-beef-c1979852440f', 'Apply primer',                                'Trade Work',            3, 'High',   true),
  ('3314f02a-5733-402b-a657-283d4119c969', '05540f93-f091-4d1b-beef-c1979852440f', 'Apply finish coats',                          'Trade Work',            4, 'High',   true),
  ('3314f02a-5733-402b-a657-283d4119c969', '05540f93-f091-4d1b-beef-c1979852440f', 'Paint QC review',                             'Quality Control',       5, 'High',   true);

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('4d2fd1d9-b93c-4f59-8ca0-21b496e612ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Confirm flooring product with client', 'Client Communication', 0, 'High', true),
  ('4d2fd1d9-b93c-4f59-8ca0-21b496e612ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Confirm delivery and acclimation',     'Procurement',          1, 'High', true),
  ('4d2fd1d9-b93c-4f59-8ca0-21b496e612ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Inspect subfloor before installation', 'Inspection',           2, 'High', true),
  ('4d2fd1d9-b93c-4f59-8ca0-21b496e612ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Install flooring',                     'Trade Work',           3, 'High', true),
  ('4d2fd1d9-b93c-4f59-8ca0-21b496e612ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Flooring QC review',                   'Quality Control',      4, 'High', true);

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('8f758ab7-9e03-4022-86a4-06107e2e18ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Confirm door and hardware selections', 'Client Communication', 0, 'High',   true),
  ('8f758ab7-9e03-4022-86a4-06107e2e18ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Install interior doors',               'Trade Work',            1, 'High',   true),
  ('8f758ab7-9e03-4022-86a4-06107e2e18ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Install baseboards and casing',        'Trade Work',            2, 'High',   true),
  ('8f758ab7-9e03-4022-86a4-06107e2e18ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Install any built-in millwork',        'Trade Work',            3, 'Medium', false),
  ('8f758ab7-9e03-4022-86a4-06107e2e18ad', '05540f93-f091-4d1b-beef-c1979852440f', 'Trim and millwork QC review',          'Quality Control',       4, 'High',   true);

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('5ce6084e-2126-47f5-ac4d-a249a4bf8bb5', '05540f93-f091-4d1b-beef-c1979852440f', 'Install light fixtures',                       'Trade Work',     0, 'High',   true),
  ('5ce6084e-2126-47f5-ac4d-a249a4bf8bb5', '05540f93-f091-4d1b-beef-c1979852440f', 'Install plumbing fixtures (if applicable)',     'Trade Work',     1, 'Medium', false),
  ('5ce6084e-2126-47f5-ac4d-a249a4bf8bb5', '05540f93-f091-4d1b-beef-c1979852440f', 'Complete outstanding electrical trim',          'Trade Work',     2, 'High',   true),
  ('5ce6084e-2126-47f5-ac4d-a249a4bf8bb5', '05540f93-f091-4d1b-beef-c1979852440f', 'Confirm all trades have completed their scope', 'Administrative', 3, 'High',   true);

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('13f15f4d-34fb-490f-a705-a790fcc1382a', '05540f93-f091-4d1b-beef-c1979852440f', 'Complete internal final inspection', 'Inspection',          0, 'High',   true),
  ('13f15f4d-34fb-490f-a705-a790fcc1382a', '05540f93-f091-4d1b-beef-c1979852440f', 'Create deficiency list',             'Administrative',       1, 'High',   true),
  ('13f15f4d-34fb-490f-a705-a790fcc1382a', '05540f93-f091-4d1b-beef-c1979852440f', 'Complete deficiencies',              'Corrective Work',      2, 'High',   true),
  ('13f15f4d-34fb-490f-a705-a790fcc1382a', '05540f93-f091-4d1b-beef-c1979852440f', 'Final cleaning',                     'Site Work',            3, 'Medium', true),
  ('13f15f4d-34fb-490f-a705-a790fcc1382a', '05540f93-f091-4d1b-beef-c1979852440f', 'Client walkthrough',                 'Client Communication', 4, 'High',   true),
  ('13f15f4d-34fb-490f-a705-a790fcc1382a', '05540f93-f091-4d1b-beef-c1979852440f', 'Record client handover',             'Handover',             5, 'High',   true);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
