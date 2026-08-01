-- =============================================================================
-- Aura v2: a transparent, real-data performance score.
--
-- Three rating mechanisms already exist in this codebase and don't talk to
-- each other:
--   1. aura_ledger/aura_summary (002_aura_performance_system.sql) -- a PAY
--      calculation engine (base_pay/bonus/penalty/final_task_pay), keyed on
--      public.users(id), which doesn't match the team_members.id identity
--      model everything else (task_assignees, task_work_sessions) uses.
--   2. PhaseQCReviewDialog.tsx's own calculateRating() + localStorage --
--      a separate, numeric-id legacy flow.
--   3. QCReviewQueue.tsx's live flow -- writes team_members.aura_rating via
--      a client-side "weighted average of the reviewer's manually-picked
--      speed/corrections dropdown," which never touches real timer data at
--      all despite task_work_sessions (with real active_seconds, qc_result,
--      delay_reason, blocker, clock_suspect) already existing.
--
-- This migration is the new, single source of truth for PERFORMANCE (not
-- pay) scoring, computed server-side from real recorded data:
--   - quality: the actual QC outcome (qc_result/rework), which matters most
--   - timing: measured active_seconds vs estimated_hours, but a
--     DOCUMENTED delay (delay_reason or blocker recorded on the session)
--     gets full timing credit -- undocumented lateness is what counts
--     against you, not lateness itself
--   - reliability: session finish notes present, completion photos
--     attached, no clock-integrity flag
--
-- Deliberately does NOT touch base_pay/bonus_amount/penalty_amount/
-- final_task_pay/aura_ledger/aura_points at all -- pay stays a separate,
-- human-reviewed decision, per explicit product requirement.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_aura_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  quality_score numeric NOT NULL,
  timing_score numeric NOT NULL,
  reliability_score numeric NOT NULL,
  overall_score numeric NOT NULL,
  qc_result text NOT NULL,
  rework boolean NOT NULL DEFAULT false,
  delay_documented boolean NOT NULL DEFAULT false,
  reviewer_feedback text,
  scored_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, team_member_id)
);

CREATE INDEX IF NOT EXISTS idx_task_aura_scores_member ON public.task_aura_scores(team_member_id, created_at DESC);

ALTER TABLE public.task_aura_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_aura_scores_select ON public.task_aura_scores;
CREATE POLICY task_aura_scores_select ON public.task_aura_scores FOR SELECT
  USING (
    public.can_view_team_performance()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = task_aura_scores.team_member_id AND tm.auth_user_id = auth.uid()
    )
  );
-- No direct INSERT/UPDATE policy -- only record_task_aura_score() (below,
-- SECURITY DEFINER) writes here, so a score can't be self-assigned or
-- edited outside the real QC flow.

