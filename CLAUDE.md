# Cstle Livn Web App — Project Handoff

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
- **Roles today**: Super Admin, Admin, Manager, Accountant, Quality
  Control, Contractor, Associate, Supervisor. Supervisor is scoped to
  `projects.supervisor_id` (see `20240026`) — real QC/edit authority, but
  only on the project(s) they supervise, not company-wide. Manager is
  company-wide by explicit product decision (regional/area-scoped Manager
  was discussed and deliberately deferred, not built).
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
