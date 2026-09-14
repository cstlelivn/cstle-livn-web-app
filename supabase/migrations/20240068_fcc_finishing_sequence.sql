-- Rebuilds the post-drywall "finishing" phases of both "Basement Finishing &
-- Development" (20240061) and "Secondary Suite Development" (20240067) to
-- follow the old "FCC Projects" phase sequence, per explicit user direction:
-- the user referenced "the FCC template I had before" -- a legacy, KV-backed
-- phase template (`fcc-projects`, seeded in
-- supabase/functions/make-server-bcab437c/index.ts's
-- initializeDefaultPhaseTemplates()) that predates the relational
-- project_templates system and was removed from the Settings UI on
-- September 8, 2026 (see "Settings uses the canonical project/phase template
-- editor" in CLAUDE.md) -- which is why the user could no longer find it in
-- the template list. Its actual phase sequence (name/days only, no tasks --
-- it's a lightweight legacy format) is:
--   Planning(3) -> Wall Priming(2) -> Doors & Trim(5) -> Spraying(3) ->
--   Wall Painting 1st coat(2) -> Flooring(4) -> Baseboard & Railing
--   Install(3) -> Wall Painting 2nd coat(2) -> Finishing & Installs(3) ->
--   Final Inspection(1) -> Delivered/Completed(1)
--
-- This migration replaces every phase AFTER Drywall/Insulation & Drywall in
-- both templates with that exact sequence (minus "Planning", which both
-- templates already have via their own Setup/Design phase), giving each new
-- phase a real task list built to the same standard as the rest of these
-- templates (install + QC-review pairs, no standalone photo/documentation
-- tasks -- every task already requires its own before/after evidence photo).
-- "Final Inspection" + "Delivered/Completed" are folded into the existing,
-- already-fleshed-out "Deficiencies, Final QC & Handover" phase rather than
-- kept as two bare 1-day phases, since that phase already covers the real
-- QC/deficiency/cleaning/walkthrough/handover work FCC's lightweight version
-- didn't track at the task level.
--
-- Per the user, Secondary Suite's remaining finishing phases should follow
-- this same updated Basement Finishing sequence -- its two secondary-suite-
-- specific phases (Kitchen/Vanity/Fixtures, Electrical Final Trim -- the
-- mechanical/electrical work that makes a suite self-sustaining, which a
-- plain basement finish doesn't need) are kept, slotted into the same
-- position they held before.
--
-- Both existing templates are archived (never deleted -- project_phases.
-- phase_template_id / tasks.task_template_id are ON DELETE SET NULL, and
-- this matches the archiveProjectTemplate() convention already used by
-- 20240061), then replaced by new versions. Insurance Rebuild (still the
-- old bloated 20240006 seed) is explicitly OUT OF SCOPE for this migration
-- -- the user said it's "next" after this, not part of this change.

DO $$
DECLARE
  v_basement uuid;
  bph_setup      uuid; bph_demo       uuid; bph_framing    uuid;
  bph_plumbing   uuid; bph_hvac       uuid; bph_electrical uuid;
  bph_rough_insp uuid; bph_insulation uuid; bph_drywall    uuid;
  bph_priming    uuid; bph_doors      uuid; bph_spraying   uuid;
  bph_paint1     uuid; bph_flooring   uuid; bph_baseboard  uuid;
  bph_paint2     uuid; bph_finishing  uuid; bph_handover   uuid;

  v_suite uuid;
  sph_design     uuid; sph_permit     uuid; sph_framing    uuid;
  sph_mech       uuid; sph_backing    uuid; sph_electrical uuid;
  sph_inspection uuid; sph_insulation uuid; sph_priming    uuid;
  sph_doors      uuid; sph_spraying   uuid; sph_paint1     uuid;
  sph_flooring   uuid; sph_baseboard  uuid; sph_paint2     uuid;
  sph_kitchen    uuid; sph_elec_final uuid; sph_handover   uuid;
BEGIN

ALTER TABLE public.project_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Basement Finishing & Development v3.0
-- ============================================================

UPDATE public.project_templates SET active = false, updated_at = now()
WHERE project_type = 'Basement';

INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
VALUES (gen_random_uuid(), 'Basement Finishing & Development',
  'Full basement finishing including framing, rough-in trades, drywall, and finishes. Finishing phases (Wall Priming through Handover) follow the FCC Projects sequence. ~2.9 month schedule (3-4 month ceiling with buffer).',
  'Basement', '3.0', true, 75)
RETURNING id INTO v_basement;

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
VALUES
  (gen_random_uuid(), v_basement, 'Project Setup, Permits & Selections',    0,  10, true),
  (gen_random_uuid(), v_basement, 'Site Protection & Demolition',           1,  5,  true),
  (gen_random_uuid(), v_basement, 'Layout & Framing',                       2,  6,  true),
  (gen_random_uuid(), v_basement, 'Plumbing Rough-In',                      3,  2,  false),
  (gen_random_uuid(), v_basement, 'HVAC Rough-In',                         4,  2,  false),
  (gen_random_uuid(), v_basement, 'Electrical Rough-In',                    5,  2,  true),
  (gen_random_uuid(), v_basement, 'Rough-In Inspections',                   6,  5,  true),
  (gen_random_uuid(), v_basement, 'Insulation, Air/Vapour & Fire/Acoustic', 7,  3,  true),
  (gen_random_uuid(), v_basement, 'Drywall',                                8,  10, true),
  (gen_random_uuid(), v_basement, 'Wall Priming',                           9,  2,  true),
  (gen_random_uuid(), v_basement, 'Doors & Trim',                           10, 5,  true),
  (gen_random_uuid(), v_basement, 'Spraying',                               11, 3,  true),
  (gen_random_uuid(), v_basement, 'Wall Painting -- First Coat',            12, 2,  true),
  (gen_random_uuid(), v_basement, 'Flooring',                               13, 4,  true),
  (gen_random_uuid(), v_basement, 'Baseboard & Railing Install',            14, 3,  true),
  (gen_random_uuid(), v_basement, 'Wall Painting -- Second Coat',           15, 2,  true),
  (gen_random_uuid(), v_basement, 'Finishing & Installs',                   16, 3,  true),
  (gen_random_uuid(), v_basement, 'Deficiencies, Final QC & Handover',      17, 6,  true);

SELECT id INTO bph_setup      FROM public.phase_templates WHERE project_template_id = v_basement AND position = 0;
SELECT id INTO bph_demo       FROM public.phase_templates WHERE project_template_id = v_basement AND position = 1;
SELECT id INTO bph_framing    FROM public.phase_templates WHERE project_template_id = v_basement AND position = 2;
SELECT id INTO bph_plumbing   FROM public.phase_templates WHERE project_template_id = v_basement AND position = 3;
SELECT id INTO bph_hvac       FROM public.phase_templates WHERE project_template_id = v_basement AND position = 4;
SELECT id INTO bph_electrical FROM public.phase_templates WHERE project_template_id = v_basement AND position = 5;
SELECT id INTO bph_rough_insp FROM public.phase_templates WHERE project_template_id = v_basement AND position = 6;
SELECT id INTO bph_insulation FROM public.phase_templates WHERE project_template_id = v_basement AND position = 7;
SELECT id INTO bph_drywall    FROM public.phase_templates WHERE project_template_id = v_basement AND position = 8;
SELECT id INTO bph_priming    FROM public.phase_templates WHERE project_template_id = v_basement AND position = 9;
SELECT id INTO bph_doors      FROM public.phase_templates WHERE project_template_id = v_basement AND position = 10;
SELECT id INTO bph_spraying   FROM public.phase_templates WHERE project_template_id = v_basement AND position = 11;
SELECT id INTO bph_paint1     FROM public.phase_templates WHERE project_template_id = v_basement AND position = 12;
SELECT id INTO bph_flooring   FROM public.phase_templates WHERE project_template_id = v_basement AND position = 13;
SELECT id INTO bph_baseboard  FROM public.phase_templates WHERE project_template_id = v_basement AND position = 14;
SELECT id INTO bph_paint2     FROM public.phase_templates WHERE project_template_id = v_basement AND position = 15;
SELECT id INTO bph_finishing  FROM public.phase_templates WHERE project_template_id = v_basement AND position = 16;
SELECT id INTO bph_handover   FROM public.phase_templates WHERE project_template_id = v_basement AND position = 17;

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required, default_duration_days)
VALUES
  -- Project Setup, Permits & Selections (10 workdays -- unchanged from v2.0)
  (bph_setup, v_basement, 'Confirm approved project scope',                   'Administrative', 0, 'High', true, 1),
  (bph_setup, v_basement, 'Confirm project schedule and timeline',            'Planning',       1, 'High', true, 1),
  (bph_setup, v_basement, 'Assign and notify subcontractors/crew',            'Administrative', 2, 'High', true, 1),
  (bph_setup, v_basement, 'Confirm site access (keypad code) and working hours', 'Administrative', 3, 'Medium', true, 1),
  (bph_setup, v_basement, 'Submit permit application',                        'Administrative', 4, 'High', true, 1),
  (bph_setup, v_basement, 'Track permit review and record approval',          'Administrative', 5, 'High', true, 3),
  (bph_setup, v_basement, 'Confirm selections and order long-lead materials', 'Procurement',    6, 'High', true, 2),

  -- Site Protection & Demolition (5 workdays -- unchanged)
  (bph_demo, v_basement, 'Complete pre-work safety review and hazardous-material clearance', 'Administrative', 0, 'High', true, 1),
  (bph_demo, v_basement, 'Isolate work area, protect access routes and dust control',         'Site Work',      1, 'High', true, 1),
  (bph_demo, v_basement, 'Complete approved demolition and remove debris',                    'Site Work',      2, 'High', true, 1),
  (bph_demo, v_basement, 'Inspect exposed conditions and record any issues',                  'Quality Control',3, 'High', true, 1),
  (bph_demo, v_basement, 'Phase QC review',                                                   'Quality Control',4, 'High', true, 1),

  -- Layout & Framing (6 workdays -- unchanged)
  (bph_framing, v_basement, 'Verify layout against approved plan and mark walls',        'Planning',        0, 'High', true, 1),
  (bph_framing, v_basement, 'Verify door openings and mechanical clearances',            'Planning',        1, 'High', true, 1),
  (bph_framing, v_basement, 'Install framing, backing, soffits and bulkheads',           'Trade Work',      2, 'High', true, 2),
  (bph_framing, v_basement, 'Verify dimensions',                                         'Quality Control', 3, 'High', true, 1),
  (bph_framing, v_basement, 'Framing QC review',                                         'Quality Control', 4, 'High', true, 1),

  -- Plumbing / HVAC / Electrical Rough-In (2 workdays each -- unchanged)
  (bph_plumbing, v_basement, 'Install plumbing rough-in per plan', 'Trade Work',      0, 'High', true, 1),
  (bph_plumbing, v_basement, 'Plumbing rough-in QC review',        'Quality Control', 1, 'High', true, 1),
  (bph_hvac, v_basement, 'Install HVAC ductwork and rough-in per plan', 'Trade Work',      0, 'High', true, 1),
  (bph_hvac, v_basement, 'HVAC rough-in QC review',                    'Quality Control', 1, 'High', true, 1),
  (bph_electrical, v_basement, 'Install electrical rough-in per plan', 'Trade Work',      0, 'High', true, 1),
  (bph_electrical, v_basement, 'Electrical rough-in QC review',        'Quality Control', 1, 'High', true, 1),

  -- Rough-In Inspections (5 workdays -- unchanged)
  (bph_rough_insp, v_basement, 'Confirm site ready and book required inspections', 'Administrative', 0, 'High', true, 1),
  (bph_rough_insp, v_basement, 'Complete required inspections',                    'Inspection',      1, 'High', true, 2),
  (bph_rough_insp, v_basement, 'Record inspection results and create deficiency tasks if needed', 'Administrative', 2, 'High', true, 1),
  (bph_rough_insp, v_basement, 'Rough-in milestone QC approval',                   'Quality Control', 3, 'High', true, 1),

  -- Insulation, Air/Vapour & Fire/Acoustic (3 workdays -- unchanged)
  (bph_insulation, v_basement, 'Install insulation and vapour/air barrier', 'Trade Work',      0, 'High', true, 2),
  (bph_insulation, v_basement, 'Insulation and vapour barrier QC review',   'Quality Control', 1, 'High', true, 1),

  -- Drywall (10 workdays -- unchanged)
  (bph_drywall, v_basement, 'Confirm enclosure work is approved and procure materials', 'Administrative', 0, 'High', true, 1),
  (bph_drywall, v_basement, 'Install drywall',                                          'Trade Work',      1, 'High', true, 2),
  (bph_drywall, v_basement, 'Complete taping and required coats',                       'Trade Work',      2, 'High', true, 4),
  (bph_drywall, v_basement, 'Sand, inspect and correct defects',                        'Quality Control', 3, 'High', true, 2),
  (bph_drywall, v_basement, 'Complete drywall QC',                                      'Quality Control', 4, 'High', true, 1),

  -- Wall Priming (2 workdays -- FCC: "Wall Priming")
  (bph_priming, v_basement, 'Prime all drywall surfaces', 'Trade Work',      0, 'High', true, 1),
  (bph_priming, v_basement, 'Priming QC review',           'Quality Control', 1, 'High', true, 1),

  -- Doors & Trim (5 workdays -- FCC: "Doors & Trim")
  (bph_doors, v_basement, 'Install interior doors and hardware',    'Trade Work',      0, 'High', true, 2),
  (bph_doors, v_basement, 'Install door and window casing/trim',    'Trade Work',      1, 'High', true, 2),
  (bph_doors, v_basement, 'Doors and trim QC review',               'Quality Control', 2, 'High', true, 1),

  -- Spraying (3 workdays -- FCC: "Spraying")
  (bph_spraying, v_basement, 'Spray finish ceilings and trim', 'Trade Work',      0, 'High', true, 2),
  (bph_spraying, v_basement, 'Spray finish QC review',         'Quality Control', 1, 'High', true, 1),

  -- Wall Painting -- First Coat (2 workdays -- FCC: "Wall Painting 1st coat")
  (bph_paint1, v_basement, 'Apply first coat of wall paint', 'Trade Work',      0, 'High', true, 1),
  (bph_paint1, v_basement, 'First coat QC review',           'Quality Control', 1, 'High', true, 1),

  -- Flooring (4 workdays -- FCC: "Flooring")
  (bph_flooring, v_basement, 'Install flooring',   'Trade Work',      0, 'High', true, 3),
  (bph_flooring, v_basement, 'Flooring QC review', 'Quality Control', 1, 'High', true, 1),

  -- Baseboard & Railing Install (3 workdays -- FCC: "Baseboard & Railing Install")
  (bph_baseboard, v_basement, 'Install baseboards and stair railing',   'Trade Work',      0, 'High', true, 2),
  (bph_baseboard, v_basement, 'Baseboard and railing QC review',        'Quality Control', 1, 'High', true, 1),

  -- Wall Painting -- Second Coat (2 workdays -- FCC: "Wall Painting 2nd coat")
  (bph_paint2, v_basement, 'Apply second coat of wall paint and touch-ups', 'Trade Work',      0, 'High', true, 1),
  (bph_paint2, v_basement, 'Second coat QC review',                        'Quality Control', 1, 'High', true, 1),

  -- Finishing & Installs (3 workdays -- FCC: "Finishing & Installs")
  (bph_finishing, v_basement, 'Install fixtures and complete final trade work', 'Trade Work',      0, 'High', true, 2),
  (bph_finishing, v_basement, 'Fixtures and finishing QC review',                'Quality Control', 1, 'High', true, 1),

  -- Deficiencies, Final QC & Handover (6 workdays -- covers FCC's "Final
  -- Inspection" + "Delivered/Completed" with the existing, fully-tracked
  -- QC/deficiency/cleaning/walkthrough/handover task sequence)
  (bph_handover, v_basement, 'Complete internal final inspection and create deficiency list', 'Inspection',          0, 'High', true, 1),
  (bph_handover, v_basement, 'Assign and complete deficiencies',                              'Corrective Work',     1, 'High', true, 2),
  (bph_handover, v_basement, 'Complete final cleaning',                                        'Site Work',           2, 'Medium', true, 1),
  (bph_handover, v_basement, 'Complete client walkthrough and obtain QC approval',             'Client Communication',3, 'High', true, 1),
  (bph_handover, v_basement, 'Record client handover and mark project completed',              'Handover',            4, 'High', true, 1);

-- ============================================================
-- Secondary Suite Development v2.0
-- ============================================================

UPDATE public.project_templates SET active = false, updated_at = now()
WHERE project_type = 'Secondary Suite';

INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
VALUES (gen_random_uuid(), 'Secondary Suite Development',
  'Basement conversion into a self-sustaining secondary dwelling unit, including the mechanical/electrical design and permit package a basement finish/development project does not need. Finishing phases (Wall Priming through Handover) follow the same FCC Projects sequence as Basement Finishing & Development. ~11-12 week schedule, 12-week ceiling.',
  'Secondary Suite', '2.0', true, 68)
RETURNING id INTO v_suite;

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
VALUES
  (gen_random_uuid(), v_suite, 'Design & Permit Package',                0,  8, true),
  (gen_random_uuid(), v_suite, 'Submit & Receive Permit',                1,  5, true),
  (gen_random_uuid(), v_suite, 'Site Clear & Framing',                   2,  5, true),
  (gen_random_uuid(), v_suite, 'Mechanical Rough-In',                    3,  2, true),
  (gen_random_uuid(), v_suite, 'Backing & Blocking',                     4,  2, true),
  (gen_random_uuid(), v_suite, 'Electrical Rough-In',                    5,  2, true),
  (gen_random_uuid(), v_suite, 'Framing Inspection',                     6,  4, true),
  (gen_random_uuid(), v_suite, 'Insulation & Drywall',                   7,  8, true),
  (gen_random_uuid(), v_suite, 'Wall Priming',                           8,  2, true),
  (gen_random_uuid(), v_suite, 'Doors & Trim',                           9,  5, true),
  (gen_random_uuid(), v_suite, 'Spraying',                               10, 3, true),
  (gen_random_uuid(), v_suite, 'Wall Painting -- First Coat',            11, 2, true),
  (gen_random_uuid(), v_suite, 'Flooring',                               12, 4, true),
  (gen_random_uuid(), v_suite, 'Baseboard & Railing Install',            13, 3, true),
  (gen_random_uuid(), v_suite, 'Wall Painting -- Second Coat',           14, 2, true),
  (gen_random_uuid(), v_suite, 'Finishing -- Kitchen, Vanity & Fixtures',15, 3, true),
  (gen_random_uuid(), v_suite, 'Electrical Final Trim',                  16, 2, true),
  (gen_random_uuid(), v_suite, 'Deficiencies, Final QC & Handover',      17, 6, true);

SELECT id INTO sph_design     FROM public.phase_templates WHERE project_template_id = v_suite AND position = 0;
SELECT id INTO sph_permit     FROM public.phase_templates WHERE project_template_id = v_suite AND position = 1;
SELECT id INTO sph_framing    FROM public.phase_templates WHERE project_template_id = v_suite AND position = 2;
SELECT id INTO sph_mech       FROM public.phase_templates WHERE project_template_id = v_suite AND position = 3;
SELECT id INTO sph_backing    FROM public.phase_templates WHERE project_template_id = v_suite AND position = 4;
SELECT id INTO sph_electrical FROM public.phase_templates WHERE project_template_id = v_suite AND position = 5;
SELECT id INTO sph_inspection FROM public.phase_templates WHERE project_template_id = v_suite AND position = 6;
SELECT id INTO sph_insulation FROM public.phase_templates WHERE project_template_id = v_suite AND position = 7;
SELECT id INTO sph_priming    FROM public.phase_templates WHERE project_template_id = v_suite AND position = 8;
SELECT id INTO sph_doors      FROM public.phase_templates WHERE project_template_id = v_suite AND position = 9;
SELECT id INTO sph_spraying   FROM public.phase_templates WHERE project_template_id = v_suite AND position = 10;
SELECT id INTO sph_paint1     FROM public.phase_templates WHERE project_template_id = v_suite AND position = 11;
SELECT id INTO sph_flooring   FROM public.phase_templates WHERE project_template_id = v_suite AND position = 12;
SELECT id INTO sph_baseboard  FROM public.phase_templates WHERE project_template_id = v_suite AND position = 13;
SELECT id INTO sph_paint2     FROM public.phase_templates WHERE project_template_id = v_suite AND position = 14;
SELECT id INTO sph_kitchen    FROM public.phase_templates WHERE project_template_id = v_suite AND position = 15;
SELECT id INTO sph_elec_final FROM public.phase_templates WHERE project_template_id = v_suite AND position = 16;
SELECT id INTO sph_handover   FROM public.phase_templates WHERE project_template_id = v_suite AND position = 17;

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required, default_duration_days)
VALUES
  -- Design & Permit Package (8 workdays -- unchanged from v1.0)
  (sph_design, v_suite, 'Prepare updated design drawing for the secondary suite',        'Planning',       0, 'High', true, 3),
  (sph_design, v_suite, 'Obtain mechanical ventilation design form',                      'Administrative', 1, 'High', true, 2),
  (sph_design, v_suite, 'Obtain electrical upgrade scope and design',                     'Administrative', 2, 'High', true, 2),
  (sph_design, v_suite, 'Obtain signed homeowner letter and completed BCA form',          'Administrative', 3, 'High', true, 1),

  -- Submit & Receive Permit (5 workdays -- unchanged)
  (sph_permit, v_suite, 'Compile permit package and submit application', 'Administrative', 0, 'High', true, 1),
  (sph_permit, v_suite, 'Track permit review and record approval',       'Administrative', 1, 'High', true, 4),

  -- Site Clear & Framing (5 workdays -- unchanged)
  (sph_framing, v_suite, 'Clear site of anything not needed for the suite',        'Site Work',       0, 'High', true, 1),
  (sph_framing, v_suite, 'Verify layout against approved plan and mark walls',     'Planning',        1, 'High', true, 1),
  (sph_framing, v_suite, 'Install framing',                                       'Trade Work',      2, 'High', true, 2),
  (sph_framing, v_suite, 'Framing QC review',                                     'Quality Control', 3, 'High', true, 1),

  -- Mechanical Rough-In (2 workdays -- unchanged)
  (sph_mech, v_suite, 'Install mechanical (plumbing/HVAC) rough-in per plan', 'Trade Work',      0, 'High', true, 1),
  (sph_mech, v_suite, 'Mechanical rough-in QC review',                       'Quality Control', 1, 'High', true, 1),

  -- Backing & Blocking (2 workdays -- unchanged)
  (sph_backing, v_suite, 'Install backing and blocking for fixtures', 'Trade Work',      0, 'High', true, 1),
  (sph_backing, v_suite, 'Backing and blocking QC review',            'Quality Control', 1, 'High', true, 1),

  -- Electrical Rough-In (2 workdays -- unchanged)
  (sph_electrical, v_suite, 'Install electrical rough-in per plan', 'Trade Work',      0, 'High', true, 1),
  (sph_electrical, v_suite, 'Electrical rough-in QC review',        'Quality Control', 1, 'High', true, 1),

  -- Framing Inspection (4 workdays -- unchanged)
  (sph_inspection, v_suite, 'Confirm site ready and book framing inspection (mechanical/electrical book their own separately)', 'Administrative', 0, 'High', true, 1),
  (sph_inspection, v_suite, 'Complete framing inspection',                                                                     'Inspection',      1, 'High', true, 2),
  (sph_inspection, v_suite, 'Record inspection results and create deficiency tasks if needed',                                 'Administrative',  2, 'High', true, 1),

  -- Insulation & Drywall (8 workdays -- unchanged)
  (sph_insulation, v_suite, 'Install insulation and vapour/air barrier',      'Trade Work',      0, 'High', true, 2),
  (sph_insulation, v_suite, 'Install drywall',                                'Trade Work',      1, 'High', true, 1),
  (sph_insulation, v_suite, 'Complete taping and required coats',             'Trade Work',      2, 'High', true, 3),
  (sph_insulation, v_suite, 'Sand, inspect and correct defects',              'Quality Control', 3, 'High', true, 1),
  (sph_insulation, v_suite, 'Complete drywall QC',                           'Quality Control', 4, 'High', true, 1),

  -- Wall Priming (2 workdays -- FCC: "Wall Priming")
  (sph_priming, v_suite, 'Prime all drywall surfaces', 'Trade Work',      0, 'High', true, 1),
  (sph_priming, v_suite, 'Priming QC review',           'Quality Control', 1, 'High', true, 1),

  -- Doors & Trim (5 workdays -- FCC: "Doors & Trim")
  (sph_doors, v_suite, 'Install interior doors and hardware', 'Trade Work',      0, 'High', true, 2),
  (sph_doors, v_suite, 'Install door and window casing/trim', 'Trade Work',      1, 'High', true, 2),
  (sph_doors, v_suite, 'Doors and trim QC review',            'Quality Control', 2, 'High', true, 1),

  -- Spraying (3 workdays -- FCC: "Spraying")
  (sph_spraying, v_suite, 'Spray finish ceilings and trim', 'Trade Work',      0, 'High', true, 2),
  (sph_spraying, v_suite, 'Spray finish QC review',         'Quality Control', 1, 'High', true, 1),

  -- Wall Painting -- First Coat (2 workdays -- FCC: "Wall Painting 1st coat")
  (sph_paint1, v_suite, 'Apply first coat of wall paint', 'Trade Work',      0, 'High', true, 1),
  (sph_paint1, v_suite, 'First coat QC review',           'Quality Control', 1, 'High', true, 1),

  -- Flooring (4 workdays -- FCC: "Flooring")
  (sph_flooring, v_suite, 'Install flooring',   'Trade Work',      0, 'High', true, 3),
  (sph_flooring, v_suite, 'Flooring QC review', 'Quality Control', 1, 'High', true, 1),

  -- Baseboard & Railing Install (3 workdays -- FCC: "Baseboard & Railing Install")
  (sph_baseboard, v_suite, 'Install baseboards and stair railing', 'Trade Work',      0, 'High', true, 2),
  (sph_baseboard, v_suite, 'Baseboard and railing QC review',      'Quality Control', 1, 'High', true, 1),

  -- Wall Painting -- Second Coat (2 workdays -- FCC: "Wall Painting 2nd coat")
  (sph_paint2, v_suite, 'Apply second coat of wall paint and touch-ups', 'Trade Work',      0, 'High', true, 1),
  (sph_paint2, v_suite, 'Second coat QC review',                        'Quality Control', 1, 'High', true, 1),

  -- Finishing -- Kitchen, Vanity & Fixtures (3 workdays -- kept, secondary-
  -- suite-specific: a self-sustaining suite needs its own kitchen/bath,
  -- which plain basement finishing doesn't)
  (sph_kitchen, v_suite, 'Install kitchen, vanity, toilet and finishing fixtures', 'Trade Work',      0, 'High', true, 2),
  (sph_kitchen, v_suite, 'Fixtures QC review',                                    'Quality Control', 1, 'High', true, 1),

  -- Electrical Final Trim (2 workdays -- kept, secondary-suite-specific:
  -- the suite's own electrical upgrade needs its own final trim pass)
  (sph_elec_final, v_suite, 'Install final electrical trims (receptacle/switch covers, fixtures)', 'Trade Work',      0, 'High', true, 1),
  (sph_elec_final, v_suite, 'Electrical final QC review',                                            'Quality Control', 1, 'High', true, 1),

  -- Deficiencies, Final QC & Handover (6 workdays -- covers FCC's "Final
  -- Inspection" + "Delivered/Completed", same as Basement Finishing)
  (sph_handover, v_suite, 'Complete internal final inspection and create deficiency list', 'Inspection',           0, 'High', true, 1),
  (sph_handover, v_suite, 'Assign and complete deficiencies',                              'Corrective Work',      1, 'High', true, 2),
  (sph_handover, v_suite, 'Complete final cleaning',                                        'Site Work',            2, 'Medium', true, 1),
  (sph_handover, v_suite, 'Complete client walkthrough and obtain QC approval',             'Client Communication', 3, 'High', true, 1),
  (sph_handover, v_suite, 'Record client handover and mark project completed',              'Handover',             4, 'High', true, 1);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

END $$;
