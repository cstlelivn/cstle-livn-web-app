-- Record who completed a task as part of QC. Finished employee sessions are
-- attributed automatically. Only tasks with no finished session ask the
-- reviewer to identify a roster member or an external person.

CREATE TABLE IF NOT EXISTS public.task_completion_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE RESTRICT,
  external_name text,
  attribution_source text NOT NULL CHECK (attribution_source IN ('timer_session','qc_manual')),
  qc_result text NOT NULL CHECK (qc_result IN ('Approved','Approved with Conditions','Rejected')),
  recorded_by uuid NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (team_member_id IS NOT NULL AND external_name IS NULL)
    OR (team_member_id IS NULL AND length(btrim(external_name)) BETWEEN 2 AND 200)
  )
);

CREATE INDEX IF NOT EXISTS idx_task_completion_attributions_task_created
  ON public.task_completion_attributions(task_id, created_at DESC);

ALTER TABLE public.task_completion_attributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS task_completion_attributions_select ON public.task_completion_attributions;
CREATE POLICY task_completion_attributions_select ON public.task_completion_attributions
  FOR SELECT USING (
    public.is_broad_project_viewer()
    OR team_member_id = public.current_team_member_id()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_project_supervisor(t.project_id)
    )
  );
GRANT SELECT ON public.task_completion_attributions TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.task_completion_attributions FROM authenticated,anon;

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
  v_reviewer uuid;
  v_manual_member uuid;
  v_external_name text;
BEGIN
  IF NOT public.can_approve_task_qc_for(p_task_id) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001';
  END IF;
  IF p_qc_result NOT IN ('Approved','Approved with Conditions','Rejected') THEN
    RAISE EXCEPTION 'INVALID_RESULT' USING ERRCODE='P0001';
  END IF;

  v_reviewer := public.current_team_member_id();
  IF v_reviewer IS NULL THEN
    RAISE EXCEPTION 'REVIEWER_PROFILE_REQUIRED' USING ERRCODE='P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.task_work_sessions
    WHERE task_id=p_task_id AND status='finished'
  ) INTO v_has_finished_session;

  IF v_has_finished_session THEN
    UPDATE public.task_work_sessions
    SET qc_result=p_qc_result,rework=p_rework,updated_at=now()
    WHERE task_id=p_task_id AND status='finished' AND qc_result IS NULL;

    INSERT INTO public.task_completion_attributions (
      task_id, team_member_id, attribution_source, qc_result, recorded_by
    )
    SELECT DISTINCT p_task_id, ws.team_member_id, 'timer_session', p_qc_result, v_reviewer
    FROM public.task_work_sessions ws
    WHERE ws.task_id=p_task_id AND ws.status='finished';
  ELSE
    BEGIN
      v_manual_member := nullif(p_rating_metrics #>> '{completion_attribution,team_member_id}', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'INVALID_COMPLETER' USING ERRCODE='P0001';
    END;
    v_external_name := nullif(btrim(p_rating_metrics #>> '{completion_attribution,external_name}'), '');

    IF v_manual_member IS NULL AND v_external_name IS NULL THEN
      RAISE EXCEPTION 'COMPLETER_REQUIRED' USING ERRCODE='P0001';
    END IF;
    IF v_manual_member IS NOT NULL AND v_external_name IS NOT NULL THEN
      RAISE EXCEPTION 'ONE_COMPLETER_REQUIRED' USING ERRCODE='P0001';
    END IF;
    IF v_manual_member IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.team_members WHERE id=v_manual_member
    ) THEN
      RAISE EXCEPTION 'COMPLETER_NOT_FOUND' USING ERRCODE='P0001';
    END IF;

    INSERT INTO public.task_completion_attributions (
      task_id, team_member_id, external_name, attribution_source, qc_result, recorded_by
    ) VALUES (
      p_task_id, v_manual_member, v_external_name, 'qc_manual', p_qc_result, v_reviewer
    );
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

  IF v_has_finished_session THEN
    v_count := public.record_task_aura_score(p_task_id,p_feedback);
  END IF;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_task_qc(uuid,text,boolean,text,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finalize_task_qc(uuid,text,boolean,text,numeric,jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
