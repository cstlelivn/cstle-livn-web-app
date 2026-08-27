# Cstle Livn Web App — Project Handoff

## Public Project Fit intake — August 27, 2026

- Post-launch visual refinement: the public Project Fit option previously
  labeled `Rental-income suite` is now the clearer `Short-term rental
  (shortlet)`. Hero and question display sizes were stepped down at phone and
  desktop breakpoints, text containers were widened, and hyphenation is
  disabled at the page root so words are never broken to satisfy a line. The
  form surface, choices, inputs and primary actions now use restrained borders,
  soft elevation, keyboard-visible focus, and short transform/shadow feedback;
  step transitions are subtle and respect reduced-motion preferences. These
  are conversion-usability decisions, not a change to scoring or lead data.
- The public hero headline was tightened after user review from `Plan the
  basement your home needs next.` to the approved, more direct `Plan a basement
  that works for you.` Keep this exact wording unless the user requests another
  copy change.
- The separate `cstle-website` repository now contains a reusable public
  Revenue OS intake module and a dedicated Regina Basement Development journey
  at `/book/basement-development-regina`. The general `/book` form remains for
  every other service and now captures the same UTM/click-id/landing/referrer
  attribution; its email/phone fields correctly accept either contact method
  rather than requiring both.
- The basement journey uses four progressive steps (outcome, budget/timeline,
  readiness, contact), the same deterministic Hot/Warm/Nurture/Reject rules as
  the admin app, and sends qualification answers/reasons plus first-touch
  attribution directly into `leads`. Hot/Warm submissions enter Qualified;
  others enter New. GA4 receives non-PII start/step/conversion events only.
- Migration `20240057_public_lead_intake_automation.sql` is additive and **has
  not been run at the time of this note**. It assigns the seeded
  `regina-basement-development` offer server-side and, for public booking/fit
  submissions, creates the initial activity, attribution touchpoint,
  urgency-based follow-up task, and `lead.captured` automation-outbox event.
  Anonymous visitors remain INSERT-only on `leads`; SECURITY DEFINER triggers
  create internal operational records without opening their RLS policies.
- The public page can capture scored leads before `20240057` is run, but offer
  assignment, touchpoint history, automatic task, and follow-up outbox hook do
  not exist until the user runs that migration successfully in Supabase.
- Website commit `ad356f4` was pushed to `cstle-website/main` and production was
  verified serving `/book/basement-development-regina` from bundle
  `index-BkxgTd4U.js` with no browser-console errors. The migration is in web
  app commit `e25c2be`; deployment of frontend code does not run SQL, so its
  database status remains pending until the user explicitly confirms success.

## Revenue OS foundation — August 26, 2026 (repository only; migration not run)

- The Saskatchewan Revenue OS is being added around the existing CRM,
  estimating, and estimate-to-project conversion flows rather than creating a
  second sales system. Cstle remains the source of truth; external ad,
  email/SMS, Make, and AI services are replaceable adapters.
- Migration `20240056_revenue_os_foundation.sql` is written but **has not been
  run**. It is additive: reusable `revenue_offers`; offer/qualification,
  ownership, response and UTM/click-id fields on `leads`; the requested
  New → Contacted → Qualified → Consultation Booked → Site Visit → Estimate →
  Won/Lost pipeline; lead activity, operational tasks, appointments,
  attribution touchpoints, daily ad spend, and a retryable automation outbox;
  plus an RLS-authorized KPI view. It seeds the first offer,
  `regina-basement-development`, without hard-coding future offers into the
  table design.
- Do not wire frontend reads/writes to migration-56 columns until the user
  confirms the migration ran successfully in Supabase. The existing CRM stays
  operational on its old `status` vocabulary in the meantime.
- `src/app/src/features/revenue/scoring.ts` is database-independent and safe
  before migration deployment. It implements the first deterministic Project
  Fit score (Hot/Warm/Nurture/Reject) with explicit service-area,
  budget/timeline, property, funding, consultation, and hard-disqualifier
  signals. AI may later explain or suggest follow-up, but must not silently
  override this deterministic qualification result.
- Migration `20240056` was confirmed successfully run by the user on August
  26, 2026, including RLS. The first application wiring is now present:
  lead API fields for Revenue OS data, an eight-stage CRM overview with
  qualified/pipeline/won/close-rate metrics, and a Project Fit panel in each
  lead record that saves the deterministic score/band/reasons and advances
  Hot/Warm leads to Qualified. This frontend is not yet deployed at the time
  of this note; verification and deployment state must be recorded separately.
- Live visual QA on `admin.cstle.ca` confirmed the new production bundle and
  authenticated CRM render. A follow-up polish prevents unassessed leads from
  being labeled Reject/0 (they show Not scored until there is input) and
  formats the raw lead-created timestamp in the fixed Regina org timezone.
- Production QA caught a runtime regression in that timestamp polish: the
  shared formatter accepts a `Date`, not the database timestamp string. The
  first deployment passed the string directly and opening a lead threw
  `RangeError: Invalid time value`. `LeadDetailsDialog` now constructs and
  validates the `Date` first and falls back to `date unavailable`; this repair
  must remain covered by live lead-dialog QA, not build checks alone.

## Revenue OS sales operations + UUID fallback fix — August 27, 2026

- The recurring `invalid input syntax for type uuid: "1"` project-phase error
  came from `RecentTasksWidget.tsx`, which passed a fake numeric project ID of
  `1` into `TaskDialog` when neither a selected task nor a real project was
  available. The fake fallback is removed; `TaskDialog.projectId` now accepts
  the UUID string type the rest of the project model actually uses.
- The next Revenue OS layer adds `features/revenue/api.ts` and a compact
  `LeadOperationsPanel` inside each lead: owner assignment, shared next-action
  tasks, consultation/site-visit/estimate-review scheduling, and database-backed
  activity notes/history. Scheduling advances the lead to Consultation Booked
  or Site Visit through the existing pipeline trigger, so the activity log and
  automation outbox receive the same change. No new migration is required;
  this uses the tables already deployed in `20240056`.
- Before this batch ships, the lead-dialog display typography was tightened at
  the user's request: every Anybody use in this dialog is explicitly width 135
  and weight 700. Customer name, estimated value, project address, and reminder
  title were reduced, with compact line heights and safe long-text wrapping so
  realistic long names/addresses remain composed inside the dialog. This is a
  dialog-specific visual decision; the global brand width remains unchanged.
- Stabilization before the next Revenue OS phase: inline lead mutations now
  merge into the open dialog rather than closing it, while the shared list is
  refreshed in the background. The second raw Submission timestamp now reuses
  the validated Regina `addedLabel`. Sales Operations writes are single-flight,
  disable relevant controls while saving, surface success/failure, and rethrow
  parent update failures so the panel cannot falsely report completion.

Read this first, before touching code. It's written so a new developer, a
new AI agent, or a fresh Claude Code session can pick this project up cold
with no other context.

## What this is

A construction project-management web app for Cstle Livn: projects, phases,
tasks, multi-person task assignment, per-person work-session timers, QC
review, a performance-rating system ("Aura"), CRM, inventory, finance, and
role-based permissions from Associate up to Super Admin. Deployed on Vercel
(frontend) + Supabase (Postgres, Auth, Realtime, Edge Functions).

## Stack & where things live

- **Frontend**: React + TypeScript + Vite + Tailwind v4. Real entry point is
  `src/main.tsx` → `src/app/App.tsx` → `src/styles/index.css`. There is a
  second, unused entry point at `src/app/src/main.tsx` — ignore it, it's
  dead scaffold code, not what actually builds/deploys.
- **Components**: `src/app/components/*.tsx` (flat, not nested by feature).
- **Data layer**: `src/app/src/features/<feature>/api.ts` (Supabase queries)
  + `use<Feature>.ts` (realtime-subscribed hooks). This pattern is
  consistent — new features should follow it, not call Supabase directly
  from components.
- **Database**: `supabase/migrations/*.sql`, numbered `20240001` upward, run
  **manually** in the Supabase SQL Editor (no CLI/DB connection is
  available in a Claude Code session — every migration must be handed to
  the user to run, in order, and confirmed before building code that
  depends on it). All migrations through `20240027` have been run.
- **Edge function**: `supabase/functions/make-server-bcab437c/index.ts` is
  canonical. There is a **mirror copy** at
  `src/app/supabase/functions/server/index.ts` that the repo convention
  expects to be kept identical — after editing the canonical file, copy it
  over the mirror (`cp supabase/functions/make-server-bcab437c/index.ts
  src/app/supabase/functions/server/index.ts`). These two drift silently if
  you forget.
- **Edge function deploys are NOT automatic.** Pushing to `main` deploys
  the frontend via Vercel, but the edge function needs a manual deploy
  (Supabase Dashboard → Edge Functions → deploy, or `supabase functions
  deploy make-server-bcab437c` via CLI). Always tell the user explicitly
  when an edge function change needs deploying — don't assume git push
  covers it.

## Standing rule: push immediately after every verified fix

Once a fix or feature is verified (build/typecheck/tests pass, and live
behavior checked where feasible), commit and push it **without asking
first** — this is pre-authorized, not a per-change confirmation. The user
checks the live deployed site, not localhost or an uncommitted diff, so
unpushed work is invisible to them no matter how well it's verified
locally; asking every time is unnecessary friction. This applies to every
Cstle repo, not just this one (confirmed August 19, 2026 to also cover the
separate `cstle-website` marketing-site repo). Normal git safety practices
still apply — stage specific files by name, check `git status`/`git diff`
before broad adds, never force-push, never touch someone else's
uncommitted local changes — this rule only removes the confirmation step
for the push itself.

## Handoff documentation is part of every change

- **`CLAUDE.md` must be updated before any meaningful piece of work is
  considered complete.** This is a standing project rule, not optional
  cleanup. Record new migrations and whether they have actually been run,
  architecture/product decisions, new services and required secrets,
  security or permission changes, deployment steps, important operational
  workflows, and any known gaps or follow-up work created by the change.
- Write updates for a fresh AI agent or developer arriving with no prior chat
  context. Do not claim a migration or Edge Function is deployed merely
  because its code exists in the repository; record repository state and live
  deployment state separately and accurately.
- If another project instruction or code comment becomes stale because of a
  change, update it in the same work rather than leaving conflicting guidance.

## Team member delete-and-reassign — August 25, 2026

- **The problem**: deleting a team member with any recorded history (task
  assignments, work sessions, Aura scores, QC attributions, time
  corrections) was permanently blocked by `ON DELETE RESTRICT` foreign
  keys — the only options were "mark inactive" or manually clearing
  history in the database. User wanted a real delete path, with active
  tasks moving to someone else, gated behind an explicit confirmation step
  so it can't happen by accident.
- **Explicit product decision, confirmed with the user**: active/incomplete
  task assignments move to a person the admin picks at delete time (not
  auto-derived per project). Already-completed work (finished sessions,
  Aura scores, QC results, time corrections) is **never** reassigned to
  that person — doing so would fabricate who actually did the work and
  corrupt real Aura performance numbers, which directly conflicts with
  this app's existing Aura design principle (see "Aura (performance
  rating)" above). Instead those historical rows are kept, with the
  identity column set to `NULL` and the deleted person's name snapshotted
  into a new `..._name_snapshot` text column, so the record stays
  human-readable without pretending someone else did that work.
- Migration `20240055_team_member_deletion.sql`: drops `NOT NULL` on the
  five FK columns that needed to survive their person being deleted
  (`task_assignees.team_member_id`, `task_work_sessions.team_member_id`,
  `task_aura_scores.team_member_id`,
  `task_completion_attributions.recorded_by`,
  `task_time_corrections.corrected_by`), adds the matching snapshot
  columns, and adds `delete_team_member_and_reassign(p_team_member_id,
  p_reassign_to)` — a `SECURITY DEFINER` RPC (Super Admin/Admin/Manager
  only) that: moves every active `task_assignees` row to the reassign
  target (finishing any open timer session first, same handling as
  `unassign_task_member` from `20240032`); snapshots-and-nulls the
  identity column on every historical row across `task_assignees`,
  `task_work_sessions`, `task_aura_scores`, `task_completion_attributions`,
  `task_time_corrections`; nulls (no snapshot needed) purely incidental
  audit columns (`assigned_by`, `delay_reviewed_by`, `resolved_by`,
  `completed_by`, `marketing_saved_by`, `created_by`/`approved_by` on
  dependencies/tools/materials, `requested_by`); then deletes the
  `team_members` row. `projects.supervisor_id` already had `ON DELETE SET
  NULL` from `20240035`, so it needs no handling here.
- **Real bug found in passing, deliberately not fixed in this migration**:
  `is_manager_or_admin()` (`20240004_role_source_and_rls.sql`) only checks
  `jwt_role() IN ('Super Admin', 'Manager')` — it silently excludes
  `Admin` despite Admin having the same `canEditTeam`/`canEditProjects`
  permissions as Manager in `AuthContext.tsx`. This is the same
  Admin-lockout bug class already found and fixed in the edge function's
  `hasPermission()` matrix (see the role-model-split section below), this
  time at the RLS-policy level, affecting every policy that calls this
  helper (e.g. `team_members_insert`/`update`/`delete` in
  `20240023_associate_scoped_rls_hardening.sql`). Flagged as its own
  follow-up task rather than fixed here since widening it touches every
  policy using it — a separate, larger change than this feature. The new
  `delete_team_member_and_reassign()` function does NOT reuse this helper;
  it checks `jwt_role() IN ('Super Admin', 'Admin', 'Manager')` directly.
- **Frontend**: `TeamManagementNew.tsx`'s existing delete confirmation
  dialog is unchanged for the common case (no history → deletes
  instantly, same as before). When the delete is blocked by history, a
  second `AlertDialog` opens instead of just showing an error toast: a
  "Reassign active tasks to" picker (any other active team member) and a
  "Type `<exact name>` to confirm" text input — the destructive button
  stays disabled until both are filled in and the typed name matches
  exactly. New `deleteTeamMemberAndReassign()` in
  `src/app/src/features/team/api.ts` (calls the RPC via `supabase.rpc`)
  and a matching `AppContext.tsx` wrapper.
- `npx tsc --noEmit -p tsconfig.sync.json`, `npm run build`, and `npm test`
  (9/9) all pass. **Not verified live** — this is a destructive,
  permission-gated admin action against real team member records, so it
  wasn't exercised against the real database from this session. **Not yet
  run**: migration `20240055_team_member_deletion.sql`. The user should
  run it, then test the flow on a real team member with recorded history
  (reassign target receives the active tasks; historical
  sessions/Aura/QC rows keep the deleted person's name via the snapshot
  columns rather than disappearing or being reattributed) before relying
  on it for a real deletion.

## Conventions that matter (read before changing permissions/RLS)

