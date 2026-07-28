Rebuild and stabilize only the Projects module of the Cstle Livn Web App so it works like a production-ready native project-management application.

Do not work on CRM, Teams, Inventory, global Finance, Aura, or other modules during this task unless a minimal compatibility change is required to make Projects work.

Do not redesign the application or replace its visual identity. Preserve the existing typography, colors, navigation, icon style, spacing language, and overall premium monochrome aesthetic.

Improve consistency and polish:

- Use properly rounded corners on cards, buttons, inputs, tabs, menus, dialogs, task bars, and Kanban cards.
- Use the existing design tokens instead of random hard-coded radii.
- Keep controls compact and professional.
- Make all controls responsive.
- Do not add decorative UI that does not perform a real function.
- Do not add mock projects, placeholder phases, placeholder tasks, placeholder users, or fake progress.

The objective is to make Projects reliable enough to operate construction and renovation projects daily and polished enough to present as a commercial SaaS product.

## 1. Audit before changing code

Inspect the complete project-management implementation before editing.

Relevant files currently include, but may not be limited to:

- `ProjectManagement.tsx`
- `ProjectDetailsReal.tsx`
- `ProjectKanban.tsx`
- `ProjectGanttChart.tsx`
- `TaskKanban.tsx`
- `TaskGanttChart.tsx`
- `TaskDialog.tsx`
- `EditProjectPhasesDialog.tsx`
- `CreateProjectDialog.tsx`
- `PhaseProgressWidget.tsx`
- `PhaseProgressWithCompletion.tsx`
- `src/features/projects/api.ts`
- `src/features/projects/useProjects.ts`
- `src/features/tasks/api.ts`
- `src/features/tasks/useTasks.ts`
- `AppContext.tsx`
- Supabase project, phase, and task tables

There are overlapping project and task views. Determine which components are actually rendered and consolidate duplicate implementations.

Do not leave two competing versions of the same Gantt, Kanban, progress, phase, or task-management logic.

Before implementation, identify:

- Which component owns the Projects page
- Which component owns Project Details
- Which components are obsolete duplicates
- Which Supabase tables are authoritative
- Which fields are read from `localStorage`
- Which project and task buttons have incomplete or placeholder handlers
- Where progress is calculated
- Where phases are stored
- How team-member assignments are stored
- Whether project and task IDs are consistently UUIDs
- Whether task API types match the values actually submitted

Fix the implementation rather than layering another project system over the existing one.

## 2. Single source of truth

Supabase must be the authoritative source for:

- Projects
- Project phases
- Tasks
- Task order
- Task status
- Task phase
- Task assignee
- Task dates
- Project dates
- Project status
- Project progress

Do not use `localStorage` as the authoritative source for project phases.

`localStorage` may only remember harmless UI preferences such as the user’s last selected view.

Remove production dependencies on:

```ts
localStorage.getItem("project_phases")
```

Do not silently fall back to generic phases when a saved project already has its own phase structure. If a project has no phases, show a clear empty state allowing the user to add phases or apply a phase template.

All mutations must:

1. Save to Supabase
2. Return the saved record
3. Update local state immediately
4. Revalidate the relevant query
5. Show success or failure feedback
6. Remain correct after page refresh

Never display a successful toast before confirming the database operation succeeded.

## 3. Data model

Inspect the existing schema and reuse compatible fields where possible.

A project must support:

- ID
- Title
- Client
- Description
- Location
- Status
- Start date
- Target end date
- Actual completion date, optional
- Current phase
- Progress
- Project team
- Created date
- Updated date
- Archived state, if supported

A project phase must support:

- Stable phase ID
- Project ID
- Name
- Description, optional
- Position/order
- Start date
- End date
- Status
- Progress
- Created date
- Updated date

A task must support:

- Stable task ID
- Project ID
- Phase ID
- Title
- Description
- Status
- Priority
- Assignee ID
- Start date
- Due date
- Completed date
- Position/order
- Progress
- Created date
- Updated date

Use stable phase IDs for relationships. Do not rely only on phase-name strings because renaming a phase must not disconnect its tasks.

If the current schema stores phases as JSON inside a project, assess whether it can safely support stable IDs, ordering, dates, and task relationships. If not, create a normalized `project_phases` table using a safe migration.

Do not delete or overwrite existing project or task data.

Provide a migration strategy for existing JSON phases and existing task phase names. Preserve existing relationships wherever possible.

## 4. Fix task API inconsistencies

Audit and correct the project task API types and field mapping.

The current task implementation contains inconsistent names such as:

