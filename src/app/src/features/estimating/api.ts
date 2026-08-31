import { createClient, apiCall } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';
import { optimizeMediaFile } from '../media/api';
import type { MarginTier, RateCard, Assembly } from './pricingEngine';

const supabase = createClient();

function isMissingTableError(error: any) {
  return error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist') ||
    error?.code === 'PGRST204' ||
    error?.code === '42P01';
}

// ---------------------------------------------------------------------------
// Estimates
// ---------------------------------------------------------------------------
export interface Estimate {
  id: string;
  client_id: string;
  lead_id: string | null;
  name: string;
  site_address: string | null;
  status: string;
  capture_confirmed: boolean;
  analysis_confirmed: boolean;
  scope_confirmed: boolean;
  plan_confirmed: boolean;
  pricing_confirmed: boolean;
  proposal_approved: boolean;
  customer_approved: boolean;
  ai_analysis: any;
  ai_analysis_generated_at: string | null;
  scope_of_work: string | null;
  project_plan: any;
  project_plan_generated_at: string | null;
  capture_notes: string | null;
  capture_walkthrough: string | null;
  pricing_equipment_cents: number;
  pricing_subcontractor_cents: number;
  pricing_delivery_cents: number;
  pricing_disposal_cents: number;
  pricing_crew_size: number | null;
  agreed_price_cents: number | null;
  estimate_terms: string | null;
  estimate_valid_until: string | null;
  estimate_sent_at: string | null;
  converted_project_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function listEstimates(): Promise<Estimate[]> {
  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) return [];
    failIf(error, 'Failed to list estimates');
  }
  return data ?? [];
}

export async function getEstimate(id: string): Promise<Estimate | null> {
  const { data, error } = await supabase.from('estimates').select('*').eq('id', id).maybeSingle();
  failIf(error, 'Failed to load estimate');
  return data;
}

export async function createEstimate(input: { client_id: string; lead_id?: string; name: string; site_address?: string; created_by?: string }): Promise<Estimate> {
  const { data, error } = await supabase.from('estimates').insert({
    client_id: input.client_id,
    lead_id: input.lead_id || null,
    name: input.name,
    site_address: input.site_address || null,
    created_by: input.created_by || null,
  }).select().single();
  failIf(error, 'Failed to create estimate');
  return data;
}

export async function updateEstimate(id: string, updates: Partial<Estimate>): Promise<Estimate> {
  const { data, error } = await supabase.from('estimates').update(updates).eq('id', id).select().single();
  failIf(error, 'Failed to update estimate');
  return data;
}

// ---------------------------------------------------------------------------
// Site capture -- measurements & documents
// ---------------------------------------------------------------------------
export interface EstimateMeasurement { id: string; estimate_id: string; label: string; value: string; unit: string | null; created_at: string; }
export interface EstimateDocument { id: string; estimate_id: string; name: string; note: string | null; created_at: string; }

export async function listMeasurements(estimateId: string): Promise<EstimateMeasurement[]> {
  const { data, error } = await supabase.from('estimate_measurements').select('*').eq('estimate_id', estimateId).order('created_at');
  if (error) { if (isMissingTableError(error)) return []; failIf(error, 'Failed to list measurements'); }
  return data ?? [];
}
export async function addMeasurement(estimateId: string, label: string, value: string, unit?: string): Promise<EstimateMeasurement> {
  const { data, error } = await supabase.from('estimate_measurements').insert({ estimate_id: estimateId, label, value, unit: unit || null }).select().single();
  failIf(error, 'Failed to add measurement');
  return data;
}
export async function deleteMeasurement(id: string): Promise<void> {
  const { error } = await supabase.from('estimate_measurements').delete().eq('id', id);
  failIf(error, 'Failed to remove measurement');
}

