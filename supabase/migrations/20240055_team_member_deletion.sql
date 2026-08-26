-- Lets a Super Admin/Admin/Manager actually delete a team member who has
-- real recorded history, instead of being permanently blocked by the
-- ON DELETE RESTRICT foreign keys added across earlier migrations
-- (task_assignees, task_work_sessions, task_aura_scores,
-- task_completion_attributions, task_time_corrections -- the exact set
-- surfaced by "Failed to delete team member" in the UI).
--
-- Explicit product decision, confirmed with the user:
--   - Active/incomplete task assignments move to a person the admin picks
--     at delete time (not auto-derived per project).
--   - Already-completed work (finished sessions, Aura scores, QC
--     attributions, time corrections) is NOT reassigned to that person --
--     doing so would fabricate who actually did the work and corrupt real
--     Aura performance numbers. Instead those historical rows are kept,
--     with the FK set to NULL and the deleted person's name snapshotted
--     into a new text column so the record stays readable after the
--     person is gone, without pretending someone else did that work.
--   - Deletion itself is deliberately layered behind the caller typing the
--     exact team member name to confirm (enforced in the frontend dialog,
--     not here) -- this migration only makes the underlying delete
--     actually succeed once that confirmation has happened.

-- 1) The five NOT NULL "who did this" FK columns must become nullable so a
--    historical row can survive its team member being deleted.
ALTER TABLE public.task_assignees ALTER COLUMN team_member_id DROP NOT NULL;
ALTER TABLE public.task_work_sessions ALTER COLUMN team_member_id DROP NOT NULL;
ALTER TABLE public.task_aura_scores ALTER COLUMN team_member_id DROP NOT NULL;
ALTER TABLE public.task_completion_attributions ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE public.task_time_corrections ALTER COLUMN corrected_by DROP NOT NULL;

-- 2) Snapshot columns -- only on tables where "who" is the actual
--    substance of the record (an assignee, a session worker, an Aura
--    subject, a QC attribution/recorder, a time correction). Purely
--    incidental audit columns (assigned_by, resolved_by, completed_by,
--    delay_reviewed_by, created_by/approved_by, requested_by,
--    marketing_saved_by) are just nulled out below with no snapshot --
--    losing "who assigned this" is acceptable, losing "who did the work"
--    is not.
ALTER TABLE public.task_assignees ADD COLUMN IF NOT EXISTS team_member_name_snapshot text;
ALTER TABLE public.task_work_sessions ADD COLUMN IF NOT EXISTS team_member_name_snapshot text;
ALTER TABLE public.task_aura_scores ADD COLUMN IF NOT EXISTS team_member_name_snapshot text;
ALTER TABLE public.task_completion_attributions ADD COLUMN IF NOT EXISTS team_member_name_snapshot text;
ALTER TABLE public.task_completion_attributions ADD COLUMN IF NOT EXISTS recorded_by_name_snapshot text;
ALTER TABLE public.task_time_corrections ADD COLUMN IF NOT EXISTS corrected_by_name_snapshot text;

