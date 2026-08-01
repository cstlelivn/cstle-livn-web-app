-- Aura v3 + task-led onsite reporting. Run manually before deploying the
-- matching frontend. This migration is additive and safe to re-run.

ALTER TABLE public.task_work_sessions
  ADD COLUMN IF NOT EXISTS delay_status text,
  ADD COLUMN IF NOT EXISTS delay_reviewed_by uuid REFERENCES public.team_members(id),
  ADD COLUMN IF NOT EXISTS delay_reviewed_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.task_work_sessions ADD CONSTRAINT task_work_sessions_delay_status_check
    CHECK (delay_status IS NULL OR delay_status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.task_work_sessions
SET delay_status = 'pending'
WHERE (nullif(btrim(delay_reason), '') IS NOT NULL OR nullif(btrim(blocker), '') IS NOT NULL)
  AND delay_status IS NULL;

CREATE OR REPLACE FUNCTION public.mark_session_delay_pending() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (nullif(btrim(NEW.delay_reason), '') IS NOT NULL OR nullif(btrim(NEW.blocker), '') IS NOT NULL)
     AND (NEW.delay_reason IS DISTINCT FROM OLD.delay_reason OR NEW.blocker IS DISTINCT FROM OLD.blocker) THEN
    NEW.delay_status := 'pending';
    NEW.delay_reviewed_by := NULL;
    NEW.delay_reviewed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_session_delay_pending ON public.task_work_sessions;
CREATE TRIGGER trg_mark_session_delay_pending
  BEFORE UPDATE OF delay_reason, blocker ON public.task_work_sessions
  FOR EACH ROW EXECUTE FUNCTION public.mark_session_delay_pending();

CREATE TABLE IF NOT EXISTS public.task_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  author_id uuid,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE RESTRICT,
  update_type text NOT NULL CHECK (update_type IN ('progress', 'query', 'suggestion', 'issue', 'change_request')),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'declined')),
  resolved_by uuid REFERENCES public.team_members(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- The original scaffold may already have a smaller task_updates table keyed
-- to legacy public.users. Add the v3 columns without reusing that identity.
ALTER TABLE public.task_updates
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES public.team_members(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS update_type text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.team_members(id),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DO $$ BEGIN ALTER TABLE public.task_updates ADD CONSTRAINT task_updates_type_v3_check CHECK (update_type IS NULL OR update_type IN ('progress','query','suggestion','issue','change_request')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.task_updates ADD CONSTRAINT task_updates_status_v3_check CHECK (status IS NULL OR status IN ('open','acknowledged','resolved','declined')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_task_updates_task_created ON public.task_updates(task_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.stamp_task_update_resolution() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('resolved','declined') THEN
    NEW.resolved_by := public.current_team_member_id(); NEW.resolved_at := now();
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.resolved_by := NULL; NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_stamp_task_update_resolution ON public.task_updates;
CREATE TRIGGER trg_stamp_task_update_resolution BEFORE UPDATE ON public.task_updates
FOR EACH ROW EXECUTE FUNCTION public.stamp_task_update_resolution();

CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 500),
  is_required boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.team_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_checklist_task_position ON public.task_checklist_items(task_id, position, created_at);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS required_photo_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_updates_select ON public.task_updates;
DROP POLICY IF EXISTS p_task_updates_select ON public.task_updates;
DROP POLICY IF EXISTS p_task_updates_insert ON public.task_updates;
DROP POLICY IF EXISTS p_task_updates_delete ON public.task_updates;
CREATE POLICY task_updates_select ON public.task_updates FOR SELECT USING (
  public.is_broad_project_viewer() OR public.is_project_supervisor(project_id)
  OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id=task_updates.task_id AND ta.team_member_id=public.current_team_member_id() AND ta.is_active)
);
DROP POLICY IF EXISTS task_updates_insert ON public.task_updates;
CREATE POLICY task_updates_insert ON public.task_updates FOR INSERT WITH CHECK (
  team_member_id = public.current_team_member_id()
  AND (public.is_broad_project_viewer() OR public.is_project_supervisor(project_id) OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id=task_updates.task_id AND ta.team_member_id=public.current_team_member_id() AND ta.is_active))
  AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.project_id = project_id)
);
DROP POLICY IF EXISTS task_updates_manage ON public.task_updates;
CREATE POLICY task_updates_manage ON public.task_updates FOR UPDATE USING (
  public.is_broad_project_viewer() OR public.is_project_supervisor(project_id)
) WITH CHECK (public.is_broad_project_viewer() OR public.is_project_supervisor(project_id));

DROP POLICY IF EXISTS task_checklist_select ON public.task_checklist_items;
CREATE POLICY task_checklist_select ON public.task_checklist_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (
    public.is_broad_project_viewer() OR public.is_project_supervisor(t.project_id)
    OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id=t.id AND ta.team_member_id=public.current_team_member_id() AND ta.is_active)
  ))
);
DROP POLICY IF EXISTS task_checklist_manage ON public.task_checklist_items;
CREATE POLICY task_checklist_manage ON public.task_checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (public.is_broad_project_viewer() OR public.is_project_supervisor(t.project_id)))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (public.is_broad_project_viewer() OR public.is_project_supervisor(t.project_id)))
);

