-- One master, revisioned customer quote for every estimate. Public-facing
-- scope/prices and private cost/profit records are physically separated.

create table if not exists public.estimate_pricing_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  profile_type text not null check (profile_type in ('friends_family','residential','commercial','institutional','insurance','government','custom')),
  default_pricing_method text not null default 'cost_markup' check (default_pricing_method in ('cost_markup','rate_card','fixed_price','unit_price','retail','contractor_cost_markup','allowance','insurance_price_list','tender')),
  default_profit_markup_pct numeric(9,3) not null default 100,
  minimum_profit_markup_pct numeric(9,3) not null default 30,
  overhead_pct numeric(9,3) not null default 0,
  contingency_pct numeric(9,3) not null default 0,
  quote_valid_days integer not null default 30,
  deposit_pct numeric(5,2) not null default 30,
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.estimate_pricing_profiles(name,profile_type,default_pricing_method,default_profit_markup_pct,minimum_profit_markup_pct,settings)
values
 ('Friends & Family','friends_family','cost_markup',15,0,'{"description":"Deliberately reduced profit; verify all costs remain covered."}'),
 ('Standard Residential','residential','rate_card',100,30,'{"description":"Use CSTLE market rates and validate the resulting profit."}'),
 ('Commercial','commercial','cost_markup',100,30,'{"description":"Include coordination, administration, schedule and payment risk as real costs."}'),
 ('Institutional','institutional','cost_markup',125,30,'{"description":"Include documentation, safety, procurement and compliance costs."}'),
 ('Insurance Restoration','insurance','insurance_price_list',0,0,'{"description":"Use carrier-compatible line items, price-list metadata, depreciation and separate O&P."}'),
 ('Government / Tender','government','tender',0,0,'{"description":"Follow the solicitation basis of payment, required options, taxes and holdbacks."}'),
 ('Custom','custom','fixed_price',0,0,'{"description":"Estimator selects the pricing method and final price."}')
on conflict(name) do nothing;

create table if not exists public.estimate_quote_settings (
  estimate_id uuid primary key references public.estimates(id) on delete cascade,
  pricing_profile_id uuid references public.estimate_pricing_profiles(id),
  pricing_method text not null default 'cost_markup' check (pricing_method in ('cost_markup','rate_card','fixed_price','unit_price','retail','contractor_cost_markup','allowance','insurance_price_list','tender')),
  target_profit_markup_pct numeric(9,3) not null default 100,
  overhead_pct numeric(9,3) not null default 0,
  contingency_pct numeric(9,3) not null default 0,
  discount_cents integer not null default 0,
  tax_pct numeric(7,3) not null default 6,
  deposit_pct numeric(5,2) not null default 30,
  valid_days integer not null default 30,
  price_list_name text,
  price_list_effective_date date,
  insurance_overhead_pct numeric(7,3) not null default 0,
  insurance_profit_pct numeric(7,3) not null default 0,
  insurance_op_cumulative boolean not null default false,
  tender_basis text,
  internal_notes text,
  exclusions text,
  customer_terms text,
  updated_at timestamptz not null default now()
);

