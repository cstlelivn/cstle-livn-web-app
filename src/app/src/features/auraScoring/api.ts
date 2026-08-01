import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';

const supabase = createClient();

// New, transparent performance-only Aura scoring, computed server-side from
// real task_work_sessions data (qc_result, active_seconds vs estimated_hours,
// documented delays, notes/photos). Deliberately separate from
// src/features/aura/ (the existing PAY calculation engine -- base_pay/
// bonus/penalty/aura_ledger) -- this never touches pay fields at all.

export interface TaskAuraScore {
  id: string;
  taskId: string;
  teamMemberId: string;
  qualityScore: number;
  timingScore: number;
  reliabilityScore: number;
  overallScore: number;
  qcResult: 'Approved' | 'Approved with Conditions' | 'Rejected';
  rework: boolean;
  delayDocumented: boolean;
  reviewerFeedback: string | null;
  createdAt: string;
}

function transformScore(row: any): TaskAuraScore {
  return {
    id: row.id,
    taskId: row.task_id,
    teamMemberId: row.team_member_id,
    qualityScore: Number(row.quality_score),
    timingScore: Number(row.timing_score),
    reliabilityScore: Number(row.reliability_score),
    overallScore: Number(row.overall_score),
    qcResult: row.qc_result,
    rework: row.rework,
    delayDocumented: row.delay_documented,
    reviewerFeedback: row.reviewer_feedback,
    createdAt: row.created_at,
  };
}

// Called right after recordSessionQCResult() in the same QC action --
// computes and stores the Aura score for everyone who contributed to the
// task, and refreshes their rolling team_members.aura_rating from real
// scored-task history.
export async function recordTaskAuraScore(taskId: string, reviewerFeedback?: string) {
  const { data, error } = await supabase.rpc('record_task_aura_score', {
    p_task_id: taskId,
    p_reviewer_feedback: reviewerFeedback ?? null,
  });
  failIf(error, 'Failed to record Aura score');
  return data as number;
}

export async function getTaskAuraScore(taskId: string, teamMemberId: string) {
  const { data, error } = await supabase
    .from('task_aura_scores')
    .select('*')
    .eq('task_id', taskId)
    .eq('team_member_id', teamMemberId)
    .maybeSingle();
  failIf(error, 'Failed to load task Aura score');
  return data ? transformScore(data) : null;
}

export async function listRecentAuraScores(teamMemberId: string, limit = 10) {
  const { data, error } = await supabase
    .from('task_aura_scores')
    .select('*')
    .eq('team_member_id', teamMemberId)
    .order('created_at', { ascending: false })
    .limit(limit);
  failIf(error, 'Failed to list Aura scores');
  return (data ?? []).map(transformScore);
}

export interface AuraProfile {
  scoredTaskCount: number;
  avgOverall: number | null;
  avgQuality: number | null;
  avgTiming: number | null;
  avgReliability: number | null;
  onTimeRate: number | null;
  qcPassRate: number | null;
  reworkRate: number | null;
  recentAvg: number | null;
  priorAvg: number | null;
  level: 'New Member' | 'Developing' | 'Skilled' | 'Advanced' | 'Expert';
  tasksUntilConfident: number;
}

export async function getAuraProfile(teamMemberId: string): Promise<AuraProfile | null> {
  const { data, error } = await supabase.rpc('team_member_aura_profile', { p_team_member_id: teamMemberId });
  failIf(error, 'Failed to load Aura profile');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    scoredTaskCount: Number(row.scored_task_count),
    avgOverall: row.avg_overall !== null ? Number(row.avg_overall) : null,
    avgQuality: row.avg_quality !== null ? Number(row.avg_quality) : null,
    avgTiming: row.avg_timing !== null ? Number(row.avg_timing) : null,
    avgReliability: row.avg_reliability !== null ? Number(row.avg_reliability) : null,
    onTimeRate: row.on_time_rate !== null ? Number(row.on_time_rate) : null,
    qcPassRate: row.qc_pass_rate !== null ? Number(row.qc_pass_rate) : null,
    reworkRate: row.rework_rate !== null ? Number(row.rework_rate) : null,
    recentAvg: row.recent_avg !== null ? Number(row.recent_avg) : null,
    priorAvg: row.prior_avg !== null ? Number(row.prior_avg) : null,
    level: row.level,
    tasksUntilConfident: Number(row.tasks_until_confident),
  };
}

export async function getDemonstratedSkills(teamMemberId: string) {
  const { data, error } = await supabase.rpc('team_member_demonstrated_skills', { p_team_member_id: teamMemberId });
  failIf(error, 'Failed to load demonstrated skills');
  return ((data ?? []) as any[]).map((r) => ({ taskType: r.task_type as string, approvedCount: Number(r.approved_count) }));
}
