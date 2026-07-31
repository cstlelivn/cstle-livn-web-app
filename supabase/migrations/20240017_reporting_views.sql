-- =============================================================================
-- Migration: Reporting views (step 6 of the time-tracking feature).
--
-- Two different tiers of "who can see what," deliberately kept separate:
--
--   1. Identity-bearing views (security_invoker = true, so each one re-checks
--      the QUERYING user's own RLS against task_work_sessions/events rather
--      than the view owner's -- an Associate querying these only ever gets
--      their own row(s) back, per the RLS policies from 20240016; a
--      Manager/Admin/Accountant/QC sees everyone's, same as the base
--      tables). These answer "who did what."
--
--   2. De-identified aggregate functions (SECURITY DEFINER, no
--      team_member_id in the output at all) for numbers that need to be the
--      SAME for every viewer regardless of role -- e.g. "average completion
--      time for similar tasks" or "total time on this task" shouldn't
--      silently become "average of just my own tasks" for a regular
--      Associate because their RLS-scoped view of the underlying rows is
--      narrower. These answer "how long does this kind of work take,"
--      without naming anyone.
--
-- Safe to re-run: CREATE OR REPLACE.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Identity-bearing views.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_task_assignee_time
WITH (security_invoker = true) AS
SELECT
  s.task_id,
  s.project_id,
  s.team_member_id,
  sum(s.active_seconds) AS active_seconds,
  count(*) AS session_count,
  min(s.started_at) AS first_started_at,
  max(s.finished_at) AS last_finished_at,
  (array_agg(s.qc_result ORDER BY s.finished_at DESC NULLS LAST) FILTER (WHERE s.qc_result IS NOT NULL))[1] AS latest_qc_result,
  count(*) FILTER (WHERE s.rework) AS rework_count,
  bool_or(s.clock_suspect) AS has_clock_suspect_session
FROM public.task_work_sessions s
GROUP BY s.task_id, s.project_id, s.team_member_id;

CREATE OR REPLACE VIEW public.v_team_member_productivity
WITH (security_invoker = true) AS
SELECT
  s.team_member_id,
  sum(s.active_seconds) AS total_active_seconds,
  count(DISTINCT s.task_id) AS tasks_worked,
  count(*) FILTER (WHERE s.status = 'finished') AS sessions_finished,
  count(*) FILTER (WHERE s.qc_result = 'Approved') AS qc_approved_count,
  count(*) FILTER (WHERE s.qc_result = 'Approved with Conditions') AS qc_approved_with_conditions_count,
  count(*) FILTER (WHERE s.qc_result = 'Rejected') AS qc_rejected_count,
  count(*) FILTER (WHERE s.rework) AS rework_count,
  count(*) FILTER (WHERE s.delay_reason IS NOT NULL OR s.blocker IS NOT NULL) AS sessions_with_delay_or_blocker
FROM public.task_work_sessions s
GROUP BY s.team_member_id;

-- ---------------------------------------------------------------------------
-- 2. De-identified aggregate functions -- same result for every viewer.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.task_time_summary(p_task_id uuid)
RETURNS TABLE (
  task_id uuid,
  estimated_hours numeric,
  actual_hours numeric,
  session_count bigint,
  contributor_count bigint,
  first_started_at timestamptz,
  last_finished_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    t.id,
    t.estimated_hours,
    COALESCE(sum(s.active_seconds), 0) / 3600.0,
    count(s.id),
    count(DISTINCT s.team_member_id),
    min(s.started_at),
    max(s.finished_at)
  FROM public.tasks t
  LEFT JOIN public.task_work_sessions s ON s.task_id = t.id
  WHERE t.id = p_task_id
  GROUP BY t.id, t.estimated_hours;
$$;

-- "Realistic average completion time for similar tasks" -- grouped by task
-- type + complexity, only finished sessions on finished/completed tasks,
-- no names, sample size included so a viewer can judge how much to trust
-- an average from only 1-2 data points.
CREATE OR REPLACE FUNCTION public.task_type_estimates()
RETURNS TABLE (
  task_type text,
  complexity text,
  sample_size bigint,
  avg_estimated_hours numeric,
  avg_actual_hours numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    t.task_type,
    t.complexity,
    count(DISTINCT t.id),
    avg(t.estimated_hours),
    avg(task_totals.actual_hours)
  FROM public.tasks t
  JOIN (
    SELECT task_id, sum(active_seconds) / 3600.0 AS actual_hours
    FROM public.task_work_sessions
    WHERE status = 'finished'
    GROUP BY task_id
  ) task_totals ON task_totals.task_id = t.id
  WHERE t.status = 'Completed'
  GROUP BY t.task_type, t.complexity;
$$;

-- Company-wide productivity trend by week, no individual breakdown -- safe
-- for anyone who can see the app's analytics at all. The per-person trend
-- (who specifically contributed how much) stays behind
-- can_view_team_performance() via v_team_member_productivity above.
CREATE OR REPLACE FUNCTION public.productivity_trend(p_start date, p_end date)
RETURNS TABLE (
  week_start date,
  total_active_hours numeric,
  sessions_finished bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    date_trunc('week', finished_at)::date,
    sum(active_seconds) / 3600.0,
    count(*)
  FROM public.task_work_sessions
  WHERE status = 'finished'
    AND finished_at >= p_start
    AND finished_at < (p_end + 1)
  GROUP BY 1
  ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.task_time_summary(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.task_type_estimates() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.productivity_trend(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.task_time_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.task_type_estimates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.productivity_trend(date, date) TO authenticated;
