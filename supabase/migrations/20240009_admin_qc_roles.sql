-- =============================================================================
-- Migration: Add "Admin" and "Quality Control" roles at the RLS level.
--
-- Admin is kept operationally equivalent to Manager (added to
-- is_manager_or_admin()) but is a distinct role, not merged with Super Admin
-- or Manager -- it's simply a separate name in the same allow-list.
--
-- Quality Control is narrower: it should NOT get the broad project/phase/
-- template edit rights that is_manager_or_admin() grants, but it does need
-- to write task status (to approve/reject tasks pending QC) even on tasks
-- it doesn't own and isn't assigned. A new can_approve_task_qc() function
-- covers exactly that, ORed into the existing tasks_update policy.
-- Safe to re-run: CREATE OR REPLACE / DROP POLICY IF EXISTS throughout.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_manager_or_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Manager', 'Admin');
$$;

CREATE OR REPLACE FUNCTION public.can_approve_task_qc() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.jwt_role() IN ('Super Admin', 'Manager', 'Admin', 'Quality Control');
$$;

DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks FOR UPDATE
  USING (public.is_manager_or_admin() OR public.owns_task(assignee_id) OR public.can_approve_task_qc())
  WITH CHECK (public.is_manager_or_admin() OR public.owns_task(assignee_id) OR public.can_approve_task_qc());
