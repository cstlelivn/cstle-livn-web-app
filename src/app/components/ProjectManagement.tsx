import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  List,
  Grid3x3,
  BarChart2,
  MapPin,
  DollarSign,
  Clock,
  Users as UsersIcon,
  ChevronLeft,
  ChevronRight,
  Tag,
  Save,
  X,
} from "lucide-react";
import { useApp, type Project } from "./AppContext";
import { useAuth } from "./AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import TableFilter, { type FilterConfig, type Filters } from "./TableFilter";
import ProjectDetailsReal from "./ProjectDetailsReal";
import ProjectKanban from "./ProjectKanban";
import ProjectGanttChart from "./ProjectGanttChart";
import { getPhaseTemplates, type PhaseTemplate } from "./PhaseTemplateManager";
import CreateProjectDialog from "./CreateProjectDialog";
import { formatDate } from "../src/lib/dates";
import { toast } from "sonner";

// Default phases for Cstle Livn
const DEFAULT_PHASES = [
  "Planning",
  "Prepping",
  "Production",
  "Finishing",
  "Final Inspection",
  "Delivered/Completed",
];

// Get phases from localStorage or use defaults
function getProjectPhases(): string[] {
  const saved = localStorage.getItem("project_phases");
  return saved ? JSON.parse(saved) : DEFAULT_PHASES;
}

interface ProjectManagementProps {
  onViewProject: (projectId: number) => void;
  openCreateDialog?: boolean;
  onDialogOpenChange?: () => void;
}

