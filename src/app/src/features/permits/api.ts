import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

export const PERMIT_STATUSES = [
  'Inquiry', 'Application Submitted', 'Under Review', 'Additional Info Requested',
  'Approved', 'Issued', 'Inspection Required', 'Closed', 'Rejected', 'Expired',
] as const;

export const PERMIT_TYPE_PRESETS = [
  'Building', 'Electrical', 'Plumbing', 'Mechanical', 'Demolition', 'Development', 'Occupancy',
] as const;

export const PERMIT_EVENT_TYPES = ['Call', 'Email', 'Submission', 'Inspection', 'Status Update', 'Note'] as const;

export interface ProjectPermit {
  id: string;
  project_id: string;
  permit_type: string;
  status: string;
  permit_number: string | null;
  applied_date: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermitEvent {
  id: string;
  permit_id: string;
  event_type: string;
  event_date: string;
  reference_number: string | null;
  contact_name: string | null;
  summary: string;
  created_by: string | null;
  created_at: string;
}

function isMissingTableError(error: any) {
  return error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist') ||
    error?.code === 'PGRST204' ||
    error?.code === '42P01';
}

export async function listProjectPermits(projectId: string): Promise<ProjectPermit[]> {
  const { data, error } = await supabase
    .from('project_permits')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) {
      console.warn('[permits] Table not found — migration pending:', error.message);
      return [];
    }
    failIf(error, 'Failed to list permits');
  }
  return data ?? [];
}

export async function createProjectPermit(input: {
  project_id: string;
  permit_type: string;
  status?: string;
  permit_number?: string;
  applied_date?: string;
  issued_date?: string;
  expiry_date?: string;
  notes?: string;
  created_by?: string;
}): Promise<ProjectPermit> {
  const { data, error } = await supabase
    .from('project_permits')
    .insert({
      project_id: input.project_id,
      permit_type: input.permit_type,
      status: input.status || 'Inquiry',
      permit_number: input.permit_number || null,
      applied_date: input.applied_date || null,
      issued_date: input.issued_date || null,
      expiry_date: input.expiry_date || null,
      notes: input.notes || null,
      created_by: input.created_by || null,
    })
    .select()
    .single();
  failIf(error, 'Failed to create permit');
  return data;
}

export async function updateProjectPermit(id: string, updates: Partial<{
  permit_type: string;
  status: string;
  permit_number: string | null;
  applied_date: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  notes: string | null;
}>): Promise<ProjectPermit> {
  const { data, error } = await supabase
    .from('project_permits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  failIf(error, 'Failed to update permit');
  return data;
}

export async function deleteProjectPermit(id: string): Promise<void> {
  const { error } = await supabase.from('project_permits').delete().eq('id', id);
  failIf(error, 'Failed to delete permit');
}

export async function listPermitEvents(permitId: string): Promise<PermitEvent[]> {
  const { data, error } = await supabase
    .from('project_permit_events')
    .select('*')
    .eq('permit_id', permitId)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) return [];
    failIf(error, 'Failed to list permit events');
  }
  return data ?? [];
}

export async function createPermitEvent(input: {
  permit_id: string;
  event_type: string;
  event_date?: string;
  reference_number?: string;
  contact_name?: string;
  summary: string;
  created_by?: string;
}): Promise<PermitEvent> {
  const { data, error } = await supabase
    .from('project_permit_events')
    .insert({
      permit_id: input.permit_id,
      event_type: input.event_type,
      event_date: input.event_date || now().slice(0, 10),
      reference_number: input.reference_number || null,
      contact_name: input.contact_name || null,
      summary: input.summary,
      created_by: input.created_by || null,
    })
    .select()
    .single();
  failIf(error, 'Failed to log permit event');
  return data;
}
