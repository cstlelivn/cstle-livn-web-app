-- Keep assignment authority aligned with the existing Supervisor task-update
-- policy: a Supervisor may assign/unassign only on projects they supervise.
CREATE OR REPLACE FUNCTION public.can_manage_task_assignments(p_task_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = p_task_id
      AND p.status IS DISTINCT FROM 'Completed'
      AND (public.is_manager_or_admin() OR public.is_project_supervisor(t.project_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.assign_task_member(p_task_id uuid, p_team_member_id uuid)
RETURNS public.task_assignees
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_caller uuid; v_row public.task_assignees;
BEGIN
  IF NOT public.can_manage_task_assignments(p_task_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: only managers/admins or the project supervisor can assign tasks' USING ERRCODE = 'P0001';
  END IF;
  v_caller := public.current_team_member_id();
  INSERT INTO public.task_assignees (task_id, team_member_id, assigned_by, assigned_at, is_active)
  VALUES (p_task_id, p_team_member_id, v_caller, now(), true)
  ON CONFLICT (task_id, team_member_id) WHERE is_active DO NOTHING RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.task_assignees
    WHERE task_id = p_task_id AND team_member_id = p_team_member_id AND is_active;
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.unassign_task_member(p_task_id uuid, p_team_member_id uuid)
RETURNS public.task_assignees
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_row public.task_assignees; v_open_session public.task_work_sessions; v_last_event_at timestamptz; v_elapsed integer;
BEGIN
  IF NOT public.can_manage_task_assignments(p_task_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: only managers/admins or the project supervisor can unassign tasks' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.task_assignees SET is_active = false, unassigned_at = now()
  WHERE task_id = p_task_id AND team_member_id = p_team_member_id AND is_active RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'NOT_ASSIGNED: this person is not currently assigned to this task' USING ERRCODE = 'P0001';
  END IF;
  FOR v_open_session IN SELECT * FROM public.task_work_sessions
    WHERE task_id = p_task_id AND team_member_id = p_team_member_id AND status <> 'finished' FOR UPDATE
  LOOP
    v_elapsed := 0;
    IF v_open_session.status = 'running' THEN
      SELECT event_at INTO v_last_event_at FROM public.task_work_session_events
      WHERE session_id = v_open_session.id AND event_type IN ('start', 'resume') ORDER BY event_at DESC LIMIT 1;
      v_elapsed := GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(v_last_event_at, now())))::integer);
    END IF;
    UPDATE public.task_work_sessions SET status = 'finished', finished_at = now(),
      active_seconds = active_seconds + v_elapsed, completion_status = 'Reassigned', updated_at = now()
    WHERE id = v_open_session.id;
    INSERT INTO public.task_work_session_events (session_id, event_type, event_at, notes)
    VALUES (v_open_session.id, 'finish', now(), 'Auto-finished: removed from task');
  END LOOP;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_task_assignments(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_task_assignments(uuid) TO authenticated;
