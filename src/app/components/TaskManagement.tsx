import { useState } from "react";
import { Plus, Search, Edit2, Trash2, MoreVertical } from "lucide-react";
import { useApp, type Task } from "./AppContext";
import { useAuth } from "./AuthContext";
import TaskDialog from "./TaskDialog";
import TaskStatusControl from "./TaskStatusControl";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { formatDate } from "../src/lib/dates";
import { canEditTask } from "../src/features/tasks/permissions";
import { toast } from "sonner";

type TimeFrame = "all" | "overdue" | "today" | "week" | "month";

function daysUntil(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export default function TaskManagement() {
  const { tasks, projects, teamMembers, getProject, getTeamMember, deleteTask, updateTask } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const isManagerOrAdmin = hasPermission("canEditProjects");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("all");
  const [groupBy, setGroupBy] = useState<"none" | "project" | "assignee" | "status" | "priority">("none");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [taskDialogMode, setTaskDialogMode] = useState<"add" | "edit">("add");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  // Without canViewAllProjects (Associates), this view is scoped to just
  // the current person's own tasks -- their whole reason to be here.
  const canViewAllProjects = hasPermission("canViewAllProjects");
  const myMember = teamMembers.find((m: any) => String(m.authUserId) === String(currentUser?.id));
  const visibleTasks = canViewAllProjects
    ? tasks
    : tasks.filter((t: any) => myMember && String(t.assignee) === String(myMember.id));

  // Filter tasks -- incomplete tasks only for time-frame filtering, since a
  // completed task being "overdue" isn't something anyone needs to act on
  const filteredTasks = visibleTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesProject = filterProject === "all" || task.projectId.toString() === filterProject;
    const matchesAssignee = filterAssignee === "all" || task.assignee === filterAssignee;

    let matchesTimeFrame = true;
    if (timeFrame !== "all") {
      if (task.status === "Completed" || !task.dueDate) {
        matchesTimeFrame = false;
      } else {
        const diff = daysUntil(task.dueDate);
        if (timeFrame === "overdue") matchesTimeFrame = diff < 0;
        else if (timeFrame === "today") matchesTimeFrame = diff === 0;
        else if (timeFrame === "week") matchesTimeFrame = diff >= 0 && diff <= 7;
        else if (timeFrame === "month") matchesTimeFrame = diff >= 0 && diff <= 30;
      }
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesAssignee && matchesTimeFrame;
  }).sort((a, b) => {
    // Soonest due date first (urgency); tasks with no due date sort last
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Group tasks
  const groupedTasks = (() => {
    if (groupBy === "none") {
      return { "All Tasks": filteredTasks };
    }

    const groups: Record<string, Task[]> = {};
    
    filteredTasks.forEach((task) => {
      let groupKey = "";
      
      switch (groupBy) {
        case "project":
          const project = getProject(task.projectId);
          groupKey = project?.title || "Unknown Project";
          break;
        case "assignee":
          const assignee = getTeamMember(task.assignee);
          groupKey = assignee?.name || "Unassigned";
          break;
        case "status":
          groupKey = task.status;
          break;
        case "priority":
          groupKey = task.priority;
          break;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });
    
    return groups;
  })();

  const handleAddTask = () => {
    setTaskDialogMode("add");
    setSelectedTask(undefined);
    setIsTaskDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskDialogMode("edit");
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleDeleteTask = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete);
      setTaskToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "Urgent":
        return "bg-destructive text-destructive-foreground";
      case "High":
        return "bg-warning text-warning-foreground";
      case "Medium":
        return "bg-accent text-accent-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== "Completed" && new Date(dueDate) < new Date();
  };

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "In Progress").length;
  const overdueTasks = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="w-full space-y-[24px]">
      {/* Header Stats */}
      <div className="grid grid-cols-5 gap-[16px]">
        <div className="bg-card border border-border rounded-[12px] p-[16px]">
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[8px]">Total Tasks</p>
          <p className="font-['Anybody'] text-[24px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
            {totalTasks}
          </p>
        </div>
        <div className="bg-card border border-border rounded-[12px] p-[16px]">
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[8px]">Completed</p>
          <p className="font-['Anybody'] text-[24px] text-success" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
            {completedTasks}
          </p>
        </div>
        <div className="bg-card border border-border rounded-[12px] p-[16px]">
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[8px]">In Progress</p>
          <p className="font-['Anybody'] text-[24px] text-accent" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
            {inProgressTasks}
          </p>
        </div>
        <div className="bg-card border border-border rounded-[12px] p-[16px]">
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[8px]">Overdue</p>
          <p className="font-['Anybody'] text-[24px] text-destructive" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
            {overdueTasks}
          </p>
        </div>
        <div className="bg-card border border-border rounded-[12px] p-[16px]">
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[8px]">Completion Rate</p>
          <p className="font-['Anybody'] text-[24px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
            {completionRate}%
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-[12px] p-[20px]">
        <div className="flex items-center justify-between mb-[16px]">
          <h3 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
            All Tasks
          </h3>

          {hasPermission("canEditProjects") && (
            <button
              onClick={handleAddTask}
              className="flex items-center gap-[8px] px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-[14px] h-[14px]" />
              <span className="font-['Roboto_Mono'] text-[11px]">Add Task</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-7 gap-[12px]">
          <div className="col-span-2">
            <div className="relative">
              <Search className="absolute left-[12px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-[36px] h-[36px] bg-background border-border font-['Roboto_Mono'] text-[11px]"
              />
            </div>
          </div>

          <Select value={timeFrame} onValueChange={(value) => setTimeFrame(value as TimeFrame)}>
            <SelectTrigger className="h-[36px] bg-background border-border font-['Roboto_Mono'] text-[11px]">
              <SelectValue placeholder="Due" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Time</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="week">Due This Week</SelectItem>
              <SelectItem value="month">Due This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-[36px] bg-background border-border font-['Roboto_Mono'] text-[11px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="To Do">To Do</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Under Review">Under Review</SelectItem>
              <SelectItem value="Pending QC">Pending QC</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-[36px] bg-background border-border font-['Roboto_Mono'] text-[11px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="h-[36px] bg-background border-border font-['Roboto_Mono'] text-[11px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as typeof groupBy)}>
            <SelectTrigger className="h-[36px] bg-background border-border font-['Roboto_Mono'] text-[11px]">
              <SelectValue placeholder="Group By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="project">By Project</SelectItem>
              <SelectItem value="assignee">By Assignee</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-[24px]">
          {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
            <div key={groupName} className="bg-card border border-border rounded-[12px] p-[20px]">
              {groupBy !== "none" && (
                <h3
                  className="mb-[16px] text-foreground flex items-center gap-[8px]"
                  style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}
                >
                  {groupName}
                  <span className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                    ({groupTasks.length})
                  </span>
                </h3>
              )}
              
              <div className="space-y-[12px]">
                {groupTasks.length === 0 ? (
                  <div className="text-center py-[40px]">
                    <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
                      No tasks found
                    </p>
                  </div>
                ) : (
                  groupTasks.map((task) => {
                    const project = getProject(task.projectId);
                    const assignee = getTeamMember(task.assignee);
                    const overdue = isOverdue(task.dueDate, task.status);
                    const canEdit = canEditTask({ task, currentUserId: currentUser?.id, isManagerOrAdmin, teamMembers });
                    const canApproveQC = hasPermission("canApproveTaskQC");

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-[16px] p-[16px] bg-background border border-border rounded-[8px] hover:shadow-sm transition-all cursor-pointer group"
                        onClick={() => handleEditTask(task)}
                      >
                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-[16px] items-center">
                          <div className="col-span-3">
                            <h4 className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground mb-[4px]">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>

                          <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                            <TaskStatusControl
                              status={task.status}
                              canEdit={canEdit}
                              canApproveQC={canApproveQC}
                              onChange={(status) => updateTask(task.id, { status })}
                              showLabel
                              triggerClassName="w-fit h-[24px] px-[8px] gap-[4px] border border-border bg-secondary/40 shadow-none rounded-full cursor-pointer hover:bg-accent/10 hover:border-accent/30 transition-colors [&>svg:last-child]:hidden"
                              iconSize="w-3 h-3"
                            />
                          </div>

                          <div className="col-span-2">
                            {project && (
                              <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                                {project.title}
                              </p>
                            )}
                          </div>

                          <div className="col-span-2">
                            {assignee && (
                              <div className="flex items-center gap-[6px]">
                                <div className="w-[20px] h-[20px] rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                                  <span className="font-['Roboto_Mono'] text-[8px] text-accent">
                                    {assignee.name.split(" ").map(n => n[0]).join("")}
                                  </span>
                                </div>
                                <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground truncate">
                                  {assignee.name}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="col-span-1">
                            <Badge className={`${getPriorityColor(task.priority)} font-['Roboto_Mono'] text-[9px] px-[8px] py-[2px]`}>
                              {task.priority}
                            </Badge>
                          </div>

                          <div className="col-span-2">
                            {task.dueDate ? (
                              <p
                                className={`font-['Roboto_Mono'] text-[10px] ${
                                  overdue
                                    ? "text-destructive font-bold"
                                    : task.status !== "Completed" && daysUntil(task.dueDate) <= 3
                                    ? "text-warning font-bold"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {overdue ? "Overdue · " : ""}
                                {formatDate(task.dueDate)}
                              </p>
                            ) : (
                              <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">No due date</p>
                            )}
                          </div>
                        </div>

                        {hasPermission("canEditProjects") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button className="p-[6px] opacity-0 group-hover:opacity-100 hover:bg-accent/10 rounded-[4px] transition-all">
                                <MoreVertical className="w-[14px] h-[14px] text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                <Edit2 className="w-[12px] h-[12px] mr-[8px]" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => handleDeleteTask(task.id, e as any)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-[12px] h-[12px] mr-[8px]" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

      {/* Task Dialog */}
      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        projectId={selectedTask?.projectId || projects[0]?.id || 1}
        task={selectedTask}
        mode={taskDialogMode}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}