import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useApp } from "./AppContext";
import { toast } from "sonner";

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
}

interface EditTeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember;
}

export default function EditTeamMemberDialog({ isOpen, onClose, member }: EditTeamMemberDialogProps) {
  const { updateTeamMember } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: member.name,
    email: member.email,
    phone: member.phone,
    role: member.role,
    specialties: member.specialties.join(", "),
    active: member.active,
  });

  // Update form data when member changes
  useEffect(() => {
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      specialties: member.specialties.join(", "),
      active: member.active,
    });
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateTeamMember(member.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        specialties: formData.specialties.split(",").map(s => s.trim()).filter(Boolean),
        active: formData.active,
      });

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
                Role
              </Label>
              <Input
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g., Finishing Specialist"
                required
                style={{ fontFamily: 'var(--font-family-body)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-normal)' }}
              />
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