export async function listDocuments(estimateId: string): Promise<EstimateDocument[]> {
  const { data, error } = await supabase.from('estimate_documents').select('*').eq('estimate_id', estimateId).order('created_at');
  if (error) { if (isMissingTableError(error)) return []; failIf(error, 'Failed to list documents'); }
  return data ?? [];
}
export async function addDocument(estimateId: string, name: string, note?: string): Promise<EstimateDocument> {
  const { data, error } = await supabase.from('estimate_documents').insert({ estimate_id: estimateId, name, note: note || null }).select().single();
  failIf(error, 'Failed to add document');
  return data;
}
export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('estimate_documents').delete().eq('id', id);
  failIf(error, 'Failed to remove document');
}

// ---------------------------------------------------------------------------
// Estimate media -- R2-backed, same signed-URL flow as task media
// (src/app/src/features/media/api.ts), reusing its optimizeMediaFile()
// (compression + HEIC handling) so photos taken here get the exact same
// treatment as onsite task evidence.
// ---------------------------------------------------------------------------
export interface EstimateMedia {
  id: string;
  estimate_id: string;
  original_filename: string;
  content_type: string;
  byte_size: number;
  media_kind: 'photo' | 'video' | 'audio' | 'document' | 'signature';
  caption: string | null;
  created_at: string;
  url: string;
}

export async function listEstimateMedia(estimateId: string): Promise<EstimateMedia[]> {
  const params = new URLSearchParams({ estimateId });
  const result = await apiCall(`/estimate-media?${params}`, { requiresAuth: true });
  return (result.media ?? []) as EstimateMedia[];
}

export async function uploadEstimateMedia(estimateId: string, file: File, caption?: string, mediaKind?: 'signature', preservePlanDetail = false, maxBytes?: number): Promise<EstimateMedia> {
  const optimized = mediaKind === 'signature' ? file : await optimizeMediaFile(file, preservePlanDetail);
  if (maxBytes && optimized.size > maxBytes) {
    throw new Error("This plan could not be compressed below 2 MB. Try exporting it at a smaller size, then attach it again.");
  }
  const isDocument = optimized.type === 'application/pdf' || (!optimized.type.startsWith('image/') && !optimized.type.startsWith('video/') && !optimized.type.startsWith('audio/'));
  if (isDocument && optimized.size > 2 * 1024 * 1024) {
    throw new Error("Keep plans and PDFs under 2 MB. Compress this file, then try again.");
  }
  const prepared = await apiCall('/estimate-media/upload-url', {
    method: 'POST',
    requiresAuth: true,
    body: {
      estimateId,
      fileName: optimized.name,
      contentType: optimized.type,
      byteSize: optimized.size,
      caption: caption || null,
      mediaKind: mediaKind || null,
    },
  });
  const putResponse = await fetch(prepared.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': optimized.type },
    body: optimized,
  });
  if (!putResponse.ok) throw new Error('Upload to storage failed');
  const completed = await apiCall(`/estimate-media/${prepared.media.id}/complete`, { method: 'POST', requiresAuth: true });
  return completed.media as EstimateMedia;
}

export async function deleteEstimateMedia(id: string): Promise<void> {
  await apiCall(`/estimate-media/${id}`, { method: 'DELETE', requiresAuth: true });
}

// ---------------------------------------------------------------------------
// Takeoff lines
// ---------------------------------------------------------------------------
export interface TakeoffLine {
  id: string;
  estimate_id: string;
  assembly_id: string | null;
  description: string | null;
  qty: number;
  unit: string | null;
  source: 'ai-assumption' | 'confirmed';
  created_at: string;
}

