import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Building2,
  UserCircle,
  Package,
  DollarSign,
  BarChart3,
  Settings,
  Image as ImageIcon,
  FileText,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  LogOut,
  RefreshCw,
  CheckSquare,
  ClipboardCheck,
  LayoutTemplate,
  Menu,
  X,
  Calculator,
} from "lucide-react";
import { AppProvider, useApp } from "./components/AppContext";
import { AuthProvider, useAuth } from "./components/AuthContext";
import Login from "./components/Login";
import { Toaster } from "./components/ui/sonner";
import Dashboard from "./components/Dashboard";
import ProjectsGroup from "./components/ProjectsGroup";
import TeamsGroup from "./components/TeamsGroup";
import CRMModule from "./components/CRMModule";
import EstimatingModule from "./components/estimating/EstimatingModule";
import InventoryModule from "./components/InventoryModule";
import FinanceModule from "./components/FinanceModule";
import AnalyticsModule from "./components/AnalyticsModule";
import SettingsModule from "./components/SettingsModule";
import UserManagement from "./components/UserManagement";
import UserEdit from "./components/UserEdit";
import UserProfile from "./components/UserProfile";
import QCReviewQueue, { usePendingQCCount } from "./components/QCReviewQueue";
import GlobalSearch from "./components/GlobalSearch";
import NotificationBell from "./components/NotificationBell";
import TemplateBuilder from "./components/TemplateBuilder";
import TeamProductivityReport from "./components/TeamProductivityReport";
import MobileTaskWorkspace from "./components/MobileTaskWorkspace";
import ErrorBoundary from "./components/ErrorBoundary";
import { isWorkPortalHost } from "./src/lib/workPortal";
import { startOfflineSync } from "./src/features/workSessions/offlineQueue";
import svgPaths from "./imports/svg-ydinhr03gq";

type ViewType =
  | "dashboard"
  | "projects"
  | "teams"
  | "crm"
  | "inventory"
  | "finance"
  | "analytics"
  | "settings"
  | "users"
  | "user-edit"
  | "profile"
  | "productivity"
  | "estimating"
  | "task-details";

type SubViewType = {
  projects: "projects" | "tasks" | "qc-review";
  teams: "team" | "vendors";
};

function CollapsedLogo() {
  return (
    <div className="h-[20.829px] relative shrink-0 w-[32px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 21">
        <g>
          <path d={svgPaths.pa34ae40} fill="white" />
          <path d={svgPaths.p4786000} fill="white" />
        </g>
      </svg>
    </div>
  );
}

