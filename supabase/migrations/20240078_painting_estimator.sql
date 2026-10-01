-- Painting estimates are deliberately split into customer-safe scope/pricing
-- and Super-Admin-only cost/profitability records.

alter table public.estimates
  add column if not exists estimate_type text not null default 'general'
  check (estimate_type in ('general','painting'));

create table if not exists public.painting_rate_card_versions (
  id uuid primary key default gen_random_uuid(),
  version_no integer not null unique,
  active boolean not null default false,
  effective_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  change_note text,
  customer_rates jsonb not null,
  primer_rates jsonb not null,
  door_rates jsonb not null,
  height_multipliers jsonb not null,
  condition_pricing jsonb not null default '{}'::jsonb,
  material_settings jsonb not null,
  internal_cost_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists painting_rate_card_one_active
  on public.painting_rate_card_versions ((active)) where active;

create table if not exists public.painting_estimates (
  estimate_id uuid primary key references public.estimates(id) on delete cascade,
  rate_card_version_id uuid not null references public.painting_rate_card_versions(id),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  discount_percent numeric(7,3) not null default 0 check (discount_percent >= 0),
  customer_subtotal_cents integer not null default 0,
  customer_tax_cents integer not null default 0,
  customer_total_cents integer not null default 0,
  customer_scope jsonb not null default '{}'::jsonb,
  owner_margin_override boolean not null default false,
  owner_override_reason text,
  owner_override_by uuid references auth.users(id),
  owner_override_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.painting_areas (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  position integer not null default 0,
  name text not null,
  floor_sqft numeric(10,2) not null default 0 check (floor_sqft >= 0),
  ceiling_height_ft numeric(6,2) not null default 8 check (ceiling_height_ft > 0),
  coats integer not null default 2 check (coats between 1 and 6),
  colour_change text not null default 'similar' check (colour_change in ('same','similar','significant')),
  existing_colour text,
  new_colour text,
  walls_included boolean not null default true,
  ceiling_included boolean not null default false,
  primer_type text not null default 'none' check (primer_type in ('none','spot','full_walls','full_room','ceiling','stain_blocking')),
  baseboards_included boolean not null default false,
  baseboard_linear_ft numeric(10,2) not null default 0,
  casing_included boolean not null default false,
  casing_linear_ft numeric(10,2) not null default 0,
  interior_doors integer not null default 0,
  closets integer not null default 0,
  prep_level integer not null default 1 check (prep_level between 0 and 3),
  door_details jsonb not null default '{"method":"brush_roll","sides":2,"location":"on_site","prep_level":1,"sanding":true,"priming":false,"finish_coats":2}'::jsonb,
  site_conditions jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists painting_areas_estimate_position on public.painting_areas(estimate_id, position);

create table if not exists public.painting_repairs (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.painting_areas(id) on delete cascade,
  category text not null check (category in ('minor','medium','large','water_stain','corner','custom')),
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer,
  notes text,
  estimate_media_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.painting_material_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  area_id uuid references public.painting_areas(id) on delete cascade,
  category text not null,
  product_name text,
  coverage_per_unit numeric(12,3),
  container_size text,
  required_quantity numeric(12,3) not null default 0,
  purchased_quantity numeric(12,3) not null default 0,
  unused_for_customer numeric(12,3) not null default 0,
  supplier_unit_cost_cents integer not null default 0,
  customer_pricing_policy text not null default 'purchased' check (customer_pricing_policy in ('required','purchased','manual')),
  customer_charge_cents integer,
  notes text
);

create table if not exists public.painting_estimate_financials (
  estimate_id uuid primary key references public.estimates(id) on delete cascade,
  rate_card_version_id uuid not null references public.painting_rate_card_versions(id),
  direct_labour_cents integer not null default 0,
  materials_cents integer not null default 0,
  consumables_cents integer not null default 0,
  equipment_cents integer not null default 0,
  subcontractors_cents integer not null default 0,
  transportation_cents integer not null default 0,
  other_direct_cost_cents integer not null default 0,
  overhead_cents integer not null default 0,
  estimated_hours numeric(10,2),
  affordable_hours_at_target numeric(10,2),
  calculation_snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.audit_painting_margin_override()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.owner_margin_override then
    if not public.is_super_admin() then raise exception 'Owner-level permission required for a margin override'; end if;
    if nullif(btrim(new.owner_override_reason),'') is null then raise exception 'A reason is required for a margin override'; end if;
    new.owner_override_by := auth.uid();
    new.owner_override_at := coalesce(new.owner_override_at,now());
  else
    new.owner_override_reason := null; new.owner_override_by := null; new.owner_override_at := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_audit_painting_margin_override on public.painting_estimates;
create trigger trg_audit_painting_margin_override before insert or update of owner_margin_override,owner_override_reason
  on public.painting_estimates for each row execute function public.audit_painting_margin_override();

alter table public.painting_rate_card_versions enable row level security;
alter table public.painting_estimates enable row level security;
alter table public.painting_areas enable row level security;
alter table public.painting_repairs enable row level security;
alter table public.painting_material_items enable row level security;
alter table public.painting_estimate_financials enable row level security;

drop policy if exists painting_rate_card_super_admin on public.painting_rate_card_versions;
create policy painting_rate_card_super_admin on public.painting_rate_card_versions for all
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists painting_estimates_operator on public.painting_estimates;
drop policy if exists painting_estimates_select on public.painting_estimates;
drop policy if exists painting_estimates_write on public.painting_estimates;
create policy painting_estimates_select on public.painting_estimates for select using (public.can_view_estimating());
create policy painting_estimates_write on public.painting_estimates for all using (public.can_run_estimating()) with check (public.can_run_estimating());
drop policy if exists painting_areas_operator on public.painting_areas;
drop policy if exists painting_areas_select on public.painting_areas;
drop policy if exists painting_areas_write on public.painting_areas;
create policy painting_areas_select on public.painting_areas for select using (public.can_view_estimating());
create policy painting_areas_write on public.painting_areas for all using (public.can_run_estimating()) with check (public.can_run_estimating());
drop policy if exists painting_repairs_operator on public.painting_repairs;
drop policy if exists painting_repairs_select on public.painting_repairs;
drop policy if exists painting_repairs_write on public.painting_repairs;
create policy painting_repairs_select on public.painting_repairs for select using (public.can_view_estimating());
create policy painting_repairs_write on public.painting_repairs for all using (public.can_run_estimating()) with check (public.can_run_estimating());
drop policy if exists painting_materials_operator on public.painting_material_items;
drop policy if exists painting_materials_select on public.painting_material_items;
drop policy if exists painting_materials_write on public.painting_material_items;
create policy painting_materials_select on public.painting_material_items for select using (public.can_view_estimating());
create policy painting_materials_write on public.painting_material_items for all using (public.can_run_estimating()) with check (public.can_run_estimating());
drop policy if exists painting_financials_super_admin on public.painting_estimate_financials;
create policy painting_financials_super_admin on public.painting_estimate_financials for all
  using (public.can_view_estimating_margins()) with check (public.can_view_estimating_margins());

create or replace function public.get_active_painting_rate_card()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'id', id, 'version_no', version_no, 'effective_at', effective_at,
    'customer_rates', customer_rates, 'primer_rates', primer_rates,
    'door_rates', door_rates, 'height_multipliers', height_multipliers,
    'condition_pricing', condition_pricing, 'material_settings',
    material_settings - 'supplier_costs'
  ) from public.painting_rate_card_versions where active and public.can_view_estimating() limit 1
$$;
grant execute on function public.get_active_painting_rate_card() to authenticated;

create or replace function public.create_painting_rate_card_version(p_config jsonb, p_change_note text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_version integer;
begin
  if not public.is_super_admin() then raise exception 'Super Admin permission required'; end if;
  select coalesce(max(version_no),0)+1 into v_version from public.painting_rate_card_versions;
  update public.painting_rate_card_versions set active=false where active;
  insert into public.painting_rate_card_versions(
    version_no,active,created_by,change_note,customer_rates,primer_rates,door_rates,
    height_multipliers,condition_pricing,material_settings,internal_cost_settings
  ) values (
    v_version,true,auth.uid(),p_change_note,p_config->'customer_rates',p_config->'primer_rates',
    p_config->'door_rates',p_config->'height_multipliers',coalesce(p_config->'condition_pricing','{}'::jsonb),
    p_config->'material_settings',coalesce(p_config->'internal_cost_settings','{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end $$;
grant execute on function public.create_painting_rate_card_version(jsonb,text) to authenticated;

insert into public.painting_rate_card_versions(
  version_no,active,change_note,customer_rates,primer_rates,door_rates,height_multipliers,
  condition_pricing,material_settings,internal_cost_settings
)
select 1,true,'Initial CSTLE painting rate card',
  '{"walls_1_same":150,"walls_2_similar":225,"walls_2_change":275,"ceiling":75,"trim_linear":150,"door_conventional":10000,"medium_patch":3000,"large_patch":7500,"minimum_project":50000,"tax_percent":6}'::jsonb,
  '{"none":0,"spot":0,"full_walls":50,"full_room":65,"ceiling":45,"stain_blocking":85}'::jsonb,
  '{"brush_roll":10000,"spray_on_site":15000,"spray_off_site":17500,"frame_jamb":5000,"closet":8500,"exterior":17500}'::jsonb,
  '{"8":1,"9":1,"10":1.12,"12":1.30}'::jsonb,
  '{}'::jsonb,
  '{"wall_surface_factor":2.5,"coverage_sqft_per_gallon":350,"waste_percent":10,"container_gallons":[1,5],"supplier_costs":{}}'::jsonb,
  '{"painter_hourly_cents":null,"helper_hourly_cents":null,"payroll_burden_percent":0,"painter_count":1,"helper_count":0,"production_rates":{},"setup_hours":0,"cleanup_hours":0,"travel_hours":0,"overhead_percent":0,"target_margin_percent":50,"minimum_margin_percent":30}'::jsonb
where not exists (select 1 from public.painting_rate_card_versions);

create or replace function public.initialize_painting_estimate(p_estimate_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_card uuid;
begin
  if not public.can_run_estimating() then raise exception 'Estimating permission required'; end if;
  select id into v_card from public.painting_rate_card_versions where active limit 1;
  if v_card is null then raise exception 'No active painting rate card'; end if;
  update public.estimates set estimate_type='painting' where id=p_estimate_id;
  insert into public.painting_estimates(estimate_id,rate_card_version_id)
    values(p_estimate_id,v_card) on conflict(estimate_id) do nothing;
  return v_card;
end $$;
grant execute on function public.initialize_painting_estimate(uuid) to authenticated;

comment on table public.painting_estimate_financials is 'Internal CSTLE cost/profitability only; never use in customer output.';
