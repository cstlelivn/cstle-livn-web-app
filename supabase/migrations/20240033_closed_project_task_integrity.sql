-- A Completed project is a closed, read-only operational record.
-- Its tasks remain stored for history/Aura/audit, but no task may be created
-- or changed after closure. Normal closure requires every phase AND every
-- task to be complete; Super Admin force-complete remains the audited escape
-- hatch for exceptional legacy/external-work cases.

CREATE OR REPLACE FUNCTION public.reject_closed_project_task_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_status text;
BEGIN
  -- On UPDATE, check the old parent too: moving a historical task out of a
  -- closed project must not become a back door for changing it.
  IF TG_OP = 'UPDATE' THEN
    SELECT status INTO v_status FROM public.projects WHERE id = OLD.project_id FOR KEY SHARE;
    IF v_status = 'Completed' THEN
      RAISE EXCEPTION 'PROJECT_CLOSED: tasks cannot be moved or changed after project completion' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT status INTO v_status FROM public.projects WHERE id = NEW.project_id FOR KEY SHARE;
  IF v_status = 'Completed' THEN
    RAISE EXCEPTION 'PROJECT_CLOSED: tasks cannot be added or changed after project completion' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_closed_project_task_mutation ON public.tasks;
CREATE TRIGGER trg_reject_closed_project_task_mutation
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.reject_closed_project_task_mutation();

-- Assignment rows are a separate table, so protect that path independently
-- (including direct writes that bypass the normal assignment RPC).
CREATE OR REPLACE FUNCTION public.reject_closed_project_assignment_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_status text; v_task_id uuid;
BEGIN
  v_task_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.task_id ELSE NEW.task_id END;
  SELECT p.status INTO v_status
  FROM public.tasks t JOIN public.projects p ON p.id = t.project_id
  WHERE t.id = v_task_id
  FOR KEY SHARE OF p;
  IF v_status = 'Completed' THEN
    RAISE EXCEPTION 'PROJECT_CLOSED: task assignments cannot change after project completion' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_closed_project_assignment_mutation ON public.task_assignees;
CREATE TRIGGER trg_reject_closed_project_assignment_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.task_assignees
  FOR EACH ROW EXECUTE FUNCTION public.reject_closed_project_assignment_mutation();

CREATE OR REPLACE FUNCTION public.enforce_project_completion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  total_phase_count integer;
  incomplete_phase_count integer;
  incomplete_task_count integer;
  is_forcing boolean := false;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'Completed' THEN
    RAISE EXCEPTION 'Projects must be created open and completed through the close-out workflow';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'Completed' AND NEW.status IS DISTINCT FROM 'Completed' THEN
      RAISE EXCEPTION 'PROJECT_CLOSED: a completed project cannot be reopened through a status edit' USING ERRCODE = 'P0001';
    END IF;
    is_forcing := NEW.force_completed IS TRUE AND (OLD.force_completed IS DISTINCT FROM TRUE);
  END IF;

  IF is_forcing AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only a Super Admin can force-complete a project';
  END IF;
  IF is_forcing AND (NEW.force_completed_reason IS NULL OR btrim(NEW.force_completed_reason) = '') THEN
    RAISE EXCEPTION 'A reason is required to force-complete a project';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.status = 'Completed'
     AND OLD.status IS DISTINCT FROM 'Completed'
     AND NOT NEW.force_completed THEN
    SELECT count(*), count(*) FILTER (WHERE status IS DISTINCT FROM 'Completed')
      INTO total_phase_count, incomplete_phase_count
    FROM public.project_phases
    WHERE project_id = NEW.id;

    SELECT count(*) INTO incomplete_task_count
    FROM public.tasks
    WHERE project_id = NEW.id AND status IS DISTINCT FROM 'Completed';

    IF total_phase_count = 0 THEN
      RAISE EXCEPTION 'Cannot complete project: at least one project phase is required';
    END IF;
    IF incomplete_phase_count > 0 OR incomplete_task_count > 0 THEN
      RAISE EXCEPTION 'Cannot complete project: % phase(s) and % task(s) are not completed',
        incomplete_phase_count, incomplete_task_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_completion ON public.projects;
CREATE TRIGGER trg_enforce_project_completion
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_completion();
