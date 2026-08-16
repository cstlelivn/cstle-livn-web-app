// Deterministic pricing math for the estimating tool -- ported from the
// standalone prototype, working in integer cents throughout (matching the
// *_cents columns in supabase/migrations/20240043-45_estimating_*.sql)
// instead of floating-point dollars.
//
// HARD RULE, carried over from the prototype and the original spec: this
// file is the ONLY place prices/quantities/totals get computed. AI never
// touches these numbers -- it only organizes notes, drafts scope/questions/
// plan/proposal text, and suggests draft takeoff quantities a human must
// explicitly confirm (source = 'confirmed') before they ever reach these
// functions. Nothing here should ever import an AI response and treat a
// number in it as authoritative.
//
// IMPORTANT (see migration 3's comment): the rate card and assemblies'
// cost columns are Super-Admin-only at the RLS level, not just hidden in
// the UI. That means these functions can only run somewhere that actually
// has that data -- a Super Admin's own browser, or the pricing edge
// function (service-role, bypasses RLS) for everyone else. Non-Super-Admin
// screens never import this file's cost-computing functions directly
// against live data; they call the edge function and render whatever
// subset of the response it decided to include.

export interface MarginTier {
  id: string;
  label: string;
  lo_cents: number;
  hi_cents: number | null;
  min_margin: number;
  target_margin: number;
  typical_weeks: number;
  sort_order: number;
}

export interface RateCard {
  labor_rate_cents: number;
  overhead_pct: number;
  contingency_pct: number;
  tax_pct: number;
  minimum_charge_cents: number;
  delivery_flat_cents: number;
  disposal_flat_cents: number;
  default_crew_size: number;
}

export interface Assembly {
  id: string;
  category: string;
  name: string;
  unit: string;
  material_cost_per_unit_cents: number;
  labor_hours_per_unit: number;
  waste_factor: number;
}

export interface TakeoffLineForPricing {
  qty: number;
  assembly: Assembly | null;
}

export interface PricingExtras {
  equipmentCents: number;
  subcontractorCents: number;
  deliveryCents: number;
  disposalCents: number;
  crewSize: number;
}

export interface LineCost {
  materialCostCents: number;
  laborHours: number;
  laborCostCents: number;
  lineTotalCents: number;
}

export interface PricingResult {
  materialTotalCents: number;
  laborHoursTotal: number;
  laborCostTotalCents: number;
  equipmentCents: number;
  subcontractorCents: number;
  deliveryCents: number;
  disposalCents: number;
  directCostCents: number;
  overheadCents: number;
  contingencyCents: number;
  totalCostCents: number;
  tier: MarginTier;
  sellingPriceGoodCents: number;
  sellingPriceBetterCents: number;
  sellingPriceBestCents: number;
  gpGoodCents: number;
  gpBetterCents: number;
  gpBestCents: number;
  marginGood: number;
  marginBetter: number;
  marginBest: number;
  durationWeeks: number;
  crewSize: number;
}

/** Customer-safe subset of PricingResult -- everything estimate_pricing_summary() returns, nothing more. */
export type PricingSummary = Pick<
  PricingResult,
  "sellingPriceGoodCents" | "sellingPriceBetterCents" | "sellingPriceBestCents" | "durationWeeks" | "crewSize"
> & { tierLabel: string };

const BETTER_MARGIN_BOOST = 0.05;
const BEST_MARGIN_BOOST = 0.10;

export function getTier(priceCents: number, tiers: MarginTier[]): MarginTier {
  const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
  return (
    sorted.find((t) => priceCents >= t.lo_cents && (t.hi_cents === null || priceCents < t.hi_cents)) ??
    sorted[sorted.length - 1]
  );
}

export function computeLine(line: TakeoffLineForPricing, rateCard: RateCard): LineCost {
  const a = line.assembly;
  if (!a) return { materialCostCents: 0, laborHours: 0, laborCostCents: 0, lineTotalCents: 0 };
  const wasteQty = line.qty * (1 + (a.waste_factor || 0));
  const materialCostCents = Math.round(wasteQty * a.material_cost_per_unit_cents);
  const laborHours = line.qty * a.labor_hours_per_unit;
  const laborCostCents = Math.round(laborHours * rateCard.labor_rate_cents);
  return { materialCostCents, laborHours, laborCostCents, lineTotalCents: materialCostCents + laborCostCents };
}

