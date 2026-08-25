import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { createClient, authAPI, userAPI } from "../utils/supabase/client.tsx";
import { toast } from "sonner";

// System Role (login permissions) -- 6 values. "Quality Control" and
// "Supervisor" are deliberately not login roles: QC authority is already
// part of Manager/Admin/Super Admin's permission set below, and Supervisor
// is a Team Role (team_members.role, free text) plus the project-scoped
// projects.supervisor_id assignment -- assigning someone as a project
// Supervisor requires their System Role to already be Manager or higher.
export type UserRole = "Super Admin" | "Admin" | "Manager" | "Accountant" | "Contractor" | "Associate";

export type Permission =
  | "canViewDashboard"
  | "canViewProjects"
  | "canEditProjects"
  | "canViewVendors"
  | "canEditVendors"
  | "canViewTeam"
  | "canEditTeam"
  | "canManageTeam"
  | "canViewCRM"
  | "canEditCRM"
  | "canViewInventory"
  | "canEditInventory"
  | "canViewFinance"
  | "canEditFinance"
  | "canViewClientBilling"
  | "canViewAnalytics"
  | "canViewProposals"
  | "canEditProposals"
  | "canViewSettings"
  | "canEditSettings"
  | "canViewQCReviewQueue"
  | "canViewPhaseQCReviewQueue"
  | "canViewAllProjects"
  | "canEditPhases"
  | "canForceCompleteProjects"
  | "canManageTemplates"
  | "canApproveTaskQC"
  | "canViewTeamPerformance"
  | "canViewEstimating"
  | "canRunEstimating"
  | "canManageEstimatingConfig"
  | "canViewEstimatingMargins";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active?: boolean;
}

interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  accessToken: string | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  users: User[];
  hasPermission: (permission: Permission) => boolean;
  getPermissions: (role: UserRole) => Record<Permission, boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

