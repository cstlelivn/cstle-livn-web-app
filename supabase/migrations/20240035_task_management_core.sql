-- Complete the task module by extending existing phase, timer, media, QC,
-- Aura, inventory, and activity infrastructure. No duplicate task statuses or
-- QC workflow are introduced.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_criteria text,
  ADD COLUMN IF NOT EXISTS photos_not_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_note_required boolean NOT NULL DEFAULT true;

ALTER TABLE public.task_media
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS accuracy_meters numeric,
  ADD COLUMN IF NOT EXISTS marketing_saved_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_saved_by uuid REFERENCES public.team_members(id);

-- Backfill normalized phase links from the legacy phase name, then use the
-- first project phase for any remaining historical task. New writes are
-- enforced without making old projects with no phases unreadable.
UPDATE public.tasks t SET phase_id = p.id
FROM public.project_phases p, public.projects pr
WHERE t.phase_id IS NULL AND p.project_id=t.project_id AND p.name=t.phase
  AND pr.id=t.project_id AND pr.status IS DISTINCT FROM 'Completed';

UPDATE public.tasks t SET
  phase_id=(SELECT pp.id FROM public.project_phases pp WHERE pp.project_id=t.project_id ORDER BY pp.position,pp.created_at LIMIT 1),
  phase=(SELECT pp.name FROM public.project_phases pp WHERE pp.project_id=t.project_id ORDER BY pp.position,pp.created_at LIMIT 1)
WHERE t.phase_id IS NULL
  AND EXISTS(SELECT 1 FROM public.projects pr WHERE pr.id=t.project_id AND pr.status IS DISTINCT FROM 'Completed')
  AND EXISTS(SELECT 1 FROM public.project_phases pp WHERE pp.project_id=t.project_id);

CREATE OR REPLACE FUNCTION public.require_valid_task_phase() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE v_name text;
BEGIN
  IF NEW.phase_id IS NULL THEN
    RAISE EXCEPTION 'PHASE_REQUIRED: add/select a project phase before creating a task' USING ERRCODE='P0001';
  END IF;
  SELECT name INTO v_name FROM public.project_phases WHERE id=NEW.phase_id AND project_id=NEW.project_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'INVALID_PHASE: phase does not belong to this project' USING ERRCODE='P0001'; END IF;
  NEW.phase := v_name;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_require_valid_task_phase ON public.tasks;
CREATE TRIGGER trg_require_valid_task_phase BEFORE INSERT OR UPDATE OF project_id,phase_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.require_valid_task_phase();

-- Enforce the first-start photo rule at the database boundary as well as in
-- the UI. Resuming a paused session is unaffected, and a Supervisor/Admin can
-- explicitly waive photos on the task.
CREATE OR REPLACE FUNCTION public.require_task_start_photo() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.tasks t WHERE t.id=NEW.task_id AND t.photos_not_required)
     AND NOT EXISTS(
       SELECT 1 FROM public.task_media m
       WHERE m.task_id=NEW.task_id AND m.media_kind='photo'
         AND m.evidence_stage='before' AND m.upload_status='ready'
         AND m.deleted_at IS NULL
     ) THEN
    RAISE EXCEPTION 'START_PHOTO_REQUIRED: add a start photo before starting the timer' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_require_task_start_photo ON public.task_work_sessions;
CREATE TRIGGER trg_require_task_start_photo BEFORE INSERT ON public.task_work_sessions
FOR EACH ROW EXECUTE FUNCTION public.require_task_start_photo();

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.team_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(task_id,depends_on_task_id),
  CHECK(task_id<>depends_on_task_id)
);

CREATE OR REPLACE FUNCTION public.validate_task_dependency() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.tasks a JOIN public.tasks b ON b.id=NEW.depends_on_task_id WHERE a.id=NEW.task_id AND a.project_id=b.project_id)
    THEN RAISE EXCEPTION 'Dependencies must belong to the same project'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_validate_task_dependency ON public.task_dependencies;
CREATE TRIGGER trg_validate_task_dependency BEFORE INSERT OR UPDATE ON public.task_dependencies
FOR EACH ROW EXECUTE FUNCTION public.validate_task_dependency();

CREATE TABLE IF NOT EXISTS public.task_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name text NOT NULL, quantity numeric NOT NULL DEFAULT 1, provided_by text NOT NULL DEFAULT 'To Be Confirmed',
  availability text, notes text, list_status text NOT NULL DEFAULT 'Draft', position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.team_members(id), approved_by uuid REFERENCES public.team_members(id),
  approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(list_status IN ('Draft','Approved')),
  CHECK(provided_by IN ('Cstle Livn','Client','Subcontractor','Existing On Site','To Be Confirmed'))
);

