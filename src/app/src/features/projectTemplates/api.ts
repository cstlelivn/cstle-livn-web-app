import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';
import { addWorkDays } from '../../lib/workDays';

const supabase = createClient();

function isMissingTableError(error: any) {
  return error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist') ||
    error?.code === 'PGRST204' ||
    error?.code === '42P01';
}

export async function listProjectTemplates() {
  const { data, error } = await supabase
    .from('project_templates')
    .select(`
      *,
      phase_templates (
        *,
        task_templates (*)
      )
    `)
    .eq('active', true)
    .order('name');
  if (error) {
    if (isMissingTableError(error)) {
      console.warn('[projectTemplates] Table not found — migration pending');
      return [];
    }
    failIf(error, 'Failed to list project templates');
  }
  return (data ?? []).map((t: any) => ({
    ...t,
    phase_templates: (t.phase_templates ?? []).sort((a: any, b: any) => a.position - b.position),
  }));
}

/** Same as listProjectTemplates but includes inactive (archived) templates —
 *  used by the template-builder admin screen. */
export async function listAllProjectTemplates() {
  const { data, error } = await supabase
    .from('project_templates')
    .select(`
      *,
      phase_templates (
        *,
        task_templates (*)
      )
    `)
    .order('name');
  if (error) {
    if (isMissingTableError(error)) return [];
    failIf(error, 'Failed to list project templates');
  }
  return (data ?? []).map((t: any) => ({
    ...t,
    phase_templates: (t.phase_templates ?? [])
      .map((ph: any) => ({ ...ph, task_templates: (ph.task_templates ?? []).sort((a: any, b: any) => a.position - b.position) }))
      .sort((a: any, b: any) => a.position - b.position),
  }));
}

export interface ProjectTemplateInput {
  name: string;
  description?: string;
  project_type?: string;
  default_duration_days?: number;
}

export async function createProjectTemplate(input: ProjectTemplateInput) {
  const { data, error } = await supabase
    .from('project_templates')
    .insert({ ...input, version: '1.0', active: true, created_at: now(), updated_at: now() })
    .select()
    .single();
  failIf(error, 'Failed to create project template');
  return data;
}

export async function updateProjectTemplate(id: string, updates: Partial<ProjectTemplateInput & { active: boolean }>) {
  const { data, error } = await supabase
    .from('project_templates')
    .update({ ...updates, updated_at: now() })
    .eq('id', id)
    .select()
    .single();
  failIf(error, 'Failed to update project template');
  return data;
}

/** Soft-delete only — hard-deleting would cascade and break historical
 *  projects that reference this template's phase/task templates. */
export async function archiveProjectTemplate(id: string) {
  return updateProjectTemplate(id, { active: false });
}

export interface PhaseTemplateInput {
  project_template_id: string;
  name: string;
  description?: string;
  position: number;
  default_duration_days?: number;
  required?: boolean;
}

export async function createPhaseTemplate(input: PhaseTemplateInput) {
  const { data, error } = await supabase
    .from('phase_templates')
    .insert({ ...input, created_at: now(), updated_at: now() })
    .select()
    .single();
  failIf(error, 'Failed to create phase template');
  return data;
}

export async function updatePhaseTemplate(id: string, updates: Partial<PhaseTemplateInput>) {
  const { data, error } = await supabase
    .from('phase_templates')
    .update({ ...updates, updated_at: now() })
    .eq('id', id)
    .select()
    .single();
  failIf(error, 'Failed to update phase template');
  return data;
}

export async function deletePhaseTemplate(id: string) {
  const { error } = await supabase.from('phase_templates').delete().eq('id', id);
  failIf(error, 'Failed to delete phase template');
}

export async function reorderPhaseTemplates(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('phase_templates').update({ position: idx, updated_at: now() }).eq('id', id)
    )
  );
}

export interface TaskTemplateInput {
  phase_template_id: string;
  project_template_id: string;
  name: string;
  description?: string;
  task_type?: string;
  position: number;
  priority?: string;
  required?: boolean;
  default_duration_days?: number;
}

export async function createTaskTemplate(input: TaskTemplateInput) {
  const { data, error } = await supabase
    .from('task_templates')
    .insert({ ...input, created_at: now(), updated_at: now() })
    .select()
    .single();
  failIf(error, 'Failed to create task template');
  return data;
}

export async function updateTaskTemplate(id: string, updates: Partial<TaskTemplateInput>) {
  const { data, error } = await supabase
    .from('task_templates')
    .update({ ...updates, updated_at: now() })
    .eq('id', id)
    .select()
    .single();
  failIf(error, 'Failed to update task template');
  return data;
}

export async function deleteTaskTemplate(id: string) {
  const { error } = await supabase.from('task_templates').delete().eq('id', id);
  failIf(error, 'Failed to delete task template');
}

export async function reorderTaskTemplates(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('task_templates').update({ position: idx, updated_at: now() }).eq('id', id)
    )
  );
}

export async function getProjectTemplate(id: string) {
  const { data, error } = await supabase
    .from('project_templates')
    .select(`
      *,
      phase_templates (
        *,
        task_templates (*),
        procurement_templates (*)
      )
    `)
    .eq('id', id)
    .single();
  failIf(error, 'Failed to get project template');
  if (!data) return null;
  return {
    ...data,
    phase_templates: (data.phase_templates ?? []).sort((a: any, b: any) => a.position - b.position),
  };
}

