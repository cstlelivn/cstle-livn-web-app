Extend the Projects-module rebuild with a template-driven, task-based phase-completion system.

This instruction supplements the previous Projects-module specification. Where this instruction is more specific, follow this instruction.

Do not work on CRM, Teams, global Finance, Inventory, or other modules beyond the minimum integrations required for Projects.

Do not redesign the application. Preserve its existing visual identity.

## 1. Project Details navigation

At the top of Project Details, make the two primary operational sections:

1. Tasks — left
2. Phases — right

Tasks should be the default section because this is where the project manager controls daily execution.

Use:

- **Tasks** for list, Kanban, scheduling, assignments, procurement, inspections, communication, and completion.
- **Phases** for phase sequence, dates, milestones, phase progress, dependencies, QC gates, and phase completion.

Additional secondary sections may include:

- Overview
- Timeline
- Files
- Activity

Keep Transactions, Finance, Purchases, Income, Expenses, and Profit hidden.

Do not delete the underlying finance code or data.

## 2. Operating model

The system should follow this hierarchy:

```text
Project template
  → Phase templates
      → Task templates
      → Procurement requirements
      → Inspection requirements
      → QC checklist
```

When a project template is applied:

```text
Project
  → Project phases
      → Project tasks
      → Project procurement tasks/items
      → Project inspection tasks
      → Project QC records
```

Tasks complete phases.

Phases complete projects.

A project manager must be able to control the schedule and progress remotely through real task status, assignments, dates, dependencies, inspection results, procurement readiness, and QC approvals.

## 3. Template architecture

Create reusable project templates for:

- Basement Finishing & Development
- Bathroom Remodel
- Interior Painting
- Flooring Installation
- Insurance Rebuild

The architecture must also support adding new templates later without code changes.

Each project template must contain:

- Template name
- Description
- Project type
- Version
- Active/inactive state
- Default estimated duration
- Ordered phase templates
- Default task templates
- Default procurement requirements
- Default inspection checkpoints
- Default QC checklists

Each phase template must contain:

- Stable phase-template ID
- Name
- Description
- Default position
- Default duration
- Required or optional state
- Default dependencies
- Phase task templates
- Phase QC checklist
- Applicable inspection gates
- Completion rules

Each task template must contain:

- Stable task-template ID
- Phase-template ID
- Task name
- Description
- Task type
- Default position
- Default duration
- Default priority
- Required or optional state
- Default dependency
- Suggested assignee role
- Procurement lead time, when relevant
- Inspection requirement, when relevant
- Evidence requirement, when relevant

Do not store production templates only in `localStorage`.

Templates must persist in Supabase.

## 4. Snapshot active projects

When a template is applied to a project, clone the selected template into real project phases and project tasks.

Do not make an active project continuously reference the live template.

Template changes made later must not unexpectedly alter existing projects.

Provide an explicit action:

**Apply template updates**

This action must show a preview and allow the project manager to select which new phases or tasks to add.

Never overwrite:

- Completed tasks
- Existing assignments
- Project-specific task names
- Existing dates
- QC decisions
- Inspection results
- Project-manager changes

## 5. Template customization during project creation

When creating a project:

1. Select a project template.
2. Preview phases and tasks.
3. Enable or disable optional phases.
4. Rename phases if necessary.
5. Add custom phases.
6. Remove phases that do not apply.
7. Review generated tasks.
8. Add or remove optional tasks.
9. Assign a preliminary team.
10. Set the project start date.
11. Generate the initial schedule.

Do not assume every basement, bathroom, painting, flooring, or insurance project has identical requirements.

All generated phases and tasks remain editable after project creation.

## 6. Task types

Every project task must have one task type:

- Administrative
- Client Communication
- Planning
- Procurement
- Site Work
- Trade Work
- Inspection
- Quality Control
- Corrective Work
- Handover

Display task type as a compact badge.

Allow filtering by task type.

## 7. Task dependencies

Add task dependencies.

A task may be:

- Unblocked
- Blocked by another task
- Blocked by procurement
- Blocked by client selection
- Blocked by permit
- Blocked by inspection
- Blocked by QC
- Blocked by another phase

Support finish-to-start dependencies first.

Do not present advanced dependency types unless they are genuinely implemented.

When a blocking task is incomplete:

