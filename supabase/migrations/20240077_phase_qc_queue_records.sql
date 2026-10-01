-- A phase cannot truthfully be "Ready for Review" without a review record.
-- Queue one automatically when its required tasks first become complete, so
-- the existing QC form always has a durable row to review. This keeps the
-- existing QC questions and workflow unchanged.

CREATE OR REPLACE FUNCTION public.recalculate_phase_state(p_phase_id uuid)
RETURNS public.project_phases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_phase public.project_phases;
  v_required integer := 0;
  v_completed integer := 0;
  v_started integer := 0;
  v_qc_status text;
  v_qc_approved boolean := false;
  v_progress integer := 0;
  v_status text := 'Not Started';
BEGIN
  SELECT * INTO v_phase FROM public.project_phases WHERE id=p_phase_id;
  IF v_phase.id IS NULL THEN RETURN NULL; END IF;

  SELECT count(*),
         count(*) FILTER (WHERE status='Completed'),
         count(*) FILTER (WHERE status IS DISTINCT FROM 'To Do')
    INTO v_required,v_completed,v_started
  FROM public.tasks
  WHERE phase_id=p_phase_id AND is_required IS DISTINCT FROM false;

  -- Initial completion queues the existing QC workflow automatically. A
  -- rejected review remains rejected; resubmission after corrections still
  -- follows the existing explicit Submit for QC action and creates a new row.
  IF v_required>0 AND v_completed=v_required AND v_phase.qc_required
     AND NOT EXISTS(SELECT 1 FROM public.phase_qc_records WHERE phase_id=p_phase_id) THEN
    INSERT INTO public.phase_qc_records(
      project_id,phase_id,status,submitted_at,checklist_answers,evidence_urls,notes,created_at,updated_at
    ) VALUES (
      v_phase.project_id,p_phase_id,'Ready for Review',now(),'{}'::jsonb,'[]'::jsonb,
      'Automatically queued when all required phase tasks were completed.',now(),now()
    );
  END IF;

  SELECT coalesce(result,status) INTO v_qc_status
  FROM public.phase_qc_records
  WHERE phase_id=p_phase_id
  ORDER BY coalesce(reviewed_at,submitted_at,created_at) DESC
  LIMIT 1;

  v_qc_status := coalesce(v_qc_status,v_phase.qc_status,'Not Started');
  v_qc_approved := v_qc_status IN ('Approved','Approved with Conditions');
  v_progress := CASE WHEN v_required=0 THEN 0 ELSE round(100.0*v_completed/v_required)::integer END;

  IF v_required>0 AND v_completed=v_required THEN
    IF NOT v_phase.qc_required OR v_qc_approved THEN v_status := 'Completed';
    ELSE v_status := 'Pending QC'; END IF;
    IF NOT v_phase.qc_required THEN v_qc_status := 'Not Required'; END IF;
  ELSIF v_started>0 THEN
    v_status := 'In Progress';
  ELSE
    v_status := 'Not Started';
  END IF;

  UPDATE public.project_phases SET
    progress=v_progress,
    status=v_status,
    qc_status=v_qc_status,
    last_recalculated_at=now(),
    updated_at=now()
  WHERE id=p_phase_id
  RETURNING * INTO v_phase;

  UPDATE public.projects pr SET
    progress=coalesce((
      SELECT round(100.0*count(*) FILTER (WHERE t.status='Completed')/nullif(count(*),0))::integer
      FROM public.tasks t WHERE t.project_id=v_phase.project_id AND t.is_required IS DISTINCT FROM false
    ),0),
    phase=coalesce((
      SELECT pp.name FROM public.project_phases pp
      WHERE pp.project_id=v_phase.project_id AND pp.status<>'Completed'
      ORDER BY pp.position,pp.created_at LIMIT 1
    ),(
      SELECT pp.name FROM public.project_phases pp
      WHERE pp.project_id=v_phase.project_id ORDER BY pp.position DESC,pp.created_at DESC LIMIT 1
    )),
    updated_at=now()
  WHERE pr.id=v_phase.project_id;

  RETURN v_phase;
END; $$;

-- Repair phases that were previously labelled Ready for Review without the
-- record required by the review form.
DO $$ DECLARE v_phase_id uuid; BEGIN
  FOR v_phase_id IN
    SELECT pp.id FROM public.project_phases pp
    WHERE pp.qc_required AND pp.progress=100
      AND NOT EXISTS(SELECT 1 FROM public.phase_qc_records q WHERE q.phase_id=pp.id)
  LOOP
    PERFORM public.recalculate_phase_state(v_phase_id);
  END LOOP;
END $$;

