import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';

const supabase = createClient();

// Identity-bearing: RLS on the underlying view scopes this to "my own row"
// for anyone without canViewTeamPerformance -- callers should still gate
// the UI on that permission so an unauthorized viewer doesn't even see a
// single-row version of this.
export async function listTeamMemberProductivity() {
  const { data, error } = await supabase.from('v_team_member_productivity').select('*');
  failIf(error, 'Failed to load team productivity');
  return (data ?? []).map((row: any) => ({
    teamMemberId: row.team_member_id,
    totalActiveSeconds: row.total_active_seconds || 0,
    tasksWorked: row.tasks_worked || 0,
    sessionsFinished: row.sessions_finished || 0,
    qcApprovedCount: row.qc_approved_count || 0,
    qcApprovedWithConditionsCount: row.qc_approved_with_conditions_count || 0,
    qcRejectedCount: row.qc_rejected_count || 0,
    reworkCount: row.rework_count || 0,
    sessionsWithDelayOrBlocker: row.sessions_with_delay_or_blocker || 0,
  }));
}

// De-identified aggregate -- same result for every viewer regardless of
// role, since it never includes who did the work.
export async function getTaskTypeEstimates() {
  const { data, error } = await supabase.rpc('task_type_estimates');
  failIf(error, 'Failed to load task type estimates');
  return (data ?? []).map((row: any) => ({
    taskType: row.task_type,
    complexity: row.complexity,
    sampleSize: row.sample_size,
    avgEstimatedHours: row.avg_estimated_hours,
    avgActualHours: row.avg_actual_hours,
  }));
}

export async function getProductivityTrend(start: string, end: string) {
  const { data, error } = await supabase.rpc('productivity_trend', { p_start: start, p_end: end });
  failIf(error, 'Failed to load productivity trend');
  return (data ?? []).map((row: any) => ({
    weekStart: row.week_start,
    totalActiveHours: row.total_active_hours,
    sessionsFinished: row.sessions_finished,
  }));
}
