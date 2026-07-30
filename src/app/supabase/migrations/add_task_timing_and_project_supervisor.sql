-- Task timing: started_at (first move to In Progress), submitted_at (moved
-- to Pending QC). completed_date already exists and is set on QC approval --
-- treated as the "approved/completed" timestamp.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- Project supervisor: the person who is the default assignee for new tasks
-- in this project and the QC reviewer notified when work in this project
-- needs review. References team_members, not auth.users directly, matching
-- how tasks.assignee_id already works.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.team_members(id);
