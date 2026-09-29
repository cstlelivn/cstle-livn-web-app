-- A schedule is one connected plan: moving a task due date moves all later
-- unfinished work, later phases, and the project finish by the same number of
-- calendar days. This is deliberately due-date driven so changing a task's
-- duration from the left edge does not unexpectedly move the project.

CREATE OR REPLACE FUNCTION public.cascade_task_due_date_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_delta integer;
  v_phase_position integer;
  v_tasks_shifted integer := 0;
  v_phases_shifted integer := 0;
BEGIN
  -- Updates issued by this function must not start another cascade.
  IF pg_trigger_depth()>1 OR OLD.due_date IS NULL OR NEW.due_date IS NULL OR OLD.due_date=NEW.due_date THEN
    RETURN NEW;
  END IF;

  IF NOT public.can_manage_task_planning(OLD.id) THEN
    RAISE EXCEPTION 'SCHEDULE_PERMISSION_REQUIRED: only an Admin, Manager, or this project''s Supervisor can change task dates'
      USING ERRCODE='P0001';
  END IF;

  v_delta := NEW.due_date::date-OLD.due_date::date;
  SELECT position INTO v_phase_position FROM public.project_phases WHERE id=OLD.phase_id;
  IF v_phase_position IS NULL THEN RETURN NEW; END IF;

  -- Later tasks are determined by the explicit project sequence. When old
  -- records have no sequence, their schedule date provides the fallback.
  UPDATE public.tasks t SET
    start_date=CASE WHEN t.start_date IS NULL THEN NULL ELSE t.start_date+v_delta END,
    due_date=CASE WHEN t.due_date IS NULL THEN NULL ELSE t.due_date+(v_delta*interval '1 day') END,
    updated_at=now()
  FROM public.project_phases pp
  WHERE t.phase_id=pp.id
    AND t.project_id=OLD.project_id
    AND t.id<>OLD.id
    AND t.status IS DISTINCT FROM 'Completed'
    AND (
      pp.position>v_phase_position
      OR (
        pp.id=OLD.phase_id AND (
          (OLD.sequence IS NOT NULL AND t.sequence IS NOT NULL AND t.sequence>OLD.sequence)
          OR ((OLD.sequence IS NULL OR t.sequence IS NULL) AND coalesce(t.start_date,t.due_date)>OLD.due_date)
        )
      )
    );
  GET DIAGNOSTICS v_tasks_shifted=ROW_COUNT;

  -- Extend/contract the current phase at its end, then move every later
  -- unfinished phase as a unit so its original duration is preserved.
  UPDATE public.project_phases SET
    end_date=CASE WHEN end_date IS NULL THEN NULL ELSE end_date+v_delta END,
    updated_at=now()
  WHERE id=OLD.phase_id;

  UPDATE public.project_phases SET
    start_date=CASE WHEN start_date IS NULL THEN NULL ELSE start_date+v_delta END,
    end_date=CASE WHEN end_date IS NULL THEN NULL ELSE end_date+v_delta END,
    updated_at=now()
  WHERE project_id=OLD.project_id AND position>v_phase_position AND status<>'Completed';
  GET DIAGNOSTICS v_phases_shifted=ROW_COUNT;

  UPDATE public.projects SET
    end_date=CASE WHEN end_date IS NULL THEN NULL ELSE end_date+(v_delta*interval '1 day') END,
    updated_at=now()
  WHERE id=OLD.project_id;

  INSERT INTO public.project_activity_log(
    project_id,user_id,action,object_type,object_id,prev_value,new_value,reason,created_at
  ) VALUES (
    OLD.project_id,auth.uid(),'schedule_cascade','task',OLD.id,
    jsonb_build_object('due_date',OLD.due_date),
    jsonb_build_object('due_date',NEW.due_date,'day_delta',v_delta,'tasks_shifted',v_tasks_shifted,'phases_shifted',v_phases_shifted),
    format('Task due date changed by %s day(s); remaining project schedule shifted automatically',v_delta),now()
  );

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_cascade_task_due_date_change ON public.tasks;
CREATE TRIGGER trg_cascade_task_due_date_change
AFTER UPDATE OF due_date ON public.tasks
FOR EACH ROW
WHEN (OLD.due_date IS DISTINCT FROM NEW.due_date)
EXECUTE FUNCTION public.cascade_task_due_date_change();
