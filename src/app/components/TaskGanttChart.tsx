import { useState, useRef } from "react";
import { Edit2, Trash2, Plus, GripHorizontal } from "lucide-react";
import { useApp, type Task } from "./AppContext";
import TaskDialog from "./TaskDialog";
import { toast } from "sonner";

interface TaskGanttChartProps {
  projectId: number;
}

export default function TaskGanttChart({ projectId }: TaskGanttChartProps) {
  const { getTasksByProject, getTeamMember, updateTask, deleteTask, getProject, addTask } = useApp();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [taskDialogMode, setTaskDialogMode] = useState<"add" | "edit">("add");
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [resizingTask, setResizingTask] = useState<{ task: Task; edge: 'left' | 'right' } | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const tasks = getTasksByProject(projectId);
  const project = getProject(projectId);

  // Generate timeline in days (30 days)
  const getDaysTimeline = (project: any) => {
    if (!project || !project.startDate) return [];
    
    const startDate = new Date(project.startDate);
    const days = [];
    
    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      days.push({
        date: currentDate.toISOString().split('T')[0],
        label: `${currentDate.getDate()}`,
        monthLabel: i === 0 || currentDate.getDate() === 1 ? currentDate.toLocaleDateString("en-US", { month: "short" }) : "",
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
      });
    }
    
    return days;
  };

  const days = getDaysTimeline(project);

  // Calculate task position and width based on dueDate and optional start date
  const getTaskPosition = (task: Task) => {
    if (days.length === 0) return { left: "0%", width: "4%" };
    
    const taskStart = task.createdAt ? new Date(task.createdAt) : new Date(days[0].date);
    const taskEnd = new Date(task.dueDate);
    const timelineStart = new Date(days[0].date);
    
    // Calculate days from start
    const startOffset = Math.max(0, Math.floor((taskStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
    const endOffset = Math.floor((taskEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, endOffset - startOffset);
    
    return {
      left: `${(startOffset / days.length) * 100}%`,
      width: `${(duration / days.length) * 100}%`,
    };
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "Completed":
        return "bg-success";
      case "In Progress":
        return "bg-primary";
      case "Review":
        return "bg-warning";
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

  // Handle click on day cell to create new task
  const handleDayCellClick = (dayDate: string) => {
    setNewTaskDate(dayDate);
    setTaskDialogMode("add");
    setSelectedTask(undefined);
    setIsTaskDialogOpen(true);
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drop on day cell
  const handleDrop = (e: React.DragEvent, dayDate: string) => {
    e.preventDefault();
    if (draggedTask) {
      // Calculate new due date
      const oldDueDate = new Date(draggedTask.dueDate);
      const newDueDate = new Date(dayDate);
      
      updateTask(draggedTask.id, {
        ...draggedTask,
        dueDate: newDueDate.toISOString().split('T')[0],
      });
      
      toast.success(`Task moved to ${newDueDate.toLocaleDateString()}`);
      setDraggedTask(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, task: Task, edge: 'left' | 'right') => {
    e.stopPropagation();
    setResizingTask({ task, edge });
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

  return (
    <div className="space-y-[16px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground">Gantt Chart</h3>
          <p className="text-muted-foreground small-text">
            Click on a day to add a task, drag tasks to reschedule
          </p>
        </div>
        <button
          onClick={handleAddTask}
          className="px-[12px] py-[6px] bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-[6px]"
        >
          <Plus className="w-3 h-3" />
          Add Task
        </button>
      </div>

      {/* Gantt Chart */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Timeline Header */}
        <div className="flex border-b border-border bg-secondary/30 sticky top-0 z-10">
          <div className="w-[200px] px-[12px] py-[8px] border-r border-border">
            <span className="text-foreground">Task</span>
          </div>
          <div className="flex-1 flex" ref={timelineRef}>
            {days.map((day, index) => (
              <div
                key={day.date}
                className={`flex-1 min-w-[30px] px-[4px] py-[8px] border-r border-border text-center ${
                  day.isWeekend ? "bg-muted/30" : ""
                }`}
              >
                {day.monthLabel && (
                  <div className="small-text text-muted-foreground mb-[2px]">
                    {day.monthLabel}
                  </div>
                )}
                <div className="small-text text-foreground">{day.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Rows */}
        <div className="divide-y divide-border">
          {tasks.map((task) => {
            const assignee = task.assignee ? getTeamMember(task.assignee) : null;
            const position = getTaskPosition(task);

            return (
              <div key={task.id} className="flex hover:bg-secondary/20 transition-colors group">
                {/* Task Info */}
                <div className="w-[200px] px-[12px] py-[10px] border-r border-border flex items-center justify-between gap-[8px]">
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground truncate small-text">
                      {task.title}
                    </div>
                    {assignee && (
                      <div className="text-muted-foreground small-text truncate">
                        {assignee.name}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
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
                  {/* Day cells for dropping */}
                  {days.map((day) => (
                    <div
                      key={day.date}
                      className={`flex-1 min-w-[30px] border-r border-border/50 ${
                        day.isWeekend ? "bg-muted/10" : ""
                      } cursor-pointer hover:bg-accent/5 transition-colors`}
                      onClick={() => handleDayCellClick(day.date)}
                      onDrop={(e) => handleDrop(e, day.date)}
                      onDragOver={handleDragOver}
                    />
                  ))}

                  {/* Task Bar */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-[28px] rounded cursor-move ${getStatusColor(
                      task.status
                    )} ${getPriorityColor(task.priority)} border-2 flex items-center px-[8px] gap-[4px] hover:opacity-90 transition-opacity shadow-sm`}
                    style={{
                      left: position.left,
                      width: position.width,
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    title={`${task.title} - ${task.status}`}
                  >
                    <GripHorizontal className="w-3 h-3 text-white/70" />
                    <span className="text-white small-text truncate flex-1">
                      {task.title}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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
