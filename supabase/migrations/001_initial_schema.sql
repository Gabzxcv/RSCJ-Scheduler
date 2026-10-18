-- RSCJ Scheduler transport schedule manager
-- Run this migration once in the Supabase SQL Editor or with Supabase CLI.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  role text not null default 'secretary' check (role in ('boss', 'secretary')),
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;
grant execute on function public.current_user_role() to authenticated;
revoke all on function public.current_user_role() from public, anon;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Public sign-ups receive no workspace profile and therefore cannot read business records.
  -- Invitations or accounts explicitly provisioned by an Auth admin are eligible.
  if new.invited_at is null and coalesce(new.raw_app_meta_data ->> 'role', '') not in ('boss', 'secretary') then
    return new;
  end if;
  insert into public.profiles(id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_app_meta_data ->> 'role' = 'boss' then 'boss' else 'secretary' end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null default '',
  email text not null default '',
  license_number text not null default '',
  license_expiry date,
  emergency_contact_name text not null default '',
  emergency_contact_phone text not null default '',
  employment_status text not null default 'active' check (employment_status in ('active', 'inactive')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  make_model text not null default '',
  plate_number text not null unique,
  capacity integer not null check (capacity > 0),
  service_status text not null default 'available' check (service_status in ('available', 'maintenance', 'out_of_service')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  client_name text not null default '',
  client_phone text not null default '',
  pickup_location text not null,
  destination text not null,
  starts_at timestamptz not null,
  estimated_return_at timestamptz not null,
  passenger_count integer not null default 1 check (passenger_count > 0),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes text not null default '',
  special_requirements text not null default '',
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (estimated_return_at > starts_at)
);

create table if not exists public.trip_drivers (
  trip_id uuid not null references public.trips(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  primary key (trip_id, driver_id)
);

create table if not exists public.driver_availability (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.trip_history (
  id bigint generated always as identity primary key,
  trip_id uuid not null,
  actor_id uuid not null references public.profiles(id),
  action text not null check (action in ('created', 'updated')),
  before_data jsonb,
  after_data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  singleton boolean primary key default true check (singleton),
  business_name text not null default 'RSCJ Transport',
  timezone text not null default 'Asia/Manila',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
insert into public.app_settings(singleton) values (true) on conflict do nothing;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reminders_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_profile_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_preferences(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_profile_created_preferences on public.profiles;
create trigger on_profile_created_preferences
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_preferences();
revoke all on function public.handle_new_profile_preferences() from public, anon, authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  kind text not null check (kind in ('reminder', 'assignment')),
  notification_key text unique,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
insert into public.notification_preferences(user_id)
  select id from public.profiles on conflict (user_id) do nothing;

create index if not exists trips_starts_at_idx on public.trips(starts_at);
create index if not exists trips_status_idx on public.trips(status);
create index if not exists trip_drivers_driver_id_idx on public.trip_drivers(driver_id);
create index if not exists driver_availability_range_idx on public.driver_availability(driver_id, starts_at, ends_at);
create index if not exists trip_history_trip_id_idx on public.trip_history(trip_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_drivers enable row level security;
alter table public.driver_availability enable row level security;
alter table public.trip_history enable row level security;
alter table public.app_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles readable by workspace" on public.profiles;
create policy "profiles readable by workspace" on public.profiles for select to authenticated
  using (public.current_user_role() in ('boss', 'secretary'));
drop policy if exists "boss updates profiles" on public.profiles;
create policy "boss updates profiles" on public.profiles for update to authenticated
  using (public.current_user_role() = 'boss') with check (public.current_user_role() = 'boss');

do $$
declare t text;
begin
  foreach t in array array['drivers','vehicles','trips','trip_drivers','driver_availability'] loop
    execute format('drop policy if exists "workspace manages %1$s" on public.%1$I', t);
    execute format('create policy "workspace manages %1$s" on public.%1$I for all to authenticated using (public.current_user_role() in (''boss'',''secretary'')) with check (public.current_user_role() in (''boss'',''secretary''))', t);
  end loop;
end $$;

drop policy if exists "workspace reads trip history" on public.trip_history;
create policy "workspace reads trip history" on public.trip_history for select to authenticated
  using (public.current_user_role() in ('boss', 'secretary'));
drop policy if exists "workspace reads settings" on public.app_settings;
create policy "workspace reads settings" on public.app_settings for select to authenticated
  using (public.current_user_role() in ('boss', 'secretary'));
drop policy if exists "boss updates settings" on public.app_settings;
create policy "boss updates settings" on public.app_settings for update to authenticated
  using (public.current_user_role() = 'boss') with check (public.current_user_role() = 'boss');
drop policy if exists "users read their notification preferences" on public.notification_preferences;
create policy "users read their notification preferences" on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "users update their notification preferences" on public.notification_preferences;
create policy "users update their notification preferences" on public.notification_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users read their notifications" on public.notifications;
create policy "users read their notifications" on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "users update their notifications" on public.notifications;
create policy "users update their notifications" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, update on public.profiles to authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.drivers, public.vehicles, public.driver_availability to authenticated;
grant select on public.trips, public.trip_drivers to authenticated;
grant select on public.trip_history, public.app_settings to authenticated;
grant update on public.app_settings to authenticated;
grant select, update on public.notification_preferences, public.notifications to authenticated;
grant usage, select on sequence public.trip_history_id_seq to authenticated;

create or replace function public.save_trip(p_trip_id uuid, p_trip jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := public.current_user_role();
  v_trip_id uuid := coalesce(p_trip_id, gen_random_uuid());
  v_vehicle_id uuid := (p_trip ->> 'vehicle_id')::uuid;
  v_start timestamptz := (p_trip ->> 'starts_at')::timestamptz;
  v_return timestamptz := (p_trip ->> 'estimated_return_at')::timestamptz;
  v_status text := coalesce(p_trip ->> 'status', 'scheduled');
  v_driver_ids uuid[];
  v_before jsonb;
  v_after jsonb;
  v_conflict record;
  v_vehicle_capacity integer;
  v_vehicle_status text;
  v_timezone text;
  v_passengers integer := coalesce((p_trip ->> 'passenger_count')::integer, 1);
  v_action text;
begin
  if v_actor is null or v_role not in ('boss', 'secretary') then
    raise exception 'Access denied.' using errcode = '42501';
  end if;
  select s.timezone into v_timezone from public.app_settings s where s.singleton = true;
  v_timezone := coalesce(v_timezone, 'Asia/Manila');
  if v_start is null or v_return is null or v_return <= v_start then
    raise exception 'Estimated return must be later than departure.' using errcode = '22023';
  end if;
  if nullif(trim(p_trip ->> 'pickup_location'), '') is null or nullif(trim(p_trip ->> 'destination'), '') is null then
    raise exception 'Pickup location and destination are required.' using errcode = '22023';
  end if;
  if v_status not in ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled') then
    raise exception 'Invalid trip status.' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct value::uuid), array[]::uuid[]) into v_driver_ids
    from jsonb_array_elements_text(coalesce(p_trip -> 'driver_ids', '[]'::jsonb)) as x(value);
  if cardinality(v_driver_ids) = 0 then
    raise exception 'Assign at least one driver.' using errcode = '22023';
  end if;

  select capacity, service_status into v_vehicle_capacity, v_vehicle_status from public.vehicles where id = v_vehicle_id;
  if not found then raise exception 'Choose a valid vehicle.' using errcode = '22023'; end if;
  if v_status in ('scheduled', 'confirmed', 'in_progress') and v_vehicle_status <> 'available' then raise exception 'This vehicle is marked for maintenance or out of service.' using errcode = '23514'; end if;
  if v_passengers > v_vehicle_capacity then raise exception 'Passenger count exceeds vehicle capacity.' using errcode = '23514'; end if;
  if (v_status in ('scheduled', 'confirmed', 'in_progress') and exists (
    select 1 from public.drivers d where d.id = any(v_driver_ids) and d.employment_status <> 'active'
  )) or (select count(*) from public.drivers d where d.id = any(v_driver_ids)) <> cardinality(v_driver_ids) then
    raise exception 'Choose active drivers only.' using errcode = '23514';
  end if;

  if p_trip_id is not null then
    select jsonb_build_object(
      'trip', to_jsonb(t),
      'drivers', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.full_name) order by d.full_name)
        from public.trip_drivers td join public.drivers d on d.id = td.driver_id where td.trip_id = t.id), '[]'::jsonb),
      'vehicle', (select jsonb_build_object('id', v.id, 'name', v.label, 'plate', v.plate_number) from public.vehicles v where v.id = t.vehicle_id)
    ) into v_before from public.trips t where t.id = p_trip_id for update;
    if v_before is null then raise exception 'Trip not found.' using errcode = 'P0002'; end if;
    v_action := 'updated';
  else
    v_action := 'created';
  end if;

  -- Serialize schedule writes so two simultaneous requests cannot both pass the conflict check.
  perform pg_catalog.pg_advisory_xact_lock(8675309);
  if v_status in ('scheduled', 'confirmed', 'in_progress') then
    select t.id, t.destination, t.starts_at into v_conflict
    from public.trips t
    left join public.trip_drivers td on td.trip_id = t.id
    where t.id <> v_trip_id
      and t.status in ('scheduled', 'confirmed', 'in_progress')
      and tstzrange(t.starts_at, t.estimated_return_at, '[)') && tstzrange(v_start, v_return, '[)')
      and (t.vehicle_id = v_vehicle_id or td.driver_id = any(v_driver_ids))
    limit 1;
    if found then
      raise exception 'CONFLICT: A selected driver or vehicle is already assigned to trip at % (%).', to_char(v_conflict.starts_at at time zone v_timezone, 'Mon DD, HH12:MI AM'), v_conflict.destination using errcode = '23P01';
    end if;
    if exists (
      select 1 from public.driver_availability da
      where da.driver_id = any(v_driver_ids)
        and tstzrange(da.starts_at, da.ends_at, '[)') && tstzrange(v_start, v_return, '[)')
    ) then
      raise exception 'CONFLICT: A selected driver is marked unavailable during this trip.' using errcode = '23P01';
    end if;
  end if;

  if p_trip_id is null then
    insert into public.trips(id, client_name, client_phone, pickup_location, destination, starts_at, estimated_return_at, passenger_count, vehicle_id, status, notes, special_requirements, created_by, updated_by)
    values (v_trip_id, coalesce(p_trip ->> 'client_name',''), coalesce(p_trip ->> 'client_phone',''), trim(p_trip ->> 'pickup_location'), trim(p_trip ->> 'destination'), v_start, v_return, v_passengers, v_vehicle_id, v_status, coalesce(p_trip ->> 'notes',''), coalesce(p_trip ->> 'special_requirements',''), v_actor, v_actor);
  else
    update public.trips set client_name = coalesce(p_trip ->> 'client_name',''), client_phone = coalesce(p_trip ->> 'client_phone',''),
      pickup_location = trim(p_trip ->> 'pickup_location'), destination = trim(p_trip ->> 'destination'), starts_at = v_start,
      estimated_return_at = v_return, passenger_count = v_passengers, vehicle_id = v_vehicle_id, status = v_status,
      notes = coalesce(p_trip ->> 'notes',''), special_requirements = coalesce(p_trip ->> 'special_requirements',''),
      updated_by = v_actor, updated_at = now() where id = p_trip_id;
    delete from public.trip_drivers where trip_id = p_trip_id;
  end if;
  insert into public.trip_drivers(trip_id, driver_id) select v_trip_id, driver_id from unnest(v_driver_ids) as assigned(driver_id);

  select jsonb_build_object(
    'trip', to_jsonb(t),
    'drivers', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.full_name) order by d.full_name)
      from public.trip_drivers td join public.drivers d on d.id = td.driver_id where td.trip_id = t.id), '[]'::jsonb),
    'vehicle', (select jsonb_build_object('id', v.id, 'name', v.label, 'plate', v.plate_number) from public.vehicles v where v.id = t.vehicle_id)
  ) into v_after from public.trips t where t.id = v_trip_id;
  insert into public.trip_history(trip_id, actor_id, action, before_data, after_data)
    values (v_trip_id, v_actor, v_action, v_before, v_after);
  if v_action = 'created'
    or coalesce(v_before -> 'drivers', 'null'::jsonb) is distinct from coalesce(v_after -> 'drivers', 'null'::jsonb)
    or (v_before -> 'trip' ->> 'vehicle_id') is distinct from (v_after -> 'trip' ->> 'vehicle_id') then
    insert into public.notifications(user_id, trip_id, kind, title, body)
      select p.id, v_trip_id, 'assignment',
        case when v_action = 'created' then 'New trip assignment' else 'Trip assignment changed' end,
        coalesce(v_after -> 'trip' ->> 'destination', 'Trip') || ' · ' || to_char(v_start at time zone v_timezone, 'Mon DD, HH12:MI AM')
      from public.profiles p where p.id <> v_actor;
  end if;
  return v_trip_id;
end;
$$;
revoke all on function public.save_trip(uuid, jsonb) from public, anon;
grant execute on function public.save_trip(uuid, jsonb) to authenticated;