- Show the blocked reason.
- Prevent accidental completion of the dependent task.
- Allow a project manager with permission to override the block.
- Require an override reason.
- Record the override in project activity.

Do not automatically move dates without showing the project manager what will change.

## 8. Scheduling engine

When a project start date and template are selected, generate a proposed schedule based on:

- Phase order
- Phase duration
- Task duration
- Dependencies
- Procurement lead time
- Required inspections
- Working days
- Existing task assignments, where known

Allow the project manager to choose working days.

The initial default may be:

- Monday through Friday
- Exclude statutory holidays only if a reliable holiday calendar is available

Clearly label the generated dates as a proposed schedule until the project manager confirms them.

When a task becomes delayed, show:

- Original due date
- Current forecast date
- Downstream tasks affected
- Phases affected
- Project target date impact

Provide choices:

- Accept schedule shift
- Change task duration
- Reassign the task
- Add resources
- Keep existing downstream dates and show schedule risk

Do not silently rewrite the complete schedule.

## 9. Procurement system without Finance

Procurement must be operational but not financial.

Do not expose:

- Purchase price
- Project cost
- Margin
- Profit
- Expense transactions
- Payment information

A procurement requirement should support:

- Item name
- Description or specification
- Quantity
- Unit
- Related project
- Related phase
- Related installation task
- Required-on-site date
- Recommended order date
- Lead time
- Supplier, optional
- Assigned buyer
- Status
- Delivery location
- Delivery confirmation
- Notes
- Attachments
- Substitution approval, when applicable

Procurement statuses:

- Not Reviewed
- Selection Required
- Ready to Order
- Ordered
- Partially Received
- Received
- Backordered
- Cancelled

Procurement may be shown as filtered tasks inside Tasks.

Do not require a separate finance interface.

### Procurement timing

Procurement tasks should be scheduled according to lead time and the date the material is required on site.

Use this logic:

```text
Recommended order date
=
Required-on-site date
−
Lead time
−
Configured buffer
```

Do not assume all materials should be purchased at project commencement.

Use three procurement strategies:

1. **Long-lead procurement**  
   Order early when delays could affect the project.

2. **Selection-dependent procurement**  
   Require client approval before ordering.

3. **Just-in-time procurement**  
   Order closer to the installation phase when early storage may cause damage, congestion, loss, or unnecessary handling.

Examples:

- Custom doors and special-order flooring may require early selection and ordering.
- Standard shims, fasteners, primer, and consumables may be ordered closer to use.
- Paint colour must be approved before paint ordering.
- Finished materials should not arrive before suitable secure, dry storage is available.

These are editable defaults, not rigid rules.

## 10. Material requirement rules

Allow task templates to generate procurement requirements conditionally.

Examples:

### Door-installation phase selected

Generate suggested procurement requirements:

- Door slabs or prehung doors
- Jambs, when applicable
- Hinges
- Handles or locksets
- Door shims
- Fasteners
- Casing
- Stops
- Sealant or filler where applicable
- Touch-up materials

### Interior-painting phase selected

Generate suggested requirements:

- Client colour approval
- Primer type and quantity
- Paint type, sheen, and quantity
- Caulking
- Patch compound
- Sanding materials
- Masking materials
- Floor and fixture protection
- Rollers, brushes, trays, and consumables

### Flooring-installation phase selected

Generate suggested requirements:

- Approved flooring product
- Underlayment, if required
- Moisture barrier, if required
- Transitions
- Reducers
- Stair nosing, if applicable
- Adhesive, if applicable
- Levelling compound
- Baseboards or shoe moulding
- Fasteners
- Floor protection

Every generated item must remain editable and removable.

Do not claim a material is always required. Label these as suggested requirements pending site conditions, manufacturer instructions, approved scope, and applicable code.

## 11. QC-gated phase completion

Every phase must end with a QC gate.

A phase cannot be marked Completed until:

- All required tasks are completed.
- All required procurement items are received or explicitly waived.
- Required inspections are passed or explicitly marked not applicable.
- The phase QC checklist is submitted.
- The phase QC result is Approved.

Phase QC states:

- Not Started
- Ready for Review
- Under Review
- Approved
- Rejected
- Approved with Conditions

If QC is Rejected:

