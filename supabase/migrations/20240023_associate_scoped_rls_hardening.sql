-- =============================================================================
-- Phase 1 security audit: the database was NOT actually enforcing "Associates
-- only see their own work" -- it was only ever enforced by the UI filtering
-- what it queried for. Direct requests (a crafted API call, browser devtools,
-- or just a different client) could read every project, every task, every
-- financial record, every inventory item, and the full team roster regardless
-- of role, because the original schema (src/app/src/db/policies.sql) was
-- explicitly "Simple permissive policies for development... TODO: Refine
-- later" -- USING (true) / WITH CHECK (true) on almost everything -- and the
-- later migrations (20240004 onward) only ever tightened tasks/projects/
-- phases WRITES, never SELECT, and never touched finance/inventory/CRM/
-- vendors/users at all.
--
-- This migration is that "later." It does not change any UI -- it makes the
-- database itself refuse what the UI was already never asking for, so a
-- direct/bypassing request gets refused the same way clicking a hidden menu
-- item would be.
--
-- Safe to re-run: CREATE OR REPLACE / DROP POLICY IF EXISTS throughout.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Role helpers, one per permission group, mirroring the JS permission
--    matrix in AuthContext.tsx exactly (single source of truth kept in sync
--    by hand -- there is no way to share one literal list between JS and SQL
--    here, so if that matrix changes, this must change with it).
-- ---------------------------------------------------------------------------

-- Same role set as canViewAllProjects in AuthContext.tsx.
CREATE OR REPLACE FUNCTION public.is_broad_project_viewer() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager', 'Quality Control', 'Accountant');
$$;

-- canViewFinance / canEditFinance.
CREATE OR REPLACE FUNCTION public.can_view_finance() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Manager', 'Accountant');
$$;

-- canViewCRM.
CREATE OR REPLACE FUNCTION public.can_view_crm() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager', 'Accountant');
$$;

-- canEditCRM (Accountant has view-only per the JS matrix).
CREATE OR REPLACE FUNCTION public.can_edit_crm() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager');
$$;

-- canViewInventory.
CREATE OR REPLACE FUNCTION public.can_view_inventory() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager', 'Contractor');
$$;

-- canEditInventory (Contractor is view-only per the JS matrix).
CREATE OR REPLACE FUNCTION public.can_edit_inventory() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager');
$$;

-- canViewVendors / canEditVendors.
CREATE OR REPLACE FUNCTION public.can_manage_vendors() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager');
$$;

-- ---------------------------------------------------------------------------
-- 2. Tasks / Projects / Phases: SELECT was USING (true) for every role.
--    Associates/Contractors now only see rows tied to a task they're
--    actually assigned to (via task_assignees OR the legacy single
--    assignee_id column, so nothing regresses for a task that hasn't gone
--    through the multi-assignee sync). Every other role's visibility is
--    unchanged (they already had canViewAllProjects-equivalent access).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks FOR SELECT
  USING (
    public.is_broad_project_viewer()
    OR public.owns_task_multi(id)
    OR public.owns_task(assignee_id)
  );

DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects FOR SELECT
  USING (
    public.is_broad_project_viewer()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.project_id = projects.id
        AND (public.owns_task_multi(t.id) OR public.owns_task(t.assignee_id))
    )
  );

