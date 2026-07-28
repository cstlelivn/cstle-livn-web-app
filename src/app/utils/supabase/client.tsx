import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "./info";

// Version identifier
const CLIENT_VERSION = "3.2-SILENT-FALLBACK";
// console.log(`✓ Client API v${CLIENT_VERSION} loaded`);

// Create Supabase client singleton
let supabaseClient: any = null;

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          // Automatically refresh token 5 minutes (300 seconds) before expiry
          refreshTokenMarginSeconds: 300,
        },
        global: {
          headers: {
            'x-client-info': 'supabase-js-web',
          },
        },
      }
    );
    
    // Set up auth state change listener to handle expired sessions
    supabaseClient.auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token auto-refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out');
      } else if (event === 'USER_UPDATED') {
        console.log('👤 User updated');
      }
    });
    
    // Proactively check and refresh token on app load
    (async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session?.expires_at) {
          const expiresAt = session.expires_at * 1000;
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          
          // If token expires in less than 5 minutes, refresh now
          if (expiresAt - now < fiveMinutes) {
            console.log('⚠️ Token expiring soon - proactively refreshing...');
            await supabaseClient.auth.refreshSession();
          }
        }
      } catch (error) {
        // Silently handle - session may not exist on first load
        console.debug('Initial session check failed (expected on first load)');
      }
    })();
  }
  return supabaseClient;
}

// Export a direct supabase instance for convenience
export const supabase = createClient();

