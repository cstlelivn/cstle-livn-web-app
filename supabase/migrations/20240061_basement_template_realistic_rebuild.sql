-- Rebuilds the "Basement Finishing & Development" project template with a
-- realistic, lean task list, per explicit user direction after reviewing a
-- real converted basement project:
--   - The original template had TWO duplicate "Basement Finishing &
--     Development" rows (one seeded by 20240003, a second by 20240006's
--     "original templates" pass) -- both active, both selectable, both
--     bloated. Both are archived here (active = false, NOT deleted --
--     project_phases.phase_template_id and tasks.task_template_id are
--     ON DELETE SET NULL, so this is safe either way, but archiving
--     preserves them for any historical project still linked to one).
--   - A brand new canonical template replaces them: 14 phases (down from
--     15 -- Permits merged into Setup, since permit review/selections can
--     run in the same ~2-week window rather than as a separate later
--     gate), with every phase's `default_duration_days` set to the exact
--     sum of its own tasks' `default_duration_days`. This is the real fix
--     for "tasks scheduled out to April on a Sept-Dec project": the old
--     template left every task_templates.default_duration_days at its
--     column default (1 day), so a phase with e.g. 15 one-day tasks took
--     15 workdays to actually schedule even though the phase itself
--     claimed 7 -- applyTemplateToProject() (src/app/src/features/
--     projectTemplates/api.ts) always takes the LONGER of a phase's
--     declared duration or its tasks' real total, so that mismatch
--     silently pushed every later phase's start out, compounding across
--     15 phases into months of drift. Keeping the two numbers equal here
--     eliminates the drift at the source, for this template.
--   - Total: 63 workdays (~2.4 months at a 6-day work week) -- Drywall is
--     deliberately the longest single phase (10 workdays / ~2 weeks, per
--     the user: "drywall, mud, taping, sanding usually takes about two
--     weeks"), Flooring is 3 workdays ("done in two to three days"), and
--     every other phase is intentionally short. This leaves real buffer
--     under the user's stated 3-4 month ceiling for weather/inspection/
--     material delays, rather than scheduling right up against it.
--   - Standalone "Photograph existing conditions" / "Photograph concealed
--     work" tasks are removed everywhere -- every task already requires
--     its own before/after evidence photo (see "Onsite photo evidence
--     workflow", CLAUDE.md), so a dedicated documentation task was pure
--     duplication and unnecessary R2 photo storage, per explicit user
--     direction ("each task has a photo... don't want to fill up our
--     database with unnecessary photos").
--   - Previously-empty phases (Plumbing/HVAC/Electrical Rough-In,
--     Insulation, Priming & Painting, Flooring, Doors/Trim/Millwork,
--     Fixtures & Final Trade Completion all had ZERO seeded tasks in the
--     old template, silently relying on whoever ran the project to add
--     tasks by hand) now have a minimal install + QC-review task pair
--     each, so the template is actually usable end-to-end without manual
--     backfill.
--   - Administrative/gate tasks that don't need their own tracked row are
--     combined into the task they naturally belong to (e.g. "Confirm
--     enclosure work is approved" + "Procure drywall and finishing
--     materials" -> one task), per explicit user direction ("anything
--     that can be combined should be combined").

DO $$
DECLARE
  v_new_template uuid;
  ph_setup      uuid; ph_demo       uuid; ph_framing    uuid;
  ph_plumbing   uuid; ph_hvac       uuid; ph_electrical uuid;
  ph_rough_insp uuid; ph_insulation uuid; ph_drywall    uuid;
  ph_painting   uuid; ph_flooring   uuid; ph_doors      uuid;
  ph_fixtures   uuid; ph_handover   uuid;
BEGIN

ALTER TABLE public.project_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates DISABLE ROW LEVEL SECURITY;

-- 1) Archive every existing "Basement" template (the two known duplicates,
--    and any other Basement-type row that may exist) -- never delete, per
--    this codebase's own archiveProjectTemplate() convention.
UPDATE public.project_templates SET active = false, updated_at = now()
WHERE project_type = 'Basement';

-- 2) Insert the new canonical template.
INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
VALUES (gen_random_uuid(), 'Basement Finishing & Development',
  'Full basement finishing including framing, rough-in trades, drywall, and finishes. Rebuilt for a realistic ~2.5 month schedule (3-4 month ceiling with buffer).',
  'Basement', '2.0', true, 63)
RETURNING id INTO v_new_template;

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
VALUES
  (gen_random_uuid(), v_new_template, 'Project Setup, Permits & Selections',    0,  10, true),
  (gen_random_uuid(), v_new_template, 'Site Protection & Demolition',           1,  5,  true),
  (gen_random_uuid(), v_new_template, 'Layout & Framing',                       2,  6,  true),
  (gen_random_uuid(), v_new_template, 'Plumbing Rough-In',                      3,  2,  false),
  (gen_random_uuid(), v_new_template, 'HVAC Rough-In',                         4,  2,  false),
  (gen_random_uuid(), v_new_template, 'Electrical Rough-In',                    5,  2,  true),
  (gen_random_uuid(), v_new_template, 'Rough-In Inspections',                   6,  5,  true),
  (gen_random_uuid(), v_new_template, 'Insulation, Air/Vapour & Fire/Acoustic', 7,  3,  true),
  (gen_random_uuid(), v_new_template, 'Drywall',                                8,  10, true),
  (gen_random_uuid(), v_new_template, 'Priming & Painting',                     9,  3,  true),
  (gen_random_uuid(), v_new_template, 'Flooring',                               10, 3,  true),
  (gen_random_uuid(), v_new_template, 'Doors, Trim & Millwork',                 11, 3,  true),
  (gen_random_uuid(), v_new_template, 'Fixtures & Final Trade Completion',      12, 3,  true),
  (gen_random_uuid(), v_new_template, 'Deficiencies, Final QC & Handover',      13, 6,  true);

SELECT id INTO ph_setup      FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 0;
SELECT id INTO ph_demo       FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 1;
SELECT id INTO ph_framing    FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 2;
SELECT id INTO ph_plumbing   FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 3;
SELECT id INTO ph_hvac       FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 4;
SELECT id INTO ph_electrical FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 5;
SELECT id INTO ph_rough_insp FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 6;
SELECT id INTO ph_insulation FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 7;
SELECT id INTO ph_drywall    FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 8;
SELECT id INTO ph_painting   FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 9;
SELECT id INTO ph_flooring   FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 10;
SELECT id INTO ph_doors      FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 11;
SELECT id INTO ph_fixtures   FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 12;
SELECT id INTO ph_handover   FROM public.phase_templates WHERE project_template_id = v_new_template AND position = 13;

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required, default_duration_days)
VALUES
  -- Project Setup, Permits & Selections (10 workdays -- ends when the permit
  -- comes back; by this point payment/estimate approval already happened,
  -- so no separate "signed contract" or "client selections" gate is needed)
  (ph_setup, v_new_template, 'Confirm approved project scope',                   'Administrative', 0, 'High', true, 1),
  (ph_setup, v_new_template, 'Confirm project schedule and timeline',            'Planning',       1, 'High', true, 1),
  (ph_setup, v_new_template, 'Assign and notify subcontractors/crew',            'Administrative', 2, 'High', true, 1),
  (ph_setup, v_new_template, 'Confirm site access (keypad code) and working hours', 'Administrative', 3, 'Medium', true, 1),
  (ph_setup, v_new_template, 'Submit permit application',                        'Administrative', 4, 'High', true, 1),
  (ph_setup, v_new_template, 'Track permit review and record approval',          'Administrative', 5, 'High', true, 3),
  (ph_setup, v_new_template, 'Confirm selections and order long-lead materials', 'Procurement',    6, 'High', true, 2),

  -- Site Protection & Demolition (5 workdays)
  (ph_demo, v_new_template, 'Complete pre-work safety review and hazardous-material clearance', 'Administrative', 0, 'High', true, 1),
  (ph_demo, v_new_template, 'Isolate work area, protect access routes and dust control',         'Site Work',      1, 'High', true, 1),
  (ph_demo, v_new_template, 'Complete approved demolition and remove debris',                    'Site Work',      2, 'High', true, 1),
  (ph_demo, v_new_template, 'Inspect exposed conditions and record any issues',                  'Quality Control',3, 'High', true, 1),
  (ph_demo, v_new_template, 'Phase QC review',                                                   'Quality Control',4, 'High', true, 1),

  -- Layout & Framing (6 workdays)
  (ph_framing, v_new_template, 'Verify layout against approved plan and mark walls',        'Planning',        0, 'High', true, 1),
  (ph_framing, v_new_template, 'Verify door openings and mechanical clearances',            'Planning',        1, 'High', true, 1),
  (ph_framing, v_new_template, 'Install framing, backing, soffits and bulkheads',           'Trade Work',      2, 'High', true, 2),
  (ph_framing, v_new_template, 'Verify dimensions',                                         'Quality Control', 3, 'High', true, 1),
  (ph_framing, v_new_template, 'Framing QC review',                                         'Quality Control', 4, 'High', true, 1),

  -- Plumbing / HVAC / Electrical Rough-In (2 workdays each -- the old
  -- template had these three phases completely empty)
  (ph_plumbing, v_new_template, 'Install plumbing rough-in per plan', 'Trade Work',      0, 'High', true, 1),
  (ph_plumbing, v_new_template, 'Plumbing rough-in QC review',        'Quality Control', 1, 'High', true, 1),
  (ph_hvac, v_new_template, 'Install HVAC ductwork and rough-in per plan', 'Trade Work',      0, 'High', true, 1),
  (ph_hvac, v_new_template, 'HVAC rough-in QC review',                    'Quality Control', 1, 'High', true, 1),
  (ph_electrical, v_new_template, 'Install electrical rough-in per plan', 'Trade Work',      0, 'High', true, 1),
  (ph_electrical, v_new_template, 'Electrical rough-in QC review',        'Quality Control', 1, 'High', true, 1),

  -- Rough-In Inspections (5 workdays)
  (ph_rough_insp, v_new_template, 'Confirm site ready and book required inspections', 'Administrative', 0, 'High', true, 1),
  (ph_rough_insp, v_new_template, 'Complete required inspections',                    'Inspection',      1, 'High', true, 2),
  (ph_rough_insp, v_new_template, 'Record inspection results and create deficiency tasks if needed', 'Administrative', 2, 'High', true, 1),
  (ph_rough_insp, v_new_template, 'Rough-in milestone QC approval',                   'Quality Control', 3, 'High', true, 1),

  -- Insulation, Air/Vapour & Fire/Acoustic (3 workdays -- was empty)
  (ph_insulation, v_new_template, 'Install insulation and vapour/air barrier', 'Trade Work',      0, 'High', true, 2),
  (ph_insulation, v_new_template, 'Insulation and vapour barrier QC review',   'Quality Control', 1, 'High', true, 1),

  -- Drywall (10 workdays -- the longest phase, by design: taping/mudding
  -- needs real coat-drying time between passes)
  (ph_drywall, v_new_template, 'Confirm enclosure work is approved and procure materials', 'Administrative', 0, 'High', true, 1),
  (ph_drywall, v_new_template, 'Install drywall',                                          'Trade Work',      1, 'High', true, 2),
  (ph_drywall, v_new_template, 'Complete taping and required coats',                       'Trade Work',      2, 'High', true, 4),
  (ph_drywall, v_new_template, 'Sand, inspect and correct defects',                        'Quality Control', 3, 'High', true, 2),
  (ph_drywall, v_new_template, 'Complete drywall QC',                                      'Quality Control', 4, 'High', true, 1),

  -- Priming & Painting (3 workdays -- was empty)
  (ph_painting, v_new_template, 'Prime and paint all surfaces', 'Trade Work',      0, 'High', true, 2),
  (ph_painting, v_new_template, 'Painting QC review',           'Quality Control', 1, 'High', true, 1),

  -- Flooring (3 workdays -- "done in two to three days", was empty)
  (ph_flooring, v_new_template, 'Install flooring',       'Trade Work',      0, 'High', true, 2),
  (ph_flooring, v_new_template, 'Flooring QC review',     'Quality Control', 1, 'High', true, 1),

  -- Doors, Trim & Millwork (3 workdays -- was empty)
  (ph_doors, v_new_template, 'Install doors, trim and millwork', 'Trade Work',      0, 'High', true, 2),
  (ph_doors, v_new_template, 'Doors and trim QC review',         'Quality Control', 1, 'High', true, 1),

  -- Fixtures & Final Trade Completion (3 workdays -- was empty)
  (ph_fixtures, v_new_template, 'Install fixtures and complete final trade work', 'Trade Work',      0, 'High', true, 2),
  (ph_fixtures, v_new_template, 'Fixtures QC review',                             'Quality Control', 1, 'High', true, 1),

  -- Deficiencies, Final QC & Handover (6 workdays)
  (ph_handover, v_new_template, 'Complete internal final inspection and create deficiency list', 'Inspection',          0, 'High', true, 1),
  (ph_handover, v_new_template, 'Assign and complete deficiencies',                              'Corrective Work',     1, 'High', true, 2),
  (ph_handover, v_new_template, 'Complete final cleaning',                                        'Site Work',           2, 'Medium', true, 1),
  (ph_handover, v_new_template, 'Complete client walkthrough and obtain QC approval',             'Client Communication',3, 'High', true, 1),
  (ph_handover, v_new_template, 'Record client handover and mark project completed',              'Handover',            4, 'High', true, 1);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

END $$;
