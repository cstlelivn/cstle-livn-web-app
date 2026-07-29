-- =============================================================================
-- Migration: Link a live task back to the task_template row it was cloned
-- from, so schedule changes (Gantt resize/move, Calendar drag) can offer to
-- save the new duration back to the template for future projects.
-- =============================================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_template_id uuid REFERENCES public.task_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_task_template_id ON public.tasks(task_template_id);