- Keep the phase incomplete.
- Capture rejection notes.
- Capture photos or documents where supported.
- Create one or more corrective-work tasks.
- Assign corrective tasks.
- Set due dates.
- Link them to the rejected QC record.
- Prevent phase completion until corrective tasks are completed and QC is resubmitted.

If QC is Approved with Conditions:

- Require a written condition.
- Create follow-up tasks where needed.
- Clearly indicate whether work may proceed.
- Preserve the complete approval history.

Record:

- Reviewer
- Review date
- Result
- Checklist answers
- Notes
- Evidence
- Corrective tasks
- Resubmission history

Do not allow the same user to perform and approve a QC review if the permissions model supports separation of duties. Project managers or authorized reviewers should approve QC.

## 12. Inspection gates

Support inspection tasks and inspection gates.

An inspection task must support:

- Inspection type
- Authority or inspector
- Permit number, optional
- Requested date
- Scheduled date
- Completed date
- Result
- Deficiency notes
- Reinspection required
- Attachments
- Related phase
- Related tasks

Inspection results:

- Not Requested
- Requested
- Scheduled
- Passed
- Passed with Conditions
- Failed
- Reinspection Required
- Not Applicable

Do not hard-code that every project requires every inspection.

During project setup, include an “Applicable permits and inspections” review.

Permit and inspection requirements must remain configurable by:

- Province
- Municipality
- Project scope
- Trade
- Authority having jurisdiction

If an inspection is required before concealment, block dependent covering or finishing tasks until the inspection passes or an authorized override is recorded.

## 13. Safety and hazardous-material gates

For renovation, demolition, restoration, and insurance-rebuild templates, include a planning decision:

**Could the work disturb hazardous building materials?**

If yes or unknown:

- Create a hazardous-material assessment task.
- Prevent demolition or disturbance work from starting until the task is resolved.
- Store assessment documentation.
- Store abatement-clearance documentation where applicable.
- Allow the project manager to mark the requirement not applicable with a reason.

For BC projects involving older buildings, include an editable suggested asbestos-assessment task.

Do not present the software’s suggested task as legal advice or automatically declare a building safe.

Use this description:

“Confirm whether a qualified hazardous-material assessment is required before renovation or demolition work begins.”

## 14. Universal administrative and coordination tasks

Every project template should offer these editable administrative tasks:

### Lead-to-project handoff

- Confirm customer and site information
- Confirm approved scope
- Confirm exclusions
- Confirm estimate version
- Send estimate
- Follow up on estimate
- Record estimate approval
- Prepare contract
- Send contract
- Record contract signing
- Confirm required client selections
- Confirm communication contacts
- Confirm project manager
- Confirm site access
- Confirm working hours
- Confirm parking and material-delivery constraints

### Pre-construction planning

- Complete site measure
- Document existing conditions
- Upload existing-condition photos
- Confirm drawings
- Confirm specifications
- Determine applicable permits
- Determine applicable inspections
- Determine hazardous-material assessment requirement
- Identify required trades
- Confirm trade availability
- Create initial schedule
- Review schedule with project team
- Review schedule with client
- Create procurement schedule
- Confirm long-lead items
- Confirm storage plan
- Confirm waste-removal plan
- Confirm site-protection plan
- Complete pre-construction meeting

### Ongoing coordination

- Daily or scheduled project check-in
- Update task statuses
- Review upcoming work
- Review procurement readiness
- Review overdue tasks
- Review schedule risks
- Coordinate trades
- Notify client of milestone completion
- Record change requests
- Confirm approval before out-of-scope work
- Book required inspections
- Track inspection deficiencies
- Schedule reinspection
- Prepare next-phase handoff

### Closeout

- Complete final internal inspection
- Create deficiency list
- Complete corrective work
- Confirm final inspection requirements
- Book final inspection
- Record final inspection result
- Complete final cleaning
- Collect manuals and warranty documents
- Prepare client handover
- Complete client walkthrough
- Record client acceptance
- Archive project documents
- Close project

These must be template tasks, not mandatory tasks for every project.

## 15. Basement Finishing & Development template

Create a comprehensive but editable basement template.

Recommended default phases:

1. Project Setup & Planning
2. Permits, Selections & Procurement
3. Site Protection & Demolition
4. Layout & Framing
5. Plumbing Rough-In
6. HVAC Rough-In
7. Electrical Rough-In
8. Rough-In Inspections
9. Insulation, Air/Vapour and Fire/Acoustic Work
10. Drywall
11. Priming & Painting
12. Flooring
13. Doors, Trim & Millwork
14. Fixtures & Final Trade Completion
15. Deficiencies, Final QC & Handover

