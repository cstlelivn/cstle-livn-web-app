import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';
import { withJWTRefresh } from '../../lib/jwt-refresh';
import { recordPostgrestRequest } from '../../lib/syncMetrics';

const supabase = createClient();
const clientNameCache = new Map<string, string>();
const PROJECT_LIST_COLUMNS = [
  'id', 'title', 'client', 'location', 'budget', 'spent', 'progress', 'status',
  'phase', 'phases', 'start_date', 'end_date', 'description', 'team', 'color',
  'created_by', 'supervisor_id', 'force_completed', 'force_completed_reason',
  'force_completed_by', 'force_completed_at', 'created_at', 'updated_at',
].join(',');

export interface ProjectInput {
  title: string;
  client: string;
  location?: string;
  budget?: number;
  spent?: number;
  progress?: number;
  status?: string;
  phase?: string;
  phases?: any;
  start_date?: string;
  end_date?: string;
  description?: string;
  team?: any;
  color?: string;
  created_by?: string;
}

export interface ProjectUpdate {
  title?: string;
  client?: string;
  location?: string;
  budget?: number;
  spent?: number;
  progress?: number;
  status?: string;
  phase?: string;
  phases?: any;
  start_date?: string;
  end_date?: string;
  description?: string;
  team?: any;
  color?: string;
}

// Transform database row to Project format (snake_case to camelCase)
function transformProject(dbProject: any) {
  return {
    ...dbProject,
    startDate: dbProject.start_date,
    endDate: dbProject.end_date,
    supervisorId: dbProject.supervisor_id,
  };
}

export async function listProjects(refreshClientNames = clientNameCache.size === 0) {
  recordPostgrestRequest('full-list');
  try {
    // Fetch projects with JWT refresh support
    const { data: projectsData, error: projectsError } = await withJWTRefresh(
      () => supabase
        .from('projects')
        .select(PROJECT_LIST_COLUMNS)
        .order('updated_at', { ascending: false })
        .limit(300),
      'fetch projects'
    );
    
    // Handle network errors gracefully
    if (projectsError) {
      // Check if it's a network error
      if (projectsError.message?.includes('Failed to fetch') || 
          projectsError.message?.includes('fetch') ||
          projectsError.message?.includes('network')) {
        console.warn('⚠️ Network error fetching projects - returning empty array');
        return [];
      }
      // Other errors should still be thrown
      failIf(projectsError, 'Failed to list projects');
    }
    const projectRows = (projectsData ?? []) as any[];
    
    if (!refreshClientNames) {
      return projectRows.map((project: any) => {
        const transformed = transformProject(project);
        return {
          ...transformed,
          client: clientNameCache.get(String(project.client)) || project.client,
          clientId: project.client,
        };
      });
    }

    // Populate the small client-name lookup once. Routine safety syncs reuse it.
    const { data: clientsData, error: clientsError } = await withJWTRefresh(
      () => supabase
        .from('clients')
        .select('id, name'),
      'fetch clients for project mapping'
    );
    
    // Handle network errors for clients too
    if (clientsError) {
      if (clientsError.message?.includes('Failed to fetch') || 
          clientsError.message?.includes('fetch') ||
          clientsError.message?.includes('network')) {
        console.warn('⚠️ Network error fetching clients - proceeding without client mapping');
        // Continue without client mapping
        return projectRows.map((project: any) => transformProject(project));
      }
      return projectRows.map((project: any) => transformProject(project));
    }
    
    // Create a map of client IDs to names
    const clientMap = new Map<string, string>(((clientsData || []) as any[]).map(
      (c: any) => [String(c.id), String(c.name)]
    ));
    clientNameCache.clear();
    for (const [id, name] of clientMap) clientNameCache.set(id, name as string);
    
    // Transform projects and replace client ID with client name
    return projectRows.map((project: any) => {
      const transformed = transformProject(project);
      return {
        ...transformed,
        client: clientMap.get(String(project.client)) || project.client, // Map ID to name
        clientId: project.client, // Keep the ID for reference
      };
    });
  } catch (error: any) {
    console.error('Database error:', error);
    
    // Handle network errors by returning empty array instead of crashing
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.name === 'TypeError') {
      console.warn('⚠️ Network error in listProjects - returning empty array');
      return [];
    }
    
    throw error;
  }
}

