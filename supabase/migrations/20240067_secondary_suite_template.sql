-- New "Secondary Suite Development" project template -- distinct from both
-- "Basement Finishing & Development" (20240061) and the narrow "Basement
-- Finishing" template (20240005/20240007). Per the user: a secondary suite
-- specifically adds the mechanical/electrical work that makes the basement
-- a self-sustaining dwelling unit, which means a real design/permit package
-- (new drawing, ventilation design form, electrical upgrade scope, signed
-- homeowner letter, BCA form) BEFORE framing -- basement finishing/
-- development don't need that.
--
-- 13 phases, dictated end-to-end by the user and confirmed with no
-- corrections: Design & Permit Package -> Submit & Receive Permit ->
-- Site Clear & Framing -> Mechanical Rough-In -> Backing & Blocking ->
-- Electrical Rough-In -> Framing Inspection -> Insulation & Drywall ->
-- Finishing Phase 1 (doors/paint 1st coat/flooring/baseboards) ->
-- Finishing Phase 2 (kitchen/vanity/toilet/fixtures) -> Second Coat ->
-- Electrical Final Trim -> Final Clean & Walkthrough.
--
-- Same governing rules as the basement template rebuild (20240061):
-- every phase's default_duration_days is the EXACT sum of its own tasks'
-- default_duration_days (closes the scheduler drift bug at the source --
-- see 20240061's comment for the full mechanism); no standalone
-- "photograph/document conditions" tasks (every task already requires its
-- own before/after evidence photo); administrative gates combined
-- wherever they don't need their own tracked row.
--
-- Total: 54 workdays (~9 weeks at a 6-day work week) -- inside the user's
-- stated 6-8 week target band, comfortably under their 12-week ceiling.

DO $$
DECLARE
  v_template uuid;
  ph_design     uuid; ph_permit     uuid; ph_framing    uuid;
  ph_mech       uuid; ph_backing    uuid; ph_electrical uuid;
  ph_inspection uuid; ph_insulation uuid; ph_finish1    uuid;
  ph_finish2    uuid; ph_coat2      uuid; ph_elec_final uuid;
  ph_handover   uuid;
BEGIN

ALTER TABLE public.project_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates DISABLE ROW LEVEL SECURITY;

INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
VALUES (gen_random_uuid(), 'Secondary Suite Development',
  'Basement conversion into a self-sustaining secondary dwelling unit, including the mechanical/electrical design and permit package a basement finish/development project does not need. Target 6-8 weeks, 12-week ceiling.',
  'Secondary Suite', '1.0', true, 54)
RETURNING id INTO v_template;

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
VALUES
  (gen_random_uuid(), v_template, 'Design & Permit Package',                0,  8, true),
  (gen_random_uuid(), v_template, 'Submit & Receive Permit',                1,  5, true),
  (gen_random_uuid(), v_template, 'Site Clear & Framing',                   2,  5, true),
  (gen_random_uuid(), v_template, 'Mechanical Rough-In',                    3,  2, true),
  (gen_random_uuid(), v_template, 'Backing & Blocking',                     4,  2, true),
  (gen_random_uuid(), v_template, 'Electrical Rough-In',                    5,  2, true),
  (gen_random_uuid(), v_template, 'Framing Inspection',                     6,  4, true),
  (gen_random_uuid(), v_template, 'Insulation & Drywall',                   7,  8, true),
  (gen_random_uuid(), v_template, 'Finishing -- Doors, Paint & Flooring',   8,  6, true),
  (gen_random_uuid(), v_template, 'Finishing -- Kitchen, Vanity & Fixtures',9,  3, true),
  (gen_random_uuid(), v_template, 'Second Coat',                            10, 2, true),
  (gen_random_uuid(), v_template, 'Electrical Final Trim',                  11, 2, true),
  (gen_random_uuid(), v_template, 'Final Clean & Walkthrough',              12, 5, true);

SELECT id INTO ph_design     FROM public.phase_templates WHERE project_template_id = v_template AND position = 0;
SELECT id INTO ph_permit     FROM public.phase_templates WHERE project_template_id = v_template AND position = 1;
SELECT id INTO ph_framing    FROM public.phase_templates WHERE project_template_id = v_template AND position = 2;
SELECT id INTO ph_mech       FROM public.phase_templates WHERE project_template_id = v_template AND position = 3;
SELECT id INTO ph_backing    FROM public.phase_templates WHERE project_template_id = v_template AND position = 4;
SELECT id INTO ph_electrical FROM public.phase_templates WHERE project_template_id = v_template AND position = 5;
SELECT id INTO ph_inspection FROM public.phase_templates WHERE project_template_id = v_template AND position = 6;
SELECT id INTO ph_insulation FROM public.phase_templates WHERE project_template_id = v_template AND position = 7;
SELECT id INTO ph_finish1    FROM public.phase_templates WHERE project_template_id = v_template AND position = 8;
SELECT id INTO ph_finish2    FROM public.phase_templates WHERE project_template_id = v_template AND position = 9;
SELECT id INTO ph_coat2      FROM public.phase_templates WHERE project_template_id = v_template AND position = 10;
SELECT id INTO ph_elec_final FROM public.phase_templates WHERE project_template_id = v_template AND position = 11;
SELECT id INTO ph_handover   FROM public.phase_templates WHERE project_template_id = v_template AND position = 12;

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required, default_duration_days)
VALUES
  -- Design & Permit Package (8 workdays)
  (ph_design, v_template, 'Prepare updated design drawing for the secondary suite',        'Planning',       0, 'High', true, 3),
  (ph_design, v_template, 'Obtain mechanical ventilation design form',                      'Administrative', 1, 'High', true, 2),
  (ph_design, v_template, 'Obtain electrical upgrade scope and design',                     'Administrative', 2, 'High', true, 2),
  (ph_design, v_template, 'Obtain signed homeowner letter and completed BCA form',          'Administrative', 3, 'High', true, 1),

  -- Submit & Receive Permit (5 workdays)
  (ph_permit, v_template, 'Compile permit package and submit application', 'Administrative', 0, 'High', true, 1),
  (ph_permit, v_template, 'Track permit review and record approval',       'Administrative', 1, 'High', true, 4),

  -- Site Clear & Framing (5 workdays)
  (ph_framing, v_template, 'Clear site of anything not needed for the suite',        'Site Work',       0, 'High', true, 1),
  (ph_framing, v_template, 'Verify layout against approved plan and mark walls',     'Planning',        1, 'High', true, 1),
  (ph_framing, v_template, 'Install framing',                                       'Trade Work',      2, 'High', true, 2),
  (ph_framing, v_template, 'Framing QC review',                                     'Quality Control', 3, 'High', true, 1),

  -- Mechanical Rough-In (2 workdays)
  (ph_mech, v_template, 'Install mechanical (plumbing/HVAC) rough-in per plan', 'Trade Work',      0, 'High', true, 1),
  (ph_mech, v_template, 'Mechanical rough-in QC review',                       'Quality Control', 1, 'High', true, 1),

  -- Backing & Blocking (2 workdays)
  (ph_backing, v_template, 'Install backing and blocking for fixtures', 'Trade Work',      0, 'High', true, 1),
  (ph_backing, v_template, 'Backing and blocking QC review',            'Quality Control', 1, 'High', true, 1),

  -- Electrical Rough-In (2 workdays)
  (ph_electrical, v_template, 'Install electrical rough-in per plan', 'Trade Work',      0, 'High', true, 1),
  (ph_electrical, v_template, 'Electrical rough-in QC review',        'Quality Control', 1, 'High', true, 1),

  -- Framing Inspection (4 workdays -- mechanical/electrical book their own
  -- inspections separately, noted here rather than tracked as their own tasks)
  (ph_inspection, v_template, 'Confirm site ready and book framing inspection (mechanical/electrical book their own separately)', 'Administrative', 0, 'High', true, 1),
  (ph_inspection, v_template, 'Complete framing inspection',                                                                     'Inspection',      1, 'High', true, 2),
  (ph_inspection, v_template, 'Record inspection results and create deficiency tasks if needed',                                 'Administrative',  2, 'High', true, 1),

  -- Insulation & Drywall (8 workdays)
  (ph_insulation, v_template, 'Install insulation and vapour/air barrier',      'Trade Work',      0, 'High', true, 2),
  (ph_insulation, v_template, 'Install drywall',                                'Trade Work',      1, 'High', true, 1),
  (ph_insulation, v_template, 'Complete taping and required coats',             'Trade Work',      2, 'High', true, 3),
  (ph_insulation, v_template, 'Sand, inspect and correct defects',              'Quality Control', 3, 'High', true, 1),
  (ph_insulation, v_template, 'Complete drywall QC',                           'Quality Control', 4, 'High', true, 1),

  -- Finishing -- Doors, Paint & Flooring (6 workdays)
  (ph_finish1, v_template, 'Install and spray doors',       'Trade Work', 0, 'High', true, 2),
  (ph_finish1, v_template, 'Paint walls (first coat)',       'Trade Work', 1, 'High', true, 1),
  (ph_finish1, v_template, 'Install flooring',               'Trade Work', 2, 'High', true, 2),
  (ph_finish1, v_template, 'Install baseboards',             'Trade Work', 3, 'High', true, 1),

  -- Finishing -- Kitchen, Vanity & Fixtures (3 workdays)
  (ph_finish2, v_template, 'Install kitchen, vanity, toilet and finishing fixtures', 'Trade Work',      0, 'High', true, 2),
  (ph_finish2, v_template, 'Fixtures QC review',                                    'Quality Control', 1, 'High', true, 1),

  -- Second Coat (2 workdays)
  (ph_coat2, v_template, 'Apply second coat of paint', 'Trade Work',      0, 'High', true, 1),
  (ph_coat2, v_template, 'Painting QC review',         'Quality Control', 1, 'High', true, 1),

  -- Electrical Final Trim (2 workdays)
  (ph_elec_final, v_template, 'Install final electrical trims (receptacle/switch covers, fixtures)', 'Trade Work',      0, 'High', true, 1),
  (ph_elec_final, v_template, 'Electrical final QC review',                                            'Quality Control', 1, 'High', true, 1),

  -- Final Clean & Walkthrough (5 workdays)
  (ph_handover, v_template, 'Complete internal final inspection and create deficiency list', 'Inspection',           0, 'High', true, 1),
  (ph_handover, v_template, 'Assign and complete deficiencies',                              'Corrective Work',      1, 'High', true, 1),
  (ph_handover, v_template, 'Complete final cleaning',                                        'Site Work',            2, 'Medium', true, 1),
  (ph_handover, v_template, 'Complete client walkthrough and obtain QC approval',             'Client Communication', 3, 'High', true, 1),
  (ph_handover, v_template, 'Record client handover and mark project completed',              'Handover',             4, 'High', true, 1);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

END $$;