Phases should be optional and configurable.

### Project Setup & Planning tasks

Include editable defaults:

- Confirm approved project scope
- Confirm exclusions
- Complete detailed site measure
- Document existing conditions
- Confirm intended room uses
- Confirm ceiling heights and obstructions
- Confirm window and egress considerations
- Confirm mechanical-room access
- Confirm electrical-panel capacity review is assigned
- Confirm plumbing and drainage review is assigned
- Confirm HVAC requirements are assigned
- Determine permit requirements
- Determine inspection requirements
- Confirm hazardous-material assessment requirement
- Prepare drawings or layout plan
- Confirm client selections and deadlines
- Build project schedule
- Assign project team
- Hold pre-construction meeting
- Obtain signed contract
- Record change-order process
- Confirm site access and working hours
- Approve project start

### Permits, Selections & Procurement tasks

Include:

- Prepare permit application information
- Submit applicable permit application
- Track permit review
- Record permit approval
- Create selection register
- Obtain flooring selection
- Obtain paint colour and sheen selection
- Obtain door and hardware selection
- Obtain trim profile selection
- Obtain fixture selection
- Obtain lighting selection
- Confirm long-lead materials
- Create procurement schedule
- Order approved long-lead materials
- Confirm delivery dates
- Confirm storage conditions
- Verify materials before installation

### Site Protection & Demolition tasks

Include:

- Complete pre-work safety review
- Confirm hazardous-material clearance where applicable
- Photograph existing conditions
- Protect access routes
- Protect retained finishes
- Isolate work area
- Confirm dust-control plan
- Disconnect or protect affected services through qualified trades
- Complete approved demolition
- Remove debris
- Inspect exposed conditions
- Record concealed-condition issues
- Update scope and schedule where necessary
- Phase QC review

### Layout & Framing tasks

Include:

- Verify layout against approved plan
- Mark wall locations
- Verify door openings
- Verify mechanical clearances
- Verify electrical and plumbing coordination
- Install framing
- Install required backing
- Frame soffits and bulkheads
- Frame openings
- Verify dimensions
- Correct framing deficiencies
- Photograph concealed work
- Framing QC review
- Book applicable framing inspection

### Plumbing Rough-In tasks

Include:

- Confirm plumbing layout
- Confirm fixture specifications
- Procure rough-in materials
- Complete plumbing rough-in through qualified trade
- Perform required testing
- Photograph concealed work
- Complete plumbing-trade self-check
- Book applicable inspection
- Resolve deficiencies
- Record inspection result

### HVAC Rough-In tasks

Include:

- Confirm HVAC scope
- Confirm supply and return locations
- Confirm exhaust requirements
- Procure required components
- Complete rough-in through qualified trade
- Confirm clearances
- Test where applicable
- Photograph concealed work
- Book applicable inspection
- Resolve deficiencies
- Record inspection result

### Electrical Rough-In tasks

Include:

- Confirm electrical and lighting plan
- Confirm receptacle and switch locations
- Confirm fixture specifications
- Confirm low-voltage requirements
- Procure rough-in materials
- Complete electrical rough-in through qualified trade
- Complete contractor self-inspection
- Photograph concealed work
- Request applicable inspection before concealment
- Resolve deficiencies
- Record inspection result

### Rough-In Inspections tasks

Include:

- Verify framing ready for inspection
- Verify plumbing ready for inspection
- Verify HVAC ready for inspection
- Verify electrical ready for inspection
- Confirm site access for inspectors
- Complete required inspections
- Record each result
- Create deficiency tasks
- Complete corrections
- Schedule reinspections
- Confirm approval before concealment
- Rough-in milestone QC approval

### Insulation and enclosure-preparation tasks

Include:

- Confirm inspection approvals
- Confirm insulation specification
- Confirm air/vapour-control requirements
- Confirm fire-blocking requirements
- Confirm acoustic requirements
- Procure materials
- Install approved insulation
- Complete air/vapour work as applicable
- Complete fire and acoustic details as applicable
- Seal penetrations as required
- Photograph concealed work
- Complete QC review
- Book applicable inspection
- Resolve deficiencies

