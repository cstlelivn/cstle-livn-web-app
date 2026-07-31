-- Projects were never automatically moved out of "Planning" -- the only
-- write paths that ever touch projects.status are the completion gate
-- (Mark Complete / Force Complete). So a project where real work has clearly
-- started (tasks moving off "To Do") still read "Planning" forever, which
-- made the dashboard's "5 Planning . 0 In Progress" split misleading and
-- was the root cause of the "why is Active Projects wrong" report.
--
-- This adds a one-way bump: the first time any task on a project moves off
-- "To Do", the project flips from "Planning" to "In Progress" (if it's still
-- sitting in Planning). It never touches a project that's already
-- "In Progress" or "Completed", and it never moves anything TO "Completed"
-- -- that stays gated behind the existing explicit sign-off flow.
CREATE OR REPLACE FUNCTION public.bump_project_out_of_planning()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'To Do' AND (OLD.status IS NULL OR OLD.status = 'To Do') THEN
    UPDATE public.projects
    SET status = 'In Progress', updated_at = now()
    WHERE id = NEW.project_id AND status = 'Planning';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_project_out_of_planning ON public.tasks;
CREATE TRIGGER trg_bump_project_out_of_planning
  AFTER INSERT OR UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.bump_project_out_of_planning();

-- One-time backfill: any project currently stuck in "Planning" that already
-- has at least one task off "To Do" (i.e. real work already happened before
-- this trigger existed) gets corrected the same way, right now.
UPDATE public.projects p
SET status = 'In Progress', updated_at = now()
WHERE p.status = 'Planning'
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.project_id = p.id AND t.status IS DISTINCT FROM 'To Do'
  );
