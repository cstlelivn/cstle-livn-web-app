-- Make the Super-Admin project deletion transaction match the complete live
-- schema. Several older finance/Aura tables use NO ACTION references, and an
-- estimate keeps a NO ACTION converted_project_id reference in the live
-- database. Those rows must be cleared or detached before projects/tasks can
-- cascade. The ordinary DELETE policies and foreign keys remain unchanged;
-- only this exact, typed-confirmation UI path calls this SECURITY DEFINER RPC.
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
  v_lead_id uuid;
  v_task_ids uuid[];
  v_session_ids uuid[];
  v_lead_deleted boolean := false;
  v_client_deleted boolean := false;
  v_estimate_deleted boolean := false;
BEGIN
  IF public.jwt_role() <> 'Super Admin' THEN
    RAISE EXCEPTION 'FORBIDDEN: only Super Admin can force-delete a project' USING ERRCODE = 'P0001';
  END IF;

  SELECT title, client INTO v_project_title, v_client_id
    FROM public.projects WHERE id = p_project_id;
  IF v_project_title IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: project does not exist' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, lead_id INTO v_estimate_id, v_lead_id
    FROM public.estimates
    WHERE converted_project_id = p_project_id
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;
  IF v_client_id IS NOT NULL THEN
    SELECT name INTO v_client_name FROM public.clients WHERE id = v_client_id;
  END IF;

  SELECT array_agg(id) INTO v_task_ids FROM public.tasks WHERE project_id = p_project_id;
  SELECT array_agg(id) INTO v_session_ids FROM public.task_work_sessions WHERE project_id = p_project_id;

  IF v_session_ids IS NOT NULL THEN
    DELETE FROM public.task_time_corrections WHERE session_id = ANY(v_session_ids);
    DELETE FROM public.task_work_session_events WHERE session_id = ANY(v_session_ids);
  END IF;
  DELETE FROM public.task_work_sessions WHERE project_id = p_project_id;

  IF v_task_ids IS NOT NULL THEN
    -- A task in another project may point at one of these tasks as its legacy
    -- dependency. Preserve that other task and remove only the stale link.
    UPDATE public.tasks SET dependency_task_id = NULL
      WHERE dependency_task_id = ANY(v_task_ids);
    DELETE FROM public.task_assignees WHERE task_id = ANY(v_task_ids);
    DELETE FROM public.task_aura_scores WHERE task_id = ANY(v_task_ids);
    DELETE FROM public.task_completion_attributions WHERE task_id = ANY(v_task_ids);
    DELETE FROM public.task_dependencies
      WHERE task_id = ANY(v_task_ids) OR depends_on_task_id = ANY(v_task_ids);
    DELETE FROM public.aura_ledger
      WHERE task_id = ANY(v_task_ids) OR project_id = p_project_id;
  ELSE
    DELETE FROM public.aura_ledger WHERE project_id = p_project_id;
  END IF;

  DELETE FROM public.task_updates
    WHERE task_id = ANY(COALESCE(v_task_ids, ARRAY[]::uuid[])) OR project_id = p_project_id;
  DELETE FROM public.project_activity_log WHERE project_id = p_project_id;

  -- Finance-history tables in the live schema use NO ACTION. A permanent
  -- Super-Admin deletion deliberately removes the selected project's rows.
  DELETE FROM public.payments_received WHERE project_id = p_project_id;
  DELETE FROM public.transactions WHERE project_id = p_project_id;

  -- Detach every converted estimate before deleting the project. The chosen
  -- originating estimate is then optionally deleted below; otherwise it is
  -- preserved as an estimate with no converted project.
  UPDATE public.estimates SET converted_project_id = NULL
    WHERE converted_project_id = p_project_id;

  DELETE FROM public.projects WHERE id = p_project_id;

  IF p_delete_estimate AND v_estimate_id IS NOT NULL THEN
    DELETE FROM public.estimates WHERE id = v_estimate_id;
    v_estimate_deleted := FOUND;
  END IF;

  IF p_delete_client AND v_client_id IS NOT NULL THEN
    IF v_lead_id IS NOT NULL THEN
      DELETE FROM public.leads WHERE id = v_lead_id;
      v_lead_deleted := FOUND;
    END IF;
    DELETE FROM public.clients WHERE id = v_client_id;
    v_client_deleted := FOUND;
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
