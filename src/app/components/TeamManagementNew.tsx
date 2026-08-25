import { useState, useEffect, useMemo } from "react";
import { Plus, Star, Phone, Mail, Award, Calendar, Download, Edit, Trash2, Grid3x3, List, Eye, Loader2, CheckCircle, AlertCircle, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Progress } from "./ui/progress";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import TableFilter, { FilterConfig, SortOption } from "./TableFilter";
import RatingHistoryDialog from "./RatingHistoryDialog";
import EditTeamMemberDialog from "./EditTeamMemberDialog";
import WorkerAuraProfile from "./WorkerAuraProfile";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { createPersonAsAdmin } from "../src/features/team/api";
import { toast } from "sonner";

const ACCOUNT_ROLES = ["Associate", "Contractor", "Accountant", "Manager", "Admin", "Super Admin"];

const TEAM_ROLE_PRESETS = ["General", "Supervisor", "Plumber", "Carpenter", "Electrician", "Painter", "Drywall Installer", "Flooring Installer"];

interface TaskRating {
  taskId: number;
  taskName: string;
  projectName: string;
  rating: number;
  speed: "fast" | "on-time" | "slow";
  corrections: "none" | "minor" | "major";
  feedback: string;
  ratedBy: string;
  ratedAt: string;
}

