-- Lets a Super Admin actually delete a project that has real recorded
-- history (task assignments, timer sessions, Aura scores, QC records) --
-- same class of problem as team member deletion (20240055), but with no
-- "reassign to someone else" step: deleting a project takes ALL of its
-- work with it, permanently. Prompted by a real incomplete estimate ->
-- client conversion the user wants to fully undo and redo properly.
--
-- projects.id already cascades cleanly to project_phases, tasks,
-- task_checklist_items, task_tools, task_materials, task_media, and
-- project_permits/project_permit_events (all ON DELETE CASCADE). What
-- actually blocks a plain `DELETE FROM projects` is a smaller set of
-- ON DELETE RESTRICT columns that reference a project's TASKS directly:
-- task_assignees, task_work_sessions (+ its own RESTRICT children
-- task_work_session_events, task_time_corrections), task_aura_scores,
-- task_completion_attributions, task_updates, and the RESTRICT half of
-- task_dependencies (depends_on_task_id). Those are cleared explicitly
-- below, in dependency order, before the project delete triggers the
-- rest of the cascade.
--
-- Optionally also deletes the project's client (projects.client is
-- ON DELETE RESTRICT, so this only works once the project itself is
-- gone) and/or its originating estimate (estimates.client_id is also
-- RESTRICT, and every estimate_* child table is already ON DELETE
-- CASCADE from estimates.id, so deleting the estimate row is sufficient
-- on that side). Deleting the client will itself CASCADE-delete any
-- `leads` row with that client_id (20240053_leads_minimal_and_reminders.sql
-- made that relationship ON DELETE CASCADE) -- i.e. the original lead
-- record that was converted into this client goes too. That is a real,
-- deliberate side effect of choosing to delete the client, not a bug --
-- the caller is told this in the returned summary.
CREATE OR REPLACE FUNCTION public.delete_project_and_related(
  p_project_id uuid,
  p_delete_client boolean DEFAULT false,
  p_delete_estimate boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_project_title text;
  v_client_id uuid;
  v_client_name text;
  v_estimate_id uuid;
  v_task_ids uuid[];
  v_session_ids uuid[];
  v_lead_deleted boolean := false;
  v_client_deleted boolean := false;
  v_estimate_deleted boolean := false;
BEGIN
  IF public.jwt_role() <> 'Super Admin' THEN
    RAISE EXCEPTION 'FORBIDDEN: only Super Admin can force-delete a project' USING ERRCODE = 'P0001';
  END IF;

  SELECT title, client INTO v_project_title, v_client_id FROM public.projects WHERE id = p_project_id;
  IF v_project_title IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: project does not exist' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_estimate_id FROM public.estimates WHERE converted_project_id = p_project_id;
  IF v_client_id IS NOT NULL THEN
    SELECT name INTO v_client_name FROM public.clients WHERE id = v_client_id;
  END IF;

  SELECT array_agg(id) INTO v_task_ids FROM public.tasks WHERE project_id = p_project_id;
  SELECT array_agg(id) INTO v_session_ids FROM public.task_work_sessions WHERE project_id = p_project_id;

  -- Clear the RESTRICT-holding history tables so the project delete's
  -- cascade can actually complete.
  IF v_session_ids IS NOT NULL THEN
    DELETE FROM public.task_time_corrections WHERE session_id = ANY(v_session_ids);
    DELETE FROM public.task_work_session_events WHERE session_id = ANY(v_session_ids);
  END IF;
  DELETE FROM public.task_work_sessions WHERE project_id = p_project_id;

  IF v_task_ids IS NOT NULL THEN
    DELETE FROM public.task_assignees WHERE task_id = ANY(v_task_ids);
    DELETE FROM public.task_aura_scores WHERE task_id = ANY(v_task_ids);
    DELETE FROM public.task_completion_attributions WHERE task_id = ANY(v_task_ids);
    DELETE FROM public.task_dependencies WHERE task_id = ANY(v_task_ids) OR depends_on_task_id = ANY(v_task_ids);
  END IF;
  DELETE FROM public.task_updates WHERE task_id = ANY(COALESCE(v_task_ids, ARRAY[]::uuid[])) OR project_id = p_project_id;

  -- Tidy the plain (no-FK) activity log so no orphaned rows remain.
  DELETE FROM public.project_activity_log WHERE project_id = p_project_id;

  -- Now safe: cascades to project_phases, tasks, task_checklist_items,
  -- task_tools, task_materials, task_media, project_permits/events.
  DELETE FROM public.projects WHERE id = p_project_id;

  IF p_delete_estimate AND v_estimate_id IS NOT NULL THEN
    DELETE FROM public.estimates WHERE id = v_estimate_id;
    v_estimate_deleted := true;
  END IF;

  IF p_delete_client AND v_client_id IS NOT NULL THEN
    v_lead_deleted := EXISTS (SELECT 1 FROM public.leads WHERE client_id = v_client_id);
    DELETE FROM public.clients WHERE id = v_client_id;
    v_client_deleted := true;
  END IF;

  RETURN jsonb_build_object(
    'deletedProjectTitle', v_project_title,
    'deletedEstimate', v_estimate_deleted,
    'deletedClient', v_client_deleted,
    'deletedClientName', v_client_name,
    'alsoDeletedOriginatingLead', v_lead_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_project_and_related(uuid, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_project_and_related(uuid, boolean, boolean) TO authenticated;