-- 3) The actual delete-and-reassign RPC. Gated on Super Admin/Admin/Manager
--    directly via jwt_role() -- deliberately not reusing
--    is_manager_or_admin() (from 20240004), which only checks
--    ('Super Admin', 'Manager') and silently excludes Admin despite Admin
--    having the same canEditTeam permission as Manager in AuthContext.tsx.
--    That's a separate, pre-existing RLS-level gap (the same lockout
--    pattern already found and fixed in the edge function's hasPermission()
--    matrix) and is out of scope for this migration -- flagged, not fixed
--    here, since fixing it touches every policy that calls that helper.
CREATE OR REPLACE FUNCTION public.delete_team_member_and_reassign(
  p_team_member_id uuid,
  p_reassign_to uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_name text;
  v_reassign_name text;
  v_reassigned_count integer := 0;
  v_row public.task_assignees;
  v_open_session public.task_work_sessions;
  v_last_event_at timestamptz;
  v_elapsed integer;
BEGIN
  IF public.jwt_role() NOT IN ('Super Admin', 'Admin', 'Manager') THEN
    RAISE EXCEPTION 'FORBIDDEN: only Super Admin, Admin, or Manager can delete a team member' USING ERRCODE = 'P0001';
  END IF;

  IF p_team_member_id = p_reassign_to THEN
    RAISE EXCEPTION 'INVALID_REASSIGN_TARGET: cannot reassign a person''s tasks to themselves' USING ERRCODE = 'P0001';
  END IF;

  SELECT name INTO v_name FROM public.team_members WHERE id = p_team_member_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: team member does not exist' USING ERRCODE = 'P0001';
  END IF;

  SELECT name INTO v_reassign_name FROM public.team_members WHERE id = p_reassign_to AND active;
  IF v_reassign_name IS NULL THEN
    RAISE EXCEPTION 'INVALID_REASSIGN_TARGET: the person to reassign tasks to must be an active team member' USING ERRCODE = 'P0001';
  END IF;

  -- Move every active assignment to the reassign target. Finish any open
  -- timer session first (same handling as unassign_task_member in
  -- 20240032), then flip the assignment itself. If the target is already
  -- actively assigned to that same task, just deactivate the old row --
  -- uq_task_assignees_active forbids two active rows for the same
  -- (task_id, team_member_id)... actually forbids duplicate active rows
  -- per task+person, not per task, so re-pointing team_member_id is safe
  -- as long as the target doesn't already have an active row on that task.
  FOR v_row IN SELECT * FROM public.task_assignees WHERE team_member_id = p_team_member_id AND is_active FOR UPDATE LOOP
    FOR v_open_session IN SELECT * FROM public.task_work_sessions
      WHERE task_id = v_row.task_id AND team_member_id = p_team_member_id AND status <> 'finished' FOR UPDATE
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
        VALUES (v_open_session.id, 'finish', now(), 'Auto-finished: team member deleted and task reassigned');
    END LOOP;

    UPDATE public.task_assignees SET is_active = false, unassigned_at = now() WHERE id = v_row.id;

    IF NOT EXISTS (
      SELECT 1 FROM public.task_assignees WHERE task_id = v_row.task_id AND team_member_id = p_reassign_to AND is_active
    ) THEN
      INSERT INTO public.task_assignees (task_id, team_member_id, assigned_by, assigned_at, is_active)
        VALUES (v_row.task_id, p_reassign_to, public.current_team_member_id(), now(), true);
    END IF;

    v_reassigned_count := v_reassigned_count + 1;
  END LOOP;

  -- Historical/completed records: keep the row, snapshot the name, sever
  -- the link. Never reassigned to the new person -- that would fabricate
  -- who actually did the work.
  UPDATE public.task_assignees SET team_member_name_snapshot = v_name, team_member_id = NULL
    WHERE team_member_id = p_team_member_id;
  UPDATE public.task_assignees SET assigned_by = NULL WHERE assigned_by = p_team_member_id;

  UPDATE public.task_work_sessions SET team_member_name_snapshot = v_name, team_member_id = NULL
    WHERE team_member_id = p_team_member_id;
  UPDATE public.task_work_sessions SET delay_reviewed_by = NULL WHERE delay_reviewed_by = p_team_member_id;

  UPDATE public.task_aura_scores SET team_member_name_snapshot = v_name, team_member_id = NULL
    WHERE team_member_id = p_team_member_id;

  UPDATE public.task_completion_attributions SET team_member_name_snapshot = v_name, team_member_id = NULL
    WHERE team_member_id = p_team_member_id;
  UPDATE public.task_completion_attributions SET recorded_by_name_snapshot = v_name, recorded_by = NULL
    WHERE recorded_by = p_team_member_id;

  UPDATE public.task_time_corrections SET corrected_by_name_snapshot = v_name, corrected_by = NULL
    WHERE corrected_by = p_team_member_id;

  -- Purely incidental audit columns -- no snapshot needed.
  UPDATE public.task_updates SET team_member_id = NULL WHERE team_member_id = p_team_member_id;
  UPDATE public.task_updates SET resolved_by = NULL WHERE resolved_by = p_team_member_id;
  UPDATE public.task_checklist_items SET completed_by = NULL WHERE completed_by = p_team_member_id;
  UPDATE public.task_media SET marketing_saved_by = NULL WHERE marketing_saved_by = p_team_member_id;
  UPDATE public.task_dependencies SET created_by = NULL WHERE created_by = p_team_member_id;
  UPDATE public.task_tools SET created_by = NULL WHERE created_by = p_team_member_id;
  UPDATE public.task_tools SET approved_by = NULL WHERE approved_by = p_team_member_id;
  UPDATE public.task_materials SET created_by = NULL WHERE created_by = p_team_member_id;
  UPDATE public.task_materials SET approved_by = NULL WHERE approved_by = p_team_member_id;
  UPDATE public.ai_insight_reports SET requested_by = NULL WHERE requested_by = p_team_member_id;

  -- projects.supervisor_id is already ON DELETE SET NULL (20240035) --
  -- nothing to do here.

  DELETE FROM public.team_members WHERE id = p_team_member_id;

  RETURN jsonb_build_object('deletedName', v_name, 'reassignedTaskCount', v_reassigned_count, 'reassignedTo', v_reassign_name);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_team_member_and_reassign(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_team_member_and_reassign(uuid, uuid) TO authenticated;
