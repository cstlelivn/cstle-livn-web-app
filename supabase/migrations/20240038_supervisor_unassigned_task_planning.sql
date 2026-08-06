-- A project-scoped Supervisor may plan tasks before choosing the worker.
-- Creation remains scoped to projects.supervisor_id; Associates cannot create
-- tasks, and existing update/delete/QC policies are unchanged.
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks FOR INSERT
  WITH CHECK (
    public.is_manager_or_admin()
    OR public.is_project_supervisor(project_id)
  );

