import { useEffect, useMemo, useState } from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { calculateCompletion } from "../src/lib/progress";
import { useTaskAssignees, assigneeIdsForTask } from "../src/features/taskAssignees/useTaskAssignees";
import { queueSessionAction } from "../src/features/workSessions/offlineQueue";
import { declineTaskAssignment, assignTaskMember } from "../src/features/taskAssignees/api";
import { listPhasesForProjects } from "../src/features/projectPhases/api";
import { sortTasksByPhase } from "../src/lib/taskOrder";
import AuraProfileCard from "./AuraProfileCard";
import { formatDateShort as formatDueDateShort } from "../src/lib/dates";

// Mobile-only, task-led dashboard for associates working on site: "what do I
// have to do right now" rather than the admin's company-wide project/finance
// overview. Every value here reads from the same live data as the desktop
// dashboard (projects/tasks/teamMembers from AppContext) -- nothing here is
// mocked or static. Desktop keeps its existing layout untouched; this only
// renders below the md breakpoint (see Dashboard.tsx's md:hidden wrapper).
interface MobileTaskDashboardProps {
  projects: any[];
  tasks: any[];
  teamMembers: any[];
  currentUser: any;
  onNavigate: (view: string, id?: any) => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function MobileTaskDashboard({
  projects,
  tasks,
  teamMembers,
  currentUser,
  onNavigate,
}: MobileTaskDashboardProps) {
  const { taskAssignees, refresh: refreshAssignees } = useTaskAssignees(true);
  const [declinedTaskIds, setDeclinedTaskIds] = useState<Set<string>>(() => new Set());
  const [phases, setPhases] = useState<any[]>([]);

  const myMember = teamMembers.find((m: any) => String(m.authUserId) === String(currentUser?.id));

  // Projects this person supervises -- they're responsible for every task
  // here regardless of who it's assigned to, separate from "Your tasks"
  // (tasks actually assigned to them personally). See the Supervisor Queue
  // section below.
  const supervisedProjectIds = useMemo(() => {
    if (!myMember) return new Set<string>();
    return new Set(
      projects.filter((p: any) => String(p.supervisorId) === String(myMember.id)).map((p: any) => String(p.id))
    );
  }, [projects, myMember]);

  const myTaskIds = useMemo(() => {
    if (!myMember) return new Set<string>();
    return new Set(
      taskAssignees
        .filter((a: any) => String(a.teamMemberId) === String(myMember.id))
        .map((a: any) => String(a.taskId))
    );
  }, [taskAssignees, myMember]);

  // Every task with at least one active assignee, regardless of who -- once
  // a Supervisor hands a task to someone (or it's assigned to anyone else),
  // it must drop out of the "To assign" queue immediately.
  const assignedTaskIds = useMemo(() => {
    return new Set(taskAssignees.map((a: any) => String(a.taskId)));
  }, [taskAssignees]);

  // A task that's already been submitted for QC (or sent back Under
  // Review) is out of the associate's hands until a reviewer acts on it --
  // it doesn't belong in "what should I work on next," so it's split out
  // into its own queue instead of sitting at the top of the active list
  // forever until QC gets to it.
  const myTasksUnsorted = useMemo(() => {
    return tasks.filter((t: any) => {
      const project = projects.find((p: any) => String(p.id) === String(t.projectId));
      return (
        myTaskIds.has(String(t.id)) &&
        !declinedTaskIds.has(String(t.id)) &&
        t.status !== "Completed" &&
        t.status !== "Pending QC" &&
        t.status !== "Under Review" &&
        project?.status !== "Completed"
      );
    });
  }, [tasks, projects, myTaskIds, declinedTaskIds]);

  const myQcQueueUnsorted = useMemo(() => {
    return tasks.filter((t: any) => {
      const project = projects.find((p: any) => String(p.id) === String(t.projectId));
      return (
        myTaskIds.has(String(t.id)) &&
        !declinedTaskIds.has(String(t.id)) &&
        (t.status === "Pending QC" || t.status === "Under Review") &&
        project?.status !== "Completed"
      );
    });
  }, [tasks, projects, myTaskIds, declinedTaskIds]);

  // Every task on a project this person supervises, that isn't already
  // theirs and isn't done -- "responsible for it" doesn't mean "assigned to
  // it." They can start it themselves or hand it to someone else from here.
  const supervisorQueueUnsorted = useMemo(() => {
    if (supervisedProjectIds.size === 0) return [];
    return tasks.filter((t: any) => {
      const project = projects.find((p: any) => String(p.id) === String(t.projectId));
      return (
        String(t.supervisor_id) &&
        supervisedProjectIds.has(String(t.projectId)) &&
        t.status !== "Completed" &&
        project?.status !== "Completed" &&
        !assignedTaskIds.has(String(t.id))
      );
    });
  }, [tasks, projects, supervisedProjectIds, assignedTaskIds]);

  const relevantProjectIds = useMemo(() => {
    const ids = new Set<string>();
    myTasksUnsorted.forEach((t: any) => ids.add(String(t.projectId)));
    myQcQueueUnsorted.forEach((t: any) => ids.add(String(t.projectId)));
    supervisorQueueUnsorted.forEach((t: any) => ids.add(String(t.projectId)));
    supervisedProjectIds.forEach((id) => ids.add(id));
    return [...ids];
  }, [myTasksUnsorted, myQcQueueUnsorted, supervisorQueueUnsorted, supervisedProjectIds]);

  useEffect(() => {
    let cancelled = false;
    if (relevantProjectIds.length === 0) {
      setPhases([]);
      return;
    }
    listPhasesForProjects(relevantProjectIds)
      .then((p) => {
        if (!cancelled) setPhases(p);
      })
      .catch(() => {
        if (!cancelled) setPhases([]);
      });
    return () => {
      cancelled = true;
    };
    // Only re-fetch when the actual set of relevant projects changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relevantProjectIds.join(",")]);

  const myTasks = useMemo(() => sortTasksByPhase(myTasksUnsorted, phases), [myTasksUnsorted, phases]);
  const myQcQueue = useMemo(() => sortTasksByPhase(myQcQueueUnsorted, phases), [myQcQueueUnsorted, phases]);
  const supervisorQueue = useMemo(() => sortTasksByPhase(supervisorQueueUnsorted, phases), [supervisorQueueUnsorted, phases]);
  const [showQcQueue, setShowQcQueue] = useState(false);

  const delayedCount = myTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date()).length;

  const myProjectIds = useMemo(() => new Set(myTasks.map((t: any) => String(t.projectId))), [myTasks]);
  const myActiveProjects = projects.filter(
    (p: any) => (myProjectIds.has(String(p.id)) || supervisedProjectIds.has(String(p.id))) && p.status !== "Completed"
  );

  return (
    <div className="flex min-w-0 flex-col gap-[20px] pb-[24px] overflow-x-hidden">
      <div className="px-[16px] pt-[16px]">
        <h1
          className="text-foreground"
          style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "24px", lineHeight: 1.2 }}
        >
          Welcome Back{myMember?.name ? `, ${myMember.name.split(" ")[0]}` : ""}
        </h1>
      </div>

      {myActiveProjects.length > 0 && (
        <div className="flex w-full gap-[12px] overflow-x-auto px-[16px] snap-x snap-mandatory scroll-px-[16px]">
          {myActiveProjects.map((project: any) => {
            const projectTasks = tasks.filter((t: any) => String(t.projectId) === String(project.id));
            const progress = projectTasks.length > 0 ? calculateCompletion(projectTasks).percent : project.progress || 0;
            return (
              <button
                key={project.id}
                onClick={() => onNavigate("project-details", project.id)}
                className="w-[calc(100vw-32px)] max-w-[360px] shrink-0 snap-start text-left bg-[var(--green-900)] rounded-[20px] p-[24px] flex flex-col gap-[24px]"
              >
                <p className="font-['Roboto_Mono'] text-[11px] uppercase tracking-wide text-[var(--olive-300)]">
                  Active Project
                </p>
                <div>
                  <h2
                    className="text-white line-clamp-2"
                    style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "18px", lineHeight: 1.2 }}
                  >
                    {project.title}
                  </h2>
                  <p className="font-['Roboto_Mono'] text-[12px] text-[var(--olive-300)] mt-[4px] truncate">
                    {project.location || "No address on file"}
                  </p>
                </div>
                <div>
                  <div className="flex items-end justify-between mb-[8px]">
                    <span className="font-['Roboto_Mono'] font-bold text-[28px] text-white">{progress}%</span>
                    <span className="font-['Roboto_Mono'] text-[11px] uppercase tracking-wide text-[var(--olive-300)]">
                      {project.phase || "In Progress"}
                    </span>
                  </div>
                  <div className="h-[4px] w-full bg-[var(--green-700)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--olive-500)] rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="px-[16px] flex flex-col gap-[12px]">
        <div className="flex items-baseline justify-between">
          <h2 style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "18px" }}>
            Your tasks
          </h2>
          <div className="flex items-center gap-[10px] font-['Roboto_Mono'] text-[11px] uppercase tracking-wide">
            <span className="text-muted-foreground">{myTasks.length} Assigned</span>
            {delayedCount > 0 && (
              <span className="text-[var(--vermillion-500)] font-bold">{delayedCount} Delayed</span>
            )}
          </div>
        </div>

        {myTasks.length === 0 ? (
          <div className="bg-card border border-[var(--olive-300)] rounded-[20px] p-[24px] text-center">
            <p className="font-['Roboto_Mono'] text-[12px] text-muted-foreground">
              No tasks assigned to you right now.
            </p>
          </div>
        ) : (
          <div className="rounded-[20px] overflow-hidden border border-[var(--olive-300)]">
            {myTasks.map((task: any, index: number) => (
              <TaskQueueRow
                key={task.id}
                task={task}
                isExpanded={index === 0}
                teamMembers={teamMembers}
                taskAssignees={taskAssignees}
                myMemberId={myMember ? String(myMember.id) : null}
                onNavigate={onNavigate}
                onDeclined={(id) => setDeclinedTaskIds((current) => new Set(current).add(id))}
              />
            ))}
          </div>
        )}

        {myQcQueue.length > 0 && (
          <div className="rounded-[20px] border border-[var(--olive-300)] overflow-hidden">
            <button
              onClick={() => setShowQcQueue((v) => !v)}
              className="w-full flex items-center justify-between px-[20px] py-[14px] bg-card"
            >
              <span className="flex items-center gap-[8px] font-['Roboto_Mono'] text-[11px] font-bold uppercase tracking-wide text-foreground">
                <ShieldCheck className="w-4 h-4" />
                Awaiting QC
              </span>
              <span className="font-['Roboto_Mono'] text-[11px] uppercase tracking-wide text-muted-foreground">
                {myQcQueue.length} {showQcQueue ? "Hide ▲" : "Show ▼"}
              </span>
            </button>
            {showQcQueue && (
              <div className="divide-y divide-[var(--olive-300)] border-t border-[var(--olive-300)]">
                {myQcQueue.map((task: any) => (
                  <button
                    key={task.id}
                    onClick={() => onNavigate("task-details", task.id)}
                    className="w-full text-left px-[20px] py-[14px] bg-[var(--olive-100)] flex items-center justify-between gap-[12px]"
                  >
                    <p
                      className="text-foreground flex-1 min-w-0 truncate"
                      style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "14px", lineHeight: 1.25 }}
                    >
                      {task.title}
                    </p>
                    <span className="shrink-0 font-['Roboto_Mono'] text-[9px] uppercase tracking-wide text-muted-foreground">
                      {task.status === "Pending QC" ? "Pending QC" : "Under review"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {supervisedProjectIds.size > 0 && (
        <div className="px-[16px] flex flex-col gap-[12px]">
          <div className="flex items-baseline justify-between">
            <h2 style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "18px" }}>
              To assign
            </h2>
            <span className="font-['Roboto_Mono'] text-[11px] uppercase tracking-wide text-muted-foreground">
              {supervisorQueue.length} on your project{supervisedProjectIds.size === 1 ? "" : "s"}
            </span>
          </div>
          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground -mt-[6px]">
            You supervise this project -- these tasks aren't assigned to anyone yet. Start one yourself or assign it to someone.
          </p>

          {supervisorQueue.length === 0 ? (
            <div className="bg-card border border-[var(--olive-300)] rounded-[20px] p-[24px] text-center">
              <p className="font-['Roboto_Mono'] text-[12px] text-muted-foreground">
                Everything on your project is already assigned.
              </p>
            </div>
          ) : (
            <div className="rounded-[20px] overflow-hidden border border-[var(--olive-300)] divide-y divide-[var(--olive-300)]">
              {supervisorQueue.map((task: any) => (
                <SupervisorQueueRow
                  key={task.id}
                  task={task}
                  teamMembers={teamMembers}
                  myMemberId={myMember ? String(myMember.id) : null}
                  onNavigate={onNavigate}
                  onAssigned={() => refreshAssignees()}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {myMember && (
        <div className="px-[16px] flex flex-col gap-[12px]">
          <h2 style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "18px" }}>
            Your Aura
          </h2>
          <AuraProfileCard teamMemberId={String(myMember.id)} />
        </div>
      )}
    </div>
  );
}

function SupervisorQueueRow({
  task,
  teamMembers,
  myMemberId,
  onNavigate,
  onAssigned,
}: {
  task: any;
  teamMembers: any[];
  myMemberId: string | null;
  onNavigate: (view: string, id?: any) => void;
  onAssigned: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const handleStartSelf = async () => {
    if (!myMemberId) return;
    setBusy(true);
    try {
      await assignTaskMember(String(task.id), myMemberId);
      await queueSessionAction({ type: "start", taskId: String(task.id), teamMemberId: myMemberId });
      onAssigned();
      toast.success("Timer started");
      onNavigate("task-details", task.id);
    } catch (error: any) {
      toast.error(error?.message || "Failed to start task");
    } finally {
      setBusy(false);
    }
  };

  const handleAssignTo = async (teamMemberId: string) => {
    if (!teamMemberId) return;
    setBusy(true);
    try {
      const member = teamMembers.find((m: any) => String(m.id) === teamMemberId);
      await assignTaskMember(String(task.id), teamMemberId);
      onAssigned();
      setAssigning(false);
      toast.success(`Assigned to ${member?.name || "team member"}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to assign task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card p-[16px] flex flex-col gap-[10px]">
      <button
        onClick={() => onNavigate("task-details", task.id)}
        className="text-left text-foreground"
        style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "16px", lineHeight: 1.25 }}
      >
        {task.title}
      </button>
      <div className="flex items-center justify-between font-['Roboto_Mono'] text-[10px] text-muted-foreground uppercase tracking-wide">
        <span>{task.phase || "No phase"}</span>
        <span>{task.dueDate ? formatDueDateShort(task.dueDate) : "No date"}</span>
      </div>

      {assigning ? (
        <select
          autoFocus
          disabled={busy}
          defaultValue=""
          onChange={(e) => handleAssignTo(e.target.value)}
          onBlur={() => setAssigning(false)}
          className="h-[40px] rounded-[999px] border border-border px-[12px] font-['Roboto_Mono'] text-[12px] bg-input-background"
        >
          <option value="" disabled>
            Choose a team member…
          </option>
          {teamMembers
            .filter((m: any) => m.active)
            .map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
        </select>
      ) : (
        <div className="flex items-center gap-[10px]">
          <button
            onClick={() => setAssigning(true)}
            disabled={busy}
            className="flex-1 h-[40px] rounded-[999px] border border-border font-['Roboto_Mono'] font-bold uppercase tracking-wide text-[11px] text-foreground disabled:opacity-50"
          >
            Assign
          </button>
          <button
            onClick={handleStartSelf}
            disabled={busy || !myMemberId}
            className="flex-1 h-[40px] rounded-[999px] bg-[var(--green-900)] font-['Roboto_Mono'] font-bold uppercase tracking-wide text-[11px] text-white disabled:opacity-50"
          >
            Start it myself
          </button>
        </div>
      )}
    </div>
  );
}

function TaskQueueRow({
  task,
  isExpanded,
  teamMembers,
  taskAssignees,
  myMemberId,
  onNavigate,
  onDeclined,
}: {
  task: any;
  isExpanded: boolean;
  teamMembers: any[];
  taskAssignees: any[];
  myMemberId: string | null;
  onNavigate: (view: string, id?: any) => void;
  onDeclined: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const isDelayed = task.dueDate && new Date(task.dueDate) < new Date();

  if (!isExpanded) {
    return (
      <button
        onClick={() => onNavigate("task-details", task.id)}
        className="w-full text-left px-[20px] py-[16px] bg-[var(--olive-100)] border-t border-[var(--olive-300)] flex items-start justify-between gap-[12px]"
      >
        <p
          className="text-foreground flex-1 min-w-0"
          style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "16px", lineHeight: 1.25 }}
        >
          {task.title}
        </p>
        <span
          className={`shrink-0 font-['Roboto_Mono'] text-[10px] uppercase tracking-wide pt-[4px] ${
            isDelayed ? "text-[var(--vermillion-500)] font-bold" : "text-muted-foreground"
          }`}
        >
          {task.dueDate ? formatDueDateShort(task.dueDate) : "No date"}
        </span>
      </button>
    );
  }

  const assigneeIds = assigneeIdsForTask(taskAssignees, task.id);
  const assignedMembers = assigneeIds
    .map((id) => teamMembers.find((m: any) => String(m.id) === id))
    .filter(Boolean);

  const handleStart = async () => {
    setBusy(true);
    try {
      const teamMemberId = myMemberId && assigneeIds.includes(myMemberId) ? myMemberId : assigneeIds[0];
      await queueSessionAction({ type: "start", taskId: String(task.id), teamMemberId });
      toast.success("Timer started");
      onNavigate("task-details", task.id);
    } catch (error: any) {
      toast.error(error?.message || "Failed to start task");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      await declineTaskAssignment(String(task.id));
      onDeclined(String(task.id));
      toast.success("Task declined");
    } catch (error: any) {
      toast.error(error?.message || "Failed to decline task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card p-[20px] flex flex-col gap-[16px]">
      <div className="flex items-center justify-between">
        <div className="flex -space-x-[8px]">
          {assignedMembers.length > 0 ? (
            assignedMembers.slice(0, 3).map((m: any) => (
              <div
                key={m.id}
                className="w-[32px] h-[32px] rounded-full bg-[var(--green-900)] border-2 border-card flex items-center justify-center text-white font-['Roboto_Mono'] text-[10px] font-bold"
                title={m.name}
              >
                {initials(m.name)}
              </div>
            ))
          ) : (
            <div className="w-[32px] h-[32px] rounded-full bg-muted" />
          )}
        </div>
        <span className="font-['Roboto_Mono'] text-[10px] uppercase tracking-wide text-muted-foreground">
          Priority
        </span>
        <span
          className={`font-['Roboto_Mono'] text-[10px] uppercase tracking-wide ${
            isDelayed ? "text-[var(--vermillion-500)] font-bold" : "text-muted-foreground"
          }`}
        >
          Start Date
        </span>
      </div>

      <div className="flex items-center justify-between gap-[12px]">
        <button
          onClick={() => onNavigate("task-details", task.id)}
          className="text-foreground flex-1"
          style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "19px", lineHeight: 1.25 }}
        >
          {task.title}
        </button>
      </div>
      <div className="flex items-center justify-between font-['Roboto_Mono'] text-[11px] text-muted-foreground -mt-[8px]">
        <span className="uppercase tracking-wide">{task.priority || "Medium"}</span>
        <span className={isDelayed ? "text-[var(--vermillion-500)] font-bold" : ""}>
          {task.dueDate ? formatDueDateShort(task.dueDate) : "—"}
        </span>
      </div>

      {/* Once a task is submitted (Pending QC) or blocked (Under Review), it
          can only move again via a supervisor/QC action -- never by tapping
          Start again. Without this gate, a finished session leaves no
          "in progress" state behind, so the ordinary Start button reappeared
          and silently let someone re-start a task that was already awaiting
          review. */}
      {task.status === "Pending QC" || task.status === "Under Review" ? (
        <div className="flex items-center gap-[6px] text-muted-foreground bg-secondary/40 rounded-[10px] px-[12px] py-[10px]">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span className="font-['Roboto_Mono'] text-[10px]">
            {task.status === "Pending QC"
              ? "Submitted -- waiting on QC review. A supervisor must request a revision before you can restart it."
              : "Under review -- a supervisor needs to clear this before work can continue."}
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-[12px]">
            <button
              onClick={handleDecline}
              disabled={busy}
              className="flex-1 h-[48px] rounded-[999px] border border-border font-['Roboto_Mono'] font-bold uppercase tracking-wide text-[13px] text-foreground disabled:opacity-50"
            >
              Decline
            </button>
            <button
              onClick={handleStart}
              disabled={busy}
              className="flex-1 h-[48px] rounded-[999px] bg-[var(--green-900)] font-['Roboto_Mono'] font-bold uppercase tracking-wide text-[13px] text-white disabled:opacity-50"
            >
              Start
            </button>
          </div>

          <div className="flex items-center gap-[6px] text-muted-foreground -mt-[4px]">
            <Clock className="w-3 h-3" />
            <span className="font-['Roboto_Mono'] text-[10px]">Tap Start to begin your timer for this task</span>
          </div>
        </>
      )}
    </div>
  );
}
