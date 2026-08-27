-- Cstle Revenue OS foundation (additive, reusable across offers).
-- Repository code only until the user confirms this migration was run.

CREATE TABLE IF NOT EXISTS public.revenue_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  market text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  qualification_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  scoring_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.revenue_offers (slug, name, market, qualification_rules, scoring_rules)
VALUES (
  'regina-basement-development',
  'Regina Basement Development',
  'Regina, Saskatchewan',
  '{"serviceArea":["Regina","White City","Emerald Park","Pilot Butte","Balgonie"],"minimumBudget":35000,"requiredFields":["name","email","phone","city","project_address","budget_range","timeline"]}'::jsonb,
  '{"budget":{"35000-49999":15,"50000-74999":25,"75000+":30},"timeline":{"0-3 months":25,"3-6 months":18,"6-12 months":10,"Researching":3},"ownership":15,"financing":10,"consultation":10,"serviceArea":10,"thresholds":{"hot":75,"warm":50,"nurture":25}}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  market = EXCLUDED.market,
  qualification_rules = EXCLUDED.qualification_rules,
  scoring_rules = EXCLUDED.scoring_rules,
  updated_at = now();

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.revenue_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS qualification_band text,
  ADD COLUMN IF NOT EXISTS qualification_score integer,
  ADD COLUMN IF NOT EXISTS qualification_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qualification_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS won_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS referrer text;

UPDATE public.leads SET pipeline_stage = CASE lower(coalesce(status, 'new'))
  WHEN 'new lead' THEN 'New'
  WHEN 'new' THEN 'New'
  WHEN 'contacted' THEN 'Contacted'
  WHEN 'proposal' THEN 'Estimate'
  WHEN 'converted' THEN 'Won'
  WHEN 'won' THEN 'Won'
  WHEN 'closed' THEN 'Lost'
  WHEN 'lost' THEN 'Lost'
  ELSE 'New' END
WHERE pipeline_stage = 'New';

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_pipeline_stage_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_pipeline_stage_check CHECK (pipeline_stage IN (
  'New','Contacted','Qualified','Consultation Booked','Site Visit','Estimate','Won','Lost'
));
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_qualification_band_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_qualification_band_check
  CHECK (qualification_band IS NULL OR qualification_band IN ('Hot','Warm','Nurture','Reject'));
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_qualification_score_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_qualification_score_check
  CHECK (qualification_score IS NULL OR qualification_score BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_owner_stage ON public.leads(owner_user_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_offer_created ON public.leads(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_attribution ON public.leads(utm_source, utm_campaign);

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_timeline ON public.lead_activities(lead_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'follow-up',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_owner_due ON public.lead_tasks(assigned_to, due_at) WHERE completed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.lead_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  appointment_type text NOT NULL CHECK (appointment_type IN ('Consultation','Site Visit','Estimate Review')),
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled','Completed','Cancelled','No Show')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  meeting_url text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_appointments_start ON public.lead_appointments(starts_at);

CREATE TABLE IF NOT EXISTS public.lead_attribution_touchpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  touch_kind text NOT NULL DEFAULT 'visit',
  source text,
  medium text,
  campaign text,
  content text,
  term text,
  gclid text,
  fbclid text,
  landing_page text,
  referrer text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_lead_touchpoints_lead ON public.lead_attribution_touchpoints(lead_id, occurred_at);

CREATE TABLE IF NOT EXISTS public.ad_spend_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spend_date date NOT NULL,
  platform text NOT NULL,
  account_id text NOT NULL DEFAULT '',
  campaign_id text NOT NULL DEFAULT '',
  campaign_name text,
  spend_cents bigint NOT NULL DEFAULT 0 CHECK (spend_cents >= 0),
  impressions bigint,
  clicks bigint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spend_date, platform, account_id, campaign_id)
);
CREATE INDEX IF NOT EXISTS idx_ad_spend_daily_campaign ON public.ad_spend_daily(platform, campaign_id, spend_date);

CREATE TABLE IF NOT EXISTS public.automation_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  destination text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered','failed','cancelled')),
  attempt_count integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_outbox_pending ON public.automation_outbox(status, available_at) WHERE status IN ('pending','failed');

-- Office CRM roles only. Public lead capture remains INSERT-only on leads;
-- anonymous visitors cannot read or write any operational Revenue OS table.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['revenue_offers','lead_activities','lead_tasks','lead_appointments','lead_attribution_touchpoints','ad_spend_daily','automation_outbox']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (public.can_view_crm())', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.can_edit_crm()) WITH CHECK (public.can_edit_crm())', t || '_write', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.log_lead_pipeline_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    INSERT INTO public.lead_activities(lead_id, activity_type, summary, metadata, actor_user_id)
    VALUES (NEW.id, 'stage_changed', OLD.pipeline_stage || ' → ' || NEW.pipeline_stage,
      jsonb_build_object('from', OLD.pipeline_stage, 'to', NEW.pipeline_stage), auth.uid());
    IF NEW.pipeline_stage = 'Contacted' AND NEW.first_responded_at IS NULL THEN NEW.first_responded_at := now(); END IF;
    IF NEW.pipeline_stage = 'Qualified' AND NEW.qualified_at IS NULL THEN NEW.qualified_at := now(); END IF;
    IF NEW.pipeline_stage = 'Won' AND NEW.won_at IS NULL THEN NEW.won_at := now(); END IF;
    IF NEW.pipeline_stage = 'Lost' AND NEW.lost_at IS NULL THEN NEW.lost_at := now(); END IF;
    INSERT INTO public.automation_outbox(event_type, aggregate_type, aggregate_id, payload)
    VALUES ('lead.stage_changed', 'lead', NEW.id,
      jsonb_build_object('lead_id', NEW.id, 'from', OLD.pipeline_stage, 'to', NEW.pipeline_stage));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lead_pipeline_change ON public.leads;
CREATE TRIGGER trg_lead_pipeline_change BEFORE UPDATE OF pipeline_stage ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_pipeline_change();

CREATE OR REPLACE VIEW public.revenue_pipeline_kpis WITH (security_invoker = true) AS
SELECT
  offer_id,
  count(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS leads_mtd,
  count(*) FILTER (WHERE qualified_at >= date_trunc('month', now())) AS qualified_leads_mtd,
  count(*) FILTER (WHERE pipeline_stage = 'Consultation Booked') AS consultations_booked,
  count(*) FILTER (WHERE pipeline_stage IN ('Estimate','Won')) AS estimates_created,
  count(*) FILTER (WHERE pipeline_stage = 'Won') AS won_count,
  coalesce(sum(estimated_value) FILTER (WHERE pipeline_stage NOT IN ('Won','Lost')), 0) AS pipeline_value,
  coalesce(sum(estimated_value) FILTER (WHERE pipeline_stage = 'Won'), 0) AS won_revenue,
  avg(extract(epoch FROM (first_responded_at - created_at)) / 60.0) FILTER (WHERE first_responded_at IS NOT NULL) AS avg_response_minutes,
  CASE WHEN count(*) FILTER (WHERE pipeline_stage IN ('Won','Lost')) = 0 THEN NULL
       ELSE count(*) FILTER (WHERE pipeline_stage = 'Won')::numeric /
            count(*) FILTER (WHERE pipeline_stage IN ('Won','Lost')) END AS close_rate
FROM public.leads
GROUP BY offer_id;