create table if not exists public.estimate_sections (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  title text not null,
  customer_description text,
  position integer not null default 0,
  source_type text not null default 'manual' check (source_type in ('manual','painting','insurance','template')),
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists estimate_sections_order on public.estimate_sections(estimate_id,position);

create table if not exists public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  section_id uuid not null references public.estimate_sections(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  customer_description text,
  quantity numeric(12,3) not null default 1,
  unit text not null default 'item',
  inclusion_type text not null default 'labour_materials' check (inclusion_type in ('labour_materials','labour_only','materials_only','subcontracted','allowance','included')),
  pricing_method text not null default 'fixed_price' check (pricing_method in ('cost_markup','rate_card','fixed_price','unit_price','retail','contractor_cost_markup','allowance','insurance_price_list','tender','included')),
  unit_price_cents integer not null default 0,
  selling_price_cents integer not null default 0,
  optional boolean not null default false,
  taxable boolean not null default true,
  selected_by_customer boolean not null default false,
  insurance_code text,
  allowance_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists estimate_line_items_order on public.estimate_line_items(estimate_id,section_id,position);

create table if not exists public.estimate_line_item_costs (
  line_item_id uuid primary key references public.estimate_line_items(id) on delete cascade,
  material_cost_cents integer not null default 0,
  labour_cost_cents integer not null default 0,
  labour_hours numeric(10,2),
  equipment_cost_cents integer not null default 0,
  subcontractor_cost_cents integer not null default 0,
  delivery_cost_cents integer not null default 0,
  disposal_cost_cents integer not null default 0,
  job_overhead_cents integer not null default 0,
  other_cost_cents integer not null default 0,
  supplier_price_id uuid,
  cost_notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_product_prices (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  manufacturer text,
  sku text,
  supplier_name text not null,
  container_size text,
  coverage_per_unit numeric(12,3),
  retail_price_cents integer,
  contractor_price_cents integer,
  sale_price_cents integer,
  delivery_cents integer not null default 0,
  tax_included boolean not null default false,
  effective_date date not null default current_date,
  expires_at date,
  source_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.estimate_line_item_costs add constraint estimate_line_cost_supplier_fk
  foreign key (supplier_price_id) references public.supplier_product_prices(id) on delete set null;

create table if not exists public.estimate_revisions (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  revision_no integer not null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','change_requested','superseded','expired')),
  customer_snapshot jsonb not null,
  internal_snapshot jsonb,
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null,
  deposit_cents integer not null default 0,
  public_token uuid not null default gen_random_uuid() unique,
  token_expires_at timestamptz,
  change_reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(estimate_id,revision_no)
);
create index if not exists estimate_revisions_latest on public.estimate_revisions(estimate_id,revision_no desc);

create table if not exists public.estimate_customer_responses (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.estimate_revisions(id) on delete restrict,
  response text not null check (response in ('accepted','declined','change_requested')),
  customer_name text not null,
  customer_comment text,
  accepted_terms boolean not null default false,
  selected_optional_item_ids uuid[] not null default '{}',
  accepted_total_cents integer,
  response_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.estimate_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.estimate_revisions(id) on delete cascade,
  recipient_email text not null,
  provider_message_id text,
  status text not null default 'sent',
  sent_by uuid references auth.users(id),
  sent_at timestamptz not null default now()
);

alter table public.estimate_pricing_profiles enable row level security;
alter table public.estimate_quote_settings enable row level security;
alter table public.estimate_sections enable row level security;
alter table public.estimate_line_items enable row level security;
alter table public.estimate_line_item_costs enable row level security;
alter table public.supplier_product_prices enable row level security;
alter table public.estimate_revisions enable row level security;
alter table public.estimate_customer_responses enable row level security;
alter table public.estimate_email_deliveries enable row level security;

create policy estimate_profiles_read on public.estimate_pricing_profiles for select using (public.can_view_estimating());
create policy estimate_profiles_manage on public.estimate_pricing_profiles for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy quote_settings_read on public.estimate_quote_settings for select using (public.can_view_estimating());
create policy quote_settings_write on public.estimate_quote_settings for all using (public.can_run_estimating()) with check (public.can_run_estimating());
create policy estimate_sections_read on public.estimate_sections for select using (public.can_view_estimating());
create policy estimate_sections_write on public.estimate_sections for all using (public.can_run_estimating()) with check (public.can_run_estimating());
create policy estimate_items_read on public.estimate_line_items for select using (public.can_view_estimating());
create policy estimate_items_write on public.estimate_line_items for all using (public.can_run_estimating()) with check (public.can_run_estimating());
create policy estimate_costs_private on public.estimate_line_item_costs for all using (public.can_view_estimating_margins()) with check (public.can_view_estimating_margins());
create policy supplier_prices_private on public.supplier_product_prices for all using (public.can_view_estimating_margins()) with check (public.can_view_estimating_margins());
create policy estimate_revisions_read on public.estimate_revisions for select using (public.can_view_estimating());
create policy estimate_revisions_write on public.estimate_revisions for all using (public.can_run_estimating()) with check (public.can_run_estimating());
create policy estimate_responses_read on public.estimate_customer_responses for select using (public.can_view_estimating());
create policy estimate_deliveries_read on public.estimate_email_deliveries for select using (public.can_view_estimating());
create policy estimate_deliveries_write on public.estimate_email_deliveries for insert with check (public.can_run_estimating());

create or replace function public.quote_builder_state(p_estimate_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select case when public.can_view_estimating() then jsonb_build_object(
    'settings',(select to_jsonb(s) from public.estimate_quote_settings s where s.estimate_id=p_estimate_id),
    'profiles',(select coalesce(jsonb_agg(to_jsonb(p) order by p.name),'[]'::jsonb) from public.estimate_pricing_profiles p where p.active),
    'sections',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'customer_description',s.customer_description,'position',s.position,'source_type',s.source_type,'items',
      (select coalesce(jsonb_agg(to_jsonb(i) order by i.position),'[]'::jsonb) from public.estimate_line_items i where i.section_id=s.id)) order by s.position),'[]'::jsonb)
      from public.estimate_sections s where s.estimate_id=p_estimate_id),
    'costs',case when public.can_view_estimating_margins() then (select coalesce(jsonb_object_agg(c.line_item_id,to_jsonb(c)),'{}'::jsonb) from public.estimate_line_item_costs c join public.estimate_line_items i on i.id=c.line_item_id where i.estimate_id=p_estimate_id) else null end
  ) else null end
$$;
grant execute on function public.quote_builder_state(uuid) to authenticated;

comment on table public.estimate_line_item_costs is 'Private CSTLE cost and labour basis. Never expose in customer snapshots or public endpoints.';
comment on table public.estimate_revisions is 'Immutable sent quote versions. Customer snapshot must contain customer-safe fields only.';

create or replace function public.seed_painting_quote(p_estimate_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_paint public.painting_estimates%rowtype; v_section uuid; v_cost integer:=0;
begin
  if not public.can_run_estimating() then raise exception 'Estimating permission required'; end if;
  select * into v_paint from public.painting_estimates where estimate_id=p_estimate_id;
  if v_paint is null then raise exception 'No painting estimate has been saved'; end if;
  select id into v_section from public.estimate_sections where estimate_id=p_estimate_id and source_type='painting' limit 1;
  if v_section is null then
    insert into public.estimate_sections(estimate_id,title,customer_description,position,source_type,source_id)
    values(p_estimate_id,'Painting','Preparation, protection and painting of the listed areas.',0,'painting',p_estimate_id)
    returning id into v_section;
  end if;
  if not exists(select 1 from public.estimate_line_items where section_id=v_section) then
    insert into public.estimate_line_items(estimate_id,section_id,position,title,customer_description,quantity,unit,inclusion_type,pricing_method,unit_price_cents,selling_price_cents)
    values(p_estimate_id,v_section,0,'Painting scope',
      (select string_agg(format('%s — %s coat%s%s%s',a->>'name',a->>'coats',case when (a->>'coats')::int=1 then '' else 's' end,case when coalesce((a->>'walls')::boolean,false) then ', walls' else '' end,case when coalesce((a->>'ceiling')::boolean,false) then ', ceiling' else '' end),E'\n') from jsonb_array_elements(v_paint.customer_scope->'areas') a),
      1,'project','labour_materials','rate_card',v_paint.customer_subtotal_cents-v_paint.discount_cents,v_paint.customer_subtotal_cents-v_paint.discount_cents);
  end if;
  if public.can_view_estimating_margins() then
    select coalesce((calculation_snapshot->>'estimatedCostCents')::integer,0) into v_cost from public.painting_estimate_financials where estimate_id=p_estimate_id;
    insert into public.estimate_line_item_costs(line_item_id,material_cost_cents,labour_cost_cents,cost_notes)
    select id,0,v_cost,'Imported from the private painting profitability snapshot' from public.estimate_line_items where section_id=v_section
    on conflict(line_item_id) do nothing;
  end if;
  insert into public.estimate_quote_settings(estimate_id,pricing_method,target_profit_markup_pct,tax_pct,deposit_pct,valid_days)
  values(p_estimate_id,'rate_card',100,6,30,30) on conflict(estimate_id) do nothing;
end $$;
grant execute on function public.seed_painting_quote(uuid) to authenticated;

create or replace function public.create_quote_revision(p_estimate_id uuid,p_change_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_settings public.estimate_quote_settings%rowtype; v_revision integer; v_id uuid; v_subtotal integer; v_taxable integer; v_tax integer; v_total integer; v_deposit integer; v_customer jsonb; v_internal jsonb;
begin
  if not public.can_run_estimating() then raise exception 'Estimating permission required'; end if;
  select * into v_settings from public.estimate_quote_settings where estimate_id=p_estimate_id;
  if v_settings is null then raise exception 'Quote settings are missing'; end if;
  if not exists(select 1 from public.estimate_line_items where estimate_id=p_estimate_id) then raise exception 'Add at least one line item'; end if;
  if exists(select 1 from public.estimate_line_items where estimate_id=p_estimate_id and inclusion_type<>'included' and selling_price_cents<=0) then raise exception 'Every priced line item needs a selling price'; end if;
  select coalesce(sum(selling_price_cents) filter(where not optional),0),coalesce(sum(selling_price_cents) filter(where not optional and taxable),0)
    into v_subtotal,v_taxable from public.estimate_line_items where estimate_id=p_estimate_id;
  v_subtotal:=greatest(0,v_subtotal-v_settings.discount_cents); v_tax:=round(v_taxable*v_settings.tax_pct/100.0); v_total:=v_subtotal+v_tax; v_deposit:=round(v_total*v_settings.deposit_pct/100.0);
  select coalesce(max(revision_no),0)+1 into v_revision from public.estimate_revisions where estimate_id=p_estimate_id;
  select jsonb_build_object('estimate',(select jsonb_build_object('id',e.id,'name',e.name,'site_address',e.site_address,'terms',coalesce(v_settings.customer_terms,e.estimate_terms),'valid_days',v_settings.valid_days,'exclusions',v_settings.exclusions) from public.estimates e where e.id=p_estimate_id),'sections',
    (select jsonb_agg(jsonb_build_object('title',s.title,'description',s.customer_description,'items',(select jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'description',i.customer_description,'quantity',i.quantity,'unit',i.unit,'inclusion_type',i.inclusion_type,'unit_price_cents',i.unit_price_cents,'selling_price_cents',i.selling_price_cents,'optional',i.optional,'taxable',i.taxable,'allowance_note',i.allowance_note) order by i.position) from public.estimate_line_items i where i.section_id=s.id)) order by s.position) from public.estimate_sections s where s.estimate_id=p_estimate_id),
    'subtotal_cents',v_subtotal,'discount_cents',v_settings.discount_cents,'tax_cents',v_tax,'total_cents',v_total,'deposit_cents',v_deposit,'tax_pct',v_settings.tax_pct)
    into v_customer;
  if public.can_view_estimating_margins() then
    select jsonb_build_object('settings',to_jsonb(v_settings),'costs',coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb)) into v_internal
    from public.estimate_line_item_costs c join public.estimate_line_items i on i.id=c.line_item_id where i.estimate_id=p_estimate_id;
  end if;
  update public.estimate_revisions set status='superseded' where estimate_id=p_estimate_id and status='draft';
  insert into public.estimate_revisions(estimate_id,revision_no,status,customer_snapshot,internal_snapshot,subtotal_cents,discount_cents,tax_cents,total_cents,deposit_cents,token_expires_at,change_reason,created_by)
  values(p_estimate_id,v_revision,'draft',v_customer,v_internal,v_subtotal,v_settings.discount_cents,v_tax,v_total,v_deposit,now()+(v_settings.valid_days||' days')::interval,p_change_reason,auth.uid()) returning id into v_id;
  return v_id;
