import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Plus, Edit2, Trash2, User, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { useApp, type Task } from "./AppContext";
import { useAuth } from "./AuthContext";
import { canEditTask } from "../src/features/tasks/permissions";
import { Badge } from "./ui/badge";
import TaskDialog from "./TaskDialog";
import { toast } from "sonner";
import { formatDate } from "../src/lib/dates";

interface TaskKanbanProps {
  projectId: number;
}

const STATUS_COLUMNS = [
  { id: "To Do" as const, label: "To Do", color: "bg-muted/10" },
  { id: "In Progress" as const, label: "In Progress", color: "bg-primary/10" },
  { id: "Review" as const, label: "Review", color: "bg-accent/10" },
  { id: "Completed" as const, label: "Completed", color: "bg-success/10" },
];

interface DraggableTaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  canEdit: boolean;
  canDelete: boolean;
}

function DraggableTaskCard({ task, onEdit, onDelete, canEdit, canDelete }: DraggableTaskCardProps) {
  const { getTeamMember } = useApp();
  const assignee = getTeamMember(task.assignee);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    item: { id: task.id, currentStatus: task.status },
    canDrag: canEdit,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [canEdit, task.id, task.status]);

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "Urgent":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "High":
        return "bg-warning/10 text-warning border-warning/20";
      case "Medium":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  return (
    <div
      ref={canEdit ? drag : undefined}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      title={canEdit ? undefined : "You can only update tasks assigned to you"}
      className={`bg-card border border-border rounded-[8px] p-[12px] hover:shadow-md transition-all group ${canEdit ? "cursor-move" : "cursor-not-allowed opacity-80"}`}
    >
      <div className="flex items-start justify-between gap-[8px] mb-[8px]">
        <h4 className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground flex-1 line-clamp-2">
          {task.title}
        </h4>
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="p-[4px] hover:bg-accent/10 rounded-[4px] transition-colors"
              >
                <Edit2 className="w-3 h-3 text-muted-foreground hover:text-accent" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="p-[4px] hover:bg-destructive/10 rounded-[4px] transition-colors"
              >
                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </div>
        )}
      </div>

      {task.description && (
        <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[8px] line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-[8px] mb-[8px]">
        <div
          className={`text-[9px] px-[6px] py-[1px] rounded ${getPriorityColor(
            task.priority
          )}`}
        >
          {task.priority}
        </div>
      </div>

      <div className="flex items-center justify-between gap-[8px] text-[8px]">
        {assignee && (
          <div className="flex items-center gap-[4px] text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="font-['Roboto_Mono'] truncate">{assignee.name}</span>
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-[4px] text-muted-foreground">
            <CalendarIcon className="w-3 h-3" />
            <span className="font-['Roboto_Mono']">{formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-[4px] mt-[8px]">
          {task.tags.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="px-[6px] py-[2px] bg-accent/10 text-accent rounded-[4px] text-[8px] font-['Roboto_Mono']"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="px-[6px] py-[2px] bg-muted/10 text-muted-foreground rounded-[4px] text-[8px] font-['Roboto_Mono']">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface StatusColumnProps {
  status: Task["status"];
  label: string;
  color: string;
  tasks: Task[];
  onDrop: (taskId: number, newStatus: Task["status"]) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onAddTask: (status: Task["status"]) => void;
  canEditTask: (task: Task) => boolean;
  canDeleteTasks: boolean;
  canAddTasks: boolean;
}

function StatusColumn({
  status,
  label,
  color,
  tasks,
  onDrop,
  onEdit,
  onDelete,
  onAddTask,
  canEditTask,
  canDeleteTasks,
  canAddTasks,
}: StatusColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "task",
    drop: (item: { id: number; currentStatus: Task["status"] }) => {
      if (item.currentStatus !== status) {
        onDrop(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-[280px] rounded-[12px] border-2 ${
        isOver ? "border-accent bg-accent/5" : "border-border bg-card"
      } p-[16px] transition-colors`}
    >
      <div className="flex items-center justify-between mb-[12px]">
        <div className="flex items-center gap-[8px]">
          <div className={`w-3 h-3 rounded-full ${color.replace("/10", "")}`}></div>
          <h3 className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground">
            {label}
          </h3>
        </div>
        <div className="flex items-center gap-[8px]">
          <Badge
            variant="secondary"
            className="font-['Roboto_Mono'] text-[9px] px-[6px] py-[2px]"
          >
            {tasks.length}
          </Badge>
          {canAddTasks && (
            <button
              onClick={() => onAddTask(status)}
              className="p-[4px] hover:bg-accent/10 rounded-[4px] transition-colors"
              title="Add task"
            >
              <Plus className="w-3 h-3 text-muted-foreground hover:text-accent" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-[8px] max-h-[calc(100vh-300px)] overflow-y-auto">
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={canEditTask(task)}
            canDelete={canDeleteTasks}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-[32px] border-2 border-dashed border-border rounded-[8px]">
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
              Drop tasks here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaskKanban({ projectId }: TaskKanbanProps) {
  const { getTasksByProject, updateTask, deleteTask, teamMembers } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [taskDialogMode, setTaskDialogMode] = useState<"add" | "edit">("add");
  const [presetStatus, setPresetStatus] = useState<Task["status"]>("To Do");

  const tasks = getTasksByProject(projectId);
  const isManagerOrAdmin = hasPermission("canEditProjects");

  const canEditThisTask = (task: Task) =>
    canEditTask({ task, currentUserId: currentUser?.id, isManagerOrAdmin, teamMembers });

  const handleDrop = async (taskId: number, newStatus: Task["status"]) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!canEditThisTask(task as Task)) {
      toast.error("You can only update tasks assigned to you");
      return;
    }
    const updates: Partial<Task> = { status: newStatus };
    if (newStatus === "Completed") {
      updates.progress = 100;
      updates.completedDate = new Date().toISOString().split("T")[0];
    } else if (newStatus === "In Progress") {
      // Retain progress but clear completedDate if reopened
      updates.completedDate = "";
    } else if (newStatus === "To Do") {
      updates.progress = 0;
      updates.completedDate = "";
    }
    try {
      await updateTask(taskId, updates);
      toast.success(`Task moved to ${newStatus}`);
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskDialogMode("edit");
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTask(taskId);
    toast.success("Task deleted successfully");
  };

  const handleAddTask = (status: Task["status"]) => {
    setTaskDialogMode("add");
    setSelectedTask(undefined);
    setPresetStatus(status);
    setIsTaskDialogOpen(true);
  };

  const handleTaskSave = () => {
    // TaskDialog handles persistence; nothing extra needed here
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-[16px]">
        <div className="flex items-center justify-between">
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
            Drag and drop tasks between columns to update their status
          </p>
        </div>

        <div className="overflow-x-auto pb-[16px]">
          <div className="flex gap-[16px] min-w-max">
            {STATUS_COLUMNS.map((column) => (
              <StatusColumn
                key={column.id}
                status={column.id}
                label={column.label}
                color={column.color}
                tasks={tasks.filter((t) => t.status === column.id)}
                onDrop={handleDrop}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onAddTask={handleAddTask}
                canEditTask={canEditThisTask}
                canDeleteTasks={isManagerOrAdmin}
                canAddTasks={isManagerOrAdmin}
              />
            ))}
          </div>
        </div>
      </div>

      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        projectId={projectId}
        task={selectedTask}
        mode={taskDialogMode}
        onSave={handleTaskSave}
        defaultStatus={taskDialogMode === "add" ? presetStatus : undefined}
      />
    </DndProvider>
  );
}