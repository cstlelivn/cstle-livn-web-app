-- Phase 1 stability requirement: "record technical errors securely for
-- troubleshooting without exposing sensitive information to users." Errors
-- caught by ErrorBoundary (src/app/components/ErrorBoundary.tsx) previously
-- only went to the browser console -- invisible to anyone but the person who
-- happened to hit the bug and have devtools open. This table gives them a
-- durable, admin-visible home instead.
CREATE TABLE IF NOT EXISTS public.client_error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role text,
  message text NOT NULL,
  stack text,
  component_stack text,
  label text,
  url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_error_log_created_at ON public.client_error_log(created_at DESC);

ALTER TABLE public.client_error_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_error_log_select ON public.client_error_log;
DROP POLICY IF EXISTS client_error_log_insert ON public.client_error_log;

-- Anyone logged in can report an error (including Associates -- they're the
-- ones most likely to hit an edge case in the field), but only
-- managers/admins can read the log. Nobody can update or delete entries.
CREATE POLICY client_error_log_select ON public.client_error_log FOR SELECT
  USING (public.is_manager_or_admin());

CREATE POLICY client_error_log_insert ON public.client_error_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
