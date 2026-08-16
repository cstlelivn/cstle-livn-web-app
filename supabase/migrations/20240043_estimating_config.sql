-- Estimating & profitability tool, migration 1 of 4: company-wide pricing
-- config -- margin tiers, rate card, reusable assemblies. No per-project or
-- per-estimate data yet (that's migration 2). This is deliberately the
-- first table a Super Admin edits, since every later screen's math reads
-- from these three tables and nothing else -- pricing is never AI output,
-- always a deterministic formula off this config.
--
-- Tier values below are seeded from the company's own 12-month business
-- plan (Section 10, "Project Profitability Framework") -- not placeholders.

-- ---------------------------------------------------------------------------
-- Role helpers. Reuses the existing jwt_role()/is_super_admin() pattern from
-- 20240004_role_source_and_rls.sql rather than redefining role checks.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_estimating() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager', 'Accountant');
$$;

CREATE OR REPLACE FUNCTION public.can_run_estimating() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager');
$$;

-- Rate card / margin tiers / assemblies -- the pricing backbone. Only
-- Super Admin can change what a job costs to build or what margin it needs
-- to clear; everyone who can run estimating can only ever READ this config.
CREATE OR REPLACE FUNCTION public.can_manage_estimating_config() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.is_super_admin();
$$;

-- Cost/margin/gross-profit numbers anywhere in the estimating tool --
-- deliberately narrower than can_run_estimating(): an Admin/Manager can
-- build and send an estimate but never sees what it actually costs or what
-- margin it's carrying, only the customer-facing price.
CREATE OR REPLACE FUNCTION public.can_view_estimating_margins() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.is_super_admin();
$$;

CREATE OR REPLACE FUNCTION public.touch_estimating_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Margin tiers -- one row per project-size band.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimating_margin_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  lo_cents bigint NOT NULL,
  hi_cents bigint, -- null = no upper bound (the $50,000+ tier)
  min_margin numeric(5,4) NOT NULL,
  target_margin numeric(5,4) NOT NULL,
  typical_weeks numeric(5,2) NOT NULL,
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_estimating_margin_tiers_touch ON public.estimating_margin_tiers;
CREATE TRIGGER trg_estimating_margin_tiers_touch
  BEFORE UPDATE ON public.estimating_margin_tiers
  FOR EACH ROW EXECUTE FUNCTION public.touch_estimating_updated_at();

ALTER TABLE public.estimating_margin_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimating_margin_tiers_select ON public.estimating_margin_tiers;
CREATE POLICY estimating_margin_tiers_select ON public.estimating_margin_tiers FOR SELECT
  USING (public.can_view_estimating());

DROP POLICY IF EXISTS estimating_margin_tiers_write ON public.estimating_margin_tiers;
CREATE POLICY estimating_margin_tiers_write ON public.estimating_margin_tiers FOR ALL
  USING (public.can_manage_estimating_config())
  WITH CHECK (public.can_manage_estimating_config());

-- Seed from the company's 12-month plan, Section 10 -- confirmed values,
-- not placeholders. Idempotent: only seeds if the table is empty, so
-- re-running this migration never overwrites values a Super Admin has
-- since edited.
INSERT INTO public.estimating_margin_tiers (label, lo_cents, hi_cents, min_margin, target_margin, typical_weeks, sort_order)
SELECT * FROM (VALUES
  ('Under $5,000',      0,        500000::bigint,  0.40, 0.48, 0.6, 1),
  ('$5,000-$10,000',    500000,   1000000::bigint, 0.35, 0.40, 1.0, 2),
  ('$10,000-$20,000',   1000000,  2000000::bigint, 0.30, 0.35, 2.0, 3),
  ('$20,000-$30,000',   2000000,  3000000::bigint, 0.26, 0.30, 3.0, 4),
  ('$30,000-$50,000',   3000000,  5000000::bigint, 0.22, 0.26, 5.0, 5),
  ('$50,000+',          5000000,  NULL::bigint,    0.18, 0.22, 8.0, 6)
) AS seed(label, lo_cents, hi_cents, min_margin, target_margin, typical_weeks, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.estimating_margin_tiers);

-- ---------------------------------------------------------------------------
-- Rate card -- a single company-wide row (not versioned yet; the pricing
-- snapshot taken per-estimate in migration 3 is what preserves history, so
-- this table itself doesn't need to be).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimating_rate_card (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_rate_cents integer NOT NULL DEFAULT 4200,
  overhead_pct numeric(5,4) NOT NULL DEFAULT 0.10,
  contingency_pct numeric(5,4) NOT NULL DEFAULT 0.06,
  tax_pct numeric(5,4) NOT NULL DEFAULT 0.06,
  minimum_charge_cents integer NOT NULL DEFAULT 75000,
  delivery_flat_cents integer NOT NULL DEFAULT 15000,
  disposal_flat_cents integer NOT NULL DEFAULT 20000,
  default_crew_size integer NOT NULL DEFAULT 2,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_estimating_rate_card_touch ON public.estimating_rate_card;
CREATE TRIGGER trg_estimating_rate_card_touch
  BEFORE UPDATE ON public.estimating_rate_card
  FOR EACH ROW EXECUTE FUNCTION public.touch_estimating_updated_at();

ALTER TABLE public.estimating_rate_card ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimating_rate_card_select ON public.estimating_rate_card;
CREATE POLICY estimating_rate_card_select ON public.estimating_rate_card FOR SELECT
  USING (public.can_view_estimating());

DROP POLICY IF EXISTS estimating_rate_card_write ON public.estimating_rate_card;
CREATE POLICY estimating_rate_card_write ON public.estimating_rate_card FOR ALL
  USING (public.can_manage_estimating_config())
  WITH CHECK (public.can_manage_estimating_config());

INSERT INTO public.estimating_rate_card (labor_rate_cents, overhead_pct, contingency_pct, tax_pct, minimum_charge_cents, delivery_flat_cents, disposal_flat_cents, default_crew_size)
SELECT 4200, 0.10, 0.06, 0.06, 75000, 15000, 20000, 2
WHERE NOT EXISTS (SELECT 1 FROM public.estimating_rate_card);

-- ---------------------------------------------------------------------------
-- Reusable assemblies -- unit-cost building blocks a takeoff line pulls
-- from (migration 3). Free-text category, not an enum, since trade
-- categories will grow over time without needing a migration.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimating_assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL,
  material_cost_per_unit_cents integer NOT NULL DEFAULT 0,
  labor_hours_per_unit numeric(6,3) NOT NULL DEFAULT 0,
  waste_factor numeric(5,4) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimating_assemblies_category ON public.estimating_assemblies(category);

DROP TRIGGER IF EXISTS trg_estimating_assemblies_touch ON public.estimating_assemblies;
CREATE TRIGGER trg_estimating_assemblies_touch
  BEFORE UPDATE ON public.estimating_assemblies
  FOR EACH ROW EXECUTE FUNCTION public.touch_estimating_updated_at();

ALTER TABLE public.estimating_assemblies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimating_assemblies_select ON public.estimating_assemblies;
CREATE POLICY estimating_assemblies_select ON public.estimating_assemblies FOR SELECT
  USING (public.can_view_estimating());

DROP POLICY IF EXISTS estimating_assemblies_write ON public.estimating_assemblies;
CREATE POLICY estimating_assemblies_write ON public.estimating_assemblies FOR ALL
  USING (public.can_manage_estimating_config())
  WITH CHECK (public.can_manage_estimating_config());

INSERT INTO public.estimating_assemblies (category, name, unit, material_cost_per_unit_cents, labor_hours_per_unit, waste_factor)
SELECT * FROM (VALUES
  ('Fencing',         'Wood fence',                   'linear ft', 2800, 0.40, 0.08),
  ('Framing',         'Basement framing',              'sq ft',     450, 0.12, 0.10),
  ('Drywall',         'Drywall install + finish',      'sq ft',     160, 0.09, 0.10),
  ('Paint',           'Interior paint (walls)',        'sq ft',      45, 0.02, 0.05),
  ('Flooring',        'LVP flooring',                  'sq ft',     320, 0.05, 0.08),
  ('Doors/Windows',   'Window install',                'each',    45000, 3.00, 0.02),
  ('Doors/Windows',   'Interior door install',         'each',    18000, 1.50, 0.02),
  ('Trim',            'Baseboard + trim',               'linear ft', 240, 0.06, 0.10)
) AS seed(category, name, unit, material_cost_per_unit_cents, labor_hours_per_unit, waste_factor)
WHERE NOT EXISTS (SELECT 1 FROM public.estimating_assemblies);
