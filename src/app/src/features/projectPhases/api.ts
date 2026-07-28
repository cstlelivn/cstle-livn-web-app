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
  const { data: tasks } = await supabase
    .from('tasks')
    .select('progress, status')
    .eq('phase_id', phaseId);

  if (!tasks || tasks.length === 0) {
    await supabase.from('project_phases').update({ progress: 0, updated_at: now() }).eq('id', phaseId);
    return 0;
  }
  const total = tasks.reduce((s: number, t: any) => s + (t.progress ?? 0), 0);
  const progress = Math.round(total / tasks.length);
  await supabase.from('project_phases').update({ progress, updated_at: now() }).eq('id', phaseId);
  return progress;
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
