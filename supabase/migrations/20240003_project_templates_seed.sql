-- =============================================================================
-- Seed: 5 project templates with phase templates and task templates
-- Safe to re-run: uses INSERT ... WHERE NOT EXISTS pattern
-- Templates are operational defaults requiring project-manager review.
-- They do not guarantee code, permit, inspection, safety, or insurance compliance.
-- =============================================================================

DO $$
DECLARE
  -- Project template IDs
  tmpl_basement   uuid;
  tmpl_bathroom   uuid;
  tmpl_painting   uuid;
  tmpl_flooring   uuid;
  tmpl_insurance  uuid;

  -- Phase template IDs (basement)
  bph_setup       uuid; bph_permits     uuid; bph_demolition  uuid;
  bph_framing     uuid; bph_plumbing    uuid; bph_hvac        uuid;
  bph_electrical  uuid; bph_rough_insp  uuid; bph_insulation  uuid;
  bph_drywall     uuid; bph_painting    uuid; bph_flooring    uuid;
  bph_doors       uuid; bph_fixtures    uuid; bph_handover    uuid;

  -- Phase template IDs (bathroom)
  baph_setup      uuid; baph_permits    uuid; baph_demo       uuid;
  baph_framing    uuid; baph_rough      uuid; baph_rough_insp uuid;
  baph_waterproof uuid; baph_tile       uuid; baph_drywall    uuid;
  baph_fixtures   uuid; baph_trades     uuid; baph_handover   uuid;

  -- Phase template IDs (painting)
  pph_setup       uuid; pph_procurement uuid; pph_protection  uuid;
  pph_prep        uuid; pph_priming     uuid; pph_finish      uuid;
  pph_handover    uuid;

  -- Phase template IDs (flooring)
  fph_setup       uuid; fph_procurement uuid; fph_site_prep   uuid;
  fph_substrate   uuid; fph_install     uuid; fph_trim        uuid;
  fph_handover    uuid;

  -- Phase template IDs (insurance)
  iph_emergency   uuid; iph_scope       uuid; iph_hazmat      uuid;
  iph_demo        uuid; iph_drying      uuid; iph_recon_plan  uuid;
  iph_rough       uuid; iph_trades_insp uuid; iph_drywall     uuid;
  iph_finishes    uuid; iph_fixtures    uuid; iph_handover    uuid;

BEGIN

-- ============================================================
-- Guard: skip seed if templates already exist
-- ============================================================
IF EXISTS (SELECT 1 FROM public.project_templates LIMIT 1) THEN
  RAISE NOTICE 'project_templates already seeded – skipping.';
  RETURN;
END IF;

-- ============================================================
-- INSERT project templates
-- ============================================================
INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
VALUES
  (gen_random_uuid(), 'Basement Finishing & Development',
   'Full basement finishing including framing, rough-in trades, drywall, and finishes.',
   'Basement', '1.0', true, 120),
  (gen_random_uuid(), 'Bathroom Remodel',
   'Complete bathroom renovation from demolition through fixtures and handover.',
   'Bathroom', '1.0', true, 42),
  (gen_random_uuid(), 'Interior Painting',
   'Interior painting project including surface prep, priming, finish coats, and client walkthrough.',
   'Painting', '1.0', true, 10),
  (gen_random_uuid(), 'Flooring Installation',
   'Flooring supply and installation including substrate prep, installation, and trim.',
   'Flooring', '1.0', true, 14),
  (gen_random_uuid(), 'Insurance Rebuild',
   'Post-loss reconstruction from emergency documentation through client handover.',
   'Insurance', '1.0', true, 90);

-- Capture IDs
SELECT id INTO tmpl_basement  FROM public.project_templates WHERE project_type = 'Basement'  LIMIT 1;
SELECT id INTO tmpl_bathroom  FROM public.project_templates WHERE project_type = 'Bathroom'  LIMIT 1;
SELECT id INTO tmpl_painting  FROM public.project_templates WHERE project_type = 'Painting'  LIMIT 1;
SELECT id INTO tmpl_flooring  FROM public.project_templates WHERE project_type = 'Flooring'  LIMIT 1;
SELECT id INTO tmpl_insurance FROM public.project_templates WHERE project_type = 'Insurance' LIMIT 1;