export async function listTakeoffLines(estimateId: string): Promise<TakeoffLine[]> {
  const { data, error } = await supabase.from('estimate_takeoff_lines').select('*').eq('estimate_id', estimateId).order('created_at');
  if (error) { if (isMissingTableError(error)) return []; failIf(error, 'Failed to list takeoff lines'); }
  return data ?? [];
}
export async function addTakeoffLine(input: { estimate_id: string; assembly_id: string | null; description?: string; qty: number; unit?: string; source?: 'ai-assumption' | 'confirmed'; created_by?: string }): Promise<TakeoffLine> {
  const { data, error } = await supabase.from('estimate_takeoff_lines').insert({
    estimate_id: input.estimate_id,
    assembly_id: input.assembly_id,
    description: input.description || null,
    qty: input.qty,
    unit: input.unit || null,
    source: input.source || 'confirmed',
    created_by: input.created_by || null,
  }).select().single();
  failIf(error, 'Failed to add takeoff line');
  return data;
}
export async function confirmTakeoffLine(id: string): Promise<TakeoffLine> {
  const { data, error } = await supabase.from('estimate_takeoff_lines').update({ source: 'confirmed' }).eq('id', id).select().single();
  failIf(error, 'Failed to confirm takeoff line');
  return data;
}
export async function deleteTakeoffLine(id: string): Promise<void> {
  const { error } = await supabase.from('estimate_takeoff_lines').delete().eq('id', id);
  failIf(error, 'Failed to remove takeoff line');
}

// ---------------------------------------------------------------------------
// Assemblies picker -- column-limited (no cost data) via the SECURITY
// DEFINER function every can_view_estimating() role can call. Full
// assemblies/rate-card/tiers rows (with cost) are Super-Admin-only; see
// listEstimatingConfig() below.
// ---------------------------------------------------------------------------
export interface AssemblyPickerItem { id: string; category: string; name: string; unit: string; active: boolean; }

export async function listAssembliesForPicker(): Promise<AssemblyPickerItem[]> {
  const { data, error } = await supabase.rpc('estimating_assemblies_for_picker');
  if (error) { if (isMissingTableError(error)) return []; failIf(error, 'Failed to list assemblies'); }
  return data ?? [];
}

// Full cost-bearing config -- only resolves rows for a Super Admin session
// (RLS returns zero rows otherwise, not an error), used by the Config
// screen and the client-side pricing preview available only to Super Admin.
export async function listMarginTiers(): Promise<MarginTier[]> {
  const { data, error } = await supabase.from('estimating_margin_tiers').select('*').order('sort_order');
  if (error) { if (isMissingTableError(error)) return []; failIf(error, 'Failed to list margin tiers'); }
  return data ?? [];
}
export async function updateMarginTier(id: string, updates: Partial<MarginTier>): Promise<void> {
  const { error } = await supabase.from('estimating_margin_tiers').update(updates).eq('id', id);
  failIf(error, 'Failed to update margin tier');
}

export async function getRateCard(): Promise<RateCard & { id: string }> {
  const { data, error } = await supabase.from('estimating_rate_card').select('*').limit(1).single();
  failIf(error, 'Failed to load rate card');
  return data;
}
export async function updateRateCard(id: string, updates: Partial<RateCard>): Promise<void> {
  const { error } = await supabase.from('estimating_rate_card').update(updates).eq('id', id);
  failIf(error, 'Failed to update rate card');
}

export async function listAssembliesFull(): Promise<(Assembly & { id: string; active: boolean })[]> {
  const { data, error } = await supabase.from('estimating_assemblies').select('*').order('category');
  if (error) { if (isMissingTableError(error)) return []; failIf(error, 'Failed to list assemblies'); }
  return data ?? [];
}
export async function createAssembly(input: Omit<Assembly, 'id'> & { active?: boolean }): Promise<void> {
  const { error } = await supabase.from('estimating_assemblies').insert(input);
  failIf(error, 'Failed to add assembly');
}
export async function updateAssembly(id: string, updates: Partial<Assembly> & { active?: boolean }): Promise<void> {
  const { error } = await supabase.from('estimating_assemblies').update(updates).eq('id', id);
  failIf(error, 'Failed to update assembly');
}
export async function deleteAssembly(id: string): Promise<void> {
  const { error } = await supabase.from('estimating_assemblies').delete().eq('id', id);
  failIf(error, 'Failed to remove assembly');
}

