-- Estimating & profitability tool, migration 3 of 4: takeoff lines,
-- pricing snapshots, proposals, and the (informal) customer approval
-- record.
--
-- IMPORTANT correction to migration 1: `estimating_assemblies` and
-- `estimating_rate_card` were made readable by can_view_estimating()
-- (Super Admin/Admin/Manager/Accountant), but their columns ARE the
-- company's cost basis -- material cost/unit, labor hours/unit, burdened
-- labor rate. The locked decision for this feature is "cost and margin are
-- Super Admin only," and per this project's own standing rule, RLS is the
-- real security boundary, not the UI -- so that decision has to be
-- enforced at the table level, not just hidden client-side. This migration
-- tightens both tables' SELECT policy to can_view_estimating_margins()
-- (Super Admin only) and adds a SECURITY DEFINER "picker" function so
-- anyone who can run estimating can still list assemblies by name/unit to
-- build a takeoff, without ever reading their cost columns.
--
-- Practical consequence: the actual pricing calculation (deterministic
-- formula off the rate card/assemblies/tiers) cannot run in a non-Super-
-- Admin's browser at all, since their session can no longer read the cost
-- inputs. It has to run server-side (an edge function using the service-
-- role key), returning only customer-safe numbers to everyone except Super
-- Admin. That edge function is application-code, built after migration 4;
-- this migration just makes sure the schema can't be read around.

-- ---------------------------------------------------------------------------
-- Tighten migration 1's cost-bearing config tables.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS estimating_margin_tiers_select ON public.estimating_margin_tiers;
CREATE POLICY estimating_margin_tiers_select ON public.estimating_margin_tiers FOR SELECT
  USING (public.can_view_estimating_margins());
-- Tiers stay Super-Admin-only for read too -- min/target margin percentages
-- are exactly the number this feature exists to keep private.

DROP POLICY IF EXISTS estimating_assemblies_select ON public.estimating_assemblies;
CREATE POLICY estimating_assemblies_select ON public.estimating_assemblies FOR SELECT
  USING (public.can_view_estimating_margins());

DROP POLICY IF EXISTS estimating_rate_card_select ON public.estimating_rate_card;
CREATE POLICY estimating_rate_card_select ON public.estimating_rate_card FOR SELECT
  USING (public.can_view_estimating_margins());

