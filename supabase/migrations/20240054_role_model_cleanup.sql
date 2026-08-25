-- Splits "System Role" (login permissions) from "Team Role" (jobsite
-- title/trade, team_members.role -- already free text, untouched here).
-- Shrinks the login-role enum from 8 to 6: Super Admin, Admin, Manager,
-- Accountant, Associate, Contractor. "Quality Control" and "Supervisor"
-- stop being login roles:
--   - Quality Control folds into Manager/Admin/Super Admin -- its entire
--     rolePermissions set (AuthContext.tsx) is already a strict subset of
--     Manager's, so nothing is lost.
--   - Supervisor becomes purely a Team Role + the existing
--     projects.supervisor_id assignment. A project supervisor is now
--     required (at the app level) to already hold System Role Manager or
--     higher, so is_project_supervisor() no longer needs to be paired
--     with a role-string check anywhere it's used for QC/media approval.

-- 1) Safety check: abort loudly if any real account currently holds one of
--    the roles being removed, rather than silently reassigning.
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM auth.users
  WHERE raw_app_meta_data->>'role' IN ('Quality Control', 'Supervisor');

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Found % account(s) still holding role Quality Control or Supervisor -- reassign them to Manager/Admin/Super Admin (for QC) or Manager+ (for Supervisor) before running this migration.', v_count;
  END IF;
END $$;

-- 2) can_approve_task_qc(): drop Quality Control (Manager/Admin/Super Admin
--    already cover everything it granted).
CREATE OR REPLACE FUNCTION public.can_approve_task_qc() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Manager', 'Admin');
$$;

-- 3) is_broad_project_viewer(): drop Quality Control.
CREATE OR REPLACE FUNCTION public.is_broad_project_viewer() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager', 'Accountant');
$$;

-- 4) can_approve_task_qc_for(): drop the jwt_role() = 'Supervisor' check.
--    Previously required BOTH the role string AND the project assignment;
--    since nobody can hold that role string anymore, leaving this
--    untouched would silently revoke QC-approval-on-own-project from
--    every real supervisor. A supervisor is now already a Manager (who
--    already passes can_approve_task_qc() company-wide), so the
--    project-scoped branch here is defense-in-depth, not the only path.
CREATE OR REPLACE FUNCTION public.can_approve_task_qc_for(p_task_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.can_approve_task_qc() OR EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.id = p_task_id AND public.is_project_supervisor(t.project_id)
  );
$$;

-- 5) can_upload_task_media() / can_approve_task_media(): drop Quality
--    Control from their role lists; the is_project_supervisor(...)
--    OR-branch is untouched.
CREATE OR REPLACE FUNCTION public.can_upload_task_media(
  p_project_id uuid,
  p_task_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.jwt_role() IN ('Super Admin', 'Admin', 'Manager')
    OR public.is_project_supervisor(p_project_id)
    OR (
      p_task_id IS NOT NULL AND (
        public.owns_task_multi(p_task_id)
        OR EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.id = p_task_id AND public.owns_task(t.assignee_id)
        )
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_approve_task_media(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager')
    OR public.is_project_supervisor(p_project_id);
$$;

-- Deliberately NOT touched: is_project_supervisor() itself, and every RLS
-- policy that ORs it in for project/task/phase/media access (20240026,
-- 20240027) -- already correctly scoped by projects.supervisor_id, no
-- role-string checks, keep working exactly as before.
