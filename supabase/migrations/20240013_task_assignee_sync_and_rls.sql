-- =============================================================================
-- Migration: Multi-assignee sync, RLS, and backfill (step 2 of the
-- time-tracking feature).
--
-- After this migration, task_assignees is live and populated, and stays in
-- sync with tasks.assignee_id automatically in BOTH directions:
--   - Writing task_assignees (the new multi-assignee path) keeps
--     tasks.assignee_id pointed at the earliest active assignee, so every
--     existing screen that reads task.assignee keeps working unmodified.
--   - Writing tasks.assignee_id directly (any old code path we didn't
--     update, or a future one) still creates/updates a matching
--     task_assignees row, so nothing can silently desync.
-- Both directions are SECURITY DEFINER so they work regardless of the
-- calling user's own RLS grants on task_assignees, and a session flag
-- prevents the two triggers from recursively re-triggering each other.
--
-- Safe to re-run: CREATE OR REPLACE / DROP TRIGGER IF EXISTS / DROP POLICY
-- IF EXISTS / a guarded backfill throughout.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bidirectional sync triggers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_primary_assignee_from_task_assignees()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_task_id uuid := COALESCE(NEW.task_id, OLD.task_id);
  v_primary uuid;
BEGIN
  SELECT team_member_id INTO v_primary
  FROM public.task_assignees
  WHERE task_id = v_task_id AND is_active
  ORDER BY assigned_at ASC
  LIMIT 1;

  PERFORM set_config('cstle.sync_in_progress', 'true', true);
  UPDATE public.tasks
  SET assignee_id = v_primary
  WHERE id = v_task_id AND assignee_id IS DISTINCT FROM v_primary;
  PERFORM set_config('cstle.sync_in_progress', 'false', true);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_primary_assignee ON public.task_assignees;
CREATE TRIGGER trg_sync_primary_assignee
  AFTER INSERT OR UPDATE OR DELETE ON public.task_assignees
  FOR EACH ROW EXECUTE FUNCTION public.sync_primary_assignee_from_task_assignees();

CREATE OR REPLACE FUNCTION public.sync_task_assignees_from_primary()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF current_setting('cstle.sync_in_progress', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.assignee_id IS NOT NULL THEN
      INSERT INTO public.task_assignees (task_id, team_member_id, assigned_at)
      VALUES (NEW.id, NEW.assignee_id, now())
      ON CONFLICT (task_id, team_member_id) WHERE is_active DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    IF OLD.assignee_id IS NOT NULL THEN
      UPDATE public.task_assignees
      SET is_active = false, unassigned_at = now()
      WHERE task_id = NEW.id AND team_member_id = OLD.assignee_id AND is_active;
    END IF;
    IF NEW.assignee_id IS NOT NULL THEN
      INSERT INTO public.task_assignees (task_id, team_member_id, assigned_at)
      VALUES (NEW.id, NEW.assignee_id, now())
      ON CONFLICT (task_id, team_member_id) WHERE is_active DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_task_assignees_insert ON public.tasks;
CREATE TRIGGER trg_sync_task_assignees_insert
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_assignees_from_primary();

DROP TRIGGER IF EXISTS trg_sync_task_assignees_update ON public.tasks;
CREATE TRIGGER trg_sync_task_assignees_update
  AFTER UPDATE OF assignee_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_assignees_from_primary();

-- ---------------------------------------------------------------------------
-- 2. Backfill: every task's current single assignee becomes its first
--    task_assignees row. Guarded so re-running this migration is harmless.
-- ---------------------------------------------------------------------------
INSERT INTO public.task_assignees (task_id, team_member_id, assigned_at)
SELECT t.id, t.assignee_id, COALESCE(t.created_at, now())
FROM public.tasks t
WHERE t.assignee_id IS NOT NULL
ON CONFLICT (task_id, team_member_id) WHERE is_active DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. RLS. Everyone who can see a task can see who's assigned to it (mirrors
--    tasks_select). Direct writes are admin-only for now -- the normal app
--    flow goes through assign_task_member/unassign_task_member (added in
--    20240016, once those can also safely finalize an open work session on
--    unassignment); this policy exists as an admin escape hatch for manual
--    corrections in the meantime, not as the primary write path.
-- ---------------------------------------------------------------------------
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_assignees_select ON public.task_assignees;
DROP POLICY IF EXISTS task_assignees_insert ON public.task_assignees;
DROP POLICY IF EXISTS task_assignees_update ON public.task_assignees;
DROP POLICY IF EXISTS task_assignees_delete ON public.task_assignees;

CREATE POLICY task_assignees_select ON public.task_assignees FOR SELECT USING (true);

CREATE POLICY task_assignees_insert ON public.task_assignees FOR INSERT
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY task_assignees_update ON public.task_assignees FOR UPDATE
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

CREATE POLICY task_assignees_delete ON public.task_assignees FOR DELETE
  USING (public.is_manager_or_admin());