CREATE OR REPLACE FUNCTION public.set_task_checklist_item(p_item_id uuid, p_completed boolean)
RETURNS public.task_checklist_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_item public.task_checklist_items; v_member uuid;
BEGIN
  v_member := public.current_team_member_id();
  SELECT * INTO v_item FROM public.task_checklist_items WHERE id = p_item_id FOR UPDATE;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'ITEM_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  IF NOT (public.is_broad_project_viewer() OR EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.id = v_item.task_id
      AND (public.is_project_supervisor(t.project_id) OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id=t.id AND ta.team_member_id=v_member AND ta.is_active))
  )) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
  UPDATE public.task_checklist_items SET
    completed_at = CASE WHEN p_completed THEN now() ELSE NULL END,
    completed_by = CASE WHEN p_completed THEN v_member ELSE NULL END,
    updated_at = now()
  WHERE id = p_item_id RETURNING * INTO v_item;
  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_task_delay(p_session_id uuid, p_approved boolean)
RETURNS public.task_work_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_session public.task_work_sessions; v_reviewer uuid;
BEGIN
  SELECT * INTO v_session FROM public.task_work_sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.id IS NULL THEN RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  IF NOT public.can_approve_task_qc_for(v_session.task_id) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
  IF nullif(btrim(v_session.delay_reason), '') IS NULL AND nullif(btrim(v_session.blocker), '') IS NULL THEN
    RAISE EXCEPTION 'NO_DELAY_TO_REVIEW' USING ERRCODE='P0001';
  END IF;
  v_reviewer := public.current_team_member_id();
  UPDATE public.task_work_sessions SET delay_status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    delay_reviewed_by = v_reviewer, delay_reviewed_at = now(), updated_at = now()
  WHERE id = p_session_id RETURNING * INTO v_session;
  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_documented_delay(p_task_id uuid, p_team_member_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.task_work_sessions
    WHERE task_id = p_task_id AND team_member_id = p_team_member_id AND delay_status = 'approved');
$$;

CREATE OR REPLACE FUNCTION public.compute_task_aura_score(p_task_id uuid, p_team_member_id uuid)
RETURNS TABLE (quality_score numeric, timing_score numeric, reliability_score numeric, overall_score numeric,
               qc_result text, rework boolean, delay_documented boolean)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_qc_result text; v_rework boolean; v_hours numeric; v_estimate numeric;
  v_has_notes boolean; v_clock_suspect boolean; v_delay boolean;
  v_required bigint; v_completed bigint; v_required_photos integer; v_photos bigint; v_updates bigint;
  v_quality numeric; v_timing numeric; v_reliability numeric; v_ratio numeric;
BEGIN
  SELECT s.qc_result, s.rework INTO v_qc_result, v_rework
  FROM public.task_work_sessions s WHERE s.task_id=p_task_id AND s.team_member_id=p_team_member_id AND s.qc_result IS NOT NULL
  ORDER BY s.finished_at DESC NULLS LAST LIMIT 1;
  IF v_qc_result IS NULL THEN RETURN; END IF;
  SELECT coalesce(sum(active_seconds),0)/3600.0, coalesce(bool_or(clock_suspect),false), coalesce(bool_or(nullif(btrim(notes),'') IS NOT NULL),false)
    INTO v_hours,v_clock_suspect,v_has_notes FROM public.task_work_sessions WHERE task_id=p_task_id AND team_member_id=p_team_member_id;
  SELECT estimated_hours, required_photo_count INTO v_estimate,v_required_photos FROM public.tasks WHERE id=p_task_id;
  SELECT count(*) FILTER (WHERE is_required), count(*) FILTER (WHERE is_required AND completed_at IS NOT NULL)
    INTO v_required,v_completed FROM public.task_checklist_items WHERE task_id=p_task_id;
  SELECT count(*) INTO v_photos FROM public.task_media m JOIN public.team_members tm ON tm.auth_user_id=m.uploaded_by
    WHERE m.task_id=p_task_id AND tm.id=p_team_member_id AND m.media_kind='photo' AND m.upload_status='ready' AND m.deleted_at IS NULL;
  SELECT count(*) INTO v_updates FROM public.task_updates WHERE task_id=p_task_id AND team_member_id=p_team_member_id;
  v_delay := public.has_documented_delay(p_task_id,p_team_member_id);
  v_quality := CASE WHEN v_qc_result='Approved' AND NOT v_rework THEN 5.0 WHEN v_qc_result='Approved with Conditions' AND NOT v_rework THEN 4.0 WHEN v_qc_result='Approved with Conditions' THEN 3.5 WHEN v_qc_result='Rejected' THEN 1.5 ELSE 3.0 END;
  IF v_delay THEN v_timing:=5.0;
  ELSIF v_estimate IS NULL OR v_estimate<=0 OR v_hours<=0 THEN v_timing:=3.0;
  ELSE v_ratio:=v_estimate/v_hours; v_timing:=CASE WHEN v_ratio>=1 THEN 5.0 WHEN v_ratio>=0.85 THEN 4.5 WHEN v_ratio>=0.7 THEN 3.5 WHEN v_ratio>=0.5 THEN 2.5 ELSE 1.5 END; END IF;
  v_reliability := 1.0
    + CASE WHEN v_has_notes OR v_updates>0 THEN 1.0 ELSE 0 END
    + CASE WHEN v_required=0 OR v_completed=v_required THEN 1.0 ELSE 0 END
    + CASE WHEN coalesce(v_required_photos,0)=0 OR v_photos>=v_required_photos THEN 1.0 ELSE 0 END
    + CASE WHEN NOT v_clock_suspect THEN 1.0 ELSE 0 END;
  RETURN QUERY SELECT v_quality,v_timing,v_reliability,
    round((v_quality*.5+v_timing*.3+v_reliability*.2)::numeric,1),v_qc_result,v_rework,v_delay;
