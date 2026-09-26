-- Secondary Suite Development v4 task completion.
-- Adds the operational tasks that must be independently visible/accountable
-- rather than remaining hidden inside broad task descriptions. Also syncs the
-- currently untouched 2992 Trombley plan and makes paying the permit fee the
-- current task, as confirmed by the user.

DO $$
DECLARE
  v_template uuid;
  v_project uuid;
  v_assignee uuid;
  v_supervisor uuid;
BEGIN
  SELECT id INTO v_template
  FROM public.project_templates
  WHERE name='Secondary Suite Development' AND active=true
  ORDER BY created_at DESC LIMIT 1;
  IF v_template IS NULL THEN RAISE EXCEPTION 'Active Secondary Suite Development template not found'; END IF;

  UPDATE public.project_templates
  SET version='4.0', updated_at=now()
  WHERE id=v_template;

  -- Keep permit work in the real operational order.
  UPDATE public.task_templates tt SET position=2, updated_at=now()
  FROM public.phase_templates ph
  WHERE tt.phase_template_id=ph.id AND ph.project_template_id=v_template
    AND ph.name='Permit Review & Approval'
    AND tt.name='Record issued permit, approved plans and suite address';

  -- name, phase, description, type, position, priority, duration, role,
  -- inspection-required, evidence-required
  CREATE TEMP TABLE _secondary_suite_missing_tasks(
    task_name text, phase_name text, task_description text, task_type text,
    task_position integer, task_priority text, task_days integer,
    task_role text, needs_inspection boolean, needs_evidence boolean,
    make_current boolean
  ) ON COMMIT DROP;

  INSERT INTO _secondary_suite_missing_tasks VALUES
    ('Pay City permit fee','Permit Review & Approval',
     'Pay the City permit invoice promptly and save the payment confirmation so the issued permit is not delayed.',
     'Administrative',1,'Urgent',1,'Admin',false,true,true),
    ('Set up site and protect retained finishes','Initial Framing',
     'Confirm safe access, isolate the work area and protect every retained floor, wall, stair and fixture before construction starts.',
     'Site Work',3,'High',1,'Supervisor / Site Crew',false,true,false),
    ('Verify fire separations, draft stopping and structural backing','Initial Framing',
     'Before rough-in, verify required rated assemblies, draft stops, openings and structural backing against the approved plans.',
     'Quality Control',4,'High',1,'Supervisor',false,true,false),
    ('Record each trade rough-in approval','Trade Rough-In & Framing Inspections',
     'Record plumbing, HVAC/mechanical and electrical approval results separately and attach the available inspection evidence before framing inspection.',
     'Inspection',2,'High',1,'Supervisor / Admin',true,true,false),
    ('Verify Type X and moisture-resistant board locations','Drywall, Mudding & Ceiling Texture',
     'Before boarding is closed, confirm Type X, moisture-resistant board and fire-separation details match the approved assembly.',
     'Quality Control',5,'High',1,'Supervisor / Drywall Crew',false,true,false),
    ('Verify suite-entry fire-door rating and clearances','Doors & Window Returns',
     'Confirm the suite-entry door, frame, hardware, undercut and clearances meet the approved fire and egress requirements.',
     'Quality Control',2,'High',1,'Supervisor / Finish Carpenter',false,true,false),
    ('Test and adjust every required self-closing fire door','Miscellaneous Final Installs & Life-Safety Checks',
     'Confirm each required fire door closes and latches from every open position; adjust hinges, closer, latch and sweep as needed.',
     'Quality Control',2,'Urgent',1,'Supervisor / Finish Carpenter',true,true,false),
    ('Verify smoke, CO and suite life-safety devices','Miscellaneous Final Installs & Life-Safety Checks',
     'Test interconnected smoke/CO devices and confirm life-safety labels, egress and required hardware before the City final.',
     'Quality Control',3,'Urgent',1,'Supervisor / Electrician',true,true,false),
    ('Complete and document final deficiencies','Final Inspection & Occupancy Letter',
     'Complete the internal deficiency review, correct all readiness items and attach proof before requesting or attending final inspection.',
     'Quality Control',1,'Urgent',1,'Supervisor / Site Crew',true,true,false);

  INSERT INTO public.task_templates(
    phase_template_id, project_template_id, name, description, task_type,
    position, priority, required, default_duration_days, suggested_role,
    inspection_required, evidence_required, created_at, updated_at
  )
  SELECT ph.id, v_template, mt.task_name, mt.task_description, mt.task_type,
         mt.task_position, mt.task_priority, true, mt.task_days, mt.task_role,
         mt.needs_inspection, mt.needs_evidence, now(), now()
  FROM _secondary_suite_missing_tasks mt
  JOIN public.phase_templates ph
    ON ph.project_template_id=v_template AND ph.name=mt.phase_name
  WHERE NOT EXISTS (
    SELECT 1 FROM public.task_templates tt
    WHERE tt.phase_template_id=ph.id AND tt.name=mt.task_name
  );

  SELECT id INTO v_project
  FROM public.projects
  WHERE lower(title) LIKE '%2992%trombley%'
  ORDER BY created_at DESC LIMIT 1;

  IF v_project IS NOT NULL THEN
    SELECT assignee_id, supervisor_id INTO v_assignee, v_supervisor
    FROM public.tasks WHERE project_id=v_project
    ORDER BY ((assignee_id IS NOT NULL)::integer + (supervisor_id IS NOT NULL)::integer) DESC, created_at
    LIMIT 1;

    INSERT INTO public.tasks(
      project_id, phase_id, phase, task_template_id, title, description,
      task_type, status, priority, progress, is_required, assignee_id,
      supervisor_id, start_date, due_date, tags, created_at, updated_at
    )
    SELECT v_project, pp.id, pp.name, tt.id, mt.task_name,
           mt.task_description, mt.task_type,
           CASE WHEN mt.make_current THEN 'In Progress' ELSE 'To Do' END,
           mt.task_priority, 0, true, v_assignee, v_supervisor,
           CASE WHEN mt.make_current THEN current_date ELSE pp.start_date END,
           CASE WHEN mt.make_current THEN current_date ELSE pp.end_date END,
           '[]'::jsonb, now(), now()
    FROM _secondary_suite_missing_tasks mt
    JOIN public.project_phases pp
      ON pp.project_id=v_project AND pp.name=mt.phase_name
    JOIN public.phase_templates ph
      ON ph.project_template_id=v_template AND ph.name=mt.phase_name
    JOIN public.task_templates tt
      ON tt.phase_template_id=ph.id AND tt.name=mt.task_name
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.project_id=v_project AND t.phase_id=pp.id AND t.title=mt.task_name
    );

    UPDATE public.project_phases
    SET status='In Progress', updated_at=now()
    WHERE project_id=v_project AND name='Permit Review & Approval';

    UPDATE public.projects
    SET phase='Permit Review & Approval', status='In Progress', updated_at=now()
    WHERE id=v_project;

    INSERT INTO public.project_activity_log(project_id,user_id,action,object_type,new_value,reason,created_at)
    VALUES (
      v_project, auth.uid(), 'secondary_suite_tasks_completed', 'project_template',
      jsonb_build_object('template_version','4.0','added_tasks',9,'current_task','Pay City permit fee'),
      'Completed phase task coverage and recorded the current permit-fee work', now()
    );
  END IF;
END $$;
