-- Manual task ordering within a phase.
--
-- Sort priority everywhere a task list is shown (mobile queue, Supervisor
-- queue, desktop Tasks tab) is now a hard rule:
--   1. Tasks with a due date, earliest first.
--   2. Tasks with no due date, ordered by phase (current/incomplete phase
--      first), then by this new `sequence` column within that phase.
-- `sequence` is set by dragging tasks into order in the Phases tab (see
-- PhaseView.tsx) -- it only ever applies to undated tasks. A dated task
-- can't be dragged out of date order; the UI prompts to change its due
-- date instead, since that also drives the Gantt chart.
alter table public.tasks
  add column if not exists sequence integer;

comment on column public.tasks.sequence is
  'Manual order within a phase, used as a tiebreaker for tasks with no due date. Set via drag-reorder in the Phases tab.';

create index if not exists idx_tasks_phase_sequence
  on public.tasks (phase_id, sequence);
