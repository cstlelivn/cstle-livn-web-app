import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';

const supabase = createClient();

export type TaskUpdateType = 'progress' | 'query' | 'suggestion' | 'issue' | 'change_request';

export async function listTaskUpdates(taskId: string) {
  const { data, error } = await supabase.from('task_updates')
    .select('id,task_id,project_id,team_member_id,update_type,body,status,created_at,updated_at')
    .eq('task_id', taskId).order('created_at', { ascending: false }).limit(50);
  failIf(error, 'Failed to load task updates');
  return data ?? [];
}

export async function listProjectUpdates(projectId: string) {
  const { data, error } = await supabase.from('task_updates')
    .select('id,task_id,project_id,team_member_id,update_type,body,status,created_at,updated_at')
    .eq('project_id', projectId).order('created_at', { ascending: false }).limit(500);
  failIf(error, 'Failed to load project activity');
  return data ?? [];
}

export async function createTaskUpdate(taskId: string, projectId: string, authorId: string, updateType: TaskUpdateType, body: string) {
  const { data, error } = await supabase.from('task_updates').insert({
    task_id: taskId, project_id: projectId, team_member_id: authorId,
    update_type: updateType, body: body.trim(),
  }).select('id,task_id,project_id,team_member_id,update_type,body,status,created_at,updated_at').single();
  failIf(error, 'Failed to submit task update');
  return data;
}

export async function listTaskChecklist(taskId: string) {
  const { data, error } = await supabase.from('task_checklist_items')
    .select('id,task_id,label,is_required,position,completed_at,completed_by')
    .eq('task_id', taskId).order('position').order('created_at');
  failIf(error, 'Failed to load task checklist');
  return data ?? [];
}

export async function setChecklistItem(itemId: string, completed: boolean) {
  const { data, error } = await supabase.rpc('set_task_checklist_item', { p_item_id: itemId, p_completed: completed });
  failIf(error, 'Failed to update checklist');
  return data;
}

export async function countReadyTaskPhotos(taskId: string) {
  const { count, error } = await supabase.from('task_media').select('id', { count: 'exact', head: true })
    .eq('task_id', taskId).eq('media_kind', 'photo').eq('upload_status', 'ready').is('deleted_at', null);
  failIf(error, 'Failed to check task photos');
  return count ?? 0;
}

export async function createChecklistItem(taskId: string, label: string, required = true, position = 0) {
  const { data, error } = await supabase.from('task_checklist_items').insert({ task_id: taskId, label: label.trim(), is_required: required, position })
    .select('id,task_id,label,is_required,position,completed_at,completed_by').single();
  failIf(error, 'Failed to add checklist item');
  return data;
}

export async function deleteChecklistItem(itemId: string) {
  const { error } = await supabase.from('task_checklist_items').delete().eq('id', itemId);
  failIf(error, 'Failed to delete checklist item');
}

export async function setTaskUpdateStatus(id: string, status: 'acknowledged' | 'resolved' | 'declined') {
  const { data, error } = await supabase.from('task_updates').update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
    .eq('id', id).select('id,status,resolved_at').single();
  failIf(error, 'Failed to update report status');
  return data;
}
