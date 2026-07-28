import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function authMiddleware(c: any, next: any) {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  if (!accessToken) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return c.json({ error: "Authentication failed" }, 401);
    const userRecord = await kv.get(`user:${user.id}`);
    const role = userRecord?.role ?? user.user_metadata?.role ?? "Associate";
    c.set("userId", user.id);
    c.set("userRole", role);
    await next();
  } catch {
    return c.json({ error: "Authentication error" }, 401);
  }
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-bcab437c/health", (c) => {
  return c.json({ status: "ok" });
});

// Delete user endpoint
app.delete("/make-server-bcab437c/users/:id", async (c) => {
  try {
    const userId = c.req.param("id");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify requester is authenticated and is a Super Admin
    const { createClient } = await import("npm:@supabase/supabase-js");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !requester) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const requesterRole = requester.user_metadata?.role;
    if (requesterRole !== "Super Admin") {
      return c.json({ error: "Only Super Admins can delete users" }, 403);
    }

    // Prevent self-deletion
    if (requester.id === userId) {
      return c.json({ error: "You cannot delete your own account" }, 400);
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.log(`Error deleting user ${userId}: ${deleteError.message}`);
      return c.json({ error: `Failed to delete user: ${deleteError.message}` }, 500);
    }

    return c.json({ success: true });
  } catch (err: any) {
    console.log(`Unexpected error deleting user: ${err}`);
    return c.json({ error: `Server error: ${err.message}` }, 500);
  }
});

// Get all users (Super Admin / Manager only)
app.get("/make-server-bcab437c/users", authMiddleware, async (c) => {
  const userRole = c.get("userRole");
  if (userRole !== "Super Admin" && userRole !== "Manager") {
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

  if (currentUserId !== targetUserId && userRole !== "Super Admin" && userRole !== "Manager") {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const updates = await c.req.json();
  const existingUser = await kv.get(`user:${targetUserId}`);
  if (!existingUser) return c.json({ error: "User not found" }, 404);

  const updatedUser = { ...existingUser, ...updates };
  await kv.set(`user:${targetUserId}`, updatedUser);

  // Sync role/name to Supabase Auth user_metadata
  if (updates.role || updates.name) {
    try {
      await supabase.auth.admin.updateUserById(targetUserId, {
        user_metadata: { name: updatedUser.name, role: updatedUser.role },
      });
    } catch { /* non-fatal */ }
  }

  // If role changed, flag force-logout
  if (updates.role && existingUser.role !== updates.role) {
    await kv.set(`user_force_logout:${targetUserId}`, {
      timestamp: Date.now(),
      oldRole: existingUser.role,
      newRole: updates.role,
    });
  }

  return c.json({ user: updatedUser });
});

// ---------------------------------------------------------------------------
// Migration runner — applies pending DDL migrations using service-role postgres
// POST /make-server-bcab437c/run-migrations  (no auth required — SQL is idempotent)
// ---------------------------------------------------------------------------
app.post("/make-server-bcab437c/run-migrations", async (c) => {
  try {
    const postgres = (await import("npm:postgres")).default;
    const dbUrl = Deno.env.get("SUPABASE_DB_URL") ?? Deno.env.get("DATABASE_URL");
    if (!dbUrl) throw new Error("No database URL available");
    const sql = postgres(dbUrl, { ssl: "require", max: 1, idle_timeout: 20 });

    const migration = `
-- project_templates
CREATE TABLE IF NOT EXISTS public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  description text, project_type text, version text DEFAULT '1.0',
  active boolean DEFAULT true, default_duration_days integer DEFAULT 30,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
-- phase_templates
CREATE TABLE IF NOT EXISTS public.phase_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_template_id uuid REFERENCES public.project_templates(id) ON DELETE CASCADE,
  name text NOT NULL, description text, position integer NOT NULL DEFAULT 0,
  default_duration_days integer DEFAULT 7, required boolean DEFAULT true,
  completion_rules jsonb DEFAULT '{}', qc_checklist jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
-- task_templates
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id uuid REFERENCES public.phase_templates(id) ON DELETE CASCADE,
  project_template_id uuid REFERENCES public.project_templates(id) ON DELETE CASCADE,
  name text NOT NULL, description text, task_type text DEFAULT 'Administrative',
  position integer NOT NULL DEFAULT 0, default_duration_days integer DEFAULT 1,
  priority text DEFAULT 'Medium', required boolean DEFAULT true,
  suggested_role text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
-- procurement_templates
CREATE TABLE IF NOT EXISTS public.procurement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_template_id uuid REFERENCES public.phase_templates(id) ON DELETE CASCADE,
  item_name text NOT NULL, quantity numeric DEFAULT 1, unit text DEFAULT 'unit',
  lead_time_days integer DEFAULT 7, created_at timestamptz DEFAULT now()
);
-- project_phases
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
-- procurement_items
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
-- phase_qc_records
CREATE TABLE IF NOT EXISTS public.phase_qc_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE CASCADE,
  status text DEFAULT 'Not Started', submitted_by uuid, submitted_at timestamptz,
  reviewed_by uuid, reviewed_at timestamptz, result text,
  checklist_answers jsonb DEFAULT '{}', notes text, evidence_urls jsonb DEFAULT '[]',
  rejection_reason text, conditions text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
-- inspection_records
CREATE TABLE IF NOT EXISTS public.inspection_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
  phase_id uuid REFERENCES public.project_phases(id) ON DELETE SET NULL,
  task_id uuid, inspection_type text NOT NULL, authority text, permit_number text,
  requested_date date, scheduled_date date, completed_date date,
  result text DEFAULT 'Not Requested', deficiency_notes text,
  reinspection_required boolean DEFAULT false, not_applicable boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
-- project_activity_log
CREATE TABLE IF NOT EXISTS public.project_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
  user_id uuid, action text NOT NULL, object_type text, object_id uuid,
  prev_value jsonb, new_value jsonb, reason text, created_at timestamptz DEFAULT now()
);
-- Extend tasks
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