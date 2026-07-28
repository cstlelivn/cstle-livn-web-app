import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

function isMissingTableError(error: any) {
  return error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist') ||
    error?.code === 'PGRST204' ||
    error?.code === '42P01';
}

export type QCStatus = 'Not Started' | 'Ready for Review' | 'Under Review' | 'Approved' | 'Rejected' | 'Approved with Conditions';

export interface QCSubmitInput {
  phase_id: string;
  project_id: string;
  submitted_by: string;
  checklist_answers?: Record<string, boolean | string>;
  notes?: string;
  evidence_urls?: string[];
}

export interface QCReviewInput {
  result: QCStatus;
  reviewed_by: string;
  notes?: string;
  rejection_reason?: string;
  conditions?: string;
}

export async function getPhaseQCRecord(phaseId: string) {
  const { data } = await supabase
    .from('phase_qc_records')
    .select('*')
    .eq('phase_id', phaseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}

export async function listPhaseQCHistory(phaseId: string) {
  const { data, error } = await supabase
    .from('phase_qc_records')
    .select('*')
    .eq('phase_id', phaseId)
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) return [];
    failIf(error, 'Failed to load QC history');
  }
  return data ?? [];
}

export async function submitPhaseQC(input: QCSubmitInput) {
  const { data, error } = await supabase
    .from('phase_qc_records')
    .insert({
      phase_id: input.phase_id,
      project_id: input.project_id,
      status: 'Ready for Review',
      submitted_by: input.submitted_by,
      submitted_at: now(),
      checklist_answers: input.checklist_answers ?? {},
      notes: input.notes,
      evidence_urls: input.evidence_urls ?? [],
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  failIf(error, 'Failed to submit phase QC');

  // Update phase qc_status
  await supabase
    .from('project_phases')
    .update({ qc_status: 'Ready for Review', updated_at: now() })
    .eq('id', input.phase_id);

  return data;
}

export async function reviewPhaseQC(qcRecordId: string, phaseId: string, review: QCReviewInput) {
  const { data, error } = await supabase
    .from('phase_qc_records')
    .update({
      status: review.result,
      reviewed_by: review.reviewed_by,
      reviewed_at: now(),
      result: review.result,
      notes: review.notes,
      rejection_reason: review.rejection_reason,
      conditions: review.conditions,
      updated_at: now(),
    })
    .eq('id', qcRecordId)
    .select()
    .single();
  failIf(error, 'Failed to record QC review');

  // Update phase qc_status and optionally phase status
  const phaseUpdates: any = { qc_status: review.result, updated_at: now() };
  if (review.result === 'Approved' || review.result === 'Approved with Conditions') {
    phaseUpdates.status = 'Completed';
  } else if (review.result === 'Rejected') {
    phaseUpdates.status = 'In Progress';
  }
  await supabase.from('project_phases').update(phaseUpdates).eq('id', phaseId);

  return data;
}

/** Check whether all required conditions are met to submit phase for QC */
export async function checkPhaseQCReadiness(phaseId: string): Promise<{
  ready: boolean;
  requiredTasksDone: boolean;
  procurementReady: boolean;
  blockers: string[];
}> {
  const blockers: string[] = [];

  // Check required tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, is_required')
    .eq('phase_id', phaseId);

  const requiredTasks = (tasks ?? []).filter((t: any) => t.is_required !== false);
  const incompletedRequired = requiredTasks.filter((t: any) => t.status !== 'Completed');
  const requiredTasksDone = incompletedRequired.length === 0;
  if (!requiredTasksDone) {
    blockers.push(`${incompletedRequired.length} required task(s) not completed`);
  }

  // Check procurement
  const { data: procurement } = await supabase
    .from('procurement_items')
    .select('id, item_name, status')
    .eq('phase_id', phaseId);

  const unreceived = (procurement ?? []).filter((p: any) =>
    !['Received', 'Cancelled', 'Not Reviewed'].includes(p.status)
    && p.status !== 'Received'
  );
  const procurementReady = unreceived.length === 0;
  if (!procurementReady) {
    blockers.push(`${unreceived.length} procurement item(s) not received`);
  }

  return {
    ready: blockers.length === 0,
    requiredTasksDone,
    procurementReady,
    blockers,
  };
}