function AppContent() {
  const { currentUser, hasPermission, isAuthenticated, isLoading, signOut, refreshUser } = useAuth();
  const { tasks } = useApp();
  // work.cstlelivn.ca is a separate hostname on the same deployment, handed
  // to associates as their link so it never looks like an admin login --
  // see src/lib/workPortal.ts. It strips the sidebar down to just "My
  // Tasks" and forces the mobile task-led dashboard even at desktop width.
  const isWorkPortal = isWorkPortalHost();
  useEffect(() => {
    if (isWorkPortal) document.title = "Cstle Livn — My Tasks";
  }, [isWorkPortal]);
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [estimateToOpen, setEstimateToOpen] = useState<string | null>(null);
  const [projectsSubView, setProjectsSubView] = useState<SubViewType["projects"]>("projects");
  const [teamsSubView, setTeamsSubView] = useState<SubViewType["teams"]>("team");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Keep real browser history in sync with the state-driven app shell. This
  // gives installed iPhone/Android web apps a genuine previous entry, so the
  // native edge-swipe/back gesture works instead of leaving users trapped in
  // a detail screen.
  useEffect(() => {
    const initialState = {
      cstleNavigation: true,
      view: currentView,
      projectsSubView,
      teamsSubView,
      selectedProjectId,
      selectedTaskId,
      selectedUserId,
    };
    window.history.replaceState(initialState, "", window.location.href);

    const restoreNavigation = (event: PopStateEvent) => {
      const state = event.state;
      if (!state?.cstleNavigation) return;
      setCurrentView(state.view || "dashboard");
      setProjectsSubView(state.projectsSubView || "projects");
      setTeamsSubView(state.teamsSubView || "team");
      setSelectedProjectId(state.selectedProjectId ?? null);
      setSelectedTaskId(state.selectedTaskId ?? null);
      setSelectedUserId(state.selectedUserId ?? null);
      setMobileMenuOpen(false);
    };
    window.addEventListener("popstate", restoreNavigation);
    return () => window.removeEventListener("popstate", restoreNavigation);
    // This establishes the initial entry once; later entries are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushNavigation = (next: Partial<{
    view: ViewType;
    projectsSubView: SubViewType["projects"];
    teamsSubView: SubViewType["teams"];
    selectedProjectId: number | null;
    selectedTaskId: string | null;
    selectedUserId: string | null;
  }>) => {
    window.history.pushState({
      cstleNavigation: true,
      view: next.view ?? currentView,
      projectsSubView: next.projectsSubView ?? projectsSubView,
      teamsSubView: next.teamsSubView ?? teamsSubView,
      selectedProjectId: next.selectedProjectId !== undefined ? next.selectedProjectId : selectedProjectId,
      selectedTaskId: next.selectedTaskId !== undefined ? next.selectedTaskId : selectedTaskId,
      selectedUserId: next.selectedUserId !== undefined ? next.selectedUserId : selectedUserId,
    }, "", window.location.href);
  };

  // Start the work-session offline sync loop once per app load -- it's a
  // no-op if there's nothing queued, and self-schedules its own retries.
  useEffect(() => {
    startOfflineSync();
  }, []);

  // Run DB migrations once on app boot via edge function
  useEffect(() => {
    const MIGRATION_KEY = "cstle_migrations_v3_applied";
    if (sessionStorage.getItem(MIGRATION_KEY)) return;
    import("./utils/supabase/info.tsx").then(({ projectId, publicAnonKey }) => {
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/run-migrations`, {
        method: "POST",
        headers: { "apikey": publicAnonKey, "Authorization": `Bearer ${publicAnonKey}` },
      })
        .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
        .then(result => {
          if (result?.ok) {
            sessionStorage.setItem(MIGRATION_KEY, "1");
            console.log("✅ DB migrations applied");
          } else {
            console.warn("⚠️ Migration returned error:", result?.error ?? result);
          }
        })
        .catch(err => {
          // Edge function not deployed yet — silently ignore, app degrades gracefully
          console.warn("⚠️ Migration skipped (redeploy edge function from Make settings):", String(err));
        });
    });
  }, []);
  const [openProjectDialog, setOpenProjectDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Count phases needing QC review for notification badge
  const pendingQCCount = usePendingQCCount();

  // ✅ POLLING REMOVED - User data now syncs via Realtime WebSocket
  // Previously: Polled refreshUser() every 30 seconds
  // Now: Real-time updates via Supabase Realtime subscription

  // Manual refresh handler
  const handleRefreshRole = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full bg-background items-center justify-center">
        <div className="text-center">
          <div className="w-[64px] h-[64px] mx-auto mb-[16px]">
            <CollapsedLogo />
          </div>
          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated || !currentUser) {
    return <Login />;
  }

  const handleNavigate = (view: string, subViewOrId?: string | number) => {
    setOpenProjectDialog(false);
    setMobileMenuOpen(false);
    
    // Handle navigation to specific sub-views or IDs
    if (view === "task-details" && subViewOrId !== undefined && subViewOrId !== null) {
      pushNavigation({ view: "task-details", selectedTaskId: String(subViewOrId) });
      setSelectedTaskId(String(subViewOrId));
      setCurrentView("task-details");
    } else if (view === "project-details" && subViewOrId !== undefined && subViewOrId !== null) {
      // Project ids are UUID strings, not numbers -- this guard used to check
      // `typeof subViewOrId === "number"`, which is never true for a UUID, so
      // this branch silently never ran: dashboard cards, global search, and
      // notifications all called onNavigate("project-details", id) and it
      // did nothing (the card's own CSS press animation was the only visible
      // reaction, which is exactly why it looked like a click that "does
      // nothing").
      setSelectedProjectId(subViewOrId as any);
      setCurrentView("projects");
    } else if (view === "projects") {
      setSelectedProjectId(null);
      setCurrentView("projects");
      if (subViewOrId === "qc-review") {
        setProjectsSubView("qc-review");
      } else if (subViewOrId === "tasks") {
        setProjectsSubView("tasks");
      } else {
        setProjectsSubView("projects");
      }
    } else if (view === "tasks") {
      setSelectedProjectId(null);
      setCurrentView("projects");
      setProjectsSubView("tasks");
    } else if (view === "team") {
      setCurrentView("teams");
      setTeamsSubView("team");
    } else if (view === "vendors") {
      setCurrentView("teams");
      setTeamsSubView("vendors");
    } else {
      setSelectedProjectId(null);
      setCurrentView(view as ViewType);
    }
  };

  const handleNewProject = () => {
    setOpenProjectDialog(true);
    setCurrentView("projects");
    setProjectsSubView("projects");
  };

  const handleProjectSelect = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  const handleEditUser = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentView("user-edit");
  };

  // Define menu items with permission checks - now with logical groupings
  const menuItems = [
    {
      id: "dashboard",
      label: isWorkPortal ? "My Tasks" : "Dashboard",
      icon: LayoutDashboard,
      show: hasPermission("canViewDashboard"),
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderKanban,
      show: hasPermission("canViewProjects"),
    },
    {
      id: "teams",
      label: "Teams",
      icon: Users,
      show: hasPermission("canViewVendors") || hasPermission("canViewTeam"),
    },
    {
      id: "crm",
      label: "CRM",
      icon: UserCircle,
      show: hasPermission("canViewCRM"),
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      show: hasPermission("canViewInventory"),
    },
    {
      id: "finance",
      label: "Finance",
      icon: DollarSign,
      show: hasPermission("canViewFinance"),
    },
    {
      id: "estimating",
      label: "Estimating",
      icon: Calculator,
      show: hasPermission("canViewEstimating"),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      show: hasPermission("canViewAnalytics"),
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
      show: hasPermission("canViewSettings"),
    },
    {
      id: "templates",
      label: "Templates",
      icon: LayoutTemplate,
      show: hasPermission("canManageTemplates"),
    },
    {
      id: "productivity",
      label: "Productivity",
      icon: BarChart3,
      show: hasPermission("canViewAnalytics"),
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      show: hasPermission("canViewSettings"),
    },
  ].filter((item) => item.show && (!isWorkPortal || item.id === "dashboard"));

  // Route-level permission gate. The sidebar already hides links a role
  // can't use, but currentView is just component state -- anything that
  // ever calls setCurrentView/onNavigate with one of these strings (a
  // stale deep-link, browser back/forward restoring state, a future bug in
  // some other component) would previously render the real module with no
  // check at all. "Hiding the menu item" was the only protection; this is
  // the actual enforcement, mirroring the same permission each module's own
  // data-fetching hooks require at the database level.
  const viewPermission: Record<string, Parameters<typeof hasPermission>[0]> = {
    teams: "canViewTeam",
    crm: "canViewCRM",
    inventory: "canViewInventory",
    finance: "canViewFinance",
    estimating: "canViewEstimating",
    analytics: "canViewAnalytics",
    users: "canManageTeam",
    "user-edit": "canManageTeam",
    settings: "canViewSettings",
    templates: "canManageTemplates",
    productivity: "canViewTeamPerformance",
  };

  const renderView = () => {
    const requiredPermission = viewPermission[currentView];
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return (
        <div className="p-[32px] flex flex-col items-center justify-center text-center gap-[12px]">
          <p className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
            You don't have access to this page.
          </p>
          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground max-w-[420px]">
            If you think this is wrong, ask an admin to check your role and permissions.
          </p>
          <button
            type="button"
            onClick={() => handleNavigate("dashboard")}
            className="px-[16px] py-[8px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] text-[11px]"
          >
            Back to Dashboard
          </button>
        </div>
      );
    }

    switch (currentView) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} onNewProject={handleNewProject} />;
      case "projects":
        return (
          <ProjectsGroup
            initialTab={projectsSubView}
            selectedProjectId={selectedProjectId}
            onProjectSelect={handleProjectSelect}
            openCreateDialog={openProjectDialog}
            onDialogOpenChange={() => setOpenProjectDialog(false)}
          />
        );
      case "teams":
        return <TeamsGroup initialTab={teamsSubView} />;
      case "crm":
        return <CRMModule onOpenEstimate={(estimateId) => { setEstimateToOpen(estimateId); setCurrentView('estimating'); }} onOpenProject={(projectId) => { setSelectedProjectId(projectId); setCurrentView('projects'); }} />;
      case "inventory":
        return <InventoryModule />;
      case "finance":
        return <FinanceModule onOpenProject={(projectId) => { setSelectedProjectId(projectId); setCurrentView('projects'); }} />;
      case "estimating":
        return <EstimatingModule initialEstimateId={estimateToOpen} onInitialEstimateOpened={() => setEstimateToOpen(null)} />;
      case "analytics":
        return <AnalyticsModule />;
      case "users":
        return <UserManagement onEditUser={handleEditUser} />;
      case "user-edit":
        return selectedUserId ? (
          <UserEdit userId={selectedUserId} onBack={() => setCurrentView("users")} />
        ) : (
          <UserManagement onEditUser={handleEditUser} />
        );
      case "profile":
        return <UserProfile />;
      case "settings":
        return <SettingsModule />;
      case "templates":
        return <TemplateBuilder />;
      case "productivity":
        return <TeamProductivityReport />;
      case "task-details":
        return selectedTaskId
          ? <MobileTaskWorkspace taskId={selectedTaskId} onBack={() => {
              if (window.history.state?.cstleNavigation) window.history.back();
              else { setSelectedTaskId(null); setCurrentView("dashboard"); }
            }} />
          : <Dashboard onNavigate={handleNavigate} onNewProject={handleNewProject} />;
      default:
        return <Dashboard onNavigate={handleNavigate} onNewProject={handleNewProject} />;
    }
  };

  const handleSidebarMouseEnter = () => {
    if (sidebarCollapsed) {
      const timeout = setTimeout(() => {
        setSidebarCollapsed(false);
      }, 1000);
      setHoverTimeout(timeout);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    if (!sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  };

  // Shared menu-item list markup used by both the desktop hover sidebar and
  // the mobile slide-in drawer, so nav items/permissions never drift between
  // the two -- `collapsed` only ever applies to the desktop rail; the
  // mobile drawer always renders expanded (it has the whole screen width).
  const renderMenuItems = (collapsed: boolean, onItemClick: () => void) =>
    menuItems.map((item) => {
      const Icon = item.icon;
      const hasNotifications = item.id === "projects" && pendingQCCount > 0 && hasPermission("canViewProjects");

      return (
        <button
          key={item.id}
          onClick={() => {
            setCurrentView(item.id as ViewType);
            onItemClick();
          }}
          className={`w-full flex items-center px-[8px] py-[6px] transition-colors relative ${
            currentView === item.id
              ? "bg-sidebar-accent"
              : "hover:bg-sidebar-accent/50"
          }`}
        >
          <div className={`flex items-center h-[32px] pl-[8px] rounded-[6px] ${collapsed ? 'justify-center w-[32px] pl-0' : 'gap-[8px] w-full'}`}>
            <div className="relative">
              <Icon className="w-[16px] h-[16px] text-sidebar-foreground shrink-0" />
              {hasNotifications && (
                <div className="absolute -top-[4px] -right-[4px] w-[8px] h-[8px] bg-destructive rounded-full animate-pulse" />
              )}
            </div>
            {!collapsed && (
              <>
                <p className="font-['Roboto_Mono'] text-[14px] text-sidebar-foreground leading-[20px] flex-1">
                  {item.label}
                </p>
                {hasNotifications && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-[6px] bg-destructive text-white rounded-full font-['Roboto_Mono']" style={{ fontSize: '10px' }}>
                    {pendingQCCount}
                  </span>
                )}
              </>
            )}
          </div>
        </button>
      );
    });

  // h-[100dvh] + overflow-hidden (not min-h) is load-bearing: this is the
  // root flex row for the whole authenticated app shell, and the
  // sidebar/main-content panes below are each their own `overflow-y-auto`
  // box that's only able to scroll internally if this ancestor is height-
  // *capped* at the viewport, not just height-floored. With min-h, this
  // row silently grows taller than the viewport to fit content instead of
  // clipping it, so the inner panes never actually overflow (nothing to
  // scroll) and the browser falls back to scrolling <html> itself. That's
  // what broke every dropdown in this app when deep in a long list: Radix
  // Select's on-open positioning/scroll-into-view logic expects a real
  // contained scroll box, and with none, it operated on <html>, causing
  // the whole page to jump back to scrollTop 0 with a stuck scroll-lock.
  // Confirmed live before/after this specific change.
  return (
    <div className="flex h-[100dvh] w-full max-w-full min-w-0 overflow-hidden bg-background">
      {/* Mobile nav drawer -- hidden entirely above the md breakpoint, where
          the hover sidebar below takes over. Backdrop tap or picking an item
          closes it. */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[240px] bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="h-[60px] border-b border-sidebar-border flex items-center justify-between px-[16px] shrink-0">
              <CollapsedLogo />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-[4px] hover:bg-sidebar-accent/50 rounded-[4px] transition-colors"
                aria-label="Close menu"
              >
                <X className="w-[18px] h-[18px] text-sidebar-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-[16px]">
              {renderMenuItems(false, () => setMobileMenuOpen(false))}
            </div>
            <div className="border-t border-sidebar-border px-[16px] py-[16px]">
              <div className="flex items-center gap-[8px]">
                <button
                  onClick={() => {
                    setCurrentView("profile");
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-[8px] flex-1 min-w-0 hover:bg-sidebar-accent/50 transition-colors cursor-pointer rounded-[6px] p-[4px] -ml-[4px]"
                >
                  <div className="w-[32px] h-[32px] rounded-full bg-accent flex items-center justify-center shrink-0">
                    <UserCircle className="w-[20px] h-[20px] text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-['Roboto_Mono'] text-[11px] text-sidebar-foreground truncate text-left">
                      {currentUser.name}
                    </p>
                    <p className="font-['Roboto_Mono'] text-[10px] text-sidebar-foreground/60 truncate text-left">
                      {currentUser.role}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    signOut();
                  }}
                  className="p-[4px] hover:bg-sidebar-accent rounded-[4px] transition-colors shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-[14px] h-[14px] text-sidebar-foreground/60" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar (desktop only) */}
      <div
        className={`hidden md:flex bg-sidebar border-r border-sidebar-border flex-col shrink-0 transition-all duration-300 h-screen sticky top-0 ${
          sidebarCollapsed ? "w-[64px]" : "w-[200px]"
        }`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        {/* Sidebar Header with Toggle */}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="h-[60px] border-b border-sidebar-border hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
        >
          <div className="flex flex-col h-[70px] items-center justify-center h-full">
            <div className="flex items-center justify-center w-full">
              <CollapsedLogo />
            </div>
          </div>
        </button>

        {/* Sidebar Menu */}
        <div className="flex-1 overflow-y-auto py-[16px]">
          {renderMenuItems(sidebarCollapsed, () => {})}
        </div>

        {/* User Info / Sign Out */}
        <div className="border-t border-sidebar-border px-[16px] py-[16px]">
          {sidebarCollapsed ? (
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center p-[8px] hover:bg-sidebar-accent/50 rounded-[6px] transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-[16px] h-[16px] text-sidebar-foreground/60" />
            </button>
          ) : (
            <div className="flex items-center gap-[8px]">
              <button 
                onClick={() => setCurrentView("profile")}
                className="flex items-center gap-[8px] flex-1 min-w-0 hover:bg-sidebar-accent/50 transition-colors cursor-pointer rounded-[6px] p-[4px] -ml-[4px]"
              >
                <div className="w-[32px] h-[32px] rounded-full bg-accent flex items-center justify-center shrink-0">
                  <UserCircle className="w-[20px] h-[20px] text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-['Roboto_Mono'] text-[11px] text-sidebar-foreground truncate text-left">
                    {currentUser.name}
                  </p>
                  <p className="font-['Roboto_Mono'] text-[10px] text-sidebar-foreground/60 truncate text-left" title={`Role: ${currentUser.role}`}>
                    {currentUser.role}
                  </p>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  signOut();
                }}
                className="p-[4px] hover:bg-sidebar-accent rounded-[4px] transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-[14px] h-[14px] text-sidebar-foreground/60" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 max-w-full flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className={`${currentView === "task-details" ? "hidden md:flex" : "flex"} min-h-[calc(60px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-border bg-background px-[12px] md:px-[32px] items-center justify-between gap-[8px] shrink-0`}>
          <div className="flex items-center gap-[8px] min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-[6px] -ml-[4px] hover:bg-accent/10 rounded-[6px] transition-colors shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-[20px] h-[20px] text-foreground" />
            </button>
            <h2 className="font-['Anybody'] text-[14px] md:text-[15px] tracking-[-0.6px] text-foreground leading-[1.64] truncate" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
              {selectedProjectId
                ? "Project Details"
                : menuItems.find((item) => item.id === currentView)?.label || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-[6px] md:gap-[12px] shrink-0">
            <GlobalSearch onNavigate={handleNavigate} />
            <NotificationBell onNavigate={handleNavigate} />
            <button
              onClick={handleRefreshRole}
              disabled={isRefreshing}
              className="flex items-center gap-[8px] px-[8px] py-[6px] md:px-[12px] bg-card rounded-[6px] border border-border hover:bg-accent/10 transition-colors disabled:opacity-50"
              title="Refresh permissions"
            >
              <RefreshCw className={`w-[12px] h-[12px] text-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
              {!sidebarCollapsed && (
                <p className="hidden md:block font-['Roboto_Mono'] text-[10px] text-foreground">
                  Refresh
                </p>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-[8px] px-[12px] py-[6px] bg-card rounded-[6px] border border-border">
              <div className="w-[8px] h-[8px] rounded-full bg-success"></div>
              <p className="font-['Roboto_Mono'] text-[10px] text-foreground">
                Active
              </p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className={`flex-1 overflow-y-auto bg-background mx-auto w-full ${currentView === "task-details" ? "p-[16px] md:p-[32px]" : "p-[16px] md:p-[32px]"}`}>
          <ErrorBoundary key={currentView}>
            {renderView()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
        <Toaster />
      </AppProvider>
    </AuthProvider>
  );
}
