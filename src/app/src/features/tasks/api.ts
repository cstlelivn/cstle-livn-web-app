import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';
import { recordPostgrestRequest } from '../../lib/syncMetrics';

const supabase = createClient();
const TASK_LIST_COLUMNS = [
  'id', 'project_id', 'title', 'description', 'status', 'priority',
  'assignee_id', 'start_date', 'due_date', 'progress', 'tags', 'phase',
  'phase_id', 'task_type', 'is_required', 'dependency_task_id', 'blocked_by',
  'completed_date', 'started_at', 'submitted_at', 'review_feedback', 'rating',
  'rating_metrics', 'estimated_hours', 'complexity', 'required_photo_count', 'supervisor_id',
  'verification_criteria', 'photos_not_required', 'completion_note_required', 'crew_required', 'sequence', 'created_at', 'updated_at',
].join(',');

// Helper to check if a value is a valid UUID
function isValidUUID(value: any): boolean {
  if (!value) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(String(value));
}

// Transform database row to Task format (snake_case to camelCase)
function transformTask(dbTask: any) {
  return {
    ...dbTask,
    // Map project_id to projectId for frontend compatibility
    projectId: dbTask.project_id || dbTask.projectId,
    // Keep assignee_id as string (UUID) for proper team member lookup
    assignee: dbTask.assignee_id || dbTask.assignee || '',
    dueDate: dbTask.due_date || '',
    completedDate: dbTask.completed_date || '',
    startedAt: dbTask.started_at || '',
    submittedAt: dbTask.submitted_at || '',
    reviewFeedback: dbTask.review_feedback || '',
    ratingMetrics: dbTask.rating_metrics,
    createdAt: dbTask.created_at,
  };
}

export interface TaskInput {
  project_id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  due_date?: string;
  start_date?: string;
  progress?: number;
  tags?: string[];
  phase?: string;
  phase_id?: string;
  task_type?: string;
  is_required?: boolean;
  dependency_task_id?: string;
  blocked_by?: string;
  supervisor_id?: string;
  verification_criteria?: string;
  photos_not_required?: boolean;
  estimated_hours?: number | null;
  complexity?: string | null;
  crew_required?: number | null;
  sequence?: number | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  due_date?: string;
  start_date?: string;
  progress?: number;
  tags?: string[];
  phase?: string;
  phase_id?: string;
  task_type?: string;
  completed_date?: string;
  review_feedback?: string;
  rating?: number;
  rating_metrics?: any;
  blocked_by?: string;
  is_required?: boolean;
  supervisor_id?: string;
  verification_criteria?: string;
  photos_not_required?: boolean;
  estimated_hours?: number | null;
  complexity?: string | null;
  crew_required?: number | null;
  sequence?: number | null;
}

export async function listTasks(projectId?: string | number, page = 0, pageSize = 300) {
  recordPostgrestRequest('full-list');
  const from = page * pageSize;
  let query = supabase
    .from('tasks')
    .select(TASK_LIST_COLUMNS)
    .order('updated_at', { ascending: false })
    .range(from, from + pageSize - 1);
  
  if (projectId) {
    query = query.eq('project_id', String(projectId));
  }
  
  const { data, error } = await query;
  failIf(error, 'Failed to list tasks');
  return (data ?? []).map(transformTask);
}

export async function getTask(id: string | number) {
  recordPostgrestRequest('targeted-record');
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_LIST_COLUMNS)
    .eq('id', String(id))
    .maybeSingle();
  
  failIf(error, 'Failed to get task');
  return data ? transformTask(data) : null;
}

