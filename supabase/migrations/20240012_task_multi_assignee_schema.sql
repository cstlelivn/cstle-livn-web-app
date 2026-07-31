-- =============================================================================
-- Migration: Multi-assignee schema (step 1 of the time-tracking feature).
--
-- Pure schema addition -- no RLS changes, no triggers, no backfill yet, so
-- this is safe to run with zero behavior change to the live app. The sync
-- triggers, RLS, and backfill that make this table actually load with data
-- and stay in sync with tasks.assignee_id come in the next migration
-- (20240013). Nothing in the UI reads this table until later in this
-- feature's rollout.
--
-- Safe to re-run: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES public.team_members(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ON DELETE RESTRICT (not CASCADE) on task_id: assignment history is part of
-- the permanent historical record this feature exists to build, so deleting
-- a task that has ever had assignees should be blocked, not silently wipe
-- who worked on it. (Tasks with no assignment history at all can still be
-- deleted freely -- this only blocks once a row here references them.)

-- Only one ACTIVE assignment per (task, person) at a time -- but a person can
-- be assigned, removed, and reassigned later, each as its own historical row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_assignees_active
  ON public.task_assignees(task_id, team_member_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_team_member_id ON public.task_assignees(team_member_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_active_member ON public.task_assignees(team_member_id) WHERE is_active;

-- The "estimate" side of estimate-vs-actual reporting, and context for AI
-- recommendations. Both optional -- nothing requires them to be set.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS estimated_hours numeric,
  ADD COLUMN IF NOT EXISTS complexity text;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_complexity_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_complexity_check CHECK (complexity IS NULL OR complexity IN ('Low', 'Medium', 'High'));
