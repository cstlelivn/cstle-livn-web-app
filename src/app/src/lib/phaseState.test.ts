import { describe, expect, it } from "vitest";
import { derivePhaseState, deriveProjectPhaseSequence } from "./phaseState";

describe("phase state source of truth", () => {
  it("ignores optional tasks in progress and QC counts", () => {
    expect(derivePhaseState({ qc_status: "Not Started" }, [
      { status: "Completed", is_required: true },
      { status: "To Do", is_required: false },
    ])).toMatchObject({ progress: 100, requiredCount: 1, incompleteRequiredCount: 0, status: "Pending QC" });
  });

  it("uses the required-task and QC rules for every status", () => {
    expect(derivePhaseState({}, [{ status: "To Do" }]).status).toBe("Not Started");
    expect(derivePhaseState({}, [{ status: "In Progress" }, { status: "To Do" }]).status).toBe("In Progress");
    expect(derivePhaseState({ qc_status: "Approved" }, [{ status: "Completed" }]).status).toBe("Completed");
    expect(derivePhaseState({ qc_required: false }, [{ status: "Completed" }]).status).toBe("Completed");
  });

  it("selects current and next from the same derived states", () => {
    const phases = [
      { id: "a", name: "Done", position: 0, qc_status: "Approved" },
      { id: "b", name: "Current", position: 1 },
      { id: "c", name: "Next", position: 2 },
    ];
    const result = deriveProjectPhaseSequence(phases, [
      { phase_id: "a", status: "Completed" },
      { phase_id: "b", status: "In Progress" },
      { phase_id: "c", status: "To Do" },
    ]);
    expect(result.current?.phase.name).toBe("Current");
    expect(result.next?.phase.name).toBe("Next");
  });
});
