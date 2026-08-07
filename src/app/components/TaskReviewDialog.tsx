import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Star, Clock, MessageSquare, User, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import type { Task } from "./AppContext";
import { listSessionsForTask, reviewTaskDelay, type WorkSession } from '../src/features/workSessions/api';
import { toast } from 'sonner';
import TaskActivityFeed from './TaskActivityFeed';
import TaskMediaEvidence from './TaskMediaEvidence';

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
  teamMembers: Array<{ id: string; name: string }>;
  onApprove: (taskId: number, rating: number, metrics: RatingMetrics, feedback: string, completionAttribution?: CompletionAttribution) => void;
  onReject: (taskId: number, feedback: string, completionAttribution?: CompletionAttribution) => void;
}

interface CompletionAttribution { teamMemberId?: string; externalName?: string }

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
  teamMembers,
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
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [sessionsLoadFailed, setSessionsLoadFailed] = useState(false);
  const [manualCompleter, setManualCompleter] = useState("");
  const [externalCompleter, setExternalCompleter] = useState("");
  const [confirmedBestInterest, setConfirmedBestInterest] = useState(false);

  useEffect(() => {
    if (!isOpen || !task?.id) return;
    setSessionsLoaded(false);
    setSessionsLoadFailed(false);
    listSessionsForTask(String(task.id)).then(setSessions).catch(() => setSessionsLoadFailed(true)).finally(() => setSessionsLoaded(true));
  }, [isOpen, task?.id]);

  const decideDelay = async (session: WorkSession, approved: boolean) => {
    try {
      const updated = await reviewTaskDelay(session.id, approved);
      setSessions((rows) => rows.map((row) => row.id === session.id ? updated : row));
      toast.success(approved ? 'Delay approved' : 'Delay declined');
    } catch (error: any) { toast.error(error?.message || 'Could not review delay'); }
  };

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
  const finishedSessions = sessions.filter((session) => session.status === 'finished');
  const finishedContributorNames = Array.from(new Set(finishedSessions.map((session) => teamMembers.find((member) => member.id === session.teamMemberId)?.name).filter(Boolean))) as string[];
  const needsManualCompleter = sessionsLoaded && !sessionsLoadFailed && finishedSessions.length === 0;
  const completionAttribution = (): CompletionAttribution | undefined => {
    if (!needsManualCompleter) return undefined;
    return manualCompleter === 'external'
      ? { externalName: externalCompleter.trim() }
      : manualCompleter ? { teamMemberId: manualCompleter } : undefined;
  };
  const manualCompleterValid = !needsManualCompleter || (manualCompleter === 'external' ? externalCompleter.trim().length >= 2 : Boolean(manualCompleter));

  const handleApproveClick = () => {
    if (!sessionsLoaded) return;
    if (sessionsLoadFailed) { toast.error('Could not verify who completed this task. Reload and try again.'); return; }
    if (!manualCompleterValid) { toast.error('Select who completed the task'); return; }
    if (!confirmedBestInterest) { toast.error('Confirm the QC attestation before approving'); return; }
    setStep("rate");
  };

  const handleRequestChanges = () => {
    if (!confirmedBestInterest) { toast.error('Confirm the QC attestation before requesting changes'); return; }
    setShowRejectInput(true);
  };

  const handleSubmitRejection = () => {
    if (rejectFeedback.trim()) {
      if (sessionsLoadFailed) { toast.error('Could not verify who completed this task. Reload and try again.'); return; }
      if (!manualCompleterValid) { toast.error('Select who completed the task'); return; }
      onReject(task.id, rejectFeedback, completionAttribution());
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
        additionalComments,
        completionAttribution()
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
    setManualCompleter("");
    setExternalCompleter("");
    setConfirmedBestInterest(false);
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
                    {finishedContributorNames.length > 0
                      ? `Completed by ${finishedContributorNames.join(', ')}. Review the site work and record the QC result.`
                      : sessionsLoadFailed
                        ? 'Completion records could not be loaded. Reload before reviewing.'
                        : sessionsLoaded
                        ? 'No employee completion was recorded. Select who completed the work below.'
                        : 'Loading completion record…'}
                  </p>
                </div>
              </div>

              {needsManualCompleter && (
                <div className="p-[16px] bg-secondary/30 border border-border rounded-[8px] space-y-[10px]">
                  <Label htmlFor="manual-completer" className="font-['Roboto_Mono'] text-[10px] uppercase tracking-wide">Who completed the task?</Label>
                  <select id="manual-completer" value={manualCompleter} onChange={(event) => setManualCompleter(event.target.value)} className="w-full h-[40px] px-[10px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]">
                    <option value="">Select a person</option>
                    {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                    <option value="external">External person not in team list</option>
                  </select>
                  {manualCompleter === 'external' && <input value={externalCompleter} onChange={(event) => setExternalCompleter(event.target.value)} placeholder="Enter the person's name" className="w-full h-[40px] px-[10px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]" />}
                  <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">This is only required when no employee submitted a finished timer/session.</p>
                </div>
              )}

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

                {/* Timing -- when this task was started/submitted and how long it took,
                    so the reviewer can factor delivery speed into their QC decision. */}
                {(task.startedAt || task.submittedAt) && (
                  <div className="p-[16px] bg-secondary/20 border border-border rounded-[8px] space-y-[6px]">
                    <p className="font-['Roboto_Mono'] font-bold text-[10px] text-muted-foreground uppercase tracking-wide">
                      Timing
                    </p>
                    <div className="grid grid-cols-2 gap-[8px] font-['Roboto_Mono'] text-[11px]">
                      {task.startedAt && (
                        <p className="text-muted-foreground">Started: <span className="text-foreground">{new Date(task.startedAt).toLocaleString()}</span></p>
                      )}
                      {task.submittedAt && (
                        <p className="text-muted-foreground">Submitted for QC: <span className="text-foreground">{new Date(task.submittedAt).toLocaleString()}</span></p>
                      )}
                      {task.startedAt && task.submittedAt && (
                        <p className="text-muted-foreground">
                          Total time: <span className="text-foreground">
                            {(() => {
                              const ms = new Date(task.submittedAt).getTime() - new Date(task.startedAt).getTime();
                              const hours = ms / 3600000;
                              return hours < 24 ? `${hours.toFixed(1)}h` : `${(hours / 24).toFixed(1)}d`;
                            })()}
                          </span>
                        </p>
                      )}
                    </div>
                    {task.submittedAt && task.dueDate && (
                      <span className={`inline-block px-[8px] py-[2px] rounded-full text-[9px] font-['Roboto_Mono'] font-medium ${
                        new Date(task.submittedAt) <= new Date(task.dueDate)
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}>
                        {new Date(task.submittedAt) <= new Date(task.dueDate) ? "Submitted on time" : "Submitted late"}
                      </span>
                    )}
                  </div>
                )}

              {/* QC Guidelines */}
              {sessions.some((session) => session.delayReason || session.blocker) && (
                <div className="p-[16px] bg-secondary/20 border border-border rounded-[8px] space-y-[10px]">
                  <p className="font-['Roboto_Mono'] font-bold text-[10px] uppercase tracking-wide">Documented delays</p>
                  {sessions.filter((session) => session.delayReason || session.blocker).map((session) => (
                    <div key={session.id} className="border-t border-border pt-[10px] first:border-0 first:pt-0">
                      <p className="font-['Roboto_Mono'] text-[11px]">{session.delayReason || session.blocker}</p>
                      <div className="flex items-center justify-between mt-[7px]">
                        <span className="font-['Roboto_Mono'] text-[9px] uppercase text-muted-foreground">{session.delayStatus || 'pending'}</span>
                        {(!session.delayStatus || session.delayStatus === 'pending') && <div className="flex gap-[6px]"><button type="button" onClick={() => decideDelay(session, false)} className="px-3 py-1 border border-border rounded-full font-['Roboto_Mono'] text-[9px] uppercase">Decline</button><button type="button" onClick={() => decideDelay(session, true)} className="px-3 py-1 bg-success text-white rounded-full font-['Roboto_Mono'] text-[9px] uppercase">Approve delay</button></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-[12px]">
                <TaskActivityFeed taskId={String(task.id)} />
                <TaskMediaEvidence projectId={String(task.projectId)} taskId={String(task.id)} />
              </div>

              {/* QC attestation -- an explicit reminder of who this review is
                  for, required before Approve/Request Changes can be used.
                  Not a description of what the buttons do (that's obvious
                  from the buttons themselves); this is a check on judgment,
                  since a rushed approval or an unfair rejection both cost
                  the company, the project, and the client. */}
              <div className="p-[16px] bg-secondary rounded-[8px]">
                <div className="flex items-start gap-[12px]">
                  <input
                    type="checkbox"
                    id="qc-guidelines"
                    checked={confirmedBestInterest}
                    onChange={(e) => setConfirmedBestInterest(e.target.checked)}
                    className="mt-[2px] w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="qc-guidelines" className="flex-1">
                    <h4 className="text-foreground font-['Roboto_Mono'] font-bold text-[12px] mb-[4px]">
                      Quality Control Attestation
                    </h4>
                    <p className="text-muted-foreground font-['Roboto_Mono'] text-[10px]">
                      I have reviewed the work and evidence above, and my decision reflects the best interest of Cstle Livn, this project, and the client -- not convenience or speed.
                    </p>
                  </label>
                </div>
              </div>
              {!confirmedBestInterest && (
                <p className="-mt-[8px] font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                  Confirm the attestation above before approving or requesting changes.
                </p>
              )}

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

              {/* Action Buttons -- stacked full-width on mobile (gloved
                  thumbs need bigger, unambiguous targets more than a
                  visually compact row), a normal inline row from sm up. */}
              <div className="flex flex-col-reverse sm:flex-row gap-[8px] sm:gap-[12px] sm:justify-end pt-[16px] border-t border-border">
                <button
                  type="button"
                  onClick={resetDialog}
                  className="w-full sm:w-auto justify-center px-[16px] py-[10px] sm:py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors text-foreground font-['Roboto_Mono'] text-[11px] flex items-center"
                >
                  Cancel
                </button>

                {!showRejectInput ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRequestChanges}
                      disabled={!confirmedBestInterest}
                      className="w-full sm:w-auto justify-center flex items-center gap-[8px] px-[16px] py-[10px] sm:py-[8px] bg-transparent border border-destructive/40 text-destructive rounded-[6px] hover:bg-destructive/5 transition-colors font-['Roboto_Mono'] text-[11px] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      <XCircle className="w-[14px] h-[14px]" />
                      Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleApproveClick}
                      disabled={!confirmedBestInterest}
                      className="w-full sm:w-auto justify-center flex items-center gap-[8px] px-[16px] py-[10px] sm:py-[8px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
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
                      className="w-full sm:w-auto justify-center px-[16px] py-[10px] sm:py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors text-foreground font-['Roboto_Mono'] text-[11px] flex items-center"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitRejection}
                      disabled={!rejectFeedback.trim()}
                      className="w-full sm:w-auto justify-center flex items-center gap-[8px] px-[16px] py-[10px] sm:py-[8px] bg-destructive text-white rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-['Roboto_Mono'] text-[11px]"
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px]">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px]">
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[8px]">
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
              <div className="flex flex-col-reverse sm:flex-row gap-[8px] sm:gap-[12px] sm:justify-end pt-[16px] border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="w-full sm:w-auto justify-center flex items-center px-[16px] py-[10px] sm:py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors text-foreground font-['Roboto_Mono'] text-[11px]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRating}
                  disabled={!speed || !corrections}
                  className="w-full sm:w-auto justify-center flex items-center gap-[8px] px-[16px] py-[10px] sm:py-[8px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-['Roboto_Mono'] text-[11px]"
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
