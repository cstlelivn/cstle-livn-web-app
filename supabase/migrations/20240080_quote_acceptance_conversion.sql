alter table public.estimate_customer_responses add column if not exists accepted_total_cents integer;
create table if not exists public.estimate_invoice_drafts (
 id uuid primary key default gen_random_uuid(),estimate_id uuid not null references public.estimates(id) on delete restrict,revision_id uuid not null references public.estimate_revisions(id) on delete restrict,project_id uuid references public.projects(id) on delete set null,
 invoice_type text not null default 'deposit' check(invoice_type in('deposit','progress','milestone','change_order','final')),amount_cents integer not null,tax_cents integer not null default 0,status text not null default 'draft' check(status in('draft','sent','paid','void')),due_date date,line_items jsonb not null default '[]',created_at timestamptz not null default now(),unique(revision_id,invoice_type));
alter table public.estimate_invoice_drafts enable row level security;
drop policy if exists estimate_invoice_drafts_private on public.estimate_invoice_drafts;
create policy estimate_invoice_drafts_private on public.estimate_invoice_drafts for all using(public.can_view_finance()) with check(public.can_view_finance());
create or replace function public.convert_accepted_quote_to_project(p_estimate_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare e public.estimates%rowtype;r public.estimate_revisions%rowtype;v_project uuid;v_phase uuid;s record;i record;seq integer:=0;v_total integer;
begin
 if not public.can_run_estimating() then raise exception 'Estimating permission required';end if;select * into e from public.estimates where id=p_estimate_id;if e.converted_project_id is not null then return e.converted_project_id;end if;
 select * into r from public.estimate_revisions where estimate_id=p_estimate_id and status='accepted' order by revision_no desc limit 1;if r is null then raise exception 'The customer must accept the current quote before project conversion';end if;
 select coalesce(accepted_total_cents,r.total_cents) into v_total from public.estimate_customer_responses where revision_id=r.id and response='accepted' order by created_at desc limit 1;
 insert into public.projects(title,client,location,budget,status,description,phase) values(e.name,e.client_id,e.site_address,v_total/100.0,'Planning',e.scope_of_work,'Approved Estimate') returning id into v_project;
 for s in select * from public.estimate_sections where estimate_id=p_estimate_id order by position loop insert into public.project_phases(project_id,name,position,status) values(v_project,s.title,s.position,'Not Started') returning id into v_phase;for i in select * from public.estimate_line_items where section_id=s.id and(not optional or selected_by_customer) order by position loop insert into public.tasks(project_id,phase_id,title,description,status,priority,sequence) values(v_project,v_phase,i.title,i.customer_description,'To Do','Medium',seq);seq:=seq+1;end loop;end loop;
 update public.estimates set converted_project_id=v_project,status='converted' where id=p_estimate_id;insert into public.estimate_invoice_drafts(estimate_id,revision_id,project_id,invoice_type,amount_cents,due_date,line_items) values(p_estimate_id,r.id,v_project,'deposit',r.deposit_cents,current_date+7,jsonb_build_array(jsonb_build_object('description','Deposit for accepted estimate','amount_cents',r.deposit_cents))) on conflict(revision_id,invoice_type) do nothing;return v_project;
end $$;
grant execute on function public.convert_accepted_quote_to_project(uuid) to authenticated;
