export function isProjectClosed(project: any): boolean {
  return project?.status === "Completed";
}

/** Operational task views exclude closed projects while retaining every task
 * in storage and inside the closed project's own historical detail screen. */
export function operationalTasks<T extends { projectId?: unknown }>(tasks: T[], projects: any[]): T[] {
  const activeProjectIds = new Set(
    projects.filter((project) => !isProjectClosed(project)).map((project) => String(project.id))
  );
  return tasks.filter((task) => activeProjectIds.has(String(task.projectId)));
}
