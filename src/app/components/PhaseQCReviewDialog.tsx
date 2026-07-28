import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle, User, Calendar, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { type PhaseQCReview, type Project, type Task, useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface PhaseQCReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: PhaseQCReview;
  project: Project;
  phaseTasks: Task[];
}

interface TaskMetrics {
  speed: "fast" | "on-time" | "slow";
  corrections: "none" | "minor" | "major";
}

// Auto-calculate rating based on metrics
function calculateRating(metrics: TaskMetrics): number {
  let rating = 5;
  
  // Speed impact
  if (metrics.speed === "on-time") rating -= 0.5;
  else if (metrics.speed === "slow") rating -= 1.5;
  
  // Corrections impact
  if (metrics.corrections === "minor") rating -= 0.5;
  else if (metrics.corrections === "major") rating -= 1.5;
  
  return Math.max(1, Math.min(5, rating)); // Clamp between 1-5
}

export default function PhaseQCReviewDialog({
  open,
  onOpenChange,
  review,
  project,
  phaseTasks,
}: PhaseQCReviewDialogProps) {
  const { user } = useAuth();
  const { getTeamMember, updateTask } = useApp();
  const [feedback, setFeedback] = useState(review.feedback || "");
  const [notes, setNotes] = useState(review.notes || "");
  
  // Initialize task metrics and ratings
  const [taskMetrics, setTaskMetrics] = useState<Record<number, TaskMetrics>>(
    phaseTasks.reduce((acc, task) => {
      acc[task.id] = task.ratingMetrics || { speed: "on-time", corrections: "none" };
      return acc;
    }, {} as Record<number, TaskMetrics>)
  );

  const submitter = getTeamMember(review.submittedBy);
  
  // Calculate ratings based on metrics
  const taskRatings = Object.keys(taskMetrics).reduce((acc, taskId) => {
    const metrics = taskMetrics[Number(taskId)];
    acc[Number(taskId)] = calculateRating(metrics);
    return acc;
  }, {} as Record<number, number>);
  
  const updateTaskMetrics = (taskId: number, field: keyof TaskMetrics, value: string) => {
    setTaskMetrics({
      ...taskMetrics,
      [taskId]: {
        ...taskMetrics[taskId],
        [field]: value,
      },
    });
  };

  const handleApprove = async () => {
    // Update each task with its rating, metrics, and mark as Completed
    for (const task of phaseTasks) {
      const rating = taskRatings[task.id] || 5;
      const metrics = taskMetrics[task.id];
      await updateTask(task.id, {
        status: "Completed",
        rating,
        ratingMetrics: metrics,
        completedDate: new Date().toISOString(),
      });
    }

    // Save approval to localStorage
    const storedReviews = JSON.parse(localStorage.getItem('cstle_phase_qc_reviews') || '[]');
    const updatedReviews = storedReviews.map((r: PhaseQCReview) =>
      r.id === review.id
        ? {
            ...r,
            status: "Approved",
            reviewedBy: Number(user?.id) || 1,
            reviewedAt: new Date().toISOString(),
            feedback,
            notes,
            taskRatings, // Save task ratings with the review
          }
        : r
    );
    localStorage.setItem('cstle_phase_qc_reviews', JSON.stringify(updatedReviews));

    toast.success(`Phase "${review.phaseName}" has been approved! All tasks marked as Completed.`);
    onOpenChange(false);
    
    // Reload page to reflect changes
    window.location.reload();
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      toast.error("Please provide feedback for rejection");
      return;
    }

    // Update each task to Revision Required status
    for (const task of phaseTasks) {
      await updateTask(task.id, {
        status: "Revision Required",
        reviewFeedback: feedback,
      });
    }

    // Save rejection to localStorage
    const storedReviews = JSON.parse(localStorage.getItem('cstle_phase_qc_reviews') || '[]');
    const updatedReviews = storedReviews.map((r: PhaseQCReview) =>
      r.id === review.id
        ? {
            ...r,
            status: "Rejected",
            reviewedBy: Number(user?.id) || 1,
            reviewedAt: new Date().toISOString(),
            feedback,
            notes,
          }
        : r
    );
    localStorage.setItem('cstle_phase_qc_reviews', JSON.stringify(updatedReviews));

    toast.error(`Phase "${review.phaseName}" has been rejected. Tasks marked as Revision Required.`);
    onOpenChange(false);
    
    // Reload page to reflect changes
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-[24px] pt-[24px] pb-[16px] border-b border-border shrink-0">
          <DialogTitle className="font-['Roboto_Mono'] font-bold text-[14px]">
            QC Review: {review.phaseName}
          </DialogTitle>
          <DialogDescription className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
            Review and approve/reject phase completion for {project.title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-[24px] py-[20px]">
          <div className="space-y-[20px]">
          {/* Review Status Banner */}
          <div
            className={`p-[16px] rounded-[8px] border ${
              review.status === "Approved"
                ? "bg-success/10 border-success/20"
                : review.status === "Rejected"
                ? "bg-destructive/10 border-destructive/20"
                : "bg-warning/10 border-warning/20"
            }`}
          >
            <div className="flex items-center gap-[12px]">
              {review.status === "Approved" ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : review.status === "Rejected" ? (
                <XCircle className="w-5 h-5 text-destructive" />
              ) : (
                <AlertCircle className="w-5 h-5 text-warning" />
              )}
              <div>
                <p className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground">
                  {review.status === "Approved"
                    ? "Phase Approved"
                    : review.status === "Rejected"
                    ? "Phase Rejected"
                    : "Awaiting QC Review"}
                </p>
                <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                  {review.status === "Pending"
                    ? "This phase is ready for quality control review"
                    : `Reviewed ${review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString() : ""}`}
                </p>
              </div>
            </div>
          </div>

          {/* Project & Phase Info */}
          <div className="bg-card border border-border rounded-[8px] p-[16px]">
            <h4 className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground mb-[12px]">
              Phase Details
            </h4>
            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px]">
                  Project
                </p>
                <p className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                  {project.title}
                </p>
              </div>
              <div>
                <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px]">
                  Phase Name
                </p>
                <p className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                  {review.phaseName}
                </p>
              </div>
              <div>
                <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px]">
                  Tasks Completed
                </p>
                <p className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                  {review.tasksCompleted} / {review.tasksTotal}
                </p>
              </div>
              <div>
                <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px]">
                  Submitted By
                </p>
                <p className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                  {submitter?.name || "Unknown"}
                </p>
              </div>
              <div>
                <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px]">
                  Submitted On
                </p>
                <p className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                  {new Date(review.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px]">
                  Completion Rate
                </p>
                <p className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                  {Math.round((review.tasksCompleted / review.tasksTotal) * 100)}%
                </p>
              </div>
            </div>
          </div>

          {/* Task List with Metrics & Ratings */}
          <div className="bg-card border border-border rounded-[8px] p-[16px]">
            <h4 className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground mb-[12px]">
              Phase Tasks ({phaseTasks.length}) - Review Quality & Delivery
            </h4>
            <div className="space-y-[12px]">
              {phaseTasks.map((task) => {
                const assignee = getTeamMember(task.assignee);
                const metrics = taskMetrics[task.id] || { speed: "on-time", corrections: "none" };
                const calculatedRating = taskRatings[task.id] || 5;
                
                return (
                  <div
                    key={task.id}
                    className="p-[16px] bg-background rounded-[8px] border border-border"
                  >
                    {/* Task Header */}
                    <div className="flex items-start justify-between mb-[12px]">
                      <div className="flex items-center gap-[12px] flex-1">
                        {task.status === "Completed" || task.status === "Approved" ? (
                          <CheckCircle className="w-4 h-4 text-success shrink-0" />
                        ) : task.status === "Revision Required" ? (
                          <XCircle className="w-4 h-4 text-destructive shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                            {task.title}
                          </p>
                          <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                            Assigned to: {assignee?.name || "Unassigned"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-[12px] py-[4px] rounded-full text-[9px] font-['Roboto_Mono'] font-medium shrink-0 ${
                          task.status === "Completed" || task.status === "Approved"
                            ? "bg-success/10 text-success"
                            : task.status === "Revision Required"
                            ? "bg-destructive/10 text-destructive"
                            : task.status === "Ready for Review"
                            ? "bg-accent/10 text-accent-foreground"
                            : task.status === "Under Review"
                            ? "bg-primary/10 text-primary"
                            : task.status === "Needs Support"
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                    
                    {/* Metrics & Rating - Only show if reviewing */}
                    {review.status === "Pending" && (
                      <div className="space-y-[12px] pl-[28px]">
                        {/* Delivery Speed */}
                        <div>
                          <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[6px]">
                            Delivery Speed
                          </p>
                          <div className="flex gap-[8px]">
                            {(["fast", "on-time", "slow"] as const).map((speed) => (
                              <button
                                key={speed}
                                type="button"
                                onClick={() => updateTaskMetrics(task.id, "speed", speed)}
                                className={`px-[12px] py-[6px] rounded-[6px] font-['Roboto_Mono'] text-[10px] font-medium transition-all ${
                                  metrics.speed === speed
                                    ? speed === "fast"
                                      ? "bg-success text-white"
                                      : speed === "on-time"
                                      ? "bg-primary text-white"
                                      : "bg-warning text-white"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {speed === "fast" ? "Fast ⚡" : speed === "on-time" ? "On-Time ✓" : "Slow ⏱"}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Quality / Corrections */}
                        <div>
                          <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[6px]">
                            Quality / Corrections Needed
                          </p>
                          <div className="flex gap-[8px]">
                            {(["none", "minor", "major"] as const).map((corrections) => (
                              <button
                                key={corrections}
                                type="button"
                                onClick={() => updateTaskMetrics(task.id, "corrections", corrections)}
                                className={`px-[12px] py-[6px] rounded-[6px] font-['Roboto_Mono'] text-[10px] font-medium transition-all ${
                                  metrics.corrections === corrections
                                    ? corrections === "none"
                                      ? "bg-success text-white"
                                      : corrections === "minor"
                                      ? "bg-warning text-white"
                                      : "bg-destructive text-white"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {corrections === "none" ? "None ✓" : corrections === "minor" ? "Minor ⚠" : "Major ✕"}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Auto-calculated Rating */}
                        <div className="pt-[8px] border-t border-border">
                          <div className="flex items-center justify-between">
                            <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                              Auto-Calculated Rating
                            </p>
                            <div className="flex items-center gap-[6px]">
                              <div className="flex items-center gap-[2px]">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= calculatedRating
                                        ? "fill-warning text-warning"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground">
                                {calculatedRating.toFixed(1)}/5
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Show existing rating if already reviewed */}
                    {review.status !== "Pending" && task.rating && (
                      <div className="pl-[28px] space-y-[8px]">
                        {task.ratingMetrics && (
                          <div className="flex gap-[12px] text-[9px]">
                            <span className="font-['Roboto_Mono'] text-muted-foreground">
                              Speed: <span className="text-foreground font-medium">{task.ratingMetrics.speed}</span>
                            </span>
                            <span className="font-['Roboto_Mono'] text-muted-foreground">
                              Corrections: <span className="text-foreground font-medium">{task.ratingMetrics.corrections}</span>
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-[8px]">
                          <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                            Rated:
                          </p>
                          <div className="flex items-center gap-[4px]">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= (task.rating || 0)
                                    ? "fill-warning text-warning"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-['Roboto_Mono'] text-[10px] text-foreground ml-[4px]">
                            {task.rating}/5
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback Section */}
          {review.status === "Pending" && (
            <>
              <div>
                <Label htmlFor="feedback" className="text-[10px]">
                  Feedback {review.status === "Pending" && "(Required for rejection)"}
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Provide feedback on the phase completion quality..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="mt-[8px] min-h-[80px] text-[11px]"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-[10px]">
                  Internal Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any internal notes or observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-[8px] min-h-[60px] text-[11px]"
                />
              </div>
            </>
          )}

          {/* Previous Review Info */}
          {review.status !== "Pending" && (
            <div className="bg-card border border-border rounded-[8px] p-[16px]">
              <h4 className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground mb-[12px]">
                Review Details
              </h4>
              <div className="space-y-[12px]">
                <div>
                  <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px]">
                    Reviewed By
                  </p>
                  <p className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                    {review.reviewedBy ? getTeamMember(review.reviewedBy)?.name : "N/A"}
                  </p>
                </div>
                {review.feedback && (
                  <div>
                    <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px]">
                      Feedback
                    </p>
                    <p className="font-['Roboto_Mono'] text-[11px] text-foreground">
                      {review.feedback}
                    </p>
                  </div>
                )}
                {review.notes && (
                  <div>
                    <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[4px]">
                      Internal Notes
                    </p>
                    <p className="font-['Roboto_Mono'] text-[11px] text-foreground">
                      {review.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>
        </div>

        {/* Action Buttons - Sticky Footer */}
        {review.status === "Pending" && (
          <div className="px-[24px] py-[16px] border-t border-border shrink-0 bg-background">
            <div className="flex gap-[12px]">
              <button
                onClick={handleReject}
                className="flex-1 px-[16px] py-[10px] bg-destructive/10 border border-destructive/20 text-destructive rounded-[6px] hover:bg-destructive/20 transition-colors font-['Roboto_Mono'] font-medium text-[12px] flex items-center justify-center gap-[8px]"
              >
                <XCircle className="w-4 h-4" />
                Reject Phase
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 px-[16px] py-[10px] bg-success text-white rounded-[6px] hover:bg-success/90 transition-colors font-['Roboto_Mono'] font-medium text-[12px] flex items-center justify-center gap-[8px]"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Phase
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