- `project_id` versus `projectId`
- `assignee_id` versus `assignee`
- `due_date` versus `dueDate`
- `completed_date` versus `completedDate`

Define one clear frontend type and one clear database mapping.

The TypeScript interfaces must accurately describe every field used by `createTask`, `updateTask`, and the UI.

Do not reference properties in `createTask` that are absent from `TaskInput`.

Use:

- UUID strings for project IDs
- UUID strings for phase IDs
- UUID strings for team-member assignee IDs
- `null` for unassigned tasks
- ISO date values for database dates

Do not silently turn an invalid assignee into `null` without notifying the user. Validate assignments before submission and show a clear error.

## 5. Projects page

The main Projects page should support three production-ready views:

- List
- Kanban
- Gantt

Remove Grid and Calendar views from the primary interface for now unless they are already fully functional and add meaningful value.

Remember the last selected view as a UI preference.

### List view

The list must show real project data:

- Project name
- Client
- Location
- Status
- Current phase
- Start date
- Target end date
- Progress
- Assigned team
- Quick actions

Support:

- Search
- Status filter
- Phase filter
- Team-member filter
- Date filter
- Sorting
- Opening project details
- Editing a project
- Archiving a project
- Deleting a project only with explicit permission and confirmation

Do not show budgets, spending, transactions, income, profit, or finance columns.

### Project Kanban view

The project Kanban should group projects by project status:

- Planning
- Active
- On Hold
- Delayed
- Completed

Allow projects to be dragged between status columns.

On drop:

- Persist the new status to Supabase
- Update the UI immediately
- Roll back if saving fails
- Show an error message if persistence fails

Moving a project between status columns must not arbitrarily change its phase or progress.

Use a horizontal scroll experience on smaller screens.

### Project Gantt view

The project Gantt must use real project start and target-end dates.

Show:

- Project name
- Start date
- Target end date
- Duration
- Status
- Progress within the project bar
- Today marker
- Day/week/month zoom
- Horizontal timeline scrolling

Do not calculate fake positions when dates are missing.

Projects without valid dates should appear in a clearly labelled “Dates required” section and provide an Edit Dates action.

If drag-to-reschedule is implemented, save updated dates to Supabase and roll back on failure. If reliable drag-to-reschedule cannot be implemented in this pass, use an explicit Edit Dates dialog rather than a fake draggable interface.

## 6. Project Details structure

Reorganize Project Details around project management.

Use these visible sections or tabs:

1. Overview
2. Tasks
3. Timeline
4. Files, only if the existing file system is functional
5. Activity, only if existing activity data is real

Hide these project-detail tabs for now:

- Transactions
- Finance
- Purchases
- Income
- Expenses
- Profit
- Financial reports

Do not delete the finance, transaction, or purchase code and do not drop finance tables. Remove those imports, hooks, queries, calculations, tabs, buttons, banners, and widgets from the visible Projects experience.

Project Details should not load finance or transaction data in the background when those sections are hidden.

Do not call:

- Project transaction APIs
- Spending calculators
- Phase-spend calculators
- Purchase APIs

from the visible Project Details experience.

Keep the underlying finance code isolated for future reactivation.

## 7. Project Overview

The Overview should show:

- Project title
- Client
- Location
- Project status
- Current phase
- Project start date
- Target end date
- Overall progress
- Project team
- Project description
- Upcoming tasks
- Overdue tasks
- Phase summary

Every Edit button must work.

Support editing:

- Project title
- Description
- Location
- Client
- Status
- Start date
- Target end date
- Team assignments

Validate:

- End date cannot precede start date.
- Completed projects should have 100% progress or require explicit confirmation.
- Project status and current phase must not contradict each other.
- A project cannot reference a deleted client or team member.

Use clear empty states where information has not been supplied.

## 8. Phase management

Each project must have a manageable ordered phase list.

Users with appropriate permission must be able to:

- Add a phase
- Rename a phase
- Edit phase description
- Reorder phases
- Set phase start and end dates
- Change phase status
- Delete an empty phase
- Move tasks from one phase to another
- Apply a saved phase template when creating a project

Renaming a phase must preserve its stable ID and all assigned tasks.

Before deleting a phase containing tasks, require the user to:

- Move the tasks to another phase, or
- Explicitly delete those tasks

Never orphan tasks.

Do not store global project phases only in browser storage.

### Current phase calculation

The displayed current phase must come from actual phase state.

Use this priority:

1. The active phase explicitly marked `In Progress`
2. Otherwise, the first incomplete phase in phase order
3. If every phase is complete, show `Completed`
4. If the project has no phases, show `No phases configured`

