-- Store the planned crew size supplied during task planning. This is a
-- planning value only; actual contributors remain in task_assignees and are
-- never inferred from this number.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS crew_required integer
  CHECK (crew_required IS NULL OR crew_required > 0);