// Permission matrix based on role
const rolePermissions: Record<UserRole, Permission[]> = {
  "Super Admin": [
    "canViewDashboard",
    "canViewProjects",
    "canEditProjects",
    "canViewVendors",
    "canEditVendors",
    "canViewTeam",
    "canEditTeam",
    "canManageTeam",
    "canViewCRM",
    "canEditCRM",
    "canViewInventory",
    "canEditInventory",
    "canViewFinance",
    "canEditFinance",
    "canViewClientBilling",
    "canViewAnalytics",
    "canViewProposals",
    "canEditProposals",
    "canViewSettings",
    "canEditSettings",
    "canViewQCReviewQueue",
    "canViewPhaseQCReviewQueue",
    "canViewAllProjects",
    "canEditPhases",
    "canForceCompleteProjects",
    "canManageTemplates",
    "canApproveTaskQC",
    "canViewTeamPerformance",
    "canViewEstimating",
    "canRunEstimating",
    "canManageEstimatingConfig",
    "canViewEstimatingMargins",
  ],
  // Distinct from Super Admin -- same day-to-day operational scope as
  // Manager, but kept as its own tier rather than merged with Super Admin
  // or Manager, per explicit product decision. Sees most of the app, but
  // NOT finance -- that's Accountant/Super Admin territory.
  Admin: [
    "canViewDashboard",
    "canViewProjects",
    "canEditProjects",
    "canViewVendors",
    "canEditVendors",
    "canViewTeam",
    "canEditTeam",
    "canManageTeam",
    "canViewCRM",
    "canEditCRM",
    "canViewInventory",
    "canEditInventory",
    "canViewAnalytics",
    "canViewProposals",
    "canEditProposals",
    "canViewSettings",
    "canViewQCReviewQueue",
    "canViewPhaseQCReviewQueue",
    "canViewAllProjects",
    "canEditPhases",
    "canManageTemplates",
    "canApproveTaskQC",
    "canViewTeamPerformance",
    "canViewEstimating",
    "canRunEstimating",
  ],
  Manager: [
    "canViewDashboard",
    "canViewProjects",
    "canEditProjects",
    "canViewVendors",
    "canEditVendors",
    "canViewTeam",
    "canEditTeam",
    "canManageTeam",
    "canViewCRM",
    "canEditCRM",
    "canViewInventory",
    "canEditInventory",
    // Managers see and manage the project BUDGET (cost target), but not
    // canViewClientBilling -- the actual amount charged/invoiced to the
    // client is reserved for Super Admin and Accountant.
    "canViewFinance",
    "canEditFinance",
    "canViewAnalytics",
    "canViewProposals",
    "canEditProposals",
    "canViewSettings",
    "canViewQCReviewQueue",
    "canViewPhaseQCReviewQueue",
    "canViewAllProjects",
    "canEditPhases",
    "canManageTemplates",
    "canApproveTaskQC",
    "canViewTeamPerformance",
    "canViewEstimating",
    "canRunEstimating",
  ],
  // Sees everything in the app (full financial visibility plus every other
  // module) but cannot change settings/permissions or edit most non-finance
  // areas -- broad visibility for bookkeeping/oversight, not an operator.
  Accountant: [
    "canViewDashboard",
    "canViewProjects",
    "canViewAllProjects",
    "canViewVendors",
    "canViewTeam",
    "canViewCRM",
    "canViewInventory",
    "canViewFinance",
    "canEditFinance",
    "canViewClientBilling",
    "canViewAnalytics",
    "canViewProposals",
    "canViewQCReviewQueue",
    "canViewPhaseQCReviewQueue",
    "canViewTeamPerformance",
    "canViewEstimating",
  ],
  Contractor: [
    "canViewDashboard",
    "canViewProjects",
    "canViewInventory",
  ],
  // Narrowest role: only their own profile and the tasks assigned to them --
  // no team roster, no vendors, no inventory. canViewAllProjects is
  // deliberately absent so "Projects" only ever shows projects they actually
  // have tasks in, not the whole company's project list.
  Associate: [
    "canViewDashboard",
    "canViewProjects",
  ],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const refreshInProgress = useRef(false);

  const supabase = createClient();

  // Helper function to check permissions based on role
  const hasPermission = (permission: Permission): boolean => {
    if (!user || !user.role) {
      return false;
    }
    const permissions = rolePermissions[user.role as UserRole] || [];
    const result = permissions.includes(permission);
    
    return result;
  };

  // Helper function to get all permissions for a role
  const getPermissions = (role: UserRole): Record<Permission, boolean> => {
    const permissions = rolePermissions[role] || [];
    // Convert array to object mapping each permission to true/false
    const allPermissions: Permission[] = [
      "canViewDashboard",
      "canViewProjects",
      "canEditProjects",
      "canViewVendors",
      "canEditVendors",
      "canViewTeam",
      "canEditTeam",
      "canManageTeam",
      "canViewCRM",
      "canEditCRM",
      "canViewInventory",
      "canEditInventory",
      "canViewFinance",
      "canEditFinance",
      "canViewClientBilling",
      "canViewAnalytics",
      "canViewDesignLibrary",
      "canEditDesignLibrary",
      "canViewProposals",
      "canEditProposals",
      "canViewSettings",
      "canEditSettings",
      "canViewQCReviewQueue",
      "canViewPhaseQCReviewQueue",
      "canViewAllProjects",
      "canEditPhases",
      "canForceCompleteProjects",
      "canManageTemplates",
      "canApproveTaskQC",
      "canViewTeamPerformance",
      "canViewEstimating",
      "canRunEstimating",
      "canManageEstimatingConfig",
      "canViewEstimatingMargins",
    ];
    
    const permissionMap: Record<string, boolean> = {};
    allPermissions.forEach(perm => {
      permissionMap[perm] = permissions.includes(perm);
    });
    
    return permissionMap as Record<Permission, boolean>;
  };

  useEffect(() => {
    // console.log("✓ AuthContext v2.0 loaded");
    
    // Check for existing session on mount
    const initSession = async () => {
      try {
        const session = await authAPI.getSession();

        if (session?.access_token) {
          // Validate the token using Supabase's built-in validation
          try {
            const { data: { user: validatedUser }, error } = await supabase.auth.getUser(session.access_token);
            
            if (error || !validatedUser) {
              // Session token is invalid or expired - try to refresh
              console.log('🔄 Session expired on mount - attempting refresh...');
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError || !refreshData?.session) {
                console.log('❌ Refresh failed - clearing session');
                await authAPI.signOut();
                setUser(null);
                setAccessToken(null);
              } else {
                console.log('✅ Session refreshed successfully');
                setAccessToken(refreshData.session.access_token);
                
                const refreshedRole = refreshData.session.user?.app_metadata?.role;
                if (refreshData.session.user?.user_metadata?.name && refreshedRole) {
                  setUser({
                    id: refreshData.session.user.id,
                    email: refreshData.session.user.email || "",
                    name: refreshData.session.user.user_metadata.name,
                    role: refreshedRole as UserRole,
                  });
                }
              }
            } else {
              // Session is valid
              setAccessToken(session.access_token);

              // Get user details from session (role is authoritative from
              // app_metadata — server-writable only, never client-writable)
              const sessionRole = session.user?.app_metadata?.role;
              if (session.user && session.user.user_metadata?.name && sessionRole) {
                setUser({
                  id: session.user.id,
                  email: session.user.email || "",
                  name: session.user.user_metadata.name,
                  role: sessionRole as UserRole,
                });
              }
            }
          } catch (error) {
            // Session validation failed - try refresh before giving up
            console.log('🔄 Session validation error - attempting refresh...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError || !refreshData?.session) {
              console.log('❌ Refresh failed - clearing session');
              await authAPI.signOut();
              setUser(null);
              setAccessToken(null);
            } else {
              console.log('✅ Session refreshed after validation error');
              setAccessToken(refreshData.session.access_token);

              const refreshedRole2 = refreshData.session.user?.app_metadata?.role;
              if (refreshData.session.user?.user_metadata?.name && refreshedRole2) {
                setUser({
                  id: refreshData.session.user.id,
                  email: refreshData.session.user.email || "",
                  name: refreshData.session.user.user_metadata.name,
                  role: refreshedRole2 as UserRole,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Session init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await authAPI.signIn(email, password);

      if (data.session) {
        setAccessToken(data.session.access_token);
        
        // Get user details from session (role is authoritative from
        // app_metadata — server-writable only, never client-writable)
        if (data.session.user) {
          const signInRole = data.session.user.app_metadata?.role;
          if (data.session.user.user_metadata?.name && signInRole) {
            setUser({
              id: data.session.user.id,
              email: data.session.user.email || "",
              name: data.session.user.user_metadata.name,
              role: signInRole as UserRole,
            });
          } else {
            throw new Error("User account is missing required information. Please contact support.");
          }
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    try {
      // Create user via backend
      const result = await authAPI.signUp(email, password, name, role);
      
      // Small delay to ensure user is fully created in Supabase
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Automatically sign in after signup
      await signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authAPI.signOut();
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!accessToken) return;
    
    // Prevent multiple simultaneous refresh calls
    if (refreshInProgress.current) {
      return;
    }

    refreshInProgress.current = true;

    try {
      // Fetch the latest user data from the backend API
      // This ensures we get the most up-to-date role and name from KV store
      const result = await authAPI.getCurrentUser();
      if (result?.user) {
        const oldRole = user?.role;
        const newRole = result.user.role as UserRole;
        
        setUser({
          id: result.user.id,
          email: result.user.email || "",
          name: result.user.name,
          role: newRole,
        });
        
        // Show notification if role changed
        if (oldRole && oldRole !== newRole) {
          toast.success(`Your role has been updated to ${newRole}`, {
            description: "Your permissions have been refreshed. The page will reload to apply changes.",
            duration: 3000,
          });
          
          // Reload the page after a short delay to ensure all permissions update
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
      }
    } catch (error: any) {
      // Silently handle errors - the backend endpoint may not be deployed yet
      // or there may be temporary network issues
      // Fallback to session data if backend call fails
      try {
        const session = await authAPI.getSession();
        const fallbackRole = session?.user?.app_metadata?.role;
        if (session?.user && session.user.user_metadata?.name && fallbackRole) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata.name,
            role: fallbackRole as UserRole,
          });
        }
      } catch (sessionError) {
        // Completely silent - both methods failed but user session is still valid
      }
    } finally {
      refreshInProgress.current = false;
    }
  };

  const refreshUsers = async () => {
    if (!user || (user.role !== "Super Admin" && user.role !== "Manager")) return;
    
    try {
      const result = await userAPI.getAll();
      if (result.users) {
        setUsers(result.users);
      }
    } catch (error) {
      // Silently ignore errors
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const result = await userAPI.update(userId, updates);
      if (result.user) {
        setUsers(users.map(u => u.id === userId ? result.user : u));
        if (userId === user?.id) {
          await refreshUser();
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    await userAPI.delete(userId);
    setUsers(users.filter(u => u.id !== userId));
  };

  // Fetch users when authenticated - only if user has permission
  useEffect(() => {
    if (user && user.role && accessToken) {
      // Only Super Admin and Manager can view users list
      if (user.role === "Super Admin" || user.role === "Manager") {
        refreshUsers();
      }
    }
  }, [user?.id, user?.role, accessToken]);

  // Periodically check if user should be logged out (role changed)
  useEffect(() => {
    if (!user || !accessToken) return;

    const checkForceLogout = async () => {
      try {
        const result = await authAPI.checkLogout();
        
        if (result?.shouldLogout) {
          toast.info(result.reason, {
            description: `Your role has been changed from ${result.oldRole} to ${result.newRole}. Please sign in again to continue.`,
            duration: 5000,
          });
          
          // Wait a bit for the toast to show, then log out
          setTimeout(async () => {
            await signOut();
          }, 2000);
        }
      } catch (error: any) {
        // Silently ignore all errors for this polling endpoint
      }
    };

    // Check immediately
    checkForceLogout();

    // ✅ POLLING REMOVED - Force logout now handled via Realtime WebSocket
    // Previously: Polled checkForceLogout() every 10 seconds
    // Now: Real-time session management via Supabase Auth state changes
    
  }, [user?.id, accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user, // Alias for backwards compatibility
        accessToken,
        loading,
        isLoading: loading, // Alias for backwards compatibility
        isAuthenticated: !!user && !!accessToken,
        users,
        hasPermission,
        getPermissions,
        signIn,
        signUp,
        signOut,
        updateUser,
        deleteUser,
        refreshUser,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}