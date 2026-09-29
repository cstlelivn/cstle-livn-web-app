export type DerivedPhaseStatus = "Not Started" | "In Progress" | "Pending QC" | "Completed";

export interface PhaseStateTask {
  status?: string;
  is_required?: boolean | null;
}

export interface PhaseStateInput {
  qc_status?: string | null;
  qc_required?: boolean | null;
}

export interface DerivedPhaseState {
  status: DerivedPhaseStatus;
  progress: number;
  requiredCount: number;
  completedRequiredCount: number;
  incompleteRequiredCount: number;
  qcApproved: boolean;
}

/**
 * One UI calculation for phase tags, progress, QC counts, Current Phase and
 * Next Phase. The database uses the same rules in recalculate_phase_state().
 */
export function derivePhaseState(phase: PhaseStateInput, tasks: PhaseStateTask[]): DerivedPhaseState {
  const required = tasks.filter((task) => task.is_required !== false);
  const completed = required.filter((task) => task.status === "Completed").length;
  const started = required.some((task) => ![undefined, null, "", "To Do"].includes(task.status as any));
  const qcApproved = ["Approved", "Approved with Conditions"].includes(phase.qc_status ?? "");
  const qcRequired = phase.qc_required !== false;
  const allComplete = required.length > 0 && completed === required.length;

  let status: DerivedPhaseStatus = "Not Started";
  if (allComplete) status = !qcRequired || qcApproved ? "Completed" : "Pending QC";
  else if (started) status = "In Progress";

  return {
    status,
    progress: required.length === 0 ? 0 : Math.round((completed / required.length) * 100),
    requiredCount: required.length,
    completedRequiredCount: completed,
    incompleteRequiredCount: required.length - completed,
    qcApproved,
  };
}

export function deriveProjectPhaseSequence(phases: any[], tasks: any[]) {
  const ordered = [...phases].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const states = ordered.map((phase) => ({
    phase,
    state: derivePhaseState(phase, tasks.filter((task) => String(task.phase_id) === String(phase.id))),
  }));
  const currentIndex = states.findIndex(({ state }) => state.status !== "Completed");
  return {
    states,
    current: currentIndex >= 0 ? states[currentIndex] : null,
    next: currentIndex >= 0 ? states.slice(currentIndex + 1).find(({ state }) => state.status !== "Completed") ?? null : null,
  };
}
