-- =============================================================================
-- Migration: Supervisor role -- on-site, works alongside Associates, but with
-- real QC authority over the specific project(s) they supervise (not
-- company-wide like Manager/Admin).
--
-- projects.supervisor_id already existed (used by
-- src/app/src/features/tasks/useTasksAwaitingReview.ts to scope the QC
-- review queue to "projects this person supervises") but there was no
-- permission role able to actually reach it -- Associates/Contractors don't
-- have canViewQCReviewQueue at all, so the field was effectively inert.
-- This is what makes it real.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_project_supervisor(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.team_members tm ON tm.id = p.supervisor_id
    WHERE p.id = p_project_id AND tm.auth_user_id = auth.uid()
  );
$$;

-- Project-scoped QC approval: the existing can_approve_task_qc() stays a
-- blanket, company-wide check for Manager/Admin/Super Admin/Quality Control
-- (unchanged, still used as-is in places that don't have a task id handy).
-- This sibling adds Supervisor, but ONLY for a task on a project they
-- actually supervise -- never company-wide.
CREATE OR REPLACE FUNCTION public.can_approve_task_qc_for(p_task_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.can_approve_task_qc() OR (
    public.jwt_role() = 'Supervisor' AND EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = p_task_id AND public.is_project_supervisor(t.project_id)
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Visibility: a Supervisor sees their supervised project(s) in full (all
-- tasks/phases), same as an Associate sees projects they're assigned to --
-- just via a different relationship (supervising the project vs. being
-- assigned a task in it).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks FOR SELECT
  USING (
    public.is_broad_project_viewer()
    OR public.owns_task_multi(id)
    OR public.owns_task(assignee_id)
    OR public.is_project_supervisor(project_id)
  );

DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects FOR SELECT
  USING (
    public.is_broad_project_viewer()
    OR public.is_project_supervisor(id)
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.project_id = projects.id
        AND (public.owns_task_multi(t.id) OR public.owns_task(t.assignee_id))
    )
  );

DROP POLICY IF EXISTS project_phases_select ON public.project_phases;
CREATE POLICY project_phases_select ON public.project_phases FOR SELECT
  USING (
    public.is_broad_project_viewer()
    OR public.is_project_supervisor(project_id)
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.project_id = project_phases.project_id
        AND (public.owns_task_multi(t.id) OR public.owns_task(t.assignee_id))
    )
  );

-- A Supervisor can edit/reassign any task on a project they supervise (not
-- just tasks assigned to them personally) -- that's the actual point of the
-- role ("tells associates what to do, teaches them on the job").
DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks FOR UPDATE
  USING (
    public.is_manager_or_admin()
    OR public.owns_task_multi(id)
    OR public.can_approve_task_qc_for(id)
    OR public.is_project_supervisor(project_id)
  )
  WITH CHECK (
    public.is_manager_or_admin()
    OR public.owns_task_multi(id)
    OR public.can_approve_task_qc_for(id)
    OR public.is_project_supervisor(project_id)
  );

-- QC-result recording now checks the project-scoped version, so a Supervisor
-- can record results for their own supervised project without gaining
-- company-wide QC authority.
CREATE OR REPLACE FUNCTION public.record_session_qc_result(
  p_task_id uuid,
  p_qc_result text,
  p_rework boolean DEFAULT false
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.can_approve_task_qc_for(p_task_id) THEN
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

CREATE OR REPLACE FUNCTION public.record_task_aura_score(p_task_id uuid, p_reviewer_feedback text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_member record;
  v_score record;
  v_count integer := 0;
  v_reviewer uuid;
BEGIN
  IF NOT public.can_approve_task_qc_for(p_task_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: only QC-capable roles can record an Aura score' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_reviewer FROM public.team_members WHERE auth_user_id = auth.uid();

  FOR v_member IN
    SELECT DISTINCT team_member_id FROM public.task_work_sessions
    WHERE task_id = p_task_id AND qc_result IS NOT NULL
  LOOP
    SELECT * INTO v_score FROM public.compute_task_aura_score(p_task_id, v_member.team_member_id);
    IF v_score IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.task_aura_scores (
      task_id, team_member_id, quality_score, timing_score, reliability_score, overall_score,
      qc_result, rework, delay_documented, reviewer_feedback, scored_by
    ) VALUES (
      p_task_id, v_member.team_member_id, v_score.quality_score, v_score.timing_score,
      v_score.reliability_score, v_score.overall_score, v_score.qc_result, v_score.rework,
      v_score.delay_documented, p_reviewer_feedback, v_reviewer
    )
    ON CONFLICT (task_id, team_member_id) DO UPDATE SET
      quality_score = excluded.quality_score,
      timing_score = excluded.timing_score,
      reliability_score = excluded.reliability_score,
      overall_score = excluded.overall_score,
      qc_result = excluded.qc_result,
      rework = excluded.rework,
      delay_documented = excluded.delay_documented,
      reviewer_feedback = coalesce(excluded.reviewer_feedback, public.task_aura_scores.reviewer_feedback),
      scored_by = excluded.scored_by,
      updated_at = now();

    v_count := v_count + 1;

    UPDATE public.team_members tm
    SET aura_rating = sub.avg_overall,
        tasks_completed = sub.n,
        tasks_on_time = sub.n_on_time,
        efficiency = round((sub.n_on_time::numeric / greatest(sub.n, 1)) * 100),
        updated_at = now()
    FROM (
      SELECT
        count(*) AS n,
        count(*) FILTER (WHERE timing_score >= 4.5) AS n_on_time,
        round(avg(overall_score)::numeric, 1) AS avg_overall
      FROM (
        SELECT * FROM public.task_aura_scores
        WHERE team_member_id = v_member.team_member_id
        ORDER BY created_at DESC
        LIMIT 30
      ) recent
    ) sub
    WHERE tm.id = v_member.team_member_id;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.record_session_qc_result(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_session_qc_result(uuid, text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.record_task_aura_score(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_task_aura_score(uuid, text) TO authenticated;
