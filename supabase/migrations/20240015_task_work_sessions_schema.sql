-- =============================================================================
-- Migration: Work-session schema (step 4 of the time-tracking feature).
--
-- One task_work_sessions row per person's continuous engagement with a task
-- (their first Start through their Finish). task_work_session_events is the
-- append-only, immutable audit log underneath it -- every start/pause/
-- resume/finish as its own row, keeping BOTH what the client claims the
-- timestamp was (event_at, which may be backdated for an offline-queued
-- action) and when the server actually received it (server_received_at) --
-- so a suspect device clock can be told apart from a real fact, and so
-- reporting/AI can distinguish "this really happened at X" from "we were
-- told it happened at X."
--
-- Pure schema -- no RLS, no RPCs yet (those are 20240016). Nothing writes
-- here until that migration ships and the app is wired to it.
--
-- Safe to re-run: IF NOT EXISTS throughout.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'finished')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  active_seconds integer NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  notes text,
  delay_reason text,
  blocker text,
  qc_result text CHECK (qc_result IS NULL OR qc_result IN ('Approved', 'Approved with Conditions', 'Rejected')),
  rework boolean NOT NULL DEFAULT false,
  completion_status text,
  clock_suspect boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- A person can only have ONE non-finished session per task at a time (this
-- is the DB-level guarantee behind "start/pause/resume/finish your own
-- session without affecting anyone else's" -- it stops a duplicate/racing
-- session on the same task+person, while placing no restriction at all on
-- that same person having sessions running on other tasks simultaneously,
-- or on different people's sessions on this same task).
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_work_sessions_open
  ON public.task_work_sessions(task_id, team_member_id)
  WHERE status <> 'finished';

CREATE INDEX IF NOT EXISTS idx_task_work_sessions_task_id ON public.task_work_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_work_sessions_project_id ON public.task_work_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_task_work_sessions_team_member_id ON public.task_work_sessions(team_member_id);
CREATE INDEX IF NOT EXISTS idx_task_work_sessions_qc_result ON public.task_work_sessions(qc_result) WHERE qc_result IS NULL;

CREATE TABLE IF NOT EXISTS public.task_work_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.task_work_sessions(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('start', 'pause', 'resume', 'finish')),
  event_at timestamptz NOT NULL,
  server_received_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  delay_reason text,
  blocker text,
  client_event_id uuid UNIQUE,
  is_offline_created boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_work_session_events_session_id ON public.task_work_session_events(session_id, event_at);

-- Deleting a task with recorded session history is blocked (RESTRICT, not
-- CASCADE) -- this is the permanent historical record the whole feature
-- exists to build, so it can't be silently destroyed by deleting a task.
-- Deleting a session's events likewise blocked; sessions themselves are
-- never deleted by any app code path.