-- ============================================================
-- BASEMENT FINISHING — Phase Templates
-- ============================================================
INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
VALUES
  (gen_random_uuid(), tmpl_basement, 'Project Setup & Planning',              0,  7,  true),
  (gen_random_uuid(), tmpl_basement, 'Permits, Selections & Procurement',      1,  14, true),
  (gen_random_uuid(), tmpl_basement, 'Site Protection & Demolition',           2,  5,  true),
  (gen_random_uuid(), tmpl_basement, 'Layout & Framing',                       3,  7,  true),
  (gen_random_uuid(), tmpl_basement, 'Plumbing Rough-In',                      4,  5,  false),
  (gen_random_uuid(), tmpl_basement, 'HVAC Rough-In',                          5,  5,  false),
  (gen_random_uuid(), tmpl_basement, 'Electrical Rough-In',                    6,  5,  true),
  (gen_random_uuid(), tmpl_basement, 'Rough-In Inspections',                   7,  7,  true),
  (gen_random_uuid(), tmpl_basement, 'Insulation, Air/Vapour & Fire/Acoustic', 8,  5,  true),
  (gen_random_uuid(), tmpl_basement, 'Drywall',                                9,  7,  true),
  (gen_random_uuid(), tmpl_basement, 'Priming & Painting',                     10, 5,  true),
  (gen_random_uuid(), tmpl_basement, 'Flooring',                               11, 5,  true),
  (gen_random_uuid(), tmpl_basement, 'Doors, Trim & Millwork',                 12, 5,  true),
  (gen_random_uuid(), tmpl_basement, 'Fixtures & Final Trade Completion',       13, 5,  true),
  (gen_random_uuid(), tmpl_basement, 'Deficiencies, Final QC & Handover',      14, 7,  true);

SELECT id INTO bph_setup      FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 0;
SELECT id INTO bph_permits    FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 1;
SELECT id INTO bph_demolition FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 2;
SELECT id INTO bph_framing    FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 3;
SELECT id INTO bph_plumbing   FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 4;
SELECT id INTO bph_hvac       FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 5;
SELECT id INTO bph_electrical FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 6;
SELECT id INTO bph_rough_insp FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 7;
SELECT id INTO bph_insulation FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 8;
SELECT id INTO bph_drywall    FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 9;
SELECT id INTO bph_painting   FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 10;
SELECT id INTO bph_flooring   FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 11;
SELECT id INTO bph_doors      FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 12;
SELECT id INTO bph_fixtures   FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 13;
SELECT id INTO bph_handover   FROM public.phase_templates WHERE project_template_id = tmpl_basement AND position = 14;

