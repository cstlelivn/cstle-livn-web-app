import { useState, useEffect, useMemo } from "react";
import { ClipboardCheck, Search, AlertCircle, CheckCircle, XCircle, Eye, Calendar, User } from "lucide-react";
import { type Task, useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import TaskReviewDialog from "./TaskReviewDialog";

export default function QCReviewQueue() {
  const { projects, tasks, teamMembers, getTeamMember, updateTask, updateTeamMember, refreshTasks, refreshTeam } = useApp();
  const { hasPermission, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [workerFilter, setWorkerFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // ✅ WEBSOCKET-ONLY: Filter tasks from real-time data (no API calls)
  const tasksAwaitingReview = useMemo(() => {
    if (!hasPermission("canViewQCReviewQueue")) {
      return [];
    }
    return tasks.filter(
      (t) => t.status === "Ready for Review" || t.status === "Needs Review"
    );
  }, [tasks, hasPermission]);

  // Get unique projects and workers from tasks awaiting review
  const uniqueProjects = Array.from(new Set(tasksAwaitingReview.map(t => t.projectId)))
    .map(id => projects.find(p => p.id === id))
    .filter(Boolean);
  
  const uniqueWorkers = Array.from(new Set(tasksAwaitingReview.map(t => t.assignee)))
    .map(id => getTeamMember(id))
    .filter(Boolean);

  // Filter tasks (client-side filtering for search, project, and worker)
  const filteredTasks = tasksAwaitingReview.filter((task) => {
    const project = projects.find((p) => p.id === task.projectId);
    const assignee = getTeamMember(task.assignee);
    
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignee?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProject = projectFilter === "all" || task.projectId.toString() === projectFilter;
    const matchesWorker = workerFilter === "all" || task.assignee.toString() === workerFilter;
    
    return matchesSearch && matchesProject && matchesWorker;
  });

  // Calculate stats
  const totalTasks = tasksAwaitingReview.length;
  const urgentTasks = tasksAwaitingReview.filter(t => t.priority === "Urgent").length;
  
  // Calculate tasks reviewed today
  const today = new Date().toDateString();
  const reviewedToday = tasks.filter(t => {
    return t.status === "Completed" && 
           t.completedDate && 
           new Date(t.completedDate).toDateString() === today;
  }).length;
  
  // Calculate average rating today
  const tasksRatedToday = tasks.filter(t => {
    return t.rating && 
           t.completedDate && 
           new Date(t.completedDate).toDateString() === today;
  });
  const avgRating = tasksRatedToday.length > 0
    ? tasksRatedToday.reduce((sum, t) => sum + (t.rating || 0), 0) / tasksRatedToday.length
    : 5.0;
  
  // Calculate overdue tasks (tasks past due date)
  const overdueTasks = tasksAwaitingReview.filter(t => {
    const dueDate = new Date(t.dueDate);
    return dueDate < new Date();
  }).length;

  // Only managers and admins can access this
  if (!hasPermission("canViewQCReviewQueue")) {
    return (
      <div className="flex-1 flex items-center justify-center p-[32px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-[16px]" />
          <p className="font-['Roboto_Mono'] font-normal text-[14px] text-muted-foreground">
            You don't have permission to access the QC Review Queue.
          </p>
        </div>
      </div>
    );
  }

  const handleReviewTask = (task: Task) => {
    setSelectedTask(task);
    setIsReviewDialogOpen(true);
  };

  const handleApproveTask = async (
    taskId: number,
    rating: number,
    metrics: { speed: "fast" | "on-time" | "slow"; corrections: "none" | "minor" | "major"; calculatedRating: number },
    feedback: string
  ) => {
    try {
      toast.loading("Approving task...", { id: "task-approve" });
      
      // Get the task to find the assignee
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        toast.error("Task not found", { id: "task-approve" });
        return;
      }

      // Update the task
      await updateTask(taskId, {
        status: "Completed",
        progress: 100,
        rating: metrics.calculatedRating,
        ratingMetrics: {
          speed: metrics.speed,
          corrections: metrics.corrections,
        },
        reviewFeedback: feedback || undefined,
        completedDate: new Date().toISOString(),
      });

      // ⭐ UPDATE ASSIGNEE AURA RATING - Immediate feedback
      if (task.assignee && task.assignee !== "") {
        console.log('⭐ Updating assignee Aura rating after task approval');
        await updateTeamMemberAuraRating(task.assignee, metrics.calculatedRating, metrics.speed);
      }
      
      // ✅ WEBSOCKET AUTO-UPDATE: No need to refetch - WebSocket will update automatically
      
      // Close dialog
      setIsReviewDialogOpen(false);
      setSelectedTask(null);
      
      toast.success(`Task approved with rating ${metrics.calculatedRating}/5`, { id: "task-approve" });
    } catch (error) {
      toast.error("Failed to approve task. Please try again.", { id: "task-approve" });
    }
  };

  const handleRejectTask = async (taskId: number, feedback: string) => {
    try {
      toast.loading("Requesting changes...", { id: "task-reject" });
      
      await updateTask(taskId, {
        status: "Revision Required",
        reviewFeedback: feedback,
      });
      
      // ✅ WEBSOCKET AUTO-UPDATE: No need to refetch - WebSocket will update automatically
      
      // Close dialog
      setIsReviewDialogOpen(false);
      setSelectedTask(null);
      
      toast.success("Changes requested - task sent back to worker", { id: "task-reject" });
    } catch (error) {
      toast.error("Failed to reject task. Please try again.", { id: "task-reject" });
    }
  };

  // ⭐ NEW: Update team member's Aura rating based on task performance
  const updateTeamMemberAuraRating = async (
    memberId: string, 
    taskRating: number, 
    speed: "fast" | "on-time" | "slow"
  ) => {
    try {
      const member = getTeamMember(memberId);
      if (!member) {
        console.warn('⚠️ Team member not found for Aura update:', memberId);
        return;
      }

      // Get all completed tasks for this member with ratings
      const memberTasks = tasks.filter(
        t => t.assignee === memberId && 
        t.status === "Completed" && 
        t.rating !== undefined && 
        t.rating > 0
      );

      // Calculate new Aura rating using weighted average (last 30 tasks)
      const recentTasks = memberTasks.slice(-30); // Last 30 rated tasks
      const totalWeight = recentTasks.reduce((sum, _, idx) => sum + (idx + 1), 0);
      
      let newAuraRating: number;
      if (recentTasks.length === 0) {
        // First rated task - use the task rating directly
        newAuraRating = taskRating;
      } else {
        // Weighted average: more recent tasks have more weight
        const weightedSum = recentTasks.reduce((sum, task, idx) => {
          const weight = idx + 1; // Weight increases for more recent tasks
          return sum + (task.rating! * weight);
        }, 0);
        
        // Add the new task rating with highest weight
        const newWeight = recentTasks.length + 1;
        newAuraRating = (weightedSum + (taskRating * newWeight)) / (totalWeight + newWeight);
      }

      // Round to 1 decimal place
      newAuraRating = Math.round(newAuraRating * 10) / 10;

      // Calculate tasks completed and on-time stats
      const completedCount = memberTasks.length + 1; // +1 for the current task
      const onTimeCount = tasks.filter(
        t => t.assignee === memberId && 
        t.status === "Completed" && 
        (t.ratingMetrics?.speed === "fast" || t.ratingMetrics?.speed === "on-time")
      ).length + (speed === "fast" || speed === "on-time" ? 1 : 0);

      const efficiency = completedCount > 0 
        ? Math.round((onTimeCount / completedCount) * 100) 
        : 0;

      // Update the team member
      await updateTeamMember(member.id, {
        aura_rating: newAuraRating,
        tasks_completed: completedCount,
        tasks_on_time: onTimeCount,
        efficiency: efficiency,
      });

      const oldRating = member.auraRating || 0;
      const ratingChange = newAuraRating - oldRating;
      const changeText = ratingChange > 0 
        ? `+${ratingChange.toFixed(1)}` 
        : ratingChange.toFixed(1);

      console.log('⭐ Aura rating updated:', {
        member: member.name,
        oldRating,
        newRating: newAuraRating,
        change: changeText,
        tasksCompleted: completedCount,
        efficiency: `${efficiency}%`
      });

      // Show feedback toast
      if (Math.abs(ratingChange) >= 0.1) {
        toast.success(`${member.name}'s Aura: ${newAuraRating}/5 (${changeText})`, {
          description: `Efficiency: ${efficiency}% • Tasks: ${completedCount}`,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('❌ Failed to update Aura rating:', error);
      // Don't throw - Aura update failure shouldn't block task approval
    }
  };

  return (
    <div className="flex flex-col gap-[29px] w-full p-[32px]">
      {/* Header */}
      <div>
        <h1 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
          Projects
        </h1>
        <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground mt-[8px]">
          Review and approve completed tasks for quality control
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-[16px]">
        <div className="bg-card border border-border rounded-[20px] p-[20px]">
          <div className="flex items-center gap-[12px]">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                Overdue Tasks
              </p>
              <h3 className="font-['Roboto_Mono'] font-bold text-[18px] text-foreground">
                {overdueTasks}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-[20px] p-[20px]">
          <div className="flex items-center gap-[12px]">
            <AlertCircle className="w-5 h-5 text-warning" />
            <div>
              <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                Pending Review
              </p>
              <h3 className="font-['Roboto_Mono'] font-bold text-[18px] text-foreground">
                {totalTasks}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-[20px] p-[20px]">
          <div className="flex items-center gap-[12px]">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                Urgent Priority
              </p>
              <h3 className="font-['Roboto_Mono'] font-bold text-[18px] text-foreground">
                {urgentTasks}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-[20px] p-[20px]">
          <div className="flex items-center gap-[12px]">
            <CheckCircle className="w-5 h-5 text-success" />
            <div>
              <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase">
                Reviewed Today
              </p>
              <h3 className="font-['Roboto_Mono'] font-bold text-[18px] text-foreground">
                {reviewedToday}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-[20px] p-[20px]">
          <div className="flex items-center gap-[12px] justify-center">
            <div className="flex items-center gap-[4px]">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className="w-4 h-4"
                  fill={star <= avgRating ? "#748B7B" : "none"}
                  stroke="#748B7B"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              ))}
            </div>
            <h3 className="font-['Roboto_Mono'] font-bold text-[18px] text-foreground">
              {avgRating.toFixed(1)}
            </h3>
          </div>
          <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground uppercase text-center mt-[8px]">
            Avg Rating Today
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-[12px] flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-[12px] py-[8px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] font-normal text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Projects</option>
          {uniqueProjects.map((project) => (
            <option key={project!.id} value={project!.id.toString()}>
              {project!.title}
            </option>
          ))}
        </select>
        <select
          value={workerFilter}
          onChange={(e) => setWorkerFilter(e.target.value)}
          className="px-[12px] py-[8px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] font-normal text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Workers</option>
          {uniqueWorkers.map((worker) => (
            <option key={worker!.id} value={worker!.id.toString()}>
              {worker!.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tasks Awaiting Quality Control */}
      <div>
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
            Tasks Awaiting Quality Control
          </h2>
          <button className="px-[12px] py-[6px] bg-transparent border border-border rounded-[6px] hover:bg-card transition-colors font-['Roboto_Mono'] font-medium text-[11px] text-foreground flex items-center gap-[6px]">
            + task
          </button>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="bg-card border border-border rounded-[20px] p-[40px] text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-[16px]" />
            <p className="font-['Roboto_Mono'] font-normal text-[14px] text-muted-foreground">
              {tasksAwaitingReview.length === 0 
                ? "No tasks awaiting review" 
                : "No tasks match your filters"}
            </p>
          </div>
        ) : (
          <div className="space-y-[12px]">
            {filteredTasks.map((task) => {
              const project = projects.find((p) => p.id === task.projectId);
              const assignee = getTeamMember(task.assignee);
              
              return (
                <div
                  key={task.id}
                  className="bg-card border border-border rounded-[12px] p-[20px] hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-[16px]">
                    {/* Left side - Task info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-[12px]">
                        {/* Icon */}
                        <div className="w-[40px] h-[40px] rounded-[8px] bg-warning/10 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5 text-warning" />
                        </div>
                        
                        {/* Task details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground mb-[4px]">
                            {task.title}
                          </h3>
                          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground mb-[12px] line-clamp-2">
                            {task.description}
                          </p>
                          
                          {/* Metadata */}
                          <div className="flex items-center gap-[16px] flex-wrap">
                            <div className="flex items-center gap-[6px]">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                                {assignee?.name || "Unknown"}
                              </span>
                            </div>
                            <div className="flex items-center gap-[6px]">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                            {task.phase && (
                              <span className="px-[8px] py-[2px] bg-muted/30 rounded font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                                {task.phase}
                              </span>
                            )}
                            {task.priority === "Urgent" && (
                              <span className="px-[8px] py-[2px] bg-destructive/10 text-destructive rounded font-['Roboto_Mono'] text-[10px] font-medium">
                                Urgent
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side - Action button */}
                    <button
                      onClick={() => handleReviewTask(task)}
                      className="px-[16px] py-[8px] bg-accent text-white rounded-[6px] hover:bg-accent/90 transition-colors font-['Roboto_Mono'] font-medium text-[11px] flex items-center gap-[6px] shrink-0"
                      style={{ backgroundColor: "var(--accent)" }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Review & Rate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Review Dialog */}
      {selectedTask && (
        <TaskReviewDialog
          isOpen={isReviewDialogOpen}
          onClose={() => {
            setIsReviewDialogOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          projectName={projects.find((p) => p.id === selectedTask.projectId)?.title}
          teamMember={getTeamMember(selectedTask.assignee) || { id: 0, name: "Unknown", role: "Unknown" }}
          onApprove={handleApproveTask}
          onReject={handleRejectTask}
        />
      )}
    </div>
  );
}

// ✅ WEBSOCKET-ONLY: Export a hook to get pending count for notifications
export function usePendingQCCount() {
  const { tasks } = useApp();
  const { hasPermission } = useAuth();

  // Simple memoized count from real-time WebSocket data (no API calls)
  return useMemo(() => {
    if (!hasPermission("canViewQCReviewQueue")) {
      return 0;
    }
    return tasks.filter(
      (t) => t.status === "Ready for Review" || t.status === "Needs Review"
    ).length;
  }, [tasks, hasPermission]);
}