import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { calculateCompletion } from "../src/lib/progress";
import { useTaskAssignees, assigneeIdsForTask } from "../src/features/taskAssignees/useTaskAssignees";
import { queueSessionAction } from "../src/features/workSessions/offlineQueue";
import { declineTaskAssignment } from "../src/features/taskAssignees/api";
import AuraProfileCard from "./AuraProfileCard";

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
  const { taskAssignees } = useTaskAssignees(true);

  const myMember = teamMembers.find((m: any) => String(m.authUserId) === String(currentUser?.id));

  const myTaskIds = useMemo(() => {
    if (!myMember) return new Set<string>();
    return new Set(
      taskAssignees
        .filter((a: any) => String(a.teamMemberId) === String(myMember.id))
        .map((a: any) => String(a.taskId))
    );
  }, [taskAssignees, myMember]);

  const myTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((t: any) => myTaskIds.has(String(t.id)) && t.status !== "Completed")
      .sort((a: any, b: any) => {
        const aDelayed = a.dueDate && new Date(a.dueDate) < now;
        const bDelayed = b.dueDate && new Date(b.dueDate) < now;
        if (aDelayed !== bDelayed) return aDelayed ? -1 : 1;
        return new Date(a.dueDate || a.startDate || 0).getTime() - new Date(b.dueDate || b.startDate || 0).getTime();
      });
  }, [tasks, myTaskIds]);

  const delayedCount = myTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date()).length;

  const myProjectIds = useMemo(() => new Set(myTasks.map((t: any) => String(t.projectId))), [myTasks]);
  const myActiveProjects = projects.filter(
    (p: any) => myProjectIds.has(String(p.id)) && p.status !== "Completed"
  );

  return (
    <div className="flex flex-col gap-[20px] pb-[24px]">
      <div className="px-[16px] pt-[16px]">
        <h1
          className="text-foreground"
          style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em" }}
        >
          Welcome Back{myMember?.name ? `, ${myMember.name.split(" ")[0]}` : ""}
        </h1>
      </div>

      {myActiveProjects.length > 0 && (
        <div className="flex gap-[12px] overflow-x-auto px-[16px] snap-x snap-mandatory">
          {myActiveProjects.map((project: any) => {
            const projectTasks = tasks.filter((t: any) => String(t.projectId) === String(project.id));
            const progress = projectTasks.length > 0 ? calculateCompletion(projectTasks).percent : project.progress || 0;
            return (
              <button
                key={project.id}
                onClick={() => onNavigate("project-details", project.id)}
                className="w-[85vw] max-w-[360px] shrink-0 snap-start text-left bg-[var(--green-900)] rounded-[20px] p-[24px] flex flex-col gap-[24px]"
              >
                <p className="font-['Roboto_Mono'] text-[11px] uppercase tracking-wide text-[var(--olive-300)]">
                  Active Project
                </p>
                <div>
                  <h2
                    className="text-white line-clamp-2"
                    style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "22px", lineHeight: 1.15 }}
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
          <h2 style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "22px" }}>
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
              />
            ))}
          </div>
        )}
      </div>

      {myMember && (
        <div className="px-[16px] flex flex-col gap-[12px]">
          <h2 style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "22px" }}>
            Your Aura
          </h2>
          <AuraProfileCard teamMemberId={String(myMember.id)} />
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
}: {
  task: any;
  isExpanded: boolean;
  teamMembers: any[];
  taskAssignees: any[];
  myMemberId: string | null;
  onNavigate: (view: string, id?: any) => void;
}) {
  const [busy, setBusy] = useState(false);
  const isDelayed = task.dueDate && new Date(task.dueDate) < new Date();

  if (!isExpanded) {
    return (
      <button
        onClick={() => onNavigate("project-details", task.projectId)}
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
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No date"}
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
      onNavigate("project-details", task.projectId);
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
        <p
          className="text-foreground flex-1"
          style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", letterSpacing: "-0.04em", fontSize: "26px", lineHeight: 1.2 }}
        >
          {task.title}
        </p>
      </div>
      <div className="flex items-center justify-between font-['Roboto_Mono'] text-[11px] text-muted-foreground -mt-[8px]">
        <span className="uppercase tracking-wide">{task.priority || "Medium"}</span>
        <span className={isDelayed ? "text-[var(--vermillion-500)] font-bold" : ""}>
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
        </span>
      </div>

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
    </div>
  );
}
