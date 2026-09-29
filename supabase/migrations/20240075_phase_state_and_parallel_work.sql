-- One persisted source of truth for phase progress/status and non-blocking
-- parallel-work relationships. Task dependencies remain the only blocking
-- predecessor relationship.

ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS qc_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_recalculated_at timestamptz;

CREATE OR REPLACE FUNCTION public.recalculate_phase_state(p_phase_id uuid)
RETURNS public.project_phases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_phase public.project_phases;
  v_required integer := 0;
  v_completed integer := 0;
  v_started integer := 0;
  v_qc_status text;
  v_qc_approved boolean := false;
  v_progress integer := 0;
  v_status text := 'Not Started';
BEGIN
  SELECT * INTO v_phase FROM public.project_phases WHERE id=p_phase_id;
  IF v_phase.id IS NULL THEN RETURN NULL; END IF;

  SELECT count(*),
         count(*) FILTER (WHERE status='Completed'),
         count(*) FILTER (WHERE status IS DISTINCT FROM 'To Do')
    INTO v_required,v_completed,v_started
  FROM public.tasks
  WHERE phase_id=p_phase_id AND is_required IS DISTINCT FROM false;

  SELECT coalesce(result,status) INTO v_qc_status
  FROM public.phase_qc_records
  WHERE phase_id=p_phase_id
  ORDER BY coalesce(reviewed_at,submitted_at,created_at) DESC
  LIMIT 1;

  v_qc_status := coalesce(v_qc_status,v_phase.qc_status,'Not Started');
  v_qc_approved := v_qc_status IN ('Approved','Approved with Conditions');
  v_progress := CASE WHEN v_required=0 THEN 0 ELSE round(100.0*v_completed/v_required)::integer END;

  IF v_required>0 AND v_completed=v_required THEN
    IF NOT v_phase.qc_required OR v_qc_approved THEN v_status := 'Completed';
    ELSE v_status := 'Pending QC'; END IF;
    IF v_phase.qc_required AND v_qc_status='Not Started' THEN v_qc_status := 'Ready for Review'; END IF;
    IF NOT v_phase.qc_required THEN v_qc_status := 'Not Required'; END IF;
  ELSIF v_started>0 THEN
    v_status := 'In Progress';
  ELSE
    v_status := 'Not Started';
  END IF;

  UPDATE public.project_phases SET
    progress=v_progress,
    status=v_status,
    qc_status=v_qc_status,
    last_recalculated_at=now(),
    updated_at=now()
  WHERE id=p_phase_id
  RETURNING * INTO v_phase;

  UPDATE public.projects pr SET
    progress=coalesce((
      SELECT round(100.0*count(*) FILTER (WHERE t.status='Completed')/nullif(count(*),0))::integer
      FROM public.tasks t WHERE t.project_id=v_phase.project_id AND t.is_required IS DISTINCT FROM false
    ),0),
    phase=coalesce((
      SELECT pp.name FROM public.project_phases pp
      WHERE pp.project_id=v_phase.project_id AND pp.status<>'Completed'
      ORDER BY pp.position,pp.created_at LIMIT 1
    ),(
      SELECT pp.name FROM public.project_phases pp
      WHERE pp.project_id=v_phase.project_id ORDER BY pp.position DESC,pp.created_at DESC LIMIT 1
    )),
    updated_at=now()
  WHERE pr.id=v_phase.project_id;

  RETURN v_phase;
END; $$;

CREATE OR REPLACE FUNCTION public.recalculate_project_state(p_project_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE v_id uuid; v_stamp timestamptz:=now();
BEGIN
  FOR v_id IN SELECT id FROM public.project_phases WHERE project_id=p_project_id ORDER BY position LOOP
    PERFORM public.recalculate_phase_state(v_id);
  END LOOP;
  RETURN v_stamp;
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_task_phase_state()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.phase_id IS NOT NULL THEN PERFORM public.recalculate_phase_state(OLD.phase_id); END IF;
    RETURN OLD;
  END IF;
  IF TG_OP='UPDATE' AND OLD.phase_id IS DISTINCT FROM NEW.phase_id AND OLD.phase_id IS NOT NULL THEN
    PERFORM public.recalculate_phase_state(OLD.phase_id);
  END IF;
  IF NEW.phase_id IS NOT NULL THEN PERFORM public.recalculate_phase_state(NEW.phase_id); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_refresh_task_phase_state ON public.tasks;
CREATE TRIGGER trg_refresh_task_phase_state
AFTER INSERT OR DELETE OR UPDATE OF status,progress,is_required,phase_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.refresh_task_phase_state();

CREATE OR REPLACE FUNCTION public.refresh_qc_phase_state()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.recalculate_phase_state(CASE WHEN TG_OP='DELETE' THEN OLD.phase_id ELSE NEW.phase_id END);
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;

DROP TRIGGER IF EXISTS trg_refresh_qc_phase_state ON public.phase_qc_records;
CREATE TRIGGER trg_refresh_qc_phase_state
AFTER INSERT OR UPDATE OR DELETE ON public.phase_qc_records
FOR EACH ROW EXECUTE FUNCTION public.refresh_qc_phase_state();

CREATE TABLE IF NOT EXISTS public.task_parallel_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  related_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK(relationship_type IN ('Starts with','Runs concurrently with','Parallel work group')),
  group_label text,
  created_by uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(task_id<>related_task_id),
  UNIQUE(task_id,related_task_id,relationship_type)
);
CREATE INDEX IF NOT EXISTS idx_task_parallel_relationships_project ON public.task_parallel_relationships(project_id);

CREATE OR REPLACE FUNCTION public.validate_parallel_relationship() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM public.tasks a JOIN public.tasks b ON b.id=NEW.related_task_id
    WHERE a.id=NEW.task_id AND a.project_id=b.project_id AND a.project_id=NEW.project_id
  ) THEN RAISE EXCEPTION 'Related work must belong to the same project'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_validate_parallel_relationship ON public.task_parallel_relationships;
CREATE TRIGGER trg_validate_parallel_relationship BEFORE INSERT OR UPDATE ON public.task_parallel_relationships
FOR EACH ROW EXECUTE FUNCTION public.validate_parallel_relationship();

ALTER TABLE public.task_parallel_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS task_parallel_relationships_select ON public.task_parallel_relationships;
DROP POLICY IF EXISTS task_parallel_relationships_manage ON public.task_parallel_relationships;
CREATE POLICY task_parallel_relationships_select ON public.task_parallel_relationships FOR SELECT USING(
  EXISTS(SELECT 1 FROM public.tasks t WHERE t.id=task_id AND (public.is_broad_project_viewer() OR public.is_project_supervisor(t.project_id) OR public.owns_task_multi(t.id)))
);
CREATE POLICY task_parallel_relationships_manage ON public.task_parallel_relationships FOR ALL
USING(public.can_manage_task_planning(task_id)) WITH CHECK(public.can_manage_task_planning(task_id));

GRANT EXECUTE ON FUNCTION public.recalculate_phase_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_project_state(uuid) TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.task_parallel_relationships TO authenticated;

DO $$ DECLARE v_project uuid; BEGIN
  FOR v_project IN SELECT id FROM public.projects LOOP
    PERFORM public.recalculate_project_state(v_project);
  END LOOP;
END $$;