/** Clone a full template into a project, creating project_phases and tasks */
export async function applyTemplateToProject(
  projectId: string,
  templateId: string,
  options: {
    enabledPhaseTemplateIds: string[];   // which phases to include
    startDate?: string;                  // project start date for schedule generation
    teamMemberIds?: string[];            // initial team for auto-assignment hints
    defaultAssigneeId?: string;          // every task must have an assignee -- fallback when no one is picked yet
  }
) {
  const template = await getProjectTemplate(templateId);
  if (!template) throw new Error('Template not found');

  const { enabledPhaseTemplateIds, startDate, defaultAssigneeId } = options;

  // Only include enabled phases, sorted by position
  const enabledPhases = (template.phase_templates ?? [])
    .filter((ph: any) => enabledPhaseTemplateIds.includes(ph.id))
    .sort((a: any, b: any) => a.position - b.position);

  let cursor = startDate ? new Date(startDate) : new Date();
  let lastActualEndDate = new Date(cursor);
  const createdPhases: any[] = [];

  for (let i = 0; i < enabledPhases.length; i++) {
    const ph = enabledPhases[i];
    const phStart = cursor.toISOString().split('T')[0];
    // `end_date`/`due_date` are INCLUSIVE -- the end date IS the last day
    // of work, per explicit product direction, not the day after it. A
    // `default_duration_days` of N therefore spans N-1 additional workdays
    // past the start (a 1-day phase/task starts and ends the same day).
    const phEndDate = addWorkDays(cursor, (ph.default_duration_days ?? 7) - 1);
    const phEnd = phEndDate.toISOString().split('T')[0];

    const { data: phase, error: phErr } = await supabase
      .from('project_phases')
      .insert({
        project_id: projectId,
        phase_template_id: ph.id,
        name: ph.name,
        description: ph.description,
        position: i,
        status: 'Not Started',
        qc_status: 'Not Started',
        start_date: phStart,
        end_date: phEnd,
        created_at: now(),
        updated_at: now(),
      })
      .select()
      .single();
    failIf(phErr, `Failed to create phase: ${ph.name}`);
    createdPhases.push(phase);

    // Clone task templates for this phase. Each task's start is where the
    // previous one in the same phase left off (not all pinned to the phase's
    // own start date) -- otherwise every task in a phase landed on the exact
    // same due date regardless of how many days apart they actually are.
    const taskTemplates = (ph.task_templates ?? []).sort((a: any, b: any) => a.position - b.position);
    let taskCursor = new Date(cursor);
    let lastTaskDueDate: Date | null = null;
    for (const tt of taskTemplates) {
      const taskStart = taskCursor.toISOString().split('T')[0];
      const taskDueDate = addWorkDays(taskCursor, (tt.default_duration_days ?? 1) - 1);
      const taskDue = taskDueDate.toISOString().split('T')[0];
      taskCursor = addWorkDays(taskDueDate, 1); // next task starts the following workday
      lastTaskDueDate = taskDueDate;
      await supabase.from('tasks').insert({
        project_id: projectId,
        phase_id: phase.id,
        phase: ph.name,          // keep text field in sync for legacy compatibility
        task_template_id: tt.id, // lets schedule changes be saved back to the template later
        title: tt.name,
        description: tt.description ?? '',
        task_type: tt.task_type ?? 'Administrative',
        status: 'To Do',
        priority: tt.priority ?? 'Medium',
        progress: 0,
        is_required: tt.required ?? true,
        assignee_id: defaultAssigneeId ?? null,
        start_date: taskStart,
        due_date: taskDue,
        tags: [],
        created_at: now(),
        updated_at: now(),
      });
    }

    // Advance to the next phase's start: whichever is later of the phase's own
    // declared duration (leaves buffer if the phase has one) or when its last
    // task actually finishes (so a phase whose tasks add up to more than its
    // nominal duration doesn't bleed the next phase's tasks into it).
    const phaseActualEndDate = lastTaskDueDate && lastTaskDueDate > phEndDate ? lastTaskDueDate : phEndDate;
    lastActualEndDate = phaseActualEndDate;
    cursor = addWorkDays(phaseActualEndDate, 1);
  }

  // Log activity
  await supabase.from('project_activity_log').insert({
    project_id: projectId,
    action: 'template_applied',
    object_type: 'project_template',
    new_value: { template_id: templateId, template_name: template.name, phase_count: createdPhases.length },
    created_at: now(),
  });

  // `lastActualEndDate` is the last phase's actual inclusive end date --
  // i.e. the real last day worked, matching the `end_date`/`due_date`
  // convention everywhere else now. Callers must NOT separately re-estimate
  // an end date from `phase.default_duration_days` (that sum is calendar-day
  // arithmetic with no Sunday skip and ignores any task whose combined
  // duration ran longer than its phase's nominal length, which is exactly
  // how a project's shown end date used to disagree with its actual last
  // task's due date by months).
  return { phases: createdPhases, scheduledEndDate: lastActualEndDate.toISOString().split('T')[0] };
}
