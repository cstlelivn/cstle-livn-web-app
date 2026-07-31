-- =============================================================================
-- Migration: Work-session RLS + RPCs (step 5 of the time-tracking feature).
--
-- Direct table writes to task_work_sessions/task_work_session_events are
-- restricted to managers/admins (manual corrections only). Every normal
-- write goes through one of the SECURITY DEFINER functions below, which is
-- what actually enforces "you can only touch your own timer" and "no
-- inventing arbitrary elapsed time" -- RLS alone can only restrict which
-- rows a direct write could touch, not which state transitions are valid or
-- which columns a client may set, so the state machine has to live here,
-- not in a policy.
--
-- All four session-mutating functions accept a client-generated
-- p_client_event_id: retrying the exact same action (e.g. after a network
-- drop, or replaying a queued offline action) is a safe no-op that returns
-- the already-resulting state instead of erroring or double-counting time.
-- They also accept p_client_event_at so an offline-queued action can be
-- recorded with the real time it happened, not the time it happened to
-- sync -- clamped and flagged (clock_suspect) if a device's clock looks
-- wrong, never silently trusted into a negative or huge time span.
--
-- Safe to re-run: CREATE OR REPLACE / DROP POLICY IF EXISTS throughout.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helpers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_team_performance() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager', 'Accountant');
$$;

CREATE OR REPLACE FUNCTION public.current_team_member_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 1. RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE public.task_work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_work_session_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_work_sessions_select ON public.task_work_sessions;
DROP POLICY IF EXISTS task_work_sessions_insert ON public.task_work_sessions;
DROP POLICY IF EXISTS task_work_sessions_update ON public.task_work_sessions;
DROP POLICY IF EXISTS task_work_sessions_delete ON public.task_work_sessions;

CREATE POLICY task_work_sessions_select ON public.task_work_sessions FOR SELECT
  USING (
    public.is_manager_or_admin()
    OR public.can_approve_task_qc()
    OR public.can_view_team_performance()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = task_work_sessions.team_member_id AND tm.auth_user_id = auth.uid()
    )
  );

CREATE POLICY task_work_sessions_insert ON public.task_work_sessions FOR INSERT
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY task_work_sessions_update ON public.task_work_sessions FOR UPDATE
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY task_work_sessions_delete ON public.task_work_sessions FOR DELETE
  USING (public.is_manager_or_admin());

DROP POLICY IF EXISTS task_work_session_events_select ON public.task_work_session_events;
DROP POLICY IF EXISTS task_work_session_events_insert ON public.task_work_session_events;
DROP POLICY IF EXISTS task_work_session_events_update ON public.task_work_session_events;
DROP POLICY IF EXISTS task_work_session_events_delete ON public.task_work_session_events;

CREATE POLICY task_work_session_events_select ON public.task_work_session_events FOR SELECT
  USING (
    public.is_manager_or_admin()
    OR public.can_approve_task_qc()
    OR public.can_view_team_performance()
    OR EXISTS (
      SELECT 1 FROM public.task_work_sessions s
      JOIN public.team_members tm ON tm.id = s.team_member_id
      WHERE s.id = task_work_session_events.session_id AND tm.auth_user_id = auth.uid()
    )
  );

CREATE POLICY task_work_session_events_insert ON public.task_work_session_events FOR INSERT
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY task_work_session_events_update ON public.task_work_session_events FOR UPDATE
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY task_work_session_events_delete ON public.task_work_session_events FOR DELETE
  USING (public.is_manager_or_admin());

-- ---------------------------------------------------------------------------
-- 2. start_work_session
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_work_session(
  p_task_id uuid,
  p_client_event_id uuid,
  p_client_event_at timestamptz DEFAULT now()
) RETURNS public.task_work_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_member_id uuid;
  v_project_id uuid;
  v_session public.task_work_sessions;
  v_event_at timestamptz;
  v_clock_suspect boolean := false;
  v_existing_session_id uuid;
