// Shared "work order" for a project: phase position first (the phase
// currently being worked comes first, matching the project's Phase summary
// card), then due date within a phase. Used anywhere a task list should read
// like a real work sequence instead of an arbitrary edit-order/date list --
// the mobile associate/supervisor queue and the desktop per-project Tasks
// tab both use this.
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

export function sortTasksByPhase<T extends { phase_id?: string; dueDate?: string; startDate?: string }>(
  tasks: T[],
  phases: any[]
): T[] {
  const phasePositionById = buildPhasePositionMap(phases);
  return [...tasks].sort((a, b) => {
    const pa = phasePositionForTask(a, phasePositionById);
    const pb = phasePositionForTask(b, phasePositionById);
    if (pa !== pb) return pa - pb;
    const da = a.dueDate ? new Date(a.dueDate).getTime() : (a.startDate ? new Date(a.startDate).getTime() : Infinity);
    const db = b.dueDate ? new Date(b.dueDate).getTime() : (b.startDate ? new Date(b.startDate).getTime() : Infinity);
    return da - db;
  });
}
