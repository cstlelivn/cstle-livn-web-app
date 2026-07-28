import { Star, Award, Clock, AlertCircle, CheckCircle, TrendingUp, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Card } from "./ui/card";

interface TaskRating {
  taskId: number;
  taskName: string;
  projectName: string;
  rating: number;
  speed: "fast" | "on-time" | "slow";
  corrections: "none" | "minor" | "major";
  feedback: string;
  ratedBy: string;
  ratedAt: string;
}

interface RatingHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teamMember: {
    id: number;
    name: string;
    role: string;
    rating: number;
  };
  taskRatings: TaskRating[];
}

export default function RatingHistoryDialog({
  isOpen,
  onClose,
  teamMember,
  taskRatings,
}: RatingHistoryDialogProps) {
  const getAuraLevel = (stars: number) => {
    if (stars >= 4.8) return { level: "Legendary", color: "text-accent", points: 500 };
    if (stars >= 4.5) return { level: "Master", color: "text-primary", points: 400 };
    if (stars >= 4.0) return { level: "Expert", color: "text-primary", points: 300 };
    if (stars >= 3.5) return { level: "Professional", color: "text-muted-foreground", points: 200 };
    if (stars >= 3.0) return { level: "Skilled", color: "text-muted-foreground", points: 100 };
    return { level: "Developing", color: "text-muted-foreground", points: 50 };
  };

  const aura = getAuraLevel(teamMember.rating);

  const getSpeedBadge = (speed: string) => {
    if (speed === "fast") return { label: "⚡ Fast", color: "bg-accent/10 text-accent" };
    if (speed === "on-time") return { label: "✓ On-Time", color: "bg-primary/10 text-primary" };
    return { label: "⏱ Slow", color: "bg-warning/10 text-warning" };
  };

  const getCorrectionsBadge = (corrections: string) => {
    if (corrections === "none") return { label: "✓ No Corrections", color: "bg-accent/10 text-accent" };
    if (corrections === "minor") return { label: "⚠ Minor Fixes", color: "bg-warning/10 text-warning" };
    return { label: "✕ Major Rework", color: "bg-destructive/10 text-destructive" };
  };

  // Calculate performance metrics
  const totalRatings = taskRatings.length;
  const averageRating = totalRatings > 0 
    ? taskRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
    : 0;
  const fiveStarCount = taskRatings.filter(r => r.rating === 5.0).length;
  const fastDeliveries = taskRatings.filter(r => r.speed === "fast").length;
  const noCorrections = taskRatings.filter(r => r.corrections === "none").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto bg-card border border-border rounded-[var(--radius-card)]">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Performance History
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-[8px]">
            Detailed task-by-task ratings for {teamMember.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[24px] mt-[16px]">
          {/* Overall Performance Summary */}
          <div className="grid grid-cols-2 gap-[16px]">
            <Card className="p-[20px] bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20">
              <div className="flex items-center gap-[12px] mb-[12px]">
                <div className="w-[48px] h-[48px] rounded-full bg-accent/10 flex items-center justify-center">
                  <Award className="w-[24px] h-[24px] text-accent" />
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                    Current Aura Level
                  </p>
                  <h3 className={`${aura.color}`}>
                    {aura.level}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-[8px] mb-[8px]">
                <div className="flex items-center gap-[4px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-[16px] h-[16px] ${
                        i < Math.floor(teamMember.rating)
                          ? "fill-accent text-accent"
                          : "fill-none text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-foreground" style={{ fontSize: 'var(--text-h3)' }}>
                  {teamMember.rating.toFixed(1)}
                </span>
              </div>
              <Progress value={(aura.points / 500) * 100} className="h-[8px] mb-[8px]" />
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                {aura.points} Aura Points from {totalRatings} rated tasks
              </p>
            </Card>

            <Card className="p-[20px]">
              <p className="text-muted-foreground mb-[16px]" style={{ fontSize: 'var(--text-small)' }}>
                Performance Metrics
              </p>
              <div className="grid grid-cols-2 gap-[12px]">
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                    5★ Tasks
                  </p>
                  <p className="text-foreground" style={{ fontSize: 'var(--text-h3)' }}>
                    {fiveStarCount}/{totalRatings}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                    Fast Delivery
                  </p>
                  <p className="text-foreground" style={{ fontSize: 'var(--text-h3)' }}>
                    {fastDeliveries}/{totalRatings}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                    No Corrections
                  </p>
                  <p className="text-foreground" style={{ fontSize: 'var(--text-h3)' }}>
                    {noCorrections}/{totalRatings}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                    Avg Rating
                  </p>
                  <p className="text-foreground" style={{ fontSize: 'var(--text-h3)' }}>
                    {averageRating.toFixed(1)}★
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Task Ratings List */}
          <div className="space-y-[12px]">
            <h4 className="text-foreground">Task Rating History</h4>
            {taskRatings.length === 0 ? (
              <Card className="p-[24px] text-center">
                <div className="w-[64px] h-[64px] rounded-full bg-muted mx-auto mb-[16px] flex items-center justify-center">
                  <Star className="w-[32px] h-[32px] text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No task ratings yet. Complete and rate tasks to build performance history.
                </p>
              </Card>
            ) : (
              <div className="space-y-[12px]">
                {[...taskRatings].reverse().map((rating, index) => {
                  const speedBadge = getSpeedBadge(rating.speed);
                  const correctionsBadge = getCorrectionsBadge(rating.corrections);
                  
                  return (
                    <Card key={rating.taskId} className="p-[16px]">
                      <div className="flex items-start justify-between mb-[12px]">
                        <div className="flex-1">
                          <h4 className="text-foreground mb-[4px]">
                            {rating.taskName}
                          </h4>
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--text-label)' }}>
                            {rating.projectName}
                          </p>
                        </div>
                        <div className="flex items-center gap-[4px]">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-[16px] h-[16px] ${
                                i < Math.floor(rating.rating)
                                  ? "fill-accent text-accent"
                                  : "fill-none text-muted-foreground"
                              }`}
                            />
                          ))}
                          <span className="text-foreground ml-[4px]" style={{ fontSize: 'var(--text-base)' }}>
                            {rating.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-[8px] mb-[12px]">
                        <Badge className={speedBadge.color} style={{ fontSize: 'var(--text-small)' }}>
                          {speedBadge.label}
                        </Badge>
                        <Badge className={correctionsBadge.color} style={{ fontSize: 'var(--text-small)' }}>
                          {correctionsBadge.label}
                        </Badge>
                      </div>

                      {rating.feedback && (
                        <div className="p-[12px] bg-secondary rounded-[6px] mb-[12px]">
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                            <strong>Feedback:</strong> {rating.feedback}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-muted-foreground" style={{ fontSize: 'var(--text-small)' }}>
                        <span>Rated by {rating.ratedBy}</span>
                        <div className="flex items-center gap-[4px]">
                          <Calendar className="w-[12px] h-[12px]" />
                          <span>{new Date(rating.ratedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-[16px] border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-[16px] py-[8px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
