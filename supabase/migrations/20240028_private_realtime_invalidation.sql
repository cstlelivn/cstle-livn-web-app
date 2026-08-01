-- Private, ID-only Realtime Broadcast invalidations for tasks and projects.
-- Run manually before deploying the matching frontend.

-- Clients may receive the company topic only when their signed JWT role is
-- already allowed broad project visibility. Field workers may receive only
-- their own per-auth-user topic. Postgres RLS still authorizes the targeted
-- row fetch that follows every invalidation.
DROP POLICY IF EXISTS cstle_private_broadcast_read ON realtime.messages;
CREATE POLICY cstle_private_broadcast_read
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'broadcast'
  AND (
    ((SELECT realtime.topic()) = 'organization:cstle' AND public.is_broad_project_viewer())
    OR (SELECT realtime.topic()) = 'associate:' || auth.uid()::text
  )
);

CREATE OR REPLACE FUNCTION public.send_cstle_invalidation(
  p_topic text,
  p_event text,
  p_payload jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime
AS $$
BEGIN
  PERFORM realtime.send(p_payload, p_event, p_topic, true);
END;
$$;

REVOKE ALL ON FUNCTION public.send_cstle_invalidation(text, text, jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.broadcast_task_invalidation() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime
AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_payload jsonb;
  v_auth_user_id uuid;
  v_new_assignee uuid;
  v_old_assignee uuid;
BEGIN
  v_task := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  IF TG_OP <> 'DELETE' THEN v_new_assignee := NEW.assignee_id; END IF;
  IF TG_OP <> 'INSERT' THEN v_old_assignee := OLD.assignee_id; END IF;
  v_payload := jsonb_build_object(
    'entity', 'task',
    'id', v_task.id,
    'project_id', v_task.project_id,
    'operation', TG_OP,
    'updated_at', COALESCE(v_task.updated_at, now())
  );

  PERFORM public.send_cstle_invalidation('organization:cstle', 'entity_changed', v_payload);

  FOR v_auth_user_id IN
    SELECT DISTINCT auth_user_id
    FROM (
      SELECT tm.auth_user_id
      FROM public.team_members tm
      WHERE tm.id IN (v_new_assignee, v_old_assignee)
      UNION ALL
      SELECT tm.auth_user_id
      FROM public.task_assignees ta
      JOIN public.team_members tm ON tm.id = ta.team_member_id
      WHERE ta.task_id = v_task.id AND ta.is_active
      UNION ALL
      SELECT tm.auth_user_id
      FROM public.projects p
      JOIN public.team_members tm ON tm.id = p.supervisor_id
      WHERE p.id = v_task.project_id
    ) scoped_users
    WHERE auth_user_id IS NOT NULL
  LOOP
    PERFORM public.send_cstle_invalidation(
      'associate:' || v_auth_user_id::text,
      'entity_changed',
      v_payload
    );
  END LOOP;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- DELETE runs before the row disappears so assignment history is still
-- available when determining which private user topics must be notified.
DROP TRIGGER IF EXISTS trg_broadcast_task_change ON public.tasks;
DROP TRIGGER IF EXISTS trg_broadcast_task_delete ON public.tasks;
CREATE TRIGGER trg_broadcast_task_change
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_task_invalidation();
CREATE TRIGGER trg_broadcast_task_delete
  BEFORE DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_task_invalidation();

CREATE OR REPLACE FUNCTION public.broadcast_assignment_invalidation() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime
AS $$
DECLARE
  v_assignment public.task_assignees%ROWTYPE;
  v_task public.tasks%ROWTYPE;
  v_payload jsonb;
  v_auth_user_id uuid;
  v_new_member_id uuid;
  v_old_member_id uuid;
BEGIN
  v_assignment := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  IF TG_OP <> 'DELETE' THEN v_new_member_id := NEW.team_member_id; END IF;
  IF TG_OP <> 'INSERT' THEN v_old_member_id := OLD.team_member_id; END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = v_assignment.task_id;
  IF NOT FOUND THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  v_payload := jsonb_build_object(
    'entity', 'task',
    'id', v_task.id,
    'project_id', v_task.project_id,
    'operation', 'UPDATE',
    'updated_at', COALESCE(v_task.updated_at, now())
  );
  PERFORM public.send_cstle_invalidation('organization:cstle', 'entity_changed', v_payload);

  FOR v_auth_user_id IN
    SELECT DISTINCT tm.auth_user_id
    FROM public.team_members tm
    WHERE tm.auth_user_id IS NOT NULL
      AND tm.id IN (v_new_member_id, v_old_member_id)
  LOOP
    PERFORM public.send_cstle_invalidation(
      'associate:' || v_auth_user_id::text,
      'entity_changed',
      v_payload
    );
  END LOOP;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_assignment_change ON public.task_assignees;
CREATE TRIGGER trg_broadcast_assignment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.task_assignees
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_assignment_invalidation();

CREATE OR REPLACE FUNCTION public.broadcast_project_invalidation() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, realtime
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_payload jsonb;
  v_auth_user_id uuid;
BEGIN
  v_project := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  v_payload := jsonb_build_object(
    'entity', 'project',
    'id', v_project.id,
    'project_id', v_project.id,
    'operation', TG_OP,
    'updated_at', COALESCE(v_project.updated_at, now())
  );
  PERFORM public.send_cstle_invalidation('organization:cstle', 'entity_changed', v_payload);

  FOR v_auth_user_id IN
    SELECT DISTINCT auth_user_id
    FROM (
      SELECT tm.auth_user_id
      FROM public.tasks t
      LEFT JOIN public.task_assignees ta ON ta.task_id = t.id AND ta.is_active
      JOIN public.team_members tm ON tm.id = COALESCE(ta.team_member_id, t.assignee_id)
      WHERE t.project_id = v_project.id
      UNION ALL
      SELECT tm.auth_user_id
      FROM public.team_members tm
      WHERE tm.id = v_project.supervisor_id
    ) scoped_users
    WHERE auth_user_id IS NOT NULL
  LOOP
    PERFORM public.send_cstle_invalidation(
      'associate:' || v_auth_user_id::text,
      'entity_changed',
      v_payload
    );
  END LOOP;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_project_change ON public.projects;
DROP TRIGGER IF EXISTS trg_broadcast_project_delete ON public.projects;
CREATE TRIGGER trg_broadcast_project_change
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_project_invalidation();
CREATE TRIGGER trg_broadcast_project_delete
  BEFORE DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_project_invalidation();

NOTIFY pgrst, 'reload schema';
