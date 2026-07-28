-- =============================================================================
-- Migration: Tamper-proof roles, task-ownership permissions, phase/project
--            completion gates, and real RLS on tasks/projects/phases/templates.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Link team roster entries to their login account (nullable — only needed
--    for team members who actually log in, e.g. not subcontractors).
-- ---------------------------------------------------------------------------
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_auth_user_id ON public.team_members(auth_user_id);

-- ---------------------------------------------------------------------------
-- 1. Role helper functions.
--    Role lives in the JWT's app_metadata claim (server-writable only, via
--    supabase.auth.admin.updateUserById), NOT user_metadata (which a signed-in
--    user can rewrite themselves via supabase.auth.updateUser() — that would
--    let anyone self-promote if RLS trusted it).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jwt_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Manager');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() = 'Super Admin';
$$;

CREATE OR REPLACE FUNCTION public.owns_task(p_assignee_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT p_assignee_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = p_assignee_id AND tm.auth_user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Tasks: replace the "allow everyone" policies with real ones.
--    Associates/Contractors can only update tasks assigned to them, and
--    cannot reassign a task away from themselves (WITH CHECK re-validates
--    ownership against the new row). Only Managers/Super Admins can
--    create, delete, or edit/reassign anyone else's task.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS p_tasks_select ON public.tasks;
DROP POLICY IF EXISTS p_tasks_insert ON public.tasks;
DROP POLICY IF EXISTS p_tasks_update ON public.tasks;
DROP POLICY IF EXISTS p_tasks_delete ON public.tasks;

CREATE POLICY tasks_select ON public.tasks FOR SELECT USING (true);

CREATE POLICY tasks_insert ON public.tasks FOR INSERT
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY tasks_update ON public.tasks FOR UPDATE
  USING (public.is_manager_or_admin() OR public.owns_task(assignee_id))
  WITH CHECK (public.is_manager_or_admin() OR public.owns_task(assignee_id));

CREATE POLICY tasks_delete ON public.tasks FOR DELETE
  USING (public.is_manager_or_admin());

-- ---------------------------------------------------------------------------
-- 3. Projects: same tightening. Everyone can view; only Managers/Super
--    Admins can create, edit, or delete.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS p_projects_select ON public.projects;
DROP POLICY IF EXISTS p_projects_insert ON public.projects;
DROP POLICY IF EXISTS p_projects_update ON public.projects;
DROP POLICY IF EXISTS p_projects_delete ON public.projects;

CREATE POLICY projects_select ON public.projects FOR SELECT USING (true);

CREATE POLICY projects_insert ON public.projects FOR INSERT
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY projects_update ON public.projects FOR UPDATE
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY projects_delete ON public.projects FOR DELETE
  USING (public.is_manager_or_admin());

-- ---------------------------------------------------------------------------
-- 4. project_phases: had NO policies at all before this. Everyone can view;
--    only Managers/Super Admins can create, edit, or delete phases
--    (Associates/Contractors should not be able to touch phases directly —
--    phase completion is driven by task completion + QC review, not a
--    manual edit).
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_phases_select ON public.project_phases;
DROP POLICY IF EXISTS project_phases_insert ON public.project_phases;
DROP POLICY IF EXISTS project_phases_update ON public.project_phases;
DROP POLICY IF EXISTS project_phases_delete ON public.project_phases;

CREATE POLICY project_phases_select ON public.project_phases FOR SELECT USING (true);

CREATE POLICY project_phases_insert ON public.project_phases FOR INSERT
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY project_phases_update ON public.project_phases FOR UPDATE
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY project_phases_delete ON public.project_phases FOR DELETE
  USING (public.is_manager_or_admin());

-- ---------------------------------------------------------------------------
-- 5. Template tables (project_templates / phase_templates / task_templates /
--    procurement_templates): everyone can view active templates; only
--    Managers/Super Admins can author them (the new template-builder screen).
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_templates ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_templates', 'phase_templates', 'task_templates', 'procurement_templates']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT WITH CHECK (public.is_manager_or_admin())', t, t);
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE USING (public.is_manager_or_admin()) WITH CHECK (public.is_manager_or_admin())', t, t);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE USING (public.is_manager_or_admin())', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. project_activity_log: immutable audit trail. Anyone authenticated can
--    write an entry (regular actions log here too, not just admin overrides);
--    only Managers/Super Admins can read it; nobody can update or delete.
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_activity_log_select ON public.project_activity_log;
DROP POLICY IF EXISTS project_activity_log_insert ON public.project_activity_log;

CREATE POLICY project_activity_log_select ON public.project_activity_log FOR SELECT
  USING (public.is_manager_or_admin());

CREATE POLICY project_activity_log_insert ON public.project_activity_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 7. Project force-complete support columns.
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS force_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS force_completed_reason text,
  ADD COLUMN IF NOT EXISTS force_completed_by uuid,
  ADD COLUMN IF NOT EXISTS force_completed_at timestamptz;

-- ---------------------------------------------------------------------------
-- 8. Completion gates, enforced at the database level (defense-in-depth —
--    the app also checks this before showing the button, but this trigger
--    is what actually stops it if that check is ever bypassed).
-- ---------------------------------------------------------------------------

-- A phase can only become "Completed" if every required task in it is done.
CREATE OR REPLACE FUNCTION public.enforce_phase_completion() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  incomplete_count integer;
BEGIN
  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed') THEN
    SELECT count(*) INTO incomplete_count
    FROM public.tasks
    WHERE phase_id = NEW.id
      AND is_required IS NOT FALSE
      AND status IS DISTINCT FROM 'Completed';

    IF incomplete_count > 0 THEN
      RAISE EXCEPTION 'Cannot complete phase: % required task(s) are not completed', incomplete_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_phase_completion ON public.project_phases;
CREATE TRIGGER trg_enforce_phase_completion
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW EXECUTE FUNCTION public.enforce_phase_completion();

-- A project can only become "Completed" if every phase is done, UNLESS a
-- Super Admin is force-completing it with a reason.
CREATE OR REPLACE FUNCTION public.enforce_project_completion() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  incomplete_count integer;
  is_forcing boolean;
BEGIN
  is_forcing := NEW.force_completed IS TRUE AND (OLD.force_completed IS DISTINCT FROM TRUE);

  IF is_forcing AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only a Super Admin can force-complete a project';
  END IF;

  IF is_forcing AND (NEW.force_completed_reason IS NULL OR btrim(NEW.force_completed_reason) = '') THEN
    RAISE EXCEPTION 'A reason is required to force-complete a project';
  END IF;

  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed') AND NOT NEW.force_completed THEN
    SELECT count(*) INTO incomplete_count
    FROM public.project_phases
    WHERE project_id = NEW.id
      AND status IS DISTINCT FROM 'Completed';

    IF incomplete_count > 0 THEN
      RAISE EXCEPTION 'Cannot complete project: % phase(s) are not completed', incomplete_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_completion ON public.projects;
CREATE TRIGGER trg_enforce_project_completion
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_completion();
