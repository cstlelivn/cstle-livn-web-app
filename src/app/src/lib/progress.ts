/**
 * Single source of truth for "% complete" everywhere in the app.
 *
 * Progress must always be derived live from each task's `status` field, not
 * from a separately-stored `progress` number -- nothing in this codebase ever
 * wrote a task's `progress` field when its status changed, so anything that
 * averaged `task.progress` was permanently stuck near 0 no matter how many
 * tasks were actually completed. Compute this from the in-memory task list
 * on every render instead of persisting a snapshot, so it can never go stale.
 */

export interface CompletionStats {
  completed: number;
  total: number;
  /** 0-100, rounded. 0 when there are no tasks (not NaN, not an error). */
  percent: number;
}

export function calculateCompletion(tasks: { status?: string }[]): CompletionStats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}
