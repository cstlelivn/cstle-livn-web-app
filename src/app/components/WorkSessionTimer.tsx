import { useState } from "react";
import { Play, Pause, Square, Clock, AlertCircle, User, WifiOff } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { useTaskAssignees, assigneeIdsForTask } from "../src/features/taskAssignees/useTaskAssignees";
import { useWorkSessions } from "../src/features/workSessions/useWorkSessions";
import { useElapsedTime, formatElapsed } from "../src/features/workSessions/useElapsedTime";
import { queueSessionAction, effectiveSession, useOfflineOverlay } from "../src/features/workSessions/offlineQueue";
import { toast } from "sonner";

interface WorkSessionTimerProps {
  taskId: string;
  projectId: string;
}

// One row per active assignee: Start/Pause/Resume/Finish controls for your
// own row, a read-only status badge for everyone else's -- so a supervisor
// can see "MJ is actively working, Demilade is paused" without being able
// to touch either person's timer. Actions go through queueSessionAction,
// which works the same online or offline (queues locally, syncs when back).
export default function WorkSessionTimer({ taskId, projectId }: WorkSessionTimerProps) {
  const { teamMembers } = useApp();
  const { currentUser } = useAuth();
  const { taskAssignees } = useTaskAssignees(true);
  const { workSessions } = useWorkSessions(true);
  const { overlays, pendingCount, isOnline } = useOfflineOverlay();

  const assigneeIds = assigneeIdsForTask(taskAssignees, taskId);
  const myMember = teamMembers.find((m: any) => String(m.authUserId) === String(currentUser?.id));
  const myMemberId = myMember ? String(myMember.id) : null;

  if (assigneeIds.length === 0) {
    return (
      <div className="p-[16px] bg-secondary/20 border border-border rounded-[8px]">
        <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
          Assign someone to this task to start tracking work time.
        </p>
      </div>
    );
  }

  return (
    <div className="p-[16px] bg-secondary/20 border border-border rounded-[8px] space-y-[10px]">
      <div className="flex items-center justify-between">
        <p className="font-['Roboto_Mono'] font-bold text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-[6px]">
          <Clock className="w-3 h-3" />
          Work Sessions
        </p>
        {(!isOnline || pendingCount > 0) && (
          <span className="flex items-center gap-[4px] px-[8px] py-[2px] rounded-full bg-warning/10 text-warning text-[9px] font-['Roboto_Mono']">
            <WifiOff className="w-2.5 h-2.5" />
            {!isOnline ? "Offline — " : ""}{pendingCount > 0 ? `${pendingCount} change${pendingCount === 1 ? "" : "s"} pending sync` : "will sync when reconnected"}
          </span>
        )}
      </div>
      <div className="space-y-[8px]">
        {assigneeIds.map((memberId) => {
          const member = teamMembers.find((m: any) => String(m.id) === memberId);
          const sessionsForPerson = workSessions.filter(
            (s: any) => String(s.taskId) === String(taskId) && String(s.teamMemberId) === memberId
          );
          const realOpenSession = sessionsForPerson.find((s: any) => s.status !== "finished");
          const openSession = effectiveSession(taskId, memberId, realOpenSession, overlays);
          const isMe = memberId === myMemberId;

          return (
            <AssigneeSessionRow
              key={memberId}
              memberName={member?.name || "Unknown"}
              isMe={isMe}
              taskId={taskId}
              projectId={projectId}
              memberId={memberId}
              session={openSession}
              finishedCount={sessionsForPerson.filter((s: any) => s.status === "finished").length}
              totalFinishedSeconds={sessionsForPerson
                .filter((s: any) => s.status === "finished")
                .reduce((sum: number, s: any) => sum + (s.activeSeconds || 0), 0)}
            />
          );
        })}
      </div>
    </div>
  );
}

