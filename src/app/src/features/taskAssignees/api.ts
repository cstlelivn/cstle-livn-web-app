import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';

const supabase = createClient();

// Transform database row to camelCase for frontend use.
function transformAssignee(row: any) {
  return {
    id: row.id,
    taskId: row.task_id,
    teamMemberId: row.team_member_id,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    unassignedAt: row.unassigned_at,
    isActive: row.is_active,
  };
}

export async function listActiveTaskAssignees() {
  const { data, error } = await supabase
    .from('task_assignees')
    .select('*')
    .eq('is_active', true)
    .order('assigned_at', { ascending: true })
    .limit(2000);
  failIf(error, 'Failed to list task assignees');
  return (data ?? []).map(transformAssignee);
}

export async function listTaskAssigneeHistory(taskId: string) {
  const { data, error } = await supabase
    .from('task_assignees')
    .select('*')
    .eq('task_id', taskId)
    .order('assigned_at', { ascending: true });
  failIf(error, 'Failed to list task assignee history');
  return (data ?? []).map(transformAssignee);
}

// Both RPCs are manager/admin-only at the database level (RLS + an explicit
// role check inside the function) -- calling either as an Associate returns
// a clear FORBIDDEN error rather than silently doing nothing.
export async function assignTaskMember(taskId: string, teamMemberId: string) {
  const { data, error } = await supabase.rpc('assign_task_member', {
    p_task_id: taskId,
    p_team_member_id: teamMemberId,
  });
  failIf(error, 'Failed to assign team member');
  return transformAssignee(data);
}

export async function unassignTaskMember(taskId: string, teamMemberId: string) {
  const { data, error } = await supabase.rpc('unassign_task_member', {
    p_task_id: taskId,
    p_team_member_id: teamMemberId,
  });
  failIf(error, 'Failed to unassign team member');
  return transformAssignee(data);
}
