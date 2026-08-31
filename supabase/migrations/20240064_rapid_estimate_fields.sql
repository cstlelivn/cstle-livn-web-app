-- Mobile-first rapid estimator: persist the customer-facing agreed price and
-- conventional estimate-sheet terms without changing immutable cost snapshots.
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS agreed_price_cents bigint CHECK (agreed_price_cents IS NULL OR agreed_price_cents >= 0),
  ADD COLUMN IF NOT EXISTS estimate_terms text,
  ADD COLUMN IF NOT EXISTS estimate_valid_until date,
  ADD COLUMN IF NOT EXISTS estimate_sent_at timestamptz;

COMMENT ON COLUMN public.estimates.agreed_price_cents IS
  'Final customer-facing amount accepted by the estimator; internal cost/margin remains in protected pricing snapshots.';
