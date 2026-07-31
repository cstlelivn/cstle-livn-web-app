-- =============================================================================
-- Migration: Record a task-level QC decision onto its work sessions.
--
-- task_work_sessions direct UPDATE is restricted to is_manager_or_admin()
-- (20240016) -- but Quality Control is a narrower role that isn't part of
-- is_manager_or_admin(), and QC review is exactly who needs to write this.
-- A small RPC gated on can_approve_task_qc() (already used for the task's
-- own QC approval) covers this precisely instead of loosening the blanket
-- UPDATE policy for everyone in is_manager_or_admin() plus QC.
--
-- v1 limitation, worth knowing: this stamps the outcome onto every finished
-- session for the task that doesn't have one yet -- i.e. everyone who
-- contributed since the last QC cycle shares the same result, rather than
-- attributing a rejection to whichever specific person's work needed it.
-- Refining that to per-contributor QC attribution is reasonable follow-up
-- work, not part of this pass.
--
-- Safe to re-run: CREATE OR REPLACE.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_session_qc_result(
  p_task_id uuid,
  p_qc_result text,
  p_rework boolean DEFAULT false
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.can_approve_task_qc() THEN
    RAISE EXCEPTION 'FORBIDDEN: only QC-capable roles can record a QC result' USING ERRCODE = 'P0001';
  END IF;
  IF p_qc_result NOT IN ('Approved', 'Approved with Conditions', 'Rejected') THEN
    RAISE EXCEPTION 'INVALID_RESULT: % is not a recognized QC result', p_qc_result USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.task_work_sessions
  SET qc_result = p_qc_result, rework = p_rework, updated_at = now()
  WHERE task_id = p_task_id AND status = 'finished' AND qc_result IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.record_session_qc_result(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_session_qc_result(uuid, text, boolean) TO authenticated;
