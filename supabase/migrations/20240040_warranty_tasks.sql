-- Warranty/callback tasks: a narrow, audited carve-out in the closed-project
-- immutability rule from 20240033. A completed project stays a closed
-- record -- its real historical tasks remain fully read-only -- but a
-- warranty callback (e.g. a door adjustment discovered after handover)
-- needs to be trackable without reopening the project or corrupting its
-- closed numbers. A task flagged is_warranty is exempt from the closed-
-- project trigger both for creation and for ongoing status/assignment
-- changes; a task can only ever become a warranty task at INSERT time
-- (an UPDATE can never flip is_warranty from false to true), so this can't
-- be used to retroactively unlock an existing real task.

alter table public.tasks
  add column if not exists is_warranty boolean not null default false;

comment on column public.tasks.is_warranty is
  'True for a warranty/callback task added after the project closed. Exempt from closed-project immutability; can only be set at task creation, never toggled afterward.';

create or replace function public.reject_closed_project_task_mutation() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_status text; v_old_is_warranty boolean;
begin
  if tg_op = 'UPDATE' then
    select status into v_status from public.projects where id = old.project_id for key share;
    if v_status = 'Completed' and not old.is_warranty then
      raise exception 'PROJECT_CLOSED: tasks cannot be moved or changed after project completion' using errcode = 'P0001';
    end if;
    -- is_warranty itself can never be changed once set (or un-set) --
    -- otherwise a closed-project task could be "laundered" into an
    -- editable one, or a warranty task's audit trail obscured.
    if new.is_warranty is distinct from old.is_warranty then
      raise exception 'WARRANTY_FLAG_IMMUTABLE: is_warranty cannot be changed after creation' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'INSERT' and new.is_warranty then
    return new;
  end if;

  select status into v_status from public.projects where id = new.project_id for key share;
  if v_status = 'Completed' then
    raise exception 'PROJECT_CLOSED: tasks cannot be added or changed after project completion' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.reject_closed_project_assignment_mutation() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_status text; v_task_id uuid; v_is_warranty boolean;
begin
  v_task_id := case when tg_op = 'DELETE' then old.task_id else new.task_id end;
  select p.status, t.is_warranty into v_status, v_is_warranty
  from public.tasks t join public.projects p on p.id = t.project_id
  where t.id = v_task_id
  for key share of p;
  if v_status = 'Completed' and not coalesce(v_is_warranty, false) then
    raise exception 'PROJECT_CLOSED: task assignments cannot change after project completion' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
