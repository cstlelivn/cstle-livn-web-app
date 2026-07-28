// Single source of truth for "can this person edit this task" on the client.
// Mirrors the database RLS policy in supabase/migrations/20240004_role_source_and_rls.sql
// (tasks_update policy: is_manager_or_admin() OR owns_task(assignee_id)) — this
// is a UX convenience layer only. The database is what actually enforces it,
// so even if this helper has a bug, the RLS policy still blocks the write.

export interface TaskPermissionInput {
  task: { assignee?: string | null } | null | undefined;
  currentUserId: string | null | undefined;
  isManagerOrAdmin: boolean;
  teamMembers: Array<{ id: string | number; authUserId?: string | null }>;
}

export function canEditTask({ task, currentUserId, isManagerOrAdmin, teamMembers }: TaskPermissionInput): boolean {
  if (isManagerOrAdmin) return true;
  if (!task || !currentUserId || !task.assignee) return false;

  const assignedMember = teamMembers.find((m) => String(m.id) === String(task.assignee));
  return !!assignedMember?.authUserId && String(assignedMember.authUserId) === String(currentUserId);
}
