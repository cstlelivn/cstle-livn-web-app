import { useState } from "react";
import { Edit2, UserPlus, User as UserIcon, X, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { usePermissions, type UserRole } from "./PermissionContext";
import TableFilter, { FilterConfig, SortOption } from "./TableFilter";
import { createPersonAsAdmin } from "../src/features/team/api";

interface UserManagementProps {
  onEditUser: (userId: string) => void;
}

const ROLES: UserRole[] = ["Super Admin", "Admin", "Manager", "Accountant", "Contractor", "Associate"];

export default function UserManagement({ onEditUser }: UserManagementProps) {
  const { users, currentUser, refreshUsers, deleteUser } = usePermissions() as any;
  const [filters, setFilters] = useState<Record<string, any>>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    selects: {},
    sortBy: "",
    sortOrder: "asc",
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "Associate" as UserRole });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const filteredUsers = users
    .filter((user: any) => {
      const matchesSearch = !filters.search ||
        user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase());
      const matchesRole = !filters.selects?.role ||
        filters.selects.role === "all" ||
        user.role === filters.selects.role;
      return matchesSearch && matchesRole;
    })
    .sort((a: any, b: any) => {
      if (!filters.sortBy) return 0;
      const order = filters.sortOrder === "asc" ? 1 : -1;
      switch (filters.sortBy) {
        case "name": return order * a.name.localeCompare(b.name);
        case "email": return order * a.email.localeCompare(b.email);
        case "role": return order * a.role.localeCompare(b.role);
        default: return 0;
      }
    });

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "Super Admin": return "bg-[#748B7B] text-white";
      case "Admin": return "bg-[#5C7A8A] text-white";
      case "Manager": return "bg-[#848580] text-white";
      case "Accountant": return "bg-[#5B7A99] text-white";
      case "Contractor": return "bg-[#999999] text-white";
      case "Associate": return "bg-[#CECECE] text-[#111111]";
      default: return "bg-[#F7F7F7] text-[#111111]";
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await deleteUser(deletingUserId);
      setDeletingUserId(null);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete user.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filterConfig: FilterConfig[] = [
    { type: "text", field: "search", label: "Search", placeholder: "Search users..." },
    {
      type: "select", field: "role", label: "Role",
      options: [
        { value: "Super Admin", label: "Super Admin" },
        { value: "Admin", label: "Admin" },
        { value: "Manager", label: "Manager" },
        { value: "Accountant", label: "Accountant" },
        { value: "Contractor", label: "Contractor" },
        { value: "Associate", label: "Associate" },
      ],
    },
  ];

  const sortOptions: SortOption[] = [
    { field: "name", label: "Name" },
    { field: "email", label: "Email" },
    { field: "role", label: "Role" },
  ];

  const handleAddUser = async () => {
    setAddError("");
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      setAddError("All fields are required.");
      return;
    }
    if (addForm.password.length < 6) {
      setAddError("Password must be at least 6 characters.");
      return;
    }
    setAddLoading(true);
    try {
      // Deliberately NOT the self-signup path (signUp() in AuthContext):
      // that hits the public, unauthenticated /auth/signup endpoint, which
      // must clamp every request to Associate/Contractor no matter what
      // role is picked here (silently -- an admin choosing "Manager" would
      // have gotten an Associate account back with no error), and it also
      // signs the caller into the newly created account, kicking the admin
      // out of their own session. /admin/create-person requires a real
      // Super Admin/Manager session and does neither.
      await createPersonAsAdmin({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        role: addForm.role,
      });
      if (typeof refreshUsers === "function") await refreshUsers();
      setShowAddDialog(false);
      setAddForm({ name: "", email: "", password: "", role: "Associate" });
    } catch (err: any) {
      setAddError(err?.message || "Failed to create user.");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-[29px] w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-[32px] p-[0px]">
        <div>
          <h1 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
            User Management
          </h1>
          <p className="font-['Roboto_Mono'] font-normal text-[10px] text-[#999999] leading-[1.2] mt-1">
            Manage users and their roles
          </p>
        </div>
        <Button
          onClick={() => { setAddError(""); setShowAddDialog(true); }}
          className="bg-[#848580] hover:bg-[#748B7B] text-white font-['Roboto_Mono'] font-medium text-[14px] px-[16px] py-[8px] rounded-[6px] h-[36px]"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-[12px] px-[32px] p-[0px]">
        <TableFilter
          filters={filterConfig}
          onFilterChange={setFilters}
          searchPlaceholder="Search users..."
          sortOptions={sortOptions}
        />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] px-[32px] p-[0px]">
        {filteredUsers.map((user: any) => (
          <Card
            key={user.id}
            className="bg-card border border-border rounded-[20px] p-[24px] hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col gap-[16px]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-[12px]">
                  <div className="w-[40px] h-[40px] rounded-full bg-[#CECECE] flex items-center justify-center">
                    <UserIcon className="w-[24px] h-[24px] text-white" />
                  </div>
                  <div>
                    <h3 className="font-['Roboto_Mono'] font-bold text-[15px] text-[#111111] leading-[1.5]">
                      {user.name}
                    </h3>
                    <p className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999] leading-[1.2] mt-1">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.id === currentUser?.id && (
                  <Badge className="bg-[#748B7B] text-white font-['Roboto_Mono'] text-[10px] px-2 py-1">
                    You
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-[8px]">
                <Badge className={`${getRoleBadgeColor(user.role)} font-['Roboto_Mono'] text-[11px] px-[12px] py-[4px] rounded-full`}>
                  {user.role}
                </Badge>
                {user.active && (
                  <Badge className="bg-[#008A2E]/10 text-[#008A2E] font-['Roboto_Mono'] text-[11px] px-[12px] py-[4px] rounded-full">
                    Active
                  </Badge>
                )}
              </div>

              <div className="pt-[12px] border-t border-[#999999]/20">
                <p className="font-['Roboto_Mono'] font-normal text-[10px] text-[#999999] uppercase leading-[1.2] mb-[8px]">
                  Permissions
                </p>
                <div className="flex flex-wrap gap-[6px]">
                  {user.role === "Super Admin" && (
                    <>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Full Access</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">QC Approval</span>
                    </>
                  )}
                  {user.role === "Admin" && (
                    <>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Projects</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">CRM</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Team</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">QC Approval</span>
                    </>
                  )}
                  {user.role === "Manager" && (
                    <>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Projects</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">CRM</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Team</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">QC Approval</span>
                    </>
                  )}
                  {user.role === "Accountant" && (
                    <>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Full Finance</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Client Billing</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Projects (View)</span>
                    </>
                  )}
                  {user.role === "Contractor" && (
                    <>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Projects (View)</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Inventory</span>
                    </>
                  )}
                  {user.role === "Associate" && (
                    <>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Projects</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Vendors</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Team</span>
                      <span className="font-['Roboto_Mono'] text-[10px] text-[#111111] bg-white border border-[#999999] px-[8px] py-[4px] rounded-[4px]">Inventory</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-[8px]">
                <Button
                  onClick={() => onEditUser(user.id)}
                  variant="outline"
                  className="flex-1 border-[#999999] hover:bg-[#F7F7F7] font-['Roboto_Mono'] font-medium text-[14px] rounded-[6px] h-[36px]"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {user.id !== currentUser?.id && (
                  <Button
                    onClick={() => { setDeleteError(""); setDeletingUserId(user.id); }}
                    variant="outline"
                    className="border-red-300 text-red-500 hover:bg-red-50 font-['Roboto_Mono'] font-medium text-[14px] rounded-[6px] h-[36px] px-[12px]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="font-['Roboto_Mono'] font-normal text-[14px] text-[#999999]">
            No users found matching your filters
          </p>
        </div>
      )}

      {/* Delete User Confirmation */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[20px] p-[32px] w-[400px] max-w-[95vw] shadow-xl flex flex-col gap-[20px]">
            <div className="flex items-center gap-[12px]">
              <div className="w-[40px] h-[40px] rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="font-['Anybody'] font-bold text-[18px] text-[#111111]" style={{ fontVariationSettings: "'wdth' 137" }}>
                Delete User
              </h2>
            </div>
            <p className="font-['Roboto_Mono'] text-[13px] text-[#555555]">
              Are you sure you want to delete <strong>{users.find((u: any) => u.id === deletingUserId)?.name}</strong>? This will permanently remove their account and cannot be undone.
            </p>
            {deleteError && (
              <p className="font-['Roboto_Mono'] text-[12px] text-red-500">{deleteError}</p>
            )}
            <div className="flex gap-[12px] justify-end">
              <Button
                variant="outline"
                onClick={() => setDeletingUserId(null)}
                disabled={deleteLoading}
                className="border-[#CECECE] font-['Roboto_Mono'] text-[14px] rounded-[8px] h-[40px] px-[20px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="bg-red-500 hover:bg-red-600 text-white font-['Roboto_Mono'] text-[14px] rounded-[8px] h-[40px] px-[20px]"
              >
                {deleteLoading ? "Deleting..." : "Delete User"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[20px] p-[32px] w-[440px] max-w-[95vw] shadow-xl flex flex-col gap-[20px]">
            <div className="flex items-center justify-between">
              <h2 className="font-['Anybody'] font-bold text-[18px] text-[#111111]" style={{ fontVariationSettings: "'wdth' 137" }}>
                Add User
              </h2>
              <button onClick={() => setShowAddDialog(false)} className="text-[#999999] hover:text-[#111111] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-[14px]">
              <div>
                <label className="font-['Roboto_Mono'] text-[11px] text-[#999999] uppercase mb-[6px] block">Full Name</label>
                <Input
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="font-['Roboto_Mono'] text-[14px] rounded-[8px] border-[#CECECE]"
                />
              </div>
              <div>
                <label className="font-['Roboto_Mono'] text-[11px] text-[#999999] uppercase mb-[6px] block">Email</label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                  className="font-['Roboto_Mono'] text-[14px] rounded-[8px] border-[#CECECE]"
                />
              </div>
              <div>
                <label className="font-['Roboto_Mono'] text-[11px] text-[#999999] uppercase mb-[6px] block">Password</label>
                <Input
                  type="password"
                  value={addForm.password}
                  onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  className="font-['Roboto_Mono'] text-[14px] rounded-[8px] border-[#CECECE]"
                />
              </div>
              <div>
                <label className="font-['Roboto_Mono'] text-[11px] text-[#999999] uppercase mb-[6px] block">Role</label>
                <select
                  value={addForm.role}
                  onChange={e => setAddForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full font-['Roboto_Mono'] text-[14px] rounded-[8px] border border-[#CECECE] px-[12px] py-[8px] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#848580]"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {addError && (
              <p className="font-['Roboto_Mono'] text-[12px] text-red-500">{addError}</p>
            )}

            <div className="flex gap-[12px] justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="border-[#CECECE] font-['Roboto_Mono'] text-[14px] rounded-[8px] h-[40px] px-[20px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={addLoading}
                className="bg-[#848580] hover:bg-[#748B7B] text-white font-['Roboto_Mono'] text-[14px] rounded-[8px] h-[40px] px-[20px]"
              >
                {addLoading ? "Creating..." : "Create User"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