// ---------------------------------------------------------------------------
// Pricing -- summary read only from the client; the actual confirm/compute
// call goes through the pricing edge function (POST /estimating/pricing),
// since it needs cost data most sessions can't read. See
// features/estimating/pricingApi.ts (added alongside the edge function).
// ---------------------------------------------------------------------------
export interface PricingSummaryRow {
  selling_price_good_cents: number;
  selling_price_better_cents: number;
  selling_price_best_cents: number;
  tier_label: string;
  duration_weeks: number;
  crew_size: number;
  confirmed_at: string;
}

export async function getPricingSummary(estimateId: string): Promise<PricingSummaryRow | null> {
  const { data, error } = await supabase.rpc('estimate_pricing_summary', { p_estimate_id: estimateId });
  if (error) { if (isMissingTableError(error)) return null; failIf(error, 'Failed to load pricing'); }
  return (data && data[0]) || null;
}

// Full cost/margin snapshot -- resolves only for Super Admin sessions (RLS).
export async function getLatestPricingSnapshotFull(estimateId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('estimate_pricing_snapshots')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('confirmed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { if (isMissingTableError(error)) return null; failIf(error, 'Failed to load pricing detail'); }
  return data;
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------
export interface EstimateProposal {
  id: string;
  estimate_id: string;
  good_headline: string | null; good_body: string | null;
  better_headline: string | null; better_body: string | null;
  best_headline: string | null; best_body: string | null;
  customer_message: string | null;
  selected_tier: 'good' | 'better' | 'best' | null;
  created_at: string;
}

export async function getLatestProposal(estimateId: string): Promise<EstimateProposal | null> {
  const { data, error } = await supabase.from('estimate_proposals').select('*').eq('estimate_id', estimateId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) { if (isMissingTableError(error)) return null; failIf(error, 'Failed to load proposal'); }
  return data;
}
export async function saveProposal(estimateId: string, updates: Partial<EstimateProposal>, createdBy?: string): Promise<EstimateProposal> {
  const { data, error } = await supabase.from('estimate_proposals').insert({ estimate_id: estimateId, ...updates, created_by: createdBy || null }).select().single();
  failIf(error, 'Failed to save proposal');
  return data;
}
export async function updateProposalMessage(id: string, updates: Partial<EstimateProposal>): Promise<void> {
  const { error } = await supabase.from('estimate_proposals').update(updates).eq('id', id);
  failIf(error, 'Failed to update proposal');
}

// ---------------------------------------------------------------------------
// Approval -- informal record only, per the locked product decision.
// ---------------------------------------------------------------------------
export interface EstimateApproval {
  id: string;
  estimate_id: string;
  selected_tier: 'good' | 'better' | 'best';
  deposit_pct: number;
  signature_media_id: string | null;
  customer_name: string | null;
  approved_at: string;
}

export async function getApproval(estimateId: string): Promise<EstimateApproval | null> {
  const { data, error } = await supabase.from('estimate_approvals').select('*').eq('estimate_id', estimateId).maybeSingle();
  if (error) { if (isMissingTableError(error)) return null; failIf(error, 'Failed to load approval'); }
  return data;
}
export async function recordApproval(input: { estimate_id: string; selected_tier: 'good' | 'better' | 'best'; deposit_pct: number; signature_media_id: string | null; customer_name?: string; recorded_by?: string }): Promise<EstimateApproval> {
  const { data, error } = await supabase.from('estimate_approvals').insert(input).select().single();
  failIf(error, 'Failed to record approval');
  return data;
}

export async function convertEstimateToProject(estimateId: string): Promise<string> {
  const { data, error } = await supabase.rpc('convert_estimate_to_project', { p_estimate_id: estimateId });
  failIf(error, 'Failed to convert estimate to a project');
  return data as string;
}
