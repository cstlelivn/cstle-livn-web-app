import { useState, useMemo } from "react";
import { Edit2, Plus, ArrowRight } from "lucide-react";
import { useApp, type Task } from "./AppContext";
import { useAuth } from "./AuthContext";
import TaskDialog from "./TaskDialog";
import { getTaskStatusIcon } from "./TaskStatusControl";
import { formatDate } from "../src/lib/dates";
import { operationalTasks } from "../src/features/projects/lifecycle";

interface RecentTasksWidgetProps {
  onNavigateToProjects?: () => void;
}

export default function RecentTasksWidget({ onNavigateToProjects }: RecentTasksWidgetProps) {
  const { tasks, teamMembers, getTeamMember, projects, getProject } = useApp();
  const { hasPermission, currentUser } = useAuth();
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [taskDialogMode, setTaskDialogMode] = useState<"add" | "edit">("add");

  // Without canViewAllProjects (Associates), only show this person's own
  // tasks -- otherwise everyone saw every open task company-wide here.
  const visibleTasks = useMemo(() => {
    const currentTasks = operationalTasks(tasks, projects);
    if (hasPermission("canViewAllProjects")) return currentTasks;
    const myMember = teamMembers.find((m: any) => String(m.authUserId) === String(currentUser?.id));
    if (!myMember) return [];
    return currentTasks.filter((t: any) => String(t.assignee) === String(myMember.id));
  }, [tasks, projects, teamMembers, currentUser, hasPermission]);

  // Get recent incomplete tasks (sorted by due date)
  const recentTasks = visibleTasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "Urgent":
        return "text-destructive";
      case "High":
        return "text-warning";
      case "Medium":
        return "text-accent";
      default:
        return "text-muted-foreground";
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const handleEditTask = (task: Task) => {
    setTaskDialogMode("edit");
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  return (
    <div className="bg-card border border-border rounded-[20px] p-[24px]">
      <div className="flex items-center justify-between mb-[20px]">
        <h3
          className="text-foreground"
          style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}
        >
          Recent Tasks
        </h3>
        <button
          onClick={onNavigateToProjects}
          className="flex items-center gap-[6px] px-[12px] py-[6px] hover:bg-accent/10 rounded-[6px] transition-colors"
        >
          <span className="font-['Roboto_Mono'] text-[10px] text-accent">View All</span>
          <ArrowRight className="w-3 h-3 text-accent" />
        </button>
      </div>

      <div className="space-y-[12px]">
        {recentTasks.length === 0 ? (
          <div className="text-center py-[32px]">
            <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
              No active tasks
            </p>
          </div>
        ) : (
          recentTasks.map((task) => {
            const assignee = getTeamMember(task.assignee);
            const project = getProject(task.projectId);
            const overdue = isOverdue(task.dueDate);

            return (
              <div
                key={task.id}
                className="flex items-center gap-[12px] p-[12px] bg-background border border-border rounded-[8px] hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => handleEditTask(task)}
              >
                <div className="shrink-0">{getTaskStatusIcon(task.status, "w-3 h-3")}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[8px] mb-[4px]">
                    <h4 className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground truncate">
                      {task.title}
                    </h4>
                    <span
                      className={`text-[8px] font-['Roboto_Mono'] ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <div className="flex items-center gap-[12px] text-[9px]">
                    {project && (
                      <span className="font-['Roboto_Mono'] text-muted-foreground truncate">
                        {project.title}
                      </span>
                    )}
                    {assignee && (
                      <span className="font-['Roboto_Mono'] text-muted-foreground truncate">
                        {assignee.name}
                      </span>
                    )}
                    <span
                      className={`font-['Roboto_Mono'] ${
                        overdue ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {overdue ? "Overdue" : formatDate(task.dueDate)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTask(task);
                  }}
                  className="p-[6px] opacity-0 group-hover:opacity-100 hover:bg-accent/10 rounded-[4px] transition-all"
                >
                  <Edit2 className="w-3 h-3 text-muted-foreground hover:text-accent" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        projectId={selectedTask?.projectId || projects[0]?.id || 1}
        task={selectedTask}
        mode={taskDialogMode}
      />
    </div>
  );
}