export async function getProject(id: string) {
  recordPostgrestRequest('targeted-record');
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_LIST_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  
  failIf(error, 'Failed to get project');
  
  if (!data) return null;
  
  const transformed = transformProject(data);
  return {
    ...transformed,
    client: clientNameCache.get(String(data.client)) || data.client,
    clientId: data.client, // Keep the ID for reference
  };
}

export async function createProject(input: ProjectInput) {
  // Transform to snake_case for database
  const dbInput: any = {
    title: input.title,
    client: input.client,
    location: input.location || '',
    budget: input.budget !== undefined ? input.budget : 0,
    spent: input.spent !== undefined ? input.spent : 0,
    progress: input.progress !== undefined ? input.progress : 0,
    status: input.status || 'Planning',
    phase: input.phase || 'Planning',
    phases: input.phases || [],
    start_date: input.start_date,
    end_date: input.end_date,
    description: input.description || '',
    team: input.team || [],
    color: input.color || '#848580',
    created_at: now(),
    updated_at: now(),
  };

  // Add created_by if provided
  if (input.created_by) {
    dbInput.created_by = input.created_by;
  }

  // Default the project's supervisor (default task assignee + QC reviewer
  // for this project) to whoever's creating it, unless the caller specified
  // someone else -- a project needs a supervisor from the moment it exists,
  // not just once someone remembers to set one.
  const supervisorId = (input as any).supervisorId ?? (input as any).supervisor_id;
  if (supervisorId) {
    dbInput.supervisor_id = supervisorId;
  } else if (input.created_by) {
    dbInput.supervisor_id = input.created_by;
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(dbInput)
    .select(PROJECT_LIST_COLUMNS)
    .single();
  
  failIf(error, 'Failed to create project');
  return data ? transformProject(data) : null;
}

export async function updateProject(id: string, updates: ProjectUpdate) {
  console.log('🔵 API updateProject - Input:', { id, updates });
  
  // Transform camelCase to snake_case for database
  const dbUpdates: any = {};
  
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  // Use clientId if available, otherwise use client (in case it's already a UUID)
  if (updates.client !== undefined) {
    // Check if updates has clientId (UUID) - prefer that over client (name)
    const clientValue = (updates as any).clientId || updates.client;
    dbUpdates.client = clientValue;
  }
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.budget !== undefined) dbUpdates.budget = updates.budget;
  if ((updates as any).budget_total !== undefined) dbUpdates.budget_total = (updates as any).budget_total;
  if (updates.spent !== undefined) dbUpdates.spent = updates.spent;
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.phase !== undefined) dbUpdates.phase = updates.phase;
  if (updates.phases !== undefined) dbUpdates.phases = updates.phases;
  if (updates.start_date !== undefined) dbUpdates.start_date = updates.start_date;
  if ((updates as any).startDate !== undefined) dbUpdates.start_date = (updates as any).startDate;
  if (updates.end_date !== undefined) dbUpdates.end_date = updates.end_date;
  if ((updates as any).endDate !== undefined) dbUpdates.end_date = (updates as any).endDate;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.team !== undefined) dbUpdates.team = updates.team;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if ((updates as any).supervisorId !== undefined) dbUpdates.supervisor_id = (updates as any).supervisorId;
  if ((updates as any).supervisor_id !== undefined) dbUpdates.supervisor_id = (updates as any).supervisor_id;

  dbUpdates.updated_at = now();

  console.log('📤 API updateProject - Sending to DB:', dbUpdates);

  const { error } = await supabase
    .from('projects')
    .update(dbUpdates)
    .eq('id', id);
  
  if (error) {
    console.error('❌ API updateProject - Database error:', error);
  } else {
    console.log('✅ API updateProject - Success');
  }
  
  failIf(error, 'Failed to update project');
  return { id, ...updates };
}

export async function deleteProject(id: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  failIf(error, 'Failed to delete project');
}

