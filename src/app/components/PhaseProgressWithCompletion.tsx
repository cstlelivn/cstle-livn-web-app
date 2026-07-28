import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { Project } from "./AppContext";
import { toast } from "sonner";
import { updatePhaseCompletion } from "../src/api/phaseCompletion";
import PhaseCompletionEmailModal from "./PhaseCompletionEmailModal";
import { getClient } from "../src/features/clients/api";

interface PhaseProgressWithCompletionProps {
  project: Project;
  onProjectUpdate?: (updatedProject: Project) => void;
}

export default function PhaseProgressWithCompletion({ 
  project, 
  onProjectUpdate 
}: PhaseProgressWithCompletionProps) {
  const [localProject, setLocalProject] = useState(project);
  const [updatingPhase, setUpdatingPhase] = useState<number | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [completedPhaseData, setCompletedPhaseData] = useState<{
    phaseName: string;
    phaseIndex: number;
    previousPhase?: string;
  } | null>(null);
  const [clientEmail, setClientEmail] = useState<string>("");

  // Sync with prop changes
  useEffect(() => {
    setLocalProject(project);
  }, [project]);

  // Fetch client email
  useEffect(() => {
    const fetchClientEmail = async () => {
      if (project.clientId) {
        try {
          const client = await getClient(project.clientId.toString());
          if (client && client.email) {
            setClientEmail(client.email);
          }
        } catch (error) {
          console.error("Error fetching client email:", error);
        }
      }
    };
    fetchClientEmail();
  }, [project.clientId]);

  const phases = localProject.phases || [];
  const completedPhases = phases.filter((p: any) => p.isCompleted).length;
  const totalPhases = phases.length;
  const projectProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const handleTogglePhaseCompletion = async (phaseIndex: number) => {
    const phase = phases[phaseIndex];
    const newCompletionStatus = !phase.isCompleted;

    setUpdatingPhase(phaseIndex);

    try {
      // Update backend
      const response = await updatePhaseCompletion(
        localProject.id,
        phaseIndex,
        newCompletionStatus
      );

      // Update local state
      const updatedProject = response.project;
      setLocalProject(updatedProject);

      // Notify parent component
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject);
      }

      // Show success toast
      toast.success(
        newCompletionStatus
          ? `Phase "${phase.name}" marked as complete!`
          : `Phase "${phase.name}" marked as incomplete`
      );

      // If marking as complete, show email modal
      if (newCompletionStatus) {
        const previousPhase = phaseIndex > 0 ? phases[phaseIndex - 1]?.name : undefined;
        setCompletedPhaseData({
          phaseName: phase.name,
          phaseIndex,
          previousPhase,
        });
        setEmailModalOpen(true);
      }
    } catch (error: any) {
      console.error("Error updating phase completion:", error);
      toast.error(error.message || "Failed to update phase");
    } finally {
      setUpdatingPhase(null);
    }
  };

  if (phases.length === 0) {
    return (
      <div className="space-y-[12px]">
        <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">
          No phases defined for this project.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-[12px]">
        {phases.map((phase: any, index: number) => {
          const isComplete = phase.isCompleted || false;
          const isUpdating = updatingPhase === index;
          const completionPercent = phase.completionPercent || (isComplete ? 100 : 0);
          const percentOfProject = totalPhases > 0 ? (1 / totalPhases) * 100 : 0;

          return (
            <div key={index} className="space-y-[6px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  {/* Clickable Checkbox */}
                  <button
                    onClick={() => handleTogglePhaseCompletion(index)}
                    disabled={isUpdating}
                    className="flex items-center justify-center w-[20px] h-[20px] rounded-full hover:bg-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isComplete ? "Mark as incomplete" : "Mark as complete"}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>

                  <span className={`font-['Roboto_Mono'] font-medium text-[11px] transition-colors ${
                    isComplete ? "text-success" : "text-foreground"
                  }`}>
                    {phase.name}
                  </span>

                  {isComplete && (
                    <span className="px-[8px] py-[2px] bg-success/10 text-success rounded-full text-[9px] font-['Roboto_Mono'] font-medium">
                      Completed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-[12px]">
                  <span className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground min-w-[40px] text-right">
                    {completionPercent}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-[6px] bg-muted rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                    isComplete ? "bg-success" : "bg-primary/20"
                  }`}
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              {/* Phase weight indicator */}
              <div className="flex items-center justify-between">
                <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">
                  {percentOfProject.toFixed(1)}% of project
                </span>
                {phase.days && (
                  <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">
                    {phase.days} days
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Progress Summary */}
      <div className="mt-[16px] pt-[16px] border-t border-border">
        <div className="flex items-center justify-between mb-[8px]">
          <span className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
            Overall Progress
          </span>
          <span className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
            {projectProgress}%
          </span>
        </div>
        <div className="relative h-[8px] bg-muted rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
            style={{ width: `${projectProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-[8px]">
          <span className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground">
            {completedPhases} of {totalPhases} phases completed
          </span>
        </div>
      </div>

      {/* Email Modal */}
      {completedPhaseData && (
        <PhaseCompletionEmailModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          projectName={localProject.title}
          projectLocation={localProject.location}
          phaseName={completedPhaseData.phaseName}
          previousPhase={completedPhaseData.previousPhase}
          clientEmail={clientEmail}
          projectId={localProject.id}
        />
      )}
    </>
  );
}
