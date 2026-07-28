import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// Middleware to verify auth and get user
async function authMiddleware(c: any, next: any) {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  if (!accessToken) {
    return c.json({ error: "Unauthorized - No token provided" }, 401);
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      // Silently handle auth failures - these are common during session expiry
      // Only log if it's not a "missing sub claim" or "Auth session missing" error
      const isMissingSubClaim = error?.message?.includes('missing sub claim');
      const isAuthSessionMissing = error?.message?.includes('Auth session missing');
      
      if (!isMissingSubClaim && !isAuthSessionMissing) {
        console.error("❌ Auth failed:", error?.message || "No user returned");
      }
      
      return c.json({ error: "Authentication failed. Please log in again." }, 401);
    }

    // Get user role from KV store
    let userData = await kv.get(`user:${user.id}`);
    
    if (!userData) {
      console.warn(`⚠️ User ${user.id} (${user.email}) not found in KV store - auto-creating entry`);
      
      // Auto-create user entry from auth metadata
      // This handles cases where the KV store got out of sync with auth
      userData = {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || "User",
        email: user.email,
        // Role is authoritative from app_metadata (server-writable only); fall
        // back to the legacy user_metadata location for accounts created
        // before this fix.
        role: user.app_metadata?.role || user.user_metadata?.role || "Associate",
        active: true,
        createdAt: user.created_at || new Date().toISOString(),
      };
      
      // Save to KV store for future requests
      await kv.set(`user:${user.id}`, userData);
      console.log(`✓ Auto-created KV entry for user ${user.email} with role ${userData.role}`);
    }

    console.log(`✓ Auth: User ${userData.email} authenticated with role: ${userData.role}`);
    
    c.set("userId", user.id);
    c.set("userRole", userData.role);
    c.set("userData", userData);
    await next();
  } catch (error: any) {
    // Silently handle common auth errors during session expiry
    const isMissingSubClaim = error?.message?.includes('missing sub claim');
    const isAuthSessionMissing = error?.message?.includes('Auth session missing');
    
    if (!isMissingSubClaim && !isAuthSessionMissing) {
      console.error("❌ Auth middleware error:", error?.message);
    }
    
    return c.json({ error: "Authentication failed. Please try again." }, 401);
  }
}

// Permission check helper - Must match frontend AuthContext permissions exactly
function hasPermission(role: string, permission: string): boolean {
  const permissions: Record<string, Record<string, boolean>> = {
    "Super Admin": {
      canViewDashboard: true,
      canViewProjects: true,
      canEditProjects: true,
      canViewVendors: true,
      canEditVendors: true,
      canViewTeam: true,
      canEditTeam: true,
      canViewCRM: true,
      canEditCRM: true,
      canViewInventory: true,
      canEditInventory: true,
      canViewFinance: true,
      canEditFinance: true,
      canViewAnalytics: true,
      canViewProposals: true,
      canEditProposals: true,
      canViewSettings: true,
      canEditSettings: true,
    },
    "Manager": {
      canViewDashboard: true,
      canViewProjects: true,
      canEditProjects: true,
      canViewVendors: true,
      canEditVendors: true,
      canViewTeam: true,
      canEditTeam: true,
      canViewCRM: true,
      canEditCRM: true,
      canViewInventory: true,
      canEditInventory: true,
      canViewFinance: false,
      canEditFinance: false,
      canViewAnalytics: true,
      canViewProposals: true,
      canEditProposals: true,
      canViewSettings: true,
    },
    "Contractor": {
      canViewDashboard: true,
      canViewProjects: true,
      canEditProjects: false,
      canViewVendors: false,
      canEditVendors: false,
      canViewTeam: false,
      canEditTeam: false,
      canViewCRM: false,
      canEditCRM: false,
      canViewInventory: true,
      canEditInventory: false,
      canViewFinance: false,
      canEditFinance: false,
      canViewAnalytics: false,
      canViewProposals: false,
      canEditProposals: false,
      canViewSettings: false,
      canEditSettings: false,
    },
    "Associate": {
      canViewDashboard: true,
      canViewProjects: true,
      canEditProjects: false,
      canViewVendors: true,
      canEditVendors: false,
      canViewTeam: true,
      canEditTeam: false,
      canViewCRM: false,
      canEditCRM: false,
      canViewInventory: true,
      canEditInventory: false,
      canViewFinance: false,
      canEditFinance: false,
      canViewAnalytics: false,
      canViewProposals: false,
      canEditProposals: false,
      canViewSettings: false,
      canEditSettings: false,
    },
  };

  return permissions[role]?.[permission] || false;
}

// Health check endpoint
app.get("/make-server-bcab437c/health", (c) => {
  return c.json({ status: "ok" });
});

// Test endpoint to verify routing works
app.get("/make-server-bcab437c/test", (c) => {
  return c.json({ status: "test-ok", timestamp: new Date().toISOString() });
});

// Auth check test endpoint (no auth required - for debugging)
app.get("/make-server-bcab437c/auth/test", (c) => {
  return c.json({ status: "auth-path-ok" });
});