/**
 * Full deterministic pricing calc, cents in, cents out. Mirrors the
 * prototype's computePricing() exactly, including the two-pass tier
 * derivation (guess a tier from a rough price, price off that tier's
 * target margin, then re-derive the tier from the ACTUAL resulting price
 * in case the first guess landed in the wrong band, then reprice once more).
 */
export function computePricing(
  lines: TakeoffLineForPricing[],
  rateCard: RateCard,
  tiers: MarginTier[],
  extras: PricingExtras
): PricingResult {
  let materialTotalCents = 0;
  let laborHoursTotal = 0;
  let laborCostTotalCents = 0;
  for (const line of lines) {
    const c = computeLine(line, rateCard);
    materialTotalCents += c.materialCostCents;
    laborHoursTotal += c.laborHours;
    laborCostTotalCents += c.laborCostCents;
  }

  const { equipmentCents, subcontractorCents, deliveryCents, disposalCents } = extras;
  const directCostCents = materialTotalCents + laborCostTotalCents + equipmentCents + subcontractorCents + deliveryCents + disposalCents;
  const overheadCents = Math.round(directCostCents * rateCard.overhead_pct);
  const contingencyCents = Math.round(directCostCents * rateCard.contingency_pct);
  const totalCostCents = directCostCents + overheadCents + contingencyCents;

  const guessCents = Math.round(totalCostCents / (1 - 0.30));
  let tier = getTier(guessCents, tiers);
  let sellingPriceGoodCents = Math.max(Math.round(totalCostCents / (1 - tier.target_margin)), rateCard.minimum_charge_cents);
  tier = getTier(sellingPriceGoodCents, tiers);
  sellingPriceGoodCents = Math.max(Math.round(totalCostCents / (1 - tier.target_margin)), rateCard.minimum_charge_cents);

  const sellingPriceBetterCents = Math.round(totalCostCents / (1 - (tier.target_margin + BETTER_MARGIN_BOOST)));
  const sellingPriceBestCents = Math.round(totalCostCents / (1 - (tier.target_margin + BEST_MARGIN_BOOST)));

  const gpGoodCents = sellingPriceGoodCents - totalCostCents;
  const gpBetterCents = sellingPriceBetterCents - totalCostCents;
  const gpBestCents = sellingPriceBestCents - totalCostCents;

  const crewSize = extras.crewSize || rateCard.default_crew_size || 2;
  const durationWeeks = laborHoursTotal > 0 ? laborHoursTotal / (crewSize * 40) : 0;

  return {
    materialTotalCents, laborHoursTotal, laborCostTotalCents,
    equipmentCents, subcontractorCents, deliveryCents, disposalCents,
    directCostCents, overheadCents, contingencyCents, totalCostCents,
    tier,
    sellingPriceGoodCents, sellingPriceBetterCents, sellingPriceBestCents,
    gpGoodCents, gpBetterCents, gpBestCents,
    marginGood: gpGoodCents / sellingPriceGoodCents,
    marginBetter: gpBetterCents / sellingPriceBetterCents,
    marginBest: gpBestCents / sellingPriceBestCents,
    durationWeeks,
    crewSize,
  };
}

export function toPricingSummary(r: PricingResult): PricingSummary {
  return {
    sellingPriceGoodCents: r.sellingPriceGoodCents,
    sellingPriceBetterCents: r.sellingPriceBetterCents,
    sellingPriceBestCents: r.sellingPriceBestCents,
    durationWeeks: r.durationWeeks,
    crewSize: r.crewSize,
    tierLabel: r.tier.label,
  };
}

// ---------------------------------------------------------------------------
// Crew size <-> duration, bidirectional (per the business-plan doc's
// Section 10 duration-per-tier figures, generalized to any job): given a
// target duration, suggest the crew needed to hit it; given a crew size,
// show the resulting duration. This is a per-JOB calculation -- distinct
// from the company-wide "how many crews to hit $100k/month" capacity
// planner in the doc's Section 11, which is deliberately deferred.
// ---------------------------------------------------------------------------
export function durationWeeksForCrew(laborHoursTotal: number, crewSize: number): number {
  if (crewSize <= 0) return 0;
  return laborHoursTotal / (crewSize * 40);
}

