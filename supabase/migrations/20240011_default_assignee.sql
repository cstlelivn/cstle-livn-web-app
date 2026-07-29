-- =============================================================================
-- Every task must have an assignee. Link the current user's team roster entry
-- to her login account (the "wrinkle" from the templates/permissions plan --
-- ownership checks need this link to work at all), then back-fill every
-- existing unassigned task to her. New tasks default the same way at the
-- application layer (see addTask in AppContext.tsx and applyTemplateToProject).
-- =============================================================================

UPDATE public.team_members
SET auth_user_id = 'ab630122-d31f-48de-90f3-1c5fcbea97c6'
WHERE id = '1d58852a-e427-47bf-9ffe-3db23eace781'
  AND auth_user_id IS NULL;

UPDATE public.tasks
SET assignee_id = '1d58852a-e427-47bf-9ffe-3db23eace781'
WHERE assignee_id IS NULL;