export async function createTask(input: TaskInput) {
  // Transform camelCase to snake_case for database
  const dbInput: any = {
    title: input.title,
    description: input.description || '',
    status: input.status || 'To Do',
    priority: input.priority || 'Medium',
    due_date: (input as any).dueDate || input.due_date,
    progress: input.progress !== undefined ? input.progress : 0,
    tags: input.tags || [],
    phase: input.phase,
    created_at: (input as any).createdAt || (input as any).created_at || now(),
    completed_date: (input as any).completedDate || (input as any).completed_date,
    review_feedback: (input as any).reviewFeedback || (input as any).review_feedback,
    rating: (input as any).rating,
    rating_metrics: (input as any).ratingMetrics || (input as any).rating_metrics,
    task_type: input.task_type || (input as any).task_type || 'Administrative',
    start_date: input.start_date || (input as any).startDate || undefined,
    phase_id: input.phase_id || (input as any).phase_id || undefined,
    supervisor_id: input.supervisor_id || (input as any).supervisorId || undefined,
    verification_criteria: input.verification_criteria || undefined,
    photos_not_required: input.photos_not_required ?? false,
    estimated_hours: input.estimated_hours ?? (input as any).estimatedHours ?? null,
    complexity: input.complexity || null,
    crew_required: input.crew_required ?? (input as any).crewRequired ?? null,
    is_required: input.is_required ?? (input as any).is_required ?? true,
  };

  // Handle assignee: prefer assignee_id, fall back to camelCase variant
  const rawAssignee = input.assignee_id ?? (input as any).assignee_id ?? (input as any).assignee ?? '';
  if (rawAssignee && rawAssignee !== '' && rawAssignee !== 'unassigned') {
    dbInput.assignee_id = isValidUUID(String(rawAssignee)) ? String(rawAssignee) : null;
  } else {
    dbInput.assignee_id = null;
  }

  // Handle projectId - convert to UUID string
  const rawProjectId = (input as any).projectId ?? input.project_id;
  if (rawProjectId !== undefined) {
    dbInput.project_id = String(rawProjectId);
  }

  const { data, error} = await supabase
    .from('tasks')
    .insert(dbInput)
    .select(TASK_LIST_COLUMNS)
    .single();
  
  if (error) {
    console.error('Failed to create task:', error);
  }
  
  failIf(error, 'Failed to create task');
  
  return data ? transformTask(data) : null;
}