-- BASEMENT — Task Templates (selected phases for brevity; all phases get tasks)
INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  -- Project Setup & Planning
  (bph_setup, tmpl_basement, 'Confirm approved project scope',                'Administrative',    0,  'High',   true),
  (bph_setup, tmpl_basement, 'Confirm exclusions',                            'Administrative',    1,  'High',   true),
  (bph_setup, tmpl_basement, 'Complete detailed site measure',                'Planning',          2,  'High',   true),
  (bph_setup, tmpl_basement, 'Document existing conditions',                  'Planning',          3,  'High',   true),
  (bph_setup, tmpl_basement, 'Confirm ceiling heights and obstructions',      'Planning',          4,  'Medium', true),
  (bph_setup, tmpl_basement, 'Determine permit requirements',                 'Administrative',    5,  'High',   true),
  (bph_setup, tmpl_basement, 'Determine inspection requirements',             'Inspection',        6,  'High',   true),
  (bph_setup, tmpl_basement, 'Confirm hazardous-material assessment req.',    'Planning',          7,  'High',   true),
  (bph_setup, tmpl_basement, 'Confirm client selections and deadlines',       'Client Communication', 8, 'High', true),
  (bph_setup, tmpl_basement, 'Build project schedule',                        'Planning',          9,  'High',   true),
  (bph_setup, tmpl_basement, 'Assign project team',                           'Administrative',    10, 'High',   true),
  (bph_setup, tmpl_basement, 'Hold pre-construction meeting',                 'Administrative',    11, 'High',   true),
  (bph_setup, tmpl_basement, 'Obtain signed contract',                        'Administrative',    12, 'High',   true),
  (bph_setup, tmpl_basement, 'Confirm site access and working hours',         'Administrative',    13, 'Medium', true),
  (bph_setup, tmpl_basement, 'Approve project start',                         'Administrative',    14, 'High',   true),
  -- Permits, Selections & Procurement
  (bph_permits, tmpl_basement, 'Prepare permit application information',      'Administrative',    0,  'High',   true),
  (bph_permits, tmpl_basement, 'Submit applicable permit application',        'Administrative',    1,  'High',   true),
  (bph_permits, tmpl_basement, 'Track permit review',                         'Administrative',    2,  'High',   true),
  (bph_permits, tmpl_basement, 'Record permit approval',                      'Administrative',    3,  'High',   true),
  (bph_permits, tmpl_basement, 'Create selection register',                   'Client Communication', 4, 'High', true),
  (bph_permits, tmpl_basement, 'Obtain flooring selection',                   'Procurement',       5,  'High',   true),
  (bph_permits, tmpl_basement, 'Obtain paint colour and sheen selection',     'Procurement',       6,  'High',   true),
  (bph_permits, tmpl_basement, 'Obtain door and hardware selection',          'Procurement',       7,  'High',   false),
  (bph_permits, tmpl_basement, 'Confirm long-lead materials',                 'Procurement',       8,  'High',   true),
  (bph_permits, tmpl_basement, 'Create procurement schedule',                 'Procurement',       9,  'High',   true),
  (bph_permits, tmpl_basement, 'Order approved long-lead materials',          'Procurement',       10, 'High',   true),
  -- Site Protection & Demolition
  (bph_demolition, tmpl_basement, 'Complete pre-work safety review',          'Administrative',    0,  'High',   true),
  (bph_demolition, tmpl_basement, 'Confirm hazardous-material clearance',     'Administrative',    1,  'High',   true),
  (bph_demolition, tmpl_basement, 'Photograph existing conditions',           'Administrative',    2,  'Medium', true),
  (bph_demolition, tmpl_basement, 'Protect access routes',                    'Site Work',         3,  'Medium', true),
  (bph_demolition, tmpl_basement, 'Isolate work area and dust control',       'Site Work',         4,  'High',   true),
  (bph_demolition, tmpl_basement, 'Complete approved demolition',             'Site Work',         5,  'High',   true),
  (bph_demolition, tmpl_basement, 'Remove debris',                            'Site Work',         6,  'Medium', true),
  (bph_demolition, tmpl_basement, 'Inspect exposed conditions',               'Quality Control',   7,  'High',   true),
  (bph_demolition, tmpl_basement, 'Record concealed-condition issues',        'Administrative',    8,  'High',   true),
  (bph_demolition, tmpl_basement, 'Phase QC review',                         'Quality Control',   9,  'High',   true),
  -- Layout & Framing
  (bph_framing, tmpl_basement, 'Verify layout against approved plan',         'Planning',          0,  'High',   true),
  (bph_framing, tmpl_basement, 'Mark wall locations',                         'Site Work',         1,  'High',   true),
  (bph_framing, tmpl_basement, 'Verify door openings and mechanical clearances','Planning',        2,  'High',   true),
  (bph_framing, tmpl_basement, 'Install framing',                             'Trade Work',        3,  'High',   true),
  (bph_framing, tmpl_basement, 'Install required backing',                    'Trade Work',        4,  'Medium', true),
  (bph_framing, tmpl_basement, 'Frame soffits and bulkheads',                 'Trade Work',        5,  'Medium', false),
  (bph_framing, tmpl_basement, 'Verify dimensions',                           'Quality Control',   6,  'High',   true),
  (bph_framing, tmpl_basement, 'Photograph concealed work',                   'Administrative',    7,  'High',   true),
  (bph_framing, tmpl_basement, 'Framing QC review',                          'Quality Control',   8,  'High',   true),
  (bph_framing, tmpl_basement, 'Book applicable framing inspection',          'Inspection',        9,  'High',   false),
  -- Rough-In Inspections
  (bph_rough_insp, tmpl_basement, 'Verify framing ready for inspection',      'Inspection',        0,  'High',   true),
  (bph_rough_insp, tmpl_basement, 'Verify plumbing ready for inspection',     'Inspection',        1,  'High',   false),
  (bph_rough_insp, tmpl_basement, 'Verify electrical ready for inspection',   'Inspection',        2,  'High',   true),
  (bph_rough_insp, tmpl_basement, 'Confirm site access for inspectors',       'Administrative',    3,  'High',   true),
  (bph_rough_insp, tmpl_basement, 'Complete required inspections',            'Inspection',        4,  'High',   true),
  (bph_rough_insp, tmpl_basement, 'Record each inspection result',            'Administrative',    5,  'High',   true),
  (bph_rough_insp, tmpl_basement, 'Create deficiency tasks',                  'Corrective Work',   6,  'High',   true),
  (bph_rough_insp, tmpl_basement, 'Confirm approval before concealment',      'Quality Control',   7,  'High',   true),
  (bph_rough_insp, tmpl_basement, 'Rough-in milestone QC approval',          'Quality Control',   8,  'High',   true),
  -- Drywall
  (bph_drywall, tmpl_basement, 'Confirm enclosure work is approved',          'Administrative',    0,  'High',   true),
  (bph_drywall, tmpl_basement, 'Procure drywall and finishing materials',     'Procurement',       1,  'High',   true),
  (bph_drywall, tmpl_basement, 'Install drywall',                             'Trade Work',        2,  'High',   true),
  (bph_drywall, tmpl_basement, 'Complete taping and required coats',          'Trade Work',        3,  'High',   true),
  (bph_drywall, tmpl_basement, 'Sand and inspect',                            'Quality Control',   4,  'High',   true),
  (bph_drywall, tmpl_basement, 'Correct surface defects',                     'Corrective Work',   5,  'Medium', true),
  (bph_drywall, tmpl_basement, 'Complete drywall QC',                        'Quality Control',   6,  'High',   true),
  -- Handover
  (bph_handover, tmpl_basement, 'Complete internal final inspection',         'Inspection',        0,  'High',   true),
  (bph_handover, tmpl_basement, 'Create deficiency list',                     'Administrative',    1,  'High',   true),
  (bph_handover, tmpl_basement, 'Assign and complete deficiencies',           'Corrective Work',   2,  'High',   true),
  (bph_handover, tmpl_basement, 'Complete final cleaning',                    'Site Work',         3,  'Medium', true),
  (bph_handover, tmpl_basement, 'Compile warranties and manuals',             'Administrative',    4,  'Medium', true),
  (bph_handover, tmpl_basement, 'Complete client walkthrough',                'Client Communication', 5, 'High', true),
  (bph_handover, tmpl_basement, 'Obtain QC approval',                        'Quality Control',   6,  'High',   true),
  (bph_handover, tmpl_basement, 'Record client handover',                     'Handover',          7,  'High',   true),
  (bph_handover, tmpl_basement, 'Mark project completed',                     'Administrative',    8,  'High',   true);

