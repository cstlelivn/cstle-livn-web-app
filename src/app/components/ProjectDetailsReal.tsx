import { useState, useEffect, useMemo } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import { 
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  User,
  Plus,
  Search,
  Circle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users as UsersIcon,
  Tag,
  Check,
  X,
  List,
  Grid3x3,
  Kanban,
  BarChart2
  ,FolderOpen
} from "lucide-react";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { useTaskAssignees, assigneeIdsForTask } from "../src/features/taskAssignees/useTaskAssignees";
import { useWorkSessions } from "../src/features/workSessions/useWorkSessions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import TaskDialog from "./TaskDialog";
import TaskKanban from "./TaskKanban";
import TaskStatusControl from "./TaskStatusControl";
import TaskGanttChart from "./TaskGanttChart";
import EditProjectPhasesDialog from "./EditProjectPhasesDialog";
import EmailUpdateModal from "./EmailUpdateModal";
import PhaseView from "./PhaseView";
import ProjectHealthSummary from "./ProjectHealthSummary";
import ForceCompleteProjectDialog from "./ForceCompleteProjectDialog";
import { toast } from "sonner";
import { getClient } from "../src/features/clients/api";
import { useProjectPhases } from "../src/features/projectPhases/useProjectPhases";
import { markProjectComplete } from "../src/features/projects/api";
import { formatDate } from "../src/lib/dates";
import { canEditTask } from "../src/features/tasks/permissions";
import { ALL_TASK_STATUSES, getEmployeeActions } from "../src/features/tasks/statusWorkflow";
import { calculateCompletion } from "../src/lib/progress";
import { sortTasksByPhase } from "../src/lib/taskOrder";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "./ui/context-menu";
import ProjectEvidenceHub from './ProjectEvidenceHub';

// Task type definition
interface AppTask {
  id: number;
  title: string;
  description: string;
  status: "To Do" | "In Progress" | "Under Review" | "Pending QC" | "Completed";
  priority: "Low" | "Medium" | "High" | "Urgent";
  assignee: number;
  dueDate: string;
  progress: number;
  tags: string[];
  project_id?: number;
  created_at?: string;
  updated_at?: string;
}

interface PhaseWithDuration {
  name: string;
  days: number;
}

// Default phases for Cstle Livn
const DEFAULT_PHASES: PhaseWithDuration[] = [
  { name: "Planning", days: 3 },
  { name: "Prepping", days: 5 },
  { name: "Production", days: 10 },
  { name: "Finishing", days: 5 },
  { name: "Final Inspection", days: 2 },
  { name: "Delivered/Completed", days: 1 },
];

// Get phases from localStorage or use defaults. Guarded against corrupted
// storage (interrupted write, quota error, manual tampering) -- an unguarded
// JSON.parse here ran during a useState initializer, so a parse error threw
// on every render with no recovery path, blanking the whole Project Details
// page.
function getProjectPhases(): PhaseWithDuration[] {
  const saved = localStorage.getItem("project_phases");
  if (!saved) return DEFAULT_PHASES;
  try {
    return JSON.parse(saved);
  } catch {
    return DEFAULT_PHASES;
  }
}

// Calculate project progress from task completion (task-based, not time-based).
// Delegates to the shared utility -- task.progress is a separate field that
// nothing ever updates when status changes, so averaging it was permanently
// stuck near 0 regardless of how many tasks were actually completed.
function calculateProgressFromTasks(tasks: { status?: string }[]): number {
  return calculateCompletion(tasks).percent;
}

interface ProjectDetailsProps {
  projectId: number;
  onBack: () => void;
}