/**
 * Force-deletes a project with real recorded history (task assignments,
 * timer sessions, Aura scores, QC records) -- Super Admin only. Unlike
 * team member deletion there is no "reassign to someone else" step: this
 * permanently deletes the project and everything under it. Optionally
 * also deletes the linked client and/or the estimate it was converted
 * from. See 20240062_project_force_delete.sql for the full server-side
 * logic and exactly which tables are touched.
 */
export async function deleteProjectAndRelated(
  id: string,
  options: { deleteClient?: boolean; deleteEstimate?: boolean } = {}
) {
  const { data, error } = await supabase.rpc('delete_project_and_related', {
    p_project_id: id,
    p_delete_client: options.deleteClient ?? false,
    p_delete_estimate: options.deleteEstimate ?? false,
  });
  failIf(error, 'Failed to delete project');
  return data as {
    deletedProjectTitle: string;
    deletedEstimate: boolean;
    deletedClient: boolean;
    deletedClientName: string | null;
    alsoDeletedOriginatingLead: boolean;
  };
}

/** Check whether every phase in a project is complete (the normal gate for
 *  marking a project complete). Mirrors the database trigger in
 *  supabase/migrations/20240004_role_source_and_rls.sql, which is what
 *  actually enforces this — this is a client-side pre-check for UX only. */
export async function checkProjectCompletionReadiness(projectId: string): Promise<{
  ready: boolean;
  incompleteCount: number;
  incompleteTaskCount: number;
  totalPhases: number;
}> {
  const { data: phases, error } = await supabase
    .from('project_phases')
    .select('id, status')
    .eq('project_id', projectId);
  failIf(error, 'Failed to check project completion readiness');

  const all = phases ?? [];
  const incomplete = all.filter((p: any) => p.status !== 'Completed');
  const { count: incompleteTaskCount, error: taskError } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .neq('status', 'Completed');
  failIf(taskError, 'Failed to check open project tasks');
  return {
    ready: all.length > 0 && incomplete.length === 0 && (incompleteTaskCount ?? 0) === 0,
    incompleteCount: incomplete.length,
    incompleteTaskCount: incompleteTaskCount ?? 0,
    totalPhases: all.length,
  };
}

/** Mark a project complete the normal way — blocked unless every phase is
 *  already complete (enforced both here and, more importantly, by the
 *  database trigger). */
export async function markProjectComplete(projectId: string, userId: string) {
  const readiness = await checkProjectCompletionReadiness(projectId);
  if (!readiness.ready) {
    throw new Error(`${readiness.incompleteCount} phase(s) and ${readiness.incompleteTaskCount} task(s) are not completed yet`);
  }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'Completed', updated_at: now() })
    .eq('id', projectId);
  failIf(error, 'Failed to mark project complete');

  await supabase.from('project_activity_log').insert({
    project_id: projectId,
    user_id: userId,
    action: 'project_completed',
    created_at: now(),
  });

  return { id: projectId, status: 'Completed' };
}

/** Super Admin-only override: force a project to Completed even if phases
 *  aren't done. Requires a reason, which is permanently logged. The database
 *  trigger independently re-checks both the Super Admin requirement and the
 *  reason, so this can't be bypassed by calling the table API directly. */
export async function forceCompleteProject(projectId: string, userId: string, reason: string) {
  if (!reason?.trim()) {
    throw new Error('A reason is required to force-complete a project');
  }

  const { data: prev } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();

  const { error } = await supabase
    .from('projects')
    .update({
      status: 'Completed',
      force_completed: true,
      force_completed_reason: reason,
      force_completed_by: userId,
      force_completed_at: now(),
      updated_at: now(),
    })
    .eq('id', projectId);
  failIf(error, 'Failed to force-complete project');

  await supabase.from('project_activity_log').insert({
    project_id: projectId,
    user_id: userId,
    action: 'project_force_completed',
    prev_value: { status: prev?.status },
    new_value: { status: 'Completed' },
    reason,
    created_at: now(),
  });

  return { id: projectId, status: 'Completed', force_completed: true };
}
