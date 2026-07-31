import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';

const supabase = createClient();

export interface WorkSession {
  id: string;
  taskId: string;
  projectId: string;
  teamMemberId: string;
  status: 'running' | 'paused' | 'finished';
  startedAt: string;
  finishedAt: string | null;
  activeSeconds: number;
  notes: string | null;
  delayReason: string | null;
  blocker: string | null;
  qcResult: 'Approved' | 'Approved with Conditions' | 'Rejected' | null;
  rework: boolean;
  completionStatus: string | null;
  clockSuspect: boolean;
  createdAt: string;
  updatedAt: string;
}

function transformSession(row: any): WorkSession {
  return {
    id: row.id,
    taskId: row.task_id,
    projectId: row.project_id,
    teamMemberId: row.team_member_id,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    activeSeconds: row.active_seconds,
    notes: row.notes,
    delayReason: row.delay_reason,
    blocker: row.blocker,
    qcResult: row.qc_result,
    rework: row.rework,
    completionStatus: row.completion_status,
    clockSuspect: row.clock_suspect,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSessionsForTask(taskId: string) {
  const { data, error } = await supabase
    .from('task_work_sessions')
    .select('*')
    .eq('task_id', taskId)
    .order('started_at', { ascending: true });
  failIf(error, 'Failed to list work sessions');
  return (data ?? []).map(transformSession);
}

// RLS scopes this to "my own sessions" for a plain Associate, and to
// everyone's for Manager/Admin/Super Admin/QC/Accountant -- same rows
// either way, the database decides what comes back.
export async function listAllSessions(limit = 2000) {
  const { data, error } = await supabase
    .from('task_work_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  failIf(error, 'Failed to list work sessions');
  return (data ?? []).map(transformSession);
}

interface RpcOpts {
  clientEventId?: string;
  clientEventAt?: string;
}

function newEventId() {
  return (globalThis.crypto as any)?.randomUUID
    ? (globalThis.crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function startSession(taskId: string, opts: RpcOpts = {}) {
  const { data, error } = await supabase.rpc('start_work_session', {
    p_task_id: taskId,
    p_client_event_id: opts.clientEventId || newEventId(),
    p_client_event_at: opts.clientEventAt || new Date().toISOString(),
  });
  failIf(error, 'Failed to start work session');
  return transformSession(data);
}

export async function pauseSession(
  sessionId: string,
  fields: { notes?: string; delayReason?: string; blocker?: string } = {},
  opts: RpcOpts = {}
) {
  const { data, error } = await supabase.rpc('pause_work_session', {
    p_session_id: sessionId,
    p_client_event_id: opts.clientEventId || newEventId(),
    p_client_event_at: opts.clientEventAt || new Date().toISOString(),
    p_notes: fields.notes ?? null,
    p_delay_reason: fields.delayReason ?? null,
    p_blocker: fields.blocker ?? null,
  });
  failIf(error, 'Failed to pause work session');
  return transformSession(data);
}

export async function resumeSession(sessionId: string, opts: RpcOpts = {}) {
  const { data, error } = await supabase.rpc('resume_work_session', {
    p_session_id: sessionId,
    p_client_event_id: opts.clientEventId || newEventId(),
    p_client_event_at: opts.clientEventAt || new Date().toISOString(),
  });
  failIf(error, 'Failed to resume work session');
  return transformSession(data);
}

export async function finishSession(
  sessionId: string,
  fields: { notes?: string; completionStatus?: string } = {},
  opts: RpcOpts = {}
) {
  const { data, error } = await supabase.rpc('finish_work_session', {
    p_session_id: sessionId,
    p_client_event_id: opts.clientEventId || newEventId(),
    p_client_event_at: opts.clientEventAt || new Date().toISOString(),
    p_notes: fields.notes ?? null,
    p_completion_status: fields.completionStatus ?? 'Completed',
  });
  failIf(error, 'Failed to finish work session');
  return transformSession(data);
}

// Writes a QC decision back onto the task's finished sessions that don't
// have one yet -- reuses the existing task-level QC review flow rather than
// a separate per-session review screen. See 20240020 for the known v1
// limitation (shared across all contributors in the cycle, not attributed
// to whichever specific person's work needed it).
export async function recordSessionQCResult(
  taskId: string,
  qcResult: 'Approved' | 'Approved with Conditions' | 'Rejected',
  rework = false
) {
  const { data, error } = await supabase.rpc('record_session_qc_result', {
    p_task_id: taskId,
    p_qc_result: qcResult,
    p_rework: rework,
  });
  failIf(error, 'Failed to record QC result on work sessions');
  return data as number;
}

export async function getTaskTimeSummary(taskId: string) {
  const { data, error } = await supabase.rpc('task_time_summary', { p_task_id: taskId });
  failIf(error, 'Failed to load task time summary');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    taskId: row.task_id,
    estimatedHours: row.estimated_hours,
    actualHours: row.actual_hours,
    sessionCount: row.session_count,
    contributorCount: row.contributor_count,
    firstStartedAt: row.first_started_at,
    lastFinishedAt: row.last_finished_at,
  };
}