BEGIN
  v_member_id := public.current_team_member_id();
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'NO_TEAM_MEMBER: no roster entry is linked to this login' USING ERRCODE = 'P0001';
  END IF;

  IF p_client_event_id IS NOT NULL THEN
    SELECT session_id INTO v_existing_session_id FROM public.task_work_session_events WHERE client_event_id = p_client_event_id;
    IF v_existing_session_id IS NOT NULL THEN
      SELECT * INTO v_session FROM public.task_work_sessions WHERE id = v_existing_session_id;
      RETURN v_session;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = p_task_id AND ta.team_member_id = v_member_id AND ta.is_active
  ) THEN
    RAISE EXCEPTION 'NOT_ASSIGNED: you are not an active assignee of this task' USING ERRCODE = 'P0001';
  END IF;

  SELECT project_id INTO v_project_id FROM public.tasks WHERE id = p_task_id;
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'TASK_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  v_clock_suspect := p_client_event_at IS NOT NULL AND p_client_event_at > now() + interval '5 minutes';
  v_event_at := LEAST(COALESCE(p_client_event_at, now()), now() + interval '5 minutes');

  BEGIN
    INSERT INTO public.task_work_sessions (task_id, project_id, team_member_id, status, started_at, clock_suspect)
    VALUES (p_task_id, v_project_id, v_member_id, 'running', v_event_at, v_clock_suspect)
    RETURNING * INTO v_session;
  EXCEPTION WHEN unique_violation THEN
    -- Same person already has an open session on this task (e.g. a second
    -- device raced in before the first synced) -- hand back the existing
    -- session instead of erroring, so the caller just resumes it.
    SELECT * INTO v_session FROM public.task_work_sessions
    WHERE task_id = p_task_id AND team_member_id = v_member_id AND status <> 'finished'
    LIMIT 1;
    RETURN v_session;
  END;

  INSERT INTO public.task_work_session_events (session_id, event_type, event_at, client_event_id, is_offline_created)
  VALUES (v_session.id, 'start', v_event_at, p_client_event_id, p_client_event_at IS NOT NULL AND p_client_event_at < now() - interval '1 minute')
  ON CONFLICT (client_event_id) DO NOTHING;

  UPDATE public.tasks SET status = 'In Progress' WHERE id = p_task_id AND status = 'To Do';

  RETURN v_session;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. pause_work_session
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pause_work_session(
  p_session_id uuid,
  p_client_event_id uuid,
  p_client_event_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL,
  p_delay_reason text DEFAULT NULL,
  p_blocker text DEFAULT NULL
) RETURNS public.task_work_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_member_id uuid;
  v_session public.task_work_sessions;
  v_last_event_at timestamptz;
  v_event_at timestamptz;
  v_elapsed integer;
  v_clock_suspect boolean := false;
  v_existing_session_id uuid;
BEGIN
  v_member_id := public.current_team_member_id();

  IF p_client_event_id IS NOT NULL THEN
    SELECT session_id INTO v_existing_session_id FROM public.task_work_session_events WHERE client_event_id = p_client_event_id;
    IF v_existing_session_id IS NOT NULL THEN
      SELECT * INTO v_session FROM public.task_work_sessions WHERE id = v_existing_session_id;
      RETURN v_session;
    END IF;
  END IF;

  SELECT * INTO v_session FROM public.task_work_sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_session.team_member_id IS DISTINCT FROM v_member_id THEN
    RAISE EXCEPTION 'NOT_OWNER: this is not your session' USING ERRCODE = 'P0001';
  END IF;
  IF v_session.status <> 'running' THEN
    RAISE EXCEPTION 'WRONG_STATE: session is % , not running', v_session.status USING ERRCODE = 'P0001';
  END IF;

  SELECT event_at INTO v_last_event_at FROM public.task_work_session_events
  WHERE session_id = v_session.id AND event_type IN ('start', 'resume')
  ORDER BY event_at DESC LIMIT 1;

  v_clock_suspect := p_client_event_at IS NOT NULL AND p_client_event_at > now() + interval '5 minutes';
  v_event_at := LEAST(COALESCE(p_client_event_at, now()), now() + interval '5 minutes');
  IF v_last_event_at IS NOT NULL AND v_event_at < v_last_event_at THEN
    v_clock_suspect := true;
    v_event_at := v_last_event_at;
  END IF;

  v_elapsed := GREATEST(0, EXTRACT(EPOCH FROM (v_event_at - COALESCE(v_last_event_at, v_event_at)))::integer);

  UPDATE public.task_work_sessions
  SET status = 'paused',
      active_seconds = active_seconds + v_elapsed,
      notes = COALESCE(p_notes, notes),
      delay_reason = COALESCE(p_delay_reason, delay_reason),
      blocker = COALESCE(p_blocker, blocker),
      clock_suspect = clock_suspect OR v_clock_suspect,
      updated_at = now()
  WHERE id = v_session.id
  RETURNING * INTO v_session;

  INSERT INTO public.task_work_session_events (session_id, event_type, event_at, notes, delay_reason, blocker, client_event_id, is_offline_created)
  VALUES (v_session.id, 'pause', v_event_at, p_notes, p_delay_reason, p_blocker, p_client_event_id, p_client_event_at IS NOT NULL AND p_client_event_at < now() - interval '1 minute')
  ON CONFLICT (client_event_id) DO NOTHING;

  RETURN v_session;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. resume_work_session
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resume_work_session(
  p_session_id uuid,
  p_client_event_id uuid,
  p_client_event_at timestamptz DEFAULT now()
) RETURNS public.task_work_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_member_id uuid;
  v_session public.task_work_sessions;
  v_event_at timestamptz;
  v_clock_suspect boolean := false;
  v_existing_session_id uuid;