-- ============================================================
-- BATHROOM REMODEL — Phase Templates
-- ============================================================
INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
VALUES
  (gen_random_uuid(), tmpl_bathroom, 'Project Setup & Selections',         0, 5,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Permits & Procurement',              1, 7,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Site Protection & Demolition',       2, 3,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Framing & Substrate Preparation',    3, 3,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Plumbing and Electrical Rough-In',   4, 5,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Rough-In Inspections',               5, 5,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Waterproofing',                      6, 3,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Tile and Flooring',                  7, 5,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Drywall, Paint & Finishes',          8, 4,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Fixtures, Vanity & Millwork',        9, 3,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Final Trade Completion',             10, 2,  true),
  (gen_random_uuid(), tmpl_bathroom, 'Final QC & Handover',                11, 3,  true);

SELECT id INTO baph_setup      FROM public.phase_templates WHERE project_template_id = tmpl_bathroom AND position = 0;
SELECT id INTO baph_permits    FROM public.phase_templates WHERE project_template_id = tmpl_bathroom AND position = 1;
SELECT id INTO baph_demo       FROM public.phase_templates WHERE project_template_id = tmpl_bathroom AND position = 2;
SELECT id INTO baph_waterproof FROM public.phase_templates WHERE project_template_id = tmpl_bathroom AND position = 6;
SELECT id INTO baph_tile       FROM public.phase_templates WHERE project_template_id = tmpl_bathroom AND position = 7;
SELECT id INTO baph_handover   FROM public.phase_templates WHERE project_template_id = tmpl_bathroom AND position = 11;

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  (baph_setup, tmpl_bathroom, 'Site measure', 'Planning', 0, 'High', true),
  (baph_setup, tmpl_bathroom, 'Fixture selection', 'Client Communication', 1, 'High', true),
  (baph_setup, tmpl_bathroom, 'Tile selection', 'Client Communication', 2, 'High', true),
  (baph_setup, tmpl_bathroom, 'Vanity selection', 'Client Communication', 3, 'High', true),
  (baph_setup, tmpl_bathroom, 'Hardware selection', 'Client Communication', 4, 'High', true),
  (baph_setup, tmpl_bathroom, 'Hazardous-material assessment decision', 'Planning', 5, 'High', true),
  (baph_permits, tmpl_bathroom, 'Plumbing permit decision', 'Administrative', 0, 'High', true),
  (baph_permits, tmpl_bathroom, 'Electrical permit decision', 'Administrative', 1, 'High', true),
  (baph_permits, tmpl_bathroom, 'Material lead-time review', 'Procurement', 2, 'High', true),
  (baph_demo, tmpl_bathroom, 'Demolition', 'Site Work', 0, 'High', true),
  (baph_demo, tmpl_bathroom, 'Subfloor inspection', 'Inspection', 1, 'High', true),
  (baph_demo, tmpl_bathroom, 'Framing corrections', 'Corrective Work', 2, 'Medium', false),
  (baph_waterproof, tmpl_bathroom, 'Waterproofing preparation', 'Trade Work', 0, 'High', true),
  (baph_waterproof, tmpl_bathroom, 'Waterproofing installation', 'Trade Work', 1, 'High', true),
  (baph_waterproof, tmpl_bathroom, 'Waterproofing QC or applicable inspection', 'Quality Control', 2, 'High', true),
  (baph_tile, tmpl_bathroom, 'Tile layout approval', 'Client Communication', 0, 'High', true),
  (baph_tile, tmpl_bathroom, 'Tile installation', 'Trade Work', 1, 'High', true),
  (baph_tile, tmpl_bathroom, 'Grouting and sealing', 'Trade Work', 2, 'High', true),
  (baph_handover, tmpl_bathroom, 'Final testing', 'Quality Control', 0, 'High', true),
  (baph_handover, tmpl_bathroom, 'Deficiency completion', 'Corrective Work', 1, 'High', true),
  (baph_handover, tmpl_bathroom, 'Final cleaning', 'Site Work', 2, 'Medium', true),
  (baph_handover, tmpl_bathroom, 'Client walkthrough', 'Client Communication', 3, 'High', true),
  (baph_handover, tmpl_bathroom, 'Record client handover', 'Handover', 4, 'High', true);

