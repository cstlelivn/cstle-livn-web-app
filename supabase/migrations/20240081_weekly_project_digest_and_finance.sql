-- Weekly active-project email digest and final consolidation of global Finance
-- onto public.transactions. Safe to re-run.

-- Finance fields used by the global transaction form. Keeping them on the
-- canonical transactions table makes global Finance, project finance and
-- realtime observe the same row.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_or_vendor text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_project_date
  ON public.transactions(project_id, date DESC);

-- One company-level preference row. Email stays off until a Super Admin
-- deliberately enables it from the dashboard.
CREATE TABLE IF NOT EXISTS public.company_notification_preferences (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000081'::uuid,
  weekly_project_digest_enabled boolean NOT NULL DEFAULT false,
  recipient_email text NOT NULL DEFAULT 'info@cstlelivn.ca',
  last_digest_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT company_notification_preferences_singleton
    CHECK (id = '00000000-0000-0000-0000-000000000081'::uuid)
);

INSERT INTO public.company_notification_preferences(id)
VALUES ('00000000-0000-0000-0000-000000000081'::uuid)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.company_notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_notification_preferences_read ON public.company_notification_preferences;
DROP POLICY IF EXISTS company_notification_preferences_update ON public.company_notification_preferences;

CREATE POLICY company_notification_preferences_read
  ON public.company_notification_preferences FOR SELECT TO authenticated
  USING (public.jwt_role() IN ('Super Admin', 'Admin', 'Manager'));

CREATE POLICY company_notification_preferences_update
  ON public.company_notification_preferences FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- pg_cron calls this once a week. It creates at most one event for each Regina
-- business week and only while the dashboard switch is on. The existing
-- automation_outbox Database Webhook invokes the Edge worker immediately, so
-- there is no polling and no idle Edge-function traffic.
CREATE OR REPLACE FUNCTION public.enqueue_weekly_project_digest()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preference public.company_notification_preferences%rowtype;
  v_week_key text := to_char(
    date_trunc('week', timezone('America/Regina', now())),
    'YYYY-MM-DD'
  );
BEGIN
  SELECT * INTO v_preference
  FROM public.company_notification_preferences
  WHERE id = '00000000-0000-0000-0000-000000000081'::uuid;

  IF NOT coalesce(v_preference.weekly_project_digest_enabled, false) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.automation_outbox
    WHERE event_type = 'projects.weekly_digest'
      AND payload ->> 'week_key' = v_week_key
      AND status <> 'cancelled'
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.automation_outbox(event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'projects.weekly_digest',
    'company',
    v_preference.id,
    jsonb_build_object('week_key', v_week_key, 'recipient_email', v_preference.recipient_email)
  );
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_weekly_project_digest() FROM PUBLIC;

-- 8:00 AM every Monday in Regina (UTC-6 year-round).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cstle-weekly-project-digest') THEN
    PERFORM cron.unschedule('cstle-weekly-project-digest');
  END IF;
  PERFORM cron.schedule(
    'cstle-weekly-project-digest',
    '0 14 * * 1',
    'SELECT public.enqueue_weekly_project_digest();'
  );
END;
$$;
