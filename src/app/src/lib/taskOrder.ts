// Shared "work order" for a project -- a hard rule, used everywhere a task
// list is shown (mobile associate/supervisor queue, desktop per-project
// Tasks tab) so the same task never appears in a different order depending
// on which screen you're looking at it from:
//
//   1. Tasks with a due date, earliest first. A due date always wins --
//      it's what drives the Gantt chart, so it can't be silently
//      reordered around.
//   2. Tasks with no due date, ordered by phase (the current/earliest
//      incomplete phase first, matching the project's Phase summary card).
//   3. Within the same phase, by `sequence` -- a manual order set by
//      dragging tasks into place in the Phases tab. Only undated tasks are
//      draggable there; dragging a dated task instead prompts to change
//      its date.
export function buildPhasePositionMap(phases: any[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of phases ?? []) {
    if (p?.id != null) map[String(p.id)] = typeof p.position === "number" ? p.position : 0;
  }
  return map;
}

function phasePositionForTask(task: any, phasePositionById: Record<string, number>): number {
  const byId = task?.phase_id != null ? phasePositionById[String(task.phase_id)] : undefined;
  if (byId !== undefined) return byId;
  // Legacy tasks predating normalized phases only have a free-text `phase`
  // name -- no reliable position for those, so they sort after everything
  // that does have a real phase link rather than randomly interleaving.
  return Number.POSITIVE_INFINITY;
}

export function sortTasksByPhase<T extends { phase_id?: string; dueDate?: string; sequence?: number | null }>(
  tasks: T[],
  phases: any[]
): T[] {
  const phasePositionById = buildPhasePositionMap(phases);
  return [...tasks].sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : null;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : null;
    if (da !== null && db !== null && da !== db) return da - db;
    if (da !== null && db === null) return -1;
    if (da === null && db !== null) return 1;

    const pa = phasePositionForTask(a, phasePositionById);
    const pb = phasePositionForTask(b, phasePositionById);
    if (pa !== pb) return pa - pb;

    const sa = typeof a.sequence === "number" ? a.sequence : Number.POSITIVE_INFINITY;
    const sb = typeof b.sequence === "number" ? b.sequence : Number.POSITIVE_INFINITY;
    return sa - sb;
  });
}