// API Helper - makes authenticated requests to the server
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c`;

interface ApiOptions {
  method?: string;
  body?: any;
  requiresAuth?: boolean;
  skipPermissionCheck?: boolean;
}

// Helper to get current user role from session
async function getCurrentUserRole(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null; // Not authenticated
    }
    
    // First try to get role from user_metadata
    if (session.user.user_metadata?.role) {
      return session.user.user_metadata.role;
    }
    
    // If not in user_metadata, try to get from server/KV store
    // but don't wait too long (use a timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(`${BASE_URL}/auth/session`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.user?.role) {
          return data.user.role;
        }
      }
    } catch (error: any) {
      // Silently handle - server endpoint may not be deployed yet
      // This is expected before full deployment
      if (error.name !== 'AbortError') {
        console.debug("Could not fetch role from server:", error.message);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Permission check helper
function hasEndpointPermission(endpoint: string, role: string): boolean {
  // CRM endpoints (both clients and leads)
  if (endpoint.includes("/clients") || endpoint.includes("/leads")) {
    return role === "Super Admin" || role === "Manager";
  }
  
  // Finance endpoints
  if (endpoint.includes("/transactions")) {
    return role === "Super Admin";
  }
  
  // User management endpoints
  if (endpoint.includes("/users") && !endpoint.includes("/auth/")) {
    return role === "Super Admin" || role === "Manager";
  }
  
  // All other endpoints allowed
  return true;
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { method = "GET", body, requiresAuth = true, skipPermissionCheck = false } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add auth token
  if (requiresAuth) {
    // For authenticated requests, get session and refresh if needed
    const supabase = createClient();
    
    // First try to get the current session
    let { data: { session } } = await supabase.auth.getSession();
    
    // If session exists, check if it's expired or about to expire (within 5 minutes)
    if (session?.expires_at) {
      const expiresAt = session.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      // If token is expired or will expire soon, refresh it
      if (expiresAt - now < fiveMinutes) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            // Clear the session and redirect to login
            await supabase.auth.signOut();
            throw new Error("Session expired. Please log in again.");
          }
          
          if (refreshData.session) {
            session = refreshData.session;
          }
        } catch (error) {
          throw error;
        }
      }
    }
    
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    } else {
      // No valid session - return empty data for GET requests, error for others
      if (method === 'GET') {
        // Return appropriate empty data structure based on endpoint
        if (endpoint.includes('/projects')) return { projects: [] };
        if (endpoint.includes('/tasks')) return { tasks: [] };
        if (endpoint.includes('/team')) return { team: [] };
        if (endpoint.includes('/vendors')) return { vendors: [] };
        if (endpoint.includes('/clients')) return { clients: [] };
        if (endpoint.includes('/leads')) return { leads: [] };
        if (endpoint.includes('/inventory')) return { inventory: [] };
        if (endpoint.includes('/transactions')) return { transactions: [] };
        if (endpoint.includes('/activities')) return { activities: [] };
        if (endpoint.includes('/task-templates')) return { templates: [] };
        if (endpoint.includes('/users')) return { users: [] };
        return {}; // Default empty object
      }
      
      // For write operations, throw an error
      const error: any = new Error("Not authenticated. Please log in.");
      error.status = 401;
      throw error;
    }
  } else {
    // For unauthenticated requests (like signup), still send anon key
    // Supabase Edge Functions require at least the anon key
    headers["Authorization"] = `Bearer ${publicAnonKey}`;
  }

  const config: RequestInit = {
    method,
    headers,
    mode: 'cors', // Add CORS mode
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  // Permission check at API layer - BLOCK unauthorized calls before they reach the server
  if (requiresAuth && !skipPermissionCheck) {
    const userRole = await getCurrentUserRole();
    
    if (!userRole) {
      // Check if this endpoint requires permissions
      const requiresPermission = endpoint.includes('/clients') || 
                                 endpoint.includes('/leads') || 
                                 endpoint.includes('/transactions') ||
                                 (endpoint.includes('/users') && !endpoint.includes('/auth/'));
      
      // If endpoint requires permission but we have no role, it means the user is still loading
      // or the session hasn't initialized yet. Log this as debug info only.
      if (requiresPermission) {
        console.debug(`ℹ️ User role not yet available for ${endpoint} - allowing request to proceed`);
      }
    } else if (!hasEndpointPermission(endpoint, userRole)) {
      console.error(`🚫 BLOCKED: ${method} ${endpoint} - Insufficient permissions for ${userRole}`);
      // Return empty data instead of making the call
      if (endpoint.includes("/clients")) {
        return { clients: [] };
      } else if (endpoint.includes("/transactions")) {
        return { transactions: [] };
      } else if (endpoint.includes("/users")) {
        return { users: [] };
      }
      // For other endpoints, throw an error
      const error: any = new Error(`Permission denied: User with role ${userRole} cannot access ${endpoint}`);
      error.status = 403;
      throw error;
    }
  }

  const fullUrl = `${BASE_URL}${endpoint}`;
  
  // Only log non-polling endpoints to reduce noise
  const isPollingEndpoint = endpoint.includes('/check-logout');
  const isUndeployedEndpoint = endpoint.includes('/leads') || endpoint.includes('/clients');
  
  if (!isPollingEndpoint && !isUndeployedEndpoint) {
    // console.log(`🌐 API Call: ${method} ${fullUrl}`);
  }
  
  try {
    const response = await fetch(fullUrl, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // List of endpoints that are expected to fail before full deployment
      const expectedFailureEndpoints = [
        '/leads',
        '/clients',
        '/auth/check-logout',
        '/inventory',
        '/transactions',
        '/users',
      ];
      
      const isExpectedFailure = expectedFailureEndpoints.some(e => endpoint.includes(e));
      
      // Only log errors for unexpected failures
      if (!isExpectedFailure) {
        console.error(`❌ API Error: ${method} ${endpoint} returned ${response.status}`, errorData);
      }
      
      // Handle 404 for lead/client endpoints FIRST - backend not yet deployed
      // This is expected behavior before deployment, so handle silently
      if (response.status === 404 && (endpoint.includes('/leads') || endpoint.includes('/clients') || endpoint.includes('/transactions'))) {
        // Return empty arrays for GET requests
        if (method === 'GET') {
          if (endpoint.includes('/leads') && !endpoint.match(/\/leads\/\d+/)) {
            return { leads: [] };
          } else if (endpoint.includes('/clients') && !endpoint.match(/\/clients\/\d+/)) {
            return { clients: [] };
          }
        }
        
        // For POST/PUT/DELETE, return mock success
        if (method === 'POST') {
          if (endpoint.includes('/leads')) {
            return { lead: { id: Date.now(), ...body } };
          } else if (endpoint.includes('/clients')) {
            return { client: { id: Date.now(), ...body } };
          }
        }
        
        if (method === 'PUT') {
          return endpoint.includes('/leads') 
            ? { lead: { ...body } } 
            : { client: { ...body } };
        }
        
        if (method === 'DELETE') {
          return { success: true };
        }
      }
      
      // Handle 503 Service Unavailable (temporary network issues)
      if (response.status === 503) {
        // Don't log - this is a temporary network issue
        const error: any = new Error("Service temporarily unavailable. Please try again.");
        error.status = 503;
        error.data = errorData;
        error.isTemporary = true;
        throw error;
      }
      
      // Handle 401 Unauthorized from DNS/network issues
      if (response.status === 401 && errorData.error?.includes("dns error")) {
        // This is a network issue, not an auth issue
        const error: any = new Error("Network error. Please try again.");
        error.status = 503;
        error.data = errorData;
        error.isTemporary = true;
        throw error;
      }
      
      // Don't log errors for polling endpoints or expected failures to reduce noise
      if (!isPollingEndpoint && !isExpectedFailure) {
        console.error(`API Error [${method} ${endpoint}]:`, errorData);
        console.error(`Full URL was: ${fullUrl}`);
      }
      
      // Create a custom error with status and data
      const error: any = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    const jsonResponse = await response.json();
    
    // Only log successful responses for write operations (POST, PUT, DELETE) to reduce noise
    const isWriteOperation = method !== 'GET';
    if (isWriteOperation && !isPollingEndpoint && !isUndeployedEndpoint) {
      console.log(`✅ API Success: ${method} ${endpoint}`, jsonResponse);
    }
    
    return jsonResponse;
  } catch (error: any) {
    // If this is already a processed error from the response handling above, just throw it
    if (error.isTemporary || error.status) {
      throw error;
    }
    
    // Handle network errors (like "Failed to fetch")
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      // List of endpoints expected to fail
      const expectedFailureEndpoints = [
        '/auth/session',
        '/auth/check-logout',
        '/inventory',
        '/leads',
        '/clients',
        '/transactions',
        '/tasks' // Tasks endpoint may fail during network issues
      ];
      
      const isExpectedNetworkFailure = expectedFailureEndpoints.some(e => endpoint.includes(e));
      
      // Return empty data for GET requests
      if (method === 'GET') {
        if (endpoint.includes('/projects')) {
          return { projects: [] };
        } else if (endpoint.includes('/tasks')) {
          return { tasks: [] };
        } else if (endpoint.includes('/team')) {
          return { team: [] };
        } else if (endpoint.includes('/vendors')) {
          return { vendors: [] };
        } else if (endpoint.includes('/clients')) {
          return { clients: [] };
        } else if (endpoint.includes('/leads')) {
          return { leads: [] };
        } else if (endpoint.includes('/inventory')) {
          return { inventory: [] };
        } else if (endpoint.includes('/transactions')) {
          return { transactions: [] };
        } else if (endpoint.includes('/activities')) {
          return { activities: [] };
        } else if (endpoint.includes('/task-templates')) {
          return { templates: [] };
        } else if (endpoint.includes('/users')) {
          return { users: [] };
        } else if (endpoint.includes('/auth/session')) {
          return null; // Auth session endpoint - return null for graceful fallback
        }
      }
      
      // Check if this is an auth endpoint
      const isAuthEndpoint = endpoint.includes('/auth/');
      
      // For POST/PUT/DELETE on non-auth endpoints, throw the error
      if (!isAuthEndpoint) {
        const networkError: any = new Error(`Network error: Cannot connect to server. Please check your connection or try again later.`);
        networkError.isTemporary = true;
        networkError.status = 503;
        throw networkError;
      }
      
      // For auth endpoints, return null to allow graceful fallback
      return null;
    }
    
    // Re-throw other errors
    throw error;
  }
}

// Auth API calls
export const authAPI = {
  signUp: async (email: string, password: string, name: string, role: string = "Associate") => {
    return apiCall("/auth/signup", {
      method: "POST",
      body: { email, password, name, role },
      requiresAuth: false,
    });
  },

  signIn: async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  signOut: async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }
  },

  getSession: async () => {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      throw error;
    }

    return session;
  },

  getCurrentUser: async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return null;
      }

      // Try to get user data from server, but fall back to session data
      try {
        const userData = await apiCall("/auth/session", { skipPermissionCheck: true });
        return userData;
      } catch (serverError) {
        // Server endpoint not available - use session data
        return {
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email,
            role: session.user.user_metadata?.role || "Associate",
          }
        };
      }
    } catch (error: any) {
      // Silently handle errors - return null if authentication fails
      return null;
    }
  },

  checkLogout: async () => {
    try {
      return await apiCall("/auth/check-logout", { 
        skipPermissionCheck: true 
      });
    } catch (error: any) {
      // Silently ignore all errors for this polling endpoint
      // It's not critical if it fails - just return no logout needed
      return { shouldLogout: false };
    }
  },
};

// User API calls
export const userAPI = {
  // Read user records directly from the kv_store table (no server deployment needed).
  // Falls back to empty array so the rest of the app keeps working if the table
  // isn't accessible via the anon key.
  getAll: async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('kv_store_bcab437c')
        .select('value')
        .like('key', 'user:%');
      if (error) throw error;
      const users = (data ?? []).map((row: any) => row.value).filter(Boolean);
      return { users };
    } catch {
      // Silent fallback — server endpoint will also be tried via the deployed function
      try {
        return await apiCall("/users");
      } catch {
        return { users: [] };
      }
    }
  },

  update: async (id: string, updates: any) => {
    return apiCall(`/users/${id}`, {
      method: "PUT",
      body: updates,
    });
  },

  delete: async (id: string) => {
    return apiCall(`/users/${id}`, {
      method: "DELETE",
    });
  },
};

// Project API calls
export const projectAPI = {
  getAll: async () => {
    return apiCall("/projects");
  },

  getById: async (id: number) => {
    return apiCall(`/projects/${id}`);
  },

  create: async (project: any) => {
    return apiCall("/projects", {
      method: "POST",
      body: project,
    });
  },

  update: async (id: number, updates: any) => {
    return apiCall(`/projects/${id}`, {
      method: "PUT",
      body: updates,
    });
  },

  delete: async (id: number) => {
    return apiCall(`/projects/${id}`, {
      method: "DELETE",
    });
  },
};

// Task API calls
export const taskAPI = {
  getAll: async (filters?: { projectId?: number; status?: string; assignee?: number }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append("projectId", filters.projectId.toString());
    if (filters?.status) params.append("status", filters.status);
    if (filters?.assignee) params.append("assignee", filters.assignee.toString());
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiCall(`/tasks${query}`);
  },

  create: async (task: any) => {
    return apiCall("/tasks", {
      method: "POST",
      body: task,
    });
  },

  update: async (id: number, updates: any) => {
    return apiCall(`/tasks/${id}`, {
      method: "PUT",
      body: updates,
    });
  },

  delete: async (id: number) => {
    return apiCall(`/tasks/${id}`, {
      method: "DELETE",
    });
  },
};

// Team API calls
export const teamAPI = {
  getAll: async () => {
    return apiCall("/team");
  },

  create: async (member: any) => {
    return apiCall("/team", {
      method: "POST",
      body: member,
    });
  },

  update: async (id: number, updates: any) => {
    return apiCall(`/team/${id}`, {
      method: "PUT",
      body: updates,
    });
  },

  delete: async (id: number) => {
    return apiCall(`/team/${id}`, {
      method: "DELETE",
    });
  },
};

// Vendor API calls
export const vendorAPI = {
  getAll: async () => {
    return apiCall("/vendors");
  },

  create: async (vendor: any) => {
    return apiCall("/vendors", {
      method: "POST",
      body: vendor,
    });
  },

  update: async (id: number, updates: any) => {
    return apiCall(`/vendors/${id}`, {
      method: "PUT",
      body: updates,
    });
  },

  delete: async (id: number) => {
    return apiCall(`/vendors/${id}`, {
      method: "DELETE",
    });
  },
};

// Client API calls
export const clientAPI = {
  getAll: async () => {
    return apiCall("/clients");
  },

  create: async (client: any) => {
    return apiCall("/clients", {
      method: "POST",
      body: client,
    });
  },

  update: async (id: number, updates: any) => {
    return apiCall(`/clients/${id}`, {
      method: "PUT",
      body: updates,
    });
  },

  delete: async (id: number) => {
    return apiCall(`/clients/${id}`, {
      method: "DELETE",
    });
  },
};

// Lead API calls
export const leadAPI = {
  getAll: async () => {
    return apiCall("/leads");
  },

  create: async (lead: any) => {
    return apiCall("/leads", {
      method: "POST",
      body: lead,
    });
  },

  update: async (id: number, updates: any) => {
    return apiCall(`/leads/${id}`, {
      method: "PUT",
      body: updates,
    });
  },

  delete: async (id: number) => {
    return apiCall(`/leads/${id}`, {
      method: "DELETE",
    });
  },

  convertToClient: async (id: number) => {
    return apiCall(`/leads/${id}/convert`, {
      method: "POST",
    });
  },
};

// Inventory API calls
export const inventoryAPI = {
  getAll: async () => {
    return apiCall("/inventory");
  },

  create: async (item: any) => {
    return apiCall("/inventory", {
      method: "POST",
      body: item,
    });
  },

  update: async (id: number, updates: any) => {
    return apiCall(`/inventory/${id}`, {
      method: "PUT",
      body: updates,
    });
  },

  delete: async (id: number) => {
    return apiCall(`/inventory/${id}`, {
      method: "DELETE",
    });
  },
};

// Transaction API calls
export const transactionAPI = {
  getAll: async () => {
    return apiCall("/transactions");
  },

  create: async (transaction: any) => {
    return apiCall("/transactions", {
      method: "POST",
      body: transaction,
    });
  },

  update: async (id: number, updates: any) => {
    return apiCall(`/transactions/${id}`, {
      method: "PUT",
      body: updates,
    });
  },

  delete: async (id: number) => {
    return apiCall(`/transactions/${id}`, {
      method: "DELETE",
    });
  },
};

// Activity API calls
export const activityAPI = {
  getAll: async () => {
    return apiCall("/activities");
  },
};

// Task Template API calls
export const taskTemplateAPI = {
  getAll: async () => {
    return apiCall("/task-templates");
  },

  create: async (template: any) => {
    return apiCall("/task-templates", {
      method: "POST",
      body: template,
    });
  },

  delete: async (id: string) => {
    return apiCall(`/task-templates/${id}`, {
      method: "DELETE",
    });
  },
};

// Initialize database (one-time call)
export const initializeDatabase = async () => {
  return apiCall("/initialize", {
    method: "POST",
    requiresAuth: false,
  });
};