-- CASL-aware Revenue OS communication ledger. Additive; Cstle remains source of truth.
CREATE TABLE IF NOT EXISTS public.lead_communication_preferences (
  lead_id uuid PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
  email_contact_basis text NOT NULL DEFAULT 'none' CHECK (email_contact_basis IN ('none','requested_estimate','implied','express')),
  email_basis_recorded_at timestamptz,
  email_basis_expires_at timestamptz,
  email_opted_out_at timestamptz,
  sms_contact_basis text NOT NULL DEFAULT 'none' CHECK (sms_contact_basis IN ('none','implied','express')),
  sms_basis_recorded_at timestamptz,
  sms_basis_expires_at timestamptz,
  sms_opted_out_at timestamptz,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  purpose text NOT NULL CHECK (purpose IN ('service','marketing')),
  template_key text NOT NULL,
  recipient text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','delivered','failed','skipped')),
  provider_message_id text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_lead_messages_timeline ON public.lead_messages(lead_id, created_at DESC);

ALTER TABLE public.lead_communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lead_communication_preferences_select ON public.lead_communication_preferences;
DROP POLICY IF EXISTS lead_communication_preferences_write ON public.lead_communication_preferences;
DROP POLICY IF EXISTS lead_messages_select ON public.lead_messages;
DROP POLICY IF EXISTS lead_messages_write ON public.lead_messages;
CREATE POLICY lead_communication_preferences_select ON public.lead_communication_preferences FOR SELECT USING (public.can_view_crm());
CREATE POLICY lead_communication_preferences_write ON public.lead_communication_preferences FOR ALL USING (public.can_edit_crm()) WITH CHECK (public.can_edit_crm());
CREATE POLICY lead_messages_select ON public.lead_messages FOR SELECT USING (public.can_view_crm());
CREATE POLICY lead_messages_write ON public.lead_messages FOR ALL USING (public.can_edit_crm()) WITH CHECK (public.can_edit_crm());

CREATE OR REPLACE FUNCTION public.initialize_lead_communication_preferences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_communication_preferences(lead_id, email_contact_basis, email_basis_recorded_at, email_basis_expires_at, evidence)
  VALUES (NEW.id, 'requested_estimate', now(), now() + interval '6 months', jsonb_build_object('source_form', NEW.source_form, 'source_page', NEW.source_page))
  ON CONFLICT (lead_id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_initialize_lead_communication_preferences ON public.leads;
CREATE TRIGGER trg_initialize_lead_communication_preferences AFTER INSERT ON public.leads
FOR EACH ROW WHEN (NEW.source_form IN ('regina-basement-project-fit','booking'))
EXECUTE FUNCTION public.initialize_lead_communication_preferences();
REVOKE ALL ON FUNCTION public.initialize_lead_communication_preferences() FROM PUBLIC;

INSERT INTO public.lead_communication_preferences(lead_id, email_contact_basis, email_basis_recorded_at, email_basis_expires_at, evidence)
SELECT id, 'requested_estimate', created_at, created_at + interval '6 months', jsonb_build_object('source_form', source_form, 'source_page', source_page)
FROM public.leads WHERE source_form IN ('regina-basement-project-fit','booking')
ON CONFLICT (lead_id) DO NOTHING;
