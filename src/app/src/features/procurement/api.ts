import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

export type ProcurementStatus =
  | 'Not Reviewed'
  | 'Selection Required'
  | 'Ready to Order'
  | 'Ordered'
  | 'Partially Received'
  | 'Received'
  | 'Backordered'
  | 'Cancelled';

export interface ProcurementItemInput {
  project_id: string;
  phase_id?: string;
  task_id?: string;
  item_name: string;
  description?: string;
  quantity?: number;
  unit?: string;
  required_on_site_date?: string;
  lead_time_days?: number;
  buffer_days?: number;
  procurement_strategy?: string;
  supplier?: string;
  delivery_location?: string;
  notes?: string;
}

function calcRecommendedOrderDate(requiredOnSite?: string, leadDays = 7, bufferDays = 2): string | null {
  if (!requiredOnSite) return null;
  const d = new Date(requiredOnSite);
  d.setDate(d.getDate() - leadDays - bufferDays);
  return d.toISOString().split('T')[0];
}

function isMissingTableError(error: any) {
  return error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist') ||
    error?.code === 'PGRST204' ||
    error?.code === '42P01';
}

export async function listProjectProcurement(projectId: string, phaseId?: string) {
  let q = supabase
    .from('procurement_items')
    .select('*')
    .eq('project_id', projectId)
    .order('required_on_site_date', { ascending: true });
  if (phaseId) q = q.eq('phase_id', phaseId);
  const { data, error } = await q;
  if (error) {
    if (isMissingTableError(error)) {
      console.warn('[procurement] Table not found — migration pending');
      return [];
    }
    failIf(error, 'Failed to list procurement items');
  }
  return data ?? [];
}

export async function createProcurementItem(input: ProcurementItemInput) {
  const recommended = calcRecommendedOrderDate(
    input.required_on_site_date,
    input.lead_time_days ?? 7,
    input.buffer_days ?? 2
  );
  const { data, error } = await supabase
    .from('procurement_items')
    .insert({
      ...input,
      status: 'Not Reviewed',
      recommended_order_date: recommended,
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  failIf(error, 'Failed to create procurement item');
  return data;
}

export async function updateProcurementItem(id: string, updates: Partial<ProcurementItemInput> & { status?: ProcurementStatus; delivery_confirmed?: boolean }) {
  const payload: any = { ...updates, updated_at: now() };
  // Recalculate recommended order date if relevant fields changed
  if (updates.required_on_site_date !== undefined || updates.lead_time_days !== undefined || updates.buffer_days !== undefined) {
    const item = await supabase.from('procurement_items').select('required_on_site_date, lead_time_days, buffer_days').eq('id', id).single();
    const ros = updates.required_on_site_date ?? item.data?.required_on_site_date;
    const lead = updates.lead_time_days ?? item.data?.lead_time_days ?? 7;
    const buf = updates.buffer_days ?? item.data?.buffer_days ?? 2;
    payload.recommended_order_date = calcRecommendedOrderDate(ros, lead, buf);
  }
  const { data, error } = await supabase
    .from('procurement_items')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  failIf(error, 'Failed to update procurement item');
  return data;
}

export async function deleteProcurementItem(id: string) {
  const { error } = await supabase.from('procurement_items').delete().eq('id', id);
  failIf(error, 'Failed to delete procurement item');
}
