-- Promote only an explicit, optional public-form choice to express email consent.
-- The complete wording/version/page/timestamp remain in qualification_answers
-- and are copied into the preference evidence for an auditable source of truth.
CREATE OR REPLACE FUNCTION public.initialize_lead_communication_preferences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_marketing_email_consent boolean :=
    COALESCE(NEW.qualification_answers ->> 'marketingEmailConsent', 'false') = 'true'
    AND NULLIF(BTRIM(COALESCE(NEW.email, '')), '') IS NOT NULL;
BEGIN
  INSERT INTO public.lead_communication_preferences(
    lead_id,
    email_contact_basis,
    email_basis_recorded_at,
    email_basis_expires_at,
    evidence
  )
  VALUES (
    NEW.id,
    CASE WHEN has_marketing_email_consent THEN 'express' ELSE 'requested_estimate' END,
    now(),
    CASE WHEN has_marketing_email_consent THEN NULL ELSE now() + interval '6 months' END,
    jsonb_build_object(
      'source_form', NEW.source_form,
      'source_page', NEW.source_page,
      'marketing_email_consent', has_marketing_email_consent,
      'marketing_consent_version', NEW.qualification_answers ->> 'marketingConsentVersion',
      'marketing_consent_text', NEW.qualification_answers ->> 'marketingConsentText',
      'marketing_consent_page', NEW.qualification_answers ->> 'marketingConsentPage',
      'marketing_consent_recorded_at', NEW.qualification_answers ->> 'marketingConsentRecordedAt'
    )
  )
  ON CONFLICT (lead_id) DO NOTHING;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.initialize_lead_communication_preferences() FROM PUBLIC;
