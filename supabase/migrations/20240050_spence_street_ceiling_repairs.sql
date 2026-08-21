-- 30 & 34 Spence Street Ceiling Repairs -- full work-breakdown seed
--
-- Creates one client (only if no existing client name-matches "Spence
-- Street" -- safe to re-run), one project, 10 ordered phases, and 24 tasks
-- with the full Work/Materials/Completion-criteria text from the supplied
-- work breakdown. Task-level "Materials and equipment" lists are kept as
-- readable text inside each task's description rather than structured
-- task_tools/task_materials rows, since several of them are administrative
-- items (checklists, access schedules, invoices) rather than physical
-- jobsite tools/materials -- ask if you want the genuinely physical items
-- (drywall, screws, caulk, ladders, etc.) broken out as real Tools &
-- Materials line items later.
--
-- NOT idempotent for the project/phases/tasks themselves (re-running this
-- file will create a second copy of the project) -- only the client
-- lookup is guarded. Run once.

DO $$
DECLARE
  v_client_id uuid;
  v_project_id uuid;
  v_phase uuid;
  v_task uuid;
BEGIN
  -- Client: reuse an existing client if one already matches this property.
  SELECT id INTO v_client_id FROM public.clients WHERE name ILIKE '%Spence Street%' LIMIT 1;
  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (name, email, phone, company, status, source, notes, created_at, updated_at)
    VALUES (
      '30 & 34 Spence Street (Property Management)',
      'update-me@cstlelivn.ca',
      NULL,
      NULL,
      'Active',
      'Direct',
      'Placeholder client auto-created for the Spence Street ceiling repair project. Update with the real property management contact name/email/phone.',
      now(), now()
    ) RETURNING id INTO v_client_id;
  END IF;

  -- Project
  INSERT INTO public.projects (title, client, location, budget, spent, progress, status, description, created_at, updated_at)
  VALUES (
    '30 & 34 Spence Street Ceiling Repairs',
    v_client_id,
    '30 & 34 Spence Street',
    3000,
    0,
    0,
    'Planning',
    E'Two apartment buildings, approximately 10 upper-floor units affected.\n'
    'Primary cause: ceiling damage resulting from roofing work.\n'
    'Agreed contract price: $3,000.\n\n'
    'MASTER MATERIAL LIST\n'
    'Drywall: replacement drywall matching existing thickness/type, wood or approved drywall backing, drywall screws, drywall tape, joint compound, setting-type compound if required.\n'
    'Crack and fastener: paintable white acrylic or siliconized acrylic caulk, additional drywall screws, joint compound.\n'
    'Texture and painting: aerosol ceiling texture, drywall primer, stain-blocking primer if necessary, flat white ceiling paint, roller sleeves, brushes, paint trays.\n'
    'Protection and cleanup: drop sheets, plastic sheeting, masking paper, painter''s tape, furniture covers, garbage bags, cleaning cloths, sanding sponges or screens.\n'
    'Safety and access: step ladder, safety glasses, work gloves, dust mask or respirator, portable work light, vacuum or dust extractor.\n\n'
    'EXCLUDED WORK REQUIRING SEPARATE APPROVAL\n'
    '- Additional ceiling openings beyond the agreed scope\n'
    '- Full taped repair of cracks assigned to caulking treatment\n'
    '- Recurring cracks caused by building or roof movement\n'
    '- Roof repairs\n'
    '- Framing or structural repairs\n'
    '- Wet insulation removal or replacement\n'
    '- Mould or hazardous-material remediation\n'
    '- Electrical, plumbing, or mechanical repairs\n'
    '- Complete ceiling repainting\n'
    '- Repairs necessary to restore a specialized fire-rated assembly unless specifically included\n'
    '- Damage discovered after the original inspection',
    now(), now()
  ) RETURNING id INTO v_project_id;

  -- ===========================================================================
  -- PHASE 1 -- Inspection and Temporary Protection
  -- ===========================================================================
  INSERT INTO public.project_phases (project_id, name, position, status, created_at, updated_at)
  VALUES (v_project_id, 'Inspection and Temporary Protection', 0, 'Not Started', now(), now())
  RETURNING id INTO v_phase;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Inspection and Temporary Protection',
    'Task 1.1 — Inspect and document ceiling damage',
    E'Work:\n- Confirm which apartment units are affected.\n- Record the number and approximate size of ceiling openings.\n- Identify line cracks, nail pops, loose drywall, and damaged texture.\n- Photograph each affected area.\n- Assign each repair a unit number and repair type.\n- Note any additional or previously unidentified damage.\n\n'
    'Materials and equipment:\n- Phone or camera\n- Inspection light\n- Measuring tape\n- Step ladder\n- Unit inspection checklist\n- Pencil or removable marking tape',
    'Every affected area is photographed, categorized, and connected to the correct unit.',
    'To Do', 'Medium', 0, now(), now())
  RETURNING id INTO v_task;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Inspection and Temporary Protection',
    'Task 1.2 — Temporarily cover ceiling openings',
    E'Work:\n- Place drywall over approximately six ceiling openings.\n- Secure the temporary covering so the openings remain safely covered during roofing work.\n- Leave the areas accessible for permanent finishing after the roofing work is completed.\n\n'
    'Materials and equipment:\n- Drywall pieces\n- Drywall screws\n- Suitable drywall backing, where required\n- Drill or screw gun\n- Utility knife\n- Drywall square\n- Step ladder\n- Dust sheets',
    'All identified openings are safely covered until permanent repairs can begin.',
    'To Do', 'Medium', 1, now(), now());

  -- ===========================================================================
  -- PHASE 2 -- Pre-Repair Coordination
  -- ===========================================================================
  INSERT INTO public.project_phases (project_id, name, position, status, created_at, updated_at)
  VALUES (v_project_id, 'Pre-Repair Coordination', 1, 'Not Started', now(), now())
  RETURNING id INTO v_phase;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Pre-Repair Coordination',
    'Task 2.1 — Confirm roofing work is complete',
    E'Work:\n- Obtain confirmation that roofing work above the affected units is complete.\n- Confirm that workers will no longer be walking or working directly above the damaged ceilings.\n- Confirm that the roof is weather-tight before permanently closing the openings.\n\n'
    'Materials and equipment:\n- Roofing completion confirmation\n- Project communication record\n- Unit access schedule',
    'Roofing completion is confirmed and permanent ceiling repairs are authorized.',
    'To Do', 'Medium', 0, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Pre-Repair Coordination',
    'Task 2.2 — Schedule access to apartment units',
    E'Work:\n- Prepare the list of affected units.\n- Coordinate entry dates and times with property management.\n- Provide occupants with the required notice.\n- Arrange repairs efficiently by building, floor, and unit.\n- Record inaccessible units and reschedule them.\n\n'
    'Materials and equipment:\n- Unit access list\n- Contact information\n- Entry notices\n- Project calendar',
    'Access is confirmed for every affected unit.',
    'To Do', 'Medium', 1, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Pre-Repair Coordination',
    'Task 2.3 — Reinspect for moisture and additional damage',
    E'Work:\n- Check the ceiling openings and surrounding drywall for dampness.\n- Look for staining, sagging drywall, mould-like growth, or damaged insulation.\n- Notify property management before proceeding if additional damage is discovered.\n- Do not permanently close wet areas.\n\n'
    'Materials and equipment:\n- Inspection light\n- Moisture meter, if available\n- Camera\n- Personal protective equipment',
    'Repair areas are dry and suitable for closing.',
    'To Do', 'Medium', 2, now(), now());

  -- ===========================================================================
  -- PHASE 3 -- Site and Unit Protection
  -- ===========================================================================
  INSERT INTO public.project_phases (project_id, name, position, status, created_at, updated_at)
  VALUES (v_project_id, 'Site and Unit Protection', 2, 'Not Started', now(), now())
  RETURNING id INTO v_phase;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Site and Unit Protection',
    'Task 3.1 — Prepare each work area',
    E'Work:\n- Move or cover furniture beneath the repair.\n- Protect floors, walls, fixtures, and personal belongings.\n- Isolate the immediate work area where practical.\n- Provide ventilation while using compound, texture, caulking, primer, and paint.\n- Set up safe ladder access.\n\n'
    'Materials and equipment:\n- Drop sheets\n- Plastic sheeting\n- Painter''s tape\n- Masking paper\n- Furniture covers\n- Step ladder\n- Safety glasses\n- Dust mask or respirator\n- Work gloves\n- Portable work light',
    'The surrounding area is protected before repair work begins.',
    'To Do', 'Medium', 0, now(), now());

  -- ===========================================================================
  -- PHASE 4 -- Drywall Opening Repairs
  -- ===========================================================================
  INSERT INTO public.project_phases (project_id, name, position, status, created_at, updated_at)
  VALUES (v_project_id, 'Drywall Opening Repairs', 3, 'Not Started', now(), now())
  RETURNING id INTO v_phase;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Drywall Opening Repairs',
    'Task 4.1 — Prepare damaged ceiling openings',
    E'Work:\n- Remove the temporary covering where necessary.\n- Remove loose, broken, or unsupported drywall.\n- Square the openings to create clean repair edges.\n- Confirm that the surrounding drywall is solid and dry.\n- Install backing where the existing framing does not support the patch edges.\n\n'
    'Materials and equipment:\n- Utility knife\n- Drywall saw\n- Oscillating tool, if required\n- Drywall square\n- Measuring tape\n- Wood or approved drywall backing\n- Backing screws\n- Drywall screws\n- Debris bags',
    'Each opening has clean edges and sufficient support for the permanent patch.',
    'To Do', 'Medium', 0, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Drywall Opening Repairs',
    'Task 4.2 — Install permanent drywall patches',
    E'Work:\n- Measure and cut replacement drywall.\n- Fit patches into the prepared openings.\n- Secure patches to framing or installed backing.\n- Ensure screw heads are slightly recessed without breaking the drywall paper.\n- Verify that the patch is level with the surrounding ceiling.\n\n'
    'Materials and equipment:\n- Replacement drywall matching the existing thickness\n- Drywall screws\n- Drywall backing\n- Drill or screw gun\n- Utility knife\n- Drywall rasp\n- Measuring tape\n- Drywall square',
    'Every patch is firmly secured and sits flush with the existing ceiling.',
    'To Do', 'Medium', 1, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Drywall Opening Repairs',
    'Task 4.3 — Tape and apply joint compound',
    E'Work:\n- Apply joint compound to the patch joints.\n- Embed drywall tape over all patch seams.\n- Cover screw heads.\n- Apply additional coats as required.\n- Feather the compound beyond the patch edges.\n- Allow adequate drying time between coats.\n\n'
    'Materials and equipment:\n- Drywall joint compound\n- Paper or approved mesh drywall tape\n- Setting-type compound, if needed\n- Mud pan\n- Taping knives in assorted sizes\n- Mixing paddle and clean bucket, if required',
    'Seams, fasteners, and patch edges are covered and feathered into the surrounding ceiling.',
    'To Do', 'Medium', 2, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Drywall Opening Repairs',
    'Task 4.4 — Sand and inspect drywall patches',
    E'Work:\n- Sand the dried joint compound.\n- Remove ridges, tool marks, and raised edges.\n- Check the patches under side lighting.\n- Apply touch-up compound where required.\n- Perform final sanding after touch-ups dry.\n- Remove sanding dust before priming.\n\n'
    'Materials and equipment:\n- Sanding sponges\n- Pole sander\n- Fine-grit sanding screens\n- Work light\n- Dust extractor or vacuum\n- Tack cloth or clean dry cloth\n- Dust mask or respirator',
    'Patches are smooth, properly feathered, and ready for primer and texture.',
    'To Do', 'Medium', 3, now(), now());

  -- ===========================================================================
  -- PHASE 5 -- Line-Crack Treatment
  -- ===========================================================================
  INSERT INTO public.project_phases (project_id, name, position, status, description, created_at, updated_at)
  VALUES (v_project_id, 'Line-Crack Treatment', 4, 'Not Started',
    'Scope note: this is the agreed economical treatment for minor line cracks. It does not include opening, taping, and fully refinishing the cracks. Recurring cracks caused by movement are not guaranteed against reappearance.',
    now(), now())
  RETURNING id INTO v_phase;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Line-Crack Treatment',
    'Task 5.1 — Prepare minor line cracks',
    E'Work:\n- Identify cracks covered by the agreed caulking treatment.\n- Remove loose paint, texture, or debris immediately around each crack.\n- Clean and dry the crack.\n- Confirm that the crack does not require a larger drywall patch.\n- Document any crack that appears wider or more severe than originally identified.\n\n'
    'Materials and equipment:\n- Scraper\n- Utility knife\n- Cleaning cloth\n- Small brush\n- Vacuum\n- Painter''s tape, if required',
    'Each minor crack is clean, dry, and ready for caulking.',
    'To Do', 'Medium', 0, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Line-Crack Treatment',
    'Task 5.2 — Apply paintable white caulking',
    E'Work:\n- Apply a narrow bead of paintable white caulking along the crack.\n- Tool the caulking smoothly.\n- Remove excess material.\n- Allow the caulking to cure according to the manufacturer''s directions.\n- Do not use non-paintable pure silicone.\n\n'
    'Materials and equipment:\n- White paintable acrylic or siliconized acrylic caulk\n- Caulking gun\n- Caulking tool\n- Damp cloth\n- Painter''s tape\n- Disposable gloves',
    'Cracks are neatly sealed and ready to receive paint where required.',
    'To Do', 'Medium', 1, now(), now());

  -- ===========================================================================
  -- PHASE 6 -- Nail Pop and Fastener Repairs
  -- ===========================================================================
  INSERT INTO public.project_phases (project_id, name, position, status, created_at, updated_at)
  VALUES (v_project_id, 'Nail Pop and Fastener Repairs', 5, 'Not Started', now(), now())
  RETURNING id INTO v_phase;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Nail Pop and Fastener Repairs',
    'Task 6.1 — Prepare nail-pop areas',
    E'Work:\n- Remove loose paint, texture, paper, and compound around each exposed fastener.\n- Check whether the drywall is loose around the fastener.\n- Reset or remove the exposed fastener where appropriate.\n- Add a drywall screw beside the original fastener when needed to secure the board.\n\n'
    'Materials and equipment:\n- Scraper\n- Utility knife\n- Hammer\n- Drill or screw gun\n- Drywall screws\n- Dust brush or vacuum',
    'Loose material is removed and the drywall is securely fastened.',
    'To Do', 'Medium', 0, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Nail Pop and Fastener Repairs',
    'Task 6.2 — Finish nail-pop areas',
    E'Work:\n- Apply joint compound over the fastener and surrounding damaged area.\n- Allow the compound to dry.\n- Apply additional compound if required.\n- Sand the repair smooth.\n- Remove dust before priming and texturing.\n\n'
    'Materials and equipment:\n- Joint compound\n- Small taping knives\n- Sanding sponge\n- Dust cloth\n- Primer',
    'Fasteners are concealed and the repaired areas are ready for texture and paint.',
    'To Do', 'Medium', 1, now(), now());

  -- ===========================================================================
  -- PHASE 7 -- Texture Restoration
  -- ===========================================================================
  INSERT INTO public.project_phases (project_id, name, position, status, created_at, updated_at)
  VALUES (v_project_id, 'Texture Restoration', 6, 'Not Started', now(), now())
  RETURNING id INTO v_phase;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Texture Restoration',
    'Task 7.1 — Prepare for texture application',
    E'Work:\n- Confirm that all compound and caulking have dried.\n- Prime exposed drywall and joint compound where required.\n- Mask the area surrounding each repair.\n- Test the spray pattern on scrap material.\n- Adjust spray distance and pattern to resemble the existing ceiling.\n\n'
    'Materials and equipment:\n- Drywall primer\n- Brush or small roller\n- Masking plastic\n- Painter''s tape\n- Scrap drywall or cardboard\n- Drop sheets',
    'Repairs are sealed, surrounding surfaces are protected, and the texture pattern has been tested.',
    'To Do', 'Medium', 0, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Texture Restoration',
    'Task 7.2 — Apply ceiling texture',
    E'Work:\n- Apply spray texture to the patched and nail-pop areas.\n- Feather the new texture into the existing texture.\n- Apply additional light coats where necessary.\n- Allow the texture to dry fully.\n- Correct obvious high spots or overspray where practical.\n\n'
    'Materials and equipment:\n- Aerosol ceiling texture cans matching the existing texture\n- Texture spray shield\n- Cardboard overspray shield\n- Drop sheets\n- Plastic sheeting\n- Safety glasses\n- Respirator or appropriate mask',
    'The repaired areas have a texture reasonably consistent with the surrounding ceiling.',
    'To Do', 'Medium', 1, now(), now());

  -- ===========================================================================
  -- PHASE 8 -- Priming and Painting
  -- ===========================================================================
  INSERT INTO public.project_phases (project_id, name, position, status, description, created_at, updated_at)
  VALUES (v_project_id, 'Priming and Painting', 7, 'Not Started',
    'Finish note: exact paint and texture matching cannot be guaranteed because existing ceilings may have aged, faded, or been previously painted. Full-ceiling repainting is outside the agreed scope unless separately approved.',
    now(), now())
  RETURNING id INTO v_phase;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Priming and Painting',
    'Task 8.1 — Spot-prime repairs',
    E'Work:\n- Prime repaired drywall, joint compound, caulking, and new texture as required.\n- Seal porous repaired surfaces to prevent flashing.\n- Allow primer to dry before painting.\n\n'
    'Materials and equipment:\n- Drywall or stain-blocking primer, as appropriate\n- Small roller\n- Roller sleeves\n- Paintbrush\n- Paint tray\n- Painter''s tape\n- Drop sheets',
    'Repaired surfaces are sealed and ready for finish paint.',
    'To Do', 'Medium', 0, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Priming and Painting',
    'Task 8.2 — Apply flat white ceiling paint',
    E'Work:\n- Apply flat white ceiling paint to the repaired areas.\n- Blend the paint into the surrounding ceiling as closely as reasonably possible.\n- Apply a second coat where coverage requires it.\n- Avoid painting an entire ceiling unless separately authorized.\n\n'
    'Materials and equipment:\n- Flat white ceiling paint\n- Roller frame\n- Roller sleeves\n- Extension pole\n- Paintbrush\n- Paint tray\n- Painter''s tape\n- Drop sheets',
    'Repairs are covered and blended as closely as practical with the existing ceiling finish.',
    'To Do', 'Medium', 1, now(), now());

  -- ===========================================================================
  -- PHASE 9 -- Cleanup and Quality Control
  -- ===========================================================================
  INSERT INTO public.project_phases (project_id, name, position, status, created_at, updated_at)
  VALUES (v_project_id, 'Cleanup and Quality Control', 8, 'Not Started', now(), now())
  RETURNING id INTO v_phase;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Cleanup and Quality Control',
    'Task 9.1 — Clean each apartment',
    E'Work:\n- Remove masking materials and floor protection.\n- Vacuum or collect drywall dust and debris.\n- Remove empty containers and repair waste.\n- Return moved items to their original positions where applicable.\n- Leave the immediate work area broom-clean.\n\n'
    'Materials and equipment:\n- Vacuum\n- Broom and dustpan\n- Cleaning cloths\n- Garbage bags\n- Approved cleaning solution',
    'The immediate work area is clean and safe for occupancy.',
    'To Do', 'Medium', 0, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Cleanup and Quality Control',
    'Task 9.2 — Perform final inspection',
    E'Work:\n- Inspect each repair under normal room lighting.\n- Check for visible holes, exposed fasteners, loose compound, missed texture, and uncovered repair material.\n- Confirm that every scheduled unit has been completed.\n- Photograph completed repairs.\n- Record deficiencies and complete reasonable touch-ups.\n\n'
    'Materials and equipment:\n- Work light\n- Camera or phone\n- Unit completion checklist\n- Touch-up compound\n- Texture and paint supplies',
    'Each unit has a completed checklist and final photographs.',
    'To Do', 'Medium', 1, now(), now());

  -- ===========================================================================
  -- PHASE 10 -- Project Closeout
  -- ===========================================================================
  INSERT INTO public.project_phases (project_id, name, position, status, created_at, updated_at)
  VALUES (v_project_id, 'Project Closeout', 9, 'Not Started', now(), now())
  RETURNING id INTO v_phase;

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Project Closeout',
    'Task 10.1 — Obtain completion approval',
    E'Work:\n- Walk through the completed work with the property representative.\n- Identify any agreed touch-ups.\n- Record completion approval.\n- Note any excluded or newly discovered work separately.\n\n'
    'Materials and records:\n- Completion checklist\n- Customer sign-off form\n- Before-and-after photographs\n- Change-order form',
    'The property representative confirms completion or provides a documented deficiency list.',
    'To Do', 'Medium', 0, now(), now());

  INSERT INTO public.tasks (project_id, phase_id, phase, title, description, verification_criteria, status, priority, sequence, created_at, updated_at)
  VALUES (v_project_id, v_phase, 'Project Closeout',
    'Task 10.2 — Issue final invoice',
    E'Work:\n- Prepare the final invoice for the agreed $3,000 contract price.\n- Add applicable tax only if required and previously communicated.\n- Attach approved change orders, if any.\n- Record the payment due date and payment status.\n\n'
    'Records:\n- Final invoice\n- Approved estimate\n- Change orders\n- Completion approval\n- Payment record',
    'The invoice is delivered and the project is marked completed or awaiting payment.',
    'To Do', 'Medium', 1, now(), now());

  RAISE NOTICE 'Spence Street project created: %', v_project_id;
END $$;