end $$;
grant execute on function public.create_quote_revision(uuid,text) to authenticated;

create table if not exists public.estimate_invoice_drafts (
 id uuid primary key default gen_random_uuid(), estimate_id uuid not null references public.estimates(id) on delete restrict,
 revision_id uuid not null references public.estimate_revisions(id) on delete restrict, project_id uuid references public.projects(id) on delete set null,
 invoice_type text not null default 'deposit' check(invoice_type in('deposit','progress','milestone','change_order','final')),
 amount_cents integer not null, tax_cents integer not null default 0, status text not null default 'draft' check(status in('draft','sent','paid','void')),
 due_date date, line_items jsonb not null default '[]', created_at timestamptz not null default now(), unique(revision_id,invoice_type)
);
alter table public.estimate_invoice_drafts enable row level security;
create policy estimate_invoice_drafts_private on public.estimate_invoice_drafts for all using(public.can_view_finance()) with check(public.can_view_finance());

create or replace function public.convert_accepted_quote_to_project(p_estimate_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare e public.estimates%rowtype;r public.estimate_revisions%rowtype;v_project uuid;v_phase uuid;s record;i record;seq integer:=0;v_accepted_total integer;
begin
 if not public.can_run_estimating() then raise exception 'Estimating permission required';end if;
 select * into e from public.estimates where id=p_estimate_id;if e.converted_project_id is not null then return e.converted_project_id;end if;
 select * into r from public.estimate_revisions where estimate_id=p_estimate_id and status='accepted' order by revision_no desc limit 1;
 if r is null then raise exception 'The customer must accept the current quote before project conversion';end if;
 select coalesce(accepted_total_cents,r.total_cents) into v_accepted_total from public.estimate_customer_responses where revision_id=r.id and response='accepted' order by created_at desc limit 1;
 insert into public.projects(title,client,location,budget,status,description,phase) values(e.name,e.client_id,e.site_address,v_accepted_total/100.0,'Planning',e.scope_of_work,'Approved Estimate') returning id into v_project;
 for s in select * from public.estimate_sections where estimate_id=p_estimate_id order by position loop
  insert into public.project_phases(project_id,name,position,status) values(v_project,s.title,s.position,'Not Started') returning id into v_phase;
  for i in select * from public.estimate_line_items where section_id=s.id and(not optional or selected_by_customer) order by position loop
   insert into public.tasks(project_id,phase_id,title,description,status,priority,sequence) values(v_project,v_phase,i.title,i.customer_description,'To Do','Medium',seq);seq:=seq+1;
  end loop;
 end loop;
 update public.estimates set converted_project_id=v_project,status='converted' where id=p_estimate_id;
 insert into public.estimate_invoice_drafts(estimate_id,revision_id,project_id,invoice_type,amount_cents,due_date,line_items)
 values(p_estimate_id,r.id,v_project,'deposit',r.deposit_cents,current_date+7,jsonb_build_array(jsonb_build_object('description','Deposit for accepted estimate','amount_cents',r.deposit_cents))) on conflict(revision_id,invoice_type) do nothing;
 return v_project;
end $$;
grant execute on function public.convert_accepted_quote_to_project(uuid) to authenticated;