-- ============================================================
-- INTERIOR PAINTING — Phase Templates
-- ============================================================
INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
VALUES
  (gen_random_uuid(), tmpl_painting, 'Project Setup & Colour Approval', 0, 2, true),
  (gen_random_uuid(), tmpl_painting, 'Procurement & Scheduling',        1, 2, true),
  (gen_random_uuid(), tmpl_painting, 'Site Protection',                 2, 1, true),
  (gen_random_uuid(), tmpl_painting, 'Surface Preparation',             3, 2, true),
  (gen_random_uuid(), tmpl_painting, 'Priming',                         4, 1, true),
  (gen_random_uuid(), tmpl_painting, 'Finish Coats',                    5, 2, true),
  (gen_random_uuid(), tmpl_painting, 'Touch-Ups, QC & Handover',        6, 2, true);

SELECT id INTO pph_setup      FROM public.phase_templates WHERE project_template_id = tmpl_painting AND position = 0;
SELECT id INTO pph_procurement FROM public.phase_templates WHERE project_template_id = tmpl_painting AND position = 1;
SELECT id INTO pph_protection FROM public.phase_templates WHERE project_template_id = tmpl_painting AND position = 2;
SELECT id INTO pph_prep       FROM public.phase_templates WHERE project_template_id = tmpl_painting AND position = 3;
SELECT id INTO pph_priming    FROM public.phase_templates WHERE project_template_id = tmpl_painting AND position = 4;
SELECT id INTO pph_finish     FROM public.phase_templates WHERE project_template_id = tmpl_painting AND position = 5;
SELECT id INTO pph_handover   FROM public.phase_templates WHERE project_template_id = tmpl_painting AND position = 6;

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  (pph_setup, tmpl_painting, 'Confirm scope and exclusions', 'Administrative', 0, 'High', true),
  (pph_setup, tmpl_painting, 'Confirm surfaces included', 'Planning', 1, 'High', true),
  (pph_setup, tmpl_painting, 'Confirm colours', 'Client Communication', 2, 'High', true),
  (pph_setup, tmpl_painting, 'Confirm sheen', 'Client Communication', 3, 'High', true),
  (pph_setup, tmpl_painting, 'Confirm approved samples', 'Client Communication', 4, 'High', true),
  (pph_procurement, tmpl_painting, 'Calculate quantities', 'Planning', 0, 'High', true),
  (pph_procurement, tmpl_painting, 'Procure primer', 'Procurement', 1, 'High', true),
  (pph_procurement, tmpl_painting, 'Procure paint', 'Procurement', 2, 'High', true),
  (pph_procurement, tmpl_painting, 'Procure consumables', 'Procurement', 3, 'Medium', true),
  (pph_protection, tmpl_painting, 'Confirm work-area access', 'Administrative', 0, 'Medium', true),
  (pph_protection, tmpl_painting, 'Protect floors and fixtures', 'Site Work', 1, 'High', true),
  (pph_protection, tmpl_painting, 'Move or protect furniture', 'Site Work', 2, 'Medium', true),
  (pph_prep, tmpl_painting, 'Patch defects', 'Trade Work', 0, 'High', true),
  (pph_prep, tmpl_painting, 'Caulk gaps', 'Trade Work', 1, 'Medium', true),
  (pph_prep, tmpl_painting, 'Sand surfaces', 'Trade Work', 2, 'Medium', true),
  (pph_prep, tmpl_painting, 'Clean surfaces', 'Trade Work', 3, 'Medium', true),
  (pph_priming, tmpl_painting, 'Apply primer', 'Trade Work', 0, 'High', true),
  (pph_priming, tmpl_painting, 'Inspect primed surfaces', 'Quality Control', 1, 'High', true),
  (pph_priming, tmpl_painting, 'Correct defects', 'Corrective Work', 2, 'Medium', false),
  (pph_finish, tmpl_painting, 'Apply first finish coat', 'Trade Work', 0, 'High', true),
  (pph_finish, tmpl_painting, 'Inspect first coat', 'Quality Control', 1, 'High', true),
  (pph_finish, tmpl_painting, 'Apply final coat', 'Trade Work', 2, 'High', true),
  (pph_finish, tmpl_painting, 'Complete cut-line review', 'Quality Control', 3, 'High', true),
  (pph_handover, tmpl_painting, 'Complete touch-ups', 'Trade Work', 0, 'High', true),
  (pph_handover, tmpl_painting, 'Remove protection', 'Site Work', 1, 'Medium', true),
  (pph_handover, tmpl_painting, 'Clean work area', 'Site Work', 2, 'Medium', true),
  (pph_handover, tmpl_painting, 'Complete lighting-condition QC', 'Quality Control', 3, 'High', true),
  (pph_handover, tmpl_painting, 'Complete client walkthrough', 'Client Communication', 4, 'High', true),
  (pph_handover, tmpl_painting, 'Record client handover', 'Handover', 5, 'High', true);

