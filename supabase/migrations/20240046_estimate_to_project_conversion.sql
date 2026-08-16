-- Estimating & profitability tool, migration 4 of 4: converting an
-- approved estimate into a real project.
--
-- This is the seam between the two pipelines discussed in the integration
-- plan: an `estimates` row never becomes a `projects` row automatically or
-- silently -- it happens exactly once, explicitly, via this RPC, only
-- after customer_approved is true. From that point on, the job is a normal
-- project: phases/tasks/QC/warranty/closed-project rules all apply exactly
-- as they do for any other project, since it's the same `projects` table
-- every other screen in this app already knows how to work with.
--
-- SECURITY DEFINER, same idiom as assign_task_member/start_work_session/
-- finalize_task_qc elsewhere in this codebase: this needs to read the
-- Super-Admin-gated pricing snapshot (to set the new project's budget to
-- the customer-approved selling price) even when triggered by an
-- Admin/Manager who can't read that table directly. Only the approved
-- SELLING price is ever written anywhere -- cost/margin never leave the
-- pricing snapshot table.
--
-- The AI-generated project plan is a flat sequence of steps with no phase
-- grouping (the AI prompt doesn't produce one), so this seeds ONE phase
-- containing every step as an ordered, unassigned task -- matching the
-- existing "Supervisor plans before assignment" pattern from
-- 20240038_supervisor_unassigned_task_planning.sql. A Manager/Admin can
-- freely reorganize into multiple phases afterward using the drag-and-drop
-- Phases tab already built. Staffing (who's actually assigned) is a
-- separate, deliberate next step -- not automatic here -- per the explicit
-- product decision that crew assignment should weigh each team member's
-- current workload, not just be auto-filled at creation.
CREATE OR REPLACE FUNCTION public.convert_estimate_to_project(p_estimate_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_estimate record;
  v_approval record;
  v_snapshot record;
  v_price_cents bigint;
  v_project_id uuid;
  v_phase_id uuid;
  v_step jsonb;
  v_idx integer;
BEGIN
  IF NOT public.can_run_estimating() THEN
    RAISE EXCEPTION 'FORBIDDEN: not permitted to convert estimates' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_estimate FROM public.estimates WHERE id = p_estimate_id;
  IF v_estimate IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: estimate does not exist' USING ERRCODE = 'P0001';
  END IF;
  IF v_estimate.converted_project_id IS NOT NULL THEN
    RETURN v_estimate.converted_project_id; -- idempotent -- calling twice just returns the same project
  END IF;
  IF NOT v_estimate.customer_approved THEN
    RAISE EXCEPTION 'NOT_APPROVED: customer approval must be recorded before converting to a project' USING ERRCODE = 'P0001';
  END IF;
  IF v_estimate.project_plan IS NULL THEN
    RAISE EXCEPTION 'NO_PLAN: no project plan has been generated for this estimate' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_approval FROM public.estimate_approvals WHERE estimate_id = p_estimate_id;
  IF v_approval IS NULL THEN
    RAISE EXCEPTION 'NO_APPROVAL_RECORD: customer_approved is set but no approval record exists' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_snapshot FROM public.estimate_pricing_snapshots
    WHERE estimate_id = p_estimate_id ORDER BY confirmed_at DESC LIMIT 1;
  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'NO_PRICING: no confirmed pricing snapshot exists for this estimate' USING ERRCODE = 'P0001';
  END IF;

  v_price_cents := CASE v_approval.selected_tier
    WHEN 'better' THEN v_snapshot.selling_price_better_cents
    WHEN 'best' THEN v_snapshot.selling_price_best_cents
    ELSE v_snapshot.selling_price_good_cents
  END;

  INSERT INTO public.projects (title, client, location, budget, status, description, phase)
  VALUES (v_estimate.name, v_estimate.client_id, v_estimate.site_address, v_price_cents / 100.0, 'Planning', v_estimate.scope_of_work, 'Project Plan')
  RETURNING id INTO v_project_id;

  INSERT INTO public.project_phases (project_id, name, position, status)
  VALUES (v_project_id, 'Project Plan', 0, 'Not Started')
  RETURNING id INTO v_phase_id;

  v_idx := 0;
  FOR v_step IN SELECT * FROM jsonb_array_elements(COALESCE(v_estimate.project_plan->'steps', '[]'::jsonb))
  LOOP
    INSERT INTO public.tasks (project_id, phase_id, title, description, status, priority, estimated_hours, sequence)
    VALUES (
      v_project_id,
      v_phase_id,
      COALESCE(v_step->>'title', 'Untitled step'),
      NULLIF(trim(both E'\n' FROM
        COALESCE(v_step->>'detail', '') ||
        CASE WHEN v_step->>'crew' IS NOT NULL THEN E'\nCrew: ' || (v_step->>'crew') ELSE '' END ||
        CASE WHEN v_step->>'qc' IS NOT NULL THEN E'\nQC checkpoint: ' || (v_step->>'qc') ELSE '' END ||
        CASE WHEN v_step->>'safety' IS NOT NULL THEN E'\nSafety: ' || (v_step->>'safety') ELSE '' END
      ), ''),
      'To Do',
      'Medium',
      NULLIF(v_step->>'hours', '')::numeric,
      v_idx
    );
    v_idx := v_idx + 1;
  END LOOP;

  UPDATE public.estimates
    SET converted_project_id = v_project_id, status = 'converted'
    WHERE id = p_estimate_id;

  RETURN v_project_id;
END;
$$;
