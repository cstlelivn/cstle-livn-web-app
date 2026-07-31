-- =============================================================================
-- Migration: AI insight history (step 7 of the time-tracking feature).
--
-- Every AI-generated insight is saved permanently here, not just cached in
-- one browser's localStorage like the old client-side widget did. Written
-- only by the new server-side edge function route (using the service-role
-- key, which bypasses RLS) -- there is deliberately no INSERT policy for
-- regular users here, since insight generation always goes through that
-- route so it can enforce the role-based data-scoping rules before anything
-- reaches the model.
--
-- Safe to re-run: IF NOT EXISTS / DROP POLICY IF EXISTS.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_insight_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES public.team_members(id),
  scope_tier text NOT NULL CHECK (scope_tier IN ('individual_detail', 'aggregate_only')),
  input_period_start date,
  input_period_end date,
  content text NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insight_reports_created_at ON public.ai_insight_reports(created_at DESC);

ALTER TABLE public.ai_insight_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_insight_reports_select ON public.ai_insight_reports;
CREATE POLICY ai_insight_reports_select ON public.ai_insight_reports FOR SELECT
  USING (public.is_manager_or_admin() OR public.can_view_team_performance());
