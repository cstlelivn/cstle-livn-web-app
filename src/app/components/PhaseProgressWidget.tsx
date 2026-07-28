import { CheckCircle2, Circle, AlertCircle, ClipboardCheck } from "lucide-react";
import type { Project, Task } from "./AppContext";
import { calculatePhaseCompletions, shouldSubmitPhaseForQC, createPhaseQCReview } from "../utils/phaseCalculations";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface PhaseProgressWidgetProps {
  project: Project;
  tasks: Task[];
}

export default function PhaseProgressWidget({ project, tasks }: PhaseProgressWidgetProps) {
  const { user } = useAuth();
  const phaseCompletions = calculatePhaseCompletions(project, tasks);

  const handleSubmitForQC = (phaseName: string) => {
    if (!user) {
      toast.error("You must be logged in to submit for QC");
      return;
    }

    if (shouldSubmitPhaseForQC(project.id, phaseName, tasks)) {
      const review = createPhaseQCReview(project.id, phaseName, tasks, Number(user.id) || 1);
      toast.success(`Phase "${phaseName}" has been submitted for QC review!`);
      
      // Reload to reflect changes
      window.location.reload();
    } else {
      toast.error("Phase cannot be submitted for QC at this time");
    }
  };

  if (phaseCompletions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[12px] p-[20px]">
        <h3 className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground mb-[4px]">
          Project Phases
        </h3>
        <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">
          No phases defined for this project.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-[12px] p-[20px]">
      <div className="flex items-start justify-between mb-[16px]">
        <div>
          <h3 className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground mb-[4px]">
            Project Phases
          </h3>
          <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">
            Completion tracked by tasks + QC approval
          </p>
        </div>
        <div className="text-right">
          <p className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
            {Math.round(phaseCompletions.reduce((sum, p) => sum + p.contributionToProject, 0))}%
          </p>
          <p className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">
            Overall
          </p>
        </div>
      </div>

      <div className="space-y-[12px]">
        {phaseCompletions.map((phase, index) => {
          const isComplete = phase.completionPercentage === 100 && phase.qcStatus === "Approved";
          const hasStarted = phase.completionPercentage > 0;
          const allTasksDone = phase.completedTasks === phase.totalTasks && phase.totalTasks > 0;
          const needsQC = allTasksDone && phase.qcStatus === "NotRequired";
          const awaitingQC = phase.qcStatus === "Pending";
          const qcRejected = phase.qcStatus === "Rejected";

          return (
            <div key={index} className="space-y-[6px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : awaitingQC ? (
                    <ClipboardCheck className="w-4 h-4 text-warning" />
                  ) : qcRejected ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : hasStarted ? (
                    <Circle className="w-4 h-4 text-primary" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                    {phase.name}
                  </span>
                  {awaitingQC && (
                    <span className="px-[8px] py-[2px] bg-warning/10 text-warning rounded-full text-[9px] font-['Roboto_Mono'] font-medium">
                      Awaiting QC
                    </span>
                  )}
                  {qcRejected && (
                    <span className="px-[8px] py-[2px] bg-destructive/10 text-destructive rounded-full text-[9px] font-['Roboto_Mono'] font-medium">
                      QC Rejected
                    </span>
                  )}
                  {isComplete && (
                    <span className="px-[8px] py-[2px] bg-success/10 text-success rounded-full text-[9px] font-['Roboto_Mono'] font-medium">
                      QC Approved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-[12px]">
                  <span className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">
                    {phase.completedTasks}/{phase.totalTasks} tasks
                  </span>
                  {needsQC && (
                    <button
                      onClick={() => handleSubmitForQC(phase.name)}
                      className="px-[8px] py-[2px] bg-accent text-accent-foreground rounded-[4px] hover:bg-accent/90 transition-colors text-[9px] font-['Roboto_Mono'] font-medium"
                    >
                      Submit for QC
                    </button>
                  )}
                  <span className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground min-w-[40px] text-right">
                    {Math.round(phase.completionPercentage)}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-[6px] bg-muted rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                    isComplete
                      ? "bg-success"
                      : awaitingQC
                      ? "bg-warning"
                      : qcRejected
                      ? "bg-destructive"
                      : hasStarted
                      ? "bg-primary"
                      : "bg-muted-foreground/20"
                  }`}
                  style={{ width: `${phase.completionPercentage}%` }}
                />
              </div>

              {/* Phase weight indicator */}
              <div className="flex items-center justify-between">
                <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">
                  {phase.percentOfProject.toFixed(1)}% of project
                </span>
                <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">
                  Contributes {phase.contributionToProject.toFixed(1)}% to overall progress
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-[16px] pt-[16px] border-t border-border">
        <div className="grid grid-cols-3 gap-[12px]">
          <div>
            <p className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground mb-[4px]">
              Total Tasks
            </p>
            <p className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
              {phaseCompletions.reduce((sum, p) => sum + p.totalTasks, 0)}
            </p>
          </div>
          <div>
            <p className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground mb-[4px]">
              Completed
            </p>
            <p className="font-['Roboto_Mono'] font-bold text-[14px] text-success">
              {phaseCompletions.reduce((sum, p) => sum + p.completedTasks, 0)}
            </p>
          </div>
          <div>
            <p className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground mb-[4px]">
              Remaining
            </p>
            <p className="font-['Roboto_Mono'] font-bold text-[14px] text-warning">
              {phaseCompletions.reduce((sum, p) => sum + (p.totalTasks - p.completedTasks), 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}