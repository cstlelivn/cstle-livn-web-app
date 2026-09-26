-- Make canonical project templates from Settings usable in an existing
-- project's Manage Phases dialog. Replacement is atomic and deliberately
-- limited to untouched plans: real work history must never be erased by a
-- template-selection action.

CREATE OR REPLACE FUNCTION public.replace_project_plan_from_template(
  p_project_id uuid,
  p_template_id uuid,
  p_start_date date
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_template_name text;
  v_project_title text;
  v_task_ids uuid[];
  v_default_assignee uuid;
  v_default_supervisor uuid;
  v_cursor date := p_start_date;
  v_phase_start date;
  v_phase_end date;
  v_task_start date;
  v_task_end date;
  v_phase_actual_end date;
  v_project_end date := p_start_date;
  v_phase_id uuid;
  v_phase_count integer := 0;
  v_task_count integer := 0;
  v_days integer;
  v_i integer;
  v_phase record;
  v_task record;
  v_phases_json jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_manager_or_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: Admin or Super Admin required' USING ERRCODE = 'P0001';
  END IF;
  IF p_start_date IS NULL THEN
    RAISE EXCEPTION 'START_DATE_REQUIRED: add a project start date before applying a template' USING ERRCODE = 'P0001';
  END IF;

  SELECT title INTO v_project_title
  FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF v_project_title IS NULL THEN
    RAISE EXCEPTION 'PROJECT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT name INTO v_template_name
  FROM public.project_templates WHERE id = p_template_id AND active = true;
  IF v_template_name IS NULL THEN
    RAISE EXCEPTION 'TEMPLATE_NOT_FOUND_OR_ARCHIVED' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.phase_templates WHERE project_template_id = p_template_id) THEN
    RAISE EXCEPTION 'TEMPLATE_HAS_NO_PHASES' USING ERRCODE = 'P0001';
  END IF;

  SELECT array_agg(id) INTO v_task_ids FROM public.tasks WHERE project_id = p_project_id;

  -- Preserve the existing plan's usual assignment defaults when possible.
  SELECT assignee_id, supervisor_id
  INTO v_default_assignee, v_default_supervisor
  FROM public.tasks
  WHERE project_id = p_project_id
  ORDER BY ((assignee_id IS NOT NULL)::integer + (supervisor_id IS NOT NULL)::integer) DESC, created_at
  LIMIT 1;

  -- A plan can be replaced only while it is still planning data. Anything
  -- produced onsite or reviewed by a person makes the operation refuse.
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE project_id = p_project_id
      AND (status IS DISTINCT FROM 'To Do' OR coalesce(progress, 0) <> 0 OR completed_date IS NOT NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.task_work_sessions WHERE project_id = p_project_id
  ) OR EXISTS (
    SELECT 1 FROM public.task_media WHERE task_id = ANY(coalesce(v_task_ids, ARRAY[]::uuid[]))
  ) OR EXISTS (
    SELECT 1 FROM public.task_updates WHERE project_id = p_project_id
  ) OR EXISTS (
    SELECT 1 FROM public.task_aura_scores WHERE task_id = ANY(coalesce(v_task_ids, ARRAY[]::uuid[]))
  ) OR EXISTS (
    SELECT 1 FROM public.task_completion_attributions WHERE task_id = ANY(coalesce(v_task_ids, ARRAY[]::uuid[]))
  ) OR EXISTS (
    SELECT 1 FROM public.phase_qc_records WHERE project_id = p_project_id
  ) OR EXISTS (
    SELECT 1 FROM public.procurement_items WHERE project_id = p_project_id
  ) OR EXISTS (
    SELECT 1 FROM public.inspection_records WHERE project_id = p_project_id
  ) THEN
    RAISE EXCEPTION 'PROJECT_HAS_WORK_HISTORY: this plan cannot be replaced because work, photos, timer, QC, procurement, or inspection records already exist' USING ERRCODE = 'P0001';
  END IF;

  -- Clear planning-only rows that otherwise intentionally restrict deletion.
  DELETE FROM public.task_dependencies
  WHERE task_id = ANY(coalesce(v_task_ids, ARRAY[]::uuid[]))
     OR depends_on_task_id = ANY(coalesce(v_task_ids, ARRAY[]::uuid[]));
  DELETE FROM public.task_assignees WHERE task_id = ANY(coalesce(v_task_ids, ARRAY[]::uuid[]));
  DELETE FROM public.tasks WHERE project_id = p_project_id;
  DELETE FROM public.project_phases WHERE project_id = p_project_id;

  FOR v_phase IN
    SELECT * FROM public.phase_templates
    WHERE project_template_id = p_template_id
    ORDER BY position, created_at
  LOOP
    v_phase_start := v_cursor;
    v_phase_end := v_cursor;
    v_days := greatest(coalesce(v_phase.default_duration_days, 1), 1);
    FOR v_i IN 2..v_days LOOP
      v_phase_end := v_phase_end + 1;
      WHILE extract(dow FROM v_phase_end) = 0 LOOP v_phase_end := v_phase_end + 1; END LOOP;
    END LOOP;

    INSERT INTO public.project_phases (
      project_id, phase_template_id, name, description, position, status,
      qc_status, start_date, end_date, created_at, updated_at
    ) VALUES (
      p_project_id, v_phase.id, v_phase.name, v_phase.description,
      v_phase_count, 'Not Started', 'Not Started', v_phase_start,
      v_phase_end, now(), now()
    ) RETURNING id INTO v_phase_id;

    v_task_start := v_phase_start;
    v_phase_actual_end := v_phase_end;
    FOR v_task IN
      SELECT * FROM public.task_templates
      WHERE phase_template_id = v_phase.id
      ORDER BY position, created_at
    LOOP
      v_task_end := v_task_start;
      v_days := greatest(coalesce(v_task.default_duration_days, 1), 1);
      FOR v_i IN 2..v_days LOOP
        v_task_end := v_task_end + 1;
        WHILE extract(dow FROM v_task_end) = 0 LOOP v_task_end := v_task_end + 1; END LOOP;
      END LOOP;

      INSERT INTO public.tasks (
        project_id, phase_id, phase, task_template_id, title, description,
        task_type, status, priority, progress, is_required, assignee_id,
        supervisor_id, start_date, due_date, tags, created_at, updated_at
      ) VALUES (
        p_project_id, v_phase_id, v_phase.name, v_task.id, v_task.name,
        coalesce(v_task.description, ''), coalesce(v_task.task_type, 'Administrative'),
        'To Do', coalesce(v_task.priority, 'Medium'), 0,
        coalesce(v_task.required, true), v_default_assignee,
        v_default_supervisor, v_task_start, v_task_end, '[]'::jsonb, now(), now()
      );
      v_task_count := v_task_count + 1;
      IF v_task_end > v_phase_actual_end THEN v_phase_actual_end := v_task_end; END IF;
      v_task_start := v_task_end + 1;
      WHILE extract(dow FROM v_task_start) = 0 LOOP v_task_start := v_task_start + 1; END LOOP;
    END LOOP;

    v_phases_json := v_phases_json || jsonb_build_array(jsonb_build_object(
      'name', v_phase.name,
      'days', greatest(coalesce(v_phase.default_duration_days, 1), 1),
      'startDate', v_phase_start,
      'endDate', v_phase_actual_end
    ));
    v_phase_count := v_phase_count + 1;
    v_project_end := v_phase_actual_end;
    v_cursor := v_phase_actual_end + 1;
    WHILE extract(dow FROM v_cursor) = 0 LOOP v_cursor := v_cursor + 1; END LOOP;
  END LOOP;

  UPDATE public.projects SET
    phases = v_phases_json,
    phase = coalesce(v_phases_json->0->>'name', phase),
    end_date = v_project_end,
    progress = 0,
    updated_at = now()
  WHERE id = p_project_id;

  INSERT INTO public.project_activity_log (
    project_id, user_id, action, object_type, object_id, new_value, reason, created_at
  ) VALUES (
    p_project_id, auth.uid(), 'project_plan_replaced', 'project_template', p_template_id,
    jsonb_build_object('template_name', v_template_name, 'phase_count', v_phase_count, 'task_count', v_task_count),
    'Canonical template applied from Manage Project Phases', now()
  );

  RETURN jsonb_build_object(
    'templateName', v_template_name,
    'phaseCount', v_phase_count,
    'taskCount', v_task_count,
    'scheduledEndDate', v_project_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_project_plan_from_template(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_project_plan_from_template(uuid, uuid, date) TO authenticated;
