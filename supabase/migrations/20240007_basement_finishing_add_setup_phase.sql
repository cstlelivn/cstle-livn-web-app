-- =============================================================================
-- Fix: the "Basement Finishing" (narrow) template had no Setup & Planning
-- phase at all -- it jumped straight into Priming & Painting. Client-selection
-- tasks (paint colour, flooring product, door/hardware) were sitting inside
-- their execution phases instead of being confirmed up front. Add a real
-- first phase and move those tasks into it, plus a site-readiness check.
-- =============================================================================

ALTER TABLE public.phase_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates DISABLE ROW LEVEL SECURITY;

-- Shift the 5 existing phases down to make room for a new first phase
UPDATE public.phase_templates
SET position = position + 1
WHERE project_template_id = '05540f93-f091-4d1b-beef-c1979852440f';

-- New "Project Setup & Planning" phase at position 0
INSERT INTO public.phase_templates (id, project_template_id, name, position, default_duration_days, required)
SELECT 'b0fcc49c-9c50-40b3-80f2-516c92465847', '05540f93-f091-4d1b-beef-c1979852440f', 'Project Setup & Planning', 0, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE id = 'b0fcc49c-9c50-40b3-80f2-516c92465847');

-- Move client-selection tasks out of their execution phases and into Setup
UPDATE public.task_templates
SET phase_template_id = 'b0fcc49c-9c50-40b3-80f2-516c92465847', position = 1
WHERE phase_template_id = '3314f02a-5733-402b-a657-283d4119c969'
  AND name = 'Confirm paint colours and sheen with client';

UPDATE public.task_templates
SET phase_template_id = 'b0fcc49c-9c50-40b3-80f2-516c92465847', position = 2
WHERE phase_template_id = '4d2fd1d9-b93c-4f59-8ca0-21b496e612ad'
  AND name = 'Confirm flooring product with client';

UPDATE public.task_templates
SET phase_template_id = 'b0fcc49c-9c50-40b3-80f2-516c92465847', position = 3
WHERE phase_template_id = '8f758ab7-9e03-4022-86a4-06107e2e18ad'
  AND name = 'Confirm door and hardware selections';

-- Round out the new Setup & Planning phase
INSERT INTO public.task_templates (phase_template_id, project_template_id, name, task_type, position, priority, required)
VALUES
  ('b0fcc49c-9c50-40b3-80f2-516c92465847', '05540f93-f091-4d1b-beef-c1979852440f', 'Confirm scope and exclusions', 'Administrative', 0, 'High', true),
  ('b0fcc49c-9c50-40b3-80f2-516c92465847', '05540f93-f091-4d1b-beef-c1979852440f', 'Confirm site is clean and ready for work to begin', 'Inspection', 4, 'High', true),
  ('b0fcc49c-9c50-40b3-80f2-516c92465847', '05540f93-f091-4d1b-beef-c1979852440f', 'Confirm schedule with client', 'Client Communication', 5, 'Medium', true);

ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