### Drywall tasks

Include:

- Confirm enclosure work is approved
- Verify board type and thickness
- Procure drywall and finishing materials
- Confirm delivery and storage
- Install drywall
- Complete taping
- Complete required coats
- Sand and inspect
- Correct surface defects
- Clean dust
- Complete drywall QC
- Release walls for primer

### Priming & Painting tasks

Include:

- Confirm approved colours and sheen
- Confirm required paint quantities
- Procure primer and paint
- Protect floors, fixtures, and finishes
- Complete surface inspection
- Patch remaining defects
- Apply primer
- Inspect primer coat
- Correct defects
- Apply finish coats
- Complete touch-ups
- Remove masking and protection
- Painting QC review

### Flooring tasks

Include:

- Confirm flooring approval
- Confirm product acclimation requirements
- Confirm substrate readiness
- Perform applicable moisture checks
- Confirm layout and transitions
- Procure installation materials
- Receive and inspect product
- Complete substrate preparation
- Install flooring
- Install transitions and nosings
- Protect completed floor
- Flooring QC review

### Doors, Trim & Millwork tasks

Include:

- Confirm door schedule
- Confirm trim profile
- Confirm hardware selections
- Measure openings
- Order doors and materials
- Receive and inspect materials
- Install jambs or prehung doors
- Install shims and fasteners
- Verify operation and clearances
- Install casing
- Install baseboards
- Install remaining millwork
- Fill, caulk, and prepare finishes
- Complete touch-ups
- Doors and millwork QC review

### Fixtures & Final Trade Completion tasks

Include:

- Confirm fixtures are on site
- Complete electrical finish
- Complete plumbing finish
- Complete HVAC finish
- Install accessories
- Test fixtures and controls
- Record trade deficiencies
- Complete corrections
- Record final trade inspections where applicable

### Deficiencies, Final QC & Handover tasks

Include:

- Complete internal final inspection
- Create deficiency list
- Assign deficiencies
- Complete deficiencies
- Verify completed corrections
- Complete final cleaning
- Book final inspection where applicable
- Record final inspection result
- Compile permits and inspection records
- Compile product information
- Compile warranties and manuals
- Complete client walkthrough
- Record client concerns
- Complete final corrective work
- Obtain QC approval
- Record client handover
- Mark project completed

## 16. Bathroom Remodel template

Recommended phases:

1. Project Setup & Selections
2. Permits & Procurement
3. Site Protection & Demolition
4. Framing & Substrate Preparation
5. Plumbing and Electrical Rough-In
6. Rough-In Inspections
7. Waterproofing
8. Tile and Flooring
9. Drywall, Paint & Finishes
10. Fixtures, Vanity & Millwork
11. Final Trade Completion
12. Final QC & Handover

Include task templates for:

- Site measure
- Fixture selection
- Tile selection
- Vanity selection
- Hardware selection
- Hazardous-material assessment decision
- Plumbing permit decision
- Electrical permit decision
- Material lead-time review
- Demolition
- Subfloor inspection
- Framing corrections
- Plumbing rough-in
- Electrical rough-in
- Required inspections
- Waterproofing preparation
- Waterproofing installation
- Waterproofing QC or applicable inspection
- Tile layout approval
- Tile installation
- Grouting and sealing where applicable
- Vanity installation
- Countertop coordination
- Fixture installation
- Shower-door measure and installation
- Mirror and accessory installation
- Painting
- Final testing
- Deficiency completion
- Final cleaning
- Client walkthrough

## 17. Interior Painting template

Recommended phases:

1. Project Setup & Colour Approval
2. Procurement & Scheduling
3. Site Protection
4. Surface Preparation
5. Priming
6. Finish Coats
7. Touch-Ups, QC & Handover

Include tasks for:

- Confirm scope and exclusions
- Confirm surfaces included
- Confirm colours
- Confirm sheen
- Confirm approved samples
- Calculate quantities
- Procure primer
- Procure paint
- Procure consumables
- Confirm work-area access
- Protect floors and fixtures
- Move or protect furniture
- Patch defects
- Caulk gaps
- Sand surfaces
- Clean surfaces
- Apply primer
- Inspect primed surfaces
- Correct defects
- Apply first finish coat
- Inspect first coat
- Apply final coat
- Complete cut-line review
- Complete touch-ups
- Remove protection
- Clean work area
- Complete lighting-condition QC
- Complete client walkthrough

