-- =============================================================================
-- Seed: "Basement Finishing" (narrow) — starts after drywall is already up,
-- ends at client handover. For jobs that don't include permits/framing/
-- rough-in (that's the existing "Basement Finishing & Development" template).
-- Safe to re-run: skips if this exact template name already exists.
-- =============================================================================

DO $$
DECLARE
  tmpl_id uuid;
  ph_painting  uuid;
  ph_flooring  uuid;
  ph_trim      uuid;
  ph_fixtures  uuid;
  ph_handover  uuid;
BEGIN

IF EXISTS (SELECT 1 FROM public.project_templates WHERE name = 'Basement Finishing') THEN
  RAISE NOTICE 'Basement Finishing (narrow) template already exists – skipping.';
  RETURN;
END IF;

INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
VALUES (
  gen_random_uuid(),
  'Basement Finishing',
  'Basement finishing starting after drywall is complete, through flooring, trim, fixtures, and handover. For jobs that do not include permits, framing, or rough-in trades — use "Basement Finishing & Development" for the full scope.',
  'Basement',
  '1.0',
  true,
  35
)
RETURNING id INTO tmpl_id;

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
VALUES
  (gen_random_uuid(), tmpl_id, 'Priming & Painting',                 0, 5, true),
  (gen_random_uuid(), tmpl_id, 'Flooring',                           1, 5, true),
  (gen_random_uuid(), tmpl_id, 'Doors, Trim & Millwork',             2, 5, true),
  (gen_random_uuid(), tmpl_id, 'Fixtures & Final Trade Completion',  3, 5, true),
  (gen_random_uuid(), tmpl_id, 'Deficiencies, Final QC & Handover',  4, 7, true);

SELECT id INTO ph_painting FROM public.phase_templates WHERE project_template_id = tmpl_id AND position = 0;
SELECT id INTO ph_flooring FROM public.phase_templates WHERE project_template_id = tmpl_id AND position = 1;
SELECT id INTO ph_trim     FROM public.phase_templates WHERE project_template_id = tmpl_id AND position = 2;
SELECT id INTO ph_fixtures FROM public.phase_templates WHERE project_template_id = tmpl_id AND position = 3;
SELECT id INTO ph_handover FROM public.phase_templates WHERE project_template_id = tmpl_id AND position = 4;

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  -- Priming & Painting
  (ph_painting, tmpl_id, 'Confirm paint colours and sheen with client',     'Client Communication', 0, 'High',   true),
  (ph_painting, tmpl_id, 'Patch and sand drywall surfaces',                 'Trade Work',            1, 'High',   true),
  (ph_painting, tmpl_id, 'Protect flooring and fixtures',                   'Site Work',             2, 'Medium', true),
  (ph_painting, tmpl_id, 'Apply primer',                                   'Trade Work',             3, 'High',   true),
  (ph_painting, tmpl_id, 'Apply finish coats',                              'Trade Work',             4, 'High',   true),
  (ph_painting, tmpl_id, 'Paint QC review',                                'Quality Control',        5, 'High',   true),

  -- Flooring
  (ph_flooring, tmpl_id, 'Confirm flooring product with client',           'Client Communication', 0, 'High',   true),
  (ph_flooring, tmpl_id, 'Confirm delivery and acclimation',               'Procurement',           1, 'High',   true),
  (ph_flooring, tmpl_id, 'Inspect subfloor before installation',           'Inspection',            2, 'High',   true),
  (ph_flooring, tmpl_id, 'Install flooring',                               'Trade Work',            3, 'High',   true),
  (ph_flooring, tmpl_id, 'Flooring QC review',                            'Quality Control',       4, 'High',   true),

  -- Doors, Trim & Millwork
  (ph_trim, tmpl_id, 'Confirm door and hardware selections',              'Client Communication', 0, 'High',   true),
  (ph_trim, tmpl_id, 'Install interior doors',                             'Trade Work',            1, 'High',   true),
  (ph_trim, tmpl_id, 'Install baseboards and casing',                      'Trade Work',            2, 'High',   true),
  (ph_trim, tmpl_id, 'Install any built-in millwork',                      'Trade Work',            3, 'Medium', false),
  (ph_trim, tmpl_id, 'Trim and millwork QC review',                        'Quality Control',       4, 'High',   true),

  -- Fixtures & Final Trade Completion
  (ph_fixtures, tmpl_id, 'Install light fixtures',                        'Trade Work',            0, 'High',   true),
  (ph_fixtures, tmpl_id, 'Install plumbing fixtures (if applicable)',      'Trade Work',            1, 'Medium', false),
  (ph_fixtures, tmpl_id, 'Complete outstanding electrical trim',           'Trade Work',            2, 'High',   true),
  (ph_fixtures, tmpl_id, 'Confirm all trades have completed their scope',  'Administrative',        3, 'High',   true),

  -- Deficiencies, Final QC & Handover
  (ph_handover, tmpl_id, 'Complete internal final inspection',            'Inspection',            0, 'High',   true),
  (ph_handover, tmpl_id, 'Create deficiency list',                        'Administrative',         1, 'High',   true),
  (ph_handover, tmpl_id, 'Complete deficiencies',                         'Corrective Work',        2, 'High',   true),
  (ph_handover, tmpl_id, 'Final cleaning',                                'Site Work',              3, 'Medium', true),
  (ph_handover, tmpl_id, 'Client walkthrough',                            'Client Communication',   4, 'High',   true),
  (ph_handover, tmpl_id, 'Record client handover',                        'Handover',               5, 'High',   true);

END;
$$;
