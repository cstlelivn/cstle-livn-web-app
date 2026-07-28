-- Undo an accidental archive click made while testing the Template Builder.
UPDATE public.project_templates SET active = true, updated_at = now()
WHERE name = 'Bathroom Remodel';
