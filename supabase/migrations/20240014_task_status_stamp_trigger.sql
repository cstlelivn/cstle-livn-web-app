-- =============================================================================
-- Migration: Move task status-timing stamps into the database (step 3).
--
-- Today this logic lives only in JS (src/app/src/features/tasks/api.ts's
-- updateTask): on a status change to 'In Progress' / 'Pending QC' /
-- 'Completed', it stamps started_at / submitted_at / completed_date. That's
-- fine as long as JS is the only thing that ever changes a task's status --
-- but the new work-session RPCs (20240016) also flip a task to 'In Progress'
-- when someone starts working, and need the exact same stamping to happen
-- for that path too. Rather than duplicate the rule in two places (which WILL
-- drift), this moves it into a single trigger every write path gets for free.
--
-- Behavior is an exact match of the current JS: stamp (overwrite) the
-- relevant timestamp with now() every time status transitions INTO that
-- value, whether or not it's the first time. The corresponding JS block is
-- removed from api.ts in this same step (see the paired code change) so
-- there is exactly one place this rule lives.
--
-- Safe to re-run: CREATE OR REPLACE / DROP TRIGGER IF EXISTS.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.stamp_task_status_timing()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'In Progress' THEN
      NEW.started_at := now();
    ELSIF NEW.status = 'Pending QC' THEN
      NEW.submitted_at := now();
    ELSIF NEW.status = 'Completed' THEN
      NEW.completed_date := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_task_status_timing ON public.tasks;
CREATE TRIGGER trg_stamp_task_status_timing
  BEFORE UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.stamp_task_status_timing();
