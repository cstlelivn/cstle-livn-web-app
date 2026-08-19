-- URGENT fix: the public marketing website (cstlelivn.ca) submits its
-- Book a Consultation and Contact forms by inserting directly into
-- public.leads as the anonymous (anon) role, using the public anon key --
-- there's no staff login involved, by design (a visitor filling out a
-- form isn't authenticated). 20240023_associate_scoped_rls_hardening.sql
-- correctly locked leads/clients down to staff-only for the ADMIN app,
-- but that same change accidentally cut off the public website's only
-- write path: an anonymous visitor can no longer satisfy can_edit_crm()
-- (it checks jwt_role(), which is empty for an unauthenticated request),
-- so every public booking/contact submission has been silently failing
-- since that migration ran on August 1, 2026 -- the form shows a generic
-- "there was an error" message and nothing is ever saved.
--
-- Fix: add a narrow, additive INSERT policy scoped specifically to the
-- `anon` role, alongside (not replacing) the existing staff policies.
-- Anonymous visitors can only ever INSERT a new lead -- they still can't
-- read, update, or delete any lead, including the one they just
-- submitted; SELECT/UPDATE/DELETE remain staff-only exactly as
-- 20240023 intended.
DROP POLICY IF EXISTS leads_public_insert ON public.leads;
CREATE POLICY leads_public_insert ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (true);
