import { useState } from "react";
import { Plus, Search, List, Grid3x3, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle, Users as UsersIcon, Filter, Edit2, Trash2, MoreVertical, ChevronDown, ClipboardCheck } from "lucide-react";
import { useApp, type Task } from "./AppContext";
import { useAuth } from "./AuthContext";
import TaskDialog from "./TaskDialog";
import TaskKanban from "./TaskKanban";
import TaskGanttChart from "./TaskGanttChart";
import TaskReviewDialog from "./TaskReviewDialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Badge } from "./ui/badge";

export default function TaskManagement() {
  const { tasks, projects, teamMembers, getProject, getTeamMember, deleteTask, updateTask } = useApp();
  const { hasPermission } = useAuth();
  const [view, setView] = useState<"list" | "kanban" | "gantt">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"none" | "project" | "assignee" | "status" | "priority">("none");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [taskDialogMode, setTaskDialogMode] = useState<"add" | "edit">("add");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [reviewDialogTask, setReviewDialogTask] = useState<Task | null>(null);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesProject = filterProject === "all" || task.projectId.toString() === filterProject;
    const matchesAssignee = filterAssignee === "all" || task.assignee === filterAssignee;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesAssignee;
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

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="w-[14px] h-[14px] text-success" />;
      case "In Progress":
        return <Clock className="w-[14px] h-[14px] text-accent" />;
      case "Review":
        return <AlertCircle className="w-[14px] h-[14px] text-warning" />;
      default:
        return <div className="w-[14px] h-[14px] rounded-full border-2 border-muted-foreground" />;
    }
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

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "Completed":
        return "bg-success text-success-foreground";
      case "In Progress":
        return "bg-accent text-accent-foreground";
      case "Review":
        return "bg-warning text-warning-foreground";
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
          <div className="flex items-center gap-[12px]">
            <button
              onClick={() => setView("list")}
              className={`p-[8px] rounded-[6px] transition-colors ${
                view === "list" ? "bg-accent text-accent-foreground" : "hover:bg-accent/10 text-muted-foreground"
              }`}
            >
              <List className="w-[16px] h-[16px]" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`p-[8px] rounded-[6px] transition-colors ${
                view === "kanban" ? "bg-accent text-accent-foreground" : "hover:bg-accent/10 text-muted-foreground"
              }`}
            >
              <Grid3x3 className="w-[16px] h-[16px]" />
            </button>
            <button
              onClick={() => setView("gantt")}
              className={`p-[8px] rounded-[6px] transition-colors ${
                view === "gantt" ? "bg-accent text-accent-foreground" : "hover:bg-accent/10 text-muted-foreground"
              }`}
            >
              <CalendarIcon className="w-[16px] h-[16px]" />
            </button>
          </div>
          
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
        <div className="grid grid-cols-6 gap-[12px]">
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
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-[36px] bg-background border-border font-['Roboto_Mono'] text-[11px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Review">Review</SelectItem>
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

      {/* Task Views */}
      {view === "list" && (
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

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-[16px] p-[16px] bg-background border border-border rounded-[8px] hover:shadow-sm transition-all cursor-pointer group"
                        onClick={() => handleEditTask(task)}
                      >
                        <div className="shrink-0">{getStatusIcon(task.status)}</div>

                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-[16px] items-center">
                          <div className="col-span-4">
                            <h4 className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground mb-[4px]">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            )}
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

                          <div className="col-span-2">
                            <Badge className={`${getPriorityColor(task.priority)} font-['Roboto_Mono'] text-[9px] px-[8px] py-[2px]`}>
                              {task.priority}
                            </Badge>
                          </div>

                          <div className="col-span-2">
                            <p
                              className={`font-['Roboto_Mono'] text-[10px] ${
                                overdue ? "text-destructive font-bold" : "text-muted-foreground"
                              }`}
                            >
                              {overdue ? "Overdue" : task.dueDate}
                            </p>
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
      )}

      {view === "kanban" && <TaskKanban tasks={filteredTasks} />}
      {view === "gantt" && <TaskGanttChart tasks={filteredTasks} />}

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

      {/* Review Dialog */}
      <TaskReviewDialog
        open={reviewDialogTask !== null}
        onOpenChange={(open) => setReviewDialogTask(open ? reviewDialogTask : null)}
        task={reviewDialogTask}
        onReviewComplete={(task) => {
          updateTask(task);
          setReviewDialogTask(null);
        }}
      />
    </div>
  );
}