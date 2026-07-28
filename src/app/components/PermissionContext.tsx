// This file is kept for backward compatibility
// All permission logic now lives in AuthContext
// This exports the same interface to avoid breaking existing components

export { useAuth as usePermissions, AuthProvider as PermissionProvider } from "./AuthContext";
export type { User, UserRole, Permission } from "./AuthContext";
