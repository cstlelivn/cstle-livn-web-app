-- Idempotent project-plan import for the existing KB - 1846 Scarth project.
-- Existing task assignees are preserved on re-run. Materials supplied by the
-- Super Admin are approved planning records; "None" creates no material row.
DO $migration$
DECLARE
  v_project_id uuid;
  v_supervisor_id uuid;
  v_phase_id uuid;
  v_task_id uuid;
  phase_row record;
  task_row record;
  material_name text;
BEGIN
  SELECT id, supervisor_id INTO v_project_id, v_supervisor_id
  FROM public.projects
  WHERE id='8e05880a-93ce-4601-b642-ee3aeaac5fef'
    AND title ILIKE '%1846 Scarth%';

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Scarth Street project was not found';
  END IF;

  IF EXISTS(SELECT 1 FROM public.projects WHERE id=v_project_id AND status='Completed') THEN
    RAISE EXCEPTION 'Scarth Street project is closed';
  END IF;

  -- The live audit confirmed this project had zero tasks and zero related
  -- procurement/QC/inspection records. Remove its unused template phases only
  -- on the first import; re-runs retain the imported structure.
  IF NOT EXISTS(SELECT 1 FROM public.tasks WHERE project_id=v_project_id) THEN
    DELETE FROM public.project_phases WHERE project_id=v_project_id;
  END IF;

  UPDATE public.projects SET
    title='Scarth Street Commercial Renovation (KB 1846 Scarth)',
    description='Commercial tenant improvement consisting of washroom reconfiguration, millwork installation, drywall, framing, wall panels, and finish carpentry. Electrical, plumbing, flooring, HVAC, ceiling grid, and fire protection are by others.',
    status='In Progress', phase='Project Mobilization', progress=11, updated_at=now()
  WHERE id=v_project_id;

  FOR phase_row IN
    SELECT * FROM jsonb_to_recordset($json$
      [
        {"name":"Project Mobilization","position":0,"status":"In Progress","progress":83},
        {"name":"Millwork Preparation","position":1,"status":"In Progress","progress":0},
        {"name":"Demolition","position":2,"status":"Not Started","progress":0},
        {"name":"Steel Stud Framing","position":3,"status":"Not Started","progress":0},
        {"name":"Rough In By Others","position":4,"status":"Not Started","progress":0},
        {"name":"Final Millwork","position":5,"status":"Not Started","progress":0},
        {"name":"Drywall","position":6,"status":"Not Started","progress":0},
        {"name":"Finish Carpentry","position":7,"status":"Not Started","progress":0},
        {"name":"Project Closeout","position":8,"status":"Not Started","progress":0}
      ]
    $json$) AS x(name text, position integer, status text, progress integer)
  LOOP
    SELECT id INTO v_phase_id FROM public.project_phases
    WHERE project_id=v_project_id AND name=phase_row.name LIMIT 1;
    IF v_phase_id IS NULL THEN
      INSERT INTO public.project_phases(project_id,name,position,status,progress,qc_status,created_at,updated_at)
      VALUES(v_project_id,phase_row.name,phase_row.position,phase_row.status,phase_row.progress,'Not Started',now(),now())
      RETURNING id INTO v_phase_id;
    ELSE
      UPDATE public.project_phases SET position=phase_row.position,status=phase_row.status,
        progress=phase_row.progress,updated_at=now() WHERE id=v_phase_id;
    END IF;
  END LOOP;

  FOR task_row IN
    SELECT * FROM jsonb_to_recordset($json$
      [
        {"phase":"Project Mobilization","title":"Site Setup and Protection","description":"Protect finished surfaces and prepare work area.","hours":2,"crew":1,"status":"To Do","materials":["Floor protection","Poly","Tape"]},
        {"phase":"Project Mobilization","title":"Remove Existing Wall Signage","description":"Remove all existing signage and patch minor damage.","hours":2,"crew":1,"status":"Completed","materials":["Putty","Sandpaper"]},
        {"phase":"Project Mobilization","title":"Prepare Walls for Painting","description":"Patch and sand walls prior to painting.","hours":4,"crew":1,"status":"Completed","materials":["Drywall compound","Sandpaper"]},
        {"phase":"Project Mobilization","title":"Prime Walls","description":"Apply primer to prepared wall surfaces.","hours":3,"crew":1,"status":"Completed","materials":["Primer","Roller sleeves","Brushes"]},
        {"phase":"Project Mobilization","title":"First Coat Paint","description":"Apply first finish coat.","hours":4,"crew":1,"status":"Completed","materials":["Paint"]},
        {"phase":"Project Mobilization","title":"Second Coat Paint","description":"Apply second finish coat.","hours":4,"crew":1,"status":"Completed","materials":["Paint"]},

        {"phase":"Millwork Preparation","title":"Dry Fit Reception Cabinets","description":"Position all cabinets in final layout without permanently fastening them.","hours":4,"crew":2,"status":"To Do","materials":["Shims","Laser level"]},
        {"phase":"Millwork Preparation","title":"Level and Align Cabinets","description":"Adjust all cabinets until properly aligned.","hours":2,"crew":2,"status":"To Do","materials":["Shims"]},
        {"phase":"Millwork Preparation","title":"Anchor Front Reception Counter","description":"Secure only the front counter to the concrete floor.","hours":2,"crew":2,"status":"To Do","materials":["Concrete anchors or powder actuated fasteners"]},
        {"phase":"Millwork Preparation","title":"Build Machine Support Frame","description":"Build structural support inside the machine opening.","hours":3,"crew":1,"status":"To Do","materials":["2x4 lumber or steel framing","Screws"]},
        {"phase":"Millwork Preparation","title":"Install Remaining Wall Panels","description":"Complete decorative wall panel installation.","hours":5,"crew":2,"status":"To Do","materials":["Wall panels","Construction adhesive","Finish nails","Trim"]},
        {"phase":"Millwork Preparation","title":"Install Panel Trims","description":"Install finishing trims around wall panels.","hours":2,"crew":1,"status":"To Do","materials":["Trim","Construction adhesive","Brad nails"]},

        {"phase":"Demolition","title":"Protect Finished Millwork","description":"Protect completed cabinets and panels before demolition.","hours":1,"crew":1,"status":"To Do","materials":["Poly","Tape","Cardboard"]},
        {"phase":"Demolition","title":"Remove Existing Drywall Partitions","description":"Remove drywall indicated on demolition drawings.","hours":4,"crew":2,"status":"To Do","materials":["Garbage bags"]},
        {"phase":"Demolition","title":"Remove Steel Stud Framing","description":"Remove existing steel stud partitions.","hours":3,"crew":2,"status":"To Do","materials":["Cutting discs"]},
        {"phase":"Demolition","title":"Remove Existing Tiled Wall","description":"Demolish tiled washroom wall for new layout.","hours":5,"crew":2,"status":"To Do","materials":["Garbage bags"]},
        {"phase":"Demolition","title":"Remove Existing Door and Frame","description":"Remove washroom door and frame.","hours":2,"crew":2,"status":"To Do","materials":[]},
        {"phase":"Demolition","title":"Site Cleanup","description":"Remove demolition debris and prepare for framing.","hours":2,"crew":2,"status":"To Do","materials":["Garbage bags","Broom"]},

        {"phase":"Steel Stud Framing","title":"Layout New Washrooms","description":"Mark new wall layout according to drawings.","hours":2,"crew":1,"status":"To Do","materials":["Chalk line","Layout markers"]},
        {"phase":"Steel Stud Framing","title":"Frame Accessible Washroom","description":"Build new accessible washroom framing.","hours":6,"crew":2,"status":"To Do","materials":["Steel studs","Steel track","Framing screws"]},
        {"phase":"Steel Stud Framing","title":"Frame New Washroom","description":"Construct additional washroom.","hours":5,"crew":2,"status":"To Do","materials":["Steel studs","Steel track","Framing screws"]},
        {"phase":"Steel Stud Framing","title":"Relocate Existing Door Opening","description":"Frame new door opening and close previous opening.","hours":4,"crew":2,"status":"To Do","materials":["Steel studs","Steel track","Framing screws"]},
        {"phase":"Steel Stud Framing","title":"Install Blocking","description":"Install backing for accessories and grab bars.","hours":2,"crew":1,"status":"To Do","materials":["Plywood blocking","Screws"]},

        {"phase":"Rough In By Others","title":"Prepare Site For Trades","description":"Coordinate work area for plumbing and electrical.","hours":1,"crew":1,"status":"To Do","materials":[]},
        {"phase":"Rough In By Others","title":"Framing Adjustments","description":"Complete framing changes requested after rough in.","hours":2,"crew":1,"status":"To Do","materials":["Steel studs","Track","Screws"]},

        {"phase":"Final Millwork","title":"Permanently Install Cabinets","description":"Fasten cabinets after plumbing inspection.","hours":4,"crew":2,"status":"To Do","materials":["Cabinet screws","Shims"]},
        {"phase":"Final Millwork","title":"Install Decorative Cabinet Panels","description":"Install finished cabinet faces and fillers.","hours":3,"crew":1,"status":"To Do","materials":["Panels","Construction adhesive","Brad nails"]},
        {"phase":"Final Millwork","title":"Final Cabinet Adjustments","description":"Adjust doors, drawers, alignment and hardware.","hours":2,"crew":1,"status":"To Do","materials":["Hardware"]},

        {"phase":"Drywall","title":"Install Type X Drywall","description":"Install drywall on new framing.","hours":8,"crew":2,"status":"To Do","materials":["5/8 Type X drywall","Drywall screws"]},
        {"phase":"Drywall","title":"Install Corner Bead","description":"Install metal corner beads.","hours":2,"crew":1,"status":"To Do","materials":["Corner bead"]},
        {"phase":"Drywall","title":"Tape Drywall","description":"Tape all drywall joints.","hours":3,"crew":1,"status":"To Do","materials":["Joint tape","Mud"]},
        {"phase":"Drywall","title":"First Coat","description":"Apply first coat of compound.","hours":3,"crew":1,"status":"To Do","materials":["Joint compound"]},
        {"phase":"Drywall","title":"Second Coat","description":"Apply second coat.","hours":3,"crew":1,"status":"To Do","materials":["Joint compound"]},
        {"phase":"Drywall","title":"Finish Coat","description":"Apply finish coat.","hours":3,"crew":1,"status":"To Do","materials":["Joint compound"]},
        {"phase":"Drywall","title":"Sand Drywall","description":"Sand walls ready for painting.","hours":3,"crew":1,"status":"To Do","materials":["Sandpaper"]},

        {"phase":"Finish Carpentry","title":"Install Doors","description":"Install new washroom doors.","hours":3,"crew":2,"status":"To Do","materials":["Doors","Hinges","Screws"]},
        {"phase":"Finish Carpentry","title":"Install Door Hardware","description":"Install handles and hardware.","hours":2,"crew":1,"status":"To Do","materials":["Door hardware"]},
        {"phase":"Finish Carpentry","title":"Install Casing","description":"Install door casing.","hours":2,"crew":1,"status":"To Do","materials":["Door casing","Brad nails"]},
        {"phase":"Finish Carpentry","title":"Install Rubber Base","description":"Install new rubber base throughout modified areas.","hours":3,"crew":1,"status":"To Do","materials":["Rubber base","Rubber base adhesive"]},
        {"phase":"Finish Carpentry","title":"Caulking and Touch Up","description":"Complete final finish caulking.","hours":2,"crew":1,"status":"To Do","materials":["Paintable caulking"]},

        {"phase":"Project Closeout","title":"Final Cleanup","description":"Remove debris and clean work area.","hours":3,"crew":2,"status":"To Do","materials":["Cleaning supplies","Garbage bags"]},
        {"phase":"Project Closeout","title":"Client Deficiency Walkthrough","description":"Review completed work and document deficiencies.","hours":2,"crew":1,"status":"To Do","materials":[]},
        {"phase":"Project Closeout","title":"Complete Deficiencies","description":"Complete all approved deficiency items.","hours":4,"crew":1,"status":"To Do","materials":["Variable"]},
        {"phase":"Project Closeout","title":"Final Project Handover","description":"Complete final walkthrough and close project.","hours":1,"crew":1,"status":"To Do","materials":[]}
      ]
    $json$) AS x(phase text,title text,description text,hours numeric,crew integer,status text,materials jsonb)
  LOOP
    SELECT id INTO v_phase_id FROM public.project_phases
    WHERE project_id=v_project_id AND name=task_row.phase LIMIT 1;
    IF v_phase_id IS NULL THEN RAISE EXCEPTION 'Missing phase: %',task_row.phase; END IF;

    SELECT id INTO v_task_id FROM public.tasks
    WHERE project_id=v_project_id AND title=task_row.title LIMIT 1;
    IF v_task_id IS NULL THEN
      INSERT INTO public.tasks(project_id,phase_id,phase,title,description,status,priority,
        progress,task_type,estimated_hours,crew_required,supervisor_id,photos_not_required,
        completed_date,created_at,updated_at)
      VALUES(v_project_id,v_phase_id,task_row.phase,task_row.title,task_row.description,
        task_row.status,'Medium',CASE WHEN task_row.status='Completed' THEN 100 ELSE 0 END,
        'Trade Work',task_row.hours,task_row.crew,v_supervisor_id,false,
        CASE WHEN task_row.status='Completed' THEN now() ELSE NULL END,now(),now())
      RETURNING id INTO v_task_id;
    ELSE
      UPDATE public.tasks SET phase_id=v_phase_id,phase=task_row.phase,title=task_row.title,
        description=task_row.description,status=task_row.status,
        progress=CASE WHEN task_row.status='Completed' THEN 100 ELSE 0 END,
        estimated_hours=task_row.hours,crew_required=task_row.crew,
        supervisor_id=COALESCE(supervisor_id,v_supervisor_id),
        completed_date=CASE WHEN task_row.status='Completed' THEN COALESCE(completed_date,now()) ELSE NULL END,
        updated_at=now() WHERE id=v_task_id;
    END IF;

    FOR material_name IN SELECT jsonb_array_elements_text(task_row.materials)
    LOOP
      INSERT INTO public.task_materials(task_id,name,quantity,unit,provided_by,purchase_status,
        list_status,position,approved_at,created_at,updated_at)
      SELECT v_task_id,material_name,1,'unit','To Be Confirmed','To Be Confirmed',
        'Approved',(SELECT count(*) FROM public.task_materials WHERE task_id=v_task_id),now(),now(),now()
      WHERE NOT EXISTS(SELECT 1 FROM public.task_materials WHERE task_id=v_task_id AND name=material_name);
    END LOOP;
  END LOOP;
END;
$migration$;