END;
$$;

-- SECURITY DEFINER readers must reproduce the same authorization that table
-- RLS would have enforced for direct reads.
CREATE OR REPLACE FUNCTION public.can_view_member_aura(p_member_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.can_view_team_performance()
    OR p_member_id = public.current_team_member_id()
    OR EXISTS (SELECT 1 FROM public.projects p JOIN public.tasks t ON t.project_id=p.id
      JOIN public.task_assignees ta ON ta.task_id=t.id AND ta.is_active
      WHERE p.supervisor_id=public.current_team_member_id() AND ta.team_member_id=p_member_id);
$$;

-- Patch both existing profile readers with an authorization guard.
CREATE OR REPLACE FUNCTION public.assert_can_view_member_aura(p_member_id uuid) RETURNS void
LANGUAGE plpgsql STABLE AS $$ BEGIN
  IF NOT public.can_view_member_aura(p_member_id) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
END; $$;

DROP POLICY IF EXISTS task_aura_scores_select ON public.task_aura_scores;
CREATE POLICY task_aura_scores_select ON public.task_aura_scores FOR SELECT
  USING (public.can_view_member_aura(team_member_id));

-- These are aggregate readers, not privileged writers. Run them as the caller
-- so task_aura_scores/tasks RLS remains active throughout their queries.
ALTER FUNCTION public.team_member_aura_profile(uuid) SECURITY INVOKER;
ALTER FUNCTION public.team_member_demonstrated_skills(uuid) SECURITY INVOKER;

-- One transaction owns task state, session QC results, and Aura calculation.
-- Any error rolls the whole review back instead of leaving a completed task
-- without its score.
CREATE OR REPLACE FUNCTION public.finalize_task_qc(
  p_task_id uuid,
  p_qc_result text,
  p_rework boolean,
  p_feedback text DEFAULT NULL,
  p_display_rating numeric DEFAULT NULL,
  p_rating_metrics jsonb DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.can_approve_task_qc_for(p_task_id) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
  IF p_qc_result NOT IN ('Approved','Approved with Conditions','Rejected') THEN RAISE EXCEPTION 'INVALID_RESULT' USING ERRCODE='P0001'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.task_work_sessions WHERE task_id=p_task_id AND status='finished') THEN
    RAISE EXCEPTION 'NO_FINISHED_WORK_SESSION' USING ERRCODE='P0001';
  END IF;
  UPDATE public.task_work_sessions SET qc_result=p_qc_result,rework=p_rework,updated_at=now()
    WHERE task_id=p_task_id AND status='finished' AND qc_result IS NULL;
  UPDATE public.tasks SET
    status=CASE WHEN p_qc_result='Rejected' THEN 'In Progress' ELSE 'Completed' END,
    progress=CASE WHEN p_qc_result='Rejected' THEN progress ELSE 100 END,
    completed_date=CASE WHEN p_qc_result='Rejected' THEN NULL ELSE now() END,
    review_feedback=p_feedback,rating=p_display_rating,rating_metrics=p_rating_metrics,updated_at=now()
    WHERE id=p_task_id;
  v_count := public.record_task_aura_score(p_task_id,p_feedback);
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.set_task_checklist_item(uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.review_task_delay(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_task_checklist_item(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_task_delay(uuid,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.finalize_task_qc(uuid,text,boolean,text,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finalize_task_qc(uuid,text,boolean,text,numeric,jsonb) TO authenticated;
GRANT SELECT,INSERT ON public.task_updates TO authenticated;
GRANT UPDATE ON public.task_updates TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.task_checklist_items TO authenticated;

NOTIFY pgrst, 'reload schema';
