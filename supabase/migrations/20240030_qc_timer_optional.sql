-- The timer is evidence for QC and Aura, not a prerequisite for an authorized
-- reviewer to make a QC decision. Reviewers already assess timing and quality
-- explicitly in the QC dialog. If finished sessions exist, keep recording the
-- QC result and Aura as before; if none exist, complete/reject the task without
-- fabricating session or Aura data.

CREATE OR REPLACE FUNCTION public.finalize_task_qc(
  p_task_id uuid,
  p_qc_result text,
  p_rework boolean,
  p_feedback text DEFAULT NULL,
  p_display_rating numeric DEFAULT NULL,
  p_rating_metrics jsonb DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_count integer := 0;
  v_has_finished_session boolean;
BEGIN
  IF NOT public.can_approve_task_qc_for(p_task_id) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001';
  END IF;
  IF p_qc_result NOT IN ('Approved','Approved with Conditions','Rejected') THEN
    RAISE EXCEPTION 'INVALID_RESULT' USING ERRCODE='P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.task_work_sessions
    WHERE task_id=p_task_id AND status='finished'
  ) INTO v_has_finished_session;

  IF v_has_finished_session THEN
    UPDATE public.task_work_sessions
    SET qc_result=p_qc_result,rework=p_rework,updated_at=now()
    WHERE task_id=p_task_id AND status='finished' AND qc_result IS NULL;
  END IF;

  UPDATE public.tasks SET
    status=CASE WHEN p_qc_result='Rejected' THEN 'In Progress' ELSE 'Completed' END,
    progress=CASE WHEN p_qc_result='Rejected' THEN progress ELSE 100 END,
    completed_date=CASE WHEN p_qc_result='Rejected' THEN NULL ELSE now() END,
    review_feedback=p_feedback,
    rating=p_display_rating,
    rating_metrics=p_rating_metrics,
    updated_at=now()
  WHERE id=p_task_id;

  -- Aura remains based on real contributor sessions. A task without timer
  -- evidence still receives the reviewer's task-level rating, but does not
  -- create invented session timing or an invented contributor Aura score.
  IF v_has_finished_session THEN
    v_count := public.record_task_aura_score(p_task_id,p_feedback);
  END IF;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_task_qc(uuid,text,boolean,text,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finalize_task_qc(uuid,text,boolean,text,numeric,jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
