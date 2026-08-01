-- =============================================================================
-- Task/project media evidence metadata for Cloudflare R2.
--
-- R2 stores the bytes. Postgres stores the searchable, permission-aware
-- record that connects each object to a project, task, update, and uploader.
-- Files are internal-only by default; client/social visibility is an explicit
-- approval action. No R2 credential or signed URL is stored in this table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.task_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  task_update_id uuid REFERENCES public.task_updates(id) ON DELETE SET NULL,
  object_key text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  content_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  media_kind text NOT NULL CHECK (media_kind IN ('photo', 'video', 'audio', 'document')),
  evidence_stage text NOT NULL DEFAULT 'progress'
    CHECK (evidence_stage IN ('before', 'progress', 'after', 'general')),
  caption text,
  captured_at timestamptz,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  upload_status text NOT NULL DEFAULT 'pending'
    CHECK (upload_status IN ('pending', 'ready', 'failed')),
  client_visible boolean NOT NULL DEFAULT false,
  social_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_task_media_project_created
  ON public.task_media(project_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_media_task_created
  ON public.task_media(task_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_media_update
  ON public.task_media(task_update_id) WHERE task_update_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_media_uploaded_by
  ON public.task_media(uploaded_by, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_media_client_visible
  ON public.task_media(project_id, created_at DESC)
  WHERE client_visible AND upload_status = 'ready' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_media_social_approved
  ON public.task_media(created_at DESC)
  WHERE social_approved AND upload_status = 'ready' AND deleted_at IS NULL;

-- Keep relationships honest even when metadata is written through the
-- service-role Edge Function: a task must belong to the supplied project,
-- and a task update must belong to the supplied task.
CREATE OR REPLACE FUNCTION public.validate_task_media_links() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_update_task_id uuid;
BEGIN
  IF NEW.task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = NEW.task_id AND t.project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'Task does not belong to the supplied project';
  END IF;

  IF NEW.task_update_id IS NOT NULL THEN
    IF NEW.task_id IS NULL THEN
      RAISE EXCEPTION 'A task update attachment requires a task';
    END IF;

    SELECT tu.task_id INTO v_update_task_id
    FROM public.task_updates tu WHERE tu.id = NEW.task_update_id;

    IF v_update_task_id IS NULL OR v_update_task_id <> NEW.task_id THEN
      RAISE EXCEPTION 'Task update does not belong to the supplied task';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_task_media_links ON public.task_media;
CREATE TRIGGER trg_validate_task_media_links
  BEFORE INSERT OR UPDATE ON public.task_media
  FOR EACH ROW EXECUTE FUNCTION public.validate_task_media_links();

-- Helpers mirror the existing project/task visibility model. Client accounts
-- are not granted access here yet; client_visible prepares for a later,
-- separately authenticated client portal without making files public today.
CREATE OR REPLACE FUNCTION public.can_access_task_media(
  p_project_id uuid,
  p_task_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_broad_project_viewer()
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

CREATE OR REPLACE FUNCTION public.can_upload_task_media(
  p_project_id uuid,
  p_task_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.jwt_role() IN ('Super Admin', 'Admin', 'Manager', 'Quality Control')
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
  SELECT public.jwt_role() IN ('Super Admin', 'Admin', 'Manager', 'Quality Control')
    OR public.is_project_supervisor(p_project_id);
$$;

-- Prevent ordinary uploaders from promoting evidence to client/social use.
-- The service role is allowed so the authenticated Edge Function can perform
-- an already-authorized approval operation.
CREATE OR REPLACE FUNCTION public.protect_task_media_approval() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.can_approve_task_media(NEW.project_id)
     AND (NEW.client_visible OR NEW.social_approved) THEN
    RAISE EXCEPTION 'Only project supervisors or authorized review roles can approve media';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_task_media_approval ON public.task_media;
CREATE TRIGGER trg_protect_task_media_approval
  BEFORE INSERT OR UPDATE OF client_visible, social_approved ON public.task_media
  FOR EACH ROW EXECUTE FUNCTION public.protect_task_media_approval();

ALTER TABLE public.task_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_media_select ON public.task_media;
DROP POLICY IF EXISTS task_media_insert ON public.task_media;
DROP POLICY IF EXISTS task_media_update ON public.task_media;
DROP POLICY IF EXISTS task_media_delete ON public.task_media;

CREATE POLICY task_media_select ON public.task_media FOR SELECT
  USING (public.can_access_task_media(project_id, task_id));

CREATE POLICY task_media_insert ON public.task_media FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND NOT client_visible
    AND NOT social_approved
    AND public.can_upload_task_media(project_id, task_id)
  );

-- Uploaders can finish/edit their own unapproved metadata. Approvers can
-- manage media for projects in their scope. Physical R2 deletion will remain
-- an Edge Function operation so a database delete cannot orphan an object.
CREATE POLICY task_media_update ON public.task_media FOR UPDATE
  USING (
    public.can_approve_task_media(project_id)
    OR (uploaded_by = auth.uid() AND NOT client_visible AND NOT social_approved)
  )
  WITH CHECK (
    public.can_approve_task_media(project_id)
    OR (uploaded_by = auth.uid() AND NOT client_visible AND NOT social_approved)
  );

-- Intentionally no DELETE policy: deletion is a soft-delete + R2 delete
-- transaction performed by the authenticated backend.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'task_media'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_media;
  END IF;
END $$;

ALTER TABLE public.task_media REPLICA IDENTITY FULL;

REVOKE ALL ON FUNCTION public.can_access_task_media(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_upload_task_media(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_approve_task_media(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_task_media(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_upload_task_media(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_approve_task_media(uuid) TO authenticated;