## 18. Flooring Installation template

Recommended phases:

1. Project Setup & Product Approval
2. Procurement & Delivery
3. Site Preparation
4. Substrate Assessment & Correction
5. Flooring Installation
6. Transitions, Trim & Finishing
7. Protection, QC & Handover

Include tasks for:

- Confirm measured area
- Confirm waste allowance
- Confirm product
- Confirm installation method
- Confirm manufacturer requirements
- Confirm acclimation requirements
- Confirm transition details
- Confirm baseboard treatment
- Order flooring
- Order underlayment or barrier where applicable
- Order transitions and nosings
- Confirm delivery
- Inspect delivered material
- Confirm storage conditions
- Remove existing flooring where included
- Inspect substrate
- Perform applicable moisture checks
- Correct substrate defects
- Confirm starting layout
- Install flooring
- Install transitions
- Install or reinstall baseboards
- Complete touch-ups
- Protect completed flooring
- Complete QC
- Complete client walkthrough

## 19. Insurance Rebuild template

Recommended phases:

1. Emergency Handoff & Documentation
2. Scope, Estimate & Authorization
3. Hazardous-Material and Safety Review
4. Demolition & Stabilization
5. Drying, Remediation or Abatement
6. Reconstruction Planning & Procurement
7. Rough Construction
8. Rough-In Trades & Inspections
9. Insulation & Drywall
10. Interior Finishes
11. Fixtures, Millwork & Final Trades
12. Deficiencies, Documentation & Handover

Include tasks for:

- Confirm loss information
- Confirm customer and adjuster contacts
- Document pre-existing and loss-related conditions
- Photograph affected areas
- Confirm emergency work completed
- Confirm authorized scope
- Prepare estimate
- Send estimate
- Follow up with responsible parties
- Record authorization
- Track scope revisions
- Determine hazardous-material assessment requirements
- Complete required testing
- Receive abatement clearance
- Complete demolition
- Confirm drying or remediation completion
- Record moisture-clearance documentation
- Confirm reconstruction scope
- Confirm selections
- Create procurement schedule
- Coordinate permits
- Coordinate inspections
- Complete reconstruction phases
- Track change approvals
- Complete internal QC
- Complete deficiencies
- Compile documentation
- Complete customer walkthrough
- Record handover

Insurance-provider-specific procedures must remain configurable.

Do not hard-code one insurer’s process as universal.

## 20. Phase view

The Phases section should show:

- Ordered phases
- Phase status
- Phase start and end dates
- Phase progress
- Required tasks completed
- Required tasks remaining
- Procurement readiness
- Inspection status
- QC status
- Phase blockers
- Assigned phase lead
- Actions

Allow switching between:

- Phase list
- Phase timeline

Selecting a phase should open its complete task, procurement, inspection, blocker, and QC details.

## 21. Tasks view

Place Tasks first in the project navigation.

Support:

- List view
- Kanban view
- Gantt/timeline view

The task list should show:

- Task name
- Type
- Phase
- Status
- Priority
- Assignee
- Start date
- Due date
- Blocked state
- Procurement state, when relevant
- QC or inspection state, when relevant
- Progress
- Actions

Provide saved filters such as:

- My Tasks
- Overdue
- Due This Week
- Blocked
- Procurement
- Inspections
- QC Reviews
- Unassigned
- Completed

## 22. Phase completion calculation

Phase progress must be based on its tasks.

Recommended calculation:

```text
Sum of required and optional task progress
÷
Number of active phase tasks
```

If task weights are implemented reliably, allow weighted progress.

A phase may reach 100% task progress but must remain **Ready for QC** until its QC gate is approved.

Use these distinctions:

- Task progress: 100%
- Phase execution: 100%
- QC status: Ready for Review
- Phase status: Not yet Completed

Only after QC approval:

- QC status: Approved
- Phase status: Completed
- Completion date: recorded
- Next phase: eligible to start

Do not display the phase as completed before QC approval.

## 23. Project completion

A project can be marked Completed only when:

- Every required phase is completed.
- Every required task is completed.
- Every required QC gate is approved.
- Every required inspection is passed or resolved.
- All critical corrective tasks are completed.
- Final handover tasks are completed.

