-- Rebuild the canonical Secondary Suite Development template around the
-- company's actual onsite sequence. Existing projects are safe: project
-- phases/tasks are independent copies and their template foreign keys use
-- ON DELETE SET NULL.

DO $$
DECLARE
  v_template uuid;
BEGIN
  SELECT id INTO v_template
  FROM public.project_templates
  WHERE name = 'Secondary Suite Development'
  ORDER BY active DESC, created_at DESC
  LIMIT 1;

  IF v_template IS NULL THEN
    INSERT INTO public.project_templates
      (name, description, project_type, version, active, default_duration_days)
    VALUES
      ('Secondary Suite Development',
       'Legal secondary-suite development from design and permitting through occupancy approval.',
       'Secondary Suite', '2.0', true, 103)
    RETURNING id INTO v_template;
  ELSE
    UPDATE public.project_templates
    SET description = 'Legal secondary-suite development from design and permitting through occupancy approval.',
        project_type = 'Secondary Suite',
        version = '2.0',
        active = true,
        default_duration_days = 103,
        updated_at = now()
    WHERE id = v_template;
  END IF;

  -- Do not expose duplicate active versions of this template.
  UPDATE public.project_templates
  SET active = false, updated_at = now()
  WHERE name = 'Secondary Suite Development' AND id <> v_template;

  DELETE FROM public.phase_templates WHERE project_template_id = v_template;

  INSERT INTO public.phase_templates
    (project_template_id, name, description, position, default_duration_days, required)
  VALUES
    (v_template, 'Pre-Construction Design & Trade Selection', 'Confirm the approved layout, select key subcontractors, and collect the homeowner and existing-house documents needed for design and permitting.', 0, 5, true),
    (v_template, 'Permit Package & Submission', 'Compile the architectural, ventilation, plumbing, electrical, homeowner, and property documents and submit a complete permit application.', 1, 3, true),
    (v_template, 'Permit Review & Approval', 'Track City review, answer deficiencies, receive the approved permit, and record any assigned suite address before construction starts.', 2, 15, true),
    (v_template, 'Initial Framing', 'Frame exterior perimeter and interior partitions, door openings, drops, and fire-rated draft stops according to the approved plan. Final service bulkheads follow plumbing/HVAC rough-in.', 3, 5, true),
    (v_template, 'Plumbing & HVAC Rough-In', 'Complete plumbing and mechanical rough-ins in open framing before final service bulkheads are built.', 4, 5, true),
    (v_template, 'Bulkheads, Soffits & Blocking', 'Build the bulkheads/soffits required to protect installed services and add required backing and blocking before electrical rough-in.', 5, 3, true),
    (v_template, 'Electrical Rough-In', 'Complete panel/sub-panel work, wiring, boxes, appliance feeds, heating feeds, and interconnected smoke/CO wiring after bulkheads are established.', 6, 4, true),
    (v_template, 'Trade Rough-In & Framing Inspections', 'Obtain plumbing, HVAC, and electrical rough-in approvals, then complete the building framing inspection.', 7, 5, true),
    (v_template, 'Insulation, Soundproofing & Vapour Barrier', 'Install thermal/acoustic insulation, resilient channel where required, and the sealed air/vapour barrier.', 8, 4, true),
    (v_template, 'Insulation & Air-Barrier Inspection', 'Complete and record the mandatory insulation and air-barrier inspection before boarding.', 9, 2, true),
    (v_template, 'Drywall, Mudding & Ceiling Texture', 'Install required board, complete three coats of tape/compound and sanding, and apply ceiling texture. Ceiling painting is excluded.', 10, 15, true),
    (v_template, 'Drywall Primer — Walls & Ceilings', 'Apply high-build PVA primer to seal new drywall before finished trim is installed.', 11, 2, true),
    (v_template, 'Doors & Window Trim', 'Install pre-hung doors, the fire-rated suite entry door and closer, window returns/jamb extensions, and door/window casing. Final sweep and hardware checks occur near closeout.', 12, 4, true),
    (v_template, 'First Wall Coat', 'Apply the first finish coat to walls only. Do not add a ceiling-paint task.', 13, 2, true),
    (v_template, 'Flooring Installation', 'Install tile in wet/entry areas and the specified continuous finished flooring throughout the suite.', 14, 4, true),
    (v_template, 'Floor Masking & Protection', 'Protect 100 percent of new flooring with continuous heavy-duty floor protection and sealed seams.', 15, 1, true),
    (v_template, 'Baseboard Installation', 'Install baseboards on top of the finished, protected flooring.', 16, 2, true),
    (v_template, 'Finish Carpentry Prep & Trim Painting', 'Fill, sand, caulk, and paint/spray doors, casings, window trim, and baseboards.', 17, 4, true),
    (v_template, 'Final Wall Coat', 'Apply the second/final coat to walls and cut cleanly to completed trim. Do not paint ceilings.', 18, 2, true),
    (v_template, 'Cabinets, Vanities & Countertops', 'Install kitchen and bathroom millwork, countertops, fillers, and backsplashes.', 19, 5, true),
    (v_template, 'Trade Finals', 'Complete electrical, plumbing, and HVAC trim-out and obtain required final trade approvals.', 20, 4, true),
    (v_template, 'Miscellaneous Final Touchups & Required Installs', 'Complete suite-address labels and late-stage life-safety/door items including peephole, door sweep, self-closing hinge adjustment, deficiencies, and touchups.', 21, 2, true),
    (v_template, 'Floor Unmasking & Construction Clean', 'Remove floor protection and complete detailed construction cleaning after all installations and touchups.', 22, 2, true),
    (v_template, 'Final Inspection & Occupancy', 'Complete the final building inspection, resolve any deficiencies, and record occupancy approval and handover.', 23, 3, true);

  INSERT INTO public.task_templates
    (phase_template_id, project_template_id, name, description, task_type, position, priority, required, default_duration_days, suggested_role, inspection_required, evidence_required)
  VALUES
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=0), v_template, 'Draw and confirm the proposed suite layout', 'Prepare the new layout against the current-house plans and confirm the commissioned scope with the homeowner.', 'Planning', 0, 'High', true, 2, 'Admin / Designer', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=0), v_template, 'Select plumbing, HVAC and electrical subcontractors', 'Select the rough-in trades early enough to obtain coordinated designs and permit documents.', 'Planning', 1, 'High', true, 1, 'Admin / Supervisor', false, false),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=0), v_template, 'Collect existing plans and homeowner documents', 'Collect current floor-plan PDFs, property details, signed owner documents, and all other City submission requirements.', 'Administrative', 2, 'High', true, 1, 'Admin', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=0), v_template, 'Obtain ventilation and electrical designs', 'Obtain the HVAC ventilation design and electrical service/baseboard-heating design required for the legal suite.', 'Administrative', 3, 'High', true, 1, 'HVAC / Electrical Subcontractors', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=1), v_template, 'Compile the complete permit package', 'Check drawings, trade designs, forms, owner documents, and existing-house information for completeness.', 'Administrative', 0, 'High', true, 2, 'Admin', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=1), v_template, 'Submit the permit application', 'Submit to the City and record the application/reference number and submission date.', 'Administrative', 1, 'High', true, 1, 'Admin', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=2), v_template, 'Track City review and answer deficiencies', 'Coordinate revisions and responses without starting regulated construction before approval.', 'Administrative', 0, 'High', true, 14, 'Admin / Designer', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=2), v_template, 'Record permit approval and assigned suite address', 'Save the approved permit set and record Unit A/B or other City-issued addressing requirements.', 'Administrative', 1, 'High', true, 1, 'Admin', true, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=3), v_template, 'Lay out approved walls and openings', 'Transfer the approved plan to site and confirm egress, rooms, doors, and service clearances.', 'Site Work', 0, 'High', true, 1, 'Supervisor / Framing Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=3), v_template, 'Frame perimeter, partitions and door openings', 'Frame exterior perimeter, interior partitions, door openings, drops, and fire-rated draft stops. Leave service bulkheads until plumbing/HVAC rough-in establishes their routes.', 'Trade Work', 1, 'High', true, 3, 'Framing Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=3), v_template, 'Initial framing QC', 'Confirm dimensions, plumb/level work, fire separations, egress, and trade access before rough-in.', 'Quality Control', 2, 'High', true, 1, 'Supervisor', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=4), v_template, 'Complete plumbing rough-in', 'Complete trenching, drains, vents, water lines, and shower/tub valves.', 'Trade Work', 0, 'High', true, 3, 'Plumbing Subcontractor', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=4), v_template, 'Complete HVAC/mechanical rough-in', 'Install dedicated HRV runs, supply/return trunks, and bathroom/kitchen exhausts.', 'Trade Work', 1, 'High', true, 2, 'HVAC Subcontractor', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=5), v_template, 'Frame service bulkheads and soffits', 'Build protection around the actual plumbing and HVAC routes after those services are installed.', 'Trade Work', 0, 'High', true, 2, 'Framing Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=5), v_template, 'Install required backing and blocking', 'Add backing for cabinets, grab bars, accessories, rails, fixtures, and other approved loads.', 'Trade Work', 1, 'High', true, 1, 'Framing Crew', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=6), v_template, 'Complete electrical rough-in', 'Install panel/sub-panel work, wiring boxes, stove/dryer feeds, baseboard-heating feeds, and interconnected smoke/CO lines.', 'Trade Work', 0, 'High', true, 3, 'Electrical Subcontractor', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=6), v_template, 'Electrical rough-in QC', 'Confirm the approved design, service clearances, device locations, heating provisions, and life-safety wiring.', 'Quality Control', 1, 'High', true, 1, 'Supervisor / Electrician', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=7), v_template, 'Complete plumbing rough-in inspection', 'Obtain and record plumbing rough-in approval.', 'Inspection', 0, 'High', true, 1, 'Plumbing Subcontractor', true, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=7), v_template, 'Complete HVAC rough-in inspection', 'Obtain and record mechanical/HVAC rough-in approval.', 'Inspection', 1, 'High', true, 1, 'HVAC Subcontractor', true, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=7), v_template, 'Complete electrical rough-in inspection', 'Obtain and record electrical rough-in approval.', 'Inspection', 2, 'High', true, 1, 'Electrical Subcontractor', true, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=7), v_template, 'Complete building framing inspection', 'Call the building framing inspection only after trade rough-in approvals are complete.', 'Inspection', 3, 'High', true, 1, 'Supervisor', true, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=7), v_template, 'Resolve and record inspection deficiencies', 'Complete required corrections and retain approval evidence before closing walls.', 'Corrective Work', 4, 'High', true, 1, 'Supervisor / Assigned Trade', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=8), v_template, 'Install thermal and acoustic insulation', 'Install specified fiberglass/stone wool and secondary-suite soundproofing assemblies.', 'Trade Work', 0, 'High', true, 2, 'Insulation Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=8), v_template, 'Install resilient channel and sound-control components', 'Install resilient channel and related sound-separation components where required.', 'Trade Work', 1, 'High', true, 1, 'Insulation / Drywall Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=8), v_template, 'Install and seal vapour/air barrier', 'Install 6-mil poly and seal penetrations and seams with acoustical sealant and approved tape.', 'Trade Work', 2, 'High', true, 1, 'Insulation Crew', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=9), v_template, 'Complete insulation and air-barrier inspection', 'Obtain approval before any drywall covers the assembly.', 'Inspection', 0, 'High', true, 1, 'Supervisor', true, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=9), v_template, 'Resolve inspection deficiencies', 'Complete and document any required corrections and reinspection.', 'Corrective Work', 1, 'High', true, 1, 'Supervisor / Insulation Crew', true, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=10), v_template, 'Install required drywall', 'Install fire-rated Type X drywall on required ceilings/shared walls and moisture-resistant board in wet areas.', 'Trade Work', 0, 'High', true, 4, 'Drywall Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=10), v_template, 'Tape and apply three compound coats', 'Complete tape plus first, second, and finish coats with proper drying time.', 'Trade Work', 1, 'High', true, 7, 'Drywall Finisher', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=10), v_template, 'Sand and correct drywall', 'Sand to paint-ready finish and correct visible defects.', 'Trade Work', 2, 'High', true, 2, 'Drywall Finisher', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=10), v_template, 'Apply ceiling texture', 'Apply the specified ceiling texture during the drywall-finishing stage. Do not create a ceiling-paint task.', 'Trade Work', 3, 'High', true, 1, 'Drywall Finisher', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=10), v_template, 'Drywall and texture QC', 'Inspect board, fire-rated assemblies, finish quality, corners, and ceiling texture before primer.', 'Quality Control', 4, 'High', true, 1, 'Supervisor', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=11), v_template, 'Prime new drywall on walls and ceilings', 'Apply high-build PVA drywall primer to walls and ceilings. This is primer only, not ceiling finish paint.', 'Trade Work', 0, 'High', true, 1, 'Painting Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=11), v_template, 'Primer QC and drywall touchups', 'Inspect sealed surfaces and correct defects before installing finished trim.', 'Quality Control', 1, 'High', true, 1, 'Supervisor / Painting Crew', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=12), v_template, 'Install interior and fire-rated suite-entry doors', 'Install pre-hung doors and the rated suite-entry assembly with self-closing hardware. Leave final sweep installation/check for closeout if required by finishing work.', 'Trade Work', 0, 'High', true, 2, 'Finish Carpenter', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=12), v_template, 'Install window returns and door/window casing', 'Install jamb extensions, window returns, and casing. Baseboards are installed later over finished flooring.', 'Trade Work', 1, 'High', true, 2, 'Finish Carpenter', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=13), v_template, 'Apply first finish coat to walls', 'Paint walls only. Ceiling texture remains unpainted.', 'Trade Work', 0, 'High', true, 2, 'Painting Crew', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=14), v_template, 'Install tile in wet and entry areas', 'Install specified tile and complete necessary setting/curing work.', 'Trade Work', 0, 'High', true, 2, 'Flooring Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=14), v_template, 'Install continuous suite flooring', 'Install the specified LVP, laminate, or other finish flooring throughout the remaining suite.', 'Trade Work', 1, 'High', true, 2, 'Flooring Crew', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=15), v_template, 'Mask and protect all finished flooring', 'Cover 100 percent of new flooring with Ram Board/builders paper and seal seams continuously.', 'Site Work', 0, 'High', true, 1, 'Site Crew', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=16), v_template, 'Install baseboards', 'Install baseboards on the finished floor while its protective covering remains in place.', 'Trade Work', 0, 'High', true, 2, 'Finish Carpenter', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=17), v_template, 'Fill and sand finish-carpentry fasteners', 'Fill nail holes in doors, casings, window trim, and baseboards and sand smooth.', 'Trade Work', 0, 'High', true, 1, 'Finish Carpenter / Painter', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=17), v_template, 'Caulk trim-to-wall joints', 'Caulk baseboards, casings, and window-return joints cleanly.', 'Trade Work', 1, 'High', true, 1, 'Painting Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=17), v_template, 'Paint doors, casings, window trim and baseboards', 'Spray or paint the prepared finish carpentry to the approved finish.', 'Trade Work', 2, 'High', true, 2, 'Painting Crew', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=18), v_template, 'Apply final wall coat', 'Apply the second/final wall coat and cut cleanly to the completed trim. Do not paint ceilings.', 'Trade Work', 0, 'High', true, 1, 'Painting Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=18), v_template, 'Final paint QC and touchups', 'Inspect wall finish and complete touchups without adding ceiling painting.', 'Quality Control', 1, 'High', true, 1, 'Supervisor / Painting Crew', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=19), v_template, 'Install kitchen cabinets and fillers', 'Set, level, align, and fasten the kitchen millwork and fillers.', 'Trade Work', 0, 'High', true, 2, 'Cabinet Installer', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=19), v_template, 'Install bathroom vanities', 'Set, level, and secure bathroom millwork ready for trade connections.', 'Trade Work', 1, 'High', true, 1, 'Cabinet Installer', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=19), v_template, 'Install countertops and backsplashes', 'Install and finish approved countertops and backsplash assemblies.', 'Trade Work', 2, 'High', true, 2, 'Countertop / Cabinet Installer', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=20), v_template, 'Complete electrical final trim and approval', 'Install fixtures, devices, cover plates, breakers, heating controls, and smoke/CO devices and record final approval.', 'Trade Work', 0, 'High', true, 1, 'Electrical Subcontractor', true, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=20), v_template, 'Complete plumbing final trim and approval', 'Install faucets, toilets, shower trim, sinks, and drains and record final approval.', 'Trade Work', 1, 'High', true, 1, 'Plumbing Subcontractor', true, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=20), v_template, 'Complete HVAC final trim and approval', 'Install grilles, diffusers, thermostat, and HRV controller and record final approval.', 'Trade Work', 2, 'High', true, 1, 'HVAC Subcontractor', true, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=20), v_template, 'Trade-finals QC review', 'Confirm all trim-out work, approvals, equipment operation, and outstanding deficiencies.', 'Quality Control', 3, 'High', true, 1, 'Supervisor', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=21), v_template, 'Install City-required suite addressing', 'Install Unit A/B or other approved address identifiers to the City specification.', 'Trade Work', 0, 'High', true, 1, 'Site Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=21), v_template, 'Complete suite-entry door safety items', 'Install the peephole and door sweep, then test and adjust the self-closing hinge so the rated door closes and latches correctly.', 'Trade Work', 1, 'High', true, 1, 'Finish Carpenter', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=22), v_template, 'Remove floor protection', 'Remove Ram Board/builders paper only after final installations and touchups are complete.', 'Site Work', 0, 'High', true, 1, 'Site Crew', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=22), v_template, 'Complete detailed construction clean', 'Clean floors, surfaces, windows, cabinets, fixtures, and appliances for inspection and occupancy.', 'Site Work', 1, 'High', true, 1, 'Cleaning Crew', false, true),

    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=23), v_template, 'Complete internal pre-inspection', 'Verify fire separation, egress, handrails, suite addressing, doors, alarms, and trade approvals before calling the City.', 'Quality Control', 0, 'High', true, 1, 'Supervisor', false, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=23), v_template, 'Complete final building inspection', 'Attend the City final inspection and record the result.', 'Inspection', 1, 'High', true, 1, 'Supervisor', true, true),
    ((SELECT id FROM public.phase_templates WHERE project_template_id=v_template AND position=23), v_template, 'Resolve deficiencies and record occupancy approval', 'Complete required corrections, obtain the Certificate of Occupancy/final approval, and record project handover.', 'Handover', 2, 'High', true, 1, 'Supervisor / Admin', true, true);
END $$;
