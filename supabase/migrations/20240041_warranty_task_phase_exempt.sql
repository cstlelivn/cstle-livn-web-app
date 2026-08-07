-- 20240040 gave warranty tasks an exemption from closed-project immutability
-- but missed a separate, earlier guard: require_valid_task_phase() (from
-- 20240035) unconditionally rejects any task with a null phase_id. A
-- warranty task is deliberately not tied to the project's (closed) phase
-- plan, so it needs the same kind of carve-out here.
CREATE OR REPLACE FUNCTION public.require_valid_task_phase() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE v_name text;
BEGIN
  IF NEW.is_warranty THEN
    RETURN NEW;
  END IF;
  IF NEW.phase_id IS NULL THEN
    RAISE EXCEPTION 'PHASE_REQUIRED: add/select a project phase before creating a task' USING ERRCODE='P0001';
  END IF;
  SELECT name INTO v_name FROM public.project_phases WHERE id=NEW.phase_id AND project_id=NEW.project_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'INVALID_PHASE: phase does not belong to this project' USING ERRCODE='P0001'; END IF;
  NEW.phase := v_name;
  RETURN NEW;
END; $$;
