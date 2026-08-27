-- Complete public Revenue OS intake server-side without granting anonymous
-- access to operational CRM tables. Website forms continue to INSERT only
-- into leads; this trigger assigns offers and creates the internal records.

CREATE OR REPLACE FUNCTION public.process_public_revenue_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follow_up_due timestamptz;
BEGIN
  IF NEW.source_form = 'regina-basement-project-fit' THEN
    SELECT id INTO NEW.offer_id
    FROM public.revenue_offers
    WHERE slug = 'regina-basement-development' AND active = true
    LIMIT 1;
  END IF;

  IF NEW.qualification_band IN ('Hot', 'Warm') THEN
    NEW.pipeline_stage := 'Qualified';
    NEW.qualified_at := coalesce(NEW.qualified_at, now());
  ELSE
    NEW.pipeline_stage := 'New';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_public_revenue_lead ON public.leads;
CREATE TRIGGER trg_process_public_revenue_lead
BEFORE INSERT ON public.leads
FOR EACH ROW
WHEN (NEW.source_form IN ('regina-basement-project-fit', 'booking'))
EXECUTE FUNCTION public.process_public_revenue_lead();

CREATE OR REPLACE FUNCTION public.create_public_lead_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follow_up_due timestamptz := CASE
    WHEN NEW.qualification_band = 'Hot' THEN now() + interval '10 minutes'
    WHEN NEW.qualification_band = 'Warm' THEN now() + interval '30 minutes'
    ELSE now() + interval '1 day'
  END;
BEGIN
  INSERT INTO public.lead_activities (lead_id, activity_type, summary, metadata)
  VALUES (
    NEW.id,
    'lead_captured',
    CASE WHEN NEW.source_form = 'regina-basement-project-fit'
      THEN 'Regina Basement Project Fit submitted'
      ELSE 'General estimate request submitted'
    END,
    jsonb_build_object(
      'source_form', NEW.source_form,
      'qualification_band', NEW.qualification_band,
      'qualification_score', NEW.qualification_score
    )
  );

  INSERT INTO public.lead_attribution_touchpoints (
    lead_id, touch_kind, source, medium, campaign, content, term,
    gclid, fbclid, landing_page, referrer, metadata
  ) VALUES (
    NEW.id, 'conversion', NEW.utm_source, NEW.utm_medium, NEW.utm_campaign,
    NEW.utm_content, NEW.utm_term, NEW.gclid, NEW.fbclid,
    NEW.landing_page, NEW.referrer,
    jsonb_build_object('source_form', NEW.source_form)
  );

  INSERT INTO public.lead_tasks (lead_id, title, description, task_type, due_at)
  VALUES (
    NEW.id,
    CASE WHEN NEW.qualification_band = 'Hot'
      THEN 'Contact hot Project Fit lead'
      WHEN NEW.qualification_band = 'Warm'
      THEN 'Contact warm Project Fit lead'
      ELSE 'Review new estimate request'
    END,
    'Review the submitted project details and make the first useful response.',
    'follow-up',
    follow_up_due
  );

  INSERT INTO public.automation_outbox (
    event_type, aggregate_type, aggregate_id, payload
  ) VALUES (
    'lead.captured', 'lead', NEW.id,
    jsonb_build_object(
      'lead_id', NEW.id,
      'offer_id', NEW.offer_id,
      'source_form', NEW.source_form,
      'qualification_band', NEW.qualification_band,
      'qualification_score', NEW.qualification_score,
      'email', NEW.email,
      'phone', NEW.phone,
      'consultation_requested', coalesce((NEW.qualification_answers ->> 'consultationRequested')::boolean, false)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_public_lead_operations ON public.leads;
CREATE TRIGGER trg_create_public_lead_operations
AFTER INSERT ON public.leads
FOR EACH ROW
WHEN (NEW.source_form IN ('regina-basement-project-fit', 'booking'))
EXECUTE FUNCTION public.create_public_lead_operations();

REVOKE ALL ON FUNCTION public.process_public_revenue_lead() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_public_lead_operations() FROM PUBLIC;
