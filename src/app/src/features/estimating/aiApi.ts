import { apiCall } from '../../../utils/supabase/client.tsx';

// Thin wrappers around the estimating AI/pricing edge-function routes
// (supabase/functions/make-server-bcab437c/index.ts). No API key and no
// cost/rate-card data ever touch the browser through these -- see that
// file's "Estimating AI routes" section header for the full boundary.

export async function analyzeCapture(estimateId: string) {
  const result = await apiCall('/estimating/analyze-capture', { method: 'POST', requiresAuth: true, body: { estimateId } });
  return result.analysis;
}

export async function generatePlan(estimateId: string) {
  const result = await apiCall('/estimating/generate-plan', { method: 'POST', requiresAuth: true, body: { estimateId } });
  return result.plan;
}

export async function generateProposal(estimateId: string) {
  const result = await apiCall('/estimating/generate-proposal', { method: 'POST', requiresAuth: true, body: { estimateId } });
  return result.proposal;
}

export interface PricingResponse {
  pricing: {
    selling_price_good_cents: number;
    selling_price_better_cents: number;
    selling_price_best_cents: number;
    tier_label: string;
    duration_weeks: number;
    crew_size: number;
    confirmed_at: string;
    // Present only when canViewMargins is true (Super Admin):
    material_total_cents?: number;
    labor_hours_total?: number;
    labor_cost_total_cents?: number;
    direct_cost_cents?: number;
    overhead_cents?: number;
    contingency_cents?: number;
    total_cost_cents?: number;
    gp_good_cents?: number;
    gp_better_cents?: number;
    gp_best_cents?: number;
    margin_good?: number;
    margin_better?: number;
    margin_best?: number;
  };
  canViewMargins: boolean;
}

export async function runPricing(estimateId: string, confirm: boolean): Promise<PricingResponse> {
  return apiCall('/estimating/pricing', { method: 'POST', requiresAuth: true, body: { estimateId, confirm } }) as Promise<PricingResponse>;
}
