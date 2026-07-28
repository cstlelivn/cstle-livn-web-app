import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

export interface QCRequestInput {
  task_id: string;
  reviewer_id?: string;
  notes?: string;
  status?: string;
}

export interface QCRequestUpdate {
  reviewer_id?: string;
  notes?: string;
  status?: string;
}

export async function listQCRequests() {
  const { data, error } = await supabase
    .from('qc_requests')
    .select('*, tasks(*)')
    .order('updated_at', { ascending: false })
    .limit(100);
  
  failIf(error, 'Failed to list QC requests');
  return data ?? [];
}

export async function getQCRequestsForTask(taskId: string) {
  const { data, error } = await supabase
    .from('qc_requests')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  
  failIf(error, 'Failed to get QC requests for task');
  return data ?? [];
}

export async function createQCRequest(input: QCRequestInput) {
  const { data, error } = await supabase
    .from('qc_requests')
    .insert({
      ...input,
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  
  failIf(error, 'Failed to create QC request');
  return data;
}

export async function updateQCRequest(id: string, updates: QCRequestUpdate) {
  const { data, error } = await supabase
    .from('qc_requests')
    .update({
      ...updates,
      updated_at: now(),
    })
    .eq('id', id)
    .select()
    .single();
  
  failIf(error, 'Failed to update QC request');
  return data;
}

// Phase QC Reviews
export interface PhaseQCReviewInput {
  project_id: string;
  phase_name: string;
  status?: string;
  submitted_by?: string;
  notes?: string;
  tasks_completed?: number;
  tasks_total?: number;
}

export interface PhaseQCReviewUpdate {
  status?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  feedback?: string;
  notes?: string;
}

export async function listPhaseQCReviews(projectId?: string) {
  let query = supabase
    .from('phase_qc_reviews')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  
  const { data, error } = await query;
  failIf(error, 'Failed to list phase QC reviews');
  return data ?? [];
}

export async function createPhaseQCReview(input: PhaseQCReviewInput) {
  const { data, error } = await supabase
    .from('phase_qc_reviews')
    .insert({
      ...input,
      submitted_at: now(),
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  
  failIf(error, 'Failed to create phase QC review');
  return data;
}

export async function updatePhaseQCReview(id: string, updates: PhaseQCReviewUpdate) {
  const { data, error } = await supabase
    .from('phase_qc_reviews')
    .update({
      ...updates,
      updated_at: now(),
    })
    .eq('id', id)
    .select()
    .single();
  
  failIf(error, 'Failed to update phase QC review');
  return data;
}