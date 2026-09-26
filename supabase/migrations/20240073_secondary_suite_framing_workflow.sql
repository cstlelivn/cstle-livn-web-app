-- Secondary Suite Development v5: field-accurate framing and backing workflow.
-- Dimensions below are company planning defaults, not substitutes for the
-- issued drawings, product instructions, engineering or the adopted code.

DO $$
DECLARE
  v_template uuid;
  v_project uuid;
  v_assignee uuid;
  v_supervisor uuid;
BEGIN
  SELECT id INTO v_template FROM public.project_templates
  WHERE name='Secondary Suite Development' AND active=true
  ORDER BY created_at DESC LIMIT 1;
  IF v_template IS NULL THEN RAISE EXCEPTION 'Active Secondary Suite Development template not found'; END IF;

  UPDATE public.project_templates SET version='5.0',updated_at=now() WHERE id=v_template;

  -- Make the existing broad tasks precise.
  UPDATE public.task_templates tt SET
    name='Lay out all walls and verify square',
    description='Snap the complete approved layout. Check room dimensions, diagonals, square, parallel and perpendicular wall lines, usable clearances, door locations and services before fastening any plate. Record approved field adjustments.',
    position=2, updated_at=now()
  FROM public.phase_templates ph
  WHERE tt.phase_template_id=ph.id AND ph.project_template_id=v_template
    AND ph.name='Initial Framing' AND tt.name='Lay out approved walls and openings';

  UPDATE public.task_templates tt SET
    name='Install pressure-treated floor plates',
    description='Install pressure-treated floor plates on the approved layout. Use the specified concrete fastening system and spacing from the issued detail and fastener manufacturer; do not substitute an unverified universal spacing. Keep levelling areas contained by the installed plates where that method is approved.',
    position=4, updated_at=now()
  FROM public.phase_templates ph
  WHERE tt.phase_template_id=ph.id AND ph.project_template_id=v_template
    AND ph.name='Initial Framing' AND tt.name='Frame perimeter, partitions, doors and fire separations';

  UPDATE public.task_templates tt SET
    name='Complete floating-wall framing QC',
    description='Verify wall lines, dimensions, plumb, level, square, floating clearances, top attachment, required vertical movement, door rough openings, backing, fire/sound continuity and access for following trades before releasing the area.',
    position=9, updated_at=now()
  FROM public.phase_templates ph
  WHERE tt.phase_template_id=ph.id AND ph.project_template_id=v_template
    AND ph.name='Initial Framing' AND tt.name='Complete initial framing QC';

  UPDATE public.task_templates tt SET
    name='Install dust control and protect retained finishes',
    description='Install the required dust separation and protect every retained floor, stair, wall, fixture and access route before layout or fastening begins.',
    updated_at=now()
  FROM public.phase_templates ph
  WHERE tt.phase_template_id=ph.id AND ph.project_template_id=v_template
    AND ph.name='Initial Framing' AND tt.name='Set up site and protect retained finishes';

  UPDATE public.task_templates tt SET
    description='After plumbing and HVAC routes are fixed, frame bulkheads/soffits around the actual services. Maintain required clearances, access, straight lines, fire separation and drywall support.',
    position=0, updated_at=now()
  FROM public.phase_templates ph
  WHERE tt.phase_template_id=ph.id AND ph.project_template_id=v_template
    AND ph.name='Bulkheads, Soffits & Blocking' AND tt.name='Frame service bulkheads and soffits';

  UPDATE public.task_templates tt SET
    name='Install drywall backing and edge support',
    description='Install backing at every unsupported drywall edge, transition, inside corner, ceiling edge, bulkhead and opening required for secure board attachment.',
    position=1, updated_at=now()
  FROM public.phase_templates ph
  WHERE tt.phase_template_id=ph.id AND ph.project_template_id=v_template
    AND ph.name='Bulkheads, Soffits & Blocking' AND tt.name='Install backing and blocking';

  CREATE TEMP TABLE _framing_tasks(
    task_name text, phase_name text, task_description text, task_type text,
    task_position integer, priority text, duration_days integer,
    suggested_role text, evidence_required boolean
  ) ON COMMIT DROP;

  INSERT INTO _framing_tasks VALUES
    ('Clear and prepare framing work area','Initial Framing',
     'Remove obstructions and debris, establish safe access and protect all retained finishes. Confirm the issued permit and approved layout are available onsite before framing begins.',
     'Site Work',0,'High',1,'Supervisor / Framing Crew',true),
    ('Survey floor level and record high and low areas','Initial Framing',
     'Use a laser to map the slab, mark high/low areas and decide where correction is required. Record readings and the approved levelling approach before installing walls.',
     'Site Work',1,'High',1,'Supervisor / Framing Crew',true),
    ('Complete controlled floor levelling','Initial Framing',
     'Where approved, install the floor plates first so the levelling material is contained, then prepare, prime and place self-levelling material only within the required areas. Follow the product limits and protect drains/openings.',
     'Site Work',3,'High',1,'Supervisor / Framing Crew',true),
    ('Build floating wall sections to verified plate dimensions','Initial Framing',
     'Build each wall from the verified floor-plate dimensions. Provide the required floating gap and movement detail; do not hard-code the gap where the approved drawing or local detail differs.',
     'Trade Work',5,'High',1,'Framing Crew',true),
    ('Stand, align and secure floating walls','Initial Framing',
     'Stand the wall sections, insert the temporary spacing block used to establish the specified floating gap, align plumb and square, secure the top, then install the approved long-nail floating connection at the specified interval (company field reference: approximately every 4 ft, subject to the approved detail).',
     'Trade Work',6,'High',1,'Framing Crew',true),
    ('Frame and verify door rough openings','Initial Framing',
     'Frame every opening from the selected door/frame schedule. Company estimating allowance is door slab width plus approximately 2.5–3 in, but the actual frame manufacturer rough-opening requirement governs. Verify head height, plumb, square and swing clearance.',
     'Trade Work',7,'High',1,'Framing Crew',true),
    ('Adjust layout for usable space and document changes','Initial Framing',
     'Review the framed layout for usable room dimensions, circulation, fixtures, doors and storage. Obtain approval and document any field adjustment before rough-in.',
     'Quality Control',8,'High',1,'Supervisor',true),
    ('Install accessory and fixture backing to backing schedule','Bulkheads, Soffits & Blocking',
     'Mark backing on the studs and photograph it before closing. Defaults are measured above finished floor (AFF) and must yield to approved drawings/product instructions: towel bar centreline 42–48 in; toilet-paper holder centreline about 26 in and 8–12 in forward of the bowl; stair handrail support for a rail top 34–38 in above the stair nosing line; TV backing centred on the approved screen/bracket location (typical screen centre 42–48 in AFF); vanity backing at the actual wall-hung vanity or countertop/cleat mounting line (typical finished top 34–36 in AFF). Grab bars, shower doors, mirrors/medicine cabinets, wall-hung fixtures, closet shelving, laundry accessories and other wall-mounted equipment require backing at the approved product/layout location. Kitchen cabinet backing is included only when drawings or the cabinet system require it.',
     'Trade Work',2,'High',1,'Framing Crew / Supervisor',true),
    ('Apply acoustic sealant and maintain sound/fire continuity','Bulkheads, Soffits & Blocking',
     'Apply the specified acoustic sealant/caulking at plates, perimeter joints and penetrations required by the approved sound/fire assembly. Confirm no unsealed bypass remains before insulation and board.',
     'Trade Work',3,'High',1,'Framing Crew',true),
    ('Photograph and approve concealed backing','Bulkheads, Soffits & Blocking',
     'Photograph each wall with identifiable room/location references, verify backing against the schedule and approved fixture layout, and obtain supervisor approval before insulation or drywall hides it.',
     'Quality Control',4,'High',1,'Supervisor',true);

  INSERT INTO public.task_templates(
    phase_template_id,project_template_id,name,description,task_type,position,
    priority,required,default_duration_days,suggested_role,
    inspection_required,evidence_required,created_at,updated_at
  )
  SELECT ph.id,v_template,ft.task_name,ft.task_description,ft.task_type,
         ft.task_position,ft.priority,true,ft.duration_days,ft.suggested_role,
         false,ft.evidence_required,now(),now()
  FROM _framing_tasks ft
  JOIN public.phase_templates ph
    ON ph.project_template_id=v_template AND ph.name=ft.phase_name
  WHERE NOT EXISTS(
    SELECT 1 FROM public.task_templates tt
    WHERE tt.phase_template_id=ph.id AND tt.name=ft.task_name
  );

  -- Normalize the field order after combining the earlier general framing
  -- tasks with the new detailed steps.
  UPDATE public.task_templates tt SET
    position=ord.position, updated_at=now()
  FROM public.phase_templates ph
  JOIN (VALUES
    ('Clear and prepare framing work area',0),
    ('Install dust control and protect retained finishes',1),
    ('Survey floor level and record high and low areas',2),
    ('Lay out all walls and verify square',3),
    ('Install pressure-treated floor plates',4),
    ('Complete controlled floor levelling',5),
    ('Build floating wall sections to verified plate dimensions',6),
    ('Stand, align and secure floating walls',7),
    ('Frame and verify door rough openings',8),
    ('Verify fire separations, draft stopping and structural backing',9),
    ('Adjust layout for usable space and document changes',10),
    ('Complete floating-wall framing QC',11)
  ) AS ord(task_name,position) ON true
  WHERE tt.phase_template_id=ph.id AND ph.project_template_id=v_template
    AND ph.name='Initial Framing' AND tt.name=ord.task_name;

  SELECT id INTO v_project FROM public.projects
  WHERE lower(title) LIKE '%2992%trombley%'
  ORDER BY created_at DESC LIMIT 1;

  IF v_project IS NOT NULL THEN
    SELECT assignee_id,supervisor_id INTO v_assignee,v_supervisor
    FROM public.tasks WHERE project_id=v_project
    ORDER BY ((assignee_id IS NOT NULL)::integer+(supervisor_id IS NOT NULL)::integer) DESC,created_at
    LIMIT 1;

    UPDATE public.tasks t SET
      title='Lay out all walls and verify square',
      description='Snap the complete approved layout. Check room dimensions, diagonals, square, parallel and perpendicular wall lines, usable clearances, door locations and services before fastening any plate. Record approved field adjustments.',
      updated_at=now()
    FROM public.project_phases pp
    WHERE t.phase_id=pp.id AND pp.project_id=v_project AND pp.name='Initial Framing'
      AND t.title='Lay out approved walls and openings';

    UPDATE public.tasks t SET
      title='Install pressure-treated floor plates',
      description='Install pressure-treated floor plates on the approved layout. Use the specified concrete fastening system and spacing from the issued detail and fastener manufacturer; do not substitute an unverified universal spacing. Keep levelling areas contained by the installed plates where that method is approved.',
      updated_at=now()
    FROM public.project_phases pp
    WHERE t.phase_id=pp.id AND pp.project_id=v_project AND pp.name='Initial Framing'
      AND t.title='Frame perimeter, partitions, doors and fire separations';

    UPDATE public.tasks t SET
      title='Complete floating-wall framing QC',
      description='Verify wall lines, dimensions, plumb, level, square, floating clearances, top attachment, required vertical movement, door rough openings, backing, fire/sound continuity and access for following trades before releasing the area.',
      updated_at=now()
    FROM public.project_phases pp
    WHERE t.phase_id=pp.id AND pp.project_id=v_project AND pp.name='Initial Framing'
      AND t.title='Complete initial framing QC';

    UPDATE public.tasks t SET
      title='Install dust control and protect retained finishes',
      description='Install the required dust separation and protect every retained floor, stair, wall, fixture and access route before layout or fastening begins.',
      updated_at=now()
    FROM public.project_phases pp
    WHERE t.phase_id=pp.id AND pp.project_id=v_project AND pp.name='Initial Framing'
      AND t.title='Set up site and protect retained finishes';

    UPDATE public.tasks t SET
      description='After plumbing and HVAC routes are fixed, frame bulkheads/soffits around the actual services. Maintain required clearances, access, straight lines, fire separation and drywall support.',
      updated_at=now()
    FROM public.project_phases pp
    WHERE t.phase_id=pp.id AND pp.project_id=v_project AND pp.name='Bulkheads, Soffits & Blocking'
      AND t.title='Frame service bulkheads and soffits';

    UPDATE public.tasks t SET
      title='Install drywall backing and edge support',
      description='Install backing at every unsupported drywall edge, transition, inside corner, ceiling edge, bulkhead and opening required for secure board attachment.',
      updated_at=now()
    FROM public.project_phases pp
    WHERE t.phase_id=pp.id AND pp.project_id=v_project AND pp.name='Bulkheads, Soffits & Blocking'
      AND t.title='Install backing and blocking';

    INSERT INTO public.tasks(
      project_id,phase_id,phase,task_template_id,title,description,task_type,
      status,priority,progress,is_required,assignee_id,supervisor_id,
      start_date,due_date,tags,created_at,updated_at
    )
    SELECT v_project,pp.id,pp.name,tt.id,ft.task_name,ft.task_description,
           ft.task_type,'To Do',ft.priority,0,true,v_assignee,v_supervisor,
           pp.start_date,pp.end_date,'[]'::jsonb,now(),now()
    FROM _framing_tasks ft
    JOIN public.project_phases pp
      ON pp.project_id=v_project AND pp.name=ft.phase_name
    JOIN public.phase_templates ph
      ON ph.project_template_id=v_template AND ph.name=ft.phase_name
    JOIN public.task_templates tt
      ON tt.phase_template_id=ph.id AND tt.name=ft.task_name
    WHERE NOT EXISTS(
      SELECT 1 FROM public.tasks t
      WHERE t.project_id=v_project AND t.phase_id=pp.id AND t.title=ft.task_name
    );

    UPDATE public.tasks t SET sequence=ord.position,updated_at=now()
    FROM public.project_phases pp
    JOIN (VALUES
      ('Clear and prepare framing work area',0),
      ('Install dust control and protect retained finishes',1),
      ('Survey floor level and record high and low areas',2),
      ('Lay out all walls and verify square',3),
      ('Install pressure-treated floor plates',4),
      ('Complete controlled floor levelling',5),
      ('Build floating wall sections to verified plate dimensions',6),
      ('Stand, align and secure floating walls',7),
      ('Frame and verify door rough openings',8),
      ('Verify fire separations, draft stopping and structural backing',9),
      ('Adjust layout for usable space and document changes',10),
      ('Complete floating-wall framing QC',11)
    ) AS ord(task_name,position) ON true
    WHERE t.phase_id=pp.id AND pp.project_id=v_project
      AND pp.name='Initial Framing' AND t.title=ord.task_name;

    INSERT INTO public.project_activity_log(project_id,user_id,action,object_type,new_value,reason,created_at)
    VALUES(v_project,auth.uid(),'framing_workflow_detailed','project_template',
      jsonb_build_object('template_version','5.0','added_tasks',10),
      'Converted framing and backing into the confirmed field sequence',now());
  END IF;
END $$;
