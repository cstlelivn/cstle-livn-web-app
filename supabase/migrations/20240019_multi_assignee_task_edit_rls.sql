-- =============================================================================
-- Migration: Let ANY active co-assignee edit a task, not just the "primary"
-- one (step 5b -- a correctness gap found while building the multi-assignee
-- UI on top of 20240012-20240013).
--
-- tasks_update currently allows the change via owns_task(assignee_id), which
-- only ever checks the single, trigger-synced "primary" assignee column.
-- With multi-assignee, a task's 2nd/3rd assignee would pass every app-level
-- check but get silently rejected by RLS the moment they tried to change
-- the task's status or any other field -- this closes that gap by checking
-- task_assignees membership instead of the single column.
--
-- Safe to re-run: CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.owns_task_multi(p_task_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignees ta
    JOIN public.team_members tm ON tm.id = ta.team_member_id
    WHERE ta.task_id = p_task_id AND ta.is_active AND tm.auth_user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks FOR UPDATE
  USING (public.is_manager_or_admin() OR public.owns_task_multi(id) OR public.can_approve_task_qc())
  WITH CHECK (public.is_manager_or_admin() OR public.owns_task_multi(id) OR public.can_approve_task_qc());
