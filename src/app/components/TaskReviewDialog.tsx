import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Star, Clock, MessageSquare, User, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import type { Task } from "./AppContext";

interface TaskReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  projectName?: string;
  teamMember: {
    id: number;
    name: string;
    role: string;
  };
  onApprove: (taskId: number, rating: number, metrics: RatingMetrics, feedback: string) => void;
  onReject: (taskId: number, feedback: string) => void;
}

interface RatingMetrics {
  speed: "fast" | "on-time" | "slow";
  corrections: "none" | "minor" | "major";
  calculatedRating: number;
}

export default function TaskReviewDialog({
  isOpen,
  onClose,
  task,
  projectName,
  teamMember,
  onApprove,
  onReject,
}: TaskReviewDialogProps) {
  const [step, setStep] = useState<"review" | "rate">("review");
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  
  // Rating state
  const [speed, setSpeed] = useState<"fast" | "on-time" | "slow" | null>(null);
  const [corrections, setCorrections] = useState<"none" | "minor" | "major" | null>(null);
  const [additionalComments, setAdditionalComments] = useState("");

  // Calculate rating based on speed and corrections
  const calculateRating = (
    speedValue: "fast" | "on-time" | "slow",
    correctionsValue: "none" | "minor" | "major"
  ): number => {
    let rating = 5.0;
    
    // Speed impact
    if (speedValue === "on-time") rating -= 0.5;
    else if (speedValue === "slow") rating -= 1.5;
    
    // Corrections impact
    if (correctionsValue === "minor") rating -= 1.0;
    else if (correctionsValue === "major") rating -= 2.0;
    
    return Math.max(0, Math.min(5, rating));
  };

  const currentRating = speed && corrections ? calculateRating(speed, corrections) : 0;

  const handleApproveClick = () => {
    setStep("rate");
  };

  const handleRequestChanges = () => {
    setShowRejectInput(true);
  };

  const handleSubmitRejection = () => {
    if (rejectFeedback.trim()) {
      onReject(task.id, rejectFeedback);
      resetDialog();
    }
  };

  const handleSubmitRating = () => {
    if (speed && corrections) {
      const rating = calculateRating(speed, corrections);
      onApprove(
        task.id,
        rating,
        { speed, corrections, calculatedRating: rating },
        additionalComments
      );
      resetDialog();
    }
  };

  const resetDialog = () => {
    setStep("review");
    setShowRejectInput(false);
    setRejectFeedback("");
    setSpeed(null);
    setCorrections(null);
    setAdditionalComments("");
    onClose();
  };

  if (!task) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetDialog}>
      <DialogContent className="max-w-[640px] bg-card border border-border rounded-[var(--radius-card)] max-h-[90vh] overflow-y-auto">
        {step === "review" ? (
          <>
            {/* Step 1: Review Task */}
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Quality Control Review
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-[8px]">
                Review and rate this completed task
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-[24px] mt-[16px]">
              {/* Task Status Banner */}
              <div className="p-[16px] bg-warning/10 border border-warning/20 rounded-[8px] flex items-start gap-[12px]">
                <AlertCircle className="w-[20px] h-[20px] text-warning shrink-0 mt-[2px]" />
                <div>
                  <p className="text-foreground font-['Roboto_Mono'] font-bold text-[12px]">
                    Task Awaiting QC Review
                  </p>
                  <p className="text-muted-foreground mt-[4px] font-['Roboto_Mono'] text-[11px]">
                    Task was marked as complete by {teamMember.name}. Approve quality control approval.
                  </p>
                </div>
              </div>

              {/* Task Details */}
              <div className="space-y-[16px]">
                <div>
                  <Label className="text-muted-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[10px]">
                    Task Name
                  </Label>
                  <h4 className="text-foreground mt-[4px] font-['Roboto_Mono'] font-bold text-[14px]">
                    {task.title}
                  </h4>
                </div>

                {task.description && (
                  <div>
                    <Label className="text-muted-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[10px]">
                      Description
                    </Label>
                    <p className="text-foreground mt-[4px] font-['Roboto_Mono'] text-[12px]">
                      {task.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-[16px]">
                  <div>
                    <Label className="text-muted-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[10px]">
                      Project
                    </Label>
                    <p className="text-foreground mt-[4px] font-['Roboto_Mono'] font-bold text-[12px]">
                      {projectName || "Unknown Project"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[10px]">
                      Phase
                    </Label>
                    <p className="text-foreground mt-[4px] font-['Roboto_Mono'] font-bold text-[12px]">
                      {task.phase || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[16px]">
                  <div>
                    <Label className="text-muted-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[10px]">
                      Assigned To
                    </Label>
                    <div className="flex items-center gap-[8px] mt-[4px]">
                      <div className="w-[32px] h-[32px] rounded-full bg-accent/10 flex items-center justify-center">
                        <span className="text-accent font-['Roboto_Mono'] text-[11px] font-medium">
                          {teamMember.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="text-foreground font-['Roboto_Mono'] text-[12px]">
                          {teamMember.name}
                        </p>
                        <p className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                          {teamMember.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[10px]">
                      Due Date
                    </Label>
                    <div className="flex items-center gap-[8px] mt-[4px]">
                      <Calendar className="w-[14px] h-[14px] text-muted-foreground" />
                      <p className="text-foreground font-['Roboto_Mono'] text-[12px]">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[16px]">
                  <div>
                    <Label className="text-muted-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[10px]">
                      Priority
                    </Label>
                    <Badge className="mt-[4px] font-['Roboto_Mono'] text-[10px]">
                      {task.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[10px]">
                      Progress
                    </Label>
                    <p className="text-foreground mt-[4px] font-['Roboto_Mono'] text-[12px]">
                      {task.progress}%
                    </p>
                  </div>
                </div>
              </div>

              {/* QC Guidelines */}
              <div className="p-[16px] bg-secondary rounded-[8px]">
                <div className="flex items-start gap-[12px]">
                  <input
                    type="checkbox"
                    id="qc-guidelines"
                    className="mt-[2px] w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="qc-guidelines" className="flex-1">
                    <h4 className="text-foreground font-['Roboto_Mono'] font-bold text-[12px] mb-[4px]">
                      Quality Control Guidelines
                    </h4>
                    <p className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                      I have reviewed this task and will decide whether to:
                    </p>
                    <ul className="mt-[8px] space-y-[4px] ml-[4px]">
                      <li className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                        <strong className="text-foreground">Approve:</strong> Task meets quality standards - Rate the performance
                      </li>
                      <li className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                        <strong className="text-foreground">Request Changes:</strong> Task work corrections - Send back with feedback
                      </li>
                    </ul>
                  </label>
                </div>
              </div>

              {/* Reject Feedback Section */}
              {showRejectInput && (
                <div className="space-y-[12px] p-[16px] bg-destructive/5 border border-destructive/20 rounded-[8px]">
                  <Label htmlFor="reject-feedback" className="text-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[10px]">
                    Feedback for Changes Needed
                  </Label>
                  <Textarea
                    id="reject-feedback"
                    value={rejectFeedback}
                    onChange={(e) => setRejectFeedback(e.target.value)}
                    placeholder="Explain what needs to be corrected or improved..."
                    rows={4}
                    className="resize-none font-['Roboto_Mono'] text-[11px]"
                  />
                  <p className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                    This feedback will be sent to {teamMember.name} so they can make the necessary corrections
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-[12px] justify-end pt-[16px] border-t border-border">
                <button
                  type="button"
                  onClick={resetDialog}
                  className="px-[16px] py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors text-foreground font-['Roboto_Mono'] text-[11px]"
                >
                  Cancel
                </button>
                
                {!showRejectInput ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRequestChanges}
                      className="flex items-center gap-[8px] px-[16px] py-[8px] bg-transparent border border-destructive/40 text-destructive rounded-[6px] hover:bg-destructive/5 transition-colors font-['Roboto_Mono'] text-[11px]"
                    >
                      <XCircle className="w-[14px] h-[14px]" />
                      Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleApproveClick}
                      className="flex items-center gap-[8px] px-[16px] py-[8px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] text-[11px]"
                      style={{ backgroundColor: "var(--accent)" }}
                    >
                      <CheckCircle className="w-[14px] h-[14px]" />
                      Approve & Rate
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectInput(false);
                        setRejectFeedback("");
                      }}
                      className="px-[16px] py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors text-foreground font-['Roboto_Mono'] text-[11px]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitRejection}
                      disabled={!rejectFeedback.trim()}
                      className="flex items-center gap-[8px] px-[16px] py-[8px] bg-destructive text-white rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-['Roboto_Mono'] text-[11px]"
                    >
                      <XCircle className="w-[14px] h-[14px]" />
                      Send Back for Corrections
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Rate Task */}
            <DialogHeader>
              <DialogTitle className="text-foreground font-['Roboto_Mono']">
                {task.title}
              </DialogTitle>
              <div className="flex items-center gap-[8px] mt-[8px]">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                  Due {new Date(task.dueDate).toLocaleDateString()}
                </span>
                <span className="px-[8px] py-[2px] bg-muted/30 rounded font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                  14 days
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-[24px] mt-[16px]">
              {/* Team Member Card */}
              <div className="flex items-center justify-between p-[16px] bg-secondary rounded-[8px]">
                <div className="flex items-center gap-[12px]">
                  <div className="w-[40px] h-[40px] rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-accent font-['Roboto_Mono'] text-[14px] font-medium">
                      {teamMember.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-foreground font-['Roboto_Mono'] font-bold text-[14px]">
                      {teamMember.name}
                    </p>
                    <p className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                      {teamMember.role}
                    </p>
                  </div>
                </div>
              </div>

              {/* Data-Driven Rating System */}
              <div className="p-[16px] bg-accent/5 border border-accent/20 rounded-[8px]">
                <div className="flex items-center gap-[8px] mb-[8px]">
                  <AlertCircle className="w-4 h-4 text-accent" />
                  <h4 className="text-foreground font-['Roboto_Mono'] font-bold text-[12px]">
                    Data-Driven Rating System
                  </h4>
                </div>
                <p className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                  Rating is calculated based on both delivery metrics and quality metrics to provide a fair and objective performance assessment.
                </p>
              </div>

              {/* Delivery Speed */}
              <div>
                <Label className="text-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[11px] font-bold mb-[12px] block">
                  DELIVERY SPEED
                </Label>
                <div className="grid grid-cols-3 gap-[12px]">
                  {[
                    { value: "fast" as const, label: "Fast", desc: "Ahead of deadline" },
                    { value: "on-time" as const, label: "On-Time", desc: "Met deadline" },
                    { value: "slow" as const, label: "Slow", desc: "Past deadline" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSpeed(option.value)}
                      className={`p-[16px] rounded-[8px] border-2 transition-all text-center ${
                        speed === option.value
                          ? "border-accent bg-accent/5"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      <div className={`w-[40px] h-[40px] mx-auto mb-[8px] rounded-full flex items-center justify-center ${
                        speed === option.value ? "bg-accent" : "bg-muted"
                      }`}>
                        <CheckCircle className={`w-5 h-5 ${speed === option.value ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <p className="text-foreground font-['Roboto_Mono'] font-bold text-[12px] mb-[4px]">
                        {option.label}
                      </p>
                      <p className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                        {option.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality & Corrections */}
              <div>
                <Label className="text-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[11px] font-bold mb-[12px] block">
                  QUALITY & CORRECTIONS
                </Label>
                <div className="grid grid-cols-3 gap-[12px]">
                  {[
                    { value: "none" as const, label: "No Corrections", desc: "Perfect quality" },
                    { value: "minor" as const, label: "Minor Corrections", desc: "Small fixes needed" },
                    { value: "major" as const, label: "Major Corrections", desc: "Significant rework" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setCorrections(option.value)}
                      className={`p-[16px] rounded-[8px] border-2 transition-all text-center ${
                        corrections === option.value
                          ? "border-accent bg-accent/5"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      <div className={`w-[40px] h-[40px] mx-auto mb-[8px] rounded-full flex items-center justify-center ${
                        corrections === option.value ? "bg-accent" : "bg-muted"
                      }`}>
                        <CheckCircle className={`w-5 h-5 ${corrections === option.value ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <p className="text-foreground font-['Roboto_Mono'] font-bold text-[12px] mb-[4px]">
                        {option.label}
                      </p>
                      <p className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                        {option.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Rating */}
              {speed && corrections && (
                <div className="p-[16px] bg-secondary rounded-[8px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[12px]">
                      <div className="flex items-center gap-[4px]">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className="w-5 h-5"
                            fill={star <= currentRating ? "#748B7B" : "none"}
                            stroke="#748B7B"
                          />
                        ))}
                      </div>
                      <span className="text-foreground font-['Roboto_Mono'] font-bold text-[24px]">
                        {currentRating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                      Calculated Task Rating<br />
                      In-line ratings & other calculations
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Comments */}
              <div>
                <Label htmlFor="comments" className="text-foreground uppercase tracking-wider font-['Roboto_Mono'] text-[11px] font-bold mb-[8px] block">
                  ADDITIONAL COMMENTS (OPTIONAL)
                </Label>
                <Textarea
                  id="comments"
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  placeholder="Provide specific feedback about the work quality, communication, or areas for improvement..."
                  rows={4}
                  className="resize-none font-['Roboto_Mono'] text-[11px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-[12px] justify-end pt-[16px] border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="px-[16px] py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors text-foreground font-['Roboto_Mono'] text-[11px]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRating}
                  disabled={!speed || !corrections}
                  className="flex items-center gap-[8px] px-[16px] py-[8px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-['Roboto_Mono'] text-[11px]"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  <CheckCircle className="w-[14px] h-[14px]" />
                  Submit Rating
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
