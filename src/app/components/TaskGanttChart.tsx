import { useState, useRef } from "react";
import { Edit2, Trash2, Plus, GripHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp, type Task } from "./AppContext";
import { useAuth } from "./AuthContext";
import { canEditTask } from "../src/features/tasks/permissions";
import { offerSaveDurationToTemplate } from "../src/features/tasks/saveToTemplate";
import { ALL_TASK_STATUSES, getEmployeeActions } from "../src/features/tasks/statusWorkflow";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "./ui/context-menu";
import TaskDialog from "./TaskDialog";
import { toast } from "sonner";

interface TaskGanttChartProps {
  projectId: number;
}

type TaskWithDates = Task & { start_date?: string };

// due_date/start_date are stored as UTC-midnight timestamps representing a
// plain calendar day. Mutating a parsed Date via local setDate()/getDate()
// shifts the effective day backward by one for anyone west of UTC (all of
// North America) -- use the UTC variants throughout so the chart and its
// drag-to-reschedule land on the day actually shown, not the day before.
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function TaskGanttChart({ projectId }: TaskGanttChartProps) {
  const { getTasksByProject, getTeamMember, updateTask, deleteTask, getProject, addTask, teamMembers } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [taskDialogMode, setTaskDialogMode] = useState<"add" | "edit">("add");
  const [draggedTask, setDraggedTask] = useState<TaskWithDates | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ taskId: number; edge: "left" | "right"; deltaDays: number } | null>(null);
  const resizeRef = useRef<{ taskId: number; edge: "left" | "right"; startX: number; pxPerDay: number; deltaDays: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByWeek = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 7 * 30, behavior: "smooth" });
  };

  const tasks = getTasksByProject(projectId) as TaskWithDates[];
  const project = getProject(projectId);
  const isManagerOrAdmin = hasPermission("canEditProjects");
  const canApproveQC = hasPermission("canApproveTaskQC");
  const canEditThisTask = (task: Task) =>
    canEditTask({ task, currentUserId: currentUser?.id, isManagerOrAdmin, teamMembers });

  // A task's "start" is its own start_date when the template/schedule set one;
  // fall back to its due date (a single-day bar) rather than createdAt -- the
  // DB insert timestamp is nearly identical for every task cloned from a
  // template, which is what made every bar start at the same point regardless
  // of where it actually falls in the project's schedule.
  const taskStart = (task: TaskWithDates) => task.start_date || task.dueDate;

  // Build a timeline window that actually spans the tasks, instead of a fixed
  // 30 days from project start -- a project's real schedule easily runs
  // longer than that, which clipped or mispositioned every later task.
  // "Today" is a real local concept (the viewer's actual current day), built
  // from local getters -- everything else here works in UTC-anchored date
  // strings, so this is the one deliberate exception.
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const getDaysTimeline = () => {
    const dated = tasks.filter((t) => t.dueDate || t.start_date);
    if (dated.length === 0) {
      if (!project?.startDate) return [];
      const start = new Date(project.startDate);
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(start);
        d.setUTCDate(d.getUTCDate() + i);
        return dayInfo(d);
      });
    }

    const allDates = dated.flatMap((t) => [taskStart(t), t.dueDate].filter(Boolean)) as string[];
    let start = new Date(Math.min(...allDates.map((d) => new Date(d).getTime())));
    let end = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));
    start.setUTCDate(start.getUTCDate() - 2);
    end.setUTCDate(end.getUTCDate() + 2);

    const days = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(dayInfo(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
  };

  function dayInfo(d: Date) {
    const dateStr = d.toISOString().split("T")[0];
    return {
      date: dateStr,
      label: `${d.getUTCDate()}`,
      monthLabel: d.getUTCDate() === 1 ? d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) : "",
      isWeekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
      isToday: dateStr === todayStr,
    };
  }

  const days = getDaysTimeline();
  const todayIndex = days.findIndex((d) => d.isToday);

  const getTaskPosition = (task: TaskWithDates) => {
    if (days.length === 0) return { left: "0%", width: "4%" };

    const timelineStart = days[0].date;
    let startOffset = Math.max(0, daysBetween(timelineStart, taskStart(task)));
    let endOffset = Math.max(startOffset + 1, daysBetween(timelineStart, task.dueDate) + 1);

    // Live preview while a resize handle is being dragged, before the change
    // is committed to the DB on mouseup.
    if (resizing && resizing.taskId === task.id) {
      if (resizing.edge === "left") {
        startOffset = Math.min(endOffset - 1, Math.max(0, startOffset + resizing.deltaDays));
      } else {
        endOffset = Math.max(startOffset + 1, endOffset + resizing.deltaDays);
      }
    }

    const duration = endOffset - startOffset;

    return {
      left: `${(startOffset / days.length) * 100}%`,
      width: `${(duration / days.length) * 100}%`,
    };
  };

  const handleResizeStart = (e: React.MouseEvent, task: TaskWithDates, edge: "left" | "right") => {
    e.stopPropagation();
    e.preventDefault();
    if (!canEditThisTask(task)) return;
    const timelineEl = timelineRef.current;
    if (!timelineEl || days.length === 0) return;
    const pxPerDay = timelineEl.getBoundingClientRect().width / days.length;
    resizeRef.current = { taskId: task.id, edge, startX: e.clientX, pxPerDay, deltaDays: 0 };
    setResizing({ taskId: task.id, edge, deltaDays: 0 });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = moveEvent.clientX - r.startX;
      r.deltaDays = Math.round(dx / r.pxPerDay);
      setResizing({ taskId: r.taskId, edge: r.edge, deltaDays: r.deltaDays });
    };

    const handleMouseUp = async () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      const r = resizeRef.current;
      resizeRef.current = null;
      setResizing(null);
      if (!r || r.deltaDays === 0) return;

      const t = tasks.find((x) => x.id === r.taskId);
      if (!t) return;
      const start = taskStart(t);
      const due = t.dueDate;

      try {
        if (r.edge === "left") {
          // Clamp to the 1-day-minimum floor instead of aborting -- dragging
          // past the point where duration would go to 0 (easy to overshoot
          // when trying to land exactly on 1 day) used to silently drop the
          // whole update, snapping the bar back to its old, larger duration.
          let newStart = addDays(start, r.deltaDays);
          if (daysBetween(newStart, due) < 1) newStart = addDays(due, -1);
          await updateTask(t.id, { start_date: newStart } as Partial<Task>);
          toast.success(`Task now starts ${new Date(newStart).toLocaleDateString()}`);
          offerSaveDurationToTemplate(t as any, daysBetween(newStart, due));
        } else {
          let newDue = addDays(due, r.deltaDays);
          if (daysBetween(start, newDue) < 1) newDue = addDays(start, 1);
          await updateTask(t.id, { dueDate: newDue });
          toast.success(`Task now due ${new Date(newDue).toLocaleDateString()}`);
          offerSaveDurationToTemplate(t as any, daysBetween(start, newDue));
        }
      } catch (error) {
        toast.error("Failed to resize task");
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      await updateTask(taskId, { status } as Partial<Task>);
      toast.success("Task status updated");
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "Completed":
        return "bg-success";
      case "In Progress":
        return "bg-primary";
      case "Under Review":
        return "bg-warning";
      case "Pending QC":
        return "bg-accent";
      default:
        return "bg-muted";
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "Urgent":
        return "border-destructive";
      case "High":
        return "border-warning";
      case "Medium":
        return "border-primary";
      default:
        return "border-muted-foreground";
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskDialogMode("edit");
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask(taskId);
      toast.success("Task deleted");
    }
  };

  const handleAddTask = () => {
    setTaskDialogMode("add");
    setSelectedTask(undefined);
    setIsTaskDialogOpen(true);
  };

  const handleDayCellClick = (dayDate: string) => {
    setNewTaskDate(dayDate);
    setTaskDialogMode("add");
    setSelectedTask(undefined);
    setIsTaskDialogOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, task: TaskWithDates) => {
    if (!canEditThisTask(task)) return;
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  // Dropping a bar on a day cell moves the whole task there, keeping its
  // original duration (drag the bar's start to that day, due date follows).
  const handleDrop = async (e: React.DragEvent, dayDate: string) => {
    e.preventDefault();
    if (!draggedTask) return;
    const duration = daysBetween(taskStart(draggedTask), draggedTask.dueDate);
    const newStart = dayDate;
    const newDue = addDays(newStart, duration);
    try {
      await updateTask(draggedTask.id, { start_date: newStart, dueDate: newDue } as Partial<Task>);
      toast.success(`Task rescheduled to ${new Date(newStart).toLocaleDateString()}`);
    } catch {
      toast.error("Failed to reschedule task");
    }
    setDraggedTask(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-[48px]">
        <p className="text-muted-foreground mb-[16px]">
          No tasks yet. Create your first task to see it in the Gantt chart.
        </p>
        <button
          onClick={handleAddTask}
          className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-[8px] mx-auto"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
        <TaskDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          projectId={projectId}
          mode={taskDialogMode}
          task={selectedTask}
          onSave={(taskData) => {
            if (newTaskDate) {
              addTask({ ...taskData, dueDate: newTaskDate });
              setNewTaskDate(null);
            }
          }}
        />
      </div>
    );
  }

  // Group by phase, ordered chronologically by each phase's earliest task
  const phaseGroups = (() => {
    const groups = new Map<string, TaskWithDates[]>();
    for (const task of tasks) {
      const key = task.phase || "No Phase";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => new Date(taskStart(a)).getTime() - new Date(taskStart(b)).getTime());
    }
    return Array.from(groups.entries()).sort(
      ([, a], [, b]) => new Date(taskStart(a[0])).getTime() - new Date(taskStart(b[0])).getTime()
    );
  })();

  return (
    <div className="space-y-[16px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground">Gantt Chart</h3>
          <p className="text-muted-foreground small-text">
            Click on a day to add a task, drag a task bar to reschedule it
          </p>
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            onClick={() => scrollByWeek(-1)}
            className="p-[8px] rounded-[6px] bg-background border border-border hover:bg-secondary transition-colors"
            title="Scroll timeline left"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={() => scrollByWeek(1)}
            className="p-[8px] rounded-[6px] bg-background border border-border hover:bg-secondary transition-colors"
            title="Scroll timeline right"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={handleAddTask}
            className="px-[12px] py-[6px] bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-[6px]"
          >
            <Plus className="w-3 h-3" />
            Add Task
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div ref={scrollRef} className="border border-border rounded-lg overflow-hidden bg-card overflow-x-auto scroll-smooth">
        <div className="min-w-max relative">
          {/* Timeline Header */}
          <div className="flex border-b border-border bg-secondary/30 sticky top-0 z-10">
            <div className="w-[200px] shrink-0 px-[12px] py-[8px] border-r border-border">
              <span className="text-foreground">Task</span>
            </div>
            <div className="flex-1 flex" ref={timelineRef}>
              {days.map((day) => (
                <div
                  key={day.date}
                  className={`flex-1 min-w-[30px] px-[4px] py-[8px] border-r border-border text-center ${
                    day.isWeekend ? "bg-muted/30" : ""
                  } ${day.isToday ? "bg-accent/10" : ""}`}
                >
                  {day.monthLabel && (
                    <div className="small-text text-muted-foreground mb-[2px]">
                      {day.monthLabel}
                    </div>
                  )}
                  <div className={`small-text ${day.isToday ? "text-accent font-bold" : "text-foreground"}`}>
                    {day.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today marker line, spanning all phase/task rows */}
          {todayIndex >= 0 && days.length > 0 && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-accent/60 pointer-events-none z-[5]"
              style={{ left: `calc(200px + (100% - 200px) * ${todayIndex / days.length})` }}
            />
          )}

          {/* Phase groups */}
          <div className="divide-y divide-border">
            {phaseGroups.map(([phaseName, phaseTasks]) => (
              <div key={phaseName}>
                {/* Phase header row */}
                <div className="flex bg-secondary/40">
                  <div className="w-[200px] shrink-0 px-[12px] py-[6px] border-r border-border">
                    <span className="font-['Roboto_Mono'] font-bold text-[10px] text-foreground uppercase tracking-wide">
                      {phaseName}
                    </span>
                  </div>
                  <div className="flex-1 flex">
                    {days.map((day) => (
                      <div
                        key={day.date}
                        className={`flex-1 min-w-[30px] border-r border-border/30 ${day.isWeekend ? "bg-muted/10" : ""}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Task rows within this phase */}
                <div className="divide-y divide-border/50">
                  {phaseTasks.map((task) => {
                    const assignee = task.assignee ? getTeamMember(task.assignee) : null;
                    const position = getTaskPosition(task);
                    const canEdit = canEditThisTask(task);

                    return (
                      <div key={task.id} className="flex hover:bg-secondary/20 transition-colors group">
                        {/* Task Info */}
                        <div className="w-[200px] shrink-0 px-[12px] py-[10px] border-r border-border flex items-center justify-between gap-[8px]">
                          <div className="flex-1 min-w-0 pl-[8px]">
                            <div className="text-foreground truncate small-text">
                              {task.title}
                            </div>
                            {assignee && (
                              <div className="text-muted-foreground small-text truncate">
                                {assignee.name}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => handleEditTask(task)}
                              className="p-[4px] hover:bg-secondary rounded"
                              title="Edit task"
                            >
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-[4px] hover:bg-destructive/10 rounded"
                              title="Delete task"
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        </div>

                        {/* Timeline Grid */}
                        <div className="flex-1 relative flex h-[48px]">
                          {days.map((day) => (
                            <div
                              key={day.date}
                              className={`flex-1 min-w-[30px] border-r border-border/30 ${
                                day.isWeekend ? "bg-muted/10" : ""
                              } cursor-pointer hover:bg-accent/5 transition-colors`}
                              onClick={() => handleDayCellClick(day.date)}
                              onDrop={(e) => handleDrop(e, day.date)}
                              onDragOver={handleDragOver}
                            />
                          ))}

                          {/* Task Bar */}
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <div
                                className={`absolute top-1/2 -translate-y-1/2 h-[28px] rounded flex items-center px-[8px] gap-[4px] hover:opacity-90 transition-opacity shadow-sm ${getStatusColor(
                                  task.status
                                )} ${getPriorityColor(task.priority)} border-2 ${
                                  canEdit ? "cursor-move" : "cursor-not-allowed"
                                }`}
                                style={{
                                  left: position.left,
                                  width: position.width,
                                }}
                                draggable={canEdit}
                                onDragStart={(e) => handleDragStart(e, task)}
                                title={`${task.title} - ${task.status}${!canEdit ? " (assigned to someone else)" : ""} -- right-click to change status`}
                              >
                                {canEdit && (
                                  <div
                                    draggable={false}
                                    onMouseDown={(e) => handleResizeStart(e, task, "left")}
                                    className="absolute left-0 top-0 bottom-0 w-[6px] cursor-ew-resize hover:bg-white/30 rounded-l"
                                    title="Drag to change start date"
                                  />
                                )}
                                <GripHorizontal className="w-3 h-3 text-white/70 shrink-0" />
                                <span className="text-white small-text truncate flex-1">
                                  {task.title}
                                </span>
                                {canEdit && (
                                  <div
                                    draggable={false}
                                    onMouseDown={(e) => handleResizeStart(e, task, "right")}
                                    className="absolute right-0 top-0 bottom-0 w-[6px] cursor-ew-resize hover:bg-white/30 rounded-r"
                                    title="Drag to change due date"
                                  />
                                )}
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuLabel>{task.title}</ContextMenuLabel>
                              <ContextMenuSeparator />
                              {(() => {
                                const statusOptions = canApproveQC
                                  ? ALL_TASK_STATUSES
                                  : canEdit
                                  ? getEmployeeActions(task.status).map((a) => a.nextStatus)
                                  : [];
                                if (statusOptions.length === 0) {
                                  return (
                                    <ContextMenuItem disabled>
                                      {task.status} — waiting on a supervisor or QC
                                    </ContextMenuItem>
                                  );
                                }
                                return statusOptions.map((s) => (
                                  <ContextMenuItem key={s} onClick={() => handleStatusChange(task.id, s)}>
                                    Set status: {s}
                                  </ContextMenuItem>
                                ));
                              })()}
                            </ContextMenuContent>
                          </ContextMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Dialog */}
      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        projectId={projectId}
        mode={taskDialogMode}
        task={selectedTask}
        onSave={(taskData) => {
          if (newTaskDate) {
            addTask({ ...taskData, dueDate: newTaskDate });
            setNewTaskDate(null);
          }
        }}
      />
    </div>
  );
}
