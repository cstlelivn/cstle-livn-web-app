import { useState, useEffect } from "react";
import { ArrowLeft, Save, User as UserIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { usePermissions, type UserRole, type Permission } from "./PermissionContext";
import { toast } from "sonner";

interface UserEditProps {
  userId: string;
  onBack: () => void;
}

export default function UserEdit({ userId, onBack }: UserEditProps) {
  const { users, updateUser, getPermissions, currentUser } = usePermissions();
  const user = users.find((u) => u.id === userId);
  const isSuperAdmin = currentUser?.role === "Super Admin";

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [role, setRole] = useState<UserRole>(user?.role || "Associate");
  const [active, setActive] = useState(user?.active ?? true);
  const [permissions, setPermissions] = useState(getPermissions(user?.role || "Associate"));

  // Update permissions whenever role changes
  useEffect(() => {
    const newPermissions = getPermissions(role);
    setPermissions(newPermissions);
  }, [role, getPermissions]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="font-['Roboto_Mono'] font-normal text-[14px] text-[#999999]">
          User not found
        </p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    // Prevent non-super-admins from assigning privileged roles
    if (!isSuperAdmin && (role === "Super Admin" || role === "Manager")) {
      toast.error("Only Super Admins can assign Manager or Super Admin roles");
      return;
    }
    
    const roleChanged = user.role !== role;
    
    try {
      await updateUser(userId, { name, email, role, active });
      
      if (roleChanged) {
        toast.success("User updated successfully", {
          description: "The user will be automatically logged out and must sign in again with their new role.",
          duration: 5000,
        });
      } else {
        toast.success("User updated successfully");
      }
      
      onBack();
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const permissionEntries: Array<{ key: Permission; label: string }> = [
    { key: "canViewDashboard", label: "View Dashboard" },
    { key: "canViewProjects", label: "View Projects" },
    { key: "canEditProjects", label: "Edit Projects" },
    { key: "canViewVendors", label: "View Vendors" },
    { key: "canEditVendors", label: "Edit Vendors" },
    { key: "canViewTeam", label: "View Team" },
    { key: "canEditTeam", label: "Edit Team" },
    { key: "canViewCRM", label: "View CRM" },
    { key: "canEditCRM", label: "Edit CRM" },
    { key: "canViewInventory", label: "View Inventory" },
    { key: "canEditInventory", label: "Edit Inventory" },
    { key: "canViewFinance", label: "View Finance" },
    { key: "canEditFinance", label: "Edit Finance" },
    { key: "canViewAnalytics", label: "View Analytics" },
    { key: "canViewProposals", label: "View Proposals" },
    { key: "canEditProposals", label: "Edit Proposals" },
    { key: "canViewSettings", label: "View Settings" },
    { key: "canEditSettings", label: "Edit Settings" },
  ];

  return (
    <div className="flex flex-col gap-[29px] w-full">
      {/* Header */}
      <div className="flex items-start justify-between px-[32px]">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mt-1 h-[28px] w-[28px] rounded-[6px]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
              Edit User
            </h1>
            <p className="font-['Roboto_Mono'] font-normal text-[10px] text-[#999999] leading-[1.2] mt-1">
              Update user details and role permissions
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          className="bg-[#848580] hover:bg-[#748B7B] text-white font-['Roboto_Mono'] font-medium text-[14px] px-[16px] py-[8px] rounded-[6px] h-[36px]"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px] px-[32px]">
        {/* User Details Card */}
        <Card className="lg:col-span-1 bg-card border border-border rounded-[20px] p-[24px]">
          <div className="flex flex-col gap-[20px]">
            <div className="flex flex-col items-center gap-[12px]">
              <div className="w-[80px] h-[80px] rounded-full bg-[#CECECE] flex items-center justify-center">
                <UserIcon className="w-[40px] h-[40px] text-white" />
              </div>
              <h3 className="font-['Roboto_Mono'] font-bold text-[16px] text-[#111111]">
                {name}
              </h3>
            </div>

            <div className="space-y-[16px]">
              <div>
                <Label className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999] uppercase mb-2">
                  Full Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-[#999999] font-['Roboto_Mono'] font-normal text-[14px] rounded-[6px] mt-2"
                />
              </div>

              <div>
                <Label className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999] uppercase mb-2">
                  Email Address
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-[#999999] font-['Roboto_Mono'] font-normal text-[14px] rounded-[6px] mt-2"
                />
              </div>

              <div>
                <Label className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999] uppercase mb-2">
                  Role
                </Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full border border-[#999999] rounded-[6px] px-[16px] py-[8px] font-['Roboto_Mono'] font-normal text-[14px] text-[#111111] bg-white mt-2"
                >
                  {isSuperAdmin && <option value="Super Admin">Super Admin</option>}
                  {isSuperAdmin && <option value="Manager">Manager</option>}
                  <option value="Contractor">Contractor</option>
                  <option value="Associate">Associate</option>
                </select>
                {!isSuperAdmin && (
                  <p className="mt-[8px] font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                    Only Super Admins can assign Manager or Super Admin roles
                  </p>
                )}
              </div>

              <div>
                <Label className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999] uppercase mb-2">
                  Status
                </Label>
                <div className="flex items-center gap-[12px] mt-2">
                  <button
                    onClick={() => setActive(true)}
                    className={`flex-1 px-[16px] py-[8px] rounded-[6px] border transition-colors font-['Roboto_Mono'] font-medium text-[14px] ${
                      active
                        ? "bg-[#008A2E] border-[#008A2E] text-white"
                        : "bg-white border-[#999999] text-[#111111]"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setActive(false)}
                    className={`flex-1 px-[16px] py-[8px] rounded-[6px] border transition-colors font-['Roboto_Mono'] font-medium text-[14px] ${
                      !active
                        ? "bg-[#EC554C] border-[#EC554C] text-white"
                        : "bg-white border-[#999999] text-[#111111]"
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Permissions Card */}
        <Card className="lg:col-span-2 bg-card border border-border rounded-[20px] p-[24px]">
          <div className="flex flex-col gap-[20px]">
            <div>
              <h3 className="font-['Roboto_Mono'] font-bold text-[16px] text-[#111111]">
                Role Permissions
              </h3>
              <p className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999] mt-1">
                Permissions are automatically assigned based on the user's role
              </p>
            </div>

            {/* Permission Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
              {permissionEntries.map(({ key, label }) => (
                <div
                  key={key}
                  className={`flex items-center justify-between px-[16px] py-[12px] rounded-[8px] border transition-colors ${
                    permissions[key]
                      ? "bg-[#748B7B]/10 border-[#748B7B] text-[#111111]"
                      : "bg-white border-[#999999]/30 text-[#999999]"
                  }`}
                >
                  <span className="font-['Roboto_Mono'] font-normal text-[12px]">
                    {label}
                  </span>
                  {permissions[key] ? (
                    <Badge className="bg-[#008A2E] text-white text-[10px] px-2 py-1">
                      Allowed
                    </Badge>
                  ) : (
                    <Badge className="bg-[#EC554C] text-white text-[10px] px-2 py-1">
                      Denied
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Role-specific notes */}
            <div className="mt-[12px] p-[16px] bg-white border border-[#999999] rounded-[8px]">
              <p className="font-['Roboto_Mono'] font-bold text-[12px] text-[#111111] mb-2">
                Role Notes:
              </p>
              {role === "Super Admin" && (
                <p className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999]">
                  Super Admins have full access to all features and settings. Only Super Admins can create or promote users to Super Admin or Manager roles.
                </p>
              )}
              {role === "Manager" && (
                <p className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999]">
                  Managers have full access to Projects and CRM, but cannot view Finance. They can manage team members and vendors. Only Super Admins can assign this role.
                </p>
              )}
              {role === "Contractor" && (
                <p className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999]">
                  Contractors can view Projects and Inventory, but cannot see Vendors or Team information. They have read-only access.
                </p>
              )}
              {role === "Associate" && (
                <p className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999]">
                  Associates can view Projects, Vendors, Team, and Inventory. They have read-only access to most features.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}