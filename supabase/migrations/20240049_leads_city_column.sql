-- The public booking form's new City field needs somewhere to land.
-- Nullable, matching project_address/province -- city is optional on the
-- form (only Project Address is required there).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city text;