CREATE TABLE IF NOT EXISTS public.task_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name text NOT NULL, specification text, quantity numeric NOT NULL DEFAULT 1, unit text NOT NULL DEFAULT 'unit',
  provided_by text NOT NULL DEFAULT 'To Be Confirmed', purchase_status text, notes text,
  list_status text NOT NULL DEFAULT 'Draft', position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.team_members(id), approved_by uuid REFERENCES public.team_members(id),
  approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(list_status IN ('Draft','Approved')),
  CHECK(provided_by IN ('Cstle Livn','Client','Subcontractor','Existing On Site','To Be Confirmed'))
);
CREATE INDEX IF NOT EXISTS idx_task_tools_task ON public.task_tools(task_id,position);
CREATE INDEX IF NOT EXISTS idx_task_materials_task ON public.task_materials(task_id,position);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_materials ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_task_planning(p_task_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT public.is_manager_or_admin() OR EXISTS(
  SELECT 1 FROM public.tasks t WHERE t.id=p_task_id AND public.is_project_supervisor(t.project_id)
); $$;

DROP POLICY IF EXISTS task_dependencies_select ON public.task_dependencies;
DROP POLICY IF EXISTS task_dependencies_manage ON public.task_dependencies;
CREATE POLICY task_dependencies_select ON public.task_dependencies FOR SELECT USING(
  EXISTS(SELECT 1 FROM public.tasks t WHERE t.id=task_id AND (public.is_broad_project_viewer() OR public.is_project_supervisor(t.project_id) OR public.owns_task_multi(t.id))));
CREATE POLICY task_dependencies_manage ON public.task_dependencies FOR ALL USING(public.can_manage_task_planning(task_id)) WITH CHECK(public.can_manage_task_planning(task_id));

DO $$ DECLARE tbl text; BEGIN FOREACH tbl IN ARRAY ARRAY['task_tools','task_materials'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I',tbl,tbl);
  EXECUTE format('DROP POLICY IF EXISTS %I_manage ON public.%I',tbl,tbl);
  EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT USING (public.can_manage_task_planning(task_id) OR (list_status=''Approved'' AND EXISTS(SELECT 1 FROM public.tasks t WHERE t.id=task_id AND public.owns_task_multi(t.id))))',tbl,tbl);
  EXECUTE format('CREATE POLICY %I_manage ON public.%I FOR ALL USING (public.can_manage_task_planning(task_id)) WITH CHECK (public.can_manage_task_planning(task_id))',tbl,tbl);
END LOOP; END $$;

CREATE TABLE IF NOT EXISTS public.task_time_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.task_work_sessions(id) ON DELETE RESTRICT,
  previous_seconds integer NOT NULL, new_seconds integer NOT NULL CHECK(new_seconds>=0), reason text NOT NULL CHECK(length(btrim(reason))>=5),
  corrected_by uuid NOT NULL REFERENCES public.team_members(id), corrected_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_time_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_time_corrections_select ON public.task_time_corrections FOR SELECT USING(public.can_view_team_performance());

CREATE OR REPLACE FUNCTION public.correct_task_time(p_session_id uuid,p_new_seconds integer,p_reason text)
RETURNS public.task_work_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.task_work_sessions; member uuid;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN: Super Admin only' USING ERRCODE='P0001'; END IF;
  IF p_new_seconds<0 OR length(btrim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'A correction reason is required'; END IF;
  member:=public.current_team_member_id(); SELECT * INTO s FROM public.task_work_sessions WHERE id=p_session_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;
  INSERT INTO public.task_time_corrections(session_id,previous_seconds,new_seconds,reason,corrected_by) VALUES(s.id,s.active_seconds,p_new_seconds,btrim(p_reason),member);
  UPDATE public.task_work_sessions SET active_seconds=p_new_seconds,updated_at=now() WHERE id=s.id RETURNING * INTO s;
  INSERT INTO public.project_activity_log(project_id,user_id,action,object_type,object_id,prev_value,new_value,reason)
  VALUES(s.project_id,auth.uid(),'time_record_corrected','task_work_session',s.id,jsonb_build_object('active_seconds',(SELECT previous_seconds FROM public.task_time_corrections WHERE session_id=s.id ORDER BY corrected_at DESC LIMIT 1)),jsonb_build_object('active_seconds',p_new_seconds),btrim(p_reason));
  RETURN s;
END; $$;
REVOKE ALL ON FUNCTION public.correct_task_time(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.correct_task_time(uuid,integer,text) TO authenticated;

-- Major task changes share the existing immutable activity log.
CREATE OR REPLACE FUNCTION public.audit_task_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE action_name text;
BEGIN
  IF TG_OP='INSERT' THEN action_name:='task_created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN action_name:='task_status_changed';
  ELSIF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN action_name:='task_reassigned';
  ELSIF NEW.estimated_hours IS DISTINCT FROM OLD.estimated_hours THEN action_name:='estimated_hours_changed';
  ELSE RETURN NEW; END IF;
  INSERT INTO public.project_activity_log(project_id,user_id,action,object_type,object_id,prev_value,new_value)
  VALUES(NEW.project_id,auth.uid(),action_name,'task',NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,to_jsonb(NEW));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_audit_task_change ON public.tasks;
CREATE TRIGGER trg_audit_task_change AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.audit_task_change();
