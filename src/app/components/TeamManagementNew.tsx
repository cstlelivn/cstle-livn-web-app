import { useState, useEffect } from "react";
import { Plus, Star, Phone, Mail, Award, Calendar, Download, Edit, Trash2, Grid3x3, List, Eye, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import TableFilter, { FilterConfig, SortOption } from "./TableFilter";
import RatingHistoryDialog from "./RatingHistoryDialog";
import EditTeamMemberDialog from "./EditTeamMemberDialog";
import WorkerAuraProfile from "./WorkerAuraProfile";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

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
  const { hasPermission, user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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

  // Aura System levels matching design system
  const getAuraLevel = (stars: number, tasksCompleted: number = 0) => {
    if (tasksCompleted === 0) {
      return { level: "New Member", color: "var(--muted-foreground)", points: 0 };
    }
    
    if (stars >= 4.8) return { level: "Legendary", color: "#A78C38", points: 500 };
    if (stars >= 4.5) return { level: "Master", color: "#92949B", points: 400 };
    if (stars >= 4.0) return { level: "Expert", color: "var(--primary)", points: 300 };
    if (stars >= 3.5) return { level: "Professional", color: "var(--accent)", points: 200 };
    if (stars >= 3.0) return { level: "Skilled", color: "var(--muted-foreground)", points: 100 };
    return { level: "Developing", color: "var(--muted-foreground)", points: 50 };
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
      toast.error("Failed to delete team member", {
        description: error.message || "Please try again or contact support.",
        duration: 5000,
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

    setIsCreating(true);

    try {
      console.log("📝 Creating new team member:", newMemberForm);
      
      await addTeamMember({
        name: newMemberForm.name.trim(),
        role: newMemberForm.role.trim(),
        phone: newMemberForm.phone.trim(),
        email: newMemberForm.email.trim(),
        specialties: newMemberForm.skills
          ? newMemberForm.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0)
          : [],
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
      
      // Reset form and close dialog
      setNewMemberForm({
        name: "",
        role: "",
        phone: "",
        email: "",
        skills: "",
        initialRating: "0",
      });
      setIsCreateDialogOpen(false);
      
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
                    <Progress value={(aura.points / 500) * 100} className="h-2" />
                    <p className="mt-1" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                      {aura.points} Aura Points
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
              Add New Team Member
            </DialogTitle>
            <DialogDescription style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}>
              Enter the details of the new team member
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
                  Role *
                </Label>
                <Input
                  value={newMemberForm.role}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                  placeholder="e.g., Finishing Specialist"
                  required
                  disabled={isCreating}
                  style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
                />
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
                  disabled={isCreating}
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