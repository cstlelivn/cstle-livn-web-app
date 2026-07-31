import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { formatDate } from "../src/lib/dates";
import { FolderKanban, ExternalLink, Clock, RefreshCw } from "lucide-react";
import { triggerGallerySyncWorkflow } from "../src/features/gallery/api";
import { calculateCompletion } from "../src/lib/progress";
import { toast } from "sonner";
import svgPaths from "../imports/svg-kds79s2oqf";
import RecentTasksWidget from "./RecentTasksWidget";
import AIInsightsWidget from "./AIInsightsWidget";
import MobileTaskDashboard from "./MobileTaskDashboard";
import { useState, useMemo } from "react";

interface DashboardProps {
  onNavigate: (view: string, id?: number) => void;
  onNewProject: () => void;
}

export default function Dashboard({ onNavigate, onNewProject }: DashboardProps) {
  const {
    projects: allProjects,
    tasks,
    teamMembers,
    transactions,
    activities,
    getTeamMember,
    googleReviewsUrl,
  } = useApp();

  const { hasPermission, currentUser } = useAuth();
  const [syncingGallery, setSyncingGallery] = useState(false);

  // Check permissions
  const canViewFinance = hasPermission("canViewFinance");
  const canViewTeam = hasPermission("canViewTeam");
  const isSuperAdmin = hasPermission("canForceCompleteProjects");

  // Without canViewAllProjects, only count/list projects the current person
  // actually has a task in -- otherwise the dashboard showed the whole
  // company's project count and list to every role, Associates included.
  const projects = useMemo(() => {
    if (hasPermission("canViewAllProjects")) return allProjects;
    const myMember = teamMembers.find((m: any) => String(m.authUserId) === String(currentUser?.id));
    if (!myMember) return [];
    const myProjectIds = new Set(
      tasks.filter((t: any) => String(t.assignee) === String(myMember.id)).map((t: any) => t.projectId)
    );
    return allProjects.filter((p) => myProjectIds.has(p.id));
  }, [allProjects, tasks, teamMembers, currentUser, hasPermission]);

  // Handle gallery sync
  const handleSyncGallery = async () => {
    if (!isSuperAdmin) {
      toast.error("Only Super Admins can sync the gallery");
      return;
    }

    setSyncingGallery(true);
    try {
      await triggerGallerySyncWorkflow();
      toast.success("Gallery sync triggered! It will run in the background.");
    } catch (error) {
      console.error("Gallery sync error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to trigger gallery sync");
    } finally {
      setSyncingGallery(false);
    }
  };

  // Calculate real stats. "Active" used to mean status is Planning/In Progress,
  // but project.status is a field nobody ever flips automatically -- a project
  // whose tasks are all done still reads "Planning" until someone explicitly
  // closes it out via the completion gate. Counting those as active made the
  // dashboard KPI misleading (e.g. "13 active" when most were 100% done), so
  // this now also excludes anything whose real, task-derived progress is 100%.
  const activeProjects = useMemo(() => {
    return projects.filter((p) => {
      if (p.status === "Completed") return false;
      const projectTasks = tasks.filter((t: any) => t.projectId === p.id);
      const realProgress =
        projectTasks.length > 0 ? calculateCompletion(projectTasks).percent : p.progress || 0;
      return realProgress < 100;
    });
  }, [projects, tasks]);
  const planningCount = activeProjects.filter((p) => p.status === "Planning").length;
  const inProgressCount = activeProjects.filter((p) => p.status === "In Progress").length;

  // Only calculate financial stats if user has permission
  const currentMonthRevenue = canViewFinance ? transactions
    .filter(
      (t) =>
        t.type === "Income" &&
        t.status === "Completed" &&
        new Date(t.date).getMonth() === new Date().getMonth()
    )
    .reduce((sum, t) => sum + t.amount, 0) : 0;

  const teamMembersWithRatings = teamMembers.filter((m) => m.tasksCompleted > 0);
  const avgSatisfaction =
    teamMembersWithRatings.length > 0
      ? teamMembersWithRatings.reduce((sum, m) => sum + m.auraRating, 0) / teamMembersWithRatings.length
      : 0;

  const openTasks = tasks.filter((t) => t.status !== "Completed");
  const overdueTasks = openTasks.filter((t) => new Date(t.dueDate) < new Date());

  const pendingPaymentsTotal = canViewFinance
    ? transactions
        .filter((t) => t.type === "Expense" && t.status === "Pending")
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;
  const pendingPaymentsCount = canViewFinance
    ? transactions.filter((t) => t.type === "Expense" && t.status === "Pending").length
    : 0;

  const completedPayments = canViewFinance ? transactions.filter(
    (t) => t.type === "Income" && t.status === "Completed"
  ) : [];

  // Build stats array based on permissions. Each subtitle deliberately shows
  // something the headline number doesn't already say -- no repeating the
  // same count twice, and no fake "+100%"-style change indicators (there's
  // no reliable historical baseline to compare against yet).
  const allStats = [
    {
      label: "Active Projects",
      value: activeProjects.length.toString(),
      subtitle: activeProjects.length > 0
        ? `${planningCount} Planning · ${inProgressCount} In Progress`
        : "No active projects",
      iconType: "folder",
      onClick: () => onNavigate("projects", "projects"),
      show: true,
    },
    {
      label: "Overdue Tasks",
      value: overdueTasks.length.toString(),
      subtitle: `of ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}`,
      iconType: "roller-brush",
      onClick: () => onNavigate("tasks"),
      show: true,
    },
    {
      label: "Monthly Revenue",
      value: `$${(currentMonthRevenue / 1000).toFixed(1)}K`,
      subtitle: `${completedPayments.length} payment${completedPayments.length === 1 ? "" : "s"} this month`,
      iconType: "line-chart-up",
      onClick: () => onNavigate("finance"),
      show: canViewFinance,
    },
    {
      label: "Payments Due",
      value: `$${(pendingPaymentsTotal / 1000).toFixed(1)}K`,
      subtitle: `${pendingPaymentsCount} pending payment${pendingPaymentsCount === 1 ? "" : "s"}`,
      iconType: "coins-hand",
      onClick: () => onNavigate("finance"),
      show: canViewFinance,
    },
    {
      label: "Team Performance",
      value: teamMembersWithRatings.length > 0 ? avgSatisfaction.toFixed(1) : "—",
      subtitle: teamMembersWithRatings.length > 0
        ? `Avg. Aura rating · ${teamMembersWithRatings.length} rated`
        : "No completed tasks rated yet",
      iconType: "activity",
      onClick: () => onNavigate("analytics"),
      show: canViewTeam,
    },
  ];

  const stats = allStats.filter(stat => stat.show);

  const activeProjectsList = activeProjects.slice(0, 4);

  const upcomingTasks = tasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      projectId: task.projectId,
      task: task.title,
      deadline: task.dueDate,
      priority: task.priority,
      assignee: getTeamMember(task.assignee)?.name || "Unassigned",
    }));

  const recentActivityList = activities.slice(0, 6).map((activity) => {
    // userId in activities is the Supabase user ID (string), not team member ID (number)
    // For now, just display "User" - could be enhanced to map Supabase ID to team member
    return {
      message: `${activity.action} "${activity.target}"`,
      time: getRelativeTime(activity.timestamp),
      targetId: activity.targetId,
      type: activity.type,
    };
  });

  function getRelativeTime(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  const handleActivityClick = (activity: typeof recentActivityList[0]) => {
    if (activity.type === "project" && activity.targetId) {
      onNavigate("project-details", activity.targetId);
    } else if (activity.type === "team" && activity.targetId) {
      onNavigate("team");
    }
  };

  return (
    <>
      {/* Mobile: task-led view for associates working on site -- see
          MobileTaskDashboard.tsx. Desktop keeps the company-wide overview
          below, unchanged, since that audience (admins/office) is fine
          with the existing layout. */}
      <div className="md:hidden -mx-[16px] -my-[16px]">
        <MobileTaskDashboard
          projects={projects}
          tasks={tasks}
          teamMembers={teamMembers}
          currentUser={currentUser}
          onNavigate={onNavigate}
        />
      </div>
      <div className="hidden md:flex flex-col gap-[29px] w-full px-[0px] py-[32px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-[16px]">
        <div>
          <h1 className="font-['Anybody'] leading-[1.64] text-[15px] tracking-[-0.6px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
            Welcome Back
          </h1>
          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground leading-[1.2] mt-[4px]">
            Here's what's happening with your projects today
          </p>
        </div>
        <div className="flex items-center gap-[8px] md:gap-[12px] overflow-x-auto -mx-[16px] px-[16px] md:mx-0 md:px-0">
          <button
            onClick={onNewProject}
            className="flex items-center gap-[8px] px-[16px] md:px-[20px] py-[10px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity shadow-sm shrink-0"
          >
            <FolderKanban className="w-4 h-4" />
            <p className="font-['Roboto_Mono'] text-[10px]">
              New Project
            </p>
          </button>
          {isSuperAdmin && (
            <button
              onClick={handleSyncGallery}
              disabled={syncingGallery}
              className="flex items-center gap-[8px] px-[16px] py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              title="Trigger website gallery sync from Google Drive"
            >
              <RefreshCw className={`w-4 h-4 text-foreground ${syncingGallery ? "animate-spin" : ""}`} />
              <p className="font-['Roboto_Mono'] text-[10px] text-foreground">
                {syncingGallery ? "Syncing..." : "Sync Gallery"}
              </p>
            </button>
          )}
          <button
            onClick={() => window.open(googleReviewsUrl, "_blank")}
            className="flex items-center gap-[8px] px-[16px] py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors shrink-0"
          >
            <ExternalLink className="w-4 h-4 text-foreground" />
            <p className="font-['Roboto_Mono'] text-[10px] text-foreground">
              Google Reviews
            </p>
          </button>
        </div>
      </div>

      {/* Stats Grid -- on mobile these become a horizontally swipeable strip
          with a fixed card width (there's no room to fit 5 equal-width cards
          on a phone screen without them collapsing into overlapping text).
          From sm up it's a wrapping grid, not a forced single row -- 5
          equal-width flex items at laptop widths left long labels like
          "Monthly Revenue" with no room and forced them under the icon. */}
      <div className="flex gap-[12px] items-stretch overflow-x-auto -mx-[16px] px-[16px] snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-[16px] sm:overflow-visible sm:mx-0 sm:px-0 sm:snap-none lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat, index) => {
          const iconPath =
            stat?.iconType === "folder" ? svgPaths?.p281b8900 :
            stat?.iconType === "roller-brush" ? svgPaths?.p1e07ff00 :
            stat?.iconType === "line-chart-up" ? svgPaths?.p38ae7280 :
            stat?.iconType === "coins-hand" ? svgPaths?.p3c298b00 :
            undefined;
          const iconD = iconPath || (stat?.iconType === "activity" ? "M22 12H18L15 21L9 3L6 12H2" : "");

          return (
            <button
              key={index}
              onClick={stat.onClick}
              className="w-[160px] shrink-0 snap-start sm:w-auto rounded-[20px] cursor-pointer bg-card border border-border hover:border-accent/40 hover:shadow-sm transition-all text-left"
            >
              <div className="box-border content-stretch flex flex-col gap-[14px] items-start p-[18px] relative w-full h-full">
                <div className="content-stretch flex items-start justify-between gap-[8px] relative shrink-0 w-full">
                  <p className="font-['Roboto_Mono'] font-medium leading-[1.3] text-muted-foreground text-[10px] uppercase tracking-wide min-w-0 flex-1">
                    {stat?.label || "Loading..."}
                  </p>
                  {iconD && (
                    <div className="relative shrink-0 size-[32px] rounded-[9px] bg-accent/10 text-accent flex items-center justify-center">
                      <svg className="block" width="17" height="17" fill="none" viewBox="0 0 24 24">
                        <path d={iconD} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full mt-auto">
                  <h1
                    className="relative shrink-0 text-nowrap whitespace-pre text-[24px] text-foreground"
                    style={{ fontFamily: 'Anybody', fontVariationSettings: "'wdth' 135", fontWeight: 700 }}
                  >
                    {stat?.value ?? "—"}
                  </h1>
                  <p className="font-['Roboto_Mono'] font-normal leading-[1.2] text-muted-foreground text-[10px] w-full">
                    {stat?.subtitle || "No data available"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
        {/* Active Projects */}
        <div className="lg:col-span-2 bg-card border border-border rounded-[20px] p-[24px]">
          <div className="flex items-center justify-between mb-[20px]">
            <h2 className="">
              Active Projects
            </h2>
            <button
              onClick={() => onNavigate("projects", "projects")}
              className="font-['Roboto_Mono'] font-medium text-[11px] text-accent hover:text-accent/80 transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-[12px]">
            {activeProjectsList.map((project) => {
              // Live from this project's tasks, not the stored project.progress
              // column -- that column only updates when someone manually saves
              // the phase-name field, so it goes stale the moment a task's
              // status changes any other way (which is how tasks are normally
              // completed).
              const projectProgress = calculateCompletion(
                tasks.filter((t) => t.projectId === project.id)
              ).percent;
              return (
              <button
                key={project.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Project ids are UUID strings, not numbers -- passing them
                  // through parseInt() (as this used to) mangled them into a
                  // garbage number that never matched any real project.
                  onNavigate("project-details", project.id as any);
                }}
                className="w-full p-[16px] rounded-[8px] bg-background border border-border hover:shadow-sm transition-all text-left cursor-pointer relative hover:border-accent active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-[12px]">
                  <div className="flex-1">
                    <h4 className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
                      {project.title}
                    </h4>
                    <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground mt-[4px]">
                      {project.client} • {project.location}
                    </p>
                  </div>
                  <div
                    className={`px-[12px] py-[4px] rounded-full text-[10px] font-['Roboto_Mono'] font-medium ${
                      project.status === "In Progress"
                        ? "bg-accent/10 text-accent"
                        : project.status === "Delayed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {project.status}
                  </div>
                </div>
                <div className="space-y-[8px]">
                  <div className="flex items-center justify-between">
                    <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">
                      Progress
                    </p>
                    <p className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground">
                      {projectProgress}%
                    </p>
                  </div>
                  <div className="w-full h-[6px] bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${projectProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-[4px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <p className="font-['Roboto_Mono'] font-normal">
                        Due: {project.endDate ? formatDate(project.endDate) : "—"}
                      </p>
                    </div>
                    {canViewFinance && (
                      <p className="font-['Roboto_Mono'] font-normal text-muted-foreground">
                        ${(project.spent / 1000).toFixed(0)}K / $
                        {(project.budget / 1000).toFixed(0)}K
                      </p>
                    )}
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-[24px]">
          {/* AI Insights Widget */}
          <AIInsightsWidget />

          {/* Upcoming Tasks */}
          <RecentTasksWidget onNavigateToProjects={() => onNavigate("tasks")} />

          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-[20px] p-[24px]">
            <h3 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
              Recent Activity
            </h3>
            <div className="space-y-[12px]">
              {recentActivityList.map((activity, index) => (
                <button
                  key={index}
                  onClick={() => handleActivityClick(activity)}
                  className="w-full flex items-start gap-[8px] cursor-pointer hover:opacity-70 transition-opacity text-left"
                >
                  <div className="w-[6px] h-[6px] rounded-full bg-accent mt-[6px] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-['Roboto_Mono'] font-normal text-[11px] text-foreground leading-[1.4] mb-[2px]">
                      {activity.message}
                    </p>
                    <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}