// Single source of truth for the task status workflow. There used to be
// three different, inconsistent status sets across the app (the Task TS
// type, TaskDialog's own 8-value select, TaskKanban's 4-value columns) --
// this is the one canonical set everything now uses.
//
// To Do -> In Progress -> Under Review (blocked, needs a supervisor before
// work can continue or move toward completion) -> Pending QC (assignee's
// own work is done, waiting on QC) -> Completed (passed QC).
//
// A plain assignee can move a task forward through To Do/In Progress/
// Pending QC on their own, but only QC-capable roles (Super Admin, Admin,
// Manager -- see canApproveTaskQC in AuthContext) can clear an Under
// Review block or approve/reject out of Pending QC.

export type TaskStatus = "To Do" | "In Progress" | "Under Review" | "Pending QC" | "Completed";

export const ALL_TASK_STATUSES: TaskStatus[] = [
  "To Do",
  "In Progress",
  "Under Review",
  "Pending QC",
  "Completed",
];

export interface StatusAction {
  label: string;
  nextStatus: TaskStatus;
}

// The restricted set of forward actions a plain assignee (not QC-capable)
// can take from their current status. Everything else -- clearing an
// Under Review block, approving/rejecting Pending QC -- requires QC access.
export function getEmployeeActions(status: TaskStatus): StatusAction[] {
  switch (status) {
    case "To Do":
      return [{ label: "Start", nextStatus: "In Progress" }];
    case "In Progress":
      return [
        { label: "Request Review", nextStatus: "Under Review" },
        { label: "Finished", nextStatus: "Pending QC" },
      ];
    default:
      return [];
  }
}