export async function updateTask(id: string | number, updates: TaskUpdate) {
  console.log('🔵 tasksAPI.updateTask called with:', { id, updates });
  
  // Transform camelCase to snake_case for database
  const dbUpdates: any = {};
  
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
    // Workflow timing (started_at/submitted_at/completed_date) is stamped by
    // a database trigger (trg_stamp_task_status_timing) so every write path
    // -- this function, the work-session RPCs, anything else -- gets
    // identical stamping from one place instead of each needing its own copy.
  }
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  
  // Handle assignee with proper UUID validation
  if (updates.assignee_id !== undefined) {
    const val = updates.assignee_id;
    console.log('🔍 Processing assignee_id:', val);
    if (val && val !== '0' && val !== '' && val !== 'unassigned') {
      const valStr = String(val);
      dbUpdates.assignee_id = isValidUUID(valStr) ? valStr : null;
      console.log('🔍 assignee_id validation result:', { valStr, isValid: isValidUUID(valStr), final: dbUpdates.assignee_id });
    } else {
      dbUpdates.assignee_id = null;
      console.log('🔍 assignee_id set to null (empty/unassigned)');
    }
  }
  if ((updates as any).assignee !== undefined) {
    const assigneeValue = (updates as any).assignee;
    console.log('🔍 Processing assignee:', assigneeValue);
    if (assigneeValue && assigneeValue !== 0 && assigneeValue !== '0' && assigneeValue !== '' && assigneeValue !== 'unassigned') {
      const assigneeStr = String(assigneeValue);
      dbUpdates.assignee_id = isValidUUID(assigneeStr) ? assigneeStr : null;
      console.log('🔍 assignee validation result:', { assigneeStr, isValid: isValidUUID(assigneeStr), final: dbUpdates.assignee_id });
    } else {
      dbUpdates.assignee_id = null;
      console.log('🔍 assignee set to null (empty/unassigned)');
    }
  }
  
  if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date || null;
  if ((updates as any).dueDate !== undefined) dbUpdates.due_date = (updates as any).dueDate || null;
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.phase !== undefined) dbUpdates.phase = updates.phase;
  if (updates.completed_date !== undefined) dbUpdates.completed_date = updates.completed_date || null;
  if ((updates as any).completedDate !== undefined) dbUpdates.completed_date = (updates as any).completedDate || null;
  if (updates.review_feedback !== undefined) dbUpdates.review_feedback = updates.review_feedback;
  if ((updates as any).reviewFeedback !== undefined) dbUpdates.review_feedback = (updates as any).reviewFeedback;
  if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
  if (updates.rating_metrics !== undefined) dbUpdates.rating_metrics = updates.rating_metrics;
  if ((updates as any).ratingMetrics !== undefined) dbUpdates.rating_metrics = (updates as any).ratingMetrics;
  if (updates.task_type !== undefined) dbUpdates.task_type = updates.task_type;
  if (updates.start_date !== undefined) dbUpdates.start_date = updates.start_date || null;
  if ((updates as any).startDate !== undefined) dbUpdates.start_date = (updates as any).startDate || null;
  if (updates.phase_id !== undefined) dbUpdates.phase_id = updates.phase_id || null;
  if (updates.blocked_by !== undefined) dbUpdates.blocked_by = updates.blocked_by || null;
  if (updates.is_required !== undefined) dbUpdates.is_required = updates.is_required;
  if (updates.supervisor_id !== undefined) dbUpdates.supervisor_id = updates.supervisor_id || null;
  if (updates.verification_criteria !== undefined) dbUpdates.verification_criteria = updates.verification_criteria || null;
  if (updates.photos_not_required !== undefined) dbUpdates.photos_not_required = updates.photos_not_required;
  if (updates.estimated_hours !== undefined) dbUpdates.estimated_hours = updates.estimated_hours;
  if ((updates as any).estimatedHours !== undefined) dbUpdates.estimated_hours = (updates as any).estimatedHours;
  if (updates.complexity !== undefined) dbUpdates.complexity = updates.complexity || null;
  if (updates.crew_required !== undefined) dbUpdates.crew_required = updates.crew_required;
  if ((updates as any).crewRequired !== undefined) dbUpdates.crew_required = (updates as any).crewRequired;
  if (updates.sequence !== undefined) dbUpdates.sequence = updates.sequence;

  dbUpdates.updated_at = now();

  console.log('🔵 Updating task in database with:', dbUpdates);

  const { error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', String(id));
  
  if (error) {
    console.error('❌ Database error when updating task:', error);
    console.error('❌ Failed dbUpdates:', dbUpdates);
  }
  
  failIf(error, 'Failed to update task');
  return { id: String(id), ...updates };
}

// Persists a manual drag-order for a phase's undated tasks (see
// src/lib/taskOrder.ts for how `sequence` is used as the tiebreaker).
// Only ever called with undated task ids -- a dated task can't be
// reordered this way, since its due date already fixes its position and
// drives the Gantt chart.
export async function reorderPhaseTasks(orderedTaskIds: (string | number)[]) {
  const updates = orderedTaskIds.map((id, index) =>
    supabase.from('tasks').update({ sequence: index, updated_at: now() }).eq('id', String(id))
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  failIf(failed?.error, 'Failed to reorder tasks');
}

export async function deleteTask(id: string | number) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', String(id));
  
  failIf(error, 'Failed to delete task');
}

// Task Updates (comments/photos)
export interface TaskUpdateInput {
  task_id: string;
  author_id?: string;
  body?: string;
  photo_url?: string;
}

export async function listTaskUpdates(taskId: string) {
  const { data, error } = await supabase
    .from('task_updates')
    .select('id, task_id, author_id, body, photo_url, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  
  failIf(error, 'Failed to list task updates');
  return data ?? [];
}

export async function createTaskUpdate(input: TaskUpdateInput) {
  const { data, error } = await supabase
    .from('task_updates')
    .insert({
      ...input,
      created_at: now(),
    })
    .select()
    .single();
  
  failIf(error, 'Failed to create task update');
  return data;
}
