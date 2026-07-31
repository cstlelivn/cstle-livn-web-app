-- Self-service "decline" for an assigned task.
--
-- unassign_task_member (20240016) is manager/admin-only by design -- it's the
-- correction tool for someone else reassigning work. But the new mobile
-- dashboard's task queue needs a Decline action an Associate can use on their
-- OWN pending assignment (e.g. "I can't get to this today"), which the
-- existing RPC deliberately does not allow. Rather than loosen that RPC's
-- permission check (which would let anyone unassign anyone), this adds a
-- narrowly-scoped sibling that only ever touches the CALLER's own row.
alter table public.task_assignees
  add column if not exists decline_reason text;

create or replace function public.decline_task_assignment(p_task_id uuid, p_reason text default null)
returns public.task_assignees
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_member_id uuid;
  v_row public.task_assignees;
  v_open_session public.task_work_sessions;
  v_last_event_at timestamptz;
  v_elapsed integer;
begin
  v_member_id := public.current_team_member_id();
  if v_member_id is null then
    raise exception 'NOT_A_TEAM_MEMBER: no team_members row for this account' using errcode = 'P0001';
  end if;

  update public.task_assignees
  set is_active = false, unassigned_at = now(), decline_reason = p_reason
  where task_id = p_task_id and team_member_id = v_member_id and is_active
  returning * into v_row;

  if v_row.id is null then
    raise exception 'NOT_ASSIGNED: you are not currently assigned to this task' using errcode = 'P0001';
  end if;

  -- Same auto-finalize as unassign_task_member -- a declined task shouldn't
  -- leave a dangling running/paused session behind.
  for v_open_session in
    select * from public.task_work_sessions
    where task_id = p_task_id and team_member_id = v_member_id and status <> 'finished'
    for update
  loop
    v_elapsed := 0;
    if v_open_session.status = 'running' then
      select event_at into v_last_event_at from public.task_work_session_events
      where session_id = v_open_session.id and event_type in ('start', 'resume')
      order by event_at desc limit 1;
      v_elapsed := greatest(0, extract(epoch from (now() - coalesce(v_last_event_at, now())))::integer);
    end if;

    update public.task_work_sessions
    set status = 'finished',
        finished_at = now(),
        active_seconds = active_seconds + v_elapsed,
        completion_status = 'Declined',
        updated_at = now()
    where id = v_open_session.id;

    insert into public.task_work_session_events (session_id, event_type, event_at, notes)
    values (v_open_session.id, 'finish', now(), coalesce('Declined: ' || p_reason, 'Declined'));
  end loop;

  return v_row;
end;
$$;

revoke all on function public.decline_task_assignment(uuid, text) from public, anon;
grant execute on function public.decline_task_assignment(uuid, text) to authenticated;