Do not display a placeholder phase.

Do not determine the current phase solely from the current date.

## 9. Task management

Within a project, tasks must support:

- Create
- Rename
- Edit description
- Delete with confirmation
- Duplicate
- Assign to a project phase
- Move to another phase
- Assign to a team member
- Remove assignment
- Set priority
- Set status
- Set start date
- Set due date
- Mark complete
- Reopen
- Reorder
- Search
- Filter by status
- Filter by phase
- Filter by priority
- Filter by assignee

Task statuses should use one canonical set:

- To Do
- In Progress
- Review
- Completed

Remove inconsistent alternate status values unless a safe mapping is provided.

Task progress should follow status consistently:

- To Do: 0%
- In Progress: editable from 1–99%
- Review: retain current progress but do not automatically mark complete
- Completed: 100%

When reopening a completed task, remove or update its completion date appropriately.

A task due date cannot be earlier than its start date.

A task’s phase must belong to the same project.

An assignee must be an active team member available to that project.

## 10. Task List view

The default project task view should be List.

Show:

- Task name
- Phase
- Status
- Priority
- Assignee
- Start date
- Due date
- Progress
- Actions

Support inline status changes where reliable.

Clicking a task should open one consistent edit dialog.

Remove duplicate task-edit experiences.

Every row action must work and persist after refresh.

## 11. Task Kanban view

Inside Project Details, Task Kanban should group tasks by status:

- To Do
- In Progress
- Review
- Completed

Allow drag-and-drop between columns.

Dragging a task must:

- Persist its new status
- Apply the correct progress rule
- Set `completed_date` when moved to Completed
- Clear or revise `completed_date` when reopened
- Update project and phase progress
- Roll back if the database update fails

Allow task ordering within each column and persist the position.

Provide keyboard-accessible alternatives to drag-and-drop through a Move Status menu.

## 12. Task Gantt and timeline

Inside Project Details, the Timeline view should display phases and tasks on one coherent Gantt timeline.

Group tasks under their phases.

Display:

- Phase bars
- Task bars
- Assignee
- Status
- Progress
- Dependencies only if the data model genuinely supports them
- Today marker
- Day/week/month zoom

The timeline must be based on actual start and due dates.

Do not fabricate durations from phase names or generic day counts.

Tasks without dates should appear in a “Dates required” group with an Edit Dates action.

When task dates change:

- Validate the range
- Save to Supabase
- Recalculate phase date boundaries when appropriate
- Recalculate project date warnings
- Refresh every view

If a task falls outside its phase dates, show a warning and provide choices:

- Extend the phase
- Keep the dates and accept the warning
- Move the task to another phase

Do not silently alter user-entered dates.

## 13. Progress calculations

Remove the existing logic that chooses the higher of time-based progress and phase-based progress.

Elapsed calendar time is not completed work.

Calculate task progress from task data.

Recommended project progress:

```text
Sum of task progress across all project tasks
÷
Number of project tasks
```

If task effort or weights already exist and are reliable, use a weighted calculation instead and document it.

Recommended phase progress:

```text
Sum of task progress in the phase
÷
Number of tasks in the phase
```

Rules:

- A phase with no tasks shows 0%, not fake progress.
- A project with no tasks shows 0%.
- Completed tasks count as 100%.
- Deleted tasks must no longer affect progress.
- Moving a task between phases recalculates both phases.
- Project and phase progress bars must use the same calculation everywhere.
- Do not independently store conflicting progress values unless a database trigger or service keeps them synchronized.

If progress is derived, compute it from tasks or maintain it through one centralized recalculation function.

Every list, card, Kanban view, Gantt view, and project detail must show the same progress value.

## 14. Lightweight cost control

Do not expose full finance functionality in Projects during this phase.

If a lightweight cost-control field is necessary, limit it to an optional internal project budget summary visible only to authorized managers:

- Estimated project allowance
- Committed cost
- Actual cost
- Remaining allowance

However, do not implement this summary unless the current data can support it reliably without exposing the complete finance system.

For this release, prioritize hiding finance cleanly over building another incomplete cost feature.

## 15. Permissions

Respect existing role permissions.

At minimum:

- Viewers can view projects and tasks.
- Assigned workers can update their permitted task status and progress.
- Project managers can create/edit projects, phases, dates, tasks, and assignments.
- Administrators can archive or delete projects.

Hide actions the current user cannot perform.

Do not rely only on hidden buttons; enforce permissions in the database/API layer where the current architecture supports it.

## 16. Button and interaction audit

Audit every visible Projects button and interaction.

This includes:

- Add Project
- Open Project
- Edit Project
- Archive Project
- Delete Project
- Add Phase
- Rename Phase
- Reorder Phase
- Delete Phase
- Add Task
- Edit Task
- Rename Task
- Duplicate Task
- Delete Task
- Assign Task
- Move Task
- Change Status
- Change View
- Filters
- Search
- Gantt zoom
- Previous/next timeline controls
- Dialog Save
- Dialog Cancel
- Back navigation

For every control, verify:

- It has a real handler.
- It performs the labelled action.
- It saves successfully.
- It shows loading state.
- It prevents double submission.
- It provides success or error feedback.
- It remains correct after refresh.
- It is keyboard accessible.
- Icon-only buttons have accessible labels and tooltips.
- Destructive actions require confirmation.

Remove buttons that do nothing or lead to unfinished placeholder experiences.

## 17. Production polish

Use consistent rounded corners throughout Projects:

- Primary and secondary buttons: fully rounded or the established app button radius
- Cards and dialogs: consistent large radius
- Inputs and selectors: consistent control radius
- Kanban cards: consistent card radius
- Gantt bars and progress bars: fully rounded ends where appropriate
- Menus and popovers: consistent radius

Do not mix arbitrary values such as `rounded-[6px]`, `rounded-[8px]`, and unrelated radius values unless they come from a documented design token.

Support:

- Desktop
- Tablet
- Mobile
- Horizontal scrolling for wide Kanban and Gantt views
- Useful empty states
- Loading skeletons
- Error states with Retry
- Long project and task names
- Large numbers of tasks
- Projects with no tasks
- Projects with no phases
- Unassigned tasks
- Missing dates

## 18. Database safety

Do not delete existing projects, tasks, phases, team assignments, clients, finance data, transactions, purchases, or activity history.

Before any schema change:

- Inspect the live schema.
- Create an idempotent migration.
- Use `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` where appropriate.
- Backfill relationships safely.
- Document rollback steps.
- Verify row-level security policies.
- Preserve existing IDs.

Do not use mock data to hide schema problems.

## 19. Acceptance tests

Complete and document these tests using real Supabase persistence:

### Project tests

1. Create a project.
2. Edit its name, description, location, client, status, team, and dates.
3. Refresh and confirm all changes remain.
4. Open it from List, Kanban, and Gantt.
5. Move it between Kanban status columns.
6. Confirm the new status remains after refresh.
7. Archive and restore the project if archive support exists.
8. Confirm unauthorized users cannot delete it.

### Phase tests

1. Add three phases.
2. Rename the second phase.
3. Reorder the phases.
4. Add tasks to each phase.
5. Move a task between phases.
6. Refresh and confirm the phase order and relationships remain.
7. Attempt to delete a phase containing tasks and confirm orphaning is prevented.

### Task tests

1. Add a task.
2. Rename it.
3. Edit its description.
4. Set its phase.
5. Assign it to a real active team member.
6. Set start and due dates.
7. Move it through every Kanban status.
8. Confirm progress and completion date update correctly.
9. Move it to another phase.
10. Confirm every change appears in List, Kanban, and Gantt.
11. Refresh and confirm every change remains.
12. Delete it and confirm project and phase progress recalculate.

### Timeline tests

1. Confirm task bars use saved dates.
2. Confirm tasks without dates do not receive fake dates.
3. Confirm the today marker is correct.
4. Confirm day/week/month zoom works.
5. Confirm invalid date ranges are rejected.
6. Confirm tasks outside phase dates generate a warning.

### Progress tests

1. Create four tasks.
2. Complete two.
3. Confirm project progress reflects the actual task calculation.
4. Move one completed task to another phase.
5. Confirm both phase progress values update.
6. Delete one task.
7. Confirm every progress display remains consistent.

### UI tests

1. Test every visible button.
2. Confirm no button is inert.
3. Confirm destructive actions require confirmation.
4. Confirm dialogs prevent duplicate saves.
5. Confirm layouts work at mobile, tablet, and desktop widths.
6. Confirm all visible corners and controls follow the same radius system.

## 20. Completion report

When finished, provide:

- The original root causes discovered
- Duplicate or obsolete components removed
- Components consolidated
- Files changed
- Database migrations created
- Existing data migrated
- New authoritative phase structure
- Project progress formula
- Phase progress formula
- Task field mapping
- Finance elements hidden
- Buttons repaired
- Permission rules applied
- Acceptance-test results
- Known limitations
- Deployment steps

Do not claim completion if any core Project, phase, task, Kanban, Gantt, persistence, assignment, progress, or date behavior remains simulated or nonfunctional.