export default function ProjectManagement({ onViewProject, openCreateDialog = false, onDialogOpenChange }: ProjectManagementProps) {
  const { projects: allProjects, tasks, clients, teamMembers, addProject, deleteProject, getTeamMember, addClient } = useApp();
  const { hasPermission, currentUser } = useAuth();
  const canViewFinance = hasPermission("canViewFinance");
  const canDeleteProjects = hasPermission("canEditProjects");

  // Without canViewAllProjects (e.g. Associates), only show projects where
  // the current person actually has a task assigned -- otherwise everyone
  // saw every project in the company regardless of role, since nothing
  // previously read this permission at all.
  const projects = useMemo(() => {
    if (hasPermission("canViewAllProjects")) return allProjects;
    const myMember = teamMembers.find((m: any) => String(m.authUserId) === String(currentUser?.id));
    if (!myMember) return [];
    const myProjectIds = new Set(
      tasks.filter((t: any) => String(t.assignee) === String(myMember.id)).map((t: any) => t.projectId)
    );
    return allProjects.filter((p) => myProjectIds.has(p.id));
  }, [allProjects, tasks, teamMembers, currentUser, hasPermission]);
  const [view, setView] = useState<"list" | "grid" | "gantt">("list");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    selects: {},
  });

  // Open dialog when prop changes
  useEffect(() => {
    if (openCreateDialog) {
      setIsCreateDialogOpen(true);
      // Reset the flag in parent after opening
      onDialogOpenChange?.();
    }
  }, [openCreateDialog, onDialogOpenChange]);

  const handleDeleteProject = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      try {
        await deleteProject(projectToDelete);
        toast.success("Project deleted");
      } catch (error) {
        toast.error("Failed to delete project");
      }
      setProjectToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  // Filter and sort projects
  const filteredProjects = projects
    .filter((project) => {
      // Text search filter
      const matchesSearch = !filters.search || 
        project.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        project.client.toLowerCase().includes(filters.search.toLowerCase()) ||
        project.location.toLowerCase().includes(filters.search.toLowerCase());
      
      // Status select filter
      const matchesStatus = !filters.selects?.status || 
        filters.selects.status === "all" || 
        project.status === filters.selects.status;
      
      // Date range filter (start date)
      const matchesDateFrom = !filters.dateFrom || 
        new Date(project.startDate) >= new Date(filters.dateFrom);
      
      const matchesDateTo = !filters.dateTo || 
        new Date(project.endDate) <= new Date(filters.dateTo);
      
      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      if (!filters.sortBy) return 0;

      const order = filters.sortOrder === "asc" ? 1 : -1;

      switch (filters.sortBy) {
        case "name":
          return order * a.title.localeCompare(b.title);
        case "client":
          return order * a.client.localeCompare(b.client);
        case "startDate":
          return order * (new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        case "endDate":
          return order * (new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
        case "budget":
          return order * (a.budget - b.budget);
        case "progress":
          return order * (a.progress - b.progress);
        case "status":
          return order * a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  // Filter configuration
  const filterConfig: FilterConfig[] = [
    {
      type: "text",
      field: "search",
      label: "Search",
      placeholder: "Search by name, client, location...",
    },
    {
      type: "date",
      field: "dateRange",
      label: "Date Range",
    },
    {
      type: "select",
      field: "status",
      label: "Status",
      options: [
        { value: "Planning", label: "Planning" },
        { value: "In Progress", label: "In Progress" },
        { value: "On Hold", label: "On Hold" },
        { value: "Delayed", label: "Delayed" },
        { value: "Completed", label: "Completed" },
      ],
    },
  ];

  // Sort options configuration
  const sortOptions = [
    { field: "name", label: "Project Name" },
    { field: "client", label: "Client" },
    { field: "startDate", label: "Start Date" },
    { field: "endDate", label: "End Date" },
    { field: "progress", label: "Progress" },
    { field: "status", label: "Status" },
    ...(canViewFinance ? [{ field: "budget", label: "Budget" }] : []),
  ];

  return (
    <div className="flex flex-col gap-[29px] w-full px-[0px] py-[32px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
            Projects
          </h1>
          <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground leading-[1.2] mt-[4px]">
            Manage all your projects and timelines
          </p>
        </div>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-[8px] px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <p className="font-['Roboto_Mono'] font-medium text-[14px]">New Project</p>
        </button>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex items-center gap-[12px]">
        <TableFilter
          filters={filterConfig}
          onFilterChange={setFilters}
          searchPlaceholder="Search by name, client, location..."
          sortOptions={sortOptions}
        />

        <div className="flex items-center gap-[4px] bg-card border border-border rounded-[6px] p-[2px] ml-auto">
          <button
            onClick={() => setView("list")}
            className={`p-[6px] rounded-[4px] transition-colors ${
              view === "list"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="List View"
          >
            <List className="w-[14px] h-[14px]" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`p-[6px] rounded-[4px] transition-colors ${
              view === "grid"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid View"
          >
            <Grid3x3 className="w-[14px] h-[14px]" />
          </button>
          <button
            onClick={() => setView("gantt")}
            className={`p-[6px] rounded-[4px] transition-colors ${
              view === "gantt"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Gantt View"
          >
            <BarChart2 className="w-[14px] h-[14px]" />
          </button>
        </div>
      </div>

      {/* Projects Display */}
      {view === "list" && (
        <div className="space-y-[12px]">
          {filteredProjects.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              onViewProject={onViewProject}
              onDeleteClick={handleDeleteProject}
              canViewFinance={canViewFinance}
              canDeleteProjects={canDeleteProjects}
            />
          ))}
        </div>
      )}

      {view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
          {filteredProjects.map((project) => (
            <ProjectGridItem
              key={project.id}
              project={project}
              onViewProject={onViewProject}
              onDeleteClick={handleDeleteProject}
              canViewFinance={canViewFinance}
              canDeleteProjects={canDeleteProjects}
              getTeamMember={getTeamMember}
            />
          ))}
        </div>
      )}

      {view === "gantt" && <ProjectGanttView projects={filteredProjects} onViewProject={onViewProject} />}

      {filteredProjects.length === 0 && (
        <div className="bg-card border border-border rounded-[12px] p-[40px] text-center">
          <p className="font-['Roboto_Mono'] font-normal text-[14px] text-muted-foreground">
            No projects found matching your filters
          </p>
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateProject={(projectData: any) => {
          // When creating from a template, CreateProjectDialog already calls
          // createProject() itself (it needs the real id back to attach
          // phases), so projectData here is already a saved DB row (has an
          // id). Calling addProject on it again would insert a duplicate --
          // only create it here for the legacy manual-phases path, which
          // passes a plain payload with no id yet.
          if (!projectData?.id) {
            addProject(projectData);
          }
          setIsCreateDialogOpen(false);
        }}
        canViewFinance={canViewFinance}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type ProjectRow = ReturnType<typeof useApp>["projects"][0];

interface ProjectCardProps {
  project: ProjectRow;
  onViewProject: (id: number) => void;
  onDeleteClick: (id: number, e: React.MouseEvent) => void;
  canViewFinance: boolean;
  canDeleteProjects: boolean;
}

// Hoisted to module scope (was previously defined inside ProjectManagement's
// render body) -- a component defined inside another component's render is a
// brand new function identity on every render, so React treated every card as
// a new component type and destroyed/rebuilt the whole DOM subtree on every
// re-render, which is what caused the constant hover/shadow flicker.
function ProjectListItem({ project, onViewProject, onDeleteClick, canViewFinance, canDeleteProjects }: ProjectCardProps) {
  return (
    <div className="relative group">
      <button
        onClick={() => onViewProject(project.id)}
        className="w-full flex items-center gap-[16px] p-[16px] bg-card border border-border rounded-[8px] hover:shadow-md transition-all text-left"
      >
        <div
          className={`w-[4px] h-[60px] rounded-full shrink-0 ${
            project.status === "In Progress"
              ? "bg-accent"
              : project.status === "Delayed"
              ? "bg-destructive"
              : project.status === "Completed"
              ? "bg-success"
              : "bg-muted"
          }`}
        />
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-[16px] items-center">
        <div className="col-span-3">
          <h4 className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground mb-[4px]">
            {project.title}
          </h4>
          <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
            {project.client}
          </p>
        </div>
        <div className="col-span-2">
          <div className="flex items-center gap-[6px]">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground truncate">
              {project.location}
            </p>
          </div>
        </div>
        {canViewFinance && (
          <div className="col-span-2">
            <div className="flex items-center gap-[6px]">
              <DollarSign className="w-3 h-3 text-muted-foreground" />
              <p className="font-['Roboto_Mono'] font-normal text-[11px] text-foreground">
                ${(project.spent / 1000).toFixed(0)}K / ${(project.budget / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        )}
        <div className="col-span-2">
          <div className="flex items-center gap-[6px]">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
              {project.endDate ? formatDate(project.endDate) : "—"}
            </p>
          </div>
        </div>
        <div className="col-span-2">
          <div
            className={`px-[12px] py-[4px] rounded-full text-[10px] font-['Roboto_Mono'] font-medium text-center ${
              project.status === "In Progress"
                ? "bg-accent/10 text-accent"
                : project.status === "Delayed"
                ? "bg-destructive/10 text-destructive"
                : project.status === "Completed"
                ? "bg-success/10 text-success"
                : "bg-muted/10 text-muted"
            }`}
          >
            {project.status}
          </div>
        </div>
        <div className="col-span-1">
          <div className="flex items-center justify-center">
            <div className="relative w-[40px] h-[40px]">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="var(--secondary)"
                  strokeWidth="4"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  strokeDasharray={`${(project.progress / 100) * 100.53} 100.53`}
                  strokeLinecap="round"
                />
              </svg>
              <p className="absolute inset-0 flex items-center justify-center font-['Roboto_Mono'] font-bold text-[10px] text-foreground">
                {project.progress}%
              </p>
            </div>
          </div>
        </div>
        </div>
      </button>
      {canDeleteProjects && (
        <button
          onClick={(e) => onDeleteClick(project.id, e)}
          className="absolute right-[16px] top-1/2 -translate-y-1/2 p-[8px] rounded-[6px] bg-background border border-border hover:bg-destructive hover:border-destructive hover:text-white transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function ProjectGridItem({ project, onViewProject, onDeleteClick, canViewFinance, canDeleteProjects, getTeamMember }: ProjectCardProps & { getTeamMember: (id: string) => { name: string } | undefined }) {
  const teamNames = project.team
    .map((id: string) => getTeamMember(id)?.name)
    .filter(Boolean);

  return (
    <div className="relative group">
      <button
        onClick={() => onViewProject(project.id)}
        className="w-full bg-card border border-border rounded-[12px] p-[20px] hover:shadow-md transition-all text-left"
      >
        <div className="flex items-start justify-between mb-[16px]">
          <div className="flex-1">
            <h4 className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground mb-[4px]">
              {project.title}
            </h4>
            <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
              {project.client}
            </p>
          </div>
          <div
            className={`px-[12px] py-[4px] rounded-full text-[10px] font-['Roboto_Mono'] font-medium ${
              project.status === "In Progress"
                ? "bg-accent/10 text-accent"
                : project.status === "Delayed"
                ? "bg-destructive/10 text-destructive"
                : project.status === "Completed"
                ? "bg-success/10 text-success"
                : "bg-muted/10 text-muted"
            }`}
          >
            {project.status}
          </div>
        </div>

      <div className="space-y-[12px] mb-[16px]">
        <div className="flex items-center gap-[6px]">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
            {project.location}
          </p>
        </div>
        {canViewFinance && (
          <div className="flex items-center gap-[6px]">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <p className="font-['Roboto_Mono'] font-normal text-[11px] text-foreground">
              ${project.spent.toLocaleString()} / ${project.budget.toLocaleString()}
            </p>
          </div>
        )}
        <div className="flex items-center gap-[6px]">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
            {project.startDate ? formatDate(project.startDate) : "—"} → {project.endDate ? formatDate(project.endDate) : "—"}
          </p>
        </div>
        {teamNames.length > 0 && (
          <div className="flex items-center gap-[6px]">
            <UsersIcon className="w-3 h-3 text-muted-foreground" />
            <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground truncate">
              {teamNames.join(", ")}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-[8px]">
        <div className="flex items-center justify-between">
          <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground">
            {project.phase}
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
      </div>
      </button>
      {canDeleteProjects && (
        <button
          onClick={(e) => onDeleteClick(project.id, e)}
          className="absolute top-[20px] right-[20px] p-[8px] rounded-[6px] bg-background border border-border hover:bg-destructive hover:border-destructive hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-10"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Gantt View Component
function ProjectGanttView({ projects, onViewProject }: { projects: typeof useApp extends () => infer R ? R["projects"] : never; onViewProject: (id: number) => void }) {
  const [zoomLevel, setZoomLevel] = useState<"day" | "week" | "month">("week");

  // Get date range for all projects
  const getAllDates = () => {
    if (projects.length === 0) return { start: new Date(), end: new Date() };
    
    const dates = projects.flatMap((p) => [new Date(p.startDate), new Date(p.endDate)]);
    const start = new Date(Math.min(...dates.map((d) => d.getTime())));
    const end = new Date(Math.max(...dates.map((d) => d.getTime())));
    
    // Add padding
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);
    
    return { start, end };
  };

  const { start: rangeStart, end: rangeEnd } = getAllDates();
  const totalDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));

  const getProjectPosition = (project: typeof projects[0]) => {
    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);
    const startOffset = Math.ceil((projectStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const getMonthMarkers = () => {
    const markers: { date: Date; label: string; position: number }[] = [];
    const current = new Date(rangeStart);
    
    while (current <= rangeEnd) {
      const daysFromStart = Math.ceil((current.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
      markers.push({
        date: new Date(current),
        label: current.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        position: (daysFromStart / totalDays) * 100,
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return markers;
  };

  const getWeekMarkers = () => {
    const markers: { date: Date; position: number }[] = [];
    const current = new Date(rangeStart);
    
    while (current <= rangeEnd) {
      const daysFromStart = Math.ceil((current.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
      markers.push({
        date: new Date(current),
        position: (daysFromStart / totalDays) * 100,
      });
      current.setDate(current.getDate() + 7);
    }
    
    return markers;
  };

  const getTodayPosition = () => {
    const today = new Date();
    const daysFromStart = Math.ceil((today.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    return (daysFromStart / totalDays) * 100;
  };

  const monthMarkers = getMonthMarkers();
  const weekMarkers = getWeekMarkers();
  const todayPosition = getTodayPosition();

  return (
    <div className="bg-card border border-border rounded-[20px] p-[24px]">
      {/* Gantt Header */}
      <div className="flex items-center justify-between mb-[24px]">
        <div>
          <h3 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
            Project Timeline
          </h3>
          <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
            {rangeStart.toLocaleDateString()} - {rangeEnd.toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-[8px] bg-background border border-border rounded-[6px] p-[4px]">
          <button
            onClick={() => setZoomLevel("day")}
            className={`px-[12px] py-[6px] rounded-[4px] font-['Roboto_Mono'] font-medium text-[11px] transition-colors ${
              zoomLevel === "day" ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-secondary"
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setZoomLevel("week")}
            className={`px-[12px] py-[6px] rounded-[4px] font-['Roboto_Mono'] font-medium text-[11px] transition-colors ${
              zoomLevel === "week" ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-secondary"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setZoomLevel("month")}
            className={`px-[12px] py-[6px] rounded-[4px] font-['Roboto_Mono'] font-medium text-[11px] transition-colors ${
              zoomLevel === "month" ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-secondary"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Timeline Header */}
          <div className="relative h-[60px] mb-[16px] bg-background border border-border rounded-[8px] p-[12px]">
            {monthMarkers.map((marker, index) => (
              <div
                key={index}
                className="absolute top-[12px]"
                style={{ left: `${marker.position}%` }}
              >
                <p className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground">
                  {marker.label}
                </p>
              </div>
            ))}
            
            {/* Week dividers */}
            {weekMarkers.map((marker, index) => (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-[1px] bg-border"
                style={{ left: `${marker.position}%` }}
              />
            ))}

            {/* Today marker */}
            {todayPosition >= 0 && todayPosition <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-accent"
                style={{ left: `${todayPosition}%` }}
              >
                <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 px-[6px] py-[2px] bg-accent rounded-[4px]">
                  <p className="font-['Roboto_Mono'] font-bold text-[8px] text-accent-foreground whitespace-nowrap">
                    Today
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Project Bars */}
          <div className="space-y-[12px]">
            {projects.map((project) => {
              const position = getProjectPosition(project);
              return (
                <div key={project.id} className="flex items-center gap-[16px]">
                  {/* Project Info */}
                  <div className="w-[250px] shrink-0">
                    <h4 className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground mb-[2px] truncate">
                      {project.title}
                    </h4>
                    <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground truncate">
                      {project.client}
                    </p>
                  </div>

                  {/* Gantt Bar Container */}
                  <div className="flex-1 relative h-[48px]">
                    {/* Background grid */}
                    <div className="absolute inset-0 flex">
                      {weekMarkers.map((marker, index) => (
                        <div
                          key={index}
                          className="flex-1 border-r border-border/30"
                          style={{ 
                            position: "absolute",
                            left: `${marker.position}%`,
                            width: `${index < weekMarkers.length - 1 ? weekMarkers[index + 1].position - marker.position : 100 - marker.position}%`,
                            height: "100%"
                          }}
                        />
                      ))}
                    </div>

                    {/* Project bar */}
                    <button
                      onClick={() => onViewProject(project.id)}
                      className="absolute top-1/2 -translate-y-1/2 h-[32px] rounded-[6px] transition-all hover:shadow-md hover:scale-105 group"
                      style={{ 
                        left: position.left, 
                        width: position.width,
                        minWidth: "60px",
                        backgroundColor: project.status === "In Progress"
                          ? "rgba(116, 139, 123, 0.3)"
                          : project.status === "Delayed"
                          ? "rgba(220, 38, 38, 0.3)"
                          : project.status === "Completed"
                          ? "rgba(34, 197, 94, 0.3)"
                          : "rgba(132, 133, 128, 0.3)",
                        border: `2px solid ${
                          project.status === "In Progress"
                            ? "rgb(116, 139, 123)"
                            : project.status === "Delayed"
                            ? "rgb(220, 38, 38)"
                            : project.status === "Completed"
                            ? "rgb(34, 197, 94)"
                            : "rgb(132, 133, 128)"
                        }`
                      }}
                    >
                      <div className="flex items-center justify-between h-full px-[8px]">
                        <div className="flex-1 min-w-0">
                          <p className="font-['Roboto_Mono'] font-bold text-[10px] text-foreground truncate">
                            {project.progress}%
                          </p>
                        </div>
                        {/* Progress overlay */}
                        <div
                          className="absolute inset-0 rounded-[4px] transition-all"
                          style={{
                            width: `${project.progress}%`,
                            backgroundColor: project.status === "In Progress"
                              ? "rgba(116, 139, 123, 0.5)"
                              : project.status === "Delayed"
                              ? "rgba(220, 38, 38, 0.5)"
                              : project.status === "Completed"
                              ? "rgba(34, 197, 94, 0.5)"
                              : "rgba(132, 133, 128, 0.5)",
                          }}
                        />
                      </div>
                    </button>
                  </div>

                  {/* Duration */}
                  <div className="w-[80px] shrink-0 text-right">
                    <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground">
                      {Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
