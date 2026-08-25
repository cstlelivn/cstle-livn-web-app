import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const TEAM_ROLE_PRESETS = ["General", "Supervisor", "Plumber", "Carpenter", "Electrician", "Painter", "Drywall Installer", "Flooring Installer"];
const MANAGER_PLUS_ROLES = ["Super Admin", "Admin", "Manager"];

interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  specialties: string[];
  active: boolean;
  auraRating?: number;
  tasksCompleted?: number;
  authUserId?: string | null;
}

interface EditTeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember;
}

export default function EditTeamMemberDialog({ isOpen, onClose, member }: EditTeamMemberDialogProps) {
  const { updateTeamMember, teamMembers } = useApp();
  const { users, hasPermission, refreshUsers } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const canLinkAccount = hasPermission("canManageTeam");

  // A login already linked to a DIFFERENT team member shouldn't be
  // offered here -- picking it would silently steal it from whoever it's
  // currently linked to (the dropdown previously listed every login with
  // no such filtering at all).
  const linkedElsewhere = new Set(
    teamMembers
      .filter((m: any) => m.id !== member.id && m.authUserId)
      .map((m: any) => String(m.authUserId))
  );
  const linkableUsers = users.filter((u: any) => !linkedElsewhere.has(String(u.id)));

  const [formData, setFormData] = useState({
    name: member.name,
    email: member.email,
    phone: member.phone,
    role: member.role,
    specialties: member.specialties.join(", "),
    active: member.active,
    authUserId: member.authUserId || "none",
  });

  useEffect(() => {
    if (canLinkAccount) refreshUsers();
  }, [canLinkAccount]);

  // Update form data when member changes
  useEffect(() => {
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      specialties: member.specialties.join(", "),
      active: member.active,
      authUserId: member.authUserId || "none",
    });
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.role.trim().toLowerCase() === "supervisor") {
      const linkedUser = formData.authUserId !== "none" ? users.find((u: any) => String(u.id) === String(formData.authUserId)) : null;
      if (!linkedUser || !MANAGER_PLUS_ROLES.includes(linkedUser.role)) {
        toast.error("Supervisor requires a Manager+ login", {
          description: "The Team Role 'Supervisor' requires this person to have a linked login with System Role Manager, Admin, or Super Admin.",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      await updateTeamMember(member.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        specialties: formData.specialties.split(",").map(s => s.trim()).filter(Boolean),
        active: formData.active,
        auth_user_id: formData.authUserId === "none" ? null : formData.authUserId,
      } as any);

      toast.success("Team member updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update team member");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-extrabold)' }}>
            Edit Team Member
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-normal)' }}>
            Update team member information
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                Full Name
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
                required
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
              />
            </div>
            <div>
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                Team Role
              </Label>
              <Input
                list="team-role-presets-edit"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g., General, Plumber, Supervisor"
                required
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
              />
              <datalist id="team-role-presets-edit">
                {TEAM_ROLE_PRESETS.map((r) => <option key={r} value={r} />)}
              </datalist>
              <p className="text-[10px] text-muted-foreground mt-[4px]">
                Jobsite title/trade -- separate from the linked login's System Role below.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                Email
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                required
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
              />
            </div>
            <div>
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                Phone
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                required
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
              />
            </div>
          </div>
          
          <div>
            <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
              Skills (comma separated)
            </Label>
            <Input
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              placeholder="e.g., Crown Molding, Trim Work, Detail Finishing"
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
            />
          </div>

          <div>
            <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
              Status
            </Label>
            <Select
              value={formData.active ? "active" : "inactive"}
              onValueChange={(value) => setFormData({ ...formData, active: value === "active" })}
            >
              <SelectTrigger style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}>
                  Active
                </SelectItem>
                <SelectItem value="inactive" style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}>
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canLinkAccount && (
            <div>
              <Label style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-bold)' }}>
                Linked Login Account
              </Label>
              <Select
                value={formData.authUserId}
                onValueChange={(value) => setFormData({ ...formData, authUserId: value })}
              >
                <SelectTrigger style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}>
                  <SelectValue placeholder="No linked account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked account</SelectItem>
                  {linkableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-[4px]">
                Only needed for team members who log into this app — this is what lets them update tasks assigned to them.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose} 
              disabled={isLoading}
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
