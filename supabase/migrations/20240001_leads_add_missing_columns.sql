-- Safe, idempotent migration: add missing columns to the leads table.
-- Run this once against the live Supabase project before deploying the updated web app.
-- Uses ADD COLUMN IF NOT EXISTS so it is safe to re-run.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source_form        text,
  ADD COLUMN IF NOT EXISTS source_page        text,
  ADD COLUMN IF NOT EXISTS service_type       text,
  ADD COLUMN IF NOT EXISTS project_type       text,
  ADD COLUMN IF NOT EXISTS project_address    text,
  ADD COLUMN IF NOT EXISTS province           text,
  ADD COLUMN IF NOT EXISTS consultation_date  timestamptz,
  ADD COLUMN IF NOT EXISTS consultation_time  text,
  ADD COLUMN IF NOT EXISTS project_details    text,
  ADD COLUMN IF NOT EXISTS message            text,
  ADD COLUMN IF NOT EXISTS internal_notes     text;
