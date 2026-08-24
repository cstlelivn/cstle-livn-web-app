-- The CRM "Add Lead" form (CRMModule.tsx) has always sent an
-- estimated_value field, and it's part of the original leads schema
-- (src/app/src/db/schema.sql), but no migration ever actually created it
-- on the live table -- confirmed live via the exact error PostgREST
-- returns when a column genuinely doesn't exist:
--   PGRST204: Could not find the 'estimated_value' column of 'leads' in
--   the schema cache
-- Every manual "Add Lead" in the CRM was failing because of this; leads
-- created through the public booking/contact forms never hit it since
-- neither of those forms sends estimated_value.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS estimated_value numeric DEFAULT 0;

-- Force PostgREST to pick up the new column immediately rather than
-- waiting for its next automatic schema cache refresh.
NOTIFY pgrst, 'reload schema';
