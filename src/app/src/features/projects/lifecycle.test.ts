import { describe, expect, it } from "vitest";
import { isProjectClosed, operationalTasks } from "./lifecycle";

describe("project lifecycle", () => {
  it("treats only Completed projects as closed", () => {
    expect(isProjectClosed({ status: "Completed" })).toBe(true);
    expect(isProjectClosed({ status: "In Progress" })).toBe(false);
  });

  it("removes closed-project tasks from operational views without mutating history", () => {
    const tasks = [
      { id: "task-open", projectId: "open" },
      { id: "task-closed", projectId: "closed" },
      { id: "task-orphan", projectId: "missing" },
    ];
    const result = operationalTasks(tasks, [
      { id: "open", status: "In Progress" },
      { id: "closed", status: "Completed" },
    ]);

    expect(result.map((task) => task.id)).toEqual(["task-open"]);
    expect(tasks).toHaveLength(3);
  });
});