Allow an authorized project manager to override completion requirements only with:

- Written reason
- User identity
- Date and time
- Recorded activity entry

## 24. Notifications and remote control

Project managers should be able to understand project health without being on site.

Add an actionable project-health summary:

- Tasks overdue
- Tasks due today
- Tasks due this week
- Blocked tasks
- Unassigned tasks
- Materials not ready
- Inspections awaiting action
- QC reviews awaiting action
- Rejected QC
- Schedule impact
- Current phase
- Next phase
- Forecast completion date

Do not add excessive popups.

Use in-app notifications for actionable exceptions:

- Task overdue
- Procurement late
- Inspection failed
- QC rejected
- Required task blocked
- Phase forecast delayed
- Project target date at risk

Notification actions should open the exact task, phase, procurement item, inspection, or QC record involved.

## 25. Activity history

Record important project-management actions:

- Template applied
- Phase added
- Phase renamed
- Phase reordered
- Task created
- Task reassigned
- Task rescheduled
- Task completed
- Task reopened
- Procurement status changed
- Inspection requested
- Inspection result recorded
- QC submitted
- QC approved
- QC rejected
- Corrective task created
- Phase completed
- Schedule override
- Project completed

Each activity entry should record:

- User
- Action
- Object
- Previous value
- New value
- Date and time
- Reason, when required

## 26. Permissions

Use existing permissions where possible.

Recommended controls:

- Workers can view assigned projects and update permitted assigned tasks.
- Phase leads can update tasks and submit phase QC.
- Project managers can manage phases, tasks, schedules, procurement, inspections, and QC.
- Authorized QC reviewers can approve or reject phase QC.
- Administrators can manage templates and override gates.

Do not show controls the user cannot use.

## 27. Implementation safeguards

Do not create five separate hard-coded project-management experiences.

Build one reusable template engine.

Seed the five requested templates as editable data.

Do not treat the task lists above as immutable regulatory checklists.

Label template tasks as operational defaults requiring project-manager review.

Do not claim that applying a template guarantees:

- Code compliance
- Permit approval
- Inspection approval
- Safety compliance
- Manufacturer compliance
- Insurance approval

The project manager remains responsible for confirming project-specific requirements with the applicable authority, qualified trade, manufacturer, consultant, insurer, and client.

## 28. Acceptance testing

Test the complete template workflow.

### Template test

1. Create a Basement Finishing project from the template.
2. Preview phases and tasks.
3. Remove one optional phase.
4. Add one custom phase.
5. Generate the project.
6. Confirm phases and tasks persist after refresh.
7. Edit the original template.
8. Confirm the active project does not change automatically.

### Procurement test

1. Add a Door Installation phase.
2. Generate its suggested procurement items.
3. Set a required-on-site date.
4. Confirm recommended order dates use lead time.
5. Mark materials Ordered.
6. Mark them Received.
7. Confirm dependent installation tasks unblock correctly.

### QC test

1. Complete every required task in a phase.
2. Confirm the phase becomes Ready for QC, not Completed.
3. Reject QC.
4. Create a corrective task.
5. Complete the corrective task.
6. Resubmit QC.
7. Approve QC.
8. Confirm the phase is then marked Completed.
9. Confirm the next phase becomes eligible.

### Inspection test

1. Mark an inspection applicable.
2. Attempt to complete a dependent concealment task before inspection.
3. Confirm the task is blocked.
4. Record a failed inspection.
5. Create deficiency tasks.
6. Complete deficiencies.
7. Record the passed reinspection.
8. Confirm dependent work becomes available.

### Remote-management test

Confirm the project manager dashboard accurately reports:

- Current phase
- Overdue tasks
- Blocked tasks
- Procurement delays
- Pending inspection
- Pending QC
- Forecast delay
- Assigned users
- Overall progress

## 29. Completion report

When complete, report:

- Template tables created
- Template cloning approach
- Active-project snapshot behavior
- Phase/task relationship model
- Procurement model
- Dependency model
- Inspection-gate model
- QC-gate model
- Corrective-task workflow
- Progress formulas
- Schedule-generation logic
- Permissions applied
- Templates seeded
- Acceptance-test results
- Required migrations
- Deployment steps
- Known limitations

Do not claim completion if templates, task generation, procurement dependencies, inspections, QC gates, persistence, or progress remain simulated.