export default function ProjectDetails({ projectId, onBack }: ProjectDetailsProps) {
  const {
    getProject,
    getTasksByProject,
    teamMembers,
    getTeamMember,
    addTask,
    updateTask,
    deleteTask,
    deleteProject,
    updateProject,
    activities,
    projects,
    isLoadingProjects,
  } = useApp();

  const { currentUser, hasPermission } = useAuth();
  const { taskAssignees } = useTaskAssignees(true);
  const { workSessions } = useWorkSessions(true);
  const currentTeamMember = teamMembers.find((member: any) => String(member.authUserId) === String(currentUser?.id));
  const [forceCompleteOpen, setForceCompleteOpen] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Use useMemo to memoize the project lookup and prevent re-execution on every render
  const project = useMemo(() => {
    return getProject(projectId);
  }, [projectId, projects]); // Only re-run when projectId or projects array changes
  const canCreateTask = hasPermission("canEditProjects") || (
    currentUser?.role === "Supervisor"
    && String(currentTeamMember?.id) === String((project as any)?.supervisorId)
  );
  
  const [taskView, setTaskView] = useState<"list" | "grid" | "calendar" | "kanban" | "gantt">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentTab, setCurrentTab] = useState<"tasks" | "phases" | "record">("tasks");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AppTask | undefined>(undefined);
  const [taskDialogMode, setTaskDialogMode] = useState<"add" | "edit">("add");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Phase editing state
  const [isEditingPhase, setIsEditingPhase] = useState(false);
  const [editedPhase, setEditedPhase] = useState("");
  const [isManagePhasesOpen, setIsManagePhasesOpen] = useState(false);
  
  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalData, setEmailModalData] = useState<{
    type: "phase" | "status";
    oldValue: string;
    newValue: string;
  } | null>(null);
  const [clientEmail, setClientEmail] = useState<string>("");
  
  // Normalized project phases from project_phases table
  const { phases: normalizedPhases } = useProjectPhases(projectId);
  // Legacy fallback: use JSON phases if no normalized phases exist yet
  const projectPhases = project?.phases && project.phases.length > 0
    ? project.phases
    : getProjectPhases();
  const allProjectTasks = getTasksByProject(projectId);
  // Associates (no canViewAllProjects) only see their own tasks within a
  // project they're part of -- previously every role saw the project's
  // entire task list once they had access to the project at all.
  const myTeamMember = teamMembers.find((m: any) => String(m.authUserId) === String(currentUser?.id));
  const projectTasks = hasPermission("canViewAllProjects")
    ? allProjectTasks
    : allProjectTasks.filter((t: any) => myTeamMember && String(t.assignee) === String(myTeamMember.id));

  // The "Phase" summary card shows THIS phase's own completion, not the
  // whole project's -- match by phase_id first (normalized), falling back to
  // the legacy phase-name string field, same pairing PhaseView.tsx uses.
  const currentPhaseEntry = normalizedPhases.find((p: any) => p.name === project?.phase);
  const currentPhaseTasks = projectTasks.filter((t: any) =>
    currentPhaseEntry ? t.phase_id === currentPhaseEntry.id : t.phase === project?.phase
  );
  const currentPhaseProgress = calculateCompletion(currentPhaseTasks).percent;

  const incompletePhaseCount = normalizedPhases.filter((p: any) => p.status !== "Completed").length;
  const allPhasesComplete = normalizedPhases.length > 0 && incompletePhaseCount === 0;
  const incompleteTaskCount = allProjectTasks.filter((task: any) => task.status !== "Completed").length;
  const readyToClose = allPhasesComplete && incompleteTaskCount === 0;
  // Once every phase is done, the card should read "Project Complete" at
  // 100% instead of whatever the last active phase's name happened to be.
  const phaseCardLabel = allPhasesComplete ? "Project Complete" : project?.phase;
  const phaseCardProgress = allPhasesComplete ? 100 : currentPhaseProgress;
  const canForceComplete = hasPermission("canForceCompleteProjects");
  const canCloseProject = hasPermission("canEditProjects");

  const handleMarkComplete = async () => {
    if (!currentUser) return;
    setMarkingComplete(true);
    try {
      await markProjectComplete(String(projectId), String(currentUser.id));
      toast.success("Project marked complete");
    } catch (e: any) {
      toast.error(e.message || "Failed to mark project complete");
    } finally {
      setMarkingComplete(false);
    }
  };

  if (!project) {
    // Don't show "not found" while the project list is still loading -- that
    // was the cause of a real bug where opening a project right after
    // navigating in showed a false "not found" until you went back and
    // clicked again (the list just hadn't finished loading yet).
    if (isLoadingProjects) {
      return (
        <div className="p-[32px] text-center">
          <p className="font-['Roboto_Mono'] font-normal text-[14px] text-muted-foreground">
            Loading project…
          </p>
        </div>
      );
    }
    return (
      <div className="p-[32px] text-center">
        <p className="font-['Roboto_Mono'] font-normal text-[14px] text-muted-foreground">
          Project not found
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px]"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Live from actual task assignees, not project.team -- that array is only
  // ever initialized empty at project creation and nothing writes to it
  // afterward, so it never reflected who was really assigned to work here.
  const assignedTeamIds = [...new Set(projectTasks.map((t: any) => t.assignee).filter(Boolean))];
  const projectTeam = assignedTeamIds.map((id) => getTeamMember(id)).filter(Boolean);

  // Load client email when project loads
  useEffect(() => {
    const loadClientEmail = async () => {
      if (project?.clientId) {
        try {
          const clientData = await getClient(project.clientId);
          if (clientData?.email) {
            setClientEmail(clientData.email);
          }
        } catch (error: any) {
          // Handle JWT expiration and other errors gracefully
          // The email field in the modal will be empty and user can fill it manually
          console.warn("Could not load client email:", error?.message || error);
          setClientEmail("");
        }
      }
    };
    
    loadClientEmail();
  }, [project?.clientId]);

  // Filter tasks
  const filteredTasks = projectTasks.filter((task) => {
    // Matches if the filtered person is ANY of the task's assignees, not
    // just the single "primary" one -- a task assigned to both Demilade and
    // MJ should show up when filtering by either name.
    const taskAssigneeNames = assigneeIdsForTask(taskAssignees, task.id)
      .map((id) => getTeamMember(id)?.name)
      .filter(Boolean);
    const matchesSearch =
      (task.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesAssignee = filterAssignee === "all" || taskAssigneeNames.includes(filterAssignee);

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });
  // Work order, not edit order: the phase currently being worked comes
  // first (matching the Phase summary card above), then due date within a
  // phase -- so "task five of the phase we're on" is where the list starts,
  // not wherever it happens to fall by date or last edit.
  const sortedFilteredTasks = sortTasksByPhase(filteredTasks, normalizedPhases);

  const handleDeleteProject = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteProject = async () => {
    try {
      await deleteProject(projectId);
      toast.success("Project deleted");
      setDeleteConfirmOpen(false);
      onBack();
    } catch (error) {
      toast.error("Failed to delete project");
      setDeleteConfirmOpen(false);
    }
  };

  const handleAddTask = () => {
    setTaskDialogMode("add");
    setSelectedTask(undefined);
    setIsTaskDialogOpen(true);
  };

  const handleEditTask = (task: AppTask) => {
    setTaskDialogMode("edit");
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTask(taskId);
  };
  
  // Handle phase editing
  const handleEditPhase = () => {
    setEditedPhase(project.phase);
    setIsEditingPhase(true);
  };
  
  const handleSavePhase = async () => {
    if (!editedPhase || editedPhase === project.phase) {
      setIsEditingPhase(false);
      return;
    }
    
    const oldPhase = project.phase;
    
    // Recalculate progress from tasks
    const newProgress = calculateProgressFromTasks(projectTasks);

    // Update project with new phase and progress
    await updateProject(projectId, {
      phase: editedPhase,
      progress: newProgress,
    });
    
    setIsEditingPhase(false);
    toast.success(`Phase updated to "${editedPhase}" (${newProgress}% complete)`);
    
    // Trigger email modal after successful phase update
    setEmailModalData({
      type: "phase",
      oldValue: oldPhase,
      newValue: editedPhase,
    });
    setIsEmailModalOpen(true);
  };
  
  const handleCancelPhaseEdit = () => {
    setIsEditingPhase(false);
    setEditedPhase("");
  };

  const getPriorityColor = (priority: AppTask["priority"]) => {
    switch (priority) {
      case "Urgent":
        return "bg-destructive/10 text-destructive";
      case "High":
        return "bg-warning/10 text-warning";
      case "Medium":
        return "bg-accent/10 text-accent";
      default:
        return "bg-muted/10 text-muted-foreground";
    }
  };

  const TaskListItem = ({ task, onEdit }: { task: AppTask; onEdit: (task: AppTask) => void }) => {
    const assignee = getTeamMember(task.assignee);
    const isManagerOrAdmin = hasPermission("canEditProjects");
    const canApproveQC = hasPermission("canApproveTaskQC");
    const taskAssigneeIds = assigneeIdsForTask(taskAssignees, task.id);
    const extraAssigneeCount = Math.max(0, taskAssigneeIds.length - 1);
    const canEdit = canEditTask({
      task,
      currentUserId: currentUser?.id,
      isManagerOrAdmin,
      teamMembers,
      assigneeIds: taskAssigneeIds,
    });
    const durationDays = (task as any).start_date && task.dueDate
      ? Math.max(1, daysBetweenUTC((task as any).start_date, task.dueDate))
      : null;
    const actualHours = workSessions
      .filter((session: any) => String(session.taskId) === String(task.id))
      .reduce((sum: number, session: any) => sum + Number(session.activeSeconds || 0), 0) / 3600;
    const supervisor = getTeamMember((task as any).supervisor_id || (project as any)?.supervisorId);

    const handleAssigneeChange = async (memberId: string) => {
      try {
        await updateTask(task.id, { assignee: memberId } as Partial<AppTask>);
        toast.success("Task reassigned");
      } catch (error) {
        toast.error("Failed to reassign task");
      }
    };

    const assigneeControl = (
      <div className="flex items-center gap-[4px] min-w-0">
        {isManagerOrAdmin ? (
          <Select value={String(task.assignee || "")} onValueChange={handleAssigneeChange}>
            <SelectTrigger
              className="h-[28px] px-[6px] gap-[6px] border border-transparent bg-transparent shadow-none text-[11px] rounded-[6px] cursor-pointer hover:bg-accent/10 hover:border-accent/30 transition-colors"
              title="Click to reassign (primary assignee) -- open the task to add/remove others"
            >
              <User className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate">{assignee?.name || "Unassigned"}</span>
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((m: any) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-[6px] min-w-0" title="Only Managers/Super Admins can reassign tasks">
            <User className="w-3 h-3 text-muted-foreground shrink-0" />
            <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground truncate">
              {assignee?.name}
            </p>
          </div>
        )}
        {extraAssigneeCount > 0 && (
          <span
            className="shrink-0 px-[6px] py-[1px] rounded-full bg-accent/10 text-accent text-[9px] font-['Roboto_Mono'] font-medium"
            title={`${extraAssigneeCount} more ${extraAssigneeCount === 1 ? "person" : "people"} assigned -- open the task to see everyone`}
          >
            +{extraAssigneeCount}
          </span>
        )}
      </div>
    );

    const editDeleteButtons = (
      <>
        <button
          onClick={() => onEdit(task)}
          className="p-[6px] rounded-[4px] hover:bg-accent/10 transition-colors"
          title="Edit task"
        >
          <Edit2 className="w-3 h-3 text-muted-foreground hover:text-accent" />
        </button>

        <button
          onClick={() => handleDeleteTask(task.id)}
          className="p-[6px] rounded-[4px] hover:bg-destructive/10 transition-colors"
          title="Delete task"
        >
          <Trash2 className="w-3 h-3 text-destructive" />
        </button>
      </>
    );

    const priorityPill = (
      <div
        className={`px-[12px] py-[4px] rounded-full text-[10px] font-['Roboto_Mono'] font-medium text-center shrink-0 ${getPriorityColor(
          task.priority
        )}`}
      >
        {task.priority}
      </div>
    );

    const dueDateRow = (
      <div className="flex items-center gap-[6px] min-w-0">
        <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
        <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground truncate">
          {task.dueDate ? formatDate(task.dueDate) : "No due date"}
        </p>
      </div>
    );

    const durationRow = durationDays !== null && (
      <div className="flex items-center gap-[6px]" title="Expected duration">
        <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
        <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
          {durationDays}d
        </p>
      </div>
    );

    return (
      <>
        {/* Mobile card: task title leads, everything else stacks below it --
            the fixed-px desktop grid columns below have no room on a phone
            screen and were pushing the title itself off-screen. */}
        <div className="md:hidden flex flex-col gap-[10px] p-[16px] bg-card border border-border rounded-[8px] hover:shadow-sm transition-all">
          <div className="flex items-start justify-between gap-[8px]">
            <div className="min-w-0 flex-1">
              <h4 className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground mb-[2px] break-words">
                {task.title}
              </h4>
              {task.description && (
                <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground truncate">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-[2px] shrink-0">{editDeleteButtons}</div>
          </div>

          <div className="flex items-center flex-wrap gap-[8px]">
            <TaskStatusControl
              status={task.status}
              canEdit={canEdit}
              canApproveQC={canApproveQC}
              onChange={(status) => updateTask(task.id, { status })}
              showLabel
            />
            {priorityPill}
          </div>

          <div className="flex items-center flex-wrap gap-x-[16px] gap-y-[6px]">
            {assigneeControl}
            {dueDateRow}
            {durationRow}
          </div>
          <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
            {(task as any).phase || 'No phase'} · Crew {(task as any).crew_required || '—'} · Supervisor: {supervisor?.name || 'Not assigned'} · Est. {Number((task as any).estimated_hours || 0).toFixed(1)}h · Actual {actualHours.toFixed(1)}h
          </p>
        </div>

        {/* Desktop row: fixed-width grid columns instead of flex+min-w --
            min-w is only a floor, so a wider status pill ("In Progress") vs
            a narrower one ("To Do") on different rows still shifted every
            column after it out of alignment. A shared grid template keeps
            every row's columns lined up regardless of what each cell's own
            content measures. */}
        <div
          className="hidden md:grid items-center gap-[12px] p-[16px] bg-card border border-border rounded-[8px] hover:shadow-sm transition-all group"
          style={{ gridTemplateColumns: "1fr 130px 140px 110px 50px 90px 68px" }}
        >
          <div className="min-w-0">
            <h4 className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground mb-[4px] truncate">
              {task.title}
            </h4>
            <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground truncate">
              {task.description}
            </p>
            <p className="mt-1 font-['Roboto_Mono'] text-[9px] text-muted-foreground truncate">{(task as any).phase || 'No phase'} · Crew {(task as any).crew_required || '—'} · {supervisor?.name || 'No supervisor'} · {Number((task as any).estimated_hours || 0).toFixed(1)}h / {actualHours.toFixed(1)}h actual</p>
          </div>

          <TaskStatusControl
            status={task.status}
            canEdit={canEdit}
            canApproveQC={canApproveQC}
            onChange={(status) => updateTask(task.id, { status })}
            showLabel
          />

          <div className="w-full">{assigneeControl}</div>

          {dueDateRow}

          {durationRow}

          {priorityPill}

          <div className="flex items-center justify-end gap-[4px]">
            {editDeleteButtons}
          </div>
        </div>
      </>
    );
  };

  const TaskGridItem = ({ task, onEdit }: { task: AppTask; onEdit: (task: AppTask) => void }) => {
    const assignee = getTeamMember(task.assignee);
    const isManagerOrAdmin = hasPermission("canEditProjects");
    const canApproveQC = hasPermission("canApproveTaskQC");
    const taskAssigneeIds = assigneeIdsForTask(taskAssignees, task.id);
    const extraAssigneeCount = Math.max(0, taskAssigneeIds.length - 1);
    const canEdit = canEditTask({
      task,
      currentUserId: currentUser?.id,
      isManagerOrAdmin,
      teamMembers,
      assigneeIds: taskAssigneeIds,
    });
    const durationDays = (task as any).start_date && task.dueDate
      ? Math.max(1, daysBetweenUTC((task as any).start_date, task.dueDate))
      : null;

    const handleAssigneeChange = async (memberId: string) => {
      try {
        await updateTask(task.id, { assignee: memberId } as Partial<AppTask>);
        toast.success("Task reassigned");
      } catch (error) {
        toast.error("Failed to reassign task");
      }
    };

    return (
      <div className="bg-card border border-border rounded-[20px] p-[20px] hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-[12px]">
          <div className="flex-1 min-w-0">
            <h4 className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground mb-[4px]">
              {task.title}
            </h4>
            <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-[6px] mb-[12px]">
          {(task.tags || []).map((tag) => (
            <div
              key={tag}
              className="px-[8px] py-[2px] bg-secondary rounded-[4px] text-[10px] font-['Roboto_Mono'] font-medium text-foreground"
            >
              {tag}
            </div>
          ))}
        </div>

        <div className="space-y-[8px] mb-[12px]">
          <TaskStatusControl
            status={task.status}
            canEdit={canEdit}
            canApproveQC={canApproveQC}
            onChange={(status) => updateTask(task.id, { status })}
            showLabel
          />

          <div className="flex items-center gap-[4px]">
            {isManagerOrAdmin ? (
              <Select value={String(task.assignee || "")} onValueChange={handleAssigneeChange}>
                <SelectTrigger
                  className="flex-1 min-w-0 h-[24px] px-[2px] gap-[6px] border border-transparent bg-transparent shadow-none text-[11px] justify-start rounded-[6px] cursor-pointer hover:bg-accent/10 hover:border-accent/30 transition-colors"
                  title="Click to reassign (primary assignee) -- open the task to add/remove others"
                >
                  <User className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{assignee?.name || "Unassigned"}</span>
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-[6px]">
                <User className="w-3 h-3 text-muted-foreground" />
                <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
                  {assignee?.name}
                </p>
              </div>
            )}
            {extraAssigneeCount > 0 && (
              <span
                className="shrink-0 px-[6px] py-[1px] rounded-full bg-accent/10 text-accent text-[9px] font-['Roboto_Mono'] font-medium"
                title={`${extraAssigneeCount} more ${extraAssigneeCount === 1 ? "person" : "people"} assigned`}
              >
                +{extraAssigneeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-[6px]">
            <CalendarIcon className="w-3 h-3 text-muted-foreground" />
            <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
              Due: {task.dueDate ? formatDate(task.dueDate) : "No due date"}
              {durationDays !== null && ` · ${durationDays}d`}
            </p>
          </div>
          <div className="flex items-center gap-[6px]">
            <div
              className={`px-[12px] py-[4px] rounded-full text-[10px] font-['Roboto_Mono'] font-medium ${getPriorityColor(
                task.priority
              )}`}
            >
              {task.priority}
            </div>
          </div>
        </div>

        <div className="flex gap-[8px] mt-[16px]">
          <button
            onClick={() => onEdit(task)}
            className="flex-1 px-[12px] py-[6px] bg-accent text-accent-foreground border border-accent rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-medium text-[11px] flex items-center justify-center gap-[6px]"
            title="Edit task"
          >
            <Edit2 className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="px-[12px] py-[6px] bg-destructive/10 border border-destructive/20 rounded-[6px] hover:bg-destructive/20 transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>
      </div>
    );
  };

  const daysLeft = Math.ceil(
    (new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="flex flex-col gap-[20px] md:gap-[29px] w-full p-[16px] md:p-[32px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-[16px]">
        <div className="flex items-start gap-[12px] md:gap-[16px] min-w-0">
          <button
            onClick={onBack}
            className="p-[8px] hover:bg-card rounded-[6px] transition-colors mt-1 shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="min-w-0">
            <h1 className="break-words" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
              {project.title}
            </h1>
            <div className="flex items-center flex-wrap gap-x-[12px] gap-y-[2px]">
              <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
                Client: {project.client}
              </p>
              <span className="hidden sm:inline text-muted-foreground">•</span>
              <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
                {project.location}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[12px] flex-wrap">
          <div
            className={`px-[16px] py-[8px] rounded-full text-[11px] font-['Roboto_Mono'] font-medium ${
              project.status === "In Progress"
                ? "bg-accent/10 text-accent"
                : project.status === "Delayed"
                ? "bg-destructive/10 text-destructive"
                : project.status === "Completed"
                ? "bg-success/10 text-success"
                : "bg-muted/10 text-muted-foreground"
            }`}
          >
            {project.status}
          </div>
          {project.status !== "Completed" && canCloseProject && (
            <button
              onClick={handleMarkComplete}
              disabled={!readyToClose || markingComplete}
              title={readyToClose ? undefined : `${incompletePhaseCount} incomplete phase(s) · ${incompleteTaskCount} open task(s)`}
              className="px-[14px] py-[8px] rounded-[6px] text-[11px] font-['Roboto_Mono'] font-medium bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {markingComplete ? "Completing…" : "Mark Complete"}
            </button>
          )}
          {project.status !== "Completed" && readyToClose && !canCloseProject && (
            <span className="px-[12px] py-[7px] rounded-full bg-success/10 text-success border border-success/20 font-['Roboto_Mono'] text-[10px]">
              Ready for Manager/Admin close-out
            </span>
          )}
          {project.status !== "Completed" && canForceComplete && (
            <button
              onClick={() => setForceCompleteOpen(true)}
              className="px-[14px] py-[8px] rounded-[6px] text-[11px] font-['Roboto_Mono'] font-medium bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-colors"
            >
              Force Complete
            </button>
          )}
          {hasPermission("canEditProjects") && (
            <button
              onClick={handleDeleteProject}
              className="p-[8px] rounded-[6px] bg-background border border-border hover:bg-destructive hover:border-destructive hover:text-white transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <ForceCompleteProjectDialog
        open={forceCompleteOpen}
        onOpenChange={setForceCompleteOpen}
        projectId={String(projectId)}
        incompletePhaseCount={incompletePhaseCount}
        onComplete={() => {}}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        <div className="bg-card border border-border rounded-[20px] p-[20px]">
          <div className="flex items-center gap-[12px] mb-[12px]">
            <div className="p-[10px] rounded-[8px] bg-accent/10">
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                Tasks
              </p>
              <h3 className="font-['Roboto_Mono'] font-bold text-[15px] text-foreground mt-[2px]">
                {projectTasks.filter(t => t.status === "Completed").length} / {projectTasks.length}
              </h3>
            </div>
          </div>
          <div className="space-y-[6px]">
            <div className="flex items-center justify-between text-[11px]">
              <p className="font-['Roboto_Mono'] font-normal text-muted-foreground">Completed</p>
              <p className="font-['Roboto_Mono'] font-bold text-foreground">
                {calculateProgressFromTasks(projectTasks)}%
              </p>
            </div>
            <div className="h-[6px] bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${calculateProgressFromTasks(projectTasks)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-[20px] p-[20px]">
          <div className="flex items-center gap-[12px] mb-[12px]">
            <div className="p-[10px] rounded-[8px] bg-accent/10">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                Timeline
              </p>
              <h4 className="font-['Roboto_Mono'] font-bold text-[15px] text-foreground mt-[2px]">
                {daysLeft} days left
              </h4>
            </div>
          </div>
          <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">
            {project.startDate ? formatDate(project.startDate) : "—"} → {project.endDate ? formatDate(project.endDate) : "—"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-[20px] p-[20px]">
          <div className="flex items-center gap-[12px] mb-[12px]">
            <div className="p-[10px] rounded-[8px] bg-accent/10">
              <UsersIcon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                Team
              </p>
              <h3 className="font-['Roboto_Mono'] font-bold text-[15px] text-foreground mt-[2px]">
                {projectTeam.length}
              </h3>
            </div>
          </div>
          <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground truncate">
            {projectTeam.length > 0 ? projectTeam.map((m) => m.name).join(", ") : "No team members assigned"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-[20px] p-[20px]">
          <div className="flex items-center justify-between gap-[12px] mb-[12px]">
            <div className="flex items-center gap-[12px]">
              <div className="p-[10px] rounded-[8px] bg-accent/10">
                <Tag className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                  Phase
                </p>
                {!isEditingPhase ? (
                  <h4 className="font-['Roboto_Mono'] font-bold text-[15px] text-foreground mt-[2px]">
                    {phaseCardLabel}
                  </h4>
                ) : (
                  <Select
                    value={editedPhase}
                    onValueChange={setEditedPhase}
                  >
                    <SelectTrigger className="w-[180px] h-[28px] mt-[2px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projectPhases.map((phase) => (
                        <SelectItem key={phase.name} value={phase.name}>
                          {phase.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {!isEditingPhase ? (
              <button
                onClick={handleEditPhase}
                className="p-[6px] rounded-[4px] hover:bg-accent/10 transition-colors"
                title="Edit phase"
              >
                <Edit2 className="w-3 h-3 text-accent" />
              </button>
            ) : (
              <div className="flex gap-[4px]">
                <button
                  onClick={handleSavePhase}
                  className="p-[6px] rounded-[4px] bg-accent/10 hover:bg-accent/20 transition-colors"
                  title="Save"
                >
                  <Check className="w-3 h-3 text-accent" />
                </button>
                <button
                  onClick={handleCancelPhaseEdit}
                  className="p-[6px] rounded-[4px] bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  title="Cancel"
                >
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            )}
          </div>
          <div className="space-y-[6px]">
            <div className="flex items-center justify-between text-[11px]">
              <p className="font-['Roboto_Mono'] font-normal text-muted-foreground">Progress</p>
              <p className="font-['Roboto_Mono'] font-bold text-foreground">
                {phaseCardProgress}%
              </p>
            </div>
            <div className="h-[6px] bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${phaseCardProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tasks & Phases Section — tasks lead the project, so this comes first */}
      <Tabs value={currentTab} onValueChange={(value: any) => setCurrentTab(value)} className="flex flex-col gap-[20px]">
        <div className="flex items-center justify-between">
          <TabsList className="bg-card border border-border rounded-[10px] p-[3px] h-auto">
            <TabsTrigger
              value="tasks"
              className="flex items-center gap-[6px] px-[14px] py-[8px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-[7px] transition-colors font-['Roboto_Mono'] text-[11px]"
            >
              <List className="w-[13px] h-[13px]" />
              Tasks
            </TabsTrigger>
            <TabsTrigger
              value="phases"
              className="flex items-center gap-[6px] px-[14px] py-[8px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-[7px] transition-colors font-['Roboto_Mono'] text-[11px]"
            >
              <Kanban className="w-[13px] h-[13px]" />
              Phases
            </TabsTrigger>
            <TabsTrigger
              value="record"
              className="flex items-center gap-[6px] px-[14px] py-[8px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-[7px] transition-colors font-['Roboto_Mono'] text-[11px]"
            >
              <FolderOpen className="w-[13px] h-[13px]" />
              Files & Activity
            </TabsTrigger>
          </TabsList>

          {currentTab === "tasks" && project.status !== "Completed" && canCreateTask && (
            <button
              onClick={handleAddTask}
              className="flex items-center gap-[8px] px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <p className="font-['Roboto_Mono'] font-medium text-[14px]">Add Task</p>
            </button>
          )}
        </div>
        
        <TabsContent value="tasks" className="mt-0 space-y-[20px]">
        {/* Filters and View Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[12px] md:gap-[16px]">
          <div className="flex flex-wrap items-center gap-[8px] md:gap-[12px] flex-1">
            <div className="relative flex-1 min-w-[160px] md:max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-[8px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] font-normal text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-[12px] py-[8px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] font-normal text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Pending QC">Pending QC</option>
              <option value="Completed">Completed</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-[12px] py-[8px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] font-normal text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-[12px] py-[8px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] font-normal text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Assignees</option>
              {projectTeam.map((m: any) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-[8px] bg-card border border-border rounded-[6px] p-[4px] self-start md:self-auto">
            <button
              onClick={() => setTaskView("list")}
              className={`p-[8px] rounded-[4px] transition-colors ${
                taskView === "list"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTaskView("grid")}
              className={`p-[8px] rounded-[4px] transition-colors ${
                taskView === "grid"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTaskView("calendar")}
              className={`p-[8px] rounded-[4px] transition-colors ${
                taskView === "calendar"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTaskView("kanban")}
              className={`p-[8px] rounded-[4px] transition-colors ${
                taskView === "kanban"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTaskView("gantt")}
              className={`p-[8px] rounded-[4px] transition-colors ${
                taskView === "gantt"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task Summary */}
        <div className="flex gap-[16px] p-[16px] bg-card border border-border rounded-[8px]">
          <div className="flex items-center gap-[8px]">
            <div className="p-[8px] rounded-[6px] bg-success/10">
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                Completed
              </p>
              <p className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
                {projectTasks.filter((t) => t.status === "Completed").length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-[8px]">
            <div className="p-[8px] rounded-[6px] bg-accent/10">
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                In Progress
              </p>
              <p className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
                {projectTasks.filter((t) => t.status === "In Progress").length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-[8px]">
            <div className="p-[8px] rounded-[6px] bg-muted/10">
              <Circle className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                To Do
              </p>
              <p className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
                {projectTasks.filter((t) => t.status === "To Do").length}
              </p>
            </div>
          </div>
        </div>

        {/* Tasks Display */}
        {taskView === "list" && (
          <div className="space-y-[12px]">
            {sortedFilteredTasks.map((task) => (
              <TaskListItem key={task.id} task={task} onEdit={handleEditTask} />
            ))}
          </div>
        )}

        {taskView === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
            {sortedFilteredTasks.map((task) => (
              <TaskGridItem key={task.id} task={task} onEdit={handleEditTask} />
            ))}
          </div>
        )}

        {taskView === "calendar" && (
          <TaskCalendarView
            tasks={sortedFilteredTasks}
            getTeamMember={getTeamMember}
            onEditTask={handleEditTask}
            updateTask={updateTask}
            teamMembers={teamMembers}
            currentUserId={currentUser?.id}
            isManagerOrAdmin={hasPermission("canEditProjects")}
            canApproveQC={hasPermission("canApproveTaskQC")}
          />
        )}

        {taskView === "kanban" && (
          <TaskKanban projectId={projectId} />
        )}

        {taskView === "gantt" && (
          <TaskGanttChart projectId={projectId} />
        )}

        {sortedFilteredTasks.length === 0 && (taskView === "list" || taskView === "grid") && (
          <div className="bg-card border border-border rounded-[20px] p-[40px] text-center">
            <p className="font-['Roboto_Mono'] font-normal text-[14px] text-muted-foreground">
              No tasks found matching your filters
            </p>
          </div>
        )}
        </TabsContent>

        <TabsContent value="phases" className="mt-0 space-y-[16px]">
          <div className="flex items-center justify-end">
            <button
              onClick={() => setIsManagePhasesOpen(true)}
              className="px-[12px] py-[6px] bg-accent text-accent-foreground rounded-[6px] hover:bg-accent/90 transition-colors font-['Roboto_Mono'] font-medium text-[11px] flex items-center gap-[6px]"
            >
              <Edit2 className="w-3 h-3" />
              Manage Phases
            </button>
          </div>
          <PhaseView projectId={projectId} />
        </TabsContent>
        <TabsContent value="record" className="mt-0">
          <ProjectEvidenceHub projectId={String(projectId)} tasks={allProjectTasks} teamMembers={teamMembers} onOpenTask={(task) => handleEditTask(task as AppTask)} />
        </TabsContent>
      </Tabs>

      {/* Project Health Summary — secondary info, below the working area */}
      <ProjectHealthSummary
        tasks={projectTasks as any}
        phases={normalizedPhases}
        projectEndDate={project.endDate}
      />

      {/* Task Dialog */}
      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        projectId={projectId}
        task={selectedTask}
        mode={taskDialogMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project "{project.title}" and all associated tasks and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-destructive hover:bg-destructive/90">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Phases Dialog */}
      <EditProjectPhasesDialog
        open={isManagePhasesOpen}
        onOpenChange={setIsManagePhasesOpen}
        project={project}
      />

      {/* Email Update Modal */}
      <EmailUpdateModal
        open={isEmailModalOpen}
        onOpenChange={setIsEmailModalOpen}
        data={emailModalData}
        clientEmail={clientEmail}
        projectName={project.title}
        projectLocation={project.location}
      />
    </div>
  );
}

// due_date/start_date are stored as UTC-midnight timestamps representing a
// plain calendar day, not a real moment in time. Reading them with local
// Date getters (getFullYear/getMonth/getDate) or writing them via the local
// `new Date(y, m, d)` constructor shifts the effective day backward by one
// for anyone west of UTC (all of North America) -- these helpers treat
// date-only values as UTC-anchored strings throughout, sidestepping local
// timezone entirely.
function ymd(year: number, month1to12: number, day: number): string {
  return `${year}-${String(month1to12).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateOnly(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function addDaysUTC(dateStr: string, days: number): string {
  const [y, m, d] = dateOnly(dateStr).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function daysBetweenUTC(fromStr: string, toStr: string): number {
  const [ay, am, ad] = dateOnly(fromStr).split("-").map(Number);
  const [by, bm, bd] = dateOnly(toStr).split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

// Task Calendar View Component
function TaskCalendarView({
  tasks,
  getTeamMember,
  onEditTask,
  updateTask,
  teamMembers = [],
  currentUserId,
  isManagerOrAdmin = false,
  canApproveQC = false,
}: {
  tasks: AppTask[];
  getTeamMember: (id: number) => any;
  onEditTask?: (task: AppTask) => void;
  updateTask?: (id: number, updates: Partial<AppTask>) => Promise<void>;
  teamMembers?: Array<{ id: string | number; authUserId?: string | null }>;
  currentUserId?: string | null;
  isManagerOrAdmin?: boolean;
  canApproveQC?: boolean;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState<AppTask | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  const canEditThisTask = (task: AppTask) =>
    canEditTask({ task: task as any, currentUserId, isManagerOrAdmin, teamMembers });

  const handleDragStart = (e: React.DragEvent, task: AppTask) => {
    if (!canEditThisTask(task)) {
      e.preventDefault();
      return;
    }
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, day: number) => {
    e.preventDefault();
    setDragOverDay(null);
    if (!draggedTask || !updateTask) return;

    // Build the target date as a plain string from the calendar's own
    // integers -- no Date object round-trip. due_date/start_date are stored
    // as UTC-midnight timestamps; going through `new Date(y, m, day)`
    // (local midnight) and then `.toISOString()` shifts the date backward
    // by a day for anyone west of UTC, which is what made dropping on a day
    // actually land the task on the day before.
    const newDueStr = ymd(currentDate.getFullYear(), currentDate.getMonth() + 1, day);

    // Shift start_date by the same amount so the task's own duration is
    // preserved, not just its due date -- moving a task on the calendar
    // should move the whole task, the way dragging its bar does on the
    // Gantt chart.
    const oldStart = (draggedTask as any).start_date || draggedTask.dueDate;
    const oldDue = draggedTask.dueDate;
    const durationDays = oldStart && oldDue ? daysBetweenUTC(oldStart, oldDue) : 0;
    const newStartStr = addDaysUTC(newDueStr, -durationDays);

    try {
      await updateTask(draggedTask.id, { dueDate: newDueStr, start_date: newStartStr } as Partial<AppTask>);
      toast.success(`Task rescheduled to ${formatDate(newDueStr)}`);
    } catch (error) {
      toast.error("Failed to reschedule task");
    }
    setDraggedTask(null);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getTasksForDate = (day: number) => {
    const cellDateStr = ymd(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
    return tasks.filter((task) => task.dueDate && dateOnly(task.dueDate) === cellDateStr);
  };

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-card border border-border rounded-[20px] p-[24px]">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-[24px]">
        <h3 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex gap-[8px]">
          <button
            onClick={previousMonth}
            className="p-[8px] rounded-[6px] bg-background border border-border hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={nextMonth}
            className="p-[8px] rounded-[6px] bg-background border border-border hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-[8px]">
        {/* Day headers */}
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center py-[8px]">
            <p className="font-['Roboto_Mono'] font-bold text-[10px] text-muted-foreground uppercase">
              {day}
            </p>
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          const dayTasks = day ? getTasksForDate(day) : [];
          return (
            <div
              key={index}
              onDragOver={(e) => {
                if (!day) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverDay !== day) setDragOverDay(day);
              }}
              onDragLeave={() => setDragOverDay((d) => (d === day ? null : d))}
              onDrop={(e) => day && handleDrop(e, day)}
              className={`min-h-[100px] p-[8px] rounded-[8px] border border-border ${
                day ? "bg-background hover:bg-card transition-colors" : "bg-transparent border-transparent"
              } ${isToday(day) ? "ring-2 ring-accent" : ""} ${
                dragOverDay === day && day ? "ring-2 ring-accent bg-accent/5" : ""
              }`}
            >
              {day && (
                <>
                  <p className={`font-['Roboto_Mono'] font-bold text-[11px] mb-[8px] ${
                    isToday(day) ? "text-accent" : "text-foreground"
                  }`}>
                    {day}
                  </p>
                  <div className="space-y-[4px]">
                    {dayTasks.map((task) => {
                      const assignee = getTeamMember(task.assignee);
                      const canEdit = canEditThisTask(task);
                      const statusOptions = canApproveQC
                        ? ALL_TASK_STATUSES
                        : canEdit
                        ? getEmployeeActions(task.status).map((a) => a.nextStatus)
                        : [];

                      const handleStatusChange = async (status: string) => {
                        if (!updateTask) return;
                        try {
                          await updateTask(task.id, { status } as Partial<AppTask>);
                          toast.success("Task status updated");
                        } catch {
                          toast.error("Failed to update task status");
                        }
                      };

                      return (
                        <ContextMenu key={task.id}>
                          <ContextMenuTrigger asChild>
                            <button
                              onClick={() => onEditTask?.(task)}
                              draggable={canEdit}
                              onDragStart={(e) => handleDragStart(e, task)}
                              title={canEdit ? "Drag to reschedule, right-click to update status" : "You can only reschedule tasks assigned to you"}
                              className={`w-full p-[6px] rounded-[4px] hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer ${
                                canEdit ? "cursor-grab active:cursor-grabbing" : ""
                              } ${
                                task.status === "Completed"
                                  ? "bg-success/10"
                                  : task.status === "In Progress"
                                  ? "bg-accent/10"
                                  : task.priority === "Urgent"
                                  ? "bg-destructive/10"
                                  : "bg-muted/10"
                              }`}
                            >
                              <p className="font-['Roboto_Mono'] font-medium text-[9px] text-foreground truncate mb-[2px] text-left">
                                {task.title}
                              </p>
                              {assignee && (
                                <p className="font-['Roboto_Mono'] font-normal text-[8px] text-muted-foreground truncate text-left">
                                  {assignee.name}
                                </p>
                              )}
                            </button>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuLabel>{task.title}</ContextMenuLabel>
                            <ContextMenuSeparator />
                            {statusOptions.length === 0 ? (
                              <ContextMenuItem disabled>
                                {task.status} — waiting on a supervisor or QC
                              </ContextMenuItem>
                            ) : (
                              statusOptions.map((s) => (
                                <ContextMenuItem key={s} onClick={() => handleStatusChange(s)}>
                                  Set status: {s}
                                </ContextMenuItem>
                              ))
                            )}
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
