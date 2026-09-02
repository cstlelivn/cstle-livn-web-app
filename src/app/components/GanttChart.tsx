import { useState, useRef, useMemo } from "react";
import { Edit2, Trash2, Plus, GripHorizontal, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import {
  DndContext,
  useDraggable,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useApp, type Task } from "./AppContext";
import { useAuth } from "./AuthContext";
import { canEditTask, canDragReschedule } from "../src/features/tasks/permissions";
import { offerSaveDurationToTemplate } from "../src/features/tasks/saveToTemplate";
import { ALL_TASK_STATUSES, getEmployeeActions } from "../src/features/tasks/statusWorkflow";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "./ui/context-menu";
import TaskDialog from "./TaskDialog";
import { toast } from "sonner";
import { formatDate as formatCalendarDate } from "../src/lib/dates";
import { isWorkingDay } from "../src/lib/workDays";
import { useProjectPhases } from "../src/features/projectPhases/useProjectPhases";
import { buildPhasePositionMap } from "../src/lib/taskOrder";

interface GanttChartProps {
  projectId: number | string;
  /** "phase-tasks" (default): task bars grouped under phase headers, reached
   *  from the Tasks tab. "phases": one bar per phase, reached from the
   *  Phases tab -- net new, no phase-level Gantt existed before this. */
  groupBy?: "phase-tasks" | "phases";
  /** Clicking a phase bar (groupBy="phases") opens the phase for editing --
   *  the caller owns that dialog (ProjectDetailsReal.tsx already has one). */
  onEditPhase?: (phase: any) => void;
}

type TaskWithDates = Task & { start_date?: string; phase_id?: string };

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

// A draggable bar/handle. `useDraggable` gives free pixel-position dragging
// (not the `sortable` wrapper, which is for reordering lists) -- exactly
// what a Gantt bar needs. The same DndContext's Pointer/Touch/Keyboard
// sensors (see below) make this touch-capable for free, matching the
// pattern already proven in PhaseView.tsx (react-dnd's HTML5 backend was
// tried there first and abandoned for lacking touch support -- the same
// gap TaskGanttChart.tsx had with its native HTML5 drag/raw-mouse resize).
//
// IMPORTANT: each bar's move-handle and its two resize-handles must be
// SIBLINGS, never nested inside one another. An earlier version nested the
// resize handles inside the move handle's own DraggableHandle -- a known
// dnd-kit gotcha: a pointerdown on the (child) resize strip bubbles up to
// the (parent) move handle's own pointerdown listener, so BOTH draggables'
// sensors can try to claim the same gesture. Which one "won" was a race,
// which is exactly why drags looked like they randomly resized instead of
// moved, or reverted after drop. Rendering all three as absolutely-
// positioned siblings inside one plain (non-draggable) wrapper removes the
// ambiguity entirely -- a pointerdown only ever has one draggable ancestor.
//
// Visual feedback during a drag comes straight from dnd-kit's own
// `transform` (the intended, well-tested way to use useDraggable) -- no
// parallel percentage-based position state is computed here anymore. The
// actual date math on drop always uses dnd-kit's own `event.delta`, which
// is unaffected by whatever this renders during the drag.
function DraggableHandle({ id, data, disabled, className, style, children, title, onClick }: {
  id: string;
  data: Record<string, any>;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  title?: string;
  // A plain click (no real movement) still fires this normally -- browsers
  // don't dispatch `click` after a pointerdown->move->up sequence that
  // actually dragged, so this and the drag listeners coexist safely on the
  // same element without extra bookkeeping.
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data, disabled });
  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      onClick={onClick}
      className={className}
      title={title}
      style={{
        ...style,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: isDragging ? 20 : undefined,
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}

export default function GanttChart({ projectId, groupBy = "phase-tasks", onEditPhase }: GanttChartProps) {
  const { getTasksByProject, getTeamMember, updateTask, deleteTask, getProject, addTask, teamMembers } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { phases, updatePhase } = useProjectPhases(projectId);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [taskDialogMode, setTaskDialogMode] = useState<"add" | "edit">("add");
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null);
  const [labelWidth, setLabelWidth] = useState(240);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Plain mouse/touch resize for the label column -- deliberately not part
  // of the DndContext above (that's for day-based bar scheduling; this is
  // just a pixel width, no dates involved).
  const handleLabelResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    labelResizeRef.current = { startX: e.clientX, startWidth: labelWidth };
    const onMove = (moveEvent: MouseEvent) => {
      const r = labelResizeRef.current;
      if (!r) return;
      const next = Math.min(480, Math.max(120, r.startWidth + (moveEvent.clientX - r.startX)));
      setLabelWidth(next);
    };
    const onUp = () => {
      labelResizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, {})
  );

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
  const canReschedule = canDragReschedule({
    isManagerOrAdmin,
    currentUserId: currentUser?.id,
    teamMembers,
    projectSupervisorId: (project as any)?.supervisorId,
  });

  // A task's "start" is its own start_date when the template/schedule set one;
  // fall back to its due date (a single-day bar) rather than createdAt.
  const taskStart = (task: TaskWithDates) => task.start_date || task.dueDate;
  const phaseStart = (phase: any) => phase.start_date || phase.end_date;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  function dayInfo(d: Date) {
    const dateStr = d.toISOString().split("T")[0];
    return {
      date: dateStr,
      label: `${d.getUTCDate()}`,
      // Every day carries its month, not just the 1st -- the month band
      // header (built from these) needs a key/label for every column so it
      // can group consecutive same-month days into one spanning segment,
      // per the user's explicit request to see the month "all across the
      // top," not just once at the start of each month.
      monthKey: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
      monthLabel: d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      weekdayLabel: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      // Sunday only -- the crew works Monday-Saturday. isWorkingDay is the
      // one shared source of truth for this (src/app/src/lib/workDays.ts);
      // this used to independently flag Saturday as non-working too, which
      // contradicted the real 6-day week the scheduler itself assumes.
      isWeekend: !isWorkingDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))),
      isToday: dateStr === todayStr,
    };
  }

  // Rows to render: either phase bars, or task bars grouped under phase
  // headers -- built once so both the timeline-span calculation and the
  // render pass agree on the same set.
  const phaseGroups = useMemo(() => {
    if (groupBy === "phases") return [];
    const phasePositionById = buildPhasePositionMap(phases);
    const phaseNameById = new Map((phases ?? []).map((p: any) => [String(p.id), p.name]));
    const groups = new Map<string, TaskWithDates[]>();
    for (const task of tasks) {
      const key = task.phase_id ? String(task.phase_id) : "no-phase";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    }
    // Stable row order -- deliberately NOT sorted by date. Sorting by date
    // meant every drag reordered the whole table around the bar you just
    // moved, since the table re-renders with the task's new due date
    // immediately after the drop -- extremely disorienting (you'd lose
    // track of which row you just dragged). Phases don't have this problem
    // because they're always ordered by their own stable `position` field,
    // never by date -- tasks now use the same idea: `sequence` (a manual
    // order, set via the Phases tab's drag-to-reorder) if set, falling back
    // to `id` so ordering is at least consistent across renders.
    //
    // The `id` tiebreak MUST be a string comparison, not `Number(a.id) -
    // Number(b.id)` -- real task ids in this app are UUID strings despite
    // the `Task.id: number` TypeScript type (a known type/DB mismatch
    // elsewhere in this codebase too). `Number(uuid)` is NaN, and a
    // comparator that returns NaN for most pairs (since `sequence` is null
    // on most tasks, so almost everything ties there) produces genuinely
    // UNSTABLE sort output -- different order on every render, which is
    // exactly the "whole table rearranges/flickers on every drag" report.
    for (const list of groups.values()) {
      list.sort((a: any, b: any) => {
        const sa = typeof a.sequence === "number" ? a.sequence : Number.POSITIVE_INFINITY;
        const sb = typeof b.sequence === "number" ? b.sequence : Number.POSITIVE_INFINITY;
        if (sa !== sb) return sa - sb;
        return String(a.id).localeCompare(String(b.id));
      });
    }
    return Array.from(groups.entries())
      .map(([key, list]) => ({
        key,
        name: key === "no-phase" ? "No Phase" : phaseNameById.get(key) || "Phase",
        position: key === "no-phase" ? Number.POSITIVE_INFINITY : phasePositionById[key] ?? 0,
        tasks: list,
      }))
      .sort((a, b) => a.position - b.position);
  }, [groupBy, tasks, phases]);

  const getDaysTimeline = () => {
    if (groupBy === "phases") {
      const dated = (phases ?? []).filter((p: any) => p.start_date || p.end_date);
      if (dated.length === 0) return [];
      const allDates = dated.flatMap((p: any) => [phaseStart(p), p.end_date].filter(Boolean)) as string[];
      const start = new Date(Math.min(...allDates.map((d) => new Date(d).getTime())));
      const end = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));
      start.setUTCDate(start.getUTCDate() - 2);
      end.setUTCDate(end.getUTCDate() + 2);
      const days = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        days.push(dayInfo(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return days;
    }

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
    const start = new Date(Math.min(...allDates.map((d) => new Date(d).getTime())));
    const end = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));
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

  const days = getDaysTimeline();
  const todayIndex = days.findIndex((d) => d.isToday);

  // Group consecutive days into month segments for the month-band header
  // row -- each segment's width is proportional to how many day-columns
  // it covers (flexGrow: count), so "September" visibly spans every
  // September day-column instead of only labeling the 1st.
  const monthBands = useMemo(() => {
    const bands: { key: string; label: string; count: number }[] = [];
    for (const day of days) {
      const last = bands[bands.length - 1];
      if (last && last.key === day.monthKey) {
        last.count++;
      } else {
        bands.push({ key: day.monthKey, label: day.monthLabel, count: 1 });
      }
    }
    return bands;
  }, [days]);

  // Plain, data-driven position -- no live-drag adjustment here. Visual
  // feedback during an active drag comes from dnd-kit's own `transform` on
  // whichever handle is actually being dragged (see DraggableHandle), not
  // from recomputing this. The real commit always reads `event.delta`
  // fresh in handleDragEnd, so this function never needs to know about an
  // in-progress drag at all.
  const getBarPosition = (start: string, due: string) => {
    if (days.length === 0) return { left: "0%", width: "4%" };
    const timelineStart = days[0].date;
    const startOffset = Math.max(0, daysBetween(timelineStart, start));
    const endOffset = Math.max(startOffset + 1, daysBetween(timelineStart, due));
    const duration = endOffset - startOffset;
    return {
      left: `${(startOffset / days.length) * 100}%`,
      width: `${(duration / days.length) * 100}%`,
    };
  };

  // A task/phase shouldn't quietly end up ending on a Sunday -- the crew
  // doesn't work Sundays, so a due/end date landing there is almost always
  // a mis-drag. Ask, rather than silently allow or silently block: OK
  // keeps the Sunday date (a real edge case the user asked to still
  // support), Cancel bumps it to the following Monday.
  //
  // `dateStr` here is `due_date`/`end_date`, which this app treats as an
  // EXCLUSIVE end everywhere (matches applyTemplateToProject's own
  // scheduling: a "1 day" task gets start=Monday, due=Tuesday -- the work
  // itself only happens Monday). So the day actually worked -- and the day
  // the bar visually appears to stop on -- is `dateStr` minus one, not
  // `dateStr` itself. Checking/showing `dateStr` directly here previously
  // asked about the wrong day: a task confirmed to "end Sunday" would
  // visually still stop on Saturday, since the bar's real last day is
  // always one before the stored due/end date.
  const resolveEndDate = (dateStr: string): string => {
    const lastWorkedDay = addDays(dateStr, -1);
    if (new Date(lastWorkedDay).getUTCDay() !== 0) return dateStr;
    const keepSunday = window.confirm(
      `This would end on Sunday, ${formatCalendarDate(lastWorkedDay)}. Click OK to keep it on Sunday, or Cancel to move it to the following Monday instead.`
    );
    return keepSunday ? dateStr : addDays(dateStr, 1);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const data = event.active.data.current as { kind: "move" | "resize-left" | "resize-right"; rowId: string; rowType: "task" | "phase" } | undefined;
    if (!data || !timelineRef.current || days.length === 0) return;
    const pxPerDay = timelineRef.current.getBoundingClientRect().width / days.length;
    if (pxPerDay <= 0) return;
    const deltaDays = Math.round(event.delta.x / pxPerDay);
    if (deltaDays === 0) return;

    if (data.rowType === "task") {
      const t = tasks.find((x) => String(x.id) === data.rowId);
      if (!t) return;
      const start = taskStart(t);
      const due = t.dueDate;
      try {
        if (data.kind === "move") {
          const newDue = resolveEndDate(addDays(due, deltaDays));
          const shift = daysBetween(due, newDue);
          const newStart = addDays(start, deltaDays + shift);
          await updateTask(t.id, { start_date: newStart, dueDate: newDue } as Partial<Task>);
          toast.success(`Task rescheduled to ${formatCalendarDate(newStart)}`);
        } else if (data.kind === "resize-left") {
          let newStart = addDays(start, deltaDays);
          if (daysBetween(newStart, due) < 1) newStart = addDays(due, -1);
          await updateTask(t.id, { start_date: newStart } as Partial<Task>);
          toast.success(`Task now starts ${formatCalendarDate(newStart)}`);
          offerSaveDurationToTemplate(t as any, daysBetween(newStart, due));
        } else {
          let newDue = addDays(due, deltaDays);
          if (daysBetween(start, newDue) < 1) newDue = addDays(start, 1);
          newDue = resolveEndDate(newDue);
          await updateTask(t.id, { dueDate: newDue });
          toast.success(`Task now due ${formatCalendarDate(newDue)}`);
          offerSaveDurationToTemplate(t as any, daysBetween(start, newDue));
        }
      } catch {
        toast.error("Failed to reschedule task");
      }
    } else {
      const p = (phases ?? []).find((x: any) => String(x.id) === data.rowId);
      if (!p) return;
      const start = phaseStart(p);
      const end = p.end_date || p.start_date;
      try {
        if (data.kind === "move") {
          const newEnd = resolveEndDate(addDays(end, deltaDays));
          const shift = daysBetween(end, newEnd);
          const newStart = addDays(start, deltaDays + shift);
          await updatePhase(p.id, { start_date: newStart, end_date: newEnd });
          toast.success(`Phase rescheduled to ${formatCalendarDate(newStart)}`);
        } else if (data.kind === "resize-left") {
          let newStart = addDays(start, deltaDays);
          if (daysBetween(newStart, end) < 1) newStart = addDays(end, -1);
          await updatePhase(p.id, { start_date: newStart });
          toast.success(`Phase now starts ${formatCalendarDate(newStart)}`);
        } else {
          let newEnd = addDays(end, deltaDays);
          if (daysBetween(start, newEnd) < 1) newEnd = addDays(start, 1);
          newEnd = resolveEndDate(newEnd);
          await updatePhase(p.id, { end_date: newEnd });
          toast.success(`Phase now ends ${formatCalendarDate(newEnd)}`);
        }
      } catch {
        toast.error("Failed to reschedule phase");
      }
    }
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

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-success";
      case "In Progress":
        return "bg-primary";
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

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(taskId);
      toast.success("Task deleted");
    } catch (error: any) {
      const blocked = /foreign key|violates|restrict/i.test(error?.message || "");
      toast.error(
        blocked
          ? "Can't delete -- this task has recorded history (assignments, time tracking, or QC records). Mark it Completed instead, or ask an admin to clear its history first."
          : error?.message || "Failed to delete task"
      );
    }
  };

  const handleAddTask = () => {
    setTaskDialogMode("add");
    setSelectedTask(undefined);
    setIsTaskDialogOpen(true);
  };

  const handleDayCellClick = (dayDate: string) => {
    if (groupBy === "phases") return;
    setNewTaskDate(dayDate);
    setTaskDialogMode("add");
    setSelectedTask(undefined);
    setIsTaskDialogOpen(true);
  };

  const emptyState = groupBy === "phases" ? (phases ?? []).length === 0 : tasks.length === 0;

  if (emptyState) {
    return (
      <div className="text-center py-[48px]">
        <p className="text-muted-foreground mb-[16px]">
          {groupBy === "phases"
            ? "No phases yet."
            : "No tasks yet. Create your first task to see it in the Gantt chart."}
        </p>
        {groupBy !== "phases" && (
          <button
            onClick={handleAddTask}
            className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-[8px] mx-auto"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
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

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-background p-[16px] overflow-auto space-y-[16px]" : "space-y-[16px]"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground">Gantt Chart</h3>
          <p className="text-muted-foreground small-text">
            {groupBy === "phases"
              ? "Drag a phase bar to reschedule it, click to open it"
              : "Click on a day to add a task, drag a task bar to reschedule it, click it to open"}
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
            onClick={() => setIsFullscreen((v) => !v)}
            className="p-[8px] rounded-[6px] bg-background border border-border hover:bg-secondary transition-colors"
            title={isFullscreen ? "Exit full screen" : "Full screen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-foreground" /> : <Maximize2 className="w-4 h-4 text-foreground" />}
          </button>
          {groupBy !== "phases" && (
            <button
              onClick={handleAddTask}
              className="px-[12px] py-[6px] bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-[6px]"
            >
              <Plus className="w-3 h-3" />
              Add Task
            </button>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          ref={scrollRef}
          className="border border-border rounded-lg bg-card overflow-auto scroll-smooth"
          style={{ maxHeight: isFullscreen ? "calc(100vh - 120px)" : "70vh" }}
        >
          <div className="min-w-max relative">
            {/* Month band -- sticky to the top of the scroll container so it
                stays visible while scrolling down through many rows; the
                label column corner cell is ALSO sticky to the left, so it
                stays put while scrolling right through many weeks. Solid
                backgrounds (not /alpha) -- transparency let body content
                show through the header while scrolling. */}
            <div className="flex sticky top-0 z-20 bg-secondary border-b border-border h-[22px]">
              <div style={{ width: labelWidth }} className="shrink-0 sticky left-0 z-30 bg-secondary border-r border-border relative">
                <div
                  onMouseDown={handleLabelResizeStart}
                  className="absolute right-[-4px] top-0 bottom-0 w-[9px] cursor-ew-resize hover:bg-accent/40 z-40 flex items-center justify-center"
                  title="Drag to resize the label column"
                >
                  <div className="w-[2px] h-[12px] rounded-full bg-muted-foreground/50" />
                </div>
              </div>
              <div className="flex-1 flex">
                {monthBands.map((band) => (
                  <div
                    key={band.key}
                    style={{ flexGrow: band.count, flexBasis: 0 }}
                    className="min-w-0 flex items-center justify-center border-r border-border/50 overflow-hidden"
                  >
                    <span className="small-text font-bold text-foreground truncate px-[4px]">{band.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day/weekday row -- sticky just below the month band. */}
            <div className="flex border-b border-border bg-secondary sticky top-[22px] z-20">
              <div style={{ width: labelWidth }} className="shrink-0 px-[12px] py-[8px] border-r border-border sticky left-0 z-30 bg-secondary">
                <span className="text-foreground">{groupBy === "phases" ? "Phase" : "Task"}</span>
              </div>
              <div className="flex-1 flex" ref={timelineRef}>
                {days.map((day) => (
                  <div
                    key={day.date}
                    className={`flex-1 min-w-[30px] px-[4px] py-[6px] border-r border-border text-center ${
                      day.isWeekend ? "bg-muted/40" : ""
                    } ${day.isToday ? "bg-accent/10" : ""}`}
                  >
                    <div className={`small-text leading-tight ${day.isToday ? "text-accent" : "text-muted-foreground"}`}>
                      {day.weekdayLabel}
                    </div>
                    <div className={`small-text leading-tight ${day.isToday ? "text-accent font-bold" : day.isWeekend ? "text-muted-foreground" : "text-foreground"}`}>
                      {day.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today marker line, spanning all rows */}
            {todayIndex >= 0 && days.length > 0 && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-accent/60 pointer-events-none z-[5]"
                style={{ left: `calc(${labelWidth}px + (100% - ${labelWidth}px) * ${todayIndex / days.length})` }}
              />
            )}

            {groupBy === "phases" ? (
              <div className="divide-y divide-border/50">
                {(phases ?? []).map((phase: any) => {
                  const start = phaseStart(phase);
                  const end = phase.end_date || phase.start_date;
                  const position = getBarPosition(start, end);
                  return (
                    <div key={phase.id} className="flex hover:bg-secondary/20 transition-colors group">
                      <div style={{ width: labelWidth }} className="shrink-0 px-[12px] py-[10px] border-r border-border flex items-center sticky left-0 z-10 bg-card">
                        <span className="text-foreground truncate small-text">{phase.name}</span>
                      </div>
                      <div className="flex-1 relative flex h-[48px]">
                        {days.map((day) => (
                          <div
                            key={day.date}
                            className={`flex-1 min-w-[30px] border-r border-border/30 ${day.isWeekend ? "bg-muted/10" : ""}`}
                          />
                        ))}
                        {/* Plain positioned wrapper -- NOT itself a draggable.
                            The move/resize handles below are siblings inside
                            it, never nested inside one another. */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-[28px]"
                          style={{ left: position.left, width: position.width }}
                          title={`${phase.name} - ${phase.status}${!canReschedule ? " (Manager/Admin/Supervisor only)" : ""}`}
                        >
                          <DraggableHandle
                            id={`move:phase:${phase.id}`}
                            data={{ kind: "move", rowId: String(phase.id), rowType: "phase" }}
                            disabled={!canReschedule}
                            onClick={onEditPhase ? () => onEditPhase(phase) : undefined}
                            className={`absolute inset-0 rounded flex items-center px-[8px] gap-[4px] shadow-sm ${getPhaseStatusColor(
                              phase.status
                            )} border-2 border-muted-foreground ${canReschedule ? "cursor-move" : "cursor-not-allowed"} ${onEditPhase ? "hover:opacity-90" : ""}`}
                          >
                            <GripHorizontal className="w-3 h-3 text-white/70 shrink-0" />
                            <span className="text-white small-text truncate flex-1">{phase.name}</span>
                          </DraggableHandle>
                          {canReschedule && (
                            <DraggableHandle
                              id={`resize-left:phase:${phase.id}`}
                              data={{ kind: "resize-left", rowId: String(phase.id), rowType: "phase" }}
                              className="absolute left-0 top-0 bottom-0 w-[8px] z-10 cursor-ew-resize hover:bg-white/30 rounded-l"
                              title="Drag to change start date"
                            />
                          )}
                          {canReschedule && (
                            <DraggableHandle
                              id={`resize-right:phase:${phase.id}`}
                              data={{ kind: "resize-right", rowId: String(phase.id), rowType: "phase" }}
                              className="absolute right-0 top-0 bottom-0 w-[8px] z-10 cursor-ew-resize hover:bg-white/30 rounded-r"
                              title="Drag to change end date"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {phaseGroups.map((group) => (
                  <div key={group.key}>
                    <div className="flex bg-secondary/70">
                      <div style={{ width: labelWidth }} className="shrink-0 px-[12px] py-[6px] border-r border-border sticky left-0 z-10 bg-secondary/70">
                        <span className="font-['Roboto_Mono'] font-bold text-[10px] text-foreground uppercase tracking-wide">
                          {group.name}
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

                    <div className="divide-y divide-border/50">
                      {group.tasks.map((task) => {
                        const assignee = task.assignee ? getTeamMember(task.assignee) : null;
                        const position = getBarPosition(taskStart(task), task.dueDate);
                        const canEdit = canEditThisTask(task);
                        const canDrag = canReschedule;

                        return (
                          <div key={task.id} className="flex hover:bg-secondary/20 transition-colors group">
                            <div style={{ width: labelWidth }} className="shrink-0 px-[12px] py-[10px] border-r border-border flex items-center justify-between gap-[8px] sticky left-0 z-10 bg-card">
                              <div className="flex-1 min-w-0 pl-[8px]">
                                <div className="text-foreground truncate small-text">{task.title}</div>
                                {assignee && (
                                  <div className="text-muted-foreground small-text truncate">{assignee.name}</div>
                                )}
                              </div>
                              <div className="flex gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => handleEditTask(task)} className="p-[4px] hover:bg-secondary rounded" title="Edit task">
                                  <Edit2 className="w-3 h-3 text-muted-foreground" />
                                </button>
                                <button onClick={() => handleDeleteTask(task.id)} className="p-[4px] hover:bg-destructive/10 rounded" title="Delete task">
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </button>
                              </div>
                            </div>

                            <div className="flex-1 relative flex h-[48px]">
                              {days.map((day) => (
                                <div
                                  key={day.date}
                                  className={`flex-1 min-w-[30px] border-r border-border/30 ${
                                    day.isWeekend ? "bg-muted/10" : ""
                                  } cursor-pointer hover:bg-accent/5 transition-colors`}
                                  onClick={() => handleDayCellClick(day.date)}
                                />
                              ))}

                              <ContextMenu>
                                <ContextMenuTrigger asChild>
                                  {/* Plain positioned wrapper -- NOT itself a
                                      draggable. The move/resize handles below
                                      are siblings inside it, never nested
                                      inside one another (nesting caused a
                                      race between their pointer-event
                                      listeners -- a drag would randomly
                                      resize instead of move, or fail to
                                      commit at all). */}
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 h-[28px]"
                                    style={{ left: position.left, width: position.width }}
                                    title={`${task.title} - ${task.status}${!canDrag ? " (Manager/Admin/Supervisor only)" : ""} -- right-click to change status`}
                                  >
                                    <DraggableHandle
                                      id={`move:task:${task.id}`}
                                      data={{ kind: "move", rowId: String(task.id), rowType: "task" }}
                                      disabled={!canDrag}
                                      onClick={() => handleEditTask(task)}
                                      className={`absolute inset-0 rounded flex items-center px-[8px] gap-[4px] hover:opacity-90 transition-opacity shadow-sm ${getStatusColor(
                                        task.status
                                      )} ${getPriorityColor(task.priority)} border-2 ${canDrag ? "cursor-move" : "cursor-not-allowed"}`}
                                    >
                                      <GripHorizontal className="w-3 h-3 text-white/70 shrink-0" />
                                      <span className="text-white small-text truncate flex-1">{task.title}</span>
                                    </DraggableHandle>
                                    {canDrag && (
                                      <DraggableHandle
                                        id={`resize-left:task:${task.id}`}
                                        data={{ kind: "resize-left", rowId: String(task.id), rowType: "task" }}
                                        className="absolute left-0 top-0 bottom-0 w-[8px] z-10 cursor-ew-resize hover:bg-white/30 rounded-l"
                                        title="Drag to change start date"
                                      />
                                    )}
                                    {canDrag && (
                                      <DraggableHandle
                                        id={`resize-right:task:${task.id}`}
                                        data={{ kind: "resize-right", rowId: String(task.id), rowType: "task" }}
                                        className="absolute right-0 top-0 bottom-0 w-[8px] z-10 cursor-ew-resize hover:bg-white/30 rounded-r"
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
                                      return <ContextMenuItem disabled>{task.status} — waiting on a supervisor or QC</ContextMenuItem>;
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
            )}
          </div>
        </div>
      </DndContext>

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
