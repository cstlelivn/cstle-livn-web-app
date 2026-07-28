-- =============================================================================
-- Seed: the 5 original project templates (Figma Make's own seed file for these
-- never actually ran against the live database -- verified empty before this).
-- Plain literal-UUID INSERTs only (no CTEs/RETURNING/DO blocks/VALUES-subquery,
-- all of which failed against this migration tool in testing).
-- =============================================================================

ALTER TABLE public.project_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Basement Finishing & Development
-- ============================================================
INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
SELECT '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Basement Finishing & Development', 'Full basement finishing including framing, rough-in trades, drywall, and finishes.', 'Basement', '1.0', true, 120
WHERE NOT EXISTS (SELECT 1 FROM public.project_templates WHERE id = '2f88c2b7-741d-4db1-9ffc-e673845ead22');

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Project Setup & Planning', 0, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '2e8c3016-9b4e-4376-beaa-b48a6abe8226');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm approved project scope', 'Administrative', 0, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm exclusions', 'Administrative', 1, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Complete detailed site measure', 'Planning', 2, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Document existing conditions', 'Planning', 3, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm ceiling heights and obstructions', 'Planning', 4, 'Medium', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Determine permit requirements', 'Administrative', 5, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Determine inspection requirements', 'Inspection', 6, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm hazardous-material assessment req.', 'Planning', 7, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm client selections and deadlines', 'Client Communication', 8, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Build project schedule', 'Planning', 9, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Assign project team', 'Administrative', 10, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Hold pre-construction meeting', 'Administrative', 11, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Obtain signed contract', 'Administrative', 12, 'High', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm site access and working hours', 'Administrative', 13, 'Medium', true),
  ('2e8c3016-9b4e-4376-beaa-b48a6abe8226', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Approve project start', 'Administrative', 14, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Permits, Selections & Procurement', 1, 14, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '3087d50b-3787-45cf-bc8e-de715135836a');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Prepare permit application information', 'Administrative', 0, 'High', true),
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Submit applicable permit application', 'Administrative', 1, 'High', true),
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Track permit review', 'Administrative', 2, 'High', true),
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Record permit approval', 'Administrative', 3, 'High', true),
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Create selection register', 'Client Communication', 4, 'High', true),
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Obtain flooring selection', 'Procurement', 5, 'High', true),
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Obtain paint colour and sheen selection', 'Procurement', 6, 'High', true),
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Obtain door and hardware selection', 'Procurement', 7, 'High', false),
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm long-lead materials', 'Procurement', 8, 'High', true),
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Create procurement schedule', 'Procurement', 9, 'High', true),
  ('3087d50b-3787-45cf-bc8e-de715135836a', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Order approved long-lead materials', 'Procurement', 10, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Site Protection & Demolition', 2, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'a72fee11-4022-4e9d-8cec-6f5079ff5266');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Complete pre-work safety review', 'Administrative', 0, 'High', true),
  ('a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm hazardous-material clearance', 'Administrative', 1, 'High', true),
  ('a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Photograph existing conditions', 'Administrative', 2, 'Medium', true),
  ('a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Protect access routes', 'Site Work', 3, 'Medium', true),
  ('a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Isolate work area and dust control', 'Site Work', 4, 'High', true),
  ('a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Complete approved demolition', 'Site Work', 5, 'High', true),
  ('a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Remove debris', 'Site Work', 6, 'Medium', true),
  ('a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Inspect exposed conditions', 'Quality Control', 7, 'High', true),
  ('a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Record concealed-condition issues', 'Administrative', 8, 'High', true),
  ('a72fee11-4022-4e9d-8cec-6f5079ff5266', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Phase QC review', 'Quality Control', 9, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Layout & Framing', 3, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'e94e48ba-f539-4b29-bd23-15ef1ab847a5');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Verify layout against approved plan', 'Planning', 0, 'High', true),
  ('e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Mark wall locations', 'Site Work', 1, 'High', true),
  ('e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Verify door openings and mechanical clearances', 'Planning', 2, 'High', true),
  ('e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install framing', 'Trade Work', 3, 'High', true),
  ('e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install required backing', 'Trade Work', 4, 'Medium', true),
  ('e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Frame soffits and bulkheads', 'Trade Work', 5, 'Medium', false),
  ('e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Verify dimensions', 'Quality Control', 6, 'High', true),
  ('e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Photograph concealed work', 'Administrative', 7, 'High', true),
  ('e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Framing QC review', 'Quality Control', 8, 'High', true),
  ('e94e48ba-f539-4b29-bd23-15ef1ab847a5', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Book applicable framing inspection', 'Inspection', 9, 'High', false);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'd2f09b86-e321-4a2c-851b-d1a7d666235c', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Plumbing Rough-In', 4, 5, false
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'd2f09b86-e321-4a2c-851b-d1a7d666235c');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('d2f09b86-e321-4a2c-851b-d1a7d666235c', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm fixture rough-in locations', 'Planning', 0, 'High', true),
  ('d2f09b86-e321-4a2c-851b-d1a7d666235c', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install plumbing rough-in', 'Trade Work', 1, 'High', true),
  ('d2f09b86-e321-4a2c-851b-d1a7d666235c', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Pressure test lines', 'Quality Control', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'af8f5374-d166-49f2-b83d-625a0e739cfa', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'HVAC Rough-In', 5, 5, false
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'af8f5374-d166-49f2-b83d-625a0e739cfa');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('af8f5374-d166-49f2-b83d-625a0e739cfa', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm HVAC layout', 'Planning', 0, 'High', true),
  ('af8f5374-d166-49f2-b83d-625a0e739cfa', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install ductwork and rough-in', 'Trade Work', 1, 'High', true),
  ('af8f5374-d166-49f2-b83d-625a0e739cfa', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'HVAC rough-in QC review', 'Quality Control', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '1d03ecd3-796e-44c5-9ab5-918a59fe0097', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Electrical Rough-In', 6, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '1d03ecd3-796e-44c5-9ab5-918a59fe0097');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('1d03ecd3-796e-44c5-9ab5-918a59fe0097', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm electrical layout', 'Planning', 0, 'High', true),
  ('1d03ecd3-796e-44c5-9ab5-918a59fe0097', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install electrical rough-in', 'Trade Work', 1, 'High', true),
  ('1d03ecd3-796e-44c5-9ab5-918a59fe0097', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Electrical rough-in QC review', 'Quality Control', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '61cea54a-4128-497b-88df-0a3b1eba67a4', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Rough-In Inspections', 7, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '61cea54a-4128-497b-88df-0a3b1eba67a4');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('61cea54a-4128-497b-88df-0a3b1eba67a4', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Verify framing ready for inspection', 'Inspection', 0, 'High', true),
  ('61cea54a-4128-497b-88df-0a3b1eba67a4', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Verify plumbing ready for inspection', 'Inspection', 1, 'High', false),
  ('61cea54a-4128-497b-88df-0a3b1eba67a4', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Verify electrical ready for inspection', 'Inspection', 2, 'High', true),
  ('61cea54a-4128-497b-88df-0a3b1eba67a4', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm site access for inspectors', 'Administrative', 3, 'High', true),
  ('61cea54a-4128-497b-88df-0a3b1eba67a4', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Complete required inspections', 'Inspection', 4, 'High', true),
  ('61cea54a-4128-497b-88df-0a3b1eba67a4', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Record each inspection result', 'Administrative', 5, 'High', true),
  ('61cea54a-4128-497b-88df-0a3b1eba67a4', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Create deficiency tasks', 'Corrective Work', 6, 'High', true),
  ('61cea54a-4128-497b-88df-0a3b1eba67a4', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm approval before concealment', 'Quality Control', 7, 'High', true),
  ('61cea54a-4128-497b-88df-0a3b1eba67a4', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Rough-in milestone QC approval', 'Quality Control', 8, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '46ed7b40-9f6e-43b2-95a4-961fada10ec9', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Insulation, Air/Vapour & Fire/Acoustic', 8, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '46ed7b40-9f6e-43b2-95a4-961fada10ec9');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('46ed7b40-9f6e-43b2-95a4-961fada10ec9', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install insulation', 'Trade Work', 0, 'High', true),
  ('46ed7b40-9f6e-43b2-95a4-961fada10ec9', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install air/vapour barrier', 'Trade Work', 1, 'High', true),
  ('46ed7b40-9f6e-43b2-95a4-961fada10ec9', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install fire/acoustic assemblies as required', 'Trade Work', 2, 'Medium', true),
  ('46ed7b40-9f6e-43b2-95a4-961fada10ec9', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Insulation QC review', 'Quality Control', 3, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'b7f5b59e-ac8b-4dd3-8139-308c84e57231', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Drywall', 9, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'b7f5b59e-ac8b-4dd3-8139-308c84e57231');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('b7f5b59e-ac8b-4dd3-8139-308c84e57231', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm enclosure work is approved', 'Administrative', 0, 'High', true),
  ('b7f5b59e-ac8b-4dd3-8139-308c84e57231', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Procure drywall and finishing materials', 'Procurement', 1, 'High', true),
  ('b7f5b59e-ac8b-4dd3-8139-308c84e57231', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install drywall', 'Trade Work', 2, 'High', true),
  ('b7f5b59e-ac8b-4dd3-8139-308c84e57231', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Complete taping and required coats', 'Trade Work', 3, 'High', true),
  ('b7f5b59e-ac8b-4dd3-8139-308c84e57231', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Sand and inspect', 'Quality Control', 4, 'High', true),
  ('b7f5b59e-ac8b-4dd3-8139-308c84e57231', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Correct surface defects', 'Corrective Work', 5, 'Medium', true),
  ('b7f5b59e-ac8b-4dd3-8139-308c84e57231', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Complete drywall QC', 'Quality Control', 6, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'fa828459-46be-4e49-9ebb-bf88946f7bf2', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Priming & Painting', 10, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'fa828459-46be-4e49-9ebb-bf88946f7bf2');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('fa828459-46be-4e49-9ebb-bf88946f7bf2', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Apply primer', 'Trade Work', 0, 'High', true),
  ('fa828459-46be-4e49-9ebb-bf88946f7bf2', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Apply finish coats', 'Trade Work', 1, 'High', true),
  ('fa828459-46be-4e49-9ebb-bf88946f7bf2', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Paint QC review', 'Quality Control', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '98201e0e-5fe1-4b95-81d7-05089df7a469', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Flooring', 11, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '98201e0e-5fe1-4b95-81d7-05089df7a469');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('98201e0e-5fe1-4b95-81d7-05089df7a469', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm flooring product with client', 'Client Communication', 0, 'High', true),
  ('98201e0e-5fe1-4b95-81d7-05089df7a469', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install flooring', 'Trade Work', 1, 'High', true),
  ('98201e0e-5fe1-4b95-81d7-05089df7a469', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Flooring QC review', 'Quality Control', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'e9e6adc1-f3bd-4f80-9d54-62cf44447f78', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Doors, Trim & Millwork', 12, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'e9e6adc1-f3bd-4f80-9d54-62cf44447f78');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('e9e6adc1-f3bd-4f80-9d54-62cf44447f78', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install interior doors', 'Trade Work', 0, 'High', true),
  ('e9e6adc1-f3bd-4f80-9d54-62cf44447f78', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install baseboards and casing', 'Trade Work', 1, 'High', true),
  ('e9e6adc1-f3bd-4f80-9d54-62cf44447f78', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Trim and millwork QC review', 'Quality Control', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '4a0d682c-4820-4b5c-a7c8-10fda0fb380b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Fixtures & Final Trade Completion', 13, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '4a0d682c-4820-4b5c-a7c8-10fda0fb380b');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('4a0d682c-4820-4b5c-a7c8-10fda0fb380b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Install light fixtures', 'Trade Work', 0, 'High', true),
  ('4a0d682c-4820-4b5c-a7c8-10fda0fb380b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Complete outstanding trade items', 'Trade Work', 1, 'High', true),
  ('4a0d682c-4820-4b5c-a7c8-10fda0fb380b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Confirm all trades have completed their scope', 'Administrative', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '02ae948d-dfeb-470e-b643-4e61f0ffd75b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Deficiencies, Final QC & Handover', 14, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '02ae948d-dfeb-470e-b643-4e61f0ffd75b');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('02ae948d-dfeb-470e-b643-4e61f0ffd75b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Complete internal final inspection', 'Inspection', 0, 'High', true),
  ('02ae948d-dfeb-470e-b643-4e61f0ffd75b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Create deficiency list', 'Administrative', 1, 'High', true),
  ('02ae948d-dfeb-470e-b643-4e61f0ffd75b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Assign and complete deficiencies', 'Corrective Work', 2, 'High', true),
  ('02ae948d-dfeb-470e-b643-4e61f0ffd75b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Complete final cleaning', 'Site Work', 3, 'Medium', true),
  ('02ae948d-dfeb-470e-b643-4e61f0ffd75b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Compile warranties and manuals', 'Administrative', 4, 'Medium', true),
  ('02ae948d-dfeb-470e-b643-4e61f0ffd75b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Complete client walkthrough', 'Client Communication', 5, 'High', true),
  ('02ae948d-dfeb-470e-b643-4e61f0ffd75b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Obtain QC approval', 'Quality Control', 6, 'High', true),
  ('02ae948d-dfeb-470e-b643-4e61f0ffd75b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Record client handover', 'Handover', 7, 'High', true),
  ('02ae948d-dfeb-470e-b643-4e61f0ffd75b', '2f88c2b7-741d-4db1-9ffc-e673845ead22', 'Mark project completed', 'Administrative', 8, 'High', true);

-- ============================================================
-- Bathroom Remodel
-- ============================================================
INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
SELECT 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Bathroom Remodel', 'Complete bathroom renovation from demolition through fixtures and handover.', 'Bathroom', '1.0', true, 42
WHERE NOT EXISTS (SELECT 1 FROM public.project_templates WHERE id = 'c8831aa9-8feb-4893-a599-c846d852f7b5');

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'e0d1c646-1aba-4400-a49c-bef4cc395425', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Project Setup & Selections', 0, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'e0d1c646-1aba-4400-a49c-bef4cc395425');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('e0d1c646-1aba-4400-a49c-bef4cc395425', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Site measure', 'Planning', 0, 'High', true),
  ('e0d1c646-1aba-4400-a49c-bef4cc395425', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Fixture selection', 'Client Communication', 1, 'High', true),
  ('e0d1c646-1aba-4400-a49c-bef4cc395425', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Tile selection', 'Client Communication', 2, 'High', true),
  ('e0d1c646-1aba-4400-a49c-bef4cc395425', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Vanity selection', 'Client Communication', 3, 'High', true),
  ('e0d1c646-1aba-4400-a49c-bef4cc395425', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Hardware selection', 'Client Communication', 4, 'High', true),
  ('e0d1c646-1aba-4400-a49c-bef4cc395425', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Hazardous-material assessment decision', 'Planning', 5, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '386548bf-27f8-4a46-ab8a-5587a84be154', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Permits & Procurement', 1, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '386548bf-27f8-4a46-ab8a-5587a84be154');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('386548bf-27f8-4a46-ab8a-5587a84be154', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Plumbing permit decision', 'Administrative', 0, 'High', true),
  ('386548bf-27f8-4a46-ab8a-5587a84be154', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Electrical permit decision', 'Administrative', 1, 'High', true),
  ('386548bf-27f8-4a46-ab8a-5587a84be154', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Material lead-time review', 'Procurement', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '2ee5880c-c866-403a-b723-6dba260c6868', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Site Protection & Demolition', 2, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '2ee5880c-c866-403a-b723-6dba260c6868');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('2ee5880c-c866-403a-b723-6dba260c6868', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Demolition', 'Site Work', 0, 'High', true),
  ('2ee5880c-c866-403a-b723-6dba260c6868', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Subfloor inspection', 'Inspection', 1, 'High', true),
  ('2ee5880c-c866-403a-b723-6dba260c6868', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Framing corrections', 'Corrective Work', 2, 'Medium', false);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '49a28df8-a0a0-4c1c-8748-228fb6d57fb7', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Framing & Substrate Preparation', 3, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '49a28df8-a0a0-4c1c-8748-228fb6d57fb7');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('49a28df8-a0a0-4c1c-8748-228fb6d57fb7', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Framing corrections as needed', 'Trade Work', 0, 'Medium', false),
  ('49a28df8-a0a0-4c1c-8748-228fb6d57fb7', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Install cement board / substrate', 'Trade Work', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'f0a4b6fe-f173-4f19-8cae-cff5ab77b60a', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Plumbing and Electrical Rough-In', 4, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'f0a4b6fe-f173-4f19-8cae-cff5ab77b60a');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('f0a4b6fe-f173-4f19-8cae-cff5ab77b60a', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Plumbing rough-in', 'Trade Work', 0, 'High', true),
  ('f0a4b6fe-f173-4f19-8cae-cff5ab77b60a', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Electrical rough-in', 'Trade Work', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '34934b34-4be1-4e59-b13a-a932d15682df', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Rough-In Inspections', 5, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '34934b34-4be1-4e59-b13a-a932d15682df');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('34934b34-4be1-4e59-b13a-a932d15682df', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Book rough-in inspections', 'Inspection', 0, 'High', true),
  ('34934b34-4be1-4e59-b13a-a932d15682df', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Complete rough-in inspections', 'Inspection', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '60b55038-41d3-4110-ae62-91ae66c4f690', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Waterproofing', 6, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '60b55038-41d3-4110-ae62-91ae66c4f690');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('60b55038-41d3-4110-ae62-91ae66c4f690', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Waterproofing preparation', 'Trade Work', 0, 'High', true),
  ('60b55038-41d3-4110-ae62-91ae66c4f690', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Waterproofing installation', 'Trade Work', 1, 'High', true),
  ('60b55038-41d3-4110-ae62-91ae66c4f690', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Waterproofing QC or applicable inspection', 'Quality Control', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '5ec90ee0-0d89-40e1-9c7d-dd6fbcde1444', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Tile and Flooring', 7, 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '5ec90ee0-0d89-40e1-9c7d-dd6fbcde1444');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('5ec90ee0-0d89-40e1-9c7d-dd6fbcde1444', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Tile layout approval', 'Client Communication', 0, 'High', true),
  ('5ec90ee0-0d89-40e1-9c7d-dd6fbcde1444', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Tile installation', 'Trade Work', 1, 'High', true),
  ('5ec90ee0-0d89-40e1-9c7d-dd6fbcde1444', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Grouting and sealing', 'Trade Work', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '3ba55647-4652-4a8a-ac19-3e1029c192f4', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Drywall, Paint & Finishes', 8, 4, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '3ba55647-4652-4a8a-ac19-3e1029c192f4');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('3ba55647-4652-4a8a-ac19-3e1029c192f4', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Drywall repair/install', 'Trade Work', 0, 'High', true),
  ('3ba55647-4652-4a8a-ac19-3e1029c192f4', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Paint', 'Trade Work', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '2beb2514-a904-43c0-b21e-6c385b1d5093', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Fixtures, Vanity & Millwork', 9, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '2beb2514-a904-43c0-b21e-6c385b1d5093');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('2beb2514-a904-43c0-b21e-6c385b1d5093', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Install vanity', 'Trade Work', 0, 'High', true),
  ('2beb2514-a904-43c0-b21e-6c385b1d5093', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Install fixtures', 'Trade Work', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '83c7460d-d244-4fae-8b68-029b9c46f238', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Final Trade Completion', 10, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '83c7460d-d244-4fae-8b68-029b9c46f238');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('83c7460d-d244-4fae-8b68-029b9c46f238', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Complete outstanding trade items', 'Trade Work', 0, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'fa48a947-dcc1-4d89-b04c-f3913bea3dc1', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Final QC & Handover', 11, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'fa48a947-dcc1-4d89-b04c-f3913bea3dc1');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('fa48a947-dcc1-4d89-b04c-f3913bea3dc1', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Final testing', 'Quality Control', 0, 'High', true),
  ('fa48a947-dcc1-4d89-b04c-f3913bea3dc1', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Deficiency completion', 'Corrective Work', 1, 'High', true),
  ('fa48a947-dcc1-4d89-b04c-f3913bea3dc1', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Final cleaning', 'Site Work', 2, 'Medium', true),
  ('fa48a947-dcc1-4d89-b04c-f3913bea3dc1', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Client walkthrough', 'Client Communication', 3, 'High', true),
  ('fa48a947-dcc1-4d89-b04c-f3913bea3dc1', 'c8831aa9-8feb-4893-a599-c846d852f7b5', 'Record client handover', 'Handover', 4, 'High', true);

-- ============================================================
-- Interior Painting
-- ============================================================
INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
SELECT 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Interior Painting', 'Interior painting project including surface prep, priming, finish coats, and client walkthrough.', 'Painting', '1.0', true, 10
WHERE NOT EXISTS (SELECT 1 FROM public.project_templates WHERE id = 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e');

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'bea9274c-1266-4722-957a-b43333f04c64', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Project Setup & Colour Approval', 0, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'bea9274c-1266-4722-957a-b43333f04c64');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('bea9274c-1266-4722-957a-b43333f04c64', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Confirm scope and exclusions', 'Administrative', 0, 'High', true),
  ('bea9274c-1266-4722-957a-b43333f04c64', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Confirm surfaces included', 'Planning', 1, 'High', true),
  ('bea9274c-1266-4722-957a-b43333f04c64', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Confirm colours', 'Client Communication', 2, 'High', true),
  ('bea9274c-1266-4722-957a-b43333f04c64', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Confirm sheen', 'Client Communication', 3, 'High', true),
  ('bea9274c-1266-4722-957a-b43333f04c64', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Confirm approved samples', 'Client Communication', 4, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'bd88d3a5-20d1-4d33-85a7-6a86810cfa81', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Procurement & Scheduling', 1, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'bd88d3a5-20d1-4d33-85a7-6a86810cfa81');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('bd88d3a5-20d1-4d33-85a7-6a86810cfa81', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Calculate quantities', 'Planning', 0, 'High', true),
  ('bd88d3a5-20d1-4d33-85a7-6a86810cfa81', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Procure primer', 'Procurement', 1, 'High', true),
  ('bd88d3a5-20d1-4d33-85a7-6a86810cfa81', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Procure paint', 'Procurement', 2, 'High', true),
  ('bd88d3a5-20d1-4d33-85a7-6a86810cfa81', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Procure consumables', 'Procurement', 3, 'Medium', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '3695d025-4515-41a5-b052-6fc9742f69f7', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Site Protection', 2, 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '3695d025-4515-41a5-b052-6fc9742f69f7');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('3695d025-4515-41a5-b052-6fc9742f69f7', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Confirm work-area access', 'Administrative', 0, 'Medium', true),
  ('3695d025-4515-41a5-b052-6fc9742f69f7', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Protect floors and fixtures', 'Site Work', 1, 'High', true),
  ('3695d025-4515-41a5-b052-6fc9742f69f7', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Move or protect furniture', 'Site Work', 2, 'Medium', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '8e723801-cfaa-46b7-874a-47bcb9ea8ddc', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Surface Preparation', 3, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '8e723801-cfaa-46b7-874a-47bcb9ea8ddc');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('8e723801-cfaa-46b7-874a-47bcb9ea8ddc', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Patch defects', 'Trade Work', 0, 'High', true),
  ('8e723801-cfaa-46b7-874a-47bcb9ea8ddc', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Caulk gaps', 'Trade Work', 1, 'Medium', true),
  ('8e723801-cfaa-46b7-874a-47bcb9ea8ddc', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Sand surfaces', 'Trade Work', 2, 'Medium', true),
  ('8e723801-cfaa-46b7-874a-47bcb9ea8ddc', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Clean surfaces', 'Trade Work', 3, 'Medium', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '8b9c7f4a-07e2-492e-81eb-d7051a59ee94', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Priming', 4, 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '8b9c7f4a-07e2-492e-81eb-d7051a59ee94');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('8b9c7f4a-07e2-492e-81eb-d7051a59ee94', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Apply primer', 'Trade Work', 0, 'High', true),
  ('8b9c7f4a-07e2-492e-81eb-d7051a59ee94', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Inspect primed surfaces', 'Quality Control', 1, 'High', true),
  ('8b9c7f4a-07e2-492e-81eb-d7051a59ee94', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Correct defects', 'Corrective Work', 2, 'Medium', false);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '9ea54862-8483-464b-a11a-7748a266d066', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Finish Coats', 5, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '9ea54862-8483-464b-a11a-7748a266d066');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('9ea54862-8483-464b-a11a-7748a266d066', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Apply first finish coat', 'Trade Work', 0, 'High', true),
  ('9ea54862-8483-464b-a11a-7748a266d066', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Inspect first coat', 'Quality Control', 1, 'High', true),
  ('9ea54862-8483-464b-a11a-7748a266d066', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Apply final coat', 'Trade Work', 2, 'High', true),
  ('9ea54862-8483-464b-a11a-7748a266d066', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Complete cut-line review', 'Quality Control', 3, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'ab68e24d-55f1-49c5-b9de-6e041db27f9a', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Touch-Ups, QC & Handover', 6, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'ab68e24d-55f1-49c5-b9de-6e041db27f9a');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('ab68e24d-55f1-49c5-b9de-6e041db27f9a', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Complete touch-ups', 'Trade Work', 0, 'High', true),
  ('ab68e24d-55f1-49c5-b9de-6e041db27f9a', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Remove protection', 'Site Work', 1, 'Medium', true),
  ('ab68e24d-55f1-49c5-b9de-6e041db27f9a', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Clean work area', 'Site Work', 2, 'Medium', true),
  ('ab68e24d-55f1-49c5-b9de-6e041db27f9a', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Complete lighting-condition QC', 'Quality Control', 3, 'High', true),
  ('ab68e24d-55f1-49c5-b9de-6e041db27f9a', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Complete client walkthrough', 'Client Communication', 4, 'High', true),
  ('ab68e24d-55f1-49c5-b9de-6e041db27f9a', 'd4e1e55d-5af9-4f1a-a2c0-8e8ad56fb76e', 'Record client handover', 'Handover', 5, 'High', true);

-- ============================================================
-- Flooring Installation
-- ============================================================
INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
SELECT 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Flooring Installation', 'Flooring supply and installation including substrate prep, installation, and trim.', 'Flooring', '1.0', true, 14
WHERE NOT EXISTS (SELECT 1 FROM public.project_templates WHERE id = 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e');

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'fa141241-7bd7-4ff6-9fbf-d236b1050c0b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Project Setup & Product Approval', 0, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'fa141241-7bd7-4ff6-9fbf-d236b1050c0b');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('fa141241-7bd7-4ff6-9fbf-d236b1050c0b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Confirm measured area', 'Planning', 0, 'High', true),
  ('fa141241-7bd7-4ff6-9fbf-d236b1050c0b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Confirm waste allowance', 'Planning', 1, 'Medium', true),
  ('fa141241-7bd7-4ff6-9fbf-d236b1050c0b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Confirm product', 'Client Communication', 2, 'High', true),
  ('fa141241-7bd7-4ff6-9fbf-d236b1050c0b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Confirm installation method', 'Planning', 3, 'High', true),
  ('fa141241-7bd7-4ff6-9fbf-d236b1050c0b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Confirm manufacturer requirements', 'Planning', 4, 'High', true),
  ('fa141241-7bd7-4ff6-9fbf-d236b1050c0b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Confirm acclimation requirements', 'Planning', 5, 'Medium', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '9b32016d-e1cc-4738-8f9b-a83eff9abc33', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Procurement & Delivery', 1, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '9b32016d-e1cc-4738-8f9b-a83eff9abc33');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('9b32016d-e1cc-4738-8f9b-a83eff9abc33', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Order flooring', 'Procurement', 0, 'High', true),
  ('9b32016d-e1cc-4738-8f9b-a83eff9abc33', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Order underlayment or barrier', 'Procurement', 1, 'Medium', false),
  ('9b32016d-e1cc-4738-8f9b-a83eff9abc33', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Order transitions and nosings', 'Procurement', 2, 'Medium', true),
  ('9b32016d-e1cc-4738-8f9b-a83eff9abc33', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Confirm delivery', 'Procurement', 3, 'High', true),
  ('9b32016d-e1cc-4738-8f9b-a83eff9abc33', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Inspect delivered material', 'Quality Control', 4, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '4840f149-6cee-4a3e-ba5a-485472b395bb', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Site Preparation', 2, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '4840f149-6cee-4a3e-ba5a-485472b395bb');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('4840f149-6cee-4a3e-ba5a-485472b395bb', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Remove existing flooring', 'Site Work', 0, 'High', false),
  ('4840f149-6cee-4a3e-ba5a-485472b395bb', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Confirm storage conditions', 'Administrative', 1, 'Medium', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '10f25596-d213-4eb3-a4af-30a125ca17dc', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Substrate Assessment & Correction', 3, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '10f25596-d213-4eb3-a4af-30a125ca17dc');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('10f25596-d213-4eb3-a4af-30a125ca17dc', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Inspect substrate', 'Inspection', 0, 'High', true),
  ('10f25596-d213-4eb3-a4af-30a125ca17dc', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Perform applicable moisture checks', 'Inspection', 1, 'High', true),
  ('10f25596-d213-4eb3-a4af-30a125ca17dc', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Correct substrate defects', 'Corrective Work', 2, 'High', false);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '91f866b9-9c9d-4ab8-b76c-a1f04a4a63fd', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Flooring Installation', 4, 4, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '91f866b9-9c9d-4ab8-b76c-a1f04a4a63fd');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('91f866b9-9c9d-4ab8-b76c-a1f04a4a63fd', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Confirm starting layout', 'Planning', 0, 'High', true),
  ('91f866b9-9c9d-4ab8-b76c-a1f04a4a63fd', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Install flooring', 'Trade Work', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'eb86943e-6268-4757-81ba-5153e2cf1b5b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Transitions, Trim & Finishing', 5, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'eb86943e-6268-4757-81ba-5153e2cf1b5b');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('eb86943e-6268-4757-81ba-5153e2cf1b5b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Install transitions', 'Trade Work', 0, 'High', true),
  ('eb86943e-6268-4757-81ba-5153e2cf1b5b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Install or reinstall baseboards', 'Trade Work', 1, 'Medium', true),
  ('eb86943e-6268-4757-81ba-5153e2cf1b5b', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Complete touch-ups', 'Trade Work', 2, 'Medium', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '95784143-64b5-451d-b2ae-b7612ec3a4b2', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Protection, QC & Handover', 6, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '95784143-64b5-451d-b2ae-b7612ec3a4b2');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('95784143-64b5-451d-b2ae-b7612ec3a4b2', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Protect completed flooring', 'Site Work', 0, 'Medium', true),
  ('95784143-64b5-451d-b2ae-b7612ec3a4b2', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Complete QC', 'Quality Control', 1, 'High', true),
  ('95784143-64b5-451d-b2ae-b7612ec3a4b2', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Complete client walkthrough', 'Client Communication', 2, 'High', true),
  ('95784143-64b5-451d-b2ae-b7612ec3a4b2', 'dbb73a8d-3b42-4e78-99b2-b5db619a7c5e', 'Record client handover', 'Handover', 3, 'High', true);

-- ============================================================
-- Insurance Rebuild
-- ============================================================
INSERT INTO public.project_templates (id, name, description, project_type, version, active, default_duration_days)
SELECT '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Insurance Rebuild', 'Post-loss reconstruction from emergency documentation through client handover.', 'Insurance', '1.0', true, 90
WHERE NOT EXISTS (SELECT 1 FROM public.project_templates WHERE id = '71a2130f-3276-40f3-9f13-b1a3d03bd7eb');

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '2e3a7765-d53f-4c0a-ba1e-1d0b9971e938', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Emergency Handoff & Documentation', 0, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '2e3a7765-d53f-4c0a-ba1e-1d0b9971e938');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('2e3a7765-d53f-4c0a-ba1e-1d0b9971e938', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Confirm loss information', 'Administrative', 0, 'High', true),
  ('2e3a7765-d53f-4c0a-ba1e-1d0b9971e938', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Confirm customer and adjuster contacts', 'Client Communication', 1, 'High', true),
  ('2e3a7765-d53f-4c0a-ba1e-1d0b9971e938', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Document pre-existing and loss-related conditions', 'Administrative', 2, 'High', true),
  ('2e3a7765-d53f-4c0a-ba1e-1d0b9971e938', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Photograph affected areas', 'Administrative', 3, 'High', true),
  ('2e3a7765-d53f-4c0a-ba1e-1d0b9971e938', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Confirm emergency work completed', 'Administrative', 4, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '46360736-b244-4e8f-ae7f-b4675f1c4388', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Scope, Estimate & Authorization', 1, 14, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '46360736-b244-4e8f-ae7f-b4675f1c4388');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('46360736-b244-4e8f-ae7f-b4675f1c4388', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Confirm authorized scope', 'Administrative', 0, 'High', true),
  ('46360736-b244-4e8f-ae7f-b4675f1c4388', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Prepare estimate', 'Administrative', 1, 'High', true),
  ('46360736-b244-4e8f-ae7f-b4675f1c4388', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Send estimate', 'Client Communication', 2, 'High', true),
  ('46360736-b244-4e8f-ae7f-b4675f1c4388', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Follow up with responsible parties', 'Client Communication', 3, 'High', true),
  ('46360736-b244-4e8f-ae7f-b4675f1c4388', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Record authorization', 'Administrative', 4, 'High', true),
  ('46360736-b244-4e8f-ae7f-b4675f1c4388', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Track scope revisions', 'Administrative', 5, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'd14b304e-c8a1-45f6-bac4-5f9454b9b459', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Hazardous-Material and Safety Review', 2, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'd14b304e-c8a1-45f6-bac4-5f9454b9b459');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('d14b304e-c8a1-45f6-bac4-5f9454b9b459', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Determine hazardous-material assessment requirements', 'Planning', 0, 'High', true),
  ('d14b304e-c8a1-45f6-bac4-5f9454b9b459', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Confirm whether qualified assessment is required', 'Planning', 1, 'High', true),
  ('d14b304e-c8a1-45f6-bac4-5f9454b9b459', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Complete required testing', 'Inspection', 2, 'High', false),
  ('d14b304e-c8a1-45f6-bac4-5f9454b9b459', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Receive abatement clearance', 'Administrative', 3, 'High', false);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'd088fe4c-c394-4e23-b311-674b1d344196', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Demolition & Stabilization', 3, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'd088fe4c-c394-4e23-b311-674b1d344196');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('d088fe4c-c394-4e23-b311-674b1d344196', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Complete demolition', 'Site Work', 0, 'High', true),
  ('d088fe4c-c394-4e23-b311-674b1d344196', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Confirm drying or remediation completion', 'Administrative', 1, 'High', true),
  ('d088fe4c-c394-4e23-b311-674b1d344196', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Record moisture-clearance documentation', 'Administrative', 2, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'c1a27e1f-f1cd-4ea8-8202-aac404182cfe', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Drying, Remediation or Abatement', 4, 14, false
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'c1a27e1f-f1cd-4ea8-8202-aac404182cfe');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('c1a27e1f-f1cd-4ea8-8202-aac404182cfe', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Set up drying equipment', 'Site Work', 0, 'High', true),
  ('c1a27e1f-f1cd-4ea8-8202-aac404182cfe', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Monitor moisture levels', 'Inspection', 1, 'High', true),
  ('c1a27e1f-f1cd-4ea8-8202-aac404182cfe', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Confirm clearance testing', 'Inspection', 2, 'High', false);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '9f7786a0-c11f-4145-8e0b-1dc6b6f3c0ce', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Reconstruction Planning & Procurement', 5, 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '9f7786a0-c11f-4145-8e0b-1dc6b6f3c0ce');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('9f7786a0-c11f-4145-8e0b-1dc6b6f3c0ce', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Confirm reconstruction scope', 'Planning', 0, 'High', true),
  ('9f7786a0-c11f-4145-8e0b-1dc6b6f3c0ce', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Order materials', 'Procurement', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'bb2b86bc-bd79-42c8-bce9-664c7ffe603b', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Rough Construction', 6, 14, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'bb2b86bc-bd79-42c8-bce9-664c7ffe603b');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('bb2b86bc-bd79-42c8-bce9-664c7ffe603b', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Framing', 'Trade Work', 0, 'High', true),
  ('bb2b86bc-bd79-42c8-bce9-664c7ffe603b', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Framing QC review', 'Quality Control', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'ed45e118-c16c-4526-8250-f39c0f727ec6', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Rough-In Trades & Inspections', 7, 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'ed45e118-c16c-4526-8250-f39c0f727ec6');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('ed45e118-c16c-4526-8250-f39c0f727ec6', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Plumbing/electrical/HVAC rough-in', 'Trade Work', 0, 'High', true),
  ('ed45e118-c16c-4526-8250-f39c0f727ec6', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Book and complete inspections', 'Inspection', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'a73e617c-fdec-41c3-8b77-0a78ea5776a1', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Insulation & Drywall', 8, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'a73e617c-fdec-41c3-8b77-0a78ea5776a1');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('a73e617c-fdec-41c3-8b77-0a78ea5776a1', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Install insulation', 'Trade Work', 0, 'High', true),
  ('a73e617c-fdec-41c3-8b77-0a78ea5776a1', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Install drywall', 'Trade Work', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT '734e5820-f245-4a05-a409-ec5497107948', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Interior Finishes', 9, 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = '734e5820-f245-4a05-a409-ec5497107948');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('734e5820-f245-4a05-a409-ec5497107948', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Paint', 'Trade Work', 0, 'High', true),
  ('734e5820-f245-4a05-a409-ec5497107948', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Flooring', 'Trade Work', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'e5a4304a-79dc-4749-885b-b25187e1aa02', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Fixtures, Millwork & Final Trades', 10, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'e5a4304a-79dc-4749-885b-b25187e1aa02');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('e5a4304a-79dc-4749-885b-b25187e1aa02', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Install fixtures', 'Trade Work', 0, 'High', true),
  ('e5a4304a-79dc-4749-885b-b25187e1aa02', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Install millwork and trim', 'Trade Work', 1, 'High', true);

INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'ae2876c1-5696-4d78-b554-0cd16a6eacea', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Deficiencies, Documentation & Handover', 11, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'ae2876c1-5696-4d78-b554-0cd16a6eacea');

INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('ae2876c1-5696-4d78-b554-0cd16a6eacea', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Complete internal QC', 'Quality Control', 0, 'High', true),
  ('ae2876c1-5696-4d78-b554-0cd16a6eacea', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Complete deficiencies', 'Corrective Work', 1, 'High', true),
  ('ae2876c1-5696-4d78-b554-0cd16a6eacea', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Compile documentation', 'Administrative', 2, 'High', true),
  ('ae2876c1-5696-4d78-b554-0cd16a6eacea', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Complete customer walkthrough', 'Client Communication', 3, 'High', true),
  ('ae2876c1-5696-4d78-b554-0cd16a6eacea', '71a2130f-3276-40f3-9f13-b1a3d03bd7eb', 'Record handover', 'Handover', 4, 'High', true);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
