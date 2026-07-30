import { useMemo } from 'react';
import { useApp } from '../../../components/AppContext';
import { useAuth } from '../../../components/AuthContext';

/**
 * Single source of truth for "which tasks need a QC-capable person's
 * attention, for the person currently looking." Used by both the QC Review
 * Queue and the notification bell, so they can never disagree.
 *
 * A task needs attention when it's "Pending QC" (done, awaiting approval)
 * or "Under Review" (blocked, needs a supervisor's help) -- see
 * statusWorkflow.ts for why those are different but both land here.
 *
 * Visibility: Super Admin sees everything company-wide. Everyone else only
 * sees tasks in projects where THEY are the designated supervisor -- the
 * QC reviewer for a project is that project's supervisor, not any
 * QC-capable person generally. Associates never see this at all (gated by
 * canViewQCReviewQueue), which is what stopped them getting these
 * notifications in the first place.
 */
export function useTasksAwaitingReview() {
  const { tasks, projects, teamMembers } = useApp();
  const { hasPermission, currentUser } = useAuth();

  return useMemo(() => {
    if (!hasPermission('canViewQCReviewQueue')) return [];

    const needsAttention = tasks.filter(
      (t: any) => t.status === 'Pending QC' || t.status === 'Under Review'
    );

    // Super Admin sees every project's queue, not just their own.
    if (hasPermission('canForceCompleteProjects')) return needsAttention;

    const myMember = (teamMembers as any[]).find((m) => String(m.authUserId) === String(currentUser?.id));
    if (!myMember) return [];

    const mySupervisedProjectIds = new Set(
      projects.filter((p: any) => String(p.supervisorId) === String(myMember.id)).map((p: any) => p.id)
    );

    return needsAttention.filter((t: any) => mySupervisedProjectIds.has(t.projectId));
  }, [tasks, projects, teamMembers, hasPermission, currentUser]);
}