DROP POLICY IF EXISTS project_phases_select ON public.project_phases;
CREATE POLICY project_phases_select ON public.project_phases FOR SELECT
  USING (
    public.is_broad_project_viewer()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.project_id = project_phases.project_id
        AND (public.owns_task_multi(t.id) OR public.owns_task(t.assignee_id))
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Finance (transactions): was fully open to every authenticated role.
--    Now matches canViewFinance/canEditFinance exactly -- Super Admin,
--    Manager, Accountant. Admin is deliberately excluded (matches the JS
--    matrix's existing "Admin sees everything except finance" split).
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_transactions_select ON public.transactions;
DROP POLICY IF EXISTS p_transactions_insert ON public.transactions;
DROP POLICY IF EXISTS p_transactions_update ON public.transactions;
DROP POLICY IF EXISTS p_transactions_delete ON public.transactions;
DROP POLICY IF EXISTS transactions_select ON public.transactions;
DROP POLICY IF EXISTS transactions_insert ON public.transactions;
DROP POLICY IF EXISTS transactions_update ON public.transactions;
DROP POLICY IF EXISTS transactions_delete ON public.transactions;

CREATE POLICY transactions_select ON public.transactions FOR SELECT USING (public.can_view_finance());
CREATE POLICY transactions_insert ON public.transactions FOR INSERT WITH CHECK (public.can_view_finance());
CREATE POLICY transactions_update ON public.transactions FOR UPDATE USING (public.can_view_finance()) WITH CHECK (public.can_view_finance());
CREATE POLICY transactions_delete ON public.transactions FOR DELETE USING (public.can_view_finance());

-- ---------------------------------------------------------------------------
-- 4. Inventory: was fully open. Now matches canViewInventory/canEditInventory,
--    PLUS the explicit exception from the requirements -- an Associate can
--    still see (read-only) an item that is specifically assigned to them
--    (assigned_to), even though they don't get general inventory browsing.
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_inventory_select ON public.inventory;
DROP POLICY IF EXISTS p_inventory_insert ON public.inventory;
DROP POLICY IF EXISTS p_inventory_update ON public.inventory;
DROP POLICY IF EXISTS p_inventory_delete ON public.inventory;
DROP POLICY IF EXISTS inventory_select ON public.inventory;
DROP POLICY IF EXISTS inventory_insert ON public.inventory;
DROP POLICY IF EXISTS inventory_update ON public.inventory;
DROP POLICY IF EXISTS inventory_delete ON public.inventory;

CREATE POLICY inventory_select ON public.inventory FOR SELECT
  USING (
    public.can_view_inventory()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = inventory.assigned_to AND tm.auth_user_id = auth.uid()
    )
  );
CREATE POLICY inventory_insert ON public.inventory FOR INSERT WITH CHECK (public.can_edit_inventory());
CREATE POLICY inventory_update ON public.inventory FOR UPDATE USING (public.can_edit_inventory()) WITH CHECK (public.can_edit_inventory());
CREATE POLICY inventory_delete ON public.inventory FOR DELETE USING (public.can_edit_inventory());

-- ---------------------------------------------------------------------------
-- 5. Vendors: admin/back-office data, was fully open. Now Super Admin/Admin/
--    Manager only -- matches canViewVendors/canEditVendors (nobody else has
--    either permission in the JS matrix).
-- ---------------------------------------------------------------------------
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_vendors_select ON public.vendors;
DROP POLICY IF EXISTS p_vendors_insert ON public.vendors;
DROP POLICY IF EXISTS p_vendors_update ON public.vendors;
DROP POLICY IF EXISTS p_vendors_delete ON public.vendors;
DROP POLICY IF EXISTS vendors_select ON public.vendors;
DROP POLICY IF EXISTS vendors_insert ON public.vendors;
DROP POLICY IF EXISTS vendors_update ON public.vendors;
DROP POLICY IF EXISTS vendors_delete ON public.vendors;

CREATE POLICY vendors_select ON public.vendors FOR SELECT USING (public.can_manage_vendors());
CREATE POLICY vendors_insert ON public.vendors FOR INSERT WITH CHECK (public.can_manage_vendors());
CREATE POLICY vendors_update ON public.vendors FOR UPDATE USING (public.can_manage_vendors()) WITH CHECK (public.can_manage_vendors());
CREATE POLICY vendors_delete ON public.vendors FOR DELETE USING (public.can_manage_vendors());

-- ---------------------------------------------------------------------------
-- 6. CRM (clients / leads): was fully open. Now matches canViewCRM/
--    canEditCRM -- Accountant can see it (needed for billing context) but
--    can't edit it; Associates/Contractors/QC get neither.
-- ---------------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients', 'leads']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS p_%I_select ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS p_%I_insert ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS p_%I_update ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS p_%I_delete ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT USING (public.can_view_crm())', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT WITH CHECK (public.can_edit_crm())', t, t);
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE USING (public.can_edit_crm()) WITH CHECK (public.can_edit_crm())', t, t);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE USING (public.can_edit_crm())', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 7. team_members: writes were fully open -- any authenticated user
--    (including an Associate) could edit or delete ANY team member's row,
--    including their aura_rating/tasks_completed/efficiency fields. Locked
--    to managers/admins.
--
--    SELECT is intentionally left open for now: assignee avatars, names, and
--    "who's on this task" everywhere in the app (Kanban, task dialogs, the
--    mobile task queue) read team_members directly and need this for every
--    role, including Associates looking at their own co-assignees. Hiding
--    ROWS would break that. Hiding just the performance COLUMNS
--    (aura_rating/tasks_completed/tasks_on_time/efficiency) from
--    non-privileged viewers needs a proper column-level view plus updating
--    every read call-site (20+ files) -- real, correctly-scoped follow-up
--    work, not something to bolt on unsafely here. Flagging it rather than
--    guessing at it.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS p_team_members_insert ON public.team_members;
DROP POLICY IF EXISTS p_team_members_update ON public.team_members;
DROP POLICY IF EXISTS p_team_members_delete ON public.team_members;
DROP POLICY IF EXISTS team_members_insert ON public.team_members;
DROP POLICY IF EXISTS team_members_update ON public.team_members;
DROP POLICY IF EXISTS team_members_delete ON public.team_members;

CREATE POLICY team_members_insert ON public.team_members FOR INSERT WITH CHECK (public.is_manager_or_admin());
CREATE POLICY team_members_update ON public.team_members FOR UPDATE USING (public.is_manager_or_admin()) WITH CHECK (public.is_manager_or_admin());
CREATE POLICY team_members_delete ON public.team_members FOR DELETE USING (public.is_manager_or_admin());

-- ---------------------------------------------------------------------------
-- 8. public.users: legacy profile table, fully open (SELECT/INSERT/UPDATE
--    all USING (true)). The app's actual user/role management already goes
--    through the edge function with the service-role key (which bypasses
--    RLS entirely), so nothing legitimate needs client-side write access to
--    this table at all -- removing the open policies, not replacing them
--    with narrower ones, since there's no real client write path to
--    preserve. SELECT is scoped to your own row or a manager/admin, in case
--    anything still reads it for a profile lookup.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS p_users_select ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS p_users_insert ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS p_users_update ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS users_select ON public.users';
    EXECUTE 'CREATE POLICY users_select ON public.users FOR SELECT USING (public.is_manager_or_admin() OR id::text = auth.uid()::text)';
    -- Intentionally no INSERT/UPDATE/DELETE policy: only the service-role
    -- key (used by the edge function) can write here now, which already
    -- bypasses RLS by design.
  END IF;
END $$;