BEGIN
  v_member_id := public.current_team_member_id();

  IF p_client_event_id IS NOT NULL THEN
    SELECT session_id INTO v_existing_session_id FROM public.task_work_session_events WHERE client_event_id = p_client_event_id;
    IF v_existing_session_id IS NOT NULL THEN
      SELECT * INTO v_session FROM public.task_work_sessions WHERE id = v_existing_session_id;
      RETURN v_session;
    END IF;
  END IF;

  SELECT * INTO v_session FROM public.task_work_sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_session.team_member_id IS DISTINCT FROM v_member_id THEN
    RAISE EXCEPTION 'NOT_OWNER: this is not your session' USING ERRCODE = 'P0001';
  END IF;
  IF v_session.status <> 'paused' THEN
    RAISE EXCEPTION 'WRONG_STATE: session is %, not paused', v_session.status USING ERRCODE = 'P0001';
  END IF;

  v_clock_suspect := p_client_event_at IS NOT NULL AND p_client_event_at > now() + interval '5 minutes';
  v_event_at := LEAST(COALESCE(p_client_event_at, now()), now() + interval '5 minutes');

  UPDATE public.task_work_sessions
  SET status = 'running', clock_suspect = clock_suspect OR v_clock_suspect, updated_at = now()
  WHERE id = v_session.id
  RETURNING * INTO v_session;

  INSERT INTO public.task_work_session_events (session_id, event_type, event_at, client_event_id, is_offline_created)
  VALUES (v_session.id, 'resume', v_event_at, p_client_event_id, p_client_event_at IS NOT NULL AND p_client_event_at < now() - interval '1 minute')
  ON CONFLICT (client_event_id) DO NOTHING;

  RETURN v_session;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. finish_work_session
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finish_work_session(
  p_session_id uuid,
  p_client_event_id uuid,
  p_client_event_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL,
  p_completion_status text DEFAULT 'Completed'
) RETURNS public.task_work_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_member_id uuid;
  v_session public.task_work_sessions;
  v_last_event_at timestamptz;
  v_event_at timestamptz;
  v_elapsed integer := 0;
  v_clock_suspect boolean := false;
  v_existing_session_id uuid;
