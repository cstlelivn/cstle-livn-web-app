-- Secondary Suite Development v3: the field sequence confirmed by the user.
-- 76 scheduled six-day workdays (about 12.7 weeks) from design start through
-- final inspection. Cabinet final measurement happens during drywall;
-- countertop fabrication overlaps baseboard/final-wall work instead of
-- blocking the site. Existing projects retain their copied phases/tasks.

DO $$
DECLARE v_template uuid;
BEGIN
  SELECT id INTO v_template
  FROM public.project_templates
  WHERE name = 'Secondary Suite Development' AND active = true
  ORDER BY created_at DESC LIMIT 1;

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Active Secondary Suite Development template not found';
  END IF;

  UPDATE public.project_templates
  SET version = '3.0',
      description = 'Legal secondary-suite development in the company field sequence, from design and permitting through occupancy approval.',
      default_duration_days = 76,
      updated_at = now()
  WHERE id = v_template;

  DELETE FROM public.phase_templates WHERE project_template_id = v_template;

  INSERT INTO public.phase_templates
    (project_template_id, name, description, position, default_duration_days, required)
  VALUES
    (v_template, 'Pre-Construction Design & Permit Package', 'Confirm layout, select key trades, collect owner/property documents, obtain ventilation/electrical designs, and submit a complete permit package.', 0, 4, true),
    (v_template, 'Permit Review & Approval', 'Track City review, answer corrections, pay the fee, receive the issued permit and approved plans, and record the assigned suite address. Construction must not start before issue.', 1, 10, true),
    (v_template, 'Initial Framing', 'Frame perimeter and partitions, door openings, drops and fire separations. Service bulkheads follow plumbing/HVAC rough-in.', 2, 4, true),
    (v_template, 'Plumbing & HVAC Rough-In', 'Complete coordinated plumbing and mechanical rough-in in open framing.', 3, 3, true),
    (v_template, 'Bulkheads, Soffits & Blocking', 'Build protection around confirmed services and install required backing before electrical rough-in.', 4, 2, true),
    (v_template, 'Electrical Rough-In', 'Complete suite wiring, service/heating feeds, boxes, and smoke/CO wiring after service bulkheads are established.', 5, 3, true),
    (v_template, 'Trade Rough-In & Framing Inspections', 'Obtain trade rough-in approvals, then complete the building framing inspection and corrections.', 6, 2, true),
    (v_template, 'Insulation, Soundproofing & Air-Barrier Inspection', 'Install the thermal/acoustic assemblies and sealed vapour barrier, then pass inspection before boarding.', 7, 3, true),
    (v_template, 'Drywall, Mudding & Ceiling Texture', 'Install required board, complete three coats and sanding, apply ceiling texture, and arrange cabinet/vanity final measurements during this phase.', 8, 15, true),
    (v_template, 'Doors & Window Returns', 'Install doors, the rated suite-entry assembly, window jamb extensions/returns, and window casing before drywall primer.', 9, 3, true),
    (v_template, 'PVA Drywall Primer', 'Apply high-build PVA primer to new drywall after doors and window returns are installed. This is not ceiling finish paint.', 10, 1, true),
    (v_template, 'Door Trim, Door Spray & Loose Baseboard Spray', 'Trim the doors, prepare/spray doors and casings, and prepare/spray loose baseboards before they are installed.', 11, 4, true),
    (v_template, 'First Wall Coat', 'Apply the first finish coat to walls only.', 12, 2, true),
    (v_template, 'Flooring Installation & Protection', 'Install finished flooring and immediately protect it completely for the remaining work.', 13, 3, true),
    (v_template, 'Kitchen Cabinets & Vanity Installation', 'Install the kitchen cabinetry and bathroom vanity, then release the installed cabinets for countertop templating.', 14, 4, true),
    (v_template, 'Baseboard Installation & Finish', 'Install pre-sprayed baseboards, fill and roll nail holes, caulk, touch up, and mask/tape the completed trim for the final wall coat.', 15, 3, true),
    (v_template, 'Final Wall Coat', 'Apply the second/final wall coat after baseboard finishing and masking. Ceilings are not finish-painted.', 16, 2, true),
    (v_template, 'Countertop Installation', 'Install the countertop after its offsite fabrication, which runs while baseboards and the final wall coat are completed.', 17, 1, true),
    (v_template, 'Plumbing Final Fittings', 'Complete faucets, toilets, shower trim, sink drains, and other plumbing finals after cabinets, vanity and countertops are installed.', 18, 1, true),
    (v_template, 'Electrical & HVAC Final Fittings', 'Complete electrical and HVAC trim-out only after the final wall coat is complete.', 19, 2, true),
    (v_template, 'Final Construction Clean', 'Remove floor protection and complete the detailed clean after trade finals.', 20, 1, true),
    (v_template, 'Miscellaneous Final Installs & Life-Safety Checks', 'Complete staircase caulk/silicone, peephole, City-compliant A/B numbers, door sweeps, fire-door self-closing checks, and final touchups.', 21, 2, true),
    (v_template, 'Final Inspection & Occupancy Letter', 'Complete the internal readiness check, City final inspection, any immediate corrections, and record the letter of completion/occupancy approval.', 22, 1, true);

  INSERT INTO public.task_templates
    (phase_template_id, project_template_id, name, description, task_type, position, priority, required, default_duration_days, suggested_role, inspection_required, evidence_required)
  VALUES
    -- 1. Design and submission (4 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=0),v_template,'Confirm proposed suite layout and commissioned scope','Prepare and confirm the layout against the current-house plans.','Planning',0,'High',true,1,'Admin / Designer',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=0),v_template,'Select plumbing, HVAC and electrical subcontractors','Engage the key trades early enough to coordinate the permit design.','Planning',1,'High',true,1,'Admin / Supervisor',false,false),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=0),v_template,'Collect owner, property and existing-house documents','Collect signed owner forms, existing plan PDFs and all submission information.','Administrative',2,'High',true,1,'Admin',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=0),v_template,'Complete trade designs and submit permit package','Obtain ventilation/electrical design information, compile the package and submit it to the City.','Administrative',3,'High',true,1,'Admin / Designer',false,true),

    -- 2. Permit review (10 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=1),v_template,'Track City review and answer corrections','Respond promptly to correction notices while procurement and trade scheduling continue offsite.','Administrative',0,'High',true,9,'Admin / Designer',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=1),v_template,'Record issued permit, approved plans and suite address','Confirm the fee is paid and permit issued before construction begins; record City A/B addressing.','Administrative',1,'High',true,1,'Admin',true,true),

    -- 3. Framing (4 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=2),v_template,'Lay out approved walls and openings','Transfer the issued plan to site and confirm egress, doors and clearances.','Site Work',0,'High',true,1,'Supervisor / Framing Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=2),v_template,'Frame perimeter, partitions, doors and fire separations','Leave final service bulkheads until plumbing/HVAC routes are established.','Trade Work',1,'High',true,2,'Framing Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=2),v_template,'Complete initial framing QC','Confirm dimensions, plumb/level work, fire assemblies and trade access.','Quality Control',2,'High',true,1,'Supervisor',false,true),

    -- 4. Plumbing/HVAC (3 days; the trades may work in separate zones)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=3),v_template,'Complete plumbing rough-in','Complete drains, vents, water lines and fixture rough-ins.','Trade Work',0,'High',true,2,'Plumbing Subcontractor',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=3),v_template,'Complete HVAC and ventilation rough-in','Complete HRV, supply/return and bathroom/kitchen exhaust work in coordination with plumbing.','Trade Work',1,'High',true,1,'HVAC Subcontractor',false,true),

    -- 5. Bulkheads (2 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=4),v_template,'Frame service bulkheads and soffits','Build protection around the actual installed plumbing and HVAC routes.','Trade Work',0,'High',true,1,'Framing Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=4),v_template,'Install backing and blocking','Install backing for cabinets, rails, accessories and fixtures before electrical rough-in.','Trade Work',1,'High',true,1,'Framing Crew',false,true),

    -- 6. Electrical (3 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=5),v_template,'Complete electrical rough-in','Install panel/service work, boxes, appliance/heating feeds and interconnected smoke/CO wiring.','Trade Work',0,'High',true,2,'Electrical Subcontractor',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=5),v_template,'Complete electrical rough-in QC','Confirm locations, clearances, heating provisions and life-safety wiring.','Quality Control',1,'High',true,1,'Supervisor / Electrician',false,true),

    -- 7. Rough inspections (2 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=6),v_template,'Complete plumbing, HVAC and electrical rough-in approvals','Record each required trade approval before calling the building framing inspection.','Inspection',0,'High',true,1,'Trade Subcontractors',true,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=6),v_template,'Complete building framing inspection and corrections','Call framing only after rough trades are complete and resolve any immediate deficiencies.','Inspection',1,'High',true,1,'Supervisor',true,true),

    -- 8. Insulation and inspection (3 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=7),v_template,'Install thermal insulation and soundproofing','Install specified stone wool/fiberglass, resilient channel and acoustic assemblies.','Trade Work',0,'High',true,1,'Insulation Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=7),v_template,'Install and seal vapour/air barrier','Install 6-mil poly and seal all seams and penetrations.','Trade Work',1,'High',true,1,'Insulation Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=7),v_template,'Complete insulation and air-barrier inspection','Pass inspection before any drywall covers the assembly.','Inspection',2,'High',true,1,'Supervisor',true,true),

    -- 9. Drywall (15 days); cabinet measuring happens during this window
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=8),v_template,'Install required drywall','Install Type X and moisture-resistant board where specified.','Trade Work',0,'High',true,4,'Drywall Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=8),v_template,'Complete cabinet and vanity final measurements','Have the kitchen/cabinet team take final field measurements early enough for fabrication to finish before flooring is complete.','Planning',1,'High',true,1,'Cabinet / Countertop Installer',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=8),v_template,'Tape and apply three compound coats','Respect drying time between tape, first, second and finish coats.','Trade Work',2,'High',true,7,'Drywall Finisher',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=8),v_template,'Sand drywall and correct defects','Produce a paint-ready finish.','Trade Work',3,'High',true,2,'Drywall Finisher',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=8),v_template,'Apply ceiling texture and complete QC','Apply ceiling texture during drywall finishing; do not create a ceiling finish-paint task.','Quality Control',4,'High',true,1,'Drywall Finisher / Supervisor',false,true),

    -- 10. Doors and returns before primer (3 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=9),v_template,'Install interior and fire-rated suite-entry doors','Install the rated door and self-closing hardware; final adjustment occurs at closeout.','Trade Work',0,'High',true,2,'Finish Carpenter',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=9),v_template,'Install window jamb extensions, returns and casing','Complete window returns before PVA primer.','Trade Work',1,'High',true,1,'Finish Carpenter',false,true),

    -- 11. PVA primer (1 day)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=10),v_template,'Apply PVA drywall primer','Prime new drywall after door/window-return installation. This is not ceiling finish paint.','Trade Work',0,'High',true,1,'Painting Crew',false,true),

    -- 12. Trim and spray (4 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=11),v_template,'Install door casing and remaining door trim','Complete door trim after primer.','Trade Work',0,'High',true,1,'Finish Carpenter',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=11),v_template,'Prepare doors, trim and loose baseboards for spray','Fill, sand and prepare the installed doors/trim and the loose baseboard stock.','Trade Work',1,'High',true,1,'Painting Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=11),v_template,'Spray doors, installed trim and loose baseboards','Spray baseboards loose before flooring/baseboard installation.','Trade Work',2,'High',true,2,'Painting Crew',false,true),

    -- 13. First wall coat (2 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=12),v_template,'Apply first finish coat to walls','Paint walls only; ceiling texture remains unpainted.','Trade Work',0,'High',true,2,'Painting Crew',false,true),

    -- 14. Flooring and protection (3 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=13),v_template,'Install finished flooring','Install tile and continuous suite flooring as specified.','Trade Work',0,'High',true,2,'Flooring Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=13),v_template,'Protect all finished flooring','Cover 100 percent of the new flooring and seal protection seams.','Site Work',1,'High',true,1,'Site Crew',false,true),

    -- 15. Cabinets/vanity (4 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=14),v_template,'Install kitchen cabinets and fillers','Set, level, align and secure the kitchen immediately after flooring protection.','Trade Work',0,'High',true,2,'Cabinet Installer',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=14),v_template,'Install bathroom vanity','Set and secure the vanity ready for countertop and plumbing finals.','Trade Work',1,'High',true,1,'Cabinet Installer',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=14),v_template,'Release installed millwork for countertop templating','Confirm final countertop measurements so offsite fabrication can overlap baseboard/final wall work.','Planning',2,'High',true,1,'Countertop Installer',false,true),

    -- 16. Baseboard finish (3 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=15),v_template,'Install pre-sprayed baseboards','Install the prepared baseboards over the protected finished floor.','Trade Work',0,'High',true,1,'Finish Carpenter',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=15),v_template,'Fill, caulk and roller-touch-up baseboards','Cover fastener holes, caulk joints and roll/brush the final baseboard touchup.','Trade Work',1,'High',true,1,'Painting Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=15),v_template,'Mask completed trim for final wall coat','Tape and protect the finished baseboards, doors and casing.','Site Work',2,'High',true,1,'Painting Crew',false,true),

    -- 17. Final walls (2 days)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=16),v_template,'Apply second/final wall coat','Apply the final wall coat after baseboard finishing and masking.','Trade Work',0,'High',true,1,'Painting Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=16),v_template,'Complete final wall-paint QC and touchups','Inspect wall finish and correct defects before electrical finals.','Quality Control',1,'High',true,1,'Supervisor / Painting Crew',false,true),

    -- 18. Countertops (fabrication has overlapped phases 16-17)
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=17),v_template,'Install kitchen and vanity countertops','Install the fabricated tops and backsplashes ready for plumbing connections.','Trade Work',0,'High',true,1,'Countertop Installer',false,true),

    -- 19. Plumbing final after cabinetry/countertops
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=18),v_template,'Complete plumbing final fittings and approval','Install faucets, toilets, shower trim, sink drains and final connections.','Trade Work',0,'High',true,1,'Plumbing Subcontractor',true,true),

    -- 20. Electrical/HVAC after final wall coat
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=19),v_template,'Complete electrical final fittings and approval','Install fixtures, devices, plates, breakers, heating controls and smoke/CO devices after final painting.','Trade Work',0,'High',true,1,'Electrical Subcontractor',true,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=19),v_template,'Complete HVAC final fittings and approval','Install grilles, diffusers, thermostat and HRV controller.','Trade Work',1,'High',true,1,'HVAC Subcontractor',true,true),

    -- 21. Clean
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=20),v_template,'Remove protection and complete final construction clean','Clean floors, surfaces, windows, cabinets, fixtures and appliances after trade finals.','Site Work',0,'High',true,1,'Cleaning Crew',false,true),

    -- 22. Miscellaneous closeout after clean
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=21),v_template,'Caulk and silicone staircase and final joints','Complete the final staircase and finish sealants without disturbing finished walls.','Trade Work',0,'High',true,1,'Finish Crew',false,true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=21),v_template,'Install peephole, door sweeps and City-compliant A/B numbers','Complete late-stage door/addressing items, confirm every required fire door self-closes and latches, and finish miscellaneous touchups.','Trade Work',1,'High',true,1,'Finish Carpenter / Site Crew',false,true),

    -- 23. Final inspection
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=22),v_template,'Complete final inspection and record occupancy closeout','Verify all safety items, attend the City inspection, save the letter of completion or occupancy approval, and complete project handover.','Inspection',0,'High',true,1,'Supervisor / Admin',true,true);
END $$;
