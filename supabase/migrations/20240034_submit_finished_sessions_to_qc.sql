-- A finished employee timer is a task submission, not merely a closed timer.
-- Keep this rule at the database boundary so online, offline-replayed, and
-- future clients all create the same QC work item.
CREATE OR REPLACE FUNCTION public.submit_task_to_qc_after_session_finish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status IS DISTINCT FROM 'finished' THEN
    UPDATE public.tasks
    SET status = 'Pending QC'
    WHERE id = NEW.task_id
      AND status IS DISTINCT FROM 'Completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_submit_task_to_qc_after_session_finish ON public.task_work_sessions;
CREATE TRIGGER trg_submit_task_to_qc_after_session_finish
  AFTER UPDATE OF status ON public.task_work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.submit_task_to_qc_after_session_finish();

-- Reconcile a completion that happened before this trigger was installed.
-- submitted_at protects rejected/rework cycles: an older finished session is
-- not treated as a fresh resubmission, and completed tasks are never reopened.
UPDATE public.tasks AS task
SET status = 'Pending QC'
WHERE task.status = 'In Progress'
  AND EXISTS (
    SELECT 1
    FROM public.task_work_sessions AS session
    WHERE session.task_id = task.id
      AND session.status = 'finished'
      AND session.finished_at > COALESCE(task.submitted_at, '-infinity'::timestamptz)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.task_work_sessions AS open_session
    WHERE open_session.task_id = task.id
      AND open_session.status IN ('running', 'paused')
  );