export default function TeamManagement() {
  const { teamMembers, projects, tasks, deleteTeamMember, addTeamMember, isLoadingTeam } = useApp();
  const { hasPermission, user, users, refreshUsers } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createLogin, setCreateLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [accountRole, setAccountRole] = useState("Associate");
  const [linkExistingUserId, setLinkExistingUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [viewRatingsDialog, setViewRatingsDialog] = useState<number | null>(null);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    selects: {},
    sortBy: "",
    sortOrder: "asc",
  });

  // Form state for new team member
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
    skills: "",
    initialRating: "0", // Default to 0 for new members
  });

  const [taskRatings, setTaskRatings] = useState<Record<number, TaskRating[]>>({});

  const calculateAverageRating = (memberId: number): number => {
    const ratings = taskRatings[memberId] || [];
    if (ratings.length === 0) {
      const member = teamMembers.find(m => m.id === memberId);
      return member?.auraRating || 0;
    }
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return Number((sum / ratings.length).toFixed(1));
  };

  // Aura levels -- 5 tiers, matching the thresholds team_member_aura_profile()
  // (supabase/migrations/20240025_aura_scoring_v2.sql) uses server-side. A
  // real confidence gate (needs >=5 QC'd tasks scored, not just any
  // "tasksCompleted" count) lives in that RPC via getAuraProfile() --
  // this client-side version is a display-only fallback for places that
  // just have the raw rating/count on hand.
  const getAuraLevel = (stars: number, tasksCompleted: number = 0) => {
    if (tasksCompleted < 5) {
      return { level: "New Member", color: "var(--muted-foreground)" };
    }
    if (stars >= 4.5) return { level: "Expert", color: "var(--primary)" };
    if (stars >= 4.0) return { level: "Advanced", color: "var(--accent)" };
    if (stars >= 3.2) return { level: "Skilled", color: "var(--muted-foreground)" };
    return { level: "Developing", color: "var(--muted-foreground)" };
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getActiveProjectsCount = (memberId: number) => {
    return projects.filter(p => 
      p.team?.includes(memberId) && 
      (p.status === "In Progress" || p.status === "Planning")
    ).length;
  };

  const teamMembersWithRatings = teamMembers.map(member => ({
    ...member,
    rating: member.auraRating || member.aura_rating || calculateAverageRating(member.id),
    tasksRated: (taskRatings[member.id] || []).length,
    skills: member.specialties || [],
    type: member.role || "Contractor",
    availability: member.active ? "Available" : "Unavailable",
    joinDate: member.createdAt ? new Date(member.createdAt).toISOString().split('T')[0] : "2024-01",
    projectsCompleted: member.tasksCompleted || member.tasks_completed || 0,
    hoursLogged: Math.round((member.tasksCompleted || member.tasks_completed || 0) * 8),
    activeProjects: getActiveProjectsCount(member.id),
    efficiency: member.efficiency || 0,
  }));

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteMember = async (memberId: number) => {
    setIsDeleting(true);
    try {
      await deleteTeamMember(memberId);
      toast.success("Team member deleted successfully", {
        description: "The team member has been removed from the system.",
        duration: 3000,
      });
      setDeletingMemberId(null);
      if (selectedMember?.id === memberId) {
        setSelectedMember(null);
      }
    } catch (error: any) {
      console.error("Error deleting team member:", error);
      // A team member with any recorded history (task assignments, work
      // sessions, Aura scores, etc.) is protected by ON DELETE RESTRICT
      // foreign keys -- same class of issue already fixed for task/project
      // deletion. A raw FK violation means "this can't be deleted," not a
      // generic failure worth retrying.
      const blocked = /foreign key|violates|restrict/i.test(error?.message || "");
      toast.error("Failed to delete team member", {
        description: blocked
          ? "This person has recorded history (task assignments, work sessions, or Aura scores) and can't be deleted. Mark them inactive instead, or ask an admin to clear their history first."
          : (error.message || "Please try again or contact support."),
        duration: 6000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddTeamMember = async () => {
    // Validate form
    if (!newMemberForm.name.trim()) {
      toast.error("Name required", { description: "Please enter a team member name" });
      return;
    }
    if (!newMemberForm.role.trim()) {
      toast.error("Role required", { description: "Please enter a role" });
      return;
    }
    if (!newMemberForm.email.trim()) {
      toast.error("Email required", { description: "Please enter an email address" });
      return;
    }
    if (!newMemberForm.phone.trim()) {
      toast.error("Phone required", { description: "Please enter a phone number" });
      return;
    }
    if (createLogin && !linkExistingUserId && (!loginPassword || loginPassword.length < 6)) {
      toast.error("Password required", { description: "Enter a password of at least 6 characters for the new login." });
      return;
    }

    if (newMemberForm.role.trim().toLowerCase() === "supervisor") {
      const managerPlus = ["Super Admin", "Admin", "Manager"];
      const linkedUser = linkExistingUserId ? (users || []).find((u: any) => String(u.id) === String(linkExistingUserId)) : null;
      const effectiveLoginRole = linkExistingUserId ? linkedUser?.role : createLogin ? accountRole : null;
      if (!effectiveLoginRole || !managerPlus.includes(effectiveLoginRole)) {
        toast.error("Supervisor requires a Manager+ login", {
          description: "The Team Role 'Supervisor' requires this person to already have (or be given) a System Role of Manager, Admin, or Super Admin.",
        });
        return;
      }
    }

    setIsCreating(true);

    try {
      const specialties = newMemberForm.skills
        ? newMemberForm.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0)
        : [];

      if (linkExistingUserId) {
        // Existing login (e.g. a self-signup) -- just create the team
        // entry and link it, in one step, instead of the old
        // create-then-edit-then-link three-step process.
        await addTeamMember({
          name: newMemberForm.name.trim(),
          role: newMemberForm.role.trim(),
          phone: newMemberForm.phone.trim(),
          email: newMemberForm.email.trim(),
          specialties,
          aura_rating: parseFloat(newMemberForm.initialRating),
          tasks_completed: 0,
          tasks_on_time: 0,
          efficiency: 0,
          active: true,
          auth_user_id: linkExistingUserId,
        } as any);
        toast.success("Team member added and linked", {
          description: `${newMemberForm.name} now shows up in Teams and can be assigned.`,
          duration: 3000,
          icon: <CheckCircle className="w-4 h-4" />,
        });
      } else if (createLogin) {
        // Create a brand-new login AND the linked team entry in one call
        // (POST /admin/create-person) -- an admin picking an elevated role
        // here is honored, unlike the public self-signup path.
        const result = await createPersonAsAdmin({
          name: newMemberForm.name.trim(),
          email: newMemberForm.email.trim(),
          password: loginPassword,
          role: accountRole,
          teamMember: {
            phone: newMemberForm.phone.trim(),
            specialties,
            aura_rating: parseFloat(newMemberForm.initialRating),
          },
        });
        if (result.warning) {
          toast.warning(result.warning, { duration: 8000 });
        } else {
          toast.success("Team member added with a new login!", {
            description: `${newMemberForm.name} can sign in with the password you set.`,
            duration: 3000,
            icon: <CheckCircle className="w-4 h-4" />,
          });
        }
        await refreshUsers?.();
      } else {
        // Roster entry only, no login -- link one later from Edit Team Member.
        await addTeamMember({
          name: newMemberForm.name.trim(),
          role: newMemberForm.role.trim(),
          phone: newMemberForm.phone.trim(),
          email: newMemberForm.email.trim(),
          specialties,
          aura_rating: parseFloat(newMemberForm.initialRating),
          tasks_completed: 0,
          tasks_on_time: 0,
          efficiency: 0,
          active: true,
        });
        toast.success("Team member added!", {
          description: `${newMemberForm.name} has been added to the team.`,
          duration: 3000,
          icon: <CheckCircle className="w-4 h-4" />,
        });
      }

      handleCancelAddTeamMember();

    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member", {
        description: error.message || "Please check the console for details.",
        duration: 5000,
        icon: <AlertCircle className="w-4 h-4" />,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelAddTeamMember = () => {
    setNewMemberForm({
      name: "",
      role: "",
      phone: "",
      email: "",
      skills: "",
      initialRating: "0",
    });
    setCreateLogin(false);
    setLoginPassword("");
    setAccountRole("Associate");
    setLinkExistingUserId(null);
    setIsCreateDialogOpen(false);
  };

  const handleDownloadCSV = () => {
    const headers = ["Name", "Role", "Email", "Phone", "Availability", "Rating", "Aura Level", "Projects Completed", "Hours Logged", "Skills"];
    
    const rows = filteredMembers.map(member => {
      const aura = getAuraLevel(member.rating, member.tasksCompleted);
      return [
        member.name,
        member.role,
        member.email,
        member.phone,
        member.availability,
        member.rating.toString(),
        aura.level,
        member.projectsCompleted.toString(),
        `${member.hoursLogged}h`,
        member.skills.join("; ")
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `team-members-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Team members exported to CSV");
  };

  const filteredMembers = teamMembersWithRatings
    .filter((member) => {
      const matchesSearch = !filters.search ||
        member.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        member.role.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesType = !filters.selects?.type ||
        filters.selects.type === "all" ||
        member.type === filters.selects.type;
      
      const matchesAvailability = !filters.selects?.availability ||
        filters.selects.availability === "all" ||
        member.availability === filters.selects.availability;
      
      return matchesSearch && matchesType && matchesAvailability;
    })
    .sort((a, b) => {
      if (!filters.sortBy) return 0;
      const order = filters.sortOrder === "asc" ? 1 : -1;

      switch (filters.sortBy) {
        case "name":
          return order * a.name.localeCompare(b.name);
        case "rating":
          return order * (a.rating - b.rating);
        case "projectsCompleted":
          return order * (a.projectsCompleted - b.projectsCompleted);
        case "hoursLogged":
          return order * (a.hoursLogged - b.hoursLogged);
        case "joinDate":
          return order * (new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime());
        default:
          return 0;
      }
    });

  const filterConfig: FilterConfig[] = [
    {
      type: "text",
      field: "search",
      label: "Search",
      placeholder: "Search by name or role...",
    },
  ];

  const sortOptions: SortOption[] = [
    { field: "name", label: "Name" },
    { field: "rating", label: "Rating" },
    { field: "projectsCompleted", label: "Projects Completed" },
    { field: "hoursLogged", label: "Hours Logged" },
  ];

  // Logins that exist but have no matching team_members row -- the state
  // someone lands in right after signing up, before an admin links them.
  // Surfaced here (not just discoverable by accident) so "someone signed up
  // and I can't see them in Teams" stops being a recurring question.
  useEffect(() => { refreshUsers?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const unlinkedUsers = useMemo(
    () => (users || []).filter((u: any) => !teamMembers.some((m: any) => String(m.authUserId) === String(u.id))),
    [users, teamMembers]
  );

  const openAddDialogForUser = (u: any) => {
    setNewMemberForm({ name: u.name || "", role: "", phone: "", email: u.email || "", skills: "", initialRating: "0" });
    setLinkExistingUserId(u.id);
    setCreateLogin(false);
    setIsCreateDialogOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', width: '100%', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontSize: 'var(--text-h2)',
            fontWeight: 'var(--font-weight-extrabold)',
            color: 'var(--foreground)',
            marginBottom: '8px'
          }}>
            Team Management
          </h1>
          <p style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-base)',
            color: 'var(--muted-foreground)'
          }}>
            {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''} • {filteredMembers.length} shown
          </p>
        </div>
        
        {isLoadingTeam && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--primary)' }} />
            <span style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-base)',
              color: 'var(--muted-foreground)'
            }}>
              Loading...
            </span>
          </div>
        )}
      </div>

      {/* Needs Team Setup -- logins with no linked team entry yet */}
      {hasPermission('canEditTeam') && unlinkedUsers.length > 0 && (
        <div style={{ border: '1px solid var(--warning)', backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)', marginBottom: '10px' }}>
            Needs Team Setup ({unlinkedUsers.length})
          </p>
          <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', marginBottom: '10px' }}>
            These people have a login but aren't on the team roster yet, so they can't be assigned to anything.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {unlinkedUsers.map((u: any) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-family-body)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--text-base)' }}>{u.name}</span>
                  <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', marginLeft: '8px' }}>{u.email} · {u.role}</span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => openAddDialogForUser(u)}>
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  Add as Team Member
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Actions Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {hasPermission('canEditTeam') && (
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              style={{ 
                fontFamily: 'var(--font-family-body)', 
                fontSize: 'var(--text-base)'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={handleDownloadCSV}
            style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-base)'
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        <Button
          variant="outline"
          style={{ 
            fontFamily: 'var(--font-family-body)', 
            fontSize: 'var(--text-base)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Award className="w-4 h-4" />
          Aura System
        </Button>
      </div>

      {/* Filters and View Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '40px' }}>
        <TableFilter
          filters={filterConfig}
          onFilterChange={setFilters}
          searchPlaceholder="Search by name or role..."
          sortOptions={sortOptions}
        />
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as "grid" | "list")}
          style={{ display: 'flex' }}
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <Grid3x3 className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden'
          }}
        >
          {/* Fixed pixel column widths (below) don't fit narrower screens --
              this used to just clip with overflow:hidden on the card above,
              silently cutting off the Status/Actions columns. Scrolls
              horizontally within the card instead. */}
          <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '900px' }}>
          {/* Table Header */}
          <div
            style={{
              backgroundColor: 'var(--secondary)',
              borderBottom: '1px solid var(--border)',
              padding: '14px 20px',
              display: 'grid',
              gridTemplateColumns: '260px 160px 120px 60px 200px 1fr',
              gap: '16px',
              alignItems: 'center'
            }}
          >
            <div style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'var(--muted-foreground)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              NAME
            </div>
            <div style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'var(--muted-foreground)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              ROLE
            </div>
            <div style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'var(--muted-foreground)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              LEVEL
            </div>
            <div style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'var(--muted-foreground)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              RATING
            </div>
            <div style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'var(--muted-foreground)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              STATUS
            </div>
            <div style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: 'var(--text-label)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'var(--muted-foreground)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              textAlign: 'right'
            }}>
              ACTIONS
            </div>
          </div>

          {/* Table Rows */}
          {filteredMembers.length === 0 ? (
            <div style={{
              padding: '48px 20px',
              textAlign: 'center'
            }}>
              <p style={{
                fontFamily: 'var(--font-family-body)',
                fontSize: 'var(--text-base)',
                color: 'var(--muted-foreground)'
              }}>
                {teamMembers.length === 0 ? "No team members yet. Click 'Add Team Member' to get started." : "No members match your search."}
              </p>
            </div>
          ) : (
            filteredMembers.map((member, index) => {
              const aura = getAuraLevel(member.rating, member.tasksCompleted);
              return (
                <div
                  key={member.id}
                  style={{
                    borderBottom: index < filteredMembers.length - 1 ? '1px solid var(--border)' : 'none',
                    padding: '16px 20px',
                    display: 'grid',
                    gridTemplateColumns: '260px 160px 120px 60px 200px 1fr',
                    gap: '16px',
                    alignItems: 'center',
                    backgroundColor: member.active ? 'transparent' : 'var(--muted)',
                    opacity: member.active ? 1 : 0.6,
                    transition: 'background-color 0.2s'
                  }}
                >
                  {/* Name with Avatar */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        opacity: 0.1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        position: 'relative'
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ 
                          fontFamily: 'var(--font-family-body)', 
                          fontSize: 'var(--text-base)', 
                          fontWeight: 'var(--font-weight-bold)', 
                          color: 'var(--primary)' 
                        }}>
                          {getInitials(member.name)}
                        </span>
                      </div>
                    </div>
                    <span style={{ 
                      fontFamily: 'var(--font-family-body)', 
                      fontSize: 'var(--text-base)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--foreground)' 
                    }}>
                      {member.name}
                    </span>
                  </div>

                  {/* Role */}
                  <div style={{ 
                    fontFamily: 'var(--font-family-body)', 
                    fontSize: 'var(--text-base)', 
                    color: 'var(--muted-foreground)' 
                  }}>
                    {member.role}
                  </div>

                  {/* Level Badge */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Award style={{ width: '16px', height: '16px', color: aura.color, flexShrink: 0 }} />
                    <span style={{ 
                      fontFamily: 'var(--font-family-body)', 
                      fontSize: 'var(--text-label)', 
                      fontWeight: 'var(--font-weight-bold)', 
                      color: aura.color 
                    }}>
                      {aura.level}
                    </span>
                  </div>

                  {/* Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star style={{ width: '14px', height: '14px', color: '#F59E0B', fill: '#F59E0B' }} />
                    <span style={{ 
                      fontFamily: 'var(--font-family-body)', 
                      fontSize: 'var(--text-base)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--foreground)' 
                    }}>
                      {member.rating.toFixed(1)}
                    </span>
                  </div>

                  {/* Status */}
                  <div style={{ 
                    fontFamily: 'var(--font-family-body)', 
                    fontSize: 'var(--text-base)', 
                    color: 'var(--muted-foreground)' 
                  }}>
                    {member.activeProjects > 0 ? (
                      <span>On {member.activeProjects} project{member.activeProjects !== 1 ? 's' : ''}</span>
                    ) : (
                      <span style={{ color: 'var(--accent)' }}>Available</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMember(member)}
                      style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-label)',
                        padding: '6px 12px'
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingMember(member)}
                      style={{
                        fontFamily: 'var(--font-family-body)',
                        fontSize: 'var(--text-label)',
                        padding: '6px 12px'
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    {hasPermission('canEditTeam') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingMemberId(member.id)}
                        style={{
                          fontFamily: 'var(--font-family-body)',
                          fontSize: 'var(--text-label)',
                          padding: '6px 12px',
                          color: 'var(--destructive)',
                          borderColor: 'var(--destructive)',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMembers.length === 0 ? (
            <div className="col-span-full" style={{
              padding: '48px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)'
            }}>
              <p style={{
                fontFamily: 'var(--font-family-body)',
                fontSize: 'var(--text-base)',
                color: 'var(--muted-foreground)'
              }}>
                {teamMembers.length === 0 ? "No team members yet. Click 'Add Team Member' to get started." : "No members match your search."}
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const aura = getAuraLevel(member.rating, member.tasksCompleted);
              return (
                <Card key={member.id} className="p-6" style={{ opacity: member.active ? 1 : 0.6 }}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary)', opacity: 0.1, position: 'relative' }}>
                      <span className="absolute" style={{ fontFamily: 'var(--font-family-body)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--text-h4)', color: 'var(--primary)' }}>
                        {getInitials(member.name)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-1" style={{ fontFamily: 'var(--font-family-body)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--text-base)' }}>
                        {member.name}
                      </h4>
                      <p className="mb-2" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', color: 'var(--muted-foreground)' }}>
                        {member.role}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge style={{ fontSize: 'var(--text-label)', backgroundColor: aura.color, color: 'white' }}>
                          {aura.level}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--secondary)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4" style={{ color: aura.color }} />
                        <span style={{ fontFamily: 'var(--font-family-body)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--text-label)', color: aura.color }}>
                          {aura.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className="w-3 h-3"
                              style={{ color: '#F59E0B', fill: i < Math.floor(member.rating) ? '#F59E0B' : 'none' }}
                            />
                          ))}
                        </div>
                        <span style={{ fontFamily: 'var(--font-family-body)', fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--text-label)' }}>
                          {member.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <Progress value={(member.rating / 5) * 100} className="h-2" />
                    <p className="mt-1" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                      {member.tasksCompleted < 5
                        ? `${5 - member.tasksCompleted} more reviewed task${5 - member.tasksCompleted === 1 ? '' : 's'} needed for a confident rating`
                        : `Based on ${member.tasksCompleted} reviewed task${member.tasksCompleted === 1 ? '' : 's'}`}
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>{member.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)' }}>Joined: {member.joinDate}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="mb-2" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {member.skills.length > 0 ? (
                        member.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" style={{ fontSize: 'var(--text-label)' }}>
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>No skills listed</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Projects</p>
                      <p style={{ fontFamily: 'var(--font-family-body)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--text-base)' }}>
                        {member.projectsCompleted}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Hours Logged</p>
                      <p style={{ fontFamily: 'var(--font-family-body)', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--text-base)' }}>
                        {member.hoursLogged}h
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedMember(member)}
                      style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-body)' }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingMember(member)}
                      style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-body)', padding: '6px 12px' }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    {hasPermission('canEditTeam') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingMemberId(member.id)}
                        style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-body)', padding: '6px 12px', color: 'var(--destructive)', borderColor: 'var(--destructive)', backgroundColor: 'transparent' }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Create Team Member Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-extrabold)' }}>
              {linkExistingUserId ? "Add to Team" : "Add New Team Member"}
            </DialogTitle>
            <DialogDescription style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}>
              {linkExistingUserId ? "Finish setting up their team entry -- their login already exists." : "Enter the details of the new team member"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); handleAddTeamMember(); }} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                  Full Name *
                </Label>
                <Input
                  value={newMemberForm.name}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                  disabled={isCreating}
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
                />
              </div>
              <div>
                <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                  Team Role *
                </Label>
                <Input
                  list="team-role-presets"
                  value={newMemberForm.role}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                  placeholder="e.g., General, Plumber, Supervisor"
                  required
                  disabled={isCreating}
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
                />
                <datalist id="team-role-presets">
                  {TEAM_ROLE_PRESETS.map((r) => <option key={r} value={r} />)}
                </datalist>
                <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                  Jobsite title/trade -- separate from System Role (login permissions) below.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                  Email *
                </Label>
                <Input
                  type="email"
                  value={newMemberForm.email}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                  disabled={isCreating || !!linkExistingUserId}
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
                />
              </div>
              <div>
                <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                  Phone *
                </Label>
                <Input
                  value={newMemberForm.phone}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  required
                  disabled={isCreating}
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
                />
              </div>
            </div>
            
            <div>
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                Skills (comma separated)
              </Label>
              <Input
                value={newMemberForm.skills}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, skills: e.target.value })}
                placeholder="e.g., Crown Molding, Trim Work, Detail Finishing"
                disabled={isCreating}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
              />
            </div>

            {linkExistingUserId ? (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', backgroundColor: 'var(--muted)' }}>
                <p style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-sm)' }}>
                  Linking to the existing login <strong>{newMemberForm.email}</strong> -- no new account will be created.
                </p>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="create-login"
                    checked={createLogin}
                    onCheckedChange={(checked) => setCreateLogin(checked === true)}
                    disabled={isCreating}
                  />
                  <Label htmlFor="create-login" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}>
                    Also create a login for this person
                  </Label>
                </div>
                {createLogin && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                        System Role * <span style={{ fontWeight: 'var(--font-weight-normal)', color: 'var(--muted-foreground)' }}>(login permissions)</span>
                      </Label>
                      <Select value={accountRole} onValueChange={setAccountRole}>
                        <SelectTrigger disabled={isCreating} style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                        Password *
                      </Label>
                      <Input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        disabled={isCreating}
                        style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleCancelAddTeamMember} 
                disabled={isCreating}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating}
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Add Team Member'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member Detail Dialog */}
      {selectedMember && (
        <WorkerAuraProfile
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
          worker={{
            id: selectedMember.id,
            name: selectedMember.name,
            role: selectedMember.role,
            email: selectedMember.email,
            phone: selectedMember.phone,
            skills: selectedMember.skills?.join(', ') || ''
          }}
          projects={projects}
        />
      )}

      {/* Rating History Dialog */}
      {viewRatingsDialog !== null && (() => {
        const member = teamMembers.find(m => m.id === viewRatingsDialog);
        return member ? (
          <RatingHistoryDialog
            isOpen={true}
            onClose={() => setViewRatingsDialog(null)}
            teamMember={member}
            taskRatings={taskRatings[viewRatingsDialog] || []}
          />
        ) : null;
      })()}

      {/* Edit Team Member Dialog */}
      {editingMember && (
        <EditTeamMemberDialog
          isOpen={true}
          onClose={() => setEditingMember(null)}
          member={editingMember}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingMemberId !== null} onOpenChange={(open) => !open && setDeletingMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-extrabold)' }}>
              Delete Team Member
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}>
              Are you sure you want to permanently delete{' '}
              <strong>{teamMembers.find(m => m.id === deletingMemberId)?.name ?? 'this member'}</strong>?
              This action cannot be undone and will remove all their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => deletingMemberId && handleDeleteMember(deletingMemberId)}
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)', backgroundColor: 'var(--destructive)' }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete Member
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}