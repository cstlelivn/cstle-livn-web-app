import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { formatDate } from "../src/lib/dates";
import { FolderKanban, ExternalLink, Clock } from "lucide-react";
import svgPaths from "../imports/svg-kds79s2oqf";
import RecentTasksWidget from "./RecentTasksWidget";
import AIInsightsWidget from "./AIInsightsWidget";

interface DashboardProps {
  onNavigate: (view: string, id?: number) => void;
  onNewProject: () => void;
}

export default function Dashboard({ onNavigate, onNewProject }: DashboardProps) {
  const {
    projects,
    tasks,
    teamMembers,
    transactions,
    activities,
    getTeamMember,
    googleReviewsUrl,
  } = useApp();
  
  const { hasPermission } = useAuth();

  // Check permissions
  const canViewFinance = hasPermission("canViewFinance");
  const canViewTeam = hasPermission("canViewTeam");

  // Calculate real stats
  const activeProjects = projects.filter(
    (p) => p.status === "In Progress" || p.status === "Planning"
  );
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
    <div className="flex flex-col gap-[29px] w-full px-[0px] py-[32px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Anybody'] leading-[1.64] text-[15px] tracking-[-0.6px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
            Welcome Back
          </h1>
          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground leading-[1.2] mt-[4px]">
            Here's what's happening with your projects today
          </p>
        </div>
        <div className="flex items-center gap-[12px]">
          <button
            onClick={onNewProject}
            className="flex items-center gap-[8px] px-[20px] py-[10px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity shadow-sm"
          >
            <FolderKanban className="w-4 h-4" />
            <p className="font-['Roboto_Mono'] text-[10px]">
              New Project
            </p>
          </button>
          <button
            onClick={() => window.open(googleReviewsUrl, "_blank")}
            className="flex items-center gap-[8px] px-[16px] py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-foreground" />
            <p className="font-['Roboto_Mono'] text-[10px] text-foreground">
              Google Reviews
            </p>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="content-stretch flex gap-[16px] items-center">
        {stats.map((stat, index) => {
          return (
            <button
              key={index}
              onClick={stat.onClick}
              className="basis-0 grow min-h-px min-w-px relative rounded-[20px] shrink-0 cursor-pointer"
              style={{ backgroundImage: "linear-gradient(90deg, rgb(247, 247, 247) 0%, rgb(247, 247, 247) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}
            >
              <div className="overflow-clip rounded-[inherit] size-full">
                <div className="box-border content-stretch flex flex-col gap-[12px] items-start p-[16px] relative w-full">
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
                    <p className="[white-space-collapse:collapse] basis-0 font-['Roboto_Mono'] font-normal grow leading-[1.2] min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[#999999] text-[10px] text-nowrap uppercase">
                      {stat?.label || "Loading..."}
                    </p>
                    {stat?.iconType === "folder" && (
                      <div className="relative shrink-0 size-[24px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <g>
                            <path d={svgPaths?.p281b8900 || ""} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </g>
                        </svg>
                      </div>
                    )}
                    {stat?.iconType === "roller-brush" && (
                      <div className="relative shrink-0 size-[24px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <g>
                            <path d={svgPaths?.p1e07ff00 || ""} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </g>
                        </svg>
                      </div>
                    )}
                    {stat?.iconType === "line-chart-up" && (
                      <div className="relative shrink-0 size-[24px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <g>
                            <path d={svgPaths?.p38ae7280 || ""} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </g>
                        </svg>
                      </div>
                    )}
                    {stat?.iconType === "coins-hand" && (
                      <div className="relative shrink-0 size-[24px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <g>
                            <path d={svgPaths?.p3c298b00 || ""} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </g>
                        </svg>
                      </div>
                    )}
                    {stat?.iconType === "activity" && (
                      <div className="relative shrink-0 size-[24px]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                          <g>
                            <path d="M22 12H18L15 21L9 3L6 12H2" stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </g>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full">
                    <h1 className="relative shrink-0 text-nowrap whitespace-pre text-[22px]"
  style={{ fontFamily: 'Anybody', fontVariationSettings: "'wdth' 135", fontWeight: 700 }}
>
  {stat?.value ?? "—"}
</h1>
                    <div className="content-stretch flex font-['Roboto_Mono'] font-normal gap-[4px] items-start leading-[1.2] relative shrink-0 text-[10px] w-full">
                      <p className="basis-0 grow min-h-px min-w-px relative shrink-0 text-[#999999] text-[9px]">
                        {stat?.subtitle || "No data available"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div aria-hidden="true" className="absolute border border-[#999999] border-solid inset-0 pointer-events-none rounded-[20px]" />
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
            {activeProjectsList.map((project) => (
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
                      {project.progress}%
                    </p>
                  </div>
                  <div className="w-full h-[6px] bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${project.progress}%` }}
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
            ))}
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
  );
}