-- Full timing credit if this person documented a delay/blocker on any of
-- their sessions for this task -- weather, missing materials, client
-- changes, etc. shouldn't cost them anything on the score.
CREATE OR REPLACE FUNCTION public.has_documented_delay(p_task_id uuid, p_team_member_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_work_sessions
    WHERE task_id = p_task_id AND team_member_id = p_team_member_id
      AND (delay_reason IS NOT NULL OR blocker IS NOT NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.compute_task_aura_score(p_task_id uuid, p_team_member_id uuid)
RETURNS TABLE (quality_score numeric, timing_score numeric, reliability_score numeric, overall_score numeric,
               qc_result text, rework boolean, delay_documented boolean)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_qc_result text;
  v_rework boolean;
  v_active_seconds numeric;
  v_estimated_hours numeric;
  v_has_notes boolean;
  v_has_photos boolean;
  v_clock_suspect boolean;
  v_delay boolean;
  v_quality numeric;
  v_timing numeric;
  v_reliability numeric;
  v_ratio numeric;
BEGIN
  -- Most recent QC'd session for this person on this task -- if they've
  -- been reviewed more than once (e.g. after rework), the latest result is
  -- the one that reflects their current standing, not an average across
  -- review cycles.
  SELECT s.qc_result, s.rework
  INTO v_qc_result, v_rework
  FROM public.task_work_sessions s
  WHERE s.task_id = p_task_id AND s.team_member_id = p_team_member_id AND s.qc_result IS NOT NULL
  ORDER BY s.finished_at DESC NULLS LAST
  LIMIT 1;

  IF v_qc_result IS NULL THEN
    RETURN;
  END IF;

  SELECT coalesce(sum(s.active_seconds), 0) / 3600.0, bool_or(s.clock_suspect), bool_or(s.notes IS NOT NULL)
  INTO v_active_seconds, v_clock_suspect, v_has_notes
  FROM public.task_work_sessions s
  WHERE s.task_id = p_task_id AND s.team_member_id = p_team_member_id;

  -- completion_photos' exact column type isn't tracked in any migration
  -- this session can see (added outside the tracked migration history) --
  -- casting to text works regardless of whether it's an array, jsonb, or
  -- plain text column, and covers the common "empty" representations.
  SELECT t.estimated_hours,
         (t.completion_photos IS NOT NULL AND t.completion_photos::text NOT IN ('', '[]', '{}', 'null'))
  INTO v_estimated_hours, v_has_photos
  FROM public.tasks t WHERE t.id = p_task_id;

  v_delay := public.has_documented_delay(p_task_id, p_team_member_id);

  -- Quality: the real QC outcome. This is weighted most heavily below.
  v_quality := CASE
    WHEN v_qc_result = 'Approved' AND NOT v_rework THEN 5.0
    WHEN v_qc_result = 'Approved with Conditions' AND NOT v_rework THEN 4.0
    WHEN v_qc_result = 'Approved with Conditions' AND v_rework THEN 3.5
    WHEN v_qc_result = 'Rejected' THEN 1.5
    ELSE 3.0
  END;

  -- Timing: measured time vs estimate, full credit if a delay was documented,
  -- neutral (not penalized) if there's simply no estimate to compare against.
  IF v_delay OR v_estimated_hours IS NULL OR v_estimated_hours <= 0 OR v_active_seconds <= 0 THEN
    v_timing := 5.0;
  ELSE
    v_ratio := v_estimated_hours / v_active_seconds;
    v_timing := CASE
      WHEN v_ratio >= 1 THEN 5.0
      WHEN v_ratio >= 0.85 THEN 4.5
      WHEN v_ratio >= 0.7 THEN 3.5
      WHEN v_ratio >= 0.5 THEN 2.5
      ELSE 1.5
    END;
  END IF;

  -- Reliability: did they leave a record of what they did (notes/photos),
  -- and does the clock look trustworthy.
  v_reliability := 3.0
    + (CASE WHEN v_has_notes THEN 0.65 ELSE 0 END)
    + (CASE WHEN v_has_photos THEN 0.65 ELSE 0 END)
    + (CASE WHEN NOT coalesce(v_clock_suspect, false) THEN 0.7 ELSE -1.5 END);
  v_reliability := greatest(1.0, least(5.0, v_reliability));

  RETURN QUERY SELECT
    v_quality,
    v_timing,
    v_reliability,
    round((v_quality * 0.5 + v_timing * 0.3 + v_reliability * 0.2)::numeric, 1),
    v_qc_result,
    v_rework,
    v_delay;
END;
$$;

-- Records (or updates, if this task gets re-reviewed after rework) the
-- score for every person who contributed finished, QC'd sessions on this
-- task. Called right after record_session_qc_result() in the same QC
-- action. Also refreshes team_members.aura_rating/tasks_completed/
-- tasks_on_time/efficiency from real scored-task history instead of the
-- old client-side weighted-average-of-a-dropdown approach.
CREATE OR REPLACE FUNCTION public.record_task_aura_score(p_task_id uuid, p_reviewer_feedback text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_member record;
  v_score record;
  v_count integer := 0;
  v_reviewer uuid;
BEGIN
  IF NOT public.can_approve_task_qc() THEN
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

    -- Refresh this person's rolling Aura from real scored-task history
    -- (last 30 scores), replacing the old client-side weighted-average.
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

REVOKE ALL ON FUNCTION public.record_task_aura_score(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_task_aura_score(uuid, text) TO authenticated;

-- Profile-level aggregate for the associate/manager-facing Aura views.
-- level thresholds and the "not enough data yet" gate are the product
-- decision this whole feature hinges on -- 5 tiers (New Member/Developing/
-- Skilled/Advanced/Expert), confident rating only after MIN_SCORED_TASKS.
CREATE OR REPLACE FUNCTION public.team_member_aura_profile(p_team_member_id uuid)
RETURNS TABLE (
  scored_task_count bigint,
  avg_overall numeric,
  avg_quality numeric,
  avg_timing numeric,
  avg_reliability numeric,
  on_time_rate numeric,
  qc_pass_rate numeric,
  rework_rate numeric,
  recent_avg numeric,
  prior_avg numeric,
  level text,
  tasks_until_confident integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  MIN_SCORED_TASKS constant integer := 5;
  v_count bigint;
  v_avg_overall numeric;
  v_recent numeric;
  v_prior numeric;
  v_level text;
BEGIN
  SELECT count(*), round(avg(overall_score)::numeric, 1)
  INTO v_count, v_avg_overall
  FROM public.task_aura_scores WHERE team_member_id = p_team_member_id;

  SELECT round(avg(overall_score)::numeric, 1) INTO v_recent FROM (
    SELECT overall_score FROM public.task_aura_scores
    WHERE team_member_id = p_team_member_id ORDER BY created_at DESC LIMIT 5
  ) x;
  SELECT round(avg(overall_score)::numeric, 1) INTO v_prior FROM (
    SELECT overall_score FROM public.task_aura_scores
    WHERE team_member_id = p_team_member_id ORDER BY created_at DESC OFFSET 5 LIMIT 5
  ) x;

  IF v_count < MIN_SCORED_TASKS THEN
    v_level := 'New Member';
  ELSIF v_avg_overall >= 4.5 THEN
    v_level := 'Expert';
  ELSIF v_avg_overall >= 4.0 THEN
    v_level := 'Advanced';
  ELSIF v_avg_overall >= 3.2 THEN
    v_level := 'Skilled';
  ELSE
    v_level := 'Developing';
  END IF;

  RETURN QUERY
  SELECT
    v_count,
    v_avg_overall,
    round((SELECT avg(quality_score) FROM public.task_aura_scores WHERE team_member_id = p_team_member_id)::numeric, 1),
    round((SELECT avg(timing_score) FROM public.task_aura_scores WHERE team_member_id = p_team_member_id)::numeric, 1),
    round((SELECT avg(reliability_score) FROM public.task_aura_scores WHERE team_member_id = p_team_member_id)::numeric, 1),
    round((100.0 * (SELECT count(*) FROM public.task_aura_scores WHERE team_member_id = p_team_member_id AND timing_score >= 4.5)
      / greatest(v_count, 1))::numeric, 0),
    round((100.0 * (SELECT count(*) FROM public.task_aura_scores WHERE team_member_id = p_team_member_id AND qc_result IN ('Approved', 'Approved with Conditions'))
      / greatest(v_count, 1))::numeric, 0),
    round((100.0 * (SELECT count(*) FROM public.task_aura_scores WHERE team_member_id = p_team_member_id AND rework)
      / greatest(v_count, 1))::numeric, 0),
    v_recent,
    v_prior,
    v_level,
    GREATEST(0, MIN_SCORED_TASKS - v_count::integer);
END;
$$;

REVOKE ALL ON FUNCTION public.team_member_aura_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_member_aura_profile(uuid) TO authenticated;

-- "Skills demonstrated": task types where this person has at least one
-- well-reviewed (Approved, no rework) score -- demonstrated, not
-- self-declared.
CREATE OR REPLACE FUNCTION public.team_member_demonstrated_skills(p_team_member_id uuid)
RETURNS TABLE (task_type text, approved_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.task_type, count(*)
  FROM public.task_aura_scores s
  JOIN public.tasks t ON t.id = s.task_id
  WHERE s.team_member_id = p_team_member_id AND s.qc_result = 'Approved' AND NOT s.rework
    AND t.task_type IS NOT NULL
  GROUP BY t.task_type
  ORDER BY count(*) DESC;
$$;

REVOKE ALL ON FUNCTION public.team_member_demonstrated_skills(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_member_demonstrated_skills(uuid) TO authenticated;