-- ============================================================
-- FLOORING INSTALLATION — Phase Templates
-- ============================================================
INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
VALUES
  (gen_random_uuid(), tmpl_flooring, 'Project Setup & Product Approval', 0, 3, true),
  (gen_random_uuid(), tmpl_flooring, 'Procurement & Delivery',           1, 7, true),
  (gen_random_uuid(), tmpl_flooring, 'Site Preparation',                 2, 2, true),
  (gen_random_uuid(), tmpl_flooring, 'Substrate Assessment & Correction',3, 2, true),
  (gen_random_uuid(), tmpl_flooring, 'Flooring Installation',            4, 4, true),
  (gen_random_uuid(), tmpl_flooring, 'Transitions, Trim & Finishing',    5, 2, true),
  (gen_random_uuid(), tmpl_flooring, 'Protection, QC & Handover',        6, 2, true);

SELECT id INTO fph_setup      FROM public.phase_templates WHERE project_template_id = tmpl_flooring AND position = 0;
SELECT id INTO fph_procurement FROM public.phase_templates WHERE project_template_id = tmpl_flooring AND position = 1;
SELECT id INTO fph_site_prep  FROM public.phase_templates WHERE project_template_id = tmpl_flooring AND position = 2;
SELECT id INTO fph_substrate  FROM public.phase_templates WHERE project_template_id = tmpl_flooring AND position = 3;
SELECT id INTO fph_install    FROM public.phase_templates WHERE project_template_id = tmpl_flooring AND position = 4;
SELECT id INTO fph_trim       FROM public.phase_templates WHERE project_template_id = tmpl_flooring AND position = 5;
SELECT id INTO fph_handover   FROM public.phase_templates WHERE project_template_id = tmpl_flooring AND position = 6;

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  (fph_setup, tmpl_flooring, 'Confirm measured area', 'Planning', 0, 'High', true),
  (fph_setup, tmpl_flooring, 'Confirm waste allowance', 'Planning', 1, 'Medium', true),
  (fph_setup, tmpl_flooring, 'Confirm product', 'Client Communication', 2, 'High', true),
  (fph_setup, tmpl_flooring, 'Confirm installation method', 'Planning', 3, 'High', true),
  (fph_setup, tmpl_flooring, 'Confirm manufacturer requirements', 'Planning', 4, 'High', true),
  (fph_setup, tmpl_flooring, 'Confirm acclimation requirements', 'Planning', 5, 'Medium', true),
  (fph_procurement, tmpl_flooring, 'Order flooring', 'Procurement', 0, 'High', true),
  (fph_procurement, tmpl_flooring, 'Order underlayment or barrier', 'Procurement', 1, 'Medium', false),
  (fph_procurement, tmpl_flooring, 'Order transitions and nosings', 'Procurement', 2, 'Medium', true),
  (fph_procurement, tmpl_flooring, 'Confirm delivery', 'Procurement', 3, 'High', true),
  (fph_procurement, tmpl_flooring, 'Inspect delivered material', 'Quality Control', 4, 'High', true),
  (fph_site_prep, tmpl_flooring, 'Remove existing flooring', 'Site Work', 0, 'High', false),
  (fph_site_prep, tmpl_flooring, 'Confirm storage conditions', 'Administrative', 1, 'Medium', true),
  (fph_substrate, tmpl_flooring, 'Inspect substrate', 'Inspection', 0, 'High', true),
  (fph_substrate, tmpl_flooring, 'Perform applicable moisture checks', 'Inspection', 1, 'High', true),
  (fph_substrate, tmpl_flooring, 'Correct substrate defects', 'Corrective Work', 2, 'High', false),
  (fph_install, tmpl_flooring, 'Confirm starting layout', 'Planning', 0, 'High', true),
  (fph_install, tmpl_flooring, 'Install flooring', 'Trade Work', 1, 'High', true),
  (fph_trim, tmpl_flooring, 'Install transitions', 'Trade Work', 0, 'High', true),
  (fph_trim, tmpl_flooring, 'Install or reinstall baseboards', 'Trade Work', 1, 'Medium', true),
  (fph_trim, tmpl_flooring, 'Complete touch-ups', 'Trade Work', 2, 'Medium', true),
  (fph_handover, tmpl_flooring, 'Protect completed flooring', 'Site Work', 0, 'Medium', true),
  (fph_handover, tmpl_flooring, 'Complete QC', 'Quality Control', 1, 'High', true),
  (fph_handover, tmpl_flooring, 'Complete client walkthrough', 'Client Communication', 2, 'High', true),
  (fph_handover, tmpl_flooring, 'Record client handover', 'Handover', 3, 'High', true);

