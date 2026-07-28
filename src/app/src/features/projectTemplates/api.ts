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
  }
) {
  const template = await getProjectTemplate(templateId);
  if (!template) throw new Error('Template not found');

  const { enabledPhaseTemplateIds, startDate } = options;

  // Only include enabled phases, sorted by position
  const enabledPhases = (template.phase_templates ?? [])
    .filter((ph: any) => enabledPhaseTemplateIds.includes(ph.id))
    .sort((a: any, b: any) => a.position - b.position);

  let cursor = startDate ? new Date(startDate) : new Date();
  const createdPhases: any[] = [];

  for (let i = 0; i < enabledPhases.length; i++) {
    const ph = enabledPhases[i];
    const phStart = cursor.toISOString().split('T')[0];
    const phEnd = new Date(cursor.getTime() + (ph.default_duration_days ?? 7) * 86400000)
      .toISOString().split('T')[0];

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

    // Clone task templates for this phase
    const taskTemplates = (ph.task_templates ?? []).sort((a: any, b: any) => a.position - b.position);
    for (const tt of taskTemplates) {
      const taskDue = new Date(cursor.getTime() + (tt.default_duration_days ?? 1) * 86400000)
        .toISOString().split('T')[0];
      await supabase.from('tasks').insert({
        project_id: projectId,
        phase_id: phase.id,
        phase: ph.name,          // keep text field in sync for legacy compatibility
        title: tt.name,
        description: tt.description ?? '',
        task_type: tt.task_type ?? 'Administrative',
        status: 'To Do',
        priority: tt.priority ?? 'Medium',
        progress: 0,
        is_required: tt.required ?? true,
        start_date: phStart,
        due_date: taskDue,
        tags: [],
        created_at: now(),
        updated_at: now(),
      });
    }

    // Advance cursor by phase duration
    cursor = new Date(cursor.getTime() + (ph.default_duration_days ?? 7) * 86400000);
  }

  // Log activity
  await supabase.from('project_activity_log').insert({
    project_id: projectId,
    action: 'template_applied',
    object_type: 'project_template',
    new_value: { template_id: templateId, template_name: template.name, phase_count: createdPhases.length },
    created_at: now(),
  });

  return createdPhases;
}