// Debug endpoint - Check user by email
app.get("/make-server-bcab437c/debug/user/:email", async (c) => {
  try {
    const email = c.req.param("email");
    
    // Get user from Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    const authUser = users?.find(u => u.email === email);
    
    // Get user from KV store
    const kvUsers = await kv.getByPrefix("user:");
    const kvUser = kvUsers.find((u: any) => u.email === email);
    
    return c.json({
      email,
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
        user_metadata: authUser.user_metadata,
        created_at: authUser.created_at,
      } : null,
      kvUser,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ============= AUTH ROUTES =============

// Sign up - Create new user
app.post("/make-server-bcab437c/auth/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    console.log("Signup request for:", email, "with role:", role);

    // FIRST: Check if user already exists in Auth to avoid error logs
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error checking existing users:", listError);
      return c.json({ error: "Unable to verify account status. Please try again." }, 500);
    }
    
    const existingAuthUser = users.find((u: any) => u.email === email);
    
    if (existingAuthUser) {
      console.log("User already exists in Auth:", existingAuthUser.id);
      
      // Check if they're in our KV store
      const allUsers = await kv.getByPrefix("user:");
      const existingKVUser = allUsers.find((u: any) => u.email === email);
      
      if (existingKVUser) {
        console.log("User found in both Auth and KV store");
        return c.json({ 
          error: `This email is already registered. Please use Sign In instead.`,
          userExists: true 
        }, 409);
      } else {
        // User exists in Auth but not in KV - recover the account
        console.log("User exists in Auth but not in KV store - recovering account...");
        
        const userData = {
          id: existingAuthUser.id,
          name: name || existingAuthUser.user_metadata?.name || email.split('@')[0],
          email: existingAuthUser.email,
          role: role || existingAuthUser.app_metadata?.role || existingAuthUser.user_metadata?.role || "Associate",
          active: true,
          createdAt: existingAuthUser.created_at || new Date().toISOString(),
        };
        
        await kv.set(`user:${existingAuthUser.id}`, userData);
        console.log("✓ Account recovered successfully!");
        
        return c.json({ 
          error: `Account recovered! Please use Sign In to access your account.`,
          userExists: true,
          recovered: true
        }, 409);
      }
    }

    // User doesn't exist - create new account
    console.log("Creating new user account...");
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Role lives in app_metadata: server-writable only, so a signed-in user
      // can never grant themselves a higher role via supabase.auth.updateUser().
      app_metadata: { role: role || "Associate" },
      // Automatically confirm email since email server hasn't been configured
      email_confirm: true,
    });

    if (createError) {
      console.error("Failed to create user in Supabase Auth:", createError);
      return c.json({ error: `Failed to create account: ${createError.message}` }, 400);
    }

    console.log("✓ User created in Supabase Auth:", createData.user.id);

    // Store user data in KV store
    const userData = {
      id: createData.user.id,
      name,
      email,
      role: role || "Associate",
      active: true,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${createData.user.id}`, userData);
    console.log("✓ User data stored in KV store");

    return c.json({ 
      user: createData.user, 
      success: true,
      message: "Account created successfully! You can now sign in."
    });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: `Signup failed: ${error.message}` }, 500);
  }
});

// Get current session
app.get("/make-server-bcab437c/auth/session", authMiddleware, async (c) => {
  const userData = c.get("userData");
  return c.json({ user: userData });
});

// Check if user should be logged out (and clear the flag)
// Supporting both GET and POST for compatibility
const checkLogoutHandler = async (c: any) => {
  const userId = c.get("userId");
  
  try {
    const logoutFlag = await kv.get(`user_force_logout:${userId}`);
    
    if (logoutFlag) {
      // Clear the flag
      await kv.del(`user_force_logout:${userId}`);
      console.log(`✓ Force logout flag found and cleared for user ${userId}`);
      
      return c.json({ 
        shouldLogout: true, 
        reason: "Your role has been changed",
        oldRole: logoutFlag.oldRole,
        newRole: logoutFlag.newRole
      });
    }
    
    return c.json({ shouldLogout: false });
  } catch (error) {
    console.error("Error checking logout flag:", error);
    return c.json({ shouldLogout: false });
  }
};

app.get("/make-server-bcab437c/auth/check-logout", authMiddleware, checkLogoutHandler);
app.post("/make-server-bcab437c/auth/check-logout", authMiddleware, checkLogoutHandler);

// Get all users (admin only)
app.get("/make-server-bcab437c/users", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (userRole !== "Super Admin" && userRole !== "Manager") {
    console.log(`🔒 Permission denied: User ${userId} with role ${userRole} is not Super Admin or Manager - returning empty array`);
    return c.json({ users: [] });
  }

  const users = await kv.getByPrefix("user:");
  return c.json({ users });
});

// Update user
app.put("/make-server-bcab437c/users/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const currentUserId = c.get("userId");
  const targetUserId = c.req.param("id");

  // Users can update themselves, admins/managers can update anyone
  if (currentUserId !== targetUserId && userRole !== "Super Admin" && userRole !== "Manager") {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const updates = await c.req.json();

  // Changing a role — even your own — requires Super Admin or Manager.
  // Without this check, any user could PUT their own id with {role: "Super Admin"}
  // and grant themselves admin, since the check above only restricts editing
  // OTHER people's records, not which fields you can change on your own.
  if (updates.role !== undefined && userRole !== "Super Admin" && userRole !== "Manager") {
    return c.json({ error: "Only a Super Admin or Manager can change roles" }, 403);
  }

  const existingUser = await kv.get(`user:${targetUserId}`);

  if (!existingUser) {
    return c.json({ error: "User not found" }, 404);
  }

  const updatedUser = { ...existingUser, ...updates };
  await kv.set(`user:${targetUserId}`, updatedUser);

  // If role changed, set a flag to force logout
  const roleChanged = updates.role && existingUser.role !== updates.role;
  if (roleChanged) {
    await kv.set(`user_force_logout:${targetUserId}`, {
      timestamp: Date.now(),
      oldRole: existingUser.role,
      newRole: updates.role,
    });
    console.log(`✓ Set force_logout flag for user ${targetUserId} (role changed from ${existingUser.role} to ${updates.role})`);
  }

  // If role or name changed, also update Supabase Auth metadata so it's in sync.
  // Role goes in app_metadata (server-writable only — this is what RLS policies
  // trust); name stays in user_metadata since it's not security-sensitive.
  if (updates.role || updates.name) {
    try {
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
        targetUserId,
        {
          user_metadata: {
            name: updatedUser.name,
          },
          app_metadata: {
            role: updatedUser.role,
          },
        }
      );

      if (updateAuthError) {
        console.error("Failed to update auth metadata:", updateAuthError);
        // Don't fail the request - KV is source of truth
      } else {
        console.log(`✓ Updated auth metadata for user ${targetUserId}`);
      }
    } catch (error) {
      console.error("Error updating auth metadata:", error);
      // Don't fail the request - KV is source of truth
    }
  }

  return c.json({ user: updatedUser, roleChanged });
});

// One-time backfill: copy each KV-stored user's role into their Supabase Auth
// app_metadata, so RLS policies (which read role from app_metadata, not the
// user-editable user_metadata) work correctly for accounts created before
// this endpoint existed. Safe to call repeatedly — it's idempotent.
app.post("/make-server-bcab437c/auth/sync-app-metadata-roles", async (c) => {
  try {
    const allUsers = await kv.getByPrefix("user:");
    const results = [];
    for (const u of allUsers) {
      try {
        const { error } = await supabase.auth.admin.updateUserById(u.id, {
          app_metadata: { role: u.role || "Associate" },
        });
        results.push({ email: u.email, success: !error, error: error?.message });
      } catch (err: any) {
        results.push({ email: u.email, success: false, error: err.message });
      }
    }
    return c.json({ synced: results.filter(r => r.success).length, total: results.length, results });
  } catch (error: any) {
    return c.json({ error: `Sync failed: ${error.message}` }, 500);
  }
});

// ============= PROJECT ROUTES =============

// Get all projects (with permission filtering)
app.get("/make-server-bcab437c/projects", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewProjects")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const projects = await kv.getByPrefix("project:");
  return c.json({ projects });
});

// Get single project
app.get("/make-server-bcab437c/projects/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewProjects")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const projectId = c.req.param("id");
  const project = await kv.get(`project:${projectId}`);
  
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json({ project });
});

// Create project
app.post("/make-server-bcab437c/projects", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (!hasPermission(userRole, "canEditProjects")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const projectData = await c.req.json();
  const id = Date.now();
  const project = { ...projectData, id };

  await kv.set(`project:${id}`, project);

  // Log activity
  await kv.set(`activity:${Date.now()}`, {
    id: Date.now(),
    userId,
    action: "created project",
    target: project.title,
    targetId: id,
    timestamp: new Date().toISOString(),
    type: "project",
  });

  return c.json({ project });
});

// Update project
app.put("/make-server-bcab437c/projects/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (!hasPermission(userRole, "canEditProjects")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const projectId = c.req.param("id");
  const updates = await c.req.json();
  const existingProject = await kv.get(`project:${projectId}`);
  
  if (!existingProject) {
    return c.json({ error: "Project not found" }, 404);
  }

  const updatedProject = { ...existingProject, ...updates };
  await kv.set(`project:${projectId}`, updatedProject);

  // Log activity
  await kv.set(`activity:${Date.now()}`, {
    id: Date.now(),
    userId,
    action: "updated project",
    target: updatedProject.title,
    targetId: parseInt(projectId),
    timestamp: new Date().toISOString(),
    type: "project",
  });

  return c.json({ project: updatedProject });
});

// Delete project
app.delete("/make-server-bcab437c/projects/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditProjects")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const projectId = c.req.param("id");
  await kv.del(`project:${projectId}`);

  // Delete associated tasks
  const tasks = await kv.getByPrefix("task:");
  for (const task of tasks) {
    if (task.projectId === parseInt(projectId)) {
      await kv.del(`task:${task.id}`);
    }
  }

  return c.json({ success: true });
});

// ============= TASK ROUTES =============

// Get all tasks or tasks by project/status
app.get("/make-server-bcab437c/tasks", authMiddleware, async (c) => {
  try {
    const userRole = c.get("userRole");
    
    if (!hasPermission(userRole, "canViewProjects")) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    const projectId = c.req.query("projectId");
    const status = c.req.query("status");
    const assignee = c.req.query("assignee");
    
    let tasks = await kv.getByPrefix("task:");
    
    // Filter by projectId if provided
    if (projectId) {
      tasks = tasks.filter(t => t.projectId === parseInt(projectId));
    }
    
    // Filter by status if provided (supports comma-separated statuses)
    if (status) {
      const statuses = status.split(',');
      tasks = tasks.filter(t => t && t.status && statuses.includes(t.status));
    }
    
    // Filter by assignee if provided
    if (assignee) {
      tasks = tasks.filter(t => t && t.assignee === parseInt(assignee));
    }

    return c.json({ tasks });
  } catch (error: any) {
    console.error("❌ Error fetching tasks:", error);
    return c.json({ 
      error: "Failed to fetch tasks",
      details: error.message 
    }, 500);
  }
});

// Create task
app.post("/make-server-bcab437c/tasks", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (!hasPermission(userRole, "canEditProjects")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const taskData = await c.req.json();
  const id = Date.now();
  const task = {
    ...taskData,
    id,
    createdAt: new Date().toISOString(),
  };

  await kv.set(`task:${id}`, task);

  // Log activity
  await kv.set(`activity:${Date.now()}`, {
    id: Date.now(),
    userId,
    action: "created task",
    target: task.title,
    targetId: id,
    timestamp: new Date().toISOString(),
    type: "task",
  });

  return c.json({ task });
});

// Update task
app.put("/make-server-bcab437c/tasks/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (!hasPermission(userRole, "canEditProjects")) {
    console.error("❌ Permission denied for task update:", userRole);
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const taskId = c.req.param("id");
  const updates = await c.req.json();
  
  const existingTask = await kv.get(`task:${taskId}`);
  
  if (!existingTask) {
    console.error("❌ Task not found:", taskId);
    return c.json({ error: "Task not found" }, 404);
  }

  const updatedTask = { ...existingTask, ...updates };
  await kv.set(`task:${taskId}`, updatedTask);

  // Update team member stats when task is completed with rating
  if (updates.status === "Completed" && existingTask.status !== "Completed") {
    const member = await kv.get(`team_member:${updatedTask.assignee}`);
    if (member) {
      const completed = member.tasksCompleted + 1;
      const onTime = new Date(updatedTask.dueDate) >= new Date() ? member.tasksOnTime + 1 : member.tasksOnTime;
      const efficiency = Math.round((onTime / completed) * 100);
      
      // Calculate new Aura rating if task has a rating
      let newAuraRating = member.auraRating;
      if (updates.rating !== undefined) {
        // Weighted average: 80% existing rating, 20% new task rating
        newAuraRating = (member.auraRating * 0.8) + (updates.rating * 0.2);
        newAuraRating = Math.round(newAuraRating * 10) / 10; // Round to 1 decimal
      }
      
      await kv.set(`team_member:${member.id}`, {
        ...member,
        tasksCompleted: completed,
        tasksOnTime: onTime,
        efficiency,
        auraRating: newAuraRating,
      });
    } else {
      console.warn("⚠️ Team member not found:", updatedTask.assignee);
    }
  }

  // Log activity
  await kv.set(`activity:${Date.now()}`, {
    id: Date.now(),
    userId,
    action: "updated task",
    target: updatedTask.title,
    targetId: parseInt(taskId),
    timestamp: new Date().toISOString(),
    type: "task",
  });

  return c.json({ task: updatedTask });
});

// Delete task
app.delete("/make-server-bcab437c/tasks/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditProjects")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const taskId = c.req.param("id");
  await kv.del(`task:${taskId}`);

  return c.json({ success: true });
});

// ============= TEAM MEMBER ROUTES =============

// Get all team members
app.get("/make-server-bcab437c/team", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewTeam")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const teamMembers = await kv.getByPrefix("team_member:");
  return c.json({ teamMembers });
});

// Create team member
app.post("/make-server-bcab437c/team", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (!hasPermission(userRole, "canEditTeam")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const memberData = await c.req.json();
  const id = Date.now();
  const member = { ...memberData, id };

  await kv.set(`team_member:${id}`, member);

  // Log activity
  await kv.set(`activity:${Date.now()}`, {
    id: Date.now(),
    userId,
    action: "added team member",
    target: member.name,
    targetId: id,
    timestamp: new Date().toISOString(),
    type: "team",
  });

  return c.json({ member });
});

// Update team member
app.put("/make-server-bcab437c/team/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditTeam")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const memberId = c.req.param("id");
  const updates = await c.req.json();
  const existingMember = await kv.get(`team_member:${memberId}`);
  
  if (!existingMember) {
    return c.json({ error: "Team member not found" }, 404);
  }

  const updatedMember = { ...existingMember, ...updates };
  await kv.set(`team_member:${memberId}`, updatedMember);

  return c.json({ member: updatedMember });
});

// Delete team member
app.delete("/make-server-bcab437c/team/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditTeam")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const memberId = c.req.param("id");
  await kv.del(`team_member:${memberId}`);

  return c.json({ success: true });
});

// ============= VENDOR ROUTES =============

// Get all vendors
app.get("/make-server-bcab437c/vendors", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewVendors")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching vendors from PostgreSQL:', error);
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ vendors: data || [] });
  } catch (error: any) {
    console.error('Error in GET /vendors:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create vendor
app.post("/make-server-bcab437c/vendors", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (!hasPermission(userRole, "canEditVendors")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const vendorData = await c.req.json();
    
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        name: vendorData.name,
        category: vendorData.category || null,
        rating: vendorData.rating || 0,
        total_projects: vendorData.total_projects || 0,
        on_time_delivery: vendorData.on_time_delivery || 0,
        quality_score: vendorData.quality_score || 0,
        contact: vendorData.contact || null,
        services: vendorData.services || null,
        website: vendorData.website || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating vendor in PostgreSQL:', error);
      return c.json({ error: error.message }, 500);
    }
    
    // Log activity (still using KV for activities)
    await kv.set(`activity:${Date.now()}`, {
      id: Date.now(),
      userId,
      action: "added vendor",
      target: data.name,
      targetId: data.id,
      timestamp: new Date().toISOString(),
      type: "vendor",
    });
    
    return c.json({ vendor: data });
  } catch (error: any) {
    console.error('Error in POST /vendors:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update vendor
app.put("/make-server-bcab437c/vendors/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditVendors")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const vendorId = c.req.param("id");
    const updates = await c.req.json();
    
    const { data, error } = await supabase
      .from('vendors')
      .update({
        name: updates.name,
        category: updates.category,
        rating: updates.rating,
        total_projects: updates.total_projects,
        on_time_delivery: updates.on_time_delivery,
        quality_score: updates.quality_score,
        contact: updates.contact,
        services: updates.services,
        website: updates.website,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating vendor in PostgreSQL:', error);
      return c.json({ error: error.message }, 500);
    }
    
    if (!data) {
      return c.json({ error: "Vendor not found" }, 404);
    }
    
    return c.json({ vendor: data });
  } catch (error: any) {
    console.error('Error in PUT /vendors/:id:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete vendor
app.delete("/make-server-bcab437c/vendors/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditVendors")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const vendorId = c.req.param("id");
    
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendorId);
    
    if (error) {
      console.error('Error deleting vendor from PostgreSQL:', error);
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /vendors/:id:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============= TASK TEMPLATE ROUTES =============

// Get all task templates
app.get("/make-server-bcab437c/task-templates", authMiddleware, async (c) => {
  const templates = await kv.getByPrefix("task_template:");
  return c.json({ templates });
});

// Create task template
app.post("/make-server-bcab437c/task-templates", authMiddleware, async (c) => {
  const templateData = await c.req.json();
  const id = `tmpl-${Date.now()}`;
  const template = {
    ...templateData,
    id,
    createdAt: new Date().toISOString(),
  };

  await kv.set(`task_template:${id}`, template);

  return c.json({ template });
});

// Delete task template
app.delete("/make-server-bcab437c/task-templates/:id", authMiddleware, async (c) => {
  const templateId = c.req.param("id");
  await kv.del(`task_template:${templateId}`);

  return c.json({ success: true });
});

// ============= CLIENT ROUTES =============

// Get all clients
app.get("/make-server-bcab437c/clients", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewCRM")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching clients from PostgreSQL:', error);
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ clients: data || [] });
  } catch (error: any) {
    console.error('Error in GET /clients:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create client
app.post("/make-server-bcab437c/clients", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (!hasPermission(userRole, "canEditCRM")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const clientData = await c.req.json();
    
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone || null,
        company: clientData.company || null,
        status: clientData.status || 'Lead',
        projects_count: clientData.projects_count || 0,
        total_value: clientData.total_value || 0,
        source: clientData.source || null,
        notes: clientData.notes || null,
        last_contact: clientData.last_contact || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating client in PostgreSQL:', error);
      return c.json({ error: error.message }, 500);
    }
    
    // Log activity (still using KV for activities)
    await kv.set(`activity:${Date.now()}`, {
      id: Date.now(),
      userId,
      action: "added client",
      target: data.name,
      targetId: data.id,
      timestamp: new Date().toISOString(),
      type: "client",
    });
    
    return c.json({ client: data });
  } catch (error: any) {
    console.error('Error in POST /clients:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update client
app.put("/make-server-bcab437c/clients/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditCRM")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const clientId = c.req.param("id");
    const updates = await c.req.json();
    
    const { data, error } = await supabase
      .from('clients')
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        company: updates.company,
        status: updates.status,
        projects_count: updates.projects_count,
        total_value: updates.total_value,
        source: updates.source,
        notes: updates.notes,
        last_contact: updates.last_contact,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating client in PostgreSQL:', error);
      return c.json({ error: error.message }, 500);
    }
    
    if (!data) {
      return c.json({ error: "Client not found" }, 404);
    }
    
    return c.json({ client: data });
  } catch (error: any) {
    console.error('Error in PUT /clients/:id:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete client
app.delete("/make-server-bcab437c/clients/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditCRM")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const clientId = c.req.param("id");
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);
    
    if (error) {
      console.error('Error deleting client from PostgreSQL:', error);
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /clients/:id:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============= LEAD ROUTES =============

// Get all leads
app.get("/make-server-bcab437c/leads", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewCRM")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const leads = await kv.getByPrefix("lead:");
  return c.json({ leads });
});

// Create lead - Accepts data from website booking form OR admin panel
app.post("/make-server-bcab437c/leads", async (c) => {
  // Check if request has auth header (from admin panel) or is public (from website)
  const authHeader = c.req.header("Authorization");
  let isWebsiteSubmission = false;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Authenticated request from admin panel - verify permissions
    const userRole = c.get("userRole");
    if (!hasPermission(userRole, "canEditCRM")) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
  } else {
    // Public request from website booking form
    isWebsiteSubmission = true;
  }

  const leadData = await c.req.json();
  const id = Date.now();
  
  // Compute full name from first_name and last_name if provided
  const fullName = leadData.first_name && leadData.last_name 
    ? `${leadData.first_name} ${leadData.last_name}` 
    : leadData.name || "Unknown";
  
  // Map website form fields to Lead structure
  // IMPORTANT: Keep contact form "message" separate from booking form "project_details"
  // IMPORTANT: "notes" is ONLY for admin internal notes, never from website forms
  const lead = {
    id,
    source_form: leadData.source_form || "", // 'contact' or 'booking'
    first_name: leadData.first_name || "",
    last_name: leadData.last_name || "",
    name: fullName,
    email: leadData.email || "",
    phone: leadData.phone_number || leadData.phone || "",
    address: leadData.project_address || leadData.address || "",
    consultation_date: leadData.preferred_consultation_date || leadData.consultation_date || "",
    // For booking form: service_type and project_details
    service_type: leadData.service_type || "",
    project_details: leadData.project_details || "",
    // For contact form: project_type and message
    project_type: leadData.project_type || "",
    message: leadData.message || "",
    // Legacy field mapping (keep for backwards compatibility)
    project_interest: leadData.service_type || leadData.project_type || leadData.project_interest || "",
    project_description: leadData.project_details || leadData.message || leadData.project_description || "",
    links: leadData.links || "",
    company: leadData.company || "",
    status: leadData.status || "New Lead",
    source: leadData.source || (isWebsiteSubmission ? "Website Booking" : "Admin Panel"),
    notes: isWebsiteSubmission ? "" : (leadData.notes || ""), // NEVER accept notes from website forms
    created_at: new Date().toISOString(),
    last_contact: leadData.last_contact || "",
  };

  // Check for duplicate leads by email or phone
  const existingLeads = await kv.getByPrefix("lead:");
  const duplicate = existingLeads.find((l: any) => 
    (l.email && l.email.toLowerCase() === lead.email.toLowerCase()) ||
    (l.phone && l.phone === lead.phone)
  );

  if (duplicate) {
    return c.json({ 
      error: "A lead with this email or phone number already exists",
      duplicateLead: duplicate 
    }, 409);
  }

  await kv.set(`lead:${id}`, lead);

  // Log activity (only if from admin panel)
  if (!isWebsiteSubmission) {
    const userId = c.get("userId");
    await kv.set(`activity:${Date.now()}`, {
      id: Date.now(),
      userId,
      action: "added lead",
      target: lead.name,
      targetId: id,
      timestamp: new Date().toISOString(),
      type: "client",
    });
  }

  return c.json({ lead, message: "Lead created successfully" });
});

// Update lead
app.put("/make-server-bcab437c/leads/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditCRM")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const leadId = c.req.param("id");
  const updates = await c.req.json();
  const existingLead = await kv.get(`lead:${leadId}`);
  
  if (!existingLead) {
    return c.json({ error: "Lead not found" }, 404);
  }

  const updatedLead = { ...existingLead, ...updates };
  await kv.set(`lead:${leadId}`, updatedLead);

  return c.json({ lead: updatedLead });
});

// Delete lead
app.delete("/make-server-bcab437c/leads/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditCRM")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const leadId = c.req.param("id");
  await kv.del(`lead:${leadId}`);

  return c.json({ success: true });
});

// Convert lead to client
app.post("/make-server-bcab437c/leads/:id/convert", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (!hasPermission(userRole, "canEditCRM")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const leadId = c.req.param("id");
  const lead = await kv.get(`lead:${leadId}`);
  
  if (!lead) {
    return c.json({ error: "Lead not found" }, 404);
  }

  // Create client from lead
  const clientId = Date.now();
  const client = {
    id: clientId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    status: "Active",
    projectsCount: 0,
    totalValue: 0,
    source: lead.source,
    notes: lead.notes,
    lastContact: new Date().toISOString(),
  };

  await kv.set(`client:${clientId}`, client);

  // Delete the lead
  await kv.del(`lead:${leadId}`);

  // Log activity
  await kv.set(`activity:${Date.now()}`, {
    id: Date.now(),
    userId,
    action: "converted lead to client",
    target: lead.name,
    targetId: clientId,
    timestamp: new Date().toISOString(),
    type: "client",
  });

  return c.json({ client });
});

// ============= INVENTORY ROUTES =============

// Get all inventory items
app.get("/make-server-bcab437c/inventory", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewInventory")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const items = await kv.getByPrefix("inventory:");
  return c.json({ items });
});

// Create inventory item
app.post("/make-server-bcab437c/inventory", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (!hasPermission(userRole, "canEditInventory")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const itemData = await c.req.json();
  const id = Date.now();
  const item = { ...itemData, id };

  await kv.set(`inventory:${id}`, item);

  // Log activity
  await kv.set(`activity:${Date.now()}`, {
    id: Date.now(),
    userId,
    action: "added inventory item",
    target: item.name,
    targetId: id,
    timestamp: new Date().toISOString(),
    type: "inventory",
  });

  return c.json({ item });
});

// Update inventory item
app.put("/make-server-bcab437c/inventory/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditInventory")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const itemId = c.req.param("id");
  const updates = await c.req.json();
  const existingItem = await kv.get(`inventory:${itemId}`);
  
  if (!existingItem) {
    return c.json({ error: "Item not found" }, 404);
  }

  const updatedItem = { ...existingItem, ...updates };
  await kv.set(`inventory:${itemId}`, updatedItem);

  return c.json({ item: updatedItem });
});

// Delete inventory item
app.delete("/make-server-bcab437c/inventory/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditInventory")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const itemId = c.req.param("id");
  await kv.del(`inventory:${itemId}`);

  return c.json({ success: true });
});

// ============= TRANSACTION ROUTES =============

// Get all transactions
app.get("/make-server-bcab437c/transactions", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewFinance")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const transactions = await kv.getByPrefix("transaction:");
  return c.json({ transactions });
});

// Create transaction
app.post("/make-server-bcab437c/transactions", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  if (!hasPermission(userRole, "canEditFinance")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const transactionData = await c.req.json();
  const id = Date.now();
  const transaction = { ...transactionData, id };

  await kv.set(`transaction:${id}`, transaction);

  // Log activity
  await kv.set(`activity:${Date.now()}`, {
    id: Date.now(),
    userId,
    action: "added transaction",
    target: transaction.description,
    targetId: id,
    timestamp: new Date().toISOString(),
    type: "finance",
  });

  return c.json({ transaction });
});

// Update transaction
app.put("/make-server-bcab437c/transactions/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditFinance")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const transactionId = c.req.param("id");
  const updates = await c.req.json();
  const existingTransaction = await kv.get(`transaction:${transactionId}`);
  
  if (!existingTransaction) {
    return c.json({ error: "Transaction not found" }, 404);
  }

  const updatedTransaction = { ...existingTransaction, ...updates };
  await kv.set(`transaction:${transactionId}`, updatedTransaction);

  return c.json({ transaction: updatedTransaction });
});

// Delete transaction
app.delete("/make-server-bcab437c/transactions/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canEditFinance")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const transactionId = c.req.param("id");
  await kv.del(`transaction:${transactionId}`);

  return c.json({ success: true });
});

// ============= ACTIVITY ROUTES =============

// Get all activities
app.get("/make-server-bcab437c/activities", authMiddleware, async (c) => {
  const activities = await kv.getByPrefix("activity:");
  
  // Sort by timestamp descending (newest first)
  const sortedActivities = activities.sort((a: any, b: any) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  
  return c.json({ activities: sortedActivities });
});

// ============= INITIALIZATION ROUTE =============

// Initialize database with seed data (call this once to populate)
app.post("/make-server-bcab437c/initialize", async (c) => {
  try {
    // Check if already initialized
    const existing = await kv.getByPrefix("project:");
    if (existing.length > 0) {
      return c.json({ message: "Database already initialized" });
    }

    // ============================================
    // CLEAN SLATE INITIALIZATION
    // ============================================
    // No seed data is created. You can now add your real data through the UI.
    // All modules are fully functional and ready to accept real projects,
    // tasks, team members, vendors, clients, leads, inventory, and transactions.
    
    console.log("✓ Database initialized with clean slate - ready for real data");

    return c.json({ 
      message: "Database initialized successfully with clean slate",
      note: "Add your real data through the application interface"
    });
  } catch (error) {
    console.error("Initialization error:", error);
    return c.json({ error: `Initialization failed: ${error.message}` }, 500);
  }
});

// ============= DATA WIPE ROUTE (PRODUCTION INITIALIZATION) =============

// Wipe all data except users - for production initialization
app.post("/make-server-bcab437c/admin/wipe-data", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  const userId = c.get("userId");
  
  // Only Super Admin can wipe data
  if (userRole !== "Super Admin") {
    console.error(`❌ Permission denied: User ${userId} attempted data wipe with role ${userRole}`);
    return c.json({ error: "Insufficient permissions - Super Admin only" }, 403);
  }

  console.log(`🚨 DATA WIPE initiated by user ${userId} (${userRole})`);

  try {
    const deletedCounts: Record<string, number> = {};

    // Delete all projects
    const projects = await kv.getByPrefix("project:");
    for (const project of projects) {
      await kv.del(`project:${project.id}`);
    }
    deletedCounts.projects = projects.length;
    console.log(`✓ Deleted ${projects.length} projects`);

    // Delete all tasks
    const tasks = await kv.getByPrefix("task:");
    for (const task of tasks) {
      await kv.del(`task:${task.id}`);
    }
    deletedCounts.tasks = tasks.length;
    console.log(`✓ Deleted ${tasks.length} tasks`);

    // Delete all vendors
    const vendors = await kv.getByPrefix("vendor:");
    for (const vendor of vendors) {
      await kv.del(`vendor:${vendor.id}`);
    }
    deletedCounts.vendors = vendors.length;
    console.log(`✓ Deleted ${vendors.length} vendors`);

    // Delete all inventory
    const inventory = await kv.getByPrefix("inventory:");
    for (const item of inventory) {
      await kv.del(`inventory:${item.id}`);
    }
    deletedCounts.inventory = inventory.length;
    console.log(`✓ Deleted ${inventory.length} inventory items`);

    // Delete all transactions
    const transactions = await kv.getByPrefix("transaction:");
    for (const transaction of transactions) {
      await kv.del(`transaction:${transaction.id}`);
    }
    deletedCounts.transactions = transactions.length;
    console.log(`✓ Deleted ${transactions.length} transactions`);

    // Delete all clients
    const clients = await kv.getByPrefix("client:");
    for (const client of clients) {
      await kv.del(`client:${client.id}`);
    }
    deletedCounts.clients = clients.length;
    console.log(`✓ Deleted ${clients.length} clients`);

    // Delete all leads
    const leads = await kv.getByPrefix("lead:");
    for (const lead of leads) {
      await kv.del(`lead:${lead.id}`);
    }
    deletedCounts.leads = leads.length;
    console.log(`✓ Deleted ${leads.length} leads`);

    // Delete all team members (but keep users)
    const teamMembers = await kv.getByPrefix("team_member:");
    for (const member of teamMembers) {
      await kv.del(`team_member:${member.id}`);
    }
    deletedCounts.teamMembers = teamMembers.length;
    console.log(`✓ Deleted ${teamMembers.length} team members`);

    // Delete all activities
    const activities = await kv.getByPrefix("activity:");
    for (const activity of activities) {
      await kv.del(`activity:${activity.id}`);
    }
    deletedCounts.activities = activities.length;
    console.log(`✓ Deleted ${activities.length} activities`);

    // Delete all task templates
    const templates = await kv.getByPrefix("task_template:");
    for (const template of templates) {
      await kv.del(`task_template:${template.id}`);
    }
    deletedCounts.taskTemplates = templates.length;
    console.log(`✓ Deleted ${templates.length} task templates`);

    // Delete all QC reviews
    const qcReviews = await kv.getByPrefix("qc_review:");
    for (const review of qcReviews) {
      await kv.del(`qc_review:${review.id}`);
    }
    deletedCounts.qcReviews = qcReviews.length;
    console.log(`✓ Deleted ${qcReviews.length} QC reviews`);

    // Delete all reminders
    const reminders = await kv.getByPrefix("reminder:");
    for (const reminder of reminders) {
      await kv.del(`reminder:${reminder.id}`);
    }
    deletedCounts.reminders = reminders.length;
    console.log(`✓ Deleted ${reminders.length} reminders`);

    // Delete all phase QC reviews
    const phaseQCs = await kv.getByPrefix("phase_qc:");
    for (const phaseQC of phaseQCs) {
      await kv.del(`phase_qc:${phaseQC.id}`);
    }
    deletedCounts.phaseQCReviews = phaseQCs.length;
    console.log(`✓ Deleted ${phaseQCs.length} phase QC reviews`);

    // Delete all pricing records
    const pricingRecords = await kv.getByPrefix("pricing:");
    for (const pricing of pricingRecords) {
      await kv.del(`pricing:${pricing.id}`);
    }
    deletedCounts.pricing = pricingRecords.length;
    console.log(`✓ Deleted ${pricingRecords.length} pricing records`);

    // Delete all attachments/file metadata
    const attachments = await kv.getByPrefix("attachment:");
    for (const attachment of attachments) {
      await kv.del(`attachment:${attachment.id}`);
    }
    deletedCounts.attachments = attachments.length;
    console.log(`✓ Deleted ${attachments.length} attachments`);

    // Delete ALL other data except users and audit logs
    // This ensures we catch anything we might have missed
    const allKeys = await kv.getByPrefix("");
    let otherCount = 0;
    for (const item of allKeys) {
      const key = Object.keys(item)[0] || "";
      // Skip users and audit logs
      if (key.startsWith("user:") || key.startsWith("audit:") || key.startsWith("user_force_logout:")) {
        continue;
      }
      // Delete everything else we haven't explicitly handled
      if (key && !key.startsWith("project:") && !key.startsWith("task:") && !key.startsWith("vendor:") && 
          !key.startsWith("inventory:") && !key.startsWith("transaction:") && !key.startsWith("client:") && 
          !key.startsWith("lead:") && !key.startsWith("team_member:") && !key.startsWith("activity:") && 
          !key.startsWith("task_template:") && !key.startsWith("qc_review:") && !key.startsWith("reminder:") && 
          !key.startsWith("phase_qc:") && !key.startsWith("pricing:") && !key.startsWith("attachment:")) {
        await kv.del(key);
        otherCount++;
      }
    }
    deletedCounts.other = otherCount;
    console.log(`✓ Deleted ${otherCount} other records`);

    // Log audit record
    const auditId = Date.now();
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      action: "DATA_WIPE",
      performedBy: userId,
      timestamp: new Date().toISOString(),
      deletedCounts,
      details: "Production initialization - all mock data cleared",
    });
    console.log(`✓ Audit log created`);

    console.log(`✅ DATA WIPE COMPLETE:`, deletedCounts);

    return c.json({ 
      success: true, 
      message: "All data wiped successfully",
      deletedCounts,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("❌ Data wipe error:", error);
    return c.json({ 
      error: `Data wipe failed: ${error.message}`,
      details: error
    }, 500);
  }
});

// ============= NOTIFICATION ROUTES =============

// Send email notification for new lead
app.post("/make-server-bcab437c/notifications/new-lead", async (c) => {
  try {
    const body = await c.req.json();
    const {
      leadId,
      leadName,
      leadEmail,
      leadPhone,
      source,
      sourceForm,
      sourcePage,
      serviceType,
      projectAddress,
      province,
      consultationDate,
      consultationTime,
      projectDetails,
      company,
      submittedAt,
    } = body;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY environment variable not set");
      return c.json({
        error: "Email service not configured",
        message: "RESEND_API_KEY environment variable is required to send emails",
      }, 500);
    }

    // Escape customer-supplied HTML content
    const esc = (s: string | null | undefined) =>
      (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // Format consultation time HH:MM → 12-hr AM/PM
    const fmt12hr = (t: string | null | undefined) => {
      if (!t) return null;
      const [hStr, mStr] = t.split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr || "0", 10);
      if (isNaN(h)) return t;
      const period = h < 12 ? "AM" : "PM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${String(m).padStart(2, "0")} ${period}`;
    };

    // Format submitted date
    const fmtDate = (d: string | null | undefined) => {
      if (!d) return null;
      try {
        return new Date(d).toLocaleString("en-CA", {
          timeZone: "America/Vancouver",
          year: "numeric", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit", hour12: true,
        });
      } catch { return d; }
    };

    const formLabel = sourceForm === "booking" ? "Booking Request" : sourceForm === "contact" ? "Contact Form" : source || "Website";
    const safeService = esc(serviceType);
    const safeSubjectName = esc(leadName);

    const row = (label: string, value: string | null | undefined) =>
      value ? `<tr><td style="padding:6px 12px 6px 0;color:#848580;font-size:12px;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 0;font-size:13px">${esc(value)}</td></tr>` : "";

    const emailHtml = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Roboto Mono',monospace">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
  <div style="background:#848580;padding:24px 32px">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.08em">Cstle Livn Admin</p>
    <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800">New Estimate Request</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px">${safeSubjectName}${safeService ? ` — ${safeService}` : ""}</p>
  </div>

  <div style="padding:32px">
    <!-- Personal Information -->
    <h2 style="margin:0 0 16px;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#848580;border-bottom:1px solid #eee;padding-bottom:8px">Personal Information</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      ${row("Name", leadName)}
      ${row("Email", `<a href="mailto:${esc(leadEmail)}" style="color:#748B7B">${esc(leadEmail)}</a>`)}
      ${row("Phone", leadPhone ? `<a href="tel:${esc(leadPhone)}" style="color:#748B7B">${esc(leadPhone)}</a>` : null)}
      ${row("Company", company)}
    </table>

    <!-- Project Information -->
    <h2 style="margin:0 0 16px;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#848580;border-bottom:1px solid #eee;padding-bottom:8px">Project Information</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      ${row("Service Type", serviceType)}
      ${row("Project Address", projectAddress)}
      ${row("Province", province)}
      ${row("Preferred Date", consultationDate ? new Date(consultationDate).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : null)}
      ${row("Preferred Time", fmt12hr(consultationTime))}
    </table>

    ${projectDetails ? `
    <h2 style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#848580;border-bottom:1px solid #eee;padding-bottom:8px">Project Details</h2>
    <div style="background:#f9f9f9;border-left:3px solid #848580;padding:16px;border-radius:0 8px 8px 0;margin-bottom:28px;font-size:13px;line-height:1.7;white-space:pre-wrap">${esc(projectDetails)}</div>
    ` : ""}

    <!-- Submission Information -->
    <h2 style="margin:0 0 16px;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#848580;border-bottom:1px solid #eee;padding-bottom:8px">Submission Details</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      ${row("Form", formLabel)}
      ${row("Source Page", sourcePage)}
      ${row("Submitted", fmtDate(submittedAt))}
      ${row("Lead ID", leadId ? String(leadId) : null)}
    </table>
  </div>

  <div style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee">
    <p style="margin:0;font-size:11px;color:#999">This notification was sent automatically by the Cstle Livn Admin Panel.</p>
  </div>
</div>
</body></html>`;

    // Plain text version
    const emailText = [
      `NEW ESTIMATE REQUEST — Cstle Livn`,
      ``,
      `PERSONAL INFORMATION`,
      `Name: ${leadName}`,
      `Email: ${leadEmail}`,
      leadPhone ? `Phone: ${leadPhone}` : null,
      company ? `Company: ${company}` : null,
      ``,
      `PROJECT INFORMATION`,
      serviceType ? `Service Type: ${serviceType}` : null,
      projectAddress ? `Project Address: ${projectAddress}` : null,
      province ? `Province: ${province}` : null,
      consultationDate ? `Preferred Date: ${new Date(consultationDate).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}` : null,
      consultationTime ? `Preferred Time: ${fmt12hr(consultationTime)}` : null,
      ``,
      projectDetails ? `PROJECT DETAILS\n${projectDetails}` : null,
      ``,
      `SUBMISSION DETAILS`,
      `Form: ${formLabel}`,
      sourcePage ? `Source Page: ${sourcePage}` : null,
      submittedAt ? `Submitted: ${fmtDate(submittedAt)}` : null,
      leadId ? `Lead ID: ${leadId}` : null,
    ].filter(Boolean).join("\n");

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cstle Livn Admin <info@cstlelivn.ca>",
        to: ["info@cstlelivn.ca"],
        subject: `New Estimate Request: ${leadName}${safeService ? ` — ${safeService}` : ""}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Failed to send email via Resend:", result);
      return c.json({ error: "Failed to send email", details: result }, response.status);
    }

    console.log(`✓ Email notification sent for new lead: ${leadName} (ID: ${leadId})`);
    return c.json({ success: true, emailId: result.id, message: "Email notification sent successfully" });
  } catch (error: any) {
    console.error("❌ Error sending email notification:", error);
    return c.json({ error: "Failed to send email notification", details: error.message }, 500);
  }
});