-- Column-limited read path for whoever can run estimating but not see
-- margins: id/category/name/unit/active only, no cost columns. SECURITY
-- DEFINER so it can read the now-restricted table internally; the
-- can_view_estimating() check inside is what actually gates who gets rows
-- back, same idiom as task_time_summary() in 20240017_reporting_views.sql.
CREATE OR REPLACE FUNCTION public.estimating_assemblies_for_picker()
RETURNS TABLE (id uuid, category text, name text, unit text, active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT a.id, a.category, a.name, a.unit, a.active
  FROM public.estimating_assemblies a
  WHERE public.can_view_estimating() AND a.active;
$$;

-- ---------------------------------------------------------------------------
-- Pricing-extras columns on the estimate itself (equipment/subcontractor/
-- delivery/disposal add-ons + crew size) -- estimate-level state, same
-- reasoning as capture_notes in migration 2. Also the public-approval-link
-- token, added now so a later "customer views proposal without a staff
-- login" build doesn't need its own migration.
-- ---------------------------------------------------------------------------
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS pricing_equipment_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS pricing_subcontractor_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS pricing_delivery_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS pricing_disposal_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS pricing_crew_size integer;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS public_approval_token uuid;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS public_approval_token_expires_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_estimates_public_approval_token
  ON public.estimates(public_approval_token) WHERE public_approval_token IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Takeoff lines. No cost columns here at all -- cost is always derived
-- (qty * assembly rates), never stored per-line; the only place a cost
-- number is ever persisted is the immutable pricing snapshot below.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimate_takeoff_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  assembly_id uuid REFERENCES public.estimating_assemblies(id) ON DELETE SET NULL,
  description text,
  qty numeric(10,3) NOT NULL CHECK (qty > 0),
  unit text,
  -- Every AI-drafted takeoff line starts as 'ai-assumption' and must be
  -- explicitly confirmed by a human before pricing can be run against it --
  -- this is the DB-level anchor for "AI suggests draft takeoff quantities
  -- that a human must explicitly confirm before they're used in any
  -- price." The actual enforcement (block pricing while any line is still
  -- ai-assumption) lives in the pricing edge function, not a table
  -- constraint here, since it depends on ALL sibling rows, not just this one.
  source text NOT NULL DEFAULT 'confirmed' CHECK (source IN ('ai-assumption', 'confirmed')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_takeoff_lines_estimate ON public.estimate_takeoff_lines(estimate_id);

DROP TRIGGER IF EXISTS trg_estimate_takeoff_lines_touch ON public.estimate_takeoff_lines;
CREATE TRIGGER trg_estimate_takeoff_lines_touch
  BEFORE UPDATE ON public.estimate_takeoff_lines
  FOR EACH ROW EXECUTE FUNCTION public.touch_estimating_updated_at();

ALTER TABLE public.estimate_takeoff_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimate_takeoff_lines_select ON public.estimate_takeoff_lines;
CREATE POLICY estimate_takeoff_lines_select ON public.estimate_takeoff_lines FOR SELECT
  USING (public.can_view_estimating());
DROP POLICY IF EXISTS estimate_takeoff_lines_write ON public.estimate_takeoff_lines;
CREATE POLICY estimate_takeoff_lines_write ON public.estimate_takeoff_lines FOR ALL
  USING (public.can_run_estimating())
  WITH CHECK (public.can_run_estimating());

-- ---------------------------------------------------------------------------
-- Pricing snapshots -- one immutable row per "Confirm Pricing" click, not
-- one row updated in place. Re-confirming after changing the takeoff
-- creates a new snapshot, so a full pricing history survives even if the
-- estimator revises quantities several times before sending a proposal.
-- Cost/margin columns here are exactly what can_view_estimating_margins()
-- gates -- the whole point of this table existing separately from the
-- customer-safe proposal/approval data below.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimate_pricing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  material_total_cents bigint NOT NULL,
  labor_hours_total numeric(8,2) NOT NULL,
  labor_cost_total_cents bigint NOT NULL,
  equipment_cents integer NOT NULL DEFAULT 0,
  subcontractor_cents integer NOT NULL DEFAULT 0,
  delivery_cents integer NOT NULL DEFAULT 0,
  disposal_cents integer NOT NULL DEFAULT 0,
  direct_cost_cents bigint NOT NULL,
  overhead_cents bigint NOT NULL,
  contingency_cents bigint NOT NULL,
  total_cost_cents bigint NOT NULL,
  tier_label text NOT NULL,
  tier_min_margin numeric(5,4) NOT NULL,
  tier_target_margin numeric(5,4) NOT NULL,
  selling_price_good_cents bigint NOT NULL,
  selling_price_better_cents bigint NOT NULL,
  selling_price_best_cents bigint NOT NULL,
  gp_good_cents bigint NOT NULL,
  gp_better_cents bigint NOT NULL,
  gp_best_cents bigint NOT NULL,
  margin_good numeric(6,5) NOT NULL,
  margin_better numeric(6,5) NOT NULL,
  margin_best numeric(6,5) NOT NULL,
  duration_weeks numeric(6,2) NOT NULL,
  crew_size integer NOT NULL,
  confirmed_by uuid REFERENCES auth.users(id),
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_pricing_snapshots_estimate
  ON public.estimate_pricing_snapshots(estimate_id, confirmed_at DESC);

ALTER TABLE public.estimate_pricing_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimate_pricing_snapshots_select ON public.estimate_pricing_snapshots;
CREATE POLICY estimate_pricing_snapshots_select ON public.estimate_pricing_snapshots FOR SELECT
  USING (public.can_view_estimating_margins());

-- Direct inserts are Super-Admin-only too (defense in depth) -- the real
-- write path is the pricing edge function, which uses the service-role key
-- and bypasses RLS entirely so it can write a full snapshot even when
-- triggered by an Admin/Manager who can't read this table themselves.
DROP POLICY IF EXISTS estimate_pricing_snapshots_insert ON public.estimate_pricing_snapshots;
CREATE POLICY estimate_pricing_snapshots_insert ON public.estimate_pricing_snapshots FOR INSERT
  WITH CHECK (public.can_view_estimating_margins());
-- No UPDATE/DELETE policy at all -- immutable, same convention as permit events.

-- Customer-safe read path: Good/Better/Best price, duration, tier label,
-- confirmed-at -- everything the Pricing/Proposal screens need to show an
-- Admin/Manager, with every cost/margin column left out entirely (not just
-- hidden client-side). Always reads the LATEST snapshot for the estimate.
CREATE OR REPLACE FUNCTION public.estimate_pricing_summary(p_estimate_id uuid)
RETURNS TABLE (
  selling_price_good_cents bigint,
  selling_price_better_cents bigint,
  selling_price_best_cents bigint,
  tier_label text,
  duration_weeks numeric,
  crew_size integer,
  confirmed_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT s.selling_price_good_cents, s.selling_price_better_cents, s.selling_price_best_cents,
         s.tier_label, s.duration_weeks, s.crew_size, s.confirmed_at
  FROM public.estimate_pricing_snapshots s
  WHERE s.estimate_id = p_estimate_id AND public.can_view_estimating()
  ORDER BY s.confirmed_at DESC
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Proposals -- AI-drafted Good/Better/Best copy + customer message. Not
-- cost-sensitive (it's written using the already-customer-safe selling
-- prices, never cost/margin), so this is can_view_estimating()-readable
-- like the rest of the pipeline.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimate_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  good_headline text, good_body text,
  better_headline text, better_body text,
  best_headline text, best_body text,
  customer_message text,
  selected_tier text CHECK (selected_tier IN ('good', 'better', 'best')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_proposals_estimate ON public.estimate_proposals(estimate_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_estimate_proposals_touch ON public.estimate_proposals;
CREATE TRIGGER trg_estimate_proposals_touch
  BEFORE UPDATE ON public.estimate_proposals
  FOR EACH ROW EXECUTE FUNCTION public.touch_estimating_updated_at();

ALTER TABLE public.estimate_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimate_proposals_select ON public.estimate_proposals;
CREATE POLICY estimate_proposals_select ON public.estimate_proposals FOR SELECT
  USING (public.can_view_estimating());
DROP POLICY IF EXISTS estimate_proposals_write ON public.estimate_proposals;
CREATE POLICY estimate_proposals_write ON public.estimate_proposals FOR ALL
  USING (public.can_run_estimating())
  WITH CHECK (public.can_run_estimating());

-- ---------------------------------------------------------------------------
-- Approval -- informal record only, per the explicit product decision: a
-- drawn signature image (stored as real R2 media, not an inline data URL --
-- extend estimate_media's media_kind check to allow 'signature') plus a
-- timestamp. Not legally binding, no payment captured. One row per
-- estimate; permanent, append-only (no UPDATE/DELETE policy), same as
-- permit events.
-- ---------------------------------------------------------------------------
ALTER TABLE public.estimate_media DROP CONSTRAINT IF EXISTS estimate_media_media_kind_check;
ALTER TABLE public.estimate_media ADD CONSTRAINT estimate_media_media_kind_check
  CHECK (media_kind IN ('photo', 'video', 'audio', 'document', 'signature'));

CREATE TABLE IF NOT EXISTS public.estimate_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL UNIQUE REFERENCES public.estimates(id) ON DELETE CASCADE,
  selected_tier text NOT NULL CHECK (selected_tier IN ('good', 'better', 'best')),
  deposit_pct numeric(5,2) NOT NULL DEFAULT 30,
  signature_media_id uuid REFERENCES public.estimate_media(id) ON DELETE SET NULL,
  customer_name text,
  approved_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estimate_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimate_approvals_select ON public.estimate_approvals;
CREATE POLICY estimate_approvals_select ON public.estimate_approvals FOR SELECT
  USING (public.can_view_estimating());
DROP POLICY IF EXISTS estimate_approvals_insert ON public.estimate_approvals;
CREATE POLICY estimate_approvals_insert ON public.estimate_approvals FOR INSERT
  WITH CHECK (public.can_run_estimating());
-- No UPDATE/DELETE -- a recorded approval is permanent history.