- **RLS is the real security boundary, not the UI.** Hiding a menu item or
  gating a `hasPermission()` check client-side is not sufficient — every
  table needs its own RLS policy, and every privileged RPC needs
  `SECURITY DEFINER` with its own role check inside. The original scaffold
  schema (`src/app/src/db/policies.sql`) was `USING (true)` on almost
  everything ("simple permissive policies for development... TODO: refine
  later") — that TODO was only partially done. Before trusting that a
  table is locked down, check its actual policies in the migrations, don't
  assume.
- **Role lives in `auth.users.app_metadata.role`**, set server-side only
  (via the edge function's service-role client). Never trust a
  client-supplied role value anywhere — this bit us once already (see
  `20240023`/`1a606b3`: the public signup endpoint used to trust the
  client's `role` field verbatim, a full privilege-escalation hole).
- **Permission matrix** lives in `src/app/components/AuthContext.tsx`
  (`rolePermissions`) and must be mirrored by hand into RLS helper
  functions in SQL (e.g. `is_manager_or_admin()`, `can_view_finance()`,
  `is_broad_project_viewer()`) — there's no shared source of truth between
  JS and SQL, so if you add/change a permission, update both sides.
- **System Role vs. Team Role (split August 25, 2026)**: two separate
  concepts that used to be conflated in one 8-value role field. **System
  Role** controls login/permissions and is now a 6-value enum: Super
  Admin, Admin, Manager, Accountant, Associate, Contractor (`UserRole` in
  `AuthContext.tsx`). **Team Role** is `team_members.role`, unconstrained
  free text describing a jobsite title/trade (General, Supervisor,
  Plumber, Carpenter, Electrician, Painter, Drywall Installer, Flooring
  Installer are offered as `<datalist>` presets in
  `TeamManagementNew.tsx`/`EditTeamMemberDialog.tsx`, but any text is
  accepted) — it has zero effect on permissions.
  - "Quality Control" and "Supervisor" are no longer System Roles.
    Quality Control folded into Manager/Admin/Super Admin (its permission
    set was already a strict subset of Manager's). Supervisor is now
    purely a Team Role plus the existing `projects.supervisor_id`
    project-scoped assignment (`20240026`) — being the Supervisor of a
    project grants real QC/edit authority on that project, same as
    before, it's just no longer tied to a login-role string.
  - **New rule, app-level only (no DB constraint yet)**: setting someone's
    Team Role to "Supervisor" now requires them to already have (or be
    given, if creating a login in the same step) a System Role of
    Manager, Admin, or Super Admin — enforced client-side in both
    `TeamManagementNew.tsx`'s Add dialog and `EditTeamMemberDialog.tsx`.
  - Every place that used to check `currentUser?.role === "Supervisor"`
    (a login-role string that can no longer exist) was changed to check
    "is this person's linked `team_members.id` equal to this specific
    project's `supervisor_id`" instead — `TaskDialog.tsx`,
    `TaskDependencies.tsx`, `TaskToolsMaterials.tsx` (three components
    that had this check with **no project scoping at all**, a real
    pre-existing bug independent of this migration — fixed in the same
    pass), plus `PhaseView.tsx`, `ProjectDetailsReal.tsx`,
    `ProjectPermitsTab.tsx` (three components that were already
    project-scoped but still gated on the now-dead role string too, which
    would have silently broken them). `TaskDialog.tsx`'s "Assigned
    Supervisor" picker was also fixed to filter by the candidate's
    *linked login's* System Role (Manager+) instead of their free-text
    Team Role, which is what it was actually trying to find.
  - Migration `20240054_role_model_cleanup.sql` drops `'Quality Control'`
    from `can_approve_task_qc()`/`is_broad_project_viewer()`/
    `can_upload_task_media()`/`can_approve_task_media()`, and simplifies
    `can_approve_task_qc_for()` to drop its now-impossible
    `jwt_role() = 'Supervisor'` check (a project supervisor is already a
    Manager, who already passes `can_approve_task_qc()` company-wide, so
    the project-scoped branch is defense-in-depth now, not the only
    path). It opens with a verification block that aborts if any real
    account still holds the removed roles — a repo-wide inventory found
    none at the time this was written, so it was expected to pass clean.
    **Not yet run by the user** — must be run in the Supabase SQL Editor
    before relying on any of the RLS-level changes above.
  - The edge function's dead, hand-duplicated `hasPermission()` matrix
    (`supabase/functions/make-server-bcab437c/index.ts`) had **zero
    entries for Admin, Accountant, Quality Control, or Supervisor** —
    meaning Admin and Accountant logins were already silently blocked on
    every one of the ~40 routes gated by it, a pre-existing bug unrelated
    to this migration. Rather than deleting the matrix and rewriting all
    40 call sites, the matrix itself was corrected to mirror
    `rolePermissions` from `AuthContext.tsx` for the 6 real roles and the
    12 permission keys actually checked — same call-site shape, correct
    data. **Not yet deployed** — needs a manual Supabase Edge Function
    redeploy of `make-server-bcab437c` before Admin/Accountant logins
    actually get unblocked in production.
  - Supervisor is scoped to `projects.supervisor_id` (see `20240026`) —
    real QC/edit authority, but only on the project(s) they supervise, not
    company-wide. Manager is company-wide by explicit product decision
    (regional/area-scoped Manager was discussed and deliberately
    deferred, not built).
  - **Data flagged for the user to review, not auto-fixed**: a
    `team_members` roster row (`role: "Admin"`, no linked login) and a
    separate login-only account ("Demie A," `demie@cstlelivn.ca`, System
    Role Super Admin) look like the same person recorded twice — use
    "Add as Team Member" on the "Needs Team Setup" banner to link them if
    confirmed, or say if they're actually two different people.
- **Multi-assignee tasks**: `task_assignees` is the real source of truth;
  `tasks.assignee_id` is a denormalized "primary assignee" kept in sync by
  a trigger so old single-assignee code paths keep working. Never write
  `assignee_id` directly in new code — use `assign_task_member`/
  `unassign_task_member`/`decline_task_assignment` RPCs.
- **Work sessions** (`task_work_sessions`) are the real timer data —
  per-person, per-task, with `start_work_session`/`pause_work_session`/
  `resume_work_session`/`finish_work_session` RPCs, all idempotent via a
  client-generated `client_event_id`. Offline support lives in
  `src/app/src/features/workSessions/offlineQueue.ts` (IndexedDB queue,
  synced on reconnect) — timer actions go through `queueSessionAction()`,
  not the API functions directly, so they work offline.
- **Aura (performance rating)** is a *separate system* from an older,
  disconnected pay-calculation engine (`src/app/src/features/aura/` +
  `aura_ledger`/`aura_summary` tables, keyed on `public.users` not
  `team_members` — a real identity-model mismatch, left alone
  deliberately). The real, current Aura system is
  `task_aura_scores`/`team_member_aura_profile()` (migration `20240025`),
  computed from real QC results + measured time vs. estimate + documented
  delays. It deliberately never touches pay fields (`base_pay`,
  `bonus_amount`, etc.) — Aura informs staffing/training decisions, not
  pay/promotion/discipline, per explicit product requirement.
- **Design tokens** live in `src/styles/globals.css`. The brand system
  (grey/green/olive/vermillion palette, Anybody display font at 137% width
  axis, Roboto Mono functional font) is documented there with comments
  explaining *why*, including two nasty bugs already found and fixed: a
  backwards `:has()/:not()` selector that silently un-styled any plain
  heading, and a Google Fonts request with an out-of-range `wdth` value
  that silently dropped the entire Anybody font family from every page,
  all session, until caught.
- **Task/project synchronization no longer uses table-change payloads or a
  per-hook polling timer.** `AppContext` owns the shared task and project
  state. One private, role-scoped Broadcast channel carries ID-only
  invalidations, followed by an RLS-authorized fetch of only the changed row.
  `src/app/src/lib/scopedBroadcast.ts` shares a singleton channel by topic and
  owns one visible-and-online-only 15-minute safety scheduler. Other feature
  hooks still use `subscribeTableMulti`; do not copy their older pattern back
  into tasks/projects.

## Private task/project invalidation refactor (awaiting migration/deploy)

- Migration `20240028_private_realtime_invalidation.sql` was run successfully
  in Supabase on August 1, 2026. The matching frontend was deployed from commit
  `cb9515c` the same day, and the production bundle was verified to contain the
  private scoped-channel markers. It adds a SELECT policy on
  `realtime.messages`, a locked-down `SECURITY DEFINER` sender, and triggers
  that emit small `{entity,id,project_id,operation,updated_at}` Broadcast
  payloads. Company-wide roles use `organization:cstle`; Associates,
  Contractors, and project-scoped Supervisors use `associate:<auth-user-id>`.
  Postgres table RLS remains the final authorization check on each targeted
  row fetch.
- The frontend implementation is local and verified: explicit task/project
  select lists, bounded initial list queries, targeted fetch-and-merge/delete,
  optimistic task/project mutations with rollback, a shared private channel,
  and a single visible/online-only 15-minute safety sync. Development builds
  expose `window.__CSTLE_SYNC_METRICS__()` with PostgREST list/targeted counts,
  requests per minute, and active channel count; production logging is off.
- Automated cache tests cover update merge, insert de-duplication, delete, and
  optimistic rollback. On August 1, 2026, `npm run typecheck`, `npm test` (4/4),
  `npm run build`, `git diff --check`, and the canonical/mirror Edge Function
  comparison passed. Type checking is intentionally scoped by
  `tsconfig.sync.json` because the inherited application had no working global
  TypeScript project and has unrelated legacy errors.
- Request-rate estimate per continuously visible tab: the original four
  30-second full-table polls produced up to 480 list requests/hour; commit
  `faedfd6` reduced that to 48/hour at five-minute intervals. Once migration
  `20240028` and this frontend ship, routine task/project safety traffic is 8
  list requests/hour total (one task and one project query every 15 minutes),
  plus small targeted row reads only when records actually change. The client
  name lookup is populated on initial project load and reused during safety
  syncs. Validate the real result in the Supabase egress graph after deployment.
- R2 media activation remains separately paused. Do not add R2 secrets, deploy
  its Edge Function changes, or perform media tests as part of this egress
  rollout.
- No automated Supabase 3.5 GB egress warning is configured yet. The existing
  USD $0.01 alert documented below is Cloudflare/R2-only and must not be
  mistaken for Supabase monitoring. The current Supabase billing cycle is
  already above 3.5 GB; establish any new threshold monitor after the usage
  cycle resets so it can provide an early warning rather than firing at setup.

## Known gaps — deliberately deferred, not forgotten

- **`team_members` performance columns** (`aura_rating`,
  `tasks_completed`, `efficiency`) are readable by everyone, including
  Associates viewing a teammate's row — row-level RLS can't hide just
  those columns without breaking the assignee-name/avatar display used
  everywhere. Needs a column-scoped view + refactoring ~20 read call
  sites. Flagged, not attempted half-safely.
- **Regional/area-scoped Manager** ("Regina Manager" vs "PC Manager") was
  discussed and explicitly deferred — Manager is company-wide today, the
  region distinction is title-only.
- **Google Drive upload for site photos/voice notes** — not built.
  Existing Drive integration (`sync-gallery.yml` GitHub Action) is
  read-only (pulls website gallery photos), and its service account only
  has `drive.readonly` scope. Would need a new write-scoped credential.
- **Legacy pay-calculation system** (`aura_ledger`, `aura_summary`,
  `PayrollSummary.tsx`, `WorkerAuraProfile.tsx`'s Overview/Tasks/History
  tabs) is real, wired-up, reachable code — just built on a different
  identity model (`public.users` not `team_members`) than everything else
  in this app. Not reconciled; left alone since it's a payroll feature and
  wasn't in scope for anything asked so far.
- **`PhaseQCReviewDialog.tsx`** has its own separate rating flow
  (`calculateRating()` + `localStorage['cstle_phase_qc_reviews']`) on a
  legacy numeric-id model, disconnected from the real Supabase-backed QC
  flow in `QCReviewQueue.tsx`. Not reconciled.
- **Settings page cleanup** — user flagged it has dead-end
  features/diagnostics that should be pruned. Not yet done.
- **Role-by-role live testing** — direct-access attempts, stale/expired
  sessions, cross-role data leakage — planned but not yet executed.
- **PWA / installable offline app shell** — explicitly a "later" item, not
  started (offline support so far is scoped only to the work-session
  timer, not the whole app).

## Aura v3 + onsite task workspace (live; role QA still pending)

- **Mobile/PWA readiness deployment batch — August 4, 2026.**
  The app now has a real web manifest plus 180/192/512px home-screen icons
  generated from the existing Cstle castle mark, iOS standalone/status-bar
  metadata, phone-width overflow guards, and `100dvh`/safe viewport behavior.
  Opening a mobile task now pushes a real browser-history entry, so native
  iOS/Android edge-back gestures can return to the prior screen. Task assignment
  now exposes RPC failures instead of swallowing them and falsely reporting a
  successful save. Migration `20240032_supervisor_task_assignment.sql` aligns
  the assignment RPC with the existing project-scoped Supervisor task policy;
  Managers/Admins remain company-wide and Supervisors are limited to projects
  they supervise. Migration `20240032_supervisor_task_assignment.sql` was run
  successfully in Supabase on August 4 and included in the live read-back below.
  The same pending frontend batch now also makes the Projects screen explicitly
  sort by creation date newest-first (rather than inheriting API updated-date
  order), exposes Date Created ascending/descending in the existing sort
  control, and paginates list/grid/Gantt views at 10 projects per page. This is
  client-side over the already-loaded project cache and adds no PostgREST calls
  or egress.

- **Closed-project task-integrity deployment — August 4, 2026.** The global
  Tasks-tab Add Task flow no longer falls back to
  `projects[0]` (the cause of tasks landing on an arbitrary project); it now
  requires an explicit open-project selection. Project-detail task creation
  keeps its explicit current-project context and hides Add Task after closure.
  `AppContext.addTask` independently rejects missing/closed projects. Migration
  `20240033_closed_project_task_integrity.sql` makes `Completed` the database-
  enforced closed/read-only state: normal closure requires at least one phase,
  every phase completed, and every task completed; task INSERT/UPDATE is blocked
  after closure; accidental status-based reopening is blocked. Super Admin
  force-complete with a recorded reason remains the exceptional audited route.
  Closed-project tasks are retained for project history, Aura, QC, and audit,
  but are excluded from the global Tasks screen totals/list, dashboard open and
  upcoming task counts, mobile onsite queue, recent tasks, and fallback overdue
  insights. Migration `20240032` also refuses assignment changes on a closed
  project. Migrations `20240032` and `20240033` were both run successfully in
  Supabase on August 4. A clean SQL read-back confirmed all four expected
  functions and all three expected triggers. TypeScript, all 9 tests, the
  production build, and diff checks pass; the matching frontend is in the
  deployment commit described below.
  Closure is deliberately **not automatic**: the system determines when a
  project is “Ready to close,” but a Manager/Admin must explicitly select Mark
  Complete after final inspection/handover/business checks. This prevents the
  last task or phase transition from silently archiving work before office
  close-out. Unauthorized roles see readiness but cannot close; Super Admin
  force-close remains reason-gated and audited.
  Frontend commit `e58e060` was pushed to `main`; GitHub/Vercel reported the
  Production deployment successful. The stable production alias
  `https://cstle-livn-web-app.vercel.app` was verified serving
  `index-BBOOiyvd.js`, and that live bundle contains the explicit project
  chooser, closed-project rejection, Ready for Manager/Admin close-out, Date
  Created sorting, and pagination markers. The live manifest and Apple touch
  icon both return HTTP 200 (`image/png` for the icon).

- **Task completer attribution deployed August 4, 2026.** The
  matching frontend and migration `20240031_task_completion_attribution.sql`
  automatically show and record the employee name(s) from finished task
  sessions. When no employee session exists, the QC reviewer selects a roster
  member or enters an external person's name before approving/rejecting. This
  adds no input to the normal employee path. Session-load failures fail closed
  instead of being mistaken for missing attribution. TypeScript, 7/7 tests,
  production build and diff checks pass. Migration
  `20240031_task_completion_attribution.sql` was run successfully in Supabase;
  a live read-back confirmed both the table and updated QC function. Frontend
  commit `fe1a7d9` was pushed to `main`, and Vercel production was verified
  serving `index-fd0rrBXA.js` with the automatic/manual attribution markers.

- **QC timer-prerequisite fix deployed August 4, 2026.** Live
  Postgres logs confirmed `NO_FINISHED_WORK_SESSION` when a reviewer tried to
  QC a task placed directly into Pending QC. Migration
  `20240030_qc_timer_optional.sql` removes that prerequisite: authorized QC
  reviewers continue to see available timing evidence and use the existing
  fast/on-time/slow plus corrections assessment, but may approve or reject
  when no timer exists. Finished sessions still receive their QC result and
  feed Aura; a no-session task keeps the reviewer-entered task rating without
  fabricating session timing or contributor Aura. No extra admin form or
  attestation workload is added. Migration `20240030_qc_timer_optional.sql`
  was run successfully in Supabase. The matching frontend change surfaces the
  real QC error instead of a generic retry message. Commit `b85391a` was
  pushed to `main`, and Vercel production was verified serving the matching
  `index-BkQnsysI.js` bundle.

- Migration `20240029_aura_completion_and_task_reporting.sql` was run
  successfully in Supabase on August 1, 2026. It adds reviewable
  `pending/approved/rejected` delays, structured task progress/query/
  suggestion/issue/change-request records, required checklist items, required
  photo counts, evidence-aware reliability scoring, profile-RPC authorization,
  and transactional `finalize_task_qc()`.
- Aura v3 fixes the v2 audit findings: only QC-approved delays protect timing;
  missing timer/estimate data is neutral rather than perfect; reliability uses
  real task updates, required checklist completion, ready R2 photo metadata and
  clock integrity; QC/task/Aura writes succeed or roll back together; profile
  aggregates run with caller RLS; improvement guidance is limited and based on
  the weakest metric. Quality remains the largest weight at 50%.
- The old pay/Aura-points presentation was removed from `WorkerAuraProfile`.
  The profile now exposes only the transparent performance system. Payroll is
  still separate elsewhere and Aura explicitly cannot decide pay, promotion,
  discipline or termination.
- A dedicated mobile `MobileTaskWorkspace` now follows the supplied three-
  screen onsite reference: bold green/olive/vermillion contrast, task details,
  prominent start/pause/resume/complete controls, live timer, required
  checklist, evidence launcher, site updates, queries, suggestions, issue and
  change requests, recent activity, and task Aura feedback. Dashboard task
  cards route directly to it, and the mobile shell has a four-item bottom nav.
  Every new Anybody use explicitly sets `font-variation-settings: 'wdth' 137`
  and `font-stretch: 137%`; a CSS utility safeguard covers arbitrary Anybody
  utility usage.
- Managers/QC can author required checklist steps in the task dialog, read and
  acknowledge/resolve/decline onsite reports, and approve or reject documented
  delays during QC review. Associates cannot submit completion until required
  checklist items and the configured required photo count are satisfied.
- Verification on August 1, 2026: focused TypeScript passed, 7/7 tests
  passed, production Vite build passed, and `git diff --check` passed. Browser
  rendering reached the local sign-in page, but authenticated role-by-role
  visual QA remains pending because no test credentials were supplied.
- **Production deployment completed August 1, 2026.** Commit `2c9cba3`
  (`feat: launch task-led Aura and R2 evidence`) was pushed to `main`; Vercel
  serves a fresh production bundle containing the Aura, task reporting and
  `media/upload-url` code. Supabase migration `20240029` is live, and the
  canonical `make-server-bcab437c` Edge Function was manually deployed and
  verified in the dashboard. Its public diagnostic route returned HTTP 200 and
  the protected media route returned the expected HTTP 401 for an anonymous
  token (proving the new route is present without performing a media upload).

## R2 task media / proof of work (live; authenticated role QA pending)

- **Historical egress warning; deployment pause was explicitly lifted by the
  user on August 1, 2026.** The live organization Usage page reported
  12.271 / 5 GB
  uncached egress (245%) for the July 16-August 16 cycle, an overage of 7.27 GB.
  Supabase also reports that the previous cycle exceeded egress and warns that
  project restrictions may begin August 30, 2026 if the organization remains
  over quota. The database/API egress fix was audited and deployed before R2
  activation; continue monitoring usage and preserve the 3.5 GB internal
  warning policy.
  At the same check: cached egress 0 / 5 GB, database size 38.36 / 500 MB,
  Storage 0 / 1 GB, Edge Function invocations 381 / 500,000, Realtime messages
  2,203 / 2,000,000, Realtime peak connections 7 / 200, and MAU 4 / 50,000.
- **The follow-up egress audit and code fix are complete locally.** The four
  remaining five-minute full-table polls were removed from `useTasks`,
  `useTaskAssignees`, `useWorkSessions`, and the declined-assignment hook.
  Normal updates now use Supabase Realtime WebSockets exclusively; a bounded
  correctness fetch occurs only after a realtime reconnection, browser network
  reconnection, or when a previously hidden tab becomes visible. Multi-event
  subscriptions were consolidated from three channels (insert/update/delete)
  to one channel per table, and simultaneous initial assignee/session fetches
  are coalesced. The only remaining `setInterval` calls are a local elapsed-time
  UI clock and the offline work-session queue retry; the latter performs no
  Supabase request when its IndexedDB queue is empty. Production build,
  TypeScript, canonical Edge Function mirror comparison, and `git diff --check`
  all pass. **The isolated frontend egress fix was deployed to production on
  August 1, 2026 in commit `faedfd6`.** Vercel served a fresh production bundle
  containing the new WebSocket recovery subscription. R2 media and Aura were
  deployed separately afterward in commit `2c9cba3` and the manual Edge
  Function deployment described below.
  Browser tabs opened before this deployment must reload once to receive the
  fix; after reload they no longer run the five-minute full-table polls.

- **Product boundary**: the public website gallery remains Google Drive-backed
  so non-technical admins and the social-media team can manage marketing
  images there. Cloudflare R2 is for operational web-app files: onsite task
  update photos/video/audio, before/progress/after evidence, project work
  files, client-update attachments, and later approved exports for social or
  website use. Queries, progress, permissions, audit records, and metadata
  remain in Supabase/Postgres; only file bytes belong in R2.
- **Migration `20240027_task_media_evidence.sql` has been run successfully.**
  It creates `public.task_media`, relationship-validation and media-permission
  helpers, internal-by-default client/social flags, RLS, indexes, and Realtime.
- **R2 application code and the first onsite task-media UI are deployed live.**
  The canonical
  Edge Function and mirror now expose authenticated prepare/complete/list/
  approve/delete media routes using short-lived R2 signed URLs. The task edit
  dialog renders `TaskMediaEvidence.tsx`; the client API is
  `src/app/src/features/media/api.ts`. Production Vite build and TypeScript
  checks passed after implementation.
- **Cloudflare R2 is activated and the private Standard bucket
  `cstle-task-media` was created in WNAM on July 31, 2026.** Public development
  access and custom-domain access remain disabled. Its CORS policy is live for
  `http://localhost:5173` and `https://admin.cstlelivn.ca`, allowing only
  browser `GET`, `PUT`, and `HEAD` requests with `Content-Type` and exposing
  `ETag`.
- **R2 secrets and Edge Function are active in production.** `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` were added
  to Supabase Edge Function secrets on August 1, 2026. The replacement account
  token `Cstle task media production v2` has Object Read & Write access limited
  to `cstle-task-media`; one signed, read-only bucket-list request returned HTTP
  200, with no upload performed. Credential values were never written to the
  repository or documentation. The older same-scope token was permanently
  deleted from Cloudflare after the `v2` credential passed verification, so
  `v2` is the only active R2 account token. Temporary Supabase deployment
  tokens and an unrelated expired, never-used token were also removed after
  deployment. Authenticated associate/manager/QC upload, approval, download
  and deletion QA is still pending because no app test credentials were
  supplied.
- **Free-tier hard stop is implemented in the Edge Function:** before issuing
  an upload URL it lists/sums current R2 objects and refuses an upload that
  would take stored bytes above 8 GiB, leaving 2 GiB headroom below the 10 GB
  free storage allowance. The error code is `R2_FREE_TIER_GUARD`. This guards
  storage, while Cloudflare dashboard monitoring is still required for the
  separate Class A/Class B monthly operation allowances.
- **Cloudflare billing protection is live:** a budget alert named
  `R2 near-free-limit warning` emails `cstlelivn@gmail.com` as soon as monthly
  billable usage reaches USD $0.01. This is an alert, not a Cloudflare-side hard
  spending cap; the application-side 8 GiB upload refusal remains the storage
  hard stop.
- **Upload optimization is implemented:** ordinary photos are resized client-
  side to a maximum 1920-pixel edge and encoded as WebP. The encoder now tries
  quality levels 0.76, 0.66, 0.56, then 0.46 only as needed to target 850 KiB,
  and keeps the smallest result only when it beats the original. It never
  upscales a smaller source. Both client and Edge Function enforce caps of
  12 MB/photo, 50 MB/video, 20 MB/audio, and 25 MB/PDF. Video is deliberately
  not browser-transcoded (jobsite phone CPU/battery/reliability); later in-app
  capture should record 720p directly if tighter video storage is needed.
- In Project Details -> Files & Activity, clicking a task-owned file or any
  activity/report row opens that associated task's complete detail dialog even
  when the task is Completed. A separate `Open file`/attachment link still
  opens the R2 asset itself without opening the task. Project-level files with
  no task association remain file-only.
- Photo compression and project-record linking shipped in commit `9bbfeee` on
  August 4, 2026. Vercel production served the matching fresh bundle
  `index-CFm04Ph0.js`; existing R2 objects are unchanged and only new uploads
  receive the tighter encoding.
- Task evidence cards and the project Files & Activity archive now expose an
  explicit `Download social JPEG` action for photos. It fetches the signed R2
  WebP only on click, converts it in-browser to JPEG at quality 0.90, downloads
  it with a `-social.jpg` suffix, and stores no duplicate in R2. Non-photo
  media downloads in its original format through the same action.
- The social-download workflow shipped in commit `9cdf2b1`; Vercel production
  served the matching fresh bundle `index-C4qGQXXy.js` on August 4, 2026.

## Mobile task submission, QC evidence, and project record — August 4, 2026

- Root cause of the missing QC item: `finish_work_session` closed the timer but
  did not transition its task. Migration
  `20240034_submit_finished_sessions_to_qc.sql` adds a database trigger that
  moves every newly finished employee session to `Pending QC`; this covers
  online actions and offline queue replays. The existing task status trigger
  stamps `submitted_at` automatically. It also performs a guarded one-time
  reconciliation for pre-deployment finished sessions that are still marked
  In Progress, have no newer QC submission, and have no open timer.
- Mobile start/pause/resume/finish now applies the RPC result immediately and
  refreshes session truth, so the displayed timer no longer waits for a
  Realtime delivery. Completion also refreshes tasks so the submitted task
  leaves the active workspace and appears in the QC queue promptly. Declined
  tasks are removed from the associate dashboard immediately after success.
- Installed-PWA layouts now respect iOS safe-area insets at the app header,
  task workspace header/footer, and bottom navigation. The active-project card
  is constrained to the same 16px mobile content margins. The iOS status bar
  style is `black` rather than translucent.
- The QC dialog now includes the task's reports/questions and full R2 evidence
  alongside session timing before the approve/request-changes decision.
- Project Details has a `Files & Activity` tab aggregating every task and
  project R2 file plus all dated reports, questions, issues, suggestions, and
  change requests with task and reporter attribution. Mobile update composers
  can attach files; uploads store `task_update_id` and the project record shows
  those attachments on the exact report/question.
- Project aggregation reuses the already-live authenticated project/task media
  list routes in batches of four, and runs only when a user opens the project
  record tab. There is no periodic polling. This fallback was chosen because
  the Supabase dashboard reported `Deploy status unavailable` and the local CLI
  has no deployment token; no Edge Function production change is required.
- Migration 20240034 was applied in the Supabase SQL editor and returned
  `Success. No rows returned`. TypeScript, production build, all 9 tests, and
  `git diff --check` pass after the final fallback adjustment. No Edge Function
  production change is required. Frontend commit `e4b9d75` was pushed to
  `main`; Vercel production subsequently served the matching fresh bundle
  `index-xef1CVB6.js` at `https://cstle-livn-web-app.vercel.app`.

## Before you start

1. Check `git log --oneline -30` for what actually shipped most recently —
   this file will go stale, the commit log won't.
2. Check whether all migrations in `supabase/migrations/` have been run
   (ask the user — there's no way to introspect this from a Claude Code
   session without DB access).
3. Check whether the edge function's latest canonical version has actually
   been deployed (again, ask — git history isn't proof of deployment for
   this specific piece).
# Reuse Existing Workflows First

- Before adding a workflow, screen, status, permission, approval process, scoring system, or table, audit the application for an equivalent feature and integrate with it instead of creating a duplicate.
- The existing Quality Control workflow is authoritative and must remain unchanged. Task completion submits into the existing QC flow, displays its current status, and consumes its returned outcome.
- Do not add QC questions, QC forms, approval steps, scoring logic, or task-module QC tables. Supervisors continue to use the existing QC review interface and options.
- Keep the existing task statuses. In particular, `Pending QC` is the application's existing submitted-for-QC state; do not add a second `Finished Awaiting QC` status. Existing correction/rejection handling remains authoritative.
- The existing QC-to-Aura integration is authoritative. Task screens may display the resulting Aura feedback, but must not calculate or write Aura scores themselves.

## Project task management core — August 5, 2026

- Migration `20240035_task_management_core.sql` was applied successfully in
  the Supabase SQL Editor on August 5, 2026. A live read-back confirmed
  `task_dependencies`, `task_tools`, `task_materials`,
  `task_time_corrections`, the task verification-criteria column, and the
  first-start-photo trigger. Historical closed projects are deliberately
  excluded from the normalized phase backfill because migration `20240033`
  makes their task records immutable; they remain readable and unchanged.
- New and edited tasks must select a normalized phase belonging to their
  project. The task form records the assigned Supervisor, estimated hours,
  verification criteria, and an explicit Supervisor/Admin photo waiver.
  Estimated hours and complexity now persist through the task API rather than
  being silently discarded.
- The existing task statuses and QC/Aura implementation remain authoritative.
  Finishing a session still enters the existing `Pending QC` queue; the task
  module does not contain a second QC form, status set, or scoring engine.
- A task's first timer session requires a ready R2 `before` photo unless an
  authorized Supervisor/Admin has waived photos. Resume does not require a
  second start photo. The Associate Finish Task UI requires a completion photo
  (unless waived), completion note, required checklist items, and confirmation
  that tools and unused materials are cleared or secured.
- Tools and Materials are collapsed by default. Admins/Supervisors can add
  complete draft records, copy approved lists from a prior task into independent
  drafts, and approve them; Associates see only approved records. Dependencies
  are same-project warnings and deliberately do not create a new Blocked status.
- Ordinary photos target a 1920px longest edge and approximately 150–350KB
  WebP output. `Save for Marketing` uses up to 2400px and higher quality.
- Project task cards now show phase, Supervisor, estimated hours, and measured
  actual hours. The mobile task page also shows Associate, Supervisor, phase,
  due date, verification criteria, dependencies, tools/materials, evidence,
  timer actions, the existing QC outcome, and existing Aura feedback.
- Frontend commit `9386271` was pushed to `main` on August 5, 2026. Vercel's
  stable production alias was verified serving `index-DbKIwoxx.js`; a direct
  bundle read confirmed the required phase selection, start-photo enforcement,
  Finish Task clearance confirmation, and Copy from Existing Task workflow.
  TypeScript, all 9 automated tests, the production build, and
  `git diff --check` passed before deployment. No Edge Function change was
  required for this release.

## Scarth Street commercial renovation plan — August 5, 2026

- Migration `20240036_task_crew_required.sql` is live. `tasks.crew_required`
  stores planned crew size independently from real `task_assignees`; the task
  form, mobile workspace, and project task cards expose it.
- Migration `20240037_scarth_street_project_plan.sql` is live and idempotent.
  It updates project `8e05880a-93ce-4601-b642-ee3aeaac5fef` from the old
  `KB - 1846 Scarth` placeholder to `Scarth Street Commercial Renovation (KB
  1846 Scarth)`, with the supplied scope description and In Progress state.
- The project previously contained 11 unused template phases, zero tasks, and
  zero linked procurement, phase-QC, or inspection records. Those empty phase
  placeholders were safely replaced with the requested 9-phase plan.
- Live verification returned 9 phases, 44 tasks, 5 Completed tasks, 39 To Do
  tasks, 132 total estimated hours, zero tasks missing planned crew size, and
  76 approved material records. Phase 1 and Phase 2 are In Progress; later
  phases are Not Started. Existing project Supervisor data is reused, while
  Associate assignment remains intentionally unfilled until the actual crew is
  chosen.
- Frontend/data commit `6eefcb7` was pushed to `main`. Vercel production was
  verified serving `index-sdg20iuB.js`, and a direct bundle check confirmed the
  new Crew Required field. TypeScript, all 9 tests, the production build, and
  `git diff --check` passed. No Edge Function change was required.

## Supervisor planning before assignment — August 5, 2026

- Migration `20240038_supervisor_unassigned_task_planning.sql` is live. A
  Supervisor may create tasks only inside a project they supervise; Managers
  and Admins retain company-wide creation authority, and Associates still
  cannot create tasks.
- New tasks no longer silently assign the project Supervisor as the worker.
  They may remain unassigned while scope, phase, estimated hours, crew size,
  verification criteria, and materials are planned. `task_assignees` remains
  the explicit source of truth for who can perform/timer-track the work.
- The Add Task action is now hidden from Associates and visible to a Supervisor
  only on their own supervised project. Supervisors can revise estimated hours
  before or after assignment; the existing estimate-change audit trigger
  records changes.
- Commit `6a5dbfb` was pushed to `main`; production was verified serving
  `index-ie0-VleY.js`, with the Add Task and pre-assignment estimate guidance
  present. TypeScript, all 9 tests, the production build, and diff checks pass.

## Supervisor task queue, phase-ordered task lists, Phases-tab assignment — August 6, 2026

- No new migration. This built entirely on the existing per-task
  `supervisor_id` column (from the August 5 work above) and the existing
  `assign_task_member`/`unassign_task_member` RPCs, which already enforce
  Supervisor-scoped-to-their-project vs. company-wide Manager/Admin access
  server-side.
- Design decision, confirmed explicitly with the user: being the Supervisor of
  a project does **not** mean tasks on that project auto-assign to the
  Supervisor (that was deliberately rejected — see the August 5 section
  above, and it applies identically whether or not the Supervisor also holds
  a Super Admin/Manager login role, which is an independent field). Instead a
  Supervisor sees every unassigned task on their supervised project(s) as a
  queue and picks, per task, "Start it myself" (self-assigns + starts a timer
  session) or "Assign" (delegates to someone else) — Aura attribution stays
  tied to whoever actually files an assignment/timer record, never to a
  passive "responsible party" default.
- `src/app/components/MobileTaskDashboard.tsx`: added a "To assign" section
  (rendered only when the signed-in team member supervises at least one
  project) listing every non-Completed task on a supervised project that
  currently has **no active assignee at all** (checked against `task_assignees`
  company-wide, not just against the signed-in user — a task assigned to
  someone else must also disappear from this queue). Each row is a new
  `SupervisorQueueRow` component with "Assign" (reveals a team-member
  `<select>`, calls `assignTaskMember`) and "Start it myself" (calls
  `assignTaskMember` with the Supervisor's own id, then queues a timer-start
  session action) — both call the existing `assignTaskMember` RPC, no new
  write path. `myActiveProjects` (the mobile dashboard's hero "Active
  Project" card) was also broadened to include projects the user supervises
  even if they have zero personally-assigned tasks there.
- Also on that screen: reduced several oversized font sizes inherited from
  the default `--text-h1`/`--text-h2` tokens ("Welcome Back" heading, active
  project card title, "Your tasks"/"Your Aura" section headings, expanded
  task-queue row title) — they were rendering at 44px/22px/26px and are now
  18–24px with tighter line-height, since the mobile associate/Supervisor
  screen was designed to be read on-site on a phone, not as a desktop
  headline.
- New shared utility `src/app/src/lib/taskOrder.ts` (`sortTasksByPhase`,
  `buildPhasePositionMap`): orders a task list by its normalized phase's
  `project_phases.position` (i.e. current/earliest-incomplete phase first,
  matching the existing phase-summary-card auto-advance logic), then by due
  date within a phase; legacy tasks with no `phase_id` sort last rather than
  interleaving randomly. New `listPhasesForProjects(projectIds)` was added to
  `src/app/src/features/projectPhases/api.ts` as a one-shot, non-realtime bulk
  phase fetch (phases change rarely) so a multi-project mobile view doesn't
  need one query per project. This same utility now orders both the mobile
  "Your tasks"/"To assign" queues and the desktop per-project Tasks tab
  (`src/app/components/ProjectDetailsReal.tsx`, `sortedFilteredTasks`
  replacing the old due-date-only `filteredTasks` sort) — previously the
  desktop Tasks tab and the phase-summary card could show a different "what's
  current" story; they now agree.
- `src/app/components/PhaseView.tsx`: the Phases tab's per-task rows (inside
  each expanded phase, previously status-only) gained a `PhaseTaskAssigneePicker`
  — a click-to-edit `<select>` next to the existing status control, gated by
  `canAssignTasks` (Manager/Admin, or the Supervisor of this specific project,
  computed from `projects.supervisorId` vs. the signed-in team member — not
  just the broader `canEditPhases` permission, which Supervisors don't hold).
  It calls `unassignTaskMember` on the previous assignee (if any) then
  `assignTaskMember` on the new one; non-privileged viewers still see the old
  read-only assignee name. This lets a Supervisor reassign work without
  leaving the Phases tab, addressing the specific complaint that finding a
  task under the Tasks tab to reassign it was slower than drilling into the
  phase they were already looking at.
- Bug caught and fixed during browser verification: the "To assign" queue
  filter originally excluded only tasks assigned to the *current* user
  (`myTaskIds`), so a task assigned to someone else via the new Assign flow
  stayed visibly stuck in the queue. Fixed by filtering against
  `assignedTaskIds` (every task with any active `task_assignees` row,
  regardless of who) instead.
- Verified live against the local dev server (Scarth Street Commercial
  Renovation, signed in as Demilade, the project's real Supervisor): mobile
  font sizes read correctly at phone width; the "To assign" queue listed the
  project's 43 then 38 (after test assignments) unassigned tasks with
  "Site Setup and Protection" (Project Mobilization, the current phase)
  correctly first; assigning it via the queue's "Assign" control removed it
  from the queue immediately; the desktop Tasks tab listed all 44 tasks
  grouped in phase order (Project Mobilization → Millwork Preparation →
  Demolition → Steel Stud Framing → ... → Project Closeout) matching the
  sidebar's "Current Phase: Project Mobilization"; and the Phases tab's new
  picker successfully assigned and un-assigned a task without leaving the
  Phases view. `npm run build` (TypeScript + Vite) passed with no errors.
  Not yet re-verified on the deployed Vercel production build — pending
  commit and push.

## Test-data cleanup, test-account creation, mobile bottom nav removal — August 6, 2026

- **No new migration.** All data changes below were done as one-time direct
  writes against the live Supabase database (through the browser, signed in
  as Demilade/Super Admin), not schema changes — this section is a record of
  *data* state, not code, except where noted.
- **Sample-project cleanup.** The two non-production seed/test projects —
  `sample` (`02b353bb-aa4f-4f41-a266-586474fb7452`) and
  `__SAVE_TEMPLATE_TEST__` (`14e14632-4e1e-4607-8835-b4f5c7165c66`) — had
  Demilade set as both `supervisor_id` and the primary/only assignee on
  nearly every task (91 active `task_assignees` rows), which was polluting
  the mobile dashboard's "Your tasks" and Supervisor Queue with fake work.
  Both projects' `supervisor_id` were cleared to `null` and all 91 active
  Demilade `task_assignees` rows were removed via `unassign_task_member`
  (not raw deletes, so the sync trigger correctly nulled `tasks.assignee_id`
  too). Real, completed production projects (the `FCC -`/`KB -` prefixed
  ones) were deliberately left untouched — only the 2 confirmed sample
  projects were touched.
- **Removed 3 test team members**: Oluwakemi Isinkaiye ("Kemi"), "DY", and
  "MJ". Verified first that none of the three had any `task_work_sessions`,
  `task_aura_scores`, `task_updates`, or `task_completion_attributions` rows
  (zero real Aura/QC history), and that every `task_assignees` row
  referencing them was confined to the two sample projects above (plus one
  row on Scarth Street that was this session's own verification-testing
  artifact, not real data). Deleted those `task_assignees` rows (required
  first — `team_members.id` is referenced `ON DELETE RESTRICT` from
  `task_assignees`), then deleted the three `team_members` rows outright.
  DY and Kemi had no Supabase Auth account (`auth_user_id` was null — they
  were team-member-only records, never logins). **MJ did have a real
  Supabase Auth login** (`a0adf7ae-b86d-4944-b6e9-257e1b96620e`); removing
  their `team_members` row stops them from being assignable or appearing in
  any UI, but their Auth account and `kv_store` "user" record still
  technically exist — see the new endpoint below, which is required to
  finish removing them and has **not been deployed yet**.
- **Added a missing `DELETE /make-server-bcab437c/users/:id` edge function
  route** (both `supabase/functions/make-server-bcab437c/index.ts` and its
  required mirror `src/app/supabase/functions/server/index.ts`). The
  Settings → Users "Delete User" button already existed in the frontend
  (`UserManagement.tsx` → `AuthContext.deleteUser` → `userAPI.delete` → 
  `DELETE /users/:id`) but silently 404'd because the backend route was
  never implemented — this was a pre-existing gap, not something introduced
  this session. The new route is Super-Admin/Manager-only, blocks
  self-deletion, calls `supabase.auth.admin.deleteUser()` then deletes the
  `kv_store` `user:<id>` record. **This still needs a manual Supabase
  Dashboard/CLI deploy of `make-server-bcab437c` before the Delete User
  button (or MJ's leftover Auth account specifically) actually works** —
  per the "Edge function deploys are NOT automatic" rule above, pushing the
  frontend to `main` does not deploy this.
- **Created a one-time test account for a real associate ("Victor")**,
  at the user's explicit request, to preview the Associate mobile experience
  before handing over real credentials. Used the app's existing admin-set-
  password signup path (`authAPI.signUp`, the same server-side flow that
  created every other test account this project already has — Kemi, DY, MJ,
  Test Admin) rather than building any new account-creation mechanism; this
  was a deliberate choice to avoid introducing a bespoke "backdoor" login
  path, per the user's explicit instruction. Auth account
  `35da2176-ec38-4f44-8dab-046d8ee9ae35` (`victor@cstlelivn.ca`, a
  placeholder — the user should replace it with Victor's real email in
  Settings before handing off login access, since email-based password
  reset is how they intend to hand the account to him) with role Associate,
  password as given by the user. Matching `team_members` row
  `a8921d26-70fb-4a95-8b21-bbe88cbb8b42` was created and 2 unassigned Scarth
  Street tasks ("Dry Fit Reception Cabinets", "Site Setup and Protection")
  were assigned to it via `assign_task_member` so there's something for
  Victor's mobile view to show. This is meant to be temporary/one-time, not
  a template for future onboarding — going forward, new team members should
  go through the normal self-signup flow (`Login.tsx`'s sign-up form, which
  only allows the caller to self-assign Associate/Contractor roles) rather
  than an admin creating accounts with a chosen password.
- **Removed the mobile bottom tab bar** (`src/app/App.tsx`, the `<nav
  className="md:hidden ...">` block with Home/Projects/Updates/Profile
  buttons that previously rendered under the page content on small screens)
  at the user's request — the sidebar's mobile slide-in menu (hamburger icon
  in the top bar) remains the only mobile navigation. Removed the now-dead
  `Home`/`Bell` icon imports along with it.
- Verified via the local dev server, signed in as Demilade: mobile dashboard
  "Your tasks" now correctly shows 0 (previously showed the sample
  projects' fake assigned-task backlog), the Supervisor Queue no longer
  includes the sample projects, and no bottom tab bar renders at mobile
  viewport width. `npm run build` passed with no errors. Not yet committed,
  pushed, or verified on the deployed Vercel production build, and the new
  `DELETE /users/:id` edge function route is not yet deployed to Supabase.

## Task-edit crash fix, hard task-ordering rule, work.cstlelivn.ca portal — August 6, 2026

- **Task-edit crash root cause found and fixed.** `TaskDependencies.tsx`
  (rendered inside every task edit -- desktop `TaskDialog` and the mobile
  task screen) did `useEffect(load, [taskId])`, passing an `async` function
  directly as the effect callback instead of calling it inside one. React
  was turning that misuse into a thrown error, which tripped the app's
  top-level `ErrorBoundary` into the generic "Something went wrong" any
  time a task was opened for editing. Fixed to `useEffect(() => { load(); },
  [taskId])`. Confirmed live: opening Edit Task no longer crashes and no
  new console errors appear.
- **Migration `20240039_task_manual_sequence.sql` is live.** Adds
  `tasks.sequence` (nullable integer) plus a `(phase_id, sequence)` index.
  **Caution for future work**: `src/app/src/features/tasks/api.ts`'s
  `TASK_LIST_COLUMNS` now includes `sequence` in every `listTasks`/`getTask`
  select -- if a future column is added to that list before its migration
  actually runs, task loading breaks app-wide immediately (confirmed: this
  happened for a few minutes on the local dev preview until the migration
  was run, "Failed to list tasks: column tasks.sequence does not exist").
  Always run a migration before pushing frontend code that selects the new
  column.
- **Task ordering is now a hard rule everywhere a task list is shown**
  (mobile "Your tasks"/Supervisor Queue, desktop per-project Tasks tab):
  1) a task with a due date sorts by that date, earliest first -- always,
  2) a task with no due date falls back to phase order (current/earliest
  incomplete phase first), 3) within the same phase, by the new `sequence`
  column. `src/app/src/lib/taskOrder.ts`'s `sortTasksByPhase` was rewritten
  for this priority (previously phase was primary and date was only a
  same-phase tiebreaker). A due date is never overridden by manual
  ordering -- dragging a dated task is blocked in the UI and prompts the
  user to change its date instead, since date is also what drives the
  Gantt chart.
  - New `reorderPhaseTasks(orderedTaskIds)` in `tasks/api.ts` persists a
    manual order as `sequence = index` for the given (always undated)
    task ids.
  - `PhaseView.tsx`'s per-phase task list (Phases tab) is the reorder
    surface. **First attempt used `react-dnd` + `react-dnd-html5-backend`**
    (matching `EditProjectPhasesDialog.tsx`'s phase-reorder pattern) but
    this was abandoned after the user tried it live and it did not work —
    native HTML5 drag-and-drop doesn't function on touch devices at all,
    which matters here since Supervisors use this on phones/tablets on
    site (unlike the phase reorder it was copied from, which is a
    desktop-only admin screen). Replaced with plain up/down
    (`ChevronUp`/`ChevronDown`) move buttons per undated task row, which
    persist immediately on click (no separate drag/drop step) — reliable
    on any input device. A task with a due date shows greyed-out,
    disabled-looking chevrons that surface a toast ("This task is due ...
    — change its due date to move it...") on click instead of moving it.
    The Phases tab's old 8-task-per-phase display cap was removed so the
    full order is visible and editable.
  - Also fixed during this pass: the assignee text in each Phases-tab task
    row (`PhaseTaskAssigneePicker` and its read-only fallback) had no
    explicit font-size class at all, so it rendered at the browser/button
    default instead of matching the row's 9-10px scale — visually much
    larger than the rest of the line. Both now explicitly set `text-[9px]`.
  - Verified live end-to-end, with real clicks (not drag simulation) on
    the up/down buttons: clicking "Move down" swapped two undated Scarth
    Street tasks' `sequence` values and the desktop Tasks tab immediately
    reflected the new order, confirming persistence and the shared sort
    utility are wired correctly end to end.
- **work.cstlelivn.ca "associate portal" mode is built app-side** (the
  actual domain/DNS is not yet configured -- see Known gaps). New
  `src/app/src/lib/workPortal.ts` `isWorkPortalHost()` detects the
  `work.` hostname prefix (or `?portal=work` for local testing, since this
  sandbox can't own the real domain). When true: `Dashboard.tsx` always
  renders the mobile task-led `MobileTaskDashboard` (not just under
  `md:hidden`) even at desktop width; `App.tsx`'s sidebar collapses to a
  single "My Tasks" item regardless of role/permissions; the browser tab
  title changes to "Cstle Livn — My Tasks"; and `Login.tsx` hides the
  Associate/Contractor role picker and the admin-flavored "Getting
  Started"/role-permission copy on sign-up, replacing it with a plain
  one-line associate-facing message. This exists so a link handed to an
  associate never looks or feels like logging into the admin back office.
  **Still needed from the user**: add `work.cstlelivn.ca` as a domain on
  the Vercel project (Project → Settings → Domains) and point its DNS at
  Vercel per Vercel's instructions -- no separate app deploy is needed
  once that's done, since the behavior is purely hostname-driven at
  runtime.
- **Test account "Victor" (Associate)**: `team_members` row
  `a8921d26-70fb-4a95-8b21-bbe88cbb8b42`, Auth account
  `35da2176-ec38-4f44-8dab-046d8ee9ae35` (`victor@cstlelivn.ca`, a
  placeholder pending the real email), 2 Scarth Street tasks assigned
  ("Dry Fit Reception Cabinets", "Site Setup and Protection" -- note
  "Site Setup and Protection" now also has a due date of Aug 5, 2026 set
  during testing). Not signed into directly by the agent per this
  project's standing rule (never type/submit a password to authenticate,
  even for an account it created itself, even with explicit user
  authorization) -- verified only by reading Victor's assigned tasks from
  an authenticated admin session. The user should sign in as Victor
  themselves to confirm the mobile view end to end before handing off
  real credentials.
- `npm run build` (TypeScript + Vite) passes. Not yet committed/pushed at
  time of writing this entry.

## Onsite photo evidence workflow fixed — August 7, 2026

- **Root cause of "finish keeps asking for a photo even after I added one"**:
  `MobileTaskWorkspace.tsx` had exactly one evidence-upload entry point while
  a task was in progress ("Add photo, video or audio"), and it always
  defaulted `TaskMediaEvidence`'s stage picker to `'progress'` — never
  `'after'`. Finishing required a photo specifically tagged `'after'`
  (`completionPhotoCount`, checked via `countReadyTaskPhotos(id, 'after')`),
  so a user had to manually switch the stage dropdown from "Progress
  update" to "After / completed" themselves. That dropdown (Radix Select)
  also had a real bug on this mobile screen — opening it scrolled the page
  back to the top, making it effectively unusable — so photos kept landing
  in the wrong stage and the finish-photo requirement never cleared. The
  photo-count logic itself (`start()`/`finish()` in `MobileTaskWorkspace.tsx`,
  and the matching DB-level guard in `start_work_session`) was already
  correct; the bug was entirely in which stage the UI defaulted to and the
  broken control for changing it.
- **Fix**: `TaskMediaEvidence.tsx` gained a `lockedStage` prop — when set,
  the stage dropdown is hidden entirely and every upload is tagged with
  that stage automatically (shown as a plain label instead, e.g. "BEFORE
  WORK" / "AFTER / COMPLETED"). `MobileTaskWorkspace.tsx` now has two
  separate, explicitly labeled actions instead of one ambiguous one:
  "Add start photo" (`lockedStage="before"`, shown before starting) and
  "Add finish photo" (`lockedStage="after"`, shown inside the "Finish task
  requirements" section, right next to the completion-photo count). Neither
  needs the dropdown, so the scroll-to-top bug can't block either flow
  anymore. The desktop `TaskDialog.tsx` evidence view is unaffected (no
  `lockedStage` passed) and still shows the full stage picker for
  Managers/Admins reviewing all evidence.
- **Mid-task photos**: per the user's explicit rule ("photo only required
  at start and finish; mid-task only when reporting an issue or requesting
  a change"), the composer's optional file attachment is now *required*
  specifically for the `issue` and `change_request` update types (validated
  in `submitUpdate`, with the attach-files label and Submit button
  reflecting this) and stays optional for `progress`/`query`/`suggestion`.
- **Visual pass** (thumbnails too big, "so many texts the same size, no
  hierarchy"): evidence thumbnails in `TaskMediaEvidence.tsx` shrunk from
  150px to 80px tall (grid now 2-up on mobile / 3-up wider, was 1-2up);
  section header labels across `MobileTaskWorkspace.tsx` ("Finish task
  requirements", "Materials & checklist", "Recent task activity") made
  `font-bold` and bumped from 9px to 10-11px so they read as headers against
  the surrounding 9-11px body/meta text instead of blending in; the
  redundant generic "N photos added" line (which duplicated information now
  shown per-button) was removed and replaced with a "Send an update" section
  label for better scannability.
- **Verified live** on the local dev preview (not yet on production —
  pending push): confirmed the "Add start photo (required)" button opens
  a dropdown-free panel labeled "BEFORE WORK"; started a real work session
  via direct RPC (photo upload itself couldn't be exercised in this sandbox
  — outbound network to the media/R2 pipeline isn't reachable from here);
  confirmed the "Finish task requirements" section now shows a distinct
  "Add finish photo (required)" button that opens a dropdown-free panel
  labeled "AFTER / COMPLETED". Test data (a synthetic `task_media` row, the
  work session, the temporary task assignment) was cleaned up afterward and
  the task's status/timestamps were reset to `To Do`; the work session
  history row itself couldn't be deleted (by design — `task_work_sessions`
  is permanent, append-only history per the original work-session-tracking
  plan) and was left in place as a harmless test artifact.
- **Not yet verified**: an actual end-to-end photo upload (blocked by this
  sandbox's network access, not a known code issue) and the real mobile
  touch/scroll experience on a physical phone. The user should do one real
  start-photo → start → finish-photo → finish cycle on a real device before
  trusting this for daily use.
- **Confirmed the fix is live in production** the same day: the deployed
  bundle at `https://cstle-livn-web-app.vercel.app` is `index-DabrF749.js`,
  byte-identical to the local post-fix build, and was confirmed (by
  fetching and grepping it) to contain the new locked-stage/"Add finish
  photo" code.
- **Manually finished two real Scarth Street work sessions Demilade
  couldn't finish onsite on August 6** because they hit the bug above:
  "Dry Fit Reception Cabinets" (session `14d80301...`, ~2.6h) and "Site
  Setup and Protection" (session `ee5ab0ec...`, ~22.5min), both left
  `paused`. Called `finish_work_session` directly for each with a note
  explaining the admin override; the existing
  `trg_submit_task_to_qc_after_session_finish` trigger correctly moved
  both tasks to `Pending QC` automatically. **Neither has a completion
  ("after") photo attached** -- `finish_work_session` has no server-side
  photo requirement (only `start_work_session` does), so bypassing the
  client-side check via direct RPC call skipped it entirely. Whoever
  reviews these for QC should know the finish photos are missing and
  decide whether to require them retroactively (via the desktop Edit Task
  evidence panel) before approving.

## Dropdown-freeze bug (real root cause), restart-after-submit bug, QC review fixes — August 7, 2026

- **Found and fixed the actual root cause of the app-wide dropdown bug**
  (not the mobile-only workaround from the previous entry -- this affected
  every `Select` everywhere, desktop and mobile, exactly as reported).
  Reproduced live: opening a status/assignee dropdown deep in a scrolled
  list intermittently jumped the whole page back to `scrollTop 0` and left
  it frozen -- `document.body` got `style="pointer-events: none"` (Radix's
  own scroll-lock, applied whenever a `Select` opens) with nothing visible
  to click to dismiss it, since the dropdown itself rendered off-viewport.
  Root cause: the app's authenticated shell root (`App.tsx`) used
  `min-h-[100dvh]` on the top-level flex row instead of `h-[100dvh]` with
  `overflow-hidden`. `min-h` only sets a floor, so that row silently grew
  taller than the viewport to fit content instead of being clipped at it
  -- which meant the inner `flex-1 overflow-y-auto` panes (sidebar, main
  content) never actually had anything to scroll internally, and the
  browser fell back to scrolling `<html>` itself. Radix Select's on-open
  positioning/focus logic assumes a real contained scroll box; with none,
  it operated on `<html>`, which is what caused the jump-to-top-and-freeze.
  **Fixed by changing that one class** (`min-h-[100dvh]` →
  `h-[100dvh] overflow-hidden`) so the existing `overflow-y-auto` panes
  scroll internally as originally intended. Confirmed live, repeatedly:
  the same dropdown that reliably broke before now opens exactly where
  clicked with no scroll jump and no freeze, at every scroll depth tested.
  (A same-file `position="item-aligned"` experiment was tried first and
  discarded -- it did not fix it and does not appear in the final diff;
  `ui/select.tsx` still uses Radix's default `position="popper"`, which
  turned out never to be the actual problem.)
- **Fixed a real task-integrity bug**: a task already `Pending QC` or
  `Under Review` (submitted, awaiting someone else's action) could still
  be re-started from the mobile "Your tasks" queue and from
  `MobileTaskWorkspace.tsx` directly -- neither checked `task.status`
  before allowing Start, only whether a *session* was currently open. Since
  a finished session leaves no "in progress" state behind, the ordinary
  Start button simply reappeared once QC review was pending, silently
  inviting a duplicate work session on an already-submitted task. Both
  surfaces now block Start (with an explanatory message: "submitted --
  waiting on QC review" / "under review -- a supervisor needs to clear
  this") whenever `status` is `Pending QC` or `Under Review`. Matches the
  existing status-workflow semantics exactly (`statusWorkflow.ts`'s
  `getEmployeeActions` already returned no actions for those states for
  the desktop status control -- the mobile flow just wasn't consulting it)
  -- a QC-capable person picking "In Progress" from Pending QC (the
  existing reject/send-back action) is what reopens it.
- **`TaskMediaEvidence.tsx` photo thumbnails now open full-size on click**
  (a simple fixed-position lightbox overlay, close via the X or clicking
  outside the image) -- reviewers can now actually see the uploaded photo
  instead of judging a task from an 80px crop. Verified live against two
  real onsite photos.
- **`TaskReviewDialog.tsx`'s QC checkbox was decorative** -- it had no
  `checked`/`onChange` state at all and didn't gate anything, and its copy
  just restated what the Approve/Request Changes buttons already do.
  Replaced with a real attestation ("I have reviewed the work and evidence
  above, and my decision reflects the best interest of Cstle Livn, this
  project, and the client -- not convenience or speed"), wired to state,
  and now required (both buttons are disabled, with a toast reminder on
  click) before either action is available.
- **Corrected two real `submitted_at` timestamps** that were wrong because
  of the previous session's manual `finish_work_session` correction: I'd
  passed the current time as the finish timestamp instead of when the
  associate actually paused the work, so both tasks showed a submitted-for-
  QC time of ~06:35 UTC (today) instead of when the work really stopped
  the day before. Corrected using the real `pause` event timestamps already
  recorded in `task_work_session_events` (immutable audit log, so the true
  times were recoverable): "Site Setup and Protection" → 2026-08-06
  20:22:28 UTC (~22.5 min session), "Dry Fit Reception Cabinets" → 2026-08-06
  23:07:26 UTC (~2h36m session). Updated `task_work_sessions.finished_at`,
  the matching `task_work_session_events` `finish` row, and
  `tasks.submitted_at` for both. **Lesson for any future manual session
  correction**: always pull the real time from `task_work_session_events`
  rather than using "now" as a stand-in.
- `npm run build` (TypeScript + Vite) passes for all of the above. Not yet
  committed/pushed at time of writing this entry.
- **Open design question, not yet decided or built**: the user wants to
  add a task to a project that's already `Completed`/closed (a warranty
  callback) and asked whether closed projects should get a "reopen" action
  or a separate "warranty task" concept, noting a project arguably
  shouldn't close until final balance is received. Not implemented --
  needs a decision first (see conversation).

## Unified people management + two real account-creation bugs found and fixed — August 16, 2026

- **User's own request**: signing up and appearing in Team Management were
  two disconnected concepts requiring a manual 3-step process (sign up →
  admin creates a separate Team entry → admin edits it to pick the login
  from a dropdown). Asked for "a clean solution... think Buildertrend."
- **While investigating, found two real, currently-live bugs in the
  existing admin "Add User" flow** (Settings → Users), both now fixed:
  1. **Silent role downgrade.** `UserManagement.tsx`'s Add User called
     `signUp()` (`AuthContext.tsx`), which posts to the **public,
     unauthenticated** `POST /auth/signup` edge route. That route is
     deliberately hardcoded to clamp any requested role down to
     Associate/Contractor (a prior, correct fix against self-signup
     privilege escalation) — but the *admin-facing* Add User dialog reused
     the same endpoint, so picking "Manager" or "Supervisor" in that
     dropdown silently created an **Associate** account instead, with a
     misleading "Account created successfully!" message and no error at
     all.
  2. **Session hijack.** That same `signUp()` wrapper also automatically
     signs the caller into the newly created account right after creating
     it (`AuthContext.tsx:415-428`, `await signIn(email, password)`) — correct
     for a person signing themselves up, but it meant an **admin creating
     someone else's account got logged out of their own session and into
     the stranger's account** every time.
  - **Fix**: new authenticated route `POST /make-server-bcab437c/admin/create-person`
    (Super Admin/Manager only, checked via the caller's real bearer token)
    that honors the requested role as-is and never touches the caller's
    session. Optionally creates and links a `team_members` row in the same
    call. `UserManagement.tsx`'s Add User now calls this instead of `signUp()`.
- **New unified flow in `TeamManagementNew.tsx`** (the primary "Teams"
  screen): a **"Needs Team Setup"** banner lists every login with no
  matching `team_members.authUserId` (i.e. someone signed up and isn't on
  the roster yet) with a one-click **"Add as Team Member"** that opens the
  Add dialog pre-filled with their name/email, linking in one step instead
  of three. The Add Team Member dialog also gained an optional **"Also
  create a login for this person"** toggle (Account Role + Password),
  calling the new `/admin/create-person` route so an admin can create the
  login and the team entry, linked, together — this is the actual
  Buildertrend-style "add a person" flow the user asked for. Client
  wrapper: `createPersonAsAdmin()` in `src/app/src/features/team/api.ts`.
- **Fixed a related latent bug while in this code**: `EditTeamMemberDialog.tsx`'s
  "Linked Login Account" dropdown listed every login account with no
  filtering, so picking one already linked to a different team member
  would silently steal it from them. Now excludes logins already linked
  elsewhere.
- **Settings cleanup**: removed the stale default "Diagnostic" tab
  (`ProjectClientDiagnostic.tsx` + `MigrationInstructions.tsx`) — this is
  the exact panel the user screenshotted, confused by a "Create Finance &
  Project Transactions Tables" SQL setup wizard for tables that have
  existed via real migrations for weeks; the component unconditionally
  rendered that wizard with no check for whether the table already
  existed. Also deleted `SchemaInspector.tsx` and
  `ProjectTransactionsSetupBanner.tsx`, both already-orphaned dead files
  with no live import path anywhere. Settings now defaults to Phase
  Templates. `App.tsx`'s dead `"diagnostic"` view/case removed too (it had
  no sidebar entry — only reachable via the now-removed Settings tab).
- `npx tsc --noEmit -p tsconfig.sync.json`, `npm run build`, and `npm test`
  (9/9) all pass. Dev server loads with no new console errors (same
  standing verification limitation as every other feature this session —
  the agent doesn't sign in). **The new `/admin/create-person` edge route
  needs a manual Supabase deploy before it works** — same as the
  estimating tool's routes below, not done as part of this session.

## Profitability & Estimating tool — August 16, 2026

- **What this is**: a full port of a standalone prototype (single-file
  HTML/JS, pasted by the user for reference) into this app — a 9-screen
  estimating pipeline (Leads → Site Capture → AI Analysis → Scope & Takeoff
  → Project Plan → Pricing → Proposal → Customer Approval → Estimated vs
  Actual) plus a company-wide margin-tier/rate-card/assemblies config
  screen. New sidebar module **"Estimating"** (`Calculator` icon), gated on
  a new `canViewEstimating` permission.
- **The prototype's own hard boundary was kept explicit throughout the
  port**: pricing/quantities/totals are always a deterministic formula off
  the rate card and assemblies table — AI only organizes notes, drafts
  scope/questions/plan/proposal text, and suggests DRAFT takeoff quantities
  (always inserted with `source = 'ai-assumption'`) that a human must
  explicitly confirm before pricing can run against them. The pricing route
  hard-blocks with a real error if any takeoff line is still an assumption.
- **Locked product decisions** (confirmed with the user before building):
  AI uses the existing OpenAI integration (no new Claude/Anthropic secret);
  cost and margin numbers are **Super Admin only**, everywhere, at the RLS
  level — not just hidden in the UI; the Customer Approval e-signature is
  an **informal record only** (drawn signature + timestamp, not legally
  binding, no payment captured); Screen 1 (Leads) uses the existing CRM
  leads/clients pipeline rather than a separate list.
- **Architectural fork, resolved**: an `estimates` pipeline (Screens 1–8)
  is deliberately its OWN entity, not the `projects` table — `projects` is
  too deeply wired to phases/tasks/QC/warranty/closed-project immutability
  for pre-sale leads to live there safely. On Customer Approval, a new
  `convert_estimate_to_project(estimate_id)` SECURITY DEFINER RPC creates a
  real `projects` row (budget = the customer-approved selling price, never
  cost) and seeds one phase + ordered, **unassigned** tasks from the
  AI-drafted plan steps. From that point on it's a completely normal
  project — every existing rule applies automatically. Screen 9 (Estimated
  vs Actual) then pulls REAL labor hours from `task_work_sessions` instead
  of the prototype's manual re-entry.
- **Migrations `20240043`–`20240046` are live** (run by the user in order,
  each confirmed before the next was written):
  - `20240043_estimating_config.sql` — `estimating_margin_tiers` (seeded
    from the company's own 12-month business plan doc, Section 10 —
    verified to match the prototype's numbers exactly, not a guess),
    `estimating_rate_card`, `estimating_assemblies` (seeded with the
    prototype's 8 sample assemblies), plus the permission helpers
    `can_view_estimating()` / `can_run_estimating()` /
    `can_manage_estimating_config()` / `can_view_estimating_margins()`.
  - `20240044_estimating_pipeline.sql` — `estimates` (client/lead-linked,
    8 sequential gate booleans), `estimate_measurements`,
    `estimate_documents`, `estimate_media` (R2-backed, same signed-URL
    pattern as `task_media`, kept as its own table).
  - `20240045_estimating_takeoff_pricing.sql` — **also tightens migration
    43**: `estimating_assemblies`/`estimating_rate_card` were originally
    readable by Admin/Manager/Accountant, which contradicted the
    Super-Admin-only cost decision (their columns ARE the cost basis) —
    caught while writing this migration and fixed in the same pass, per
    the project's own "RLS is the real security boundary" rule. Both are
    now Super-Admin-read-only, with a `estimating_assemblies_for_picker()`
    SECURITY DEFINER function giving everyone else name/unit/category only
    (no cost columns) so the takeoff UI still works. Also adds
    `estimate_takeoff_lines`, `estimate_pricing_snapshots` (**immutable** —
    one new row per confirmed price, full audit trail, cost/margin columns
    Super-Admin-only) with a matching `estimate_pricing_summary()`
    SECURITY DEFINER function returning just the customer-safe
    Good/Better/Best prices to everyone else, `estimate_proposals`,
    `estimate_approvals` (signature stored as real R2 media via
    `estimate_media`, extended `media_kind` to allow `'signature'`).
  - `20240046_estimate_to_project_conversion.sql` — the
    `convert_estimate_to_project()` RPC described above. Idempotent
    (calling it twice returns the same project, never duplicates).
  - **Real, practical consequence of the Super-Admin-only cost RLS**: an
    Admin/Manager's browser literally cannot read the rate card or
    assembly costs anymore, so the deterministic pricing calculation
    cannot run client-side for them — it has to be a server round-trip
    (the `/estimating/pricing` edge route) rather than instant live
    recompute-as-you-type like the prototype. The Pricing screen has an
    explicit "Recalculate" button instead. This is a deliberate, known
    tradeoff from the security decision, not an oversight.
- **New edge-function routes** in
  `supabase/functions/make-server-bcab437c/index.ts` (mirrored, per the
  standing rule, but **not yet manually deployed to Supabase** — pushing
  frontend code does not deploy edge functions):
  - `POST /estimate-media/upload-url`, `/estimate-media/:id/complete`,
    `GET /estimate-media`, `DELETE /estimate-media/:id` — R2 signed-URL
    flow for estimate photos/documents/signatures, mirroring `task_media`'s
    routes exactly.
  - `POST /estimating/analyze-capture` — OpenAI (gpt-4o-mini,
    `response_format: json_object`), reads capture notes/measurements/
    documents/photos (passed as R2 signed URLs, not base64), returns
    organized notes/confidence-labeled facts/draft scope/questions/draft
    takeoff. Resolves each `suggestedAssembly` name to a real
    `assembly_id` server-side (service-role read) and auto-inserts draft
    takeoff lines (`source='ai-assumption'`) only on the FIRST run, so a
    re-run never duplicates lines the estimator has already edited.
  - `POST /estimating/generate-plan` — step sequence/research/permits/
    risks/closeout from scope + takeoff.
  - `POST /estimating/generate-proposal` — Good/Better/Best proposal copy
    + customer message, using ONLY the customer-safe selling prices from
    the latest pricing snapshot (never cost/margin, even server-side, to
    keep the boundary explicit everywhere).
  - `POST /estimating/pricing` — the one and only place a selling price is
    computed (pure arithmetic, no AI, cents-based, mirroring
    `src/app/src/features/estimating/pricingEngine.ts`'s
    `computePricing()` formula exactly — if one changes, change the other).
    Uses the service-role client to read cost data regardless of the
    caller's role, writes a full snapshot, then returns either the full
    cost/margin breakdown (Super Admin) or just the customer-safe
    Good/Better/Best prices (everyone else) based on the caller's actual
    role. `confirm: true` also sets `estimates.pricing_confirmed`.
  - **These four routes need a manual Supabase Edge Function deploy before
    they work in production** — not done as part of this session.
- **Workload-aware crew suggestion** (explicit user request, from a
  follow-up business-plan doc that also confirmed the margin-tier numbers
  above): the Project Plan screen shows every active
  Associate/Supervisor/Contractor ranked by current open-task count
  (`task_assignees` cross-referenced with non-Completed tasks, both
  already-loaded app data — no new table). This is informational, not an
  auto-assign — real staffing happens after project conversion, using the
  existing assignee pickers, with full manual override. A separate,
  company-wide "how many crews to hit $40K/$100K a month" capacity planner
  (Section 11 of the same doc) was explicitly deferred by the user to a
  later business-growth-analysis pass — the per-job crew logic above is
  the only crew-sizing feature actually built this session.
- **New files**: `src/app/src/features/estimating/{pricingEngine.ts, api.ts,
  aiApi.ts, useEstimates.ts}`, `src/app/components/estimating/{EstimatingModule,
  EstimateWorkspace, Stepper, ConfigScreen, LeadsListScreen}.tsx` +
  `src/app/components/estimating/screens/{Capture,Analysis,ScopeTakeoff,Plan,
  Pricing,Proposal,Approval,Actuals}Screen.tsx`.
- `npx tsc --noEmit -p tsconfig.sync.json`, `npm run build`, and `npm test`
  (9/9) all pass. Verified the dev server loads cleanly with no new console
  errors (Browser pane, login screen only — same standing limitation as
  every other feature this session: the agent never signs in, so the
  actual 9-screen flow, AI calls, and R2 uploads have **not** been
  exercised live). **Before relying on this**: deploy the edge function,
  then walk one real estimate end-to-end — a lead with a real address
  through to a converted project — as both a Super Admin (to see margins)
  and an Admin/Manager (to confirm they see prices only).

## Permit tracking — Permits tab per project — August 11, 2026

- Migration `20240042_project_permits.sql` was run successfully by the user
  in Supabase. It adds `project_permits` (one row per permit -- type,
  status, permit number, applied/issued/expiry dates, notes) and
  `project_permit_events` (append-only log under each permit -- every call,
  email, submission, or inspection, each with its own city reference number
  and who was spoken to). Both are project-scoped and cascade-deleted with
  the project; `project_permits.id` cascades to its events.
- **Design decision, confirmed with the user**: permits live on the
  **Project** (a new "Permits" tab next to Tasks/Phases/Files & Activity in
  `ProjectDetailsReal.tsx`), not on the CRM client record -- a permit is
  tied to a specific job/address, and the project is already linked to its
  client, so nothing needs duplicating. Explicitly not a separate top-level
  Permits module (more flexible, but more to build and another place to
  navigate to) and not attached to the CRM client directly (most clients
  only have one relevant project at a time; the client-level rollup was
  floated as a possible future addition, not built).
- **RLS**: office/compliance data, not onsite work -- readable by
  `is_broad_project_viewer()` roles (Super Admin, Admin, Manager,
  Accountant, Quality Control) plus the Supervisor of that specific project
  (`is_project_supervisor()`, both helpers already existed from earlier
  migrations). Associates/Contractors get zero rows and never see the tab.
  Writes require Manager/Admin or that project's Supervisor; permit
  *deletion* is Manager/Admin only. Permit events (the call log) can be
  inserted by the same write-capable roles but only **updated** by
  Manager/Admin (to fix a typo) and can never be deleted by anyone --
  deliberately append-only, so a permit's history can't be quietly
  rewritten years later.
- New `src/app/src/features/permits/api.ts` (CRUD for both tables,
  following the existing `projectPhases/api.ts` pattern) and
  `usePermits.ts` (one-shot fetch on mount/refresh, no realtime channel --
  permits change rarely enough that this matches the existing
  procurement/phase-QC pattern in `PhaseView.tsx`, not the always-subscribed
  tasks/projects pattern).
- New `src/app/components/ProjectPermitsTab.tsx`: a collapsible list of
  permits (type, status badge, permit number, key dates), each expandable
  to show its full call/update history and a "Log Call / Update" action.
  Permit type is a free-text input with a `<datalist>` of common presets
  (Building, Electrical, Plumbing, Mechanical, Demolition, Development,
  Occupancy) rather than a closed enum, since city permit categories vary
  and shouldn't need a migration to extend. Wired into
  `ProjectDetailsReal.tsx` behind the same permission check already used to
  gate task creation (`canCreateTask` -- broad-viewer roles or this
  project's Supervisor), so the tab itself only appears for people who can
  actually see the data.
- `npx tsc --noEmit -p tsconfig.sync.json`, `npm run build`, and `npm test`
  (9/9) all pass. The dev server loads cleanly with no new console errors
  (checked via the Browser pane at the login screen -- the pre-existing
  WebSocket/CORS/uuid noise there is unrelated dev-server chatter, not new).
  **Not verified past the login screen** -- same standing limitation as the
  drag-and-drop work above (this sandbox never signs in). The user should
  open a real project's Permits tab, add a permit, and log a call before
  relying on it.

## Real drag-and-drop for phases and tasks (replaces up/down buttons) — August 11, 2026

- **User feedback, explicit**: the up/down chevron-button reorder (built
  August 6/8) wasn't good enough -- wanted real drag, working with mouse,
  touch, and iPad/phone, AND the ability to drag a task from one phase into
  a *different* phase (not just reorder within one), plus drag phases
  themselves into a new order. Concrete example given: the "Demolition"
  phase should move earlier in the phase order, and a task called "Protect
  Finished Millwork" currently under Demolition should become the last task
  under "Millwork Preparation" instead.
- Added `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (not
  `react-dnd`, which was already tried and explicitly abandoned on August 6
  for this exact reason -- its HTML5 backend doesn't support touch at all).
  dnd-kit uses Pointer Events (covers mouse/trackpad/touch) plus a dedicated
  `TouchSensor` fallback and a `KeyboardSensor`, so the same drag gesture
  works across desktop, phone, and tablet, with basic keyboard reorder as a
  side benefit.
- **`PhaseView.tsx` rewritten** around a single `DndContext` wrapping the
  whole phase list:
  - **Phase reorder**: a grip handle on each phase header (visible to
    `canEditPhases` roles only) drags the phase to a new position; reuses
    the already-existing `reorderProjectPhases()` API (no new backend code
    needed -- it already existed for `EditProjectPhasesDialog.tsx` but had
    no touch-capable UI wired to it in this tab).
  - **Task reorder + cross-phase move**: a grip handle on each task row
    (visible to `canAssignTasks` -- Manager/Admin, or the Supervisor of that
    project) replaces the old chevrons entirely. Dropping a task elsewhere
    within its *own* phase reorders it against tasks sharing the same due
    date (or all-undated) -- same restriction as before (a due date across
    different days still can't be manually reordered, since it drives the
    Gantt chart), just via drag instead of buttons, with a toast explaining
    why if you try to drag across a date boundary within one phase.
    Dropping a task into a **different** phase's task list is now always
    allowed regardless of date -- it sets that task's `phase_id` (and the
    legacy `phase` name field, matching how `TaskDialog.tsx` already does
    it) via the existing `updateTask()` API, and positions it within its own
    due-date group in the new phase (an undated task dropped into a phase
    naturally lands after that phase's dated tasks, since
    `sortTasksByPhase` -- unchanged -- always sorts dated tasks first).
    Both phases you're dragging between need to be expanded (drag targets
    only exist in the DOM for expanded phases) -- a reasonable constraint,
    not a bug.
  - A `DragOverlay` shows a small floating label (phase name or task title)
    while dragging, for visual feedback on both desktop and touch.
  - `reorderPhaseTasks()` (existing API, unchanged) is called with the
    destination group's full ordered id list on drop, exactly as the old
    button-based `move()` did -- no new backend code was needed for tasks
    either, only the UI driving it.
- `npx tsc --noEmit -p tsconfig.sync.json`, `npm run build`, and `npm test`
  (9/9) all pass. **Not verified with a real drag gesture** -- this
  sandbox's dev server loads cleanly with no console errors (confirmed via
  the Browser pane up to the login screen), but per this project's standing
  rule the agent never types/submits a password to sign in, even to its own
  test account, so the actual drag interaction itself couldn't be exercised
  live. The user should try dragging a phase and dragging a task across
  phases (the Demolition/Millwork Preparation example that prompted this)
  on the deployed build before relying on it day-to-day.
- Also restored `.claude/launch.json` after accidentally overwriting it
  while setting up this session's preview server -- it's gitignored, so
  there's no history to recover from. Only the `cstle-webapp` entry
  (this repo, `npm run dev`, port 5173) was restored; a `cstle-website`
  entry that existed before is gone and needs to be re-added by hand if
  still needed (unknown path/port from this side).

## Photo compression silently failing (HEIC), R2 storage bloat — August 9, 2026

- **User caught this from real R2 usage data**: only ~22-23MB of R2 storage
  used across a handful of images, yet one single image was ~3MB -- nowhere
  near the documented ~150-350KB WebP target.
- **Root cause**: `optimizeMediaFile()` in
  `src/app/src/features/media/api.ts` compresses via `createImageBitmap` +
  canvas → WebP, but had no real fallback for images the browser can't
  decode -- it just silently returned the **original, unmodified file** on
  any decode failure or if the compressed candidate wasn't smaller, with no
  size check on that fallback at all. HEIC/HEIF (the default iPhone camera
  format, and this is a jobsite app where the crew is almost certainly
  shooting on iPhones) fails to decode via `createImageBitmap` in
  Chrome/Android and unreliably in Safari, so a multi-MB HEIC photo could
  sail straight through uncompressed and straight past the 12MB client/server
  size caps (which apply to the *post-optimization* file, so they never
  caught this).
- **Fix**: added `heic2any` (dynamically imported only when a HEIC/HEIF file
  is actually encountered, so it doesn't add to the main bundle -- confirmed
  it lands in its own separate chunk on build) to convert HEIC/HEIF to JPEG
  before attempting `createImageBitmap`, so the normal compression path can
  actually run on iPhone photos. Also added a hard ceiling (2MB normal /
  4MB for "Save for Marketing," which intentionally targets higher quality)
  on any fallback-to-original path -- if compression still can't get a large
  file under that ceiling (corrupt file, unsupported color profile, etc.),
  `optimizeMediaFile` now throws a clear error (`"Couldn't compress this
  photo. Try again, or use a different photo."`) instead of silently
  uploading an oversized original. Small images that don't need compression
  still pass through untouched, since the ceiling only applies once a file
  is already large.
- `npx tsc --noEmit -p tsconfig.sync.json`, `npm test` (9/9), and
  `npm run build` all pass; the build output confirms `heic2any` code-splits
  into its own chunk rather than inflating the main bundle. **Not verified
  with a real HEIC upload** -- this sandbox's outbound network can't reach
  the media/R2 pipeline (same limitation noted in the August 7 evidence-flow
  work), so this shipped on code review + build/typecheck/test, not a live
  upload test. The user should do one real iPhone photo upload after this
  deploys and check the resulting R2 object size to confirm.
- **Not done in this pass, worth doing separately if the user wants it**:
  auditing/re-compressing the existing ~22MB already in R2 (the fix only
  changes behavior for new uploads going forward), and a small admin
  diagnostic to list R2 objects by size so oversized files can be spotted
  without waiting for a billing alert.

## Dashboard Resume/Finish state + per-day time breakdown — August 9, 2026

- **Issue 1, reported live**: the mobile dashboard's task queue kept showing
  "Decline"/"Start" for a task the associate had already started and paused
  -- there was no check against actual work-session state, only whether the
  task was freshly assigned. `MobileTaskDashboard.tsx`'s `TaskQueueRow` now
  takes a `workSessions` prop (sourced from `useWorkSessions(true)` in the
  parent) and looks up `activeSession` -- an open (non-`finished`) session
  for the signed-in team member on that specific task. When one exists, the
  row renders "Resume Task" (session `paused`) or "Continue Task" (session
  `running`) alongside "Finish Task" instead of Decline/Start, plus a small
  "Timer is paused/running" line (with the pause note, if any). Both new
  buttons navigate to `task-details` -- "Finish Task" deliberately does not
  attempt an inline finish, since the real finish flow (checklist/photo
  validation) only lives in `MobileTaskWorkspace.tsx`. Only the
  Decline/Start branch (no active session at all) is unchanged.
- **Issue 2, reported live**: the associate asked whether the app could show
  a per-day breakdown of time spent on a task (e.g. "yesterday 2h, today 2h,
  total 4h and counting") rather than just one opaque total, since a task
  worked across multiple days only ever showed the combined number. New
  helpers in `src/app/src/lib/timezone.ts`: `dayKeyInOrgTz` (sortable
  `YYYY-MM-DD` for "which job-site day did this instant fall on," using the
  existing fixed `ORG_TIMEZONE`) and `formatShortDateInOrgTz` ("Aug 7"
  style label). New `groupSessionsByDay`/`formatDurationCompact` in
  `src/app/src/features/workSessions/useElapsedTime.ts` sum each session's
  `activeSeconds` into its start day and format a compact "2h 12m"/"45m"
  string. Wired into both:
  - `MobileTaskWorkspace.tsx` (associate's own view): a line under the
    existing Priority/Estimate/Actual/Remaining stat grid, shown only when
    the task has sessions spanning more than one day.
  - `TaskReviewDialog.tsx` (QC review, the other surface the user
    explicitly asked about): a "Worked: Aug 7 2h5m · Aug 8 2h12m · Total
    4h17m" line inside the existing Timing block, using the sessions this
    dialog already fetches via `listSessionsForTask` -- no new query.
  - Deliberately a measured-work-time total (sum of `activeSeconds`), not
    the pre-existing "Total time" line in the same Timing block, which is a
    wall-clock span (`submittedAt - startedAt`) and can overstate actual
    work if a task sat paused overnight -- the two numbers can legitimately
    differ and both remain visible side by side.
  - A still-`running` session's live-ticking extra seconds aren't reflected
    in this breakdown (only each session's last-saved `activeSeconds`) --
    acceptable for a summary, since the separate live timer elsewhere
    already covers "right now" precisely.
- `npx tsc --noEmit -p tsconfig.sync.json`, `npm test` (9/9), and
  `npm run build` all pass. No migration -- both fixes are read-side only,
  reusing `task_work_sessions` data that already existed.

## Task deletion silently failing, warranty tasks — August 7, 2026

- **Fixed "delete a task and it keeps coming back."** Not a phantom bug --
  `deleteTask` in `AppContext.tsx` already correctly rolls an optimistic
  removal back on failure, but all four call sites
  (`ProjectDetailsReal.tsx`, `TaskManagement.tsx`, `TaskKanban.tsx`,
  `TaskGanttChart.tsx`) called it fire-and-forget with no `await`/`catch`,
  so a real failure was an unhandled promise rejection the user never saw
  -- the task just silently reappeared a moment later with zero
  explanation. The actual failure, confirmed live: `task_assignees`,
  `task_work_sessions`, `task_aura_scores`, `task_updates`, and
  `task_completion_attributions` all reference `tasks.id` with
  `ON DELETE RESTRICT` (by design, to protect real work/QC/Aura history --
  see the multi-assignee and Aura migrations) -- so a task with *any*
  assignment or session history, even inactive/historical rows, cannot be
  hard-deleted at all, full stop. All four call sites now properly
  await + catch and show a clear toast (a friendlier "this task has
  recorded history" message when the failure looks like the FK
  violation, or ask an admin to clear its history first, else the
  original message), and the two sites that didn't already have a confirm
  step (`ProjectDetailsReal.tsx`, `TaskKanban.tsx`) now confirm before
  deleting.
  - Directly deleted the two specific "Flooring QC review" tasks the user
    reported (one in `sample`, one in `__SAVE_TEMPLATE_TEST__` -- both
    test/template projects, not real production data) after confirming
    they had zero real session/QC history, just leftover `task_assignees`
    rows from earlier test data cleanup this session -- removed those
    rows first, then the tasks, since RESTRICT blocks even on inactive
    assignment rows.
- **Migration `20240040_warranty_tasks.sql` (not yet run by the user --
  needs to run before this feature works) adds warranty/callback tasks**,
  per the plan agreed on with the user: don't reopen closed projects
  (keeps the closed record clean); instead allow a narrowly-scoped
  "warranty task" to be added to a `Completed` project without reopening
  it or touching its recorded numbers.
  - New `tasks.is_warranty boolean not null default false`. Both
    trigger functions from 20240033
    (`reject_closed_project_task_mutation`,
    `reject_closed_project_assignment_mutation`) now carve out an
    exemption for `is_warranty = true` tasks -- they can be inserted into
    a closed project and go on being edited/assigned/status-progressed
    normally afterward, while every other task in that project stays
    fully frozen exactly as before. `is_warranty` itself can only be set
    at INSERT time; an UPDATE can never flip it true or false, closing
    off the obvious loophole (retroactively "warranty-flagging" a real
    historical task to unlock editing it).
  - `TaskDialog.tsx`: creating a task in a `Completed` project no longer
    hard-blocks -- it switches into a "Warranty / Callback Task" mode
    (visible banner explaining what's happening), skips the normal
    phase-selection requirement (a warranty task isn't part of the
    project's original, now-closed phase plan -- it's filed under a plain
    "Warranty" label with `phase_id: null` instead), and sets
    `is_warranty: true` on creation. Editing an existing warranty task
    afterward is fully normal (not read-only), unlike every other task in
    a closed project.
  - `ProjectDetailsReal.tsx`: the "Add Task" button, previously hidden
    entirely once a project closed, now always shows for anyone with
    create-task permission, relabeled "Add Warranty Task" when the
    project is closed. Task rows (mobile card, desktop list, grid) show a
    small "Warranty" badge next to the title when `is_warranty` is true.
  - `npm run build` passes. **Not yet verified live** -- needs the
    migration run first (the column doesn't exist in the database yet).
  - Prompted this: the user wants to add a real task ("Stapleford Cr
    warranty door adjustment") to `KB - 119 Stapleford Cr`, a real closed
    project, for tomorrow. Once the migration is run, that specific task
    should be created for them.

## Task side panel, clickable task rows, dashboard startup race, warranty task gap — August 7, 2026

- **Migration `20240040_warranty_tasks.sql` is confirmed live** (queried
  `tasks.is_warranty` directly against the real database this session —
  succeeds). **Migration `20240041_warranty_task_phase_exempt.sql` is
  written but NOT yet run** -- confirmed live by attempting to actually
  create the "Stapleford Cr warranty door adjustment" task through the real
  UI: it failed with `PHASE_REQUIRED: add/select a project phase before
  creating a task`, the exact `require_valid_task_phase()` (from
  `20240035`) trigger that `20240041` patches. **Once the user runs
  `20240041`, retry creating that task** for `KB - 119 Stapleford Cr`
  (project id `6a878771-5999-4f3a-acb9-30895bca0265`) -- title "Stapleford
  Cr warranty door adjustment", due 2026-08-08, assigned to Demilade.
- **Found and fixed a second, independent closed-project gap in the
  original warranty-task work**: `AppContext.tsx`'s `addTask()` has its own
  client-side guard (`if (project.status === "Completed") throw ...`)
  that was never updated when warranty tasks were added -- so even with
  both DB migrations live, the warranty-task flow would still fail
  client-side before ever reaching the API. Fixed by exempting
  `task.is_warranty` from that guard, mirroring the DB-level exemption.
  Caught live: the first attempt to create the Stapleford task via the UI
  failed with "This project is closed. New tasks cannot be added." even
  though the `TaskDialog.tsx` warranty-mode banner was showing correctly --
  this is why 20240040 alone wasn't sufficient and testing the actual UI
  flow (not just the DB trigger) mattered.
- **`TaskDialog.tsx` converted from a centered `Dialog` to a right-side
  `Sheet` panel** (`ui/sheet.tsx`'s `Sheet`/`SheetContent`, `side="right"`,
  `sm:max-w-xl` so the content-heavy task form has room), per explicit user
  request ("if on the desktop, if I click on the task, it could open as a
  side panel instead of a dialogue box"). All existing call sites
  (`ProjectDetailsReal.tsx`, `PhaseView.tsx`, `TaskManagement.tsx`,
  `TaskKanban.tsx`, `TaskGanttChart.tsx`) get this automatically since they
  all render the same `TaskDialog` component. Fixed a latent bug this
  exposed in `ui/sheet.tsx`: `SheetOverlay` wasn't wrapped in
  `React.forwardRef` (unlike `DialogOverlay`, which was), causing a
  "Function components cannot be given refs" console warning the first
  time `Sheet` was actually used from a Radix `Portal`/`Presence` context --
  fixed to match `DialogOverlay`'s pattern.
- **Task titles are now clickable everywhere a task list is shown** to open
  that same side panel directly, instead of requiring the separate Edit
  pencil icon: `ProjectDetailsReal.tsx`'s mobile card, desktop list row, and
  grid item `<h4>` titles; and `PhaseView.tsx`'s per-task row title inside
  each expanded phase (which previously had no task-detail entry point at
  all -- `PhaseView.tsx` gained its own local `TaskDialog` instance,
  `selectedTask`/`taskDialogOpen` state, mode `"edit"`). Addresses "if I
  just click on a task, it should be able to show me that dialogue...
  whether in phases or in tasks."
- **Investigated the "dashboard comes up blank on login, sometimes needs
  several reloads" report.** Hypothesis: `AuthContext`'s async
  `initSession()` does a `supabase.auth.getUser()` network round-trip
  before `user`/role are available, and several data hooks
  (`useTasks`, `useProjects`, `useTaskAssignees`, `useTeamMembers`) do a
  single, un-retried initial fetch gated on that role being ready --  the
  very first fetch right after sign-in can lose that race, fail once
  silently (empty `catch`), and nothing else ever retries it. Applied a
  "wait 1200ms, retry once" fallback to all four hooks' initial fetch.
  **Not root-caused with certainty** -- reproducing the original intermittent
  blank-dashboard-on-login symptom directly wasn't possible in this
  session (the existing dev session was already signed in), so this is a
  plausible-and-safe mitigation verified only by build/typecheck passing
  and by confirming the dashboard loads its data normally with the change
  in place, not by reproducing the original bug and watching it disappear.
  If the user still sees a blank dashboard after this ships, the next step
  is adding a visible retry/error state instead of a silent one, and
  actually instrumenting the real timing race.
- `npm run build` (TypeScript + Vite) passes for all of the above. Verified
  live against the local dev server (which points at the same, single
  Supabase project used by production -- there is no separate local DB):
  the Sheet side panel opens correctly from both the Tasks tab and the
  Phases tab, the existing photo lightbox still works inside it, and the
  warranty-task client-side gap above was caught specifically because this
  verification attempted the real end-to-end flow instead of stopping at
  "the code compiles." Also verified at 375px mobile width: task-title
  clicks, the full-width panel fallback, and the lightbox all work
  identically there.
- **Reduced finish-task friction on `MobileTaskWorkspace.tsx`** per explicit
  user feedback ("make sure the Aura gates are not a lot on the tasks...
  so people on site are not frustrated"): the completion note and the
  "tools/materials cleared" checkbox are no longer blocking requirements to
  finish a task -- both are now labeled "(optional)" and `finish()` no
  longer throws on them. Required checklist items and the finish photo
  remain mandatory (evidence/QC integrity, and the photo requirement was an
  explicit earlier user request) -- only the two fields with no QC/evidence
  value were relaxed.
- **Tools/materials-cleared checkbox went optional -> reminder-only -> back
  to a required gate, same day**, tracking the user's own back-and-forth:
  first relaxed for friction, then the user asked to "keep the habit"
  (added reminder copy but stayed non-blocking), then explicitly asked to
  make it a gate again. `finish()` now throws `'Confirm tools and unused
  materials are cleared or secured'` if `toolsCleared` is false, same as the
  original behavior before this day's changes; the checkbox label lost its
  "(optional)" suffix and gained a `*` to match the required-checklist-item
  convention used elsewhere on this screen. The finish-photo reminder line
  ("Does your finish photo show the area cleared...") stays -- it's still a
  useful nudge alongside the hard gate. The completion note remains
  optional (not part of this reversal). Verified via `npm run build` only
  (copy/logic-only change, same reasoning as above about not wanting to
  write a real permanent work-session row just to screenshot it).
- **Caught two real UI bugs while doing the requested visual QA pass** on
  the just-created Stapleford Cr warranty task (not new regressions --
  both pre-existed, this was the first time an existing warranty task was
  actually reopened for editing): (1) `TaskDialog.tsx` populated its due
  date field straight from `task.dueDate`, which holds a full ISO
  timestamp (`2026-08-08T00:00:00+00:00`) -- an `<input type="date">`
  silently rejects anything that isn't exactly `YYYY-MM-DD` and renders
  empty, so every task's due date appeared blank the moment you reopened
  it to edit, even though the real value was saved correctly. Fixed by
  slicing to the first 10 characters when populating form state (same fix
  applied to `start_date`). (2) The "Warranty / Callback Task" banner and
  phase-requirement skip were gated on `isWarrantyAdd` alone (`mode ===
  "add"`), so editing an *existing* warranty task after creation fell
  through to the normal "Project Phase *" required dropdown -- which
  would have crashed on save (`selectedPhase.name` on a null
  `selectedPhase`) or blocked the edit entirely. Introduced a combined
  `isWarranty = isWarrantyAdd || isWarrantyTask` and used it everywhere
  the phase requirement is skipped (the closed-project guard, the phase
  validation block, the `phase`/`phase_id` assignment, and the banner
  render condition). Verified live: reopened the Stapleford task, due
  date now shows `2026-08-08`, and the Warranty banner renders instead of
  a phase picker.

## Pause-reason capture, mobile — August 7, 2026

- **Real problem reported live**: an associate paused "Remove Existing
  Tiled Wall" at the end of a workday with no way to say why -- the mobile
  pause button just paused instantly, so a pause left overnight would have
  read back identically to a five-minute break, corrupting the actual-hours
  number the timer exists to produce. No new migration needed --
  `pause_work_session` (from `20240016`) already accepts a `p_notes` field;
  nothing was writing to it from the mobile flow.
- **`MobileTaskWorkspace.tsx`**: tapping Pause now opens a bottom-sheet
  overlay ("Why are you pausing?") with two required preset choices --
  "Taking a short break" / "Done for the day" -- plus an optional free-text
  detail field. Confirming calls `pause_work_session` with `notes` set to
  the chosen label (plus the detail, if any); Resume is unaffected. A
  reason is mandatory -- the confirm button stays disabled until one preset
  is picked.
- **`WorkSessionTimer.tsx`** (desktop, used inside `TaskDialog`) already
  had an equivalent pause-notes field from earlier work, but its textarea
  placeholder read "Completion note *" -- copy-pasted from the finish form
  and actively misleading for the pause context, with no matching
  validation despite the asterisk. Fixed the placeholder to describe the
  pause reason and added the same "reason required" validation the mobile
  flow now has, so desktop and mobile behave identically.
- **Caught and fixed a real, pre-existing type error while typechecking
  this work** (unrelated to the pause change, from the earlier warranty-task
  commit): `is_warranty` was added to the `TaskUpdate` interface in
  `tasks/api.ts` but not to `TaskInput`, so `createTask`'s use of
  `input.is_warranty` didn't typecheck. Added the missing field to
  `TaskInput`. `npx tsc --noEmit -p tsconfig.sync.json` and `npm run build`
  both pass clean now.
- **Verification note**: `npm run build` and the scoped typecheck both
  pass. The live browser session's auth was lost when the dev server was
  restarted for this pass, and per this project's standing rule the agent
  never types/submits a password to sign back in -- so this round shipped
  on build/typecheck plus code review (the new overlay reuses the exact
  same fixed-overlay/bottom-sheet and pill-button patterns already visually
  verified earlier the same day for the photo lightbox and pause-reason
  equivalent on desktop), not a fresh live screenshot. Worth a real
  on-device pause the next time someone's on site.
- **Verified live end-to-end after the user logged in**: resumed the
  user's real 46-minute-paused "Remove Existing Tiled Wall" session,
  confirmed the "Pause" button now opens the reason panel exactly as
  designed (two required presets, optional detail, disabled Confirm until
  a preset is picked), selected "Done for the day", and confirmed via a
  direct database read that `task_work_sessions.notes` was correctly set
  to `"Done for the day"` and the session paused. This is the real task
  from the user's own screenshot.
- **Found and fixed the actual root cause of the original "dashboard
  comes up blank, sometimes need several reloads" report** while doing
  this verification -- reproduced it live. `useTeamMembers.ts` was the
  only one of the four data hooks touched earlier that day
  (`useTasks`/`useProjects`/`useTaskAssignees`/`useTeamMembers`) with no
  reconnect/visibility recovery at all: if both the initial fetch and its
  one 1200ms retry lost the sign-in session-hydration race, `teamMembers`
  stayed `[]` for the rest of the tab's life -- nothing else ever
  triggered another attempt. Confirmed live: after a fresh load, the
  dashboard's Aura panel was stuck on "Loading Aura profile..."
  indefinitely and every assignee picker in the app showed "No active
  team members", while the exact same query succeeded when run manually
  moments later -- proving the data was fine and only the hook's state
  was stuck. Added the same `recover()`-on-reconnect/visibility pattern
  already used by `useTaskAssignees.ts` (window `online` listener,
  `visibilitychange` listener, and a `subscribedOnce`-gated recover on
  realtime resubscription). This is likely the actual mechanism behind
  the user's original complaint, more so than the blind-retry mitigation
  applied earlier the same day to all four hooks.
- Also worth noting for future sessions: `javascript_tool` (browser
  console access) is for read-only debugging/inspection only, never for
  manipulating the DOM to work around a UI issue during testing --
  directly removing a Sonner toast's DOM node with `element.remove()`
  mid-verification desynced it from React's tree and crashed the
  `<Toast>` component (blank white screen), which was briefly and
  incorrectly mistaken for a possible real app bug before the cause was
  identified. A page reload recovered cleanly and the already-completed
  pause action was confirmed intact in the database.

## "Done for the day" pause hardening + QC queue split — August 7, 2026

- **`MobileTaskWorkspace.tsx`**: a session paused "Done for the day" now
  removes Finish Task from the footer entirely, leaving a single full-width
  "Resume task" button. Per explicit user feedback, offering Finish Task
  next to Resume on a day-end pause invited finishing a task that was only
  paused, not actually complete. Detection is
  `session.notes?.startsWith('Done for the day')`, computed as `pausedForDay`.
- Selecting "Done for the day" in the pause-reason sheet now also requires
  a photo before Confirm Pause will succeed (same evidence bar as
  start/finish), via a new "Add end-of-day photo (required)" button that
  opens `TaskMediaEvidence` with `lockedStage="progress"`. Confirming
  without a photo shows a toast and opens the photo panel instead of
  pausing. "Taking a short break" still needs no photo -- only the
  day-ending pause does, since that's the one meant to capture the actual
  state of the work before leaving it overnight.
- **`MobileTaskDashboard.tsx`**: "Your tasks" no longer includes tasks the
  associate already submitted (`Pending QC`/`Under Review`) -- those sat at
  the top of the list indefinitely waiting on someone else's action, which
  the user flagged as clutter ("shouldn't still list as the next task").
  Split into `myTasksUnsorted` (excludes those two statuses) and a new
  `myQcQueueUnsorted`. A collapsible "Awaiting QC" section (collapsed by
  default, `ShieldCheck` icon, count badge) renders below the active list
  when non-empty; expanding it lists each submitted task by title and
  status, tapping one still opens the normal read-only task view.
- Verified live end-to-end on the real "Remove Existing Tiled Wall"
  session and the real "Dry Fit Reception Cabinets" (Pending QC) task:
  resumed and re-paused with "Done for the day" showed only Resume in the
  footer; selecting "Done for the day" in the pause sheet correctly
  surfaced the required-photo button and blocked Confirm Pause without one
  (confirmed via a direct database read that the session stayed
  `running`); "Dry Fit Reception Cabinets" moved out of "Your tasks" into
  the new collapsed "Awaiting QC" section and opened correctly from there.
  The task was left paused with `notes: "Done for the day"` and its real
  `active_seconds`, matching its state before this verification pass --
  a short resume/re-pause cycle needed to exercise the new gate added
  ~250s of test-session time, which was corrected back to the "Done for
  the day" label afterward (the small elapsed-time delta from the test
  cycle itself was left as-is rather than hand-edited, consistent with
  never fabricating a specific corrected duration without a real source
  timestamp to justify it).
- `npm run build` passes. No new migration -- reuses the existing
  `task_work_sessions.notes` field and `TaskMediaEvidence`'s `progress`
  stage, both already live.

## Due-date-shows-previous-day fix — August 8, 2026

- **Root cause**: `src/app/src/lib/dates.ts`'s `formatDate()` -- a
  *second*, separate date formatter from `src/app/src/lib/dateFormatter.ts`
  -- parsed calendar-date strings (task due dates, project start/end
  dates, always stored as UTC-midnight timestamps like
  `2026-08-08T00:00:00+00:00`) with plain `new Date(...)` and then
  `.toLocaleDateString()`. That converts to the browser's local timezone,
  which rolls a UTC-midnight instant back to the previous day in any
  negative-UTC-offset zone (e.g. Saskatchewan, UTC-6: midnight UTC on the
  8th is 6pm on the 7th locally) -- so a task due "Aug 8" displayed "Aug
  7" everywhere this formatter was used. This is the same class of bug
  already fixed for the Calendar/Gantt views (`20240026`-era work,
  `daysBetweenUTC`/`dateOnly` helpers in `ProjectDetailsReal.tsx`) but
  this second formatter was never brought in line with that fix.
- **Fix**: `formatDate()` in `lib/dates.ts` now reads the `YYYY-MM-DD`
  digits straight out of the string and constructs a *local* `Date` from
  those parts (bypassing the UTC-instant interpretation entirely) before
  falling back to the old behavior for non-string/non-ISO inputs. Every
  call site of this function across the app (`ProjectDetailsReal.tsx`,
  `TaskManagement.tsx`, `TaskKanban.tsx`, `Dashboard.tsx`,
  `RecentTasksWidget.tsx`, `ClientDetailsDialog.tsx`,
  `ProjectManagement.tsx`, `TaskRatingDialog.tsx`) only ever passes
  calendar dates (due dates, start/end dates) to it, never a real
  timestamp-with-time-of-day, so this fix has no other call sites to
  regress -- `formatDateTime` in the same file, used for actual instants,
  is untouched.
- Verified live: the Stapleford Cr warranty task (`due_date` stored as
  `2026-08-08T00:00:00+00:00`) now shows "Aug 8, 2026" in the project
  Tasks tab; it previously would have shown "Aug 7, 2026".
- `npm run build` passes. No migration -- display-only fix.

## Fixed org timezone for real timestamps — August 8, 2026

- Follow-up to the due-date fix above, from a design conversation with the
  user: Cstle Livn's core workflows (work-session timers, QC review
  timing, pause/finish times) are field-service work, not generic office
  collaboration -- what matters is "what time did this happen at the job
  site," not whoever's browser happens to have the app open. Since every
  current project is in Saskatchewan (fixed UTC-6, no DST), the agreed
  approach is a single fixed org timezone rather than the viewer's device
  timezone -- explicitly **not** a per-project timezone field, since
  there's no real multi-region need yet (revisit if that changes, e.g. a
  BC project).
- New `src/app/src/lib/timezone.ts`: `ORG_TIMEZONE = 'America/Regina'`
  plus `formatDateInOrgTz`/`formatDateTimeInOrgTz`/`formatTimeInOrgTz`,
  built on native `Intl.DateTimeFormat` with a fixed `timeZone` (no new
  dependency). The file's top comment is explicit that these are for real
  instants only (session start/pause/finish, submitted/created timestamps)
  -- **never** for calendar-date-only fields (due/start/end dates), which
  must keep using `lib/dates.ts`'s digit-extracting `formatDate` instead.
  Converting a calendar date's synthetic UTC-midnight marker to any real
  timezone (Regina included) reintroduces the exact off-by-one bug fixed
  above; this distinction is easy to get backwards and is called out
  deliberately so it doesn't happen accidentally later.
- Wired into `dateFormatter.ts` (the app's "centralized" formatter per its
  own doc comment, though only actually used by 3 files:
  `CRMModule.tsx`/`ProjectFinanceTab.tsx`/`ProjectTransactionsView.tsx`)
  and into the two most directly relevant real-instant displays for this
  session's work: `MobileTaskWorkspace.tsx`'s "Started 4:56 PM" timer
  label and `TaskReviewDialog.tsx`'s QC "Started"/"Submitted for QC"
  timestamps (their due-date displays were switched to `lib/dates.ts`'s
  `formatDate` in the same pass, not the new org-timezone functions).
- **Known remaining scope, not done in this pass**: roughly 30 other
  component files format dates/times ad hoc via `new
  Date(x).toLocaleString()`/`toLocaleDateString()`/`toLocaleTimeString()`
  directly, bypassing both shared formatters -- those still render in the
  viewer's browser-local timezone rather than the fixed org timezone.
  Functionally harmless today (everyone using the app is in Saskatchewan
  already), but not yet hardened the way `MobileTaskWorkspace.tsx`/
  `TaskReviewDialog.tsx` were. Worth a dedicated pass if/when it matters.
- Verified: `formatTimeInOrgTz` on the real session-start timestamp
  `2026-08-07T22:56:00.555+00:00` returns `4:56 PM`, matching what the
  live UI already showed for that exact session earlier this session --
  confirms the conversion direction (UTC → Regina, UTC-6) is correct, not
  just accidentally correct because the tester's browser happened to
  already be in that timezone.
- `npm run build` passes. No migration -- display-only.

## Due-date off-by-one, round 2: the Phases tab was missed — August 8, 2026

- **The user caught this live in production**: due dates set to the 8th
  and 10th were still displaying as the 7th and 9th on the Phases tab
  (`PhaseView.tsx`'s per-phase task rows), even after the `lib/dates.ts`
  fix earlier the same day. Root cause: that first pass fixed every call
  site that already went through the shared `formatDate` from
  `lib/dates.ts`, but `PhaseView.tsx` had its own independent
  `new Date(task.dueDate).toLocaleDateString(...)` calls that never routed
  through the shared formatter at all -- same bug, different code path,
  simply not caught by grepping for `formatDate(` usages.
- **This time, swept the whole codebase for the actual bug pattern**
  (`new Date(<calendar-date-field>).toLocaleDateString(...)`) instead of
  trusting that "fixed the shared utility" meant "fixed everywhere."
  Found and fixed five more real instances, all confirmed via a live
  database read against real Scarth Street tasks (`Site Cleanup`,
  `Remove Existing Drywall Partitions` = `2026-08-08`;
  `Protect Finished Millwork`, `Remove Steel Stud Framing` = `2026-08-10`)
  matching exactly what the user reported:
  - `PhaseView.tsx` (2 call sites: the undated-task-move toast, and the
    per-task-row due date pill -- this was the one in the user's
    screenshot)
  - `MobileTaskDashboard.tsx` (3 call sites: "To assign" queue row,
    expanded "Your tasks" row, Supervisor Queue row)
  - `QCReviewQueue.tsx` (task list due date)
  - `TaskGanttChart.tsx` (3 toast messages after drag-to-reschedule --
    `newStart`/`newDue` are computed by this file's own UTC-safe
    `addDays()` helper as a plain `YYYY-MM-DD` string, but were then
    formatted with plain `new Date(str).toLocaleDateString()`, which
    treats a bare date string as UTC midnight and hits the exact same bug
    -- confirms the "already fixed for Gantt" note from earlier work
    (`20240026`-era) was incomplete)
  - `TaskRatingDialog.tsx` (`task.completedDate`, a `date`-typed Postgres
    column with the same UTC-midnight serialization as due dates -- this
    file already imported `formatDate` for its due-date line but had a
    second, un-migrated `completedDate` line right next to it)
  - `RecentTasksWidget.tsx`, `ClientDetailsDialog.tsx`, `ProjectManagement.tsx`,
    `TaskKanban.tsx`, `TaskManagement.tsx`, `Dashboard.tsx` were already
    correct from the first pass (they used the shared `formatDate`).
  - Added `formatDateShort` to `lib/dates.ts` (same digit-extraction fix,
    no year -- e.g. "Aug 8") alongside the existing `formatDate`, since
    several of these call sites specifically needed the no-year short
    form and were previously getting it from the broken
    `toLocaleDateString(undefined, { month: "short", day: "numeric" })`
    pattern. Refactored both to share one `toLocalCalendarDate` helper so
    there's a single place doing the digit extraction.
  - **Not touched, lower-priority / different field semantics, flagged for
    a future pass if it comes up**: `InventoryDetailView.tsx`
    (`lastRestocked`), `ProjectPurchasesView.tsx` (`purchaseDate`),
    `TeamProductivityReport.tsx` (`weekStart`), `RatingHistoryDialog.tsx`
    (`ratedAt` -- likely a real instant, not a calendar date, so probably
    not actually buggy), `PhaseQCReviewDialog.tsx` (`reviewedAt`/
    `submittedAt` -- same reasoning, real instants).
- Verified via direct function calls against the real due-date values
  pulled from the database (not a UI screenshot, since the Browser pane's
  screenshot tool was intermittently stale/cached this session):
  `formatDateShort('2026-08-08T00:00:00+00:00')` → `"Aug 8"`,
  `formatDateShort('2026-08-10T00:00:00+00:00')` → `"Aug 10"`. Both
  correct, both feeding directly into the exact line `PhaseView.tsx` now
  calls.
- `npm run build` passes. No migration -- display-only.
- **Lesson for next time a shared-utility date/time fix is made**: grep
  for the actual buggy *pattern* (`new Date(...).toLocaleDateString`/
  `toLocaleString`/`toLocaleTimeString` on a calendar-date field) across
  every component file, not just for existing imports of the utility
  being fixed -- a shared formatter only protects the call sites that
  already use it.

## Phases-tab reordering: allow moving tasks within the same due date — August 8, 2026

- Per explicit user feedback: the earlier "date always pins a task, only
  undated tasks are draggable" rule (from the August 6 task-ordering work)
  was too strict. A due date should still win *between* different days
  (it drives the Gantt chart), but two or three tasks due on the exact
  same day are a tie today, broken by an arbitrary `sequence` value --
  the user needs to actually control that tie, e.g. "do the drywall
  removal before site cleanup, both due the 8th."
- `sortTasksByPhase` (`lib/taskOrder.ts`) already fell through to
  `sequence` as a tiebreaker whenever two tasks' due dates were equal (or
  both null) -- no change needed there. The restriction was purely in
  `PhaseView.tsx`'s reorder UI, which only ever built a movable group out
  of undated tasks.
- `PhaseView.tsx` now groups the phase's tasks by due date (`YYYY-MM-DD`,
  or `"__undated__"`) and only allows moving a task up/down within its own
  group -- `reorderPhaseTasks` (unchanged; it just sets
  `sequence = index` for whatever ordered id list it's given) is called
  with that group's ids only, since `sequence` is only ever compared
  between tasks sharing the same date within the same phase. A task that's
  the only one on its day (or the only undated one) still shows disabled
  chevrons with an explanatory click-toast, since there's nothing to
  reorder it against.
- Updated the header hint from "Use ▲▼ to reorder undated tasks" to "Use
  ▲▼ to reorder tasks due the same day" and its visibility check
  (previously "any undated task exists," now "any group has more than one
  task").
- Verified live on Scarth Street's real Demolition phase (3 tasks due
  Aug 8, 2 due Aug 10): move up/down correctly enabled/disabled exactly at
  each date-group's boundary (confirmed via each row's actual button
  `disabled` state, not just visual inspection), and clicking "Move down"
  on the first Aug-8 task actually swapped `sequence` with the next Aug-8
  task in the database (`0`/`1`/`2` after, previously all `null`) while
  leaving the Aug-10 pair and every other date boundary untouched.
- `npm run build` passes. No migration -- reuses the existing `sequence`
  column and `reorderPhaseTasks` RPC path from the August 6 work.
- Unrelated tooling note for future sessions: this session's Browser pane
  had two separate quirks fighting verification -- screenshots were
  intermittently stale/frozen (not reflecting real DOM state; confirmed by
  comparing `document.elementFromPoint()` against what a screenshot showed
  at the same coordinates), and this app's Radix `Tabs` triggers did not
  respond to `.click()` or a full synthetic pointer-event sequence, only
  to `.focus()` followed by a dispatched `Enter` keydown. Worth trying the
  focus+Enter approach first next time a Radix tab won't switch via click.