-- ============================================================
-- INSURANCE REBUILD — Phase Templates
-- ============================================================
INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
VALUES
  (gen_random_uuid(), tmpl_insurance, 'Emergency Handoff & Documentation',        0,  3,  true),
  (gen_random_uuid(), tmpl_insurance, 'Scope, Estimate & Authorization',           1,  14, true),
  (gen_random_uuid(), tmpl_insurance, 'Hazardous-Material and Safety Review',      2,  7,  true),
  (gen_random_uuid(), tmpl_insurance, 'Demolition & Stabilization',                3,  7,  true),
  (gen_random_uuid(), tmpl_insurance, 'Drying, Remediation or Abatement',          4,  14, false),
  (gen_random_uuid(), tmpl_insurance, 'Reconstruction Planning & Procurement',     5,  10, true),
  (gen_random_uuid(), tmpl_insurance, 'Rough Construction',                        6,  14, true),
  (gen_random_uuid(), tmpl_insurance, 'Rough-In Trades & Inspections',             7,  10, true),
  (gen_random_uuid(), tmpl_insurance, 'Insulation & Drywall',                      8,  7,  true),
  (gen_random_uuid(), tmpl_insurance, 'Interior Finishes',                         9,  10, true),
  (gen_random_uuid(), tmpl_insurance, 'Fixtures, Millwork & Final Trades',         10, 7,  true),
  (gen_random_uuid(), tmpl_insurance, 'Deficiencies, Documentation & Handover',    11, 7,  true);

