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

export interface ProjectPhaseInput {
  project_id: string;
  name: string;
  description?: string;
  position: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  phase_template_id?: string;
  phase_lead_id?: string;
  qc_required?: boolean;
}

export interface ProjectPhaseUpdate {
  name?: string;
  description?: string;
  position?: number;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  progress?: number;
  qc_status?: string;
  phase_lead_id?: string | null;
  qc_required?: boolean;
  last_recalculated_at?: string;
}

export async function listProjectPhases(projectId: string) {
  const { data, error } = await supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true });
  // Table may not exist yet if migration hasn't run — return empty instead of crashing
  if (error) {
    if (isMissingTableError(error)) {
      console.warn('[projectPhases] Table not found — migration pending:', error.message);
      return [];
    }
    failIf(error, 'Failed to list project phases');
  }
  return data ?? [];
}

// Bulk variant for screens that need phase ordering across several projects
// at once (e.g. a Supervisor's mobile task queue) without one hook/query per
// project. Not realtime-subscribed -- phases change rarely enough that a
// one-shot fetch on mount is fine here.
export async function listPhasesForProjects(projectIds: string[]) {
  if (projectIds.length === 0) return [];
  const { data, error } = await supabase
    .from('project_phases')
    .select('*')
    .in('project_id', projectIds)
    .order('position', { ascending: true });
  if (error) {
    if (isMissingTableError(error)) return [];
    failIf(error, 'Failed to list project phases');
  }
  return data ?? [];
}

export async function createProjectPhase(input: ProjectPhaseInput) {
  const { data, error } = await supabase
    .from('project_phases')
    .insert({ ...input, created_at: now(), updated_at: now() })
    .select()
    .single();
  failIf(error, 'Failed to create project phase');
  return data;
}

export async function updateProjectPhase(id: string, updates: ProjectPhaseUpdate) {
  const { data, error } = await supabase
    .from('project_phases')
    .update({ ...updates, updated_at: now() })
    .eq('id', id)
    .select()
    .single();
  failIf(error, 'Failed to update project phase');
  if (updates.qc_required !== undefined) {
    const { data: recalculated, error: recalcError } = await supabase.rpc('recalculate_phase_state', { p_phase_id: id });
    failIf(recalcError, 'Failed to refresh phase state');
    return recalculated;
  }
  return data;
}

export async function deleteProjectPhase(id: string) {
  // Null out phase_id on tasks that reference this phase first
  await supabase.from('tasks').update({ phase_id: null }).eq('phase_id', id);
  const { error } = await supabase.from('project_phases').delete().eq('id', id);
  failIf(error, 'Failed to delete project phase');
}

export async function reorderProjectPhases(projectId: string, orderedIds: string[]) {
  const updates = orderedIds.map((id, idx) =>
    supabase.from('project_phases').update({ position: idx, updated_at: now() }).eq('id', id)
  );
  await Promise.all(updates);
}

/** Recalculate phase progress from its tasks and persist */
export async function recalculatePhaseProgress(phaseId: string) {
  const { data, error } = await supabase.rpc('recalculate_phase_state', { p_phase_id: phaseId });
  failIf(error, 'Failed to recalculate phase');
  return data?.progress ?? 0;
}

/** Clone a phase template into a real project phase */
export async function clonePhaseTemplate(projectId: string, phaseTemplateId: string, position: number, startDate?: string) {
  const { data: tmpl, error: tmplErr } = await supabase
    .from('phase_templates')
    .select('*')
    .eq('id', phaseTemplateId)
    .single();
  failIf(tmplErr, 'Failed to load phase template');

  const endDate = startDate && tmpl.default_duration_days
    ? new Date(new Date(startDate).getTime() + tmpl.default_duration_days * 86400000)
        .toISOString().split('T')[0]
    : undefined;

  const { data: phase, error: phaseErr } = await supabase
    .from('project_phases')
    .insert({
      project_id: projectId,
      phase_template_id: phaseTemplateId,
      name: tmpl.name,
      description: tmpl.description,
      position,
      status: 'Not Started',
      qc_status: 'Not Started',
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  failIf(phaseErr, 'Failed to create phase from template');
  return phase;
}
