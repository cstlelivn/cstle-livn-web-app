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
} from "lucide-react";
import { AppProvider, useApp } from "./components/AppContext";
import { AuthProvider, useAuth } from "./components/AuthContext";
import Login from "./components/Login";
import { Toaster } from "./components/ui/sonner";
import Dashboard from "./components/Dashboard";
import ProjectsGroup from "./components/ProjectsGroup";
import TeamsGroup from "./components/TeamsGroup";
import CRMModule from "./components/CRMModule";
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
import ProjectClientDiagnostic from "./components/ProjectClientDiagnostic";
import TemplateBuilder from "./components/TemplateBuilder";
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
  | "diagnostic";

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
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [projectsSubView, setProjectsSubView] = useState<SubViewType["projects"]>("projects");
  const [teamsSubView, setTeamsSubView] = useState<SubViewType["teams"]>("team");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

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
    
    // Handle navigation to specific sub-views or IDs
    if (view === "project-details" && subViewOrId !== undefined && subViewOrId !== null) {
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
      label: "Dashboard",
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
      id: "settings",
      label: "Settings",
      icon: Settings,
      show: hasPermission("canViewSettings"),
    },
  ].filter((item) => item.show);

  const renderView = () => {
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
        return <CRMModule />;
      case "inventory":
        return <InventoryModule />;
      case "finance":
        return <FinanceModule />;
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
      case "diagnostic":
        return <ProjectClientDiagnostic />;
      case "templates":
        return <TemplateBuilder />;
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

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <div 
        className={`bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-300 h-screen sticky top-0 ${
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
          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasNotifications = item.id === "projects" && pendingQCCount > 0 && hasPermission("canViewProjects");
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as ViewType)}
                className={`w-full flex items-center px-[8px] py-[6px] transition-colors relative ${
                  currentView === item.id
                    ? "bg-sidebar-accent"
                    : "hover:bg-sidebar-accent/50"
                }`}
              >
                <div className={`flex items-center h-[32px] pl-[8px] rounded-[6px] ${sidebarCollapsed ? 'justify-center w-[32px] pl-0' : 'gap-[8px] w-full'}`}>
                  <div className="relative">
                    <Icon className="w-[16px] h-[16px] text-sidebar-foreground shrink-0" />
                    {hasNotifications && (
                      <div className="absolute -top-[4px] -right-[4px] w-[8px] h-[8px] bg-destructive rounded-full animate-pulse" />
                    )}
                  </div>
                  {!sidebarCollapsed && (
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
          })}
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-[60px] border-b border-border bg-background px-[32px] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-['Anybody'] text-[15px] tracking-[-0.6px] text-foreground leading-[1.64]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
              {selectedProjectId 
                ? "Project Details" 
                : menuItems.find((item) => item.id === currentView)?.label || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-[12px]">
            <GlobalSearch onNavigate={handleNavigate} />
            <NotificationBell onNavigate={handleNavigate} />
            <button
              onClick={handleRefreshRole}
              disabled={isRefreshing}
              className="flex items-center gap-[8px] px-[12px] py-[6px] bg-card rounded-[6px] border border-border hover:bg-accent/10 transition-colors disabled:opacity-50"
              title="Refresh permissions"
            >
              <RefreshCw className={`w-[12px] h-[12px] text-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
              {!sidebarCollapsed && (
                <p className="font-['Roboto_Mono'] text-[10px] text-foreground">
                  Refresh
                </p>
              )}
            </button>
            <div className="flex items-center gap-[8px] px-[12px] py-[6px] bg-card rounded-[6px] border border-border">
              <div className="w-[8px] h-[8px] rounded-full bg-success"></div>
              <p className="font-['Roboto_Mono'] text-[10px] text-foreground">
                Active
              </p>
            </div>
          </div>
        </div>

        {/* Page Content */}
         <div className="flex-1 overflow-y-auto bg-background mx-auto w-full p-[32px]">
          {renderView()}
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