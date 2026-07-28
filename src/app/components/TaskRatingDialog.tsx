import { useState } from "react";
import { Star, Award, CheckCircle, Clock, AlertCircle, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { formatDate } from "../src/lib/dates";

interface TaskRatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: number;
    name: string;
    projectName: string;
    dueDate: string;
    completedDate: string;
  };
  teamMember: {
    id: number;
    name: string;
    role: string;
  };
  onSubmitRating: (taskId: number, memberId: number, rating: number, metrics: RatingMetrics, feedback: string) => void;
}

interface RatingMetrics {
  speed: "fast" | "on-time" | "slow";
  corrections: "none" | "minor" | "major";
  calculatedRating: number;
}

export default function TaskRatingDialog({
  isOpen,
  onClose,
  task,
  teamMember,
  onSubmitRating,
}: TaskRatingDialogProps) {
  const [speed, setSpeed] = useState<"fast" | "on-time" | "slow">("on-time");
  const [corrections, setCorrections] = useState<"none" | "minor" | "major">("none");
  const [feedback, setFeedback] = useState("");

  // Calculate rating based on metrics
  const calculateRating = (speedMetric: string, correctionMetric: string): number => {
    // Base rating from speed
    let rating = 3.0; // Default: on-time
    
    if (speedMetric === "fast") {
      rating = 4.5; // Fast delivery baseline
    } else if (speedMetric === "slow") {
      rating = 2.0; // Slow delivery baseline
    }
    
    // Adjust based on corrections
    if (correctionMetric === "none") {
      // No corrections: boost rating
      if (speedMetric === "fast") rating = 5.0;      // Fast + no corrections = Perfect
      if (speedMetric === "on-time") rating = 4.5;   // On-time + no corrections = Excellent
      if (speedMetric === "slow") rating = 3.5;      // Slow + no corrections = Good
    } else if (correctionMetric === "minor") {
      // Minor corrections: slight penalty
      if (speedMetric === "fast") rating = 4.0;      // Fast + minor corrections = Very Good
      if (speedMetric === "on-time") rating = 3.5;   // On-time + minor corrections = Good
      if (speedMetric === "slow") rating = 2.5;      // Slow + minor corrections = Fair
    } else if (correctionMetric === "major") {
      // Major corrections: significant penalty
      if (speedMetric === "fast") rating = 3.0;      // Fast + major corrections = Average
      if (speedMetric === "on-time") rating = 2.0;   // On-time + major corrections = Below Average
      if (speedMetric === "slow") rating = 1.0;      // Slow + major corrections = Poor
    }
    
    return Number(rating.toFixed(1));
  };

  const calculatedRating = calculateRating(speed, corrections);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-accent";
    if (rating >= 3.5) return "text-primary";
    if (rating >= 2.5) return "text-warning";
    return "text-destructive";
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.8) return "Exceptional";
    if (rating >= 4.5) return "Excellent";
    if (rating >= 4.0) return "Very Good";
    if (rating >= 3.5) return "Good";
    if (rating >= 3.0) return "Average";
    if (rating >= 2.0) return "Below Average";
    return "Needs Improvement";
  };

  const handleSubmit = () => {
    const metrics: RatingMetrics = {
      speed,
      corrections,
      calculatedRating,
    };
    onSubmitRating(task.id, teamMember.id, calculatedRating, metrics, feedback);
    setSpeed("on-time");
    setCorrections("none");
    setFeedback("");
    onClose();
  };

  // Calculate if task was delivered on time
  const dueDate = new Date(task.dueDate);
  const completedDate = new Date(task.completedDate);
  const daysEarly = Math.floor((dueDate.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[700px] bg-card border border-border rounded-[var(--radius-card)]">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Rate Task Completion
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-[8px]">
            Rate {teamMember.name}'s performance on this completed task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[24px] mt-[16px]">
          {/* Task & Team Member Info */}
          <div className="grid grid-cols-2 gap-[16px]">
            <div className="p-[16px] bg-secondary rounded-[8px]">
              <p className="text-muted-foreground mb-[8px]" style={{ fontSize: 'var(--text-small)' }}>
                Task Details
              </p>
              <h4 className="text-foreground mb-[4px]">
                {task.name}
              </h4>
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>
                {task.projectName}
              </p>
              <div className="flex items-center gap-[8px] mt-[12px]">
                <Clock className="w-[12px] h-[12px] text-muted-foreground" />
                <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                  Due: {formatDate(task.dueDate)}
                </p>
              </div>
              <div className="flex items-center gap-[8px] mt-[4px]">
                <CheckCircle className="w-[12px] h-[12px] text-success" />
                <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                  Done: {new Date(task.completedDate).toLocaleDateString()}
                </p>
              </div>
              {daysEarly !== 0 && (
                <Badge 
                  className="mt-[8px]" 
                  variant={daysEarly > 0 ? "default" : "destructive"}
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  {daysEarly > 0 ? `${daysEarly}d early` : `${Math.abs(daysEarly)}d late`}
                </Badge>
              )}
            </div>

            <div className="p-[16px] bg-secondary rounded-[8px]">
              <p className="text-muted-foreground mb-[8px]" style={{ fontSize: 'var(--text-small)' }}>
                Team Member
              </p>
              <div className="flex items-center gap-[12px]">
                <div className="w-[40px] h-[40px] rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-accent" style={{ fontSize: 'var(--text-base)' }}>
                    {teamMember.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <h4 className="text-foreground">
                    {teamMember.name}
                  </h4>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>
                    {teamMember.role}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Matrix Guide */}
          <div className="p-[16px] bg-gradient-to-r from-accent/5 to-primary/5 rounded-[8px] border border-accent/20">
            <div className="flex items-start gap-[12px] mb-[12px]">
              <Award className="w-[20px] h-[20px] text-accent shrink-0 mt-[2px]" />
              <div className="flex-1">
                <h4 className="text-foreground mb-[4px]">
                  Data-Driven Rating System
                </h4>
                <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                  Ratings are calculated based on delivery speed and quality metrics
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-[8px] text-center">
              <div className="p-[8px] bg-card rounded-[6px]">
                <p style={{ fontSize: 'var(--text-small)' }} className="text-accent">⚡ Fast + No Issues</p>
                <p style={{ fontSize: 'var(--text-small)' }} className="text-foreground mt-[4px]">★ 5.0</p>
              </div>
              <div className="p-[8px] bg-card rounded-[6px]">
                <p style={{ fontSize: 'var(--text-small)' }} className="text-primary">✓ On-time + Clean</p>
                <p style={{ fontSize: 'var(--text-small)' }} className="text-foreground mt-[4px]">★ 4.5</p>
              </div>
              <div className="p-[8px] bg-card rounded-[6px]">
                <p style={{ fontSize: 'var(--text-small)' }} className="text-destructive">⚠ Slow + Many Fixes</p>
                <p style={{ fontSize: 'var(--text-small)' }} className="text-foreground mt-[4px]">★ 1.0</p>
              </div>
            </div>
          </div>

          {/* Speed Metric */}
          <div className="space-y-[12px]">
            <Label className="text-foreground uppercase tracking-wider">
              Delivery Speed
            </Label>
            <div className="grid grid-cols-3 gap-[12px]">
              <button
                type="button"
                onClick={() => setSpeed("fast")}
                className={`p-[16px] rounded-[8px] border-2 transition-all ${
                  speed === "fast"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-secondary hover:border-accent/50"
                }`}
              >
                <div className="flex flex-col items-center gap-[8px]">
                  <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center ${
                    speed === "fast" ? "bg-accent text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    ⚡
                  </div>
                  <p className="text-foreground" style={{ fontSize: 'var(--text-label)' }}>Fast</p>
                  <p className="text-muted-foreground text-center" style={{ fontSize: 'var(--text-small)' }}>
                    Ahead of schedule
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSpeed("on-time")}
                className={`p-[16px] rounded-[8px] border-2 transition-all ${
                  speed === "on-time"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:border-primary/50"
                }`}
              >
                <div className="flex flex-col items-center gap-[8px]">
                  <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center ${
                    speed === "on-time" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    ✓
                  </div>
                  <p className="text-foreground" style={{ fontSize: 'var(--text-label)' }}>On-Time</p>
                  <p className="text-muted-foreground text-center" style={{ fontSize: 'var(--text-small)' }}>
                    Met deadline
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSpeed("slow")}
                className={`p-[16px] rounded-[8px] border-2 transition-all ${
                  speed === "slow"
                    ? "border-warning bg-warning/10"
                    : "border-border bg-secondary hover:border-warning/50"
                }`}
              >
                <div className="flex flex-col items-center gap-[8px]">
                  <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center ${
                    speed === "slow" ? "bg-warning text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    ⏱
                  </div>
                  <p className="text-foreground" style={{ fontSize: 'var(--text-label)' }}>Slow</p>
                  <p className="text-muted-foreground text-center" style={{ fontSize: 'var(--text-small)' }}>
                    Past deadline
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Quality Metric (Corrections) */}
          <div className="space-y-[12px]">
            <Label className="text-foreground uppercase tracking-wider">
              Quality & Corrections
            </Label>
            <div className="grid grid-cols-3 gap-[12px]">
              <button
                type="button"
                onClick={() => setCorrections("none")}
                className={`p-[16px] rounded-[8px] border-2 transition-all ${
                  corrections === "none"
                    ? "border-accent bg-accent/10"
                    : "border-border bg-secondary hover:border-accent/50"
                }`}
              >
                <div className="flex flex-col items-center gap-[8px]">
                  <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center ${
                    corrections === "none" ? "bg-accent text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    ✓
                  </div>
                  <p className="text-foreground" style={{ fontSize: 'var(--text-label)' }}>No Corrections</p>
                  <p className="text-muted-foreground text-center" style={{ fontSize: 'var(--text-small)' }}>
                    Perfect quality
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCorrections("minor")}
                className={`p-[16px] rounded-[8px] border-2 transition-all ${
                  corrections === "minor"
                    ? "border-warning bg-warning/10"
                    : "border-border bg-secondary hover:border-warning/50"
                }`}
              >
                <div className="flex flex-col items-center gap-[8px]">
                  <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center ${
                    corrections === "minor" ? "bg-warning text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    ⚠
                  </div>
                  <p className="text-foreground" style={{ fontSize: 'var(--text-label)' }}>Minor Corrections</p>
                  <p className="text-muted-foreground text-center" style={{ fontSize: 'var(--text-small)' }}>
                    Small fixes needed
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCorrections("major")}
                className={`p-[16px] rounded-[8px] border-2 transition-all ${
                  corrections === "major"
                    ? "border-destructive bg-destructive/10"
                    : "border-border bg-secondary hover:border-destructive/50"
                }`}
              >
                <div className="flex flex-col items-center gap-[8px]">
                  <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center ${
                    corrections === "major" ? "bg-destructive text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    ✕
                  </div>
                  <p className="text-foreground" style={{ fontSize: 'var(--text-label)' }}>Major Corrections</p>
                  <p className="text-muted-foreground text-center" style={{ fontSize: 'var(--text-small)' }}>
                    Significant rework
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Calculated Rating Preview */}
          <div className="p-[20px] bg-gradient-to-r from-accent/10 to-primary/10 rounded-[12px] border-2 border-accent/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground mb-[8px]" style={{ fontSize: 'var(--text-small)' }}>
                  Calculated Task Rating
                </p>
                <div className="flex items-center gap-[12px]">
                  <div className="flex items-center gap-[4px]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-[20px] h-[20px] ${
                          i < Math.floor(calculatedRating)
                            ? "fill-accent text-accent"
                            : i < calculatedRating
                            ? "fill-accent/50 text-accent"
                            : "fill-none text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`${getRatingColor(calculatedRating)}`} style={{ fontSize: 'var(--text-h2)' }}>
                    {calculatedRating.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <Badge className={getRatingColor(calculatedRating)}>
                  {getRatingLabel(calculatedRating)}
                </Badge>
                <p className="text-muted-foreground mt-[8px]" style={{ fontSize: 'var(--text-small)' }}>
                  {speed.charAt(0).toUpperCase() + speed.slice(1)} delivery + {corrections} corrections
                </p>
              </div>
            </div>
          </div>

          {/* Additional Feedback */}
          <div className="space-y-[8px]">
            <Label htmlFor="feedback" className="text-foreground uppercase tracking-wider">
              Additional Comments (Optional)
            </Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide specific feedback about the work quality, communication, or areas for improvement..."
              rows={3}
              className="resize-none"
            />
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
              This feedback helps team members understand their performance
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-[12px] justify-end pt-[16px] border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-[16px] py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-[8px] px-[16px] py-[8px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity"
            >
              <Save className="w-[14px] h-[14px]" />
              Submit Rating
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
