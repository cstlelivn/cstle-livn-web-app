import type { Task, Project, PhaseWithDuration, PhaseQCReview } from "../components/AppContext";

export interface PhaseCompletion {
  name: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  percentOfProject: number; // % rate based on days
  contributionToProject: number; // actual contribution to overall project %
  qcStatus?: "Pending" | "Approved" | "Rejected" | "NotRequired"; // QC review status
  qcReviewId?: number; // ID of the QC review if exists
}

/**
 * Get QC review for a specific phase
 */
function getPhaseQCReview(projectId: number, phaseName: string): PhaseQCReview | null {
  const storedReviews = localStorage.getItem('cstle_phase_qc_reviews');
  if (!storedReviews) return null;
  
  const reviews: PhaseQCReview[] = JSON.parse(storedReviews);
  // Get the most recent review for this phase
  const phaseReviews = reviews.filter(r => r.projectId === projectId && r.phaseName === phaseName);
  if (phaseReviews.length === 0) return null;
  
  // Sort by submission date and return the most recent
  return phaseReviews.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
}

/**
 * Check if a phase should be submitted for QC review
 */
export function shouldSubmitPhaseForQC(
  projectId: number,
  phaseName: string,
  tasks: Task[]
): boolean {
  const phaseTasks = tasks.filter(t => t.projectId === projectId && t.phase === phaseName);
  
  if (phaseTasks.length === 0) return false;
  
  // Check if all tasks are ready for review or completed
  const allTasksReadyOrCompleted = phaseTasks.every(t => 
    t.status === "Ready for Review" || 
    t.status === "Completed" || 
    t.status === "Approved"
  );
  
  if (!allTasksReadyOrCompleted) return false;
  
  // Check if there's already a QC review
  const existingReview = getPhaseQCReview(projectId, phaseName);
  
  // Submit for QC if no review exists or if the last review was rejected
  return !existingReview || existingReview.status === "Rejected";
}

/**
 * Create a new phase QC review
 */
export function createPhaseQCReview(
  projectId: number,
  phaseName: string,
  tasks: Task[],
  submittedBy: number
): PhaseQCReview {
  const phaseTasks = tasks.filter(t => t.projectId === projectId && t.phase === phaseName);
  const readyTasks = phaseTasks.filter(t => 
    t.status === "Ready for Review" || 
    t.status === "Completed" || 
    t.status === "Approved"
  ).length;
  
  const newReview: PhaseQCReview = {
    id: Date.now(),
    projectId,
    phaseName,
    status: "Pending",
    submittedBy,
    submittedAt: new Date().toISOString(),
    tasksCompleted: readyTasks,
    tasksTotal: phaseTasks.length,
  };
  
  // Save to localStorage
  const storedReviews = localStorage.getItem('cstle_phase_qc_reviews');
  const reviews: PhaseQCReview[] = storedReviews ? JSON.parse(storedReviews) : [];
  reviews.push(newReview);
  localStorage.setItem('cstle_phase_qc_reviews', JSON.stringify(reviews));
  
  return newReview;
}

/**
 * Calculate completion status for all phases in a project based on tasks AND QC reviews
 */
export function calculatePhaseCompletions(
  project: Project,
  tasks: Task[]
): PhaseCompletion[] {
  if (!project.phases || project.phases.length === 0) {
    return [];
  }

  const totalProjectDays = project.phases.reduce((sum, phase) => sum + phase.days, 0);
  const projectTasks = tasks.filter(t => t.projectId === project.id);

  return project.phases.map((phase) => {
    // Get tasks for this phase
    const phaseTasks = projectTasks.filter(t => t.phase === phase.name);
    const totalTasks = phaseTasks.length;
    const completedTasks = phaseTasks.filter(t => t.status === "Completed" || t.status === "Approved").length;
    const readyForReview = phaseTasks.filter(t => t.status === "Ready for Review").length;
    const revisionRequired = phaseTasks.filter(t => t.status === "Revision Required").length;
    
    // Get QC review status
    const qcReview = getPhaseQCReview(project.id, phase.name);
    let qcStatus: "Pending" | "Approved" | "Rejected" | "NotRequired" = "NotRequired";
    let qcReviewId: number | undefined;
    
    if (qcReview) {
      qcStatus = qcReview.status;
      qcReviewId = qcReview.id;
    }
    
    // Calculate phase completion percentage
    // A phase is only 100% complete if:
    // 1. All tasks are completed/approved
    // 2. QC review is approved (if QC review exists)
    let completionPercentage = 0;
    
    if (totalTasks > 0) {
      const taskCompletionRate = (completedTasks / totalTasks) * 100;
      const readyRate = (readyForReview / totalTasks) * 100;
      
      if (taskCompletionRate === 100) {
        // All tasks approved/completed
        if (qcStatus === "Approved") {
          completionPercentage = 100; // Phase fully complete
        } else {
          completionPercentage = 100; // Tasks complete
        }
      } else if ((completedTasks + readyForReview) === totalTasks) {
        // All tasks either completed or ready for review
        if (qcStatus === "Approved") {
          completionPercentage = 100; // Phase fully complete
        } else if (qcStatus === "Pending") {
          completionPercentage = 95; // Awaiting QC approval
        } else if (qcStatus === "Rejected") {
          completionPercentage = 90; // QC rejected, needs rework
        } else {
          // No QC review yet - should submit for QC
          completionPercentage = 95;
        }
      } else {
        // Not all tasks complete yet - calculate based on actual completion
        const inProgressCount = phaseTasks.filter(t => 
          t.status === "In Progress" || 
          t.status === "Needs Support" || 
          t.status === "Under Review"
        ).length;
        const baseProgress = ((completedTasks + (readyForReview * 0.95) + (inProgressCount * 0.5)) / totalTasks) * 100;
        completionPercentage = Math.min(90, baseProgress); // Cap at 90% until all tasks ready
      }
    }
    
    // Calculate phase's weight in the overall project (based on days)
    const percentOfProject = totalProjectDays > 0 ? (phase.days / totalProjectDays) * 100 : 0;
    
    // Calculate this phase's contribution to overall project progress
    const contributionToProject = (percentOfProject / 100) * completionPercentage;

    return {
      name: phase.name,
      totalTasks,
      completedTasks,
      completionPercentage,
      percentOfProject,
      contributionToProject,
      qcStatus,
      qcReviewId,
    };
  });
}

/**
 * Calculate overall project progress based on phase completions
 */
export function calculateProjectProgress(
  project: Project,
  tasks: Task[]
): number {
  const phaseCompletions = calculatePhaseCompletions(project, tasks);
  
  if (phaseCompletions.length === 0) {
    return 0;
  }

  // Sum up all phase contributions
  const totalProgress = phaseCompletions.reduce(
    (sum, phase) => sum + phase.contributionToProject,
    0
  );

  return Math.round(totalProgress);
}

/**
 * Get the current active phase based on completion
 */
export function getCurrentPhase(
  project: Project,
  tasks: Task[]
): string {
  const phaseCompletions = calculatePhaseCompletions(project, tasks);
  
  if (phaseCompletions.length === 0) {
    return project.phase || "Planning";
  }

  // Find the first incomplete phase
  const currentPhase = phaseCompletions.find(p => p.completionPercentage < 100);
  
  // If all phases are complete, return the last phase
  if (!currentPhase) {
    return phaseCompletions[phaseCompletions.length - 1].name;
  }

  return currentPhase.name;
}