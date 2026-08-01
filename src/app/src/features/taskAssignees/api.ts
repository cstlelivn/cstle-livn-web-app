import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';

const supabase = createClient();
let activeAssigneesRequest: Promise<any[]> | null = null;

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
  if (activeAssigneesRequest) return activeAssigneesRequest;
  activeAssigneesRequest = (async () => {
    const { data, error } = await supabase
      .from('task_assignees')
      .select('*')
      .eq('is_active', true)
      .order('assigned_at', { ascending: true })
      .limit(2000);
    failIf(error, 'Failed to list task assignees');
    return (data ?? []).map(transformAssignee);
  })();
  try {
    return await activeAssigneesRequest;
  } finally {
    activeAssigneesRequest = null;
  }
}

// Every declined assignment, most recent first. Used to power the "declined
// tasks need reassignment" notification for managers/supervisors -- a task
// counts as still needing attention if it has a decline in its history and
// nobody active is currently assigned (see useDeclinedAssignments.ts, which
// cross-references this against the live active-assignee list).
export async function listDeclinedAssignments(limit = 200) {
  const { data, error } = await supabase
    .from('task_assignees')
    .select('*')
    .not('decline_reason', 'is', null)
    .order('unassigned_at', { ascending: false })
    .limit(limit);
  failIf(error, 'Failed to list declined assignments');
  return (data ?? []).map((row: any) => ({
    ...transformAssignee(row),
    declineReason: row.decline_reason,
  }));
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

// Self-service decline of the caller's own assignment -- unlike
// unassignTaskMember (manager/admin-only), any assignee can call this on
// their own pending work. Used by the mobile "Decline" control.
export async function declineTaskAssignment(taskId: string, reason?: string) {
  const { data, error } = await supabase.rpc('decline_task_assignment', {
    p_task_id: taskId,
    p_reason: reason ?? null,
  });
  failIf(error, 'Failed to decline task');
  return transformAssignee(data);
}