function AssigneeSessionRow({
  memberName,
  isMe,
  taskId,
  projectId,
  memberId,
  session,
  finishedCount,
  totalFinishedSeconds,
}: {
  memberName: string;
  isMe: boolean;
  taskId: string;
  projectId: string;
  memberId: string;
  session: any;
  finishedCount: number;
  totalFinishedSeconds: number;
}) {
  const [showPauseForm, setShowPauseForm] = useState(false);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [blocker, setBlocker] = useState("");
  const [busy, setBusy] = useState(false);

  const liveSeconds = useElapsedTime(session);
  const displaySeconds = session ? liveSeconds : totalFinishedSeconds;

  const resetForms = () => {
    setShowPauseForm(false);
    setShowFinishForm(false);
    setNotes("");
    setDelayReason("");
    setBlocker("");
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      resetForms();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update work session");
    } finally {
      setBusy(false);
    }
  };

  const handleStart = () =>
    run(async () => {
      await queueSessionAction({ type: "start", taskId, teamMemberId: memberId });
      toast.success("Timer started");
    });

  const handlePauseSubmit = () =>
    run(async () => {
      await queueSessionAction({
        type: "pause",
        taskId,
        teamMemberId: memberId,
        sessionId: session.id,
        notes: notes || undefined,
        delayReason: delayReason || undefined,
        blocker: blocker || undefined,
      });
      toast.success("Paused");
    });

  const handleResume = () =>
    run(async () => {
      await queueSessionAction({ type: "resume", taskId, teamMemberId: memberId, sessionId: session.id });
      toast.success("Resumed");
    });

  const handleFinishSubmit = () =>
    run(async () => {
      await queueSessionAction({
        type: "finish",
        taskId,
        teamMemberId: memberId,
        sessionId: session.id,
        notes: notes || undefined,
      });
      toast.success("Finished");
    });

  return (
    <div className="p-[12px] bg-background border border-border rounded-[6px]">
      <div className="flex items-center justify-between gap-[8px]">
        <div className="flex items-center gap-[6px] min-w-0">
          <User className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground truncate">
            {memberName}{isMe ? " (you)" : ""}
          </span>
          {session?.status === "running" && (
            <span className="inline-flex items-center gap-[4px] px-[6px] py-[1px] rounded-full bg-success/10 text-success text-[9px] font-['Roboto_Mono']">
              <span className="w-[5px] h-[5px] rounded-full bg-success animate-pulse" /> Active
            </span>
          )}
          {session?.status === "paused" && (
            <span className="px-[6px] py-[1px] rounded-full bg-warning/10 text-warning text-[9px] font-['Roboto_Mono']">Paused</span>
          )}
          {session?.clockSuspect && (
            <AlertCircle className="w-3 h-3 text-warning shrink-0" titleAccess="Device clock looked off for this session" />
          )}
        </div>
        <span className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground shrink-0">
          {formatElapsed(displaySeconds)}
        </span>
      </div>

      {finishedCount > 0 && (
        <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mt-[2px]">
          {finishedCount} prior session{finishedCount === 1 ? "" : "s"} finished
        </p>
      )}

      {isMe && (
        <div className="mt-[8px]">
          {!session && (
            <button
              onClick={handleStart}
              disabled={busy}
              className="flex items-center gap-[6px] px-[12px] py-[6px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 font-['Roboto_Mono'] text-[10px]"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <Play className="w-3 h-3" /> Start
            </button>
          )}

          {session?.status === "running" && !showFinishForm && (
            <div className="flex gap-[8px]">
              <button
                onClick={() => setShowPauseForm(true)}
                disabled={busy}
                className="flex items-center gap-[6px] px-[12px] py-[6px] bg-warning/10 text-warning border border-warning/20 rounded-[6px] hover:bg-warning/20 transition-colors disabled:opacity-50 font-['Roboto_Mono'] text-[10px]"
              >
                <Pause className="w-3 h-3" /> Pause
              </button>
              <button
                onClick={() => setShowFinishForm(true)}
                disabled={busy}
                className="flex items-center gap-[6px] px-[12px] py-[6px] bg-success/10 text-success border border-success/20 rounded-[6px] hover:bg-success/20 transition-colors disabled:opacity-50 font-['Roboto_Mono'] text-[10px]"
              >
                <Square className="w-3 h-3" /> Finish
              </button>
            </div>
          )}

          {session?.status === "paused" && !showFinishForm && (
            <div className="flex gap-[8px]">
              <button
                onClick={handleResume}
                disabled={busy}
                className="flex items-center gap-[6px] px-[12px] py-[6px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 font-['Roboto_Mono'] text-[10px]"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <Play className="w-3 h-3" /> Resume
              </button>
              <button
                onClick={() => setShowFinishForm(true)}
                disabled={busy}
                className="flex items-center gap-[6px] px-[12px] py-[6px] bg-success/10 text-success border border-success/20 rounded-[6px] hover:bg-success/20 transition-colors disabled:opacity-50 font-['Roboto_Mono'] text-[10px]"
              >
                <Square className="w-3 h-3" /> Finish
              </button>
            </div>
          )}

          {showPauseForm && (
            <div className="mt-[8px] space-y-[6px]">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="text-[10px]"
              />
              <Textarea
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="Delay reason (optional)"
                rows={1}
                className="text-[10px]"
              />
              <Textarea
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                placeholder="Blocker (optional)"
                rows={1}
                className="text-[10px]"
              />
              <div className="flex gap-[8px]">
                <button
                  onClick={() => resetForms()}
                  disabled={busy}
                  className="px-[12px] py-[6px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors font-['Roboto_Mono'] text-[10px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePauseSubmit}
                  disabled={busy}
                  className="px-[12px] py-[6px] bg-warning text-white rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 font-['Roboto_Mono'] text-[10px]"
                >
                  Confirm Pause
                </button>
              </div>
            </div>
          )}

          {showFinishForm && (
            <div className="mt-[8px] space-y-[6px]">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="text-[10px]"
              />
              <div className="flex gap-[8px]">
                <button
                  onClick={() => resetForms()}
                  disabled={busy}
                  className="px-[12px] py-[6px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors font-['Roboto_Mono'] text-[10px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinishSubmit}
                  disabled={busy}
                  className="px-[12px] py-[6px] bg-success text-white rounded-[6px] hover:opacity-90 transition-opacity disabled:opacity-50 font-['Roboto_Mono'] text-[10px]"
                >
                  Confirm Finish
                </button>
              </div>
            </div>
          )}

          {(session?.delayReason || session?.blocker) && !showPauseForm && !showFinishForm && (
            <p className="font-['Roboto_Mono'] text-[9px] text-warning mt-[6px]">
              {session.delayReason && `Delay: ${session.delayReason}`}
              {session.delayReason && session.blocker && " · "}
              {session.blocker && `Blocker: ${session.blocker}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