SELECT id INTO iph_emergency FROM public.phase_templates WHERE project_template_id = tmpl_insurance AND position = 0;
SELECT id INTO iph_scope     FROM public.phase_templates WHERE project_template_id = tmpl_insurance AND position = 1;
SELECT id INTO iph_hazmat    FROM public.phase_templates WHERE project_template_id = tmpl_insurance AND position = 2;
SELECT id INTO iph_demo      FROM public.phase_templates WHERE project_template_id = tmpl_insurance AND position = 3;
SELECT id INTO iph_handover  FROM public.phase_templates WHERE project_template_id = tmpl_insurance AND position = 11;

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  (iph_emergency, tmpl_insurance, 'Confirm loss information', 'Administrative', 0, 'High', true),
  (iph_emergency, tmpl_insurance, 'Confirm customer and adjuster contacts', 'Client Communication', 1, 'High', true),
  (iph_emergency, tmpl_insurance, 'Document pre-existing and loss-related conditions', 'Administrative', 2, 'High', true),
  (iph_emergency, tmpl_insurance, 'Photograph affected areas', 'Administrative', 3, 'High', true),
  (iph_emergency, tmpl_insurance, 'Confirm emergency work completed', 'Administrative', 4, 'High', true),
  (iph_scope, tmpl_insurance, 'Confirm authorized scope', 'Administrative', 0, 'High', true),
  (iph_scope, tmpl_insurance, 'Prepare estimate', 'Administrative', 1, 'High', true),
  (iph_scope, tmpl_insurance, 'Send estimate', 'Client Communication', 2, 'High', true),
  (iph_scope, tmpl_insurance, 'Follow up with responsible parties', 'Client Communication', 3, 'High', true),
  (iph_scope, tmpl_insurance, 'Record authorization', 'Administrative', 4, 'High', true),
  (iph_scope, tmpl_insurance, 'Track scope revisions', 'Administrative', 5, 'High', true),
  (iph_hazmat, tmpl_insurance, 'Determine hazardous-material assessment requirements', 'Planning', 0, 'High', true),
  (iph_hazmat, tmpl_insurance, 'Confirm whether qualified assessment is required', 'Planning', 1, 'High', true),
  (iph_hazmat, tmpl_insurance, 'Complete required testing', 'Inspection', 2, 'High', false),
  (iph_hazmat, tmpl_insurance, 'Receive abatement clearance', 'Administrative', 3, 'High', false),
  (iph_demo, tmpl_insurance, 'Complete demolition', 'Site Work', 0, 'High', true),
  (iph_demo, tmpl_insurance, 'Confirm drying or remediation completion', 'Administrative', 1, 'High', true),
  (iph_demo, tmpl_insurance, 'Record moisture-clearance documentation', 'Administrative', 2, 'High', true),
  (iph_handover, tmpl_insurance, 'Complete internal QC', 'Quality Control', 0, 'High', true),
  (iph_handover, tmpl_insurance, 'Complete deficiencies', 'Corrective Work', 1, 'High', true),
  (iph_handover, tmpl_insurance, 'Compile documentation', 'Administrative', 2, 'High', true),
  (iph_handover, tmpl_insurance, 'Complete customer walkthrough', 'Client Communication', 3, 'High', true),
  (iph_handover, tmpl_insurance, 'Record handover', 'Handover', 4, 'High', true);

END;
$$;
