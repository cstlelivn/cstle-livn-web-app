// Single source of truth for "can this person edit this task" on the client.
// Mirrors the database RLS policy in supabase/migrations/20240019_multi_assignee_task_edit_rls.sql
// (tasks_update policy: is_manager_or_admin() OR owns_task_multi(id)) — this
// is a UX convenience layer only. The database is what actually enforces it,
// so even if this helper has a bug, the RLS policy still blocks the write.

export interface TaskPermissionInput {
  task: { assignee?: string | null; id?: string | number } | null | undefined;
  currentUserId: string | null | undefined;
  isManagerOrAdmin: boolean;
  teamMembers: Array<{ id: string | number; authUserId?: string | null }>;
  // Active assignee ids for this task (from task_assignees, via
  // useTaskAssignees + assigneeIdsForTask). Optional for callers that
  // haven't been updated yet -- when omitted, falls back to checking only
  // task.assignee (the single "primary" assignee), which under-reports
  // edit access for a co-assignee who isn't primary but is still allowed
  // by the database.
  assigneeIds?: Array<string | number>;
}

export function canEditTask({ task, currentUserId, isManagerOrAdmin, teamMembers, assigneeIds }: TaskPermissionInput): boolean {
  if (isManagerOrAdmin) return true;
  if (!task || !currentUserId) return false;

  const myMemberId = teamMembers.find((m) => String(m.authUserId) === String(currentUserId))?.id;
  if (myMemberId === undefined) return false;

  if (assigneeIds && assigneeIds.length > 0) {
    return assigneeIds.some((id) => String(id) === String(myMemberId));
  }

  if (!task.assignee) return false;
  return String(task.assignee) === String(myMemberId);
}

// Who may drag-reschedule a task or phase bar in the Gantt chart. This is
// authority over the SCHEDULE (Manager/Admin, or the project's own
// Supervisor), not "am I the assignee" -- mirrors the canAssignTasks
// pattern already established in PhaseView.tsx, not canEditTask above
// (which stays scoped to its existing uses, e.g. status changes by
// whoever is actually doing the work).
export function canDragReschedule({
  isManagerOrAdmin,
  currentUserId,
  teamMembers,
  projectSupervisorId,
}: {
  isManagerOrAdmin: boolean;
  currentUserId: string | null | undefined;
  teamMembers: Array<{ id: string | number; authUserId?: string | null }>;
  projectSupervisorId: string | number | null | undefined;
}): boolean {
  if (isManagerOrAdmin) return true;
  if (!currentUserId || !projectSupervisorId) return false;
  const myMemberId = teamMembers.find((m) => String(m.authUserId) === String(currentUserId))?.id;
  if (myMemberId === undefined) return false;
  return String(projectSupervisorId) === String(myMemberId);
}