// ============= BULK EMAIL CAMPAIGN =============

// Send bulk email campaign to selected leads
app.post("/make-server-bcab437c/bulk-email", async (c) => {
  try {
    const { leads, subject, message } = await c.req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return c.json({ error: "No leads provided" }, 400);
    }

    if (!subject || !message) {
      return c.json({ error: "Subject and message are required" }, 400);
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY environment variable not set");
      return c.json({ 
        error: "Email service not configured. Please contact administrator." 
      }, 500);
    }

    console.log(`📧 Sending bulk email campaign to ${leads.length} leads...`);
    
    let successCount = 0;
    let failCount = 0;
    const errors: any[] = [];

    // Send emails sequentially to avoid rate limiting
    for (const lead of leads) {
      try {
        // Personalize message by replacing {{name}} with the lead's name
        const personalizedMessage = message.replace(/\{\{name\}\}/g, lead.name);

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #848580; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 30px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                p { margin-bottom: 15px; white-space: pre-wrap; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">Cstle Livn</h1>
                </div>
                <div class="content">
                  <p>${personalizedMessage.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="footer">
                  <p>Cstle Livn - Modern Finishing Installer</p>
                  <p>This email was sent from Cstle Livn CRM</p>
                </div>
              </div>
            </body>
          </html>
        `;

        // Send email via Resend API
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Cstle Livn <info@cstlelivn.ca>",
            to: [lead.email],
            subject: subject,
            html: emailHtml,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error(`❌ Failed to send email to ${lead.email}:`, result);
          failCount++;
          errors.push({ email: lead.email, error: result });
        } else {
          console.log(`✓ Email sent to ${lead.email} (${lead.name})`);
          successCount++;
        }

        // Add a small delay between emails to avoid rate limiting (100ms)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`❌ Error sending email to ${lead.email}:`, error);
        failCount++;
        errors.push({ email: lead.email, error: error.message });
      }
    }

    console.log(`✓ Bulk email campaign complete: ${successCount} sent, ${failCount} failed`);

    return c.json({ 
      success: true,
      sent: successCount,
      failed: failCount,
      total: leads.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error("❌ Error in bulk email campaign:", error);
    return c.json({ 
      error: "Failed to send bulk email campaign",
      details: error.message 
    }, 500);
  }
});

// ============= PROJECT UPDATE EMAIL ROUTE =============
// Send email notification when project phase or status changes
app.post("/make-server-bcab437c/projects/send-update-email", async (c) => {
  try {
    const { changeType, oldValue, newValue, to, cc, subject, body } = await c.req.json();

    console.log(`📧 Sending project ${changeType} update email...`);

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY environment variable not set");
      return c.json({ 
        error: "Email service not configured" 
      }, 500);
    }

    // Validate inputs
    if (!to || to.length === 0) {
      return c.json({ error: "At least one recipient is required" }, 400);
    }

    if (!subject || !body) {
      return c.json({ error: "Subject and body are required" }, 400);
    }

    // Build the HTML email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #748B7B 0%, #848580 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Cstle Livn
              </h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">
                Project Update
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <!-- Message body (preserving line breaks) -->
              <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #333333;">
${body}
              </div>
            </div>
            
            <!-- Footer -->
            <div style="padding: 24px 40px; background-color: #f9f9f9; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888888;">
                This email was sent from Cstle Livn Project Management System
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #aaaaaa;">
                If you have any questions, please contact your project manager.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cstle Livn <info@cstlelivn.ca>",
        to: to,
        cc: cc && cc.length > 0 ? cc : undefined,
        subject: subject,
        html: emailHtml,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Failed to send project update email:", result);
      return c.json({ 
        error: "Failed to send email",
        details: result 
      }, 500);
    }

    console.log(`✓ Project update email sent successfully (${changeType}: ${oldValue} → ${newValue})`);
    
    return c.json({ 
      success: true,
      messageId: result.id,
      message: "Email sent successfully"
    });

  } catch (error: any) {
    console.error("❌ Error sending project update email:", error);
    return c.json({ 
      error: "Failed to send email",
      details: error.message 
    }, 500);
  }
});

// ============= PHASE COMPLETION EMAIL ROUTE =============
// Send email notification for phase completion
app.post("/make-server-bcab437c/send-email", async (c) => {
  try {
    const { recipients, subject, message, projectId } = await c.req.json();

    console.log(`📧 Sending phase completion email to ${recipients?.length || 0} recipient(s)...`);

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY environment variable not set");
      return c.json({ 
        error: "Email service not configured" 
      }, 500);
    }

    // Validate inputs
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return c.json({ error: "At least one recipient is required" }, 400);
    }

    if (!subject || !message) {
      return c.json({ error: "Subject and message are required" }, 400);
    }

    // Build the HTML email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #748B7B 0%, #848580 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Cstle Livn
              </h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">
                Project Phase Update
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <!-- Message body (preserving line breaks) -->
              <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #333333;">
${message}
              </div>
            </div>
            
            <!-- Footer -->
            <div style="padding: 24px 40px; background-color: #f9f9f9; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888888;">
                This email was sent from Cstle Livn Project Management System
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #aaaaaa;">
                If you have any questions, please contact your project manager.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Cstle Livn <info@cstlelivn.ca>",
        to: recipients,
        subject: subject,
        html: emailHtml,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Failed to send phase completion email:", result);
      return c.json({ 
        error: "Failed to send email",
        details: result 
      }, 500);
    }

    console.log(`✓ Phase completion email sent successfully to ${recipients.length} recipient(s)`);
    
    return c.json({ 
      success: true,
      messageId: result.id,
      message: "Email sent successfully"
    });

  } catch (error: any) {
    console.error("❌ Error sending phase completion email:", error);
    return c.json({ 
      error: "Failed to send email",
      details: error.message 
    }, 500);
  }
});

// ============= DIAGNOSTIC ROUTE =============
app.get("/make-server-bcab437c/diagnostic/schema-check", async (c) => {
  try {
    console.log("🔍 Checking project_transactions schema...");
    
    // Query the schema information using raw SQL
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.columns' as any)
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'project_transactions');
    
    // Also check if table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('project_transactions')
      .select('*')
      .limit(0);
    
    const tableExists = !tableError;
    
    return c.json({
      tableExists,
      columns: schemaData || [],
      schemaError: schemaError?.message,
      tableError: tableError?.message,
      hint: tableExists 
        ? "Table exists! Schema query may have failed due to permissions." 
        : "Table does not exist. Run the migration: /supabase/migrations/create_project_transactions.sql"
    });
    
  } catch (error: any) {
    console.error("Schema check error:", error);
    return c.json({ 
      error: error.message,
      hint: "Try running the migration first: /supabase/migrations/create_project_transactions.sql"
    }, 500);
  }
});

// ============= TEAM MEMBERS BYPASS ROUTES (bypasses PostgREST cache) =============

// Create team member via server (bypasses PostgREST cache issues)
app.post("/make-server-bcab437c/team-members", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewTeam")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const input = await c.req.json();
    
    console.log("📝 Creating team member via service role (bypassing PostgREST cache)...");
    
    // Use service role client to bypass PostgREST cache
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        name: input.name,
        role: input.role,
        email: input.email,
        phone: input.phone || null,
        aura_rating: input.aura_rating || 0,
        tasks_completed: input.tasks_completed || 0,
        tasks_on_time: input.tasks_on_time || 0,
        efficiency: input.efficiency || 0,
        specialties: input.specialties || [],
        active: input.active !== undefined ? input.active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error("❌ Error creating team member:", error);
      return c.json({ 
        error: `Failed to create team member: ${error.message}`,
        details: error 
      }, 400);
    }
    
    console.log("✅ Team member created successfully:", data);
    return c.json(data);
    
  } catch (error: any) {
    console.error("❌ Server error creating team member:", error);
    return c.json({ 
      error: "Failed to create team member",
      details: error.message 
    }, 500);
  }
});

// List team members via server
app.get("/make-server-bcab437c/team-members", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewTeam")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('name', { ascending: true })
      .limit(300);
    
    if (error) {
      console.error("❌ Error listing team members:", error);
      return c.json({ 
        error: `Failed to list team members: ${error.message}`,
        details: error 
      }, 400);
    }
    
    return c.json(data || []);
    
  } catch (error: any) {
    console.error("❌ Server error listing team members:", error);
    return c.json({ 
      error: "Failed to list team members",
      details: error.message 
    }, 500);
  }
});

// Update team member via server
app.put("/make-server-bcab437c/team-members/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewTeam")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    console.log(`📝 Updating team member ${id} via service role...`);
    
    const { data, error } = await supabase
      .from('team_members')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error("❌ Error updating team member:", error);
      return c.json({ 
        error: `Failed to update team member: ${error.message}`,
        details: error 
      }, 400);
    }
    
    console.log("✅ Team member updated successfully");
    return c.json(data);
    
  } catch (error: any) {
    console.error("❌ Server error updating team member:", error);
    return c.json({ 
      error: "Failed to update team member",
      details: error.message 
    }, 500);
  }
});

// Delete team member via server
app.delete("/make-server-bcab437c/team-members/:id", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  
  if (!hasPermission(userRole, "canViewTeam")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const id = c.req.param("id");
    
    console.log(`🗑️ Deleting team member ${id} via service role...`);
    
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("❌ Error deleting team member:", error);
      return c.json({ 
        error: `Failed to delete team member: ${error.message}`,
        details: error 
      }, 400);
    }
    
    console.log("✅ Team member deleted successfully");
    return c.json({ success: true });
    
  } catch (error: any) {
    console.error("❌ Server error deleting team member:", error);
    return c.json({ 
      error: "Failed to delete team member",
      details: error.message 
    }, 500);
  }
});

// ============================================================
// PHASE TEMPLATES & MASTER PHASES API
// ============================================================

// Get all phase templates
app.get("/make-server-bcab437c/phase-templates", async (c) => {
  try {
    console.log("📋 Fetching all phase templates");
    const templates = await kv.getByPrefix("phase_template:");
    console.log(`✅ Found ${templates.length} phase templates`);
    return c.json({ templates });
  } catch (error: any) {
    console.error("❌ Error fetching phase templates:", error);
    return c.json({ error: error.message || "Failed to fetch templates" }, 500);
  }
});

// Get a specific phase template
app.get("/make-server-bcab437c/phase-templates/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`📋 Fetching phase template: ${id}`);
    const template = await kv.get(`phase_template:${id}`);
    
    if (!template) {
      return c.json({ error: "Template not found" }, 404);
    }
    
    console.log(`✅ Found template: ${template.name}`);
    return c.json({ template });
  } catch (error: any) {
    console.error("❌ Error fetching phase template:", error);
    return c.json({ error: error.message || "Failed to fetch template" }, 500);
  }
});

// Create a new phase template
app.post("/make-server-bcab437c/phase-templates", async (c) => {
  try {
    const body = await c.req.json();
    const { name, phases } = body;
    
    if (!name || !phases || !Array.isArray(phases)) {
      return c.json({ error: "Name and phases array are required" }, 400);
    }
    
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const template = {
      id,
      name,
      phases,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`phase_template:${id}`, template);
    console.log(`✅ Created phase template: ${name}`);
    return c.json({ template });
  } catch (error: any) {
    console.error("❌ Error creating phase template:", error);
    return c.json({ error: error.message || "Failed to create template" }, 500);
  }
});

// Update a phase template
app.put("/make-server-bcab437c/phase-templates/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, phases } = body;
    
    const existing = await kv.get(`phase_template:${id}`);
    if (!existing) {
      return c.json({ error: "Template not found" }, 404);
    }
    
    const updated = {
      ...existing,
      name: name || existing.name,
      phases: phases || existing.phases,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`phase_template:${id}`, updated);
    console.log(`✅ Updated phase template: ${id}`);
    return c.json({ template: updated });
  } catch (error: any) {
    console.error("❌ Error updating phase template:", error);
    return c.json({ error: error.message || "Failed to update template" }, 500);
  }
});

// Delete a phase template
app.delete("/make-server-bcab437c/phase-templates/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`phase_template:${id}`);
    console.log(`✅ Deleted phase template: ${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error deleting phase template:", error);
    return c.json({ error: error.message || "Failed to delete template" }, 500);
  }
});

// Get all master phases (unique phase names across all templates)
app.get("/make-server-bcab437c/master-phases", async (c) => {
  try {
    console.log("📋 Fetching master phases library");
    const masterPhases = await kv.getByPrefix("master_phase:");
    console.log(`✅ Found ${masterPhases.length} master phases`);
    return c.json({ phases: masterPhases });
  } catch (error: any) {
    console.error("❌ Error fetching master phases:", error);
    return c.json({ error: error.message || "Failed to fetch master phases" }, 500);
  }
});

// Add a new master phase
app.post("/make-server-bcab437c/master-phases", async (c) => {
  try {
    const body = await c.req.json();
    const { name, days } = body;
    
    if (!name) {
      return c.json({ error: "Phase name is required" }, 400);
    }
    
    // Check if phase already exists
    const existingPhases = await kv.getByPrefix("master_phase:");
    const duplicate = existingPhases.find((p: any) => p.name.toLowerCase() === name.toLowerCase());
    
    if (duplicate) {
      console.log(`⚠️ Master phase already exists: ${name}`);
      return c.json({ phase: duplicate, existed: true });
    }
    
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const phase = {
      id,
      name,
      days: days || 1,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`master_phase:${id}`, phase);
    console.log(`✅ Created master phase: ${name}`);
    return c.json({ phase, existed: false });
  } catch (error: any) {
    console.error("❌ Error creating master phase:", error);
    return c.json({ error: error.message || "Failed to create master phase" }, 500);
  }
});

// ============================================================
// INITIALIZE DEFAULT TEMPLATES & PHASES
// ============================================================

// Initialize default templates on server start
async function initializeDefaultPhaseTemplates() {
  try {
    const existingTemplates = await kv.getByPrefix("phase_template:");
    
    if (existingTemplates.length === 0) {
      console.log("🔧 Initializing default phase templates...");
      
      // Default Cstle Livn template
      const defaultTemplate = {
        id: "default-cstle-livn",
        name: "Default (Cstle Livn)",
        phases: [
          { name: "Planning", days: 3 },
          { name: "Prepping", days: 5 },
          { name: "Production", days: 10 },
          { name: "Finishing", days: 5 },
          { name: "Final Inspection", days: 2 },
          { name: "Delivered/Completed", days: 1 },
        ],
        createdAt: new Date().toISOString(),
      };
      await kv.set("phase_template:default-cstle-livn", defaultTemplate);
      
      // FCC Projects template
      const fccTemplate = {
        id: "fcc-projects",
        name: "FCC Projects",
        phases: [
          { name: "Planning", days: 3 },
          { name: "Wall Priming", days: 2 },
          { name: "Doors & Trim", days: 5 },
          { name: "Spraying", days: 3 },
          { name: "Wall Painting 1st coat", days: 2 },
          { name: "Flooring", days: 4 },
          { name: "Baseboard & Railing Install", days: 3 },
          { name: "Wall Painting 2nd coat", days: 2 },
          { name: "Finishing & Installs", days: 3 },
          { name: "Final Inspection", days: 1 },
          { name: "Delivered/Completed", days: 1 },
        ],
        createdAt: new Date().toISOString(),
      };
      await kv.set("phase_template:fcc-projects", fccTemplate);
      
      console.log("✅ Default templates initialized");
    }
    
    // Initialize master phases library from all templates
    const allTemplates = await kv.getByPrefix("phase_template:");
    const existingMasterPhases = await kv.getByPrefix("master_phase:");
    
    if (existingMasterPhases.length === 0 && allTemplates.length > 0) {
      console.log("🔧 Initializing master phases library...");
      
      const uniquePhases = new Map<string, { name: string; days: number }>();
      
      for (const template of allTemplates) {
        for (const phase of template.phases) {
          const key = phase.name.toLowerCase();
          if (!uniquePhases.has(key)) {
            uniquePhases.set(key, { name: phase.name, days: phase.days });
          }
        }
      }
      
      for (const [, phase] of uniquePhases) {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await kv.set(`master_phase:${id}`, {
          id,
          name: phase.name,
          days: phase.days,
          createdAt: new Date().toISOString(),
        });
      }
      
      console.log(`✅ Initialized ${uniquePhases.size} master phases`);
    }
  } catch (error) {
    console.error("❌ Error initializing default templates:", error);
  }
}

// Call initialization on server start
initializeDefaultPhaseTemplates();

// Admin endpoint to force refresh/update default templates
app.post("/make-server-bcab437c/admin/refresh-default-templates", async (c) => {
  try {
    console.log("🔄 Force refreshing default templates...");
    
    // Default Cstle Livn template
    const defaultTemplate = {
      id: "default-cstle-livn",
      name: "Default (Cstle Livn)",
      phases: [
        { name: "Planning", days: 3 },
        { name: "Prepping", days: 5 },
        { name: "Production", days: 10 },
        { name: "Finishing", days: 5 },
        { name: "Final Inspection", days: 2 },
        { name: "Delivered/Completed", days: 1 },
      ],
      createdAt: new Date().toISOString(),
    };
    await kv.set("phase_template:default-cstle-livn", defaultTemplate);
    
    // FCC Projects template
    const fccTemplate = {
      id: "fcc-projects",
      name: "FCC Projects",
      phases: [
        { name: "Planning", days: 3 },
        { name: "Wall Priming", days: 2 },
        { name: "Doors & Trim", days: 5 },
        { name: "Spraying", days: 3 },
        { name: "Wall Painting 1st coat", days: 2 },
        { name: "Flooring", days: 4 },
        { name: "Baseboard & Railing Install", days: 3 },
        { name: "Wall Painting 2nd coat", days: 2 },
        { name: "Finishing & Installs", days: 3 },
        { name: "Final Inspection", days: 1 },
        { name: "Delivered/Completed", days: 1 },
      ],
      createdAt: new Date().toISOString(),
    };
    await kv.set("phase_template:fcc-projects", fccTemplate);
    
    console.log("✅ Default templates refreshed successfully");
    
    return c.json({ 
      success: true, 
      message: "Default templates refreshed",
      templates: [defaultTemplate, fccTemplate]
    });
  } catch (error: any) {
    console.error("❌ Error refreshing templates:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================
// PROJECT PHASE COMPLETION API
// ============================================================

// Update phase completion status
app.put("/make-server-bcab437c/projects/:projectId/phases/:phaseIndex/completion", async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const phaseIndex = parseInt(c.req.param("phaseIndex"));
    const body = await c.req.json();
    const { isCompleted } = body;

    console.log(`📊 Updating phase completion: Project ${projectId}, Phase ${phaseIndex}, Completed: ${isCompleted}`);

    // Fetch project from database
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      console.error("❌ Error fetching project:", fetchError);
      return c.json({ error: "Project not found" }, 404);
    }

    // Update phase completion
    const phases = project.phases || [];
    if (phaseIndex < 0 || phaseIndex >= phases.length) {
      return c.json({ error: "Invalid phase index" }, 400);
    }

    phases[phaseIndex] = {
      ...phases[phaseIndex],
      isCompleted: isCompleted,
      completionPercent: isCompleted ? 100 : 0,
      completedAt: isCompleted ? new Date().toISOString() : null,
    };

    // Calculate overall project progress
    const completedPhases = phases.filter((p: any) => p.isCompleted).length;
    const totalPhases = phases.length;
    const projectProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

    // Update project in database
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        phases,
        progress: projectProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating project:", updateError);
      return c.json({ error: "Failed to update project" }, 500);
    }

    console.log(`✅ Phase completion updated. Project progress: ${projectProgress}%`);

    return c.json({
      success: true,
      phase: phases[phaseIndex],
      projectProgress,
      project: updatedProject,
    });
  } catch (error: any) {
    console.error("❌ Error updating phase completion:", error);
    return c.json({ error: error.message || "Failed to update phase completion" }, 500);
  }
});

// Get project progress
app.get("/make-server-bcab437c/projects/:projectId/progress", async (c) => {
  try {
    const projectId = c.req.param("projectId");

    const { data: project, error } = await supabase
      .from('projects')
      .select('phases, progress')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const phases = project.phases || [];
    const completedPhases = phases.filter((p: any) => p.isCompleted).length;
    const totalPhases = phases.length;
    const projectProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

    return c.json({
      phases,
      completedPhases,
      totalPhases,
      projectProgress: project.progress || projectProgress,
    });
  } catch (error: any) {
    console.error("❌ Error fetching project progress:", error);
    return c.json({ error: error.message || "Failed to fetch progress" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Migration runner — POST /make-server-bcab437c/run-migrations
// All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
// ---------------------------------------------------------------------------
app.post("/make-server-bcab437c/run-migrations", async (c) => {
  try {
    const postgres = (await import("npm:postgres")).default;
    // Supabase edge functions expose SUPABASE_DB_URL for direct postgres access
    const dbUrl = Deno.env.get("SUPABASE_DB_URL") ?? Deno.env.get("DATABASE_URL");
    if (!dbUrl) throw new Error("No database URL available (SUPABASE_DB_URL / DATABASE_URL not set)");
    const sql = postgres(dbUrl, { ssl: "require", max: 1, idle_timeout: 20 });

    const migration = `
CREATE TABLE IF NOT EXISTS public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  description text, project_type text, version text DEFAULT '1.0',
  active boolean DEFAULT true, default_duration_days integer DEFAULT 30,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.phase_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_template_id uuid REFERENCES public.project_templates(id) ON DELETE CASCADE,
  name text NOT NULL, description text, position integer NOT NULL DEFAULT 0,
  default_duration_days integer DEFAULT 7, required boolean DEFAULT true,
  completion_rules jsonb DEFAULT '{}', qc_checklist jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id uuid REFERENCES public.phase_templates(id) ON DELETE CASCADE,
  project_template_id uuid REFERENCES public.project_templates(id) ON DELETE CASCADE,
  name text NOT NULL, description text, task_type text DEFAULT 'Administrative',
  position integer NOT NULL DEFAULT 0, default_duration_days integer DEFAULT 1,
  priority text DEFAULT 'Medium', required boolean DEFAULT true,
  suggested_role text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.procurement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id uuid REFERENCES public.phase_templates(id) ON DELETE CASCADE,
  item_name text NOT NULL, quantity numeric DEFAULT 1, unit text DEFAULT 'unit',
  lead_time_days integer DEFAULT 7, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  phase_template_id uuid REFERENCES public.phase_templates(id) ON DELETE SET NULL,
  name text NOT NULL, description text, position integer NOT NULL DEFAULT 0,
  status text DEFAULT 'Not Started', start_date date, end_date date,
  progress integer DEFAULT 0, qc_status text DEFAULT 'Not Started',
  phase_lead_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON public.project_phases(project_id);
CREATE TABLE IF NOT EXISTS public.procurement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE SET NULL,
  task_id uuid, item_name text NOT NULL, description text,
  quantity numeric DEFAULT 1, unit text DEFAULT 'unit', status text DEFAULT 'Not Reviewed',
  required_on_site_date date, recommended_order_date date,
  lead_time_days integer DEFAULT 7, buffer_days integer DEFAULT 2,
  supplier text, delivery_location text, delivery_confirmed boolean DEFAULT false,
  notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_procurement_items_project_id ON public.procurement_items(project_id);
CREATE TABLE IF NOT EXISTS public.phase_qc_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE CASCADE,
  status text DEFAULT 'Not Started', submitted_by uuid, submitted_at timestamptz,
  reviewed_by uuid, reviewed_at timestamptz, result text,
  checklist_answers jsonb DEFAULT '{}', notes text, evidence_urls jsonb DEFAULT '[]',
  rejection_reason text, conditions text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.inspection_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE SET NULL,
  task_id uuid, inspection_type text NOT NULL, authority text,
  requested_date date, scheduled_date date, completed_date date,
  result text DEFAULT 'Not Requested', deficiency_notes text,
  reinspection_required boolean DEFAULT false, not_applicable boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.project_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
  user_id uuid, action text NOT NULL, object_type text, object_id uuid,
  prev_value jsonb, new_value jsonb, reason text, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'Administrative';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES public.project_phases(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS blocked_by text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_required boolean DEFAULT true;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS dependency_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;
`;

    await sql.unsafe(migration);
    await sql.end();
    return c.json({ ok: true, message: "Migrations applied successfully" });
  } catch (err: any) {
    console.error("Migration error:", err);
    return c.json({ ok: false, error: String(err?.message ?? err) }, 500);
  }
});

Deno.serve(app.fetch);