export function suggestedCrewForDuration(laborHoursTotal: number, targetWeeks: number): number {
  if (targetWeeks <= 0) return 0;
  return Math.max(1, Math.ceil(laborHoursTotal / (targetWeeks * 40)));
}

// ---------------------------------------------------------------------------
// Quick Check -- the fast standalone margin evaluator from the prototype's
// "Layer 1". Kept as pure logic; no screen wires this up yet (out of scope
// for the current 9-screen build), but it's cheap, self-contained, and
// faithful to port now rather than reconstruct later.
// ---------------------------------------------------------------------------
export interface QuickCheckInput {
  priceCents: number;
  directCostCents: number;
  weeks: number;
  marketCeilingCents: number | null;
}

export interface QuickCheckResult {
  tier: MarginTier;
  profitCents: number;
  margin: number;
  profitPerWeekCents: number;
  targetProfitPerWeekCents: number;
  budgetWeeks: number;
  decision: "go" | "caution" | "decline";
  label: string;
  reason: string;
  durationStatus: "ok" | "over";
  durationNote: string;
}

export function evaluateQuick(input: QuickCheckInput, tiers: MarginTier[]): QuickCheckResult {
  const { priceCents, directCostCents, weeks, marketCeilingCents } = input;
  const tier = getTier(priceCents, tiers);
  const profitCents = priceCents - directCostCents;
  const margin = priceCents > 0 ? profitCents / priceCents : 0;
  const profitPerWeekCents = weeks > 0 ? profitCents / weeks : profitCents;
  const targetProfitPerWeekCents = (priceCents * tier.target_margin) / tier.typical_weeks;
  const budgetWeeks = targetProfitPerWeekCents > 0 ? profitCents / targetProfitPerWeekCents : weeks;
  const paceFloor = tier.min_margin * 0.6;

  let decision: QuickCheckResult["decision"];
  let label: string;
  let reason: string;
  if (margin >= tier.target_margin) {
    decision = "go"; label = "Take it";
    reason = `Margin of ${(margin * 100).toFixed(1)}% meets or beats the ${(tier.target_margin * 100).toFixed(1)}% target for a job this size.`;
  } else if (profitPerWeekCents >= targetProfitPerWeekCents && margin >= paceFloor) {
    decision = "go"; label = "Take it";
    reason = `Margin is under target, but at ${weeks.toFixed(1)} wk this earns more than the per-week benchmark -- pace is compensating.`;
  } else if (margin >= tier.min_margin) {
    decision = "caution"; label = "Take with caution";
    reason = `Margin clears the ${(tier.min_margin * 100).toFixed(1)}% minimum but pace doesn't. Worth it mainly to fill idle time.`;
  } else {
    decision = "decline"; label = "Reprice or decline";
    reason = `Margin is below the ${(tier.min_margin * 100).toFixed(1)}% minimum, and pace isn't fast enough to make up the difference.`;
  }

  let durationStatus: QuickCheckResult["durationStatus"];
  let durationNote: string;
  if (weeks <= budgetWeeks * 1.05) {
    durationStatus = "ok";
    durationNote = `Scope fits inside the budget of ~${budgetWeeks.toFixed(1)} weeks -- proceed with the standard crew.`;
  } else {
    durationStatus = "over";
    const suggestedPriceCents = Math.round(targetProfitPerWeekCents * weeks + directCostCents);
    const overCeiling = marketCeilingCents != null && suggestedPriceCents > marketCeilingCents;
    durationNote = overCeiling
      ? `Realistic duration runs past the ${budgetWeeks.toFixed(1)}-week budget, and holding profit/week would need more than the market ceiling -- scope down or decline.`
      : `Realistic duration runs past the ${budgetWeeks.toFixed(1)}-week budget. Add crew to compress it, or move price up to hold profit/week steady.`;
  }

  return { tier, profitCents, margin, profitPerWeekCents, targetProfitPerWeekCents, budgetWeeks, decision, label, reason, durationStatus, durationNote };
}