BEGIN
  v_member_id := public.current_team_member_id();

  IF p_client_event_id IS NOT NULL THEN
    SELECT session_id INTO v_existing_session_id FROM public.task_work_session_events WHERE client_event_id = p_client_event_id;
    IF v_existing_session_id IS NOT NULL THEN
      SELECT * INTO v_session FROM public.task_work_sessions WHERE id = v_existing_session_id;
      RETURN v_session;
    END IF;
  END IF;

  SELECT * INTO v_session FROM public.task_work_sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_session.team_member_id IS DISTINCT FROM v_member_id THEN
    RAISE EXCEPTION 'NOT_OWNER: this is not your session' USING ERRCODE = 'P0001';
  END IF;
  IF v_session.status = 'finished' THEN
    RAISE EXCEPTION 'WRONG_STATE: session is already finished' USING ERRCODE = 'P0001';
  END IF;

  v_clock_suspect := p_client_event_at IS NOT NULL AND p_client_event_at > now() + interval '5 minutes';
  v_event_at := LEAST(COALESCE(p_client_event_at, now()), now() + interval '5 minutes');

  IF v_session.status = 'running' THEN
    SELECT event_at INTO v_last_event_at FROM public.task_work_session_events
    WHERE session_id = v_session.id AND event_type IN ('start', 'resume')
    ORDER BY event_at DESC LIMIT 1;
    IF v_last_event_at IS NOT NULL AND v_event_at < v_last_event_at THEN
      v_clock_suspect := true;
      v_event_at := v_last_event_at;
    END IF;
    v_elapsed := GREATEST(0, EXTRACT(EPOCH FROM (v_event_at - COALESCE(v_last_event_at, v_event_at)))::integer);
  END IF;

  UPDATE public.task_work_sessions
  SET status = 'finished',
      finished_at = v_event_at,
      active_seconds = active_seconds + v_elapsed,
      notes = COALESCE(p_notes, notes),
      completion_status = COALESCE(p_completion_status, 'Completed'),
      clock_suspect = clock_suspect OR v_clock_suspect,
      updated_at = now()
  WHERE id = v_session.id
  RETURNING * INTO v_session;

  INSERT INTO public.task_work_session_events (session_id, event_type, event_at, notes, client_event_id, is_offline_created)
  VALUES (v_session.id, 'finish', v_event_at, p_notes, p_client_event_id, p_client_event_at IS NOT NULL AND p_client_event_at < now() - interval '1 minute')
  ON CONFLICT (client_event_id) DO NOTHING;

  RETURN v_session;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. assign_task_member / unassign_task_member
--    (superseding direct task_assignees writes as the normal app path --
--    unassign needs to know about sessions, which is why these live here
--    rather than back in 20240013.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_task_member(p_task_id uuid, p_team_member_id uuid)
RETURNS public.task_assignees
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_caller uuid;
  v_row public.task_assignees;
BEGIN
  IF NOT public.is_manager_or_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: only managers/admins can assign tasks' USING ERRCODE = 'P0001';
  END IF;
  v_caller := public.current_team_member_id();

  INSERT INTO public.task_assignees (task_id, team_member_id, assigned_by, assigned_at, is_active)
  VALUES (p_task_id, p_team_member_id, v_caller, now(), true)
  ON CONFLICT (task_id, team_member_id) WHERE is_active DO NOTHING
  RETURNING * INTO v_row;

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
DECLARE
  v_row public.task_assignees;
  v_open_session public.task_work_sessions;
  v_last_event_at timestamptz;
  v_elapsed integer;
BEGIN
  IF NOT public.is_manager_or_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: only managers/admins can unassign tasks' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.task_assignees
  SET is_active = false, unassigned_at = now()
  WHERE task_id = p_task_id AND team_member_id = p_team_member_id AND is_active
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'NOT_ASSIGNED: this person is not currently assigned to this task' USING ERRCODE = 'P0001';
  END IF;

  -- Auto-finalize any open (running or paused) session for this person on
  -- this task so it doesn't dangle after they're removed.
  FOR v_open_session IN
    SELECT * FROM public.task_work_sessions
    WHERE task_id = p_task_id AND team_member_id = p_team_member_id AND status <> 'finished'
    FOR UPDATE
  LOOP
    v_elapsed := 0;
    IF v_open_session.status = 'running' THEN
      SELECT event_at INTO v_last_event_at FROM public.task_work_session_events
      WHERE session_id = v_open_session.id AND event_type IN ('start', 'resume')
      ORDER BY event_at DESC LIMIT 1;
      v_elapsed := GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(v_last_event_at, now())))::integer);
    END IF;

    UPDATE public.task_work_sessions
    SET status = 'finished',
        finished_at = now(),
        active_seconds = active_seconds + v_elapsed,
        completion_status = 'Reassigned',
        updated_at = now()
    WHERE id = v_open_session.id;

    INSERT INTO public.task_work_session_events (session_id, event_type, event_at, notes)
    VALUES (v_open_session.id, 'finish', now(), 'Auto-finished: removed from task');
  END LOOP;

  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Lock down execution to logged-in users only.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.start_work_session(uuid, uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pause_work_session(uuid, uuid, timestamptz, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resume_work_session(uuid, uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finish_work_session(uuid, uuid, timestamptz, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_task_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unassign_task_member(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_work_session(uuid, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pause_work_session(uuid, uuid, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_work_session(uuid, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_work_session(uuid, uuid, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_task_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unassign_task_member(uuid, uuid) TO authenticated;
