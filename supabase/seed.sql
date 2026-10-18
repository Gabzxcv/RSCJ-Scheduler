-- Optional development data. Run after 001_initial_schema.sql and after creating
-- at least one Supabase Auth user with the boss role (see README.md).
do $$
begin
  if not exists (select 1 from public.profiles where role = 'boss') then
    raise exception 'Create a boss Auth user and set its profile role before running the sample data.';
  end if;
end $$;

insert into public.drivers(id, full_name, phone, email, license_number, license_expiry, emergency_contact_name, emergency_contact_phone, employment_status, notes)
values
  ('10000000-0000-4000-8000-000000000001', 'Mika Santos', '+63 900 000 1001', 'mika.sample@example.com', 'N01-23-456789', current_date + 365, 'Rina Santos', '+63 900 000 1101', 'active', 'Sample record — replace with a real driver.'),
  ('10000000-0000-4000-8000-000000000002', 'Joel Reyes', '+63 900 000 1002', 'joel.sample@example.com', 'N02-34-567890', current_date + 280, 'Luz Reyes', '+63 900 000 1102', 'active', 'Sample record — replace with a real driver.'),
  ('10000000-0000-4000-8000-000000000003', 'Alex Dela Cruz', '+63 900 000 1003', 'alex.sample@example.com', 'N03-45-678901', current_date + 190, 'Mia Cruz', '+63 900 000 1103', 'active', 'Sample record — replace with a real driver.')
on conflict (id) do nothing;

insert into public.vehicles(id, label, make_model, plate_number, capacity, service_status, notes)
values
  ('20000000-0000-4000-8000-000000000001', 'Van 01', 'Toyota Hiace', 'SAMPLE-001', 12, 'available', 'Sample vehicle — replace with a real fleet record.'),
  ('20000000-0000-4000-8000-000000000002', 'Coaster 02', 'Toyota Coaster', 'SAMPLE-002', 22, 'available', 'Sample vehicle — replace with a real fleet record.'),
  ('20000000-0000-4000-8000-000000000003', 'Van 03', 'Nissan Urvan', 'SAMPLE-003', 10, 'maintenance', 'Sample maintenance status.')
on conflict (id) do nothing;

with boss as (select id from public.profiles where role = 'boss' order by created_at limit 1)
insert into public.trips(id, client_name, client_phone, pickup_location, destination, starts_at, estimated_return_at, passenger_count, vehicle_id, status, notes, special_requirements, created_by, updated_by)
select '30000000-0000-4000-8000-000000000001', 'Sample client — replace', '+63 900 000 2001', 'Makati City', 'Batangas Port',
       (((timezone('Asia/Manila', now())::date + 1) + time '08:30') at time zone 'Asia/Manila'),
       (((timezone('Asia/Manila', now())::date + 1) + time '12:30') at time zone 'Asia/Manila'),
       8, '20000000-0000-4000-8000-000000000001', 'confirmed', 'Sample trip — review and replace the passenger details.', '2 large bags', boss.id, boss.id from boss
on conflict (id) do nothing;

with boss as (select id from public.profiles where role = 'boss' order by created_at limit 1)
insert into public.trips(id, client_name, client_phone, pickup_location, destination, starts_at, estimated_return_at, passenger_count, vehicle_id, status, notes, special_requirements, created_by, updated_by)
select '30000000-0000-4000-8000-000000000002', 'Sample group — replace', '+63 900 000 2002', 'Quezon City', 'Tagaytay City',
       (((timezone('Asia/Manila', now())::date + 1) + time '14:00') at time zone 'Asia/Manila'),
       (((timezone('Asia/Manila', now())::date + 1) + time '17:30') at time zone 'Asia/Manila'),
       16, '20000000-0000-4000-8000-000000000002', 'scheduled', 'Sample trip — review before using.', '', boss.id, boss.id from boss
on conflict (id) do nothing;

with boss as (select id from public.profiles where role = 'boss' order by created_at limit 1)
insert into public.trips(id, client_name, client_phone, pickup_location, destination, starts_at, estimated_return_at, passenger_count, vehicle_id, status, notes, special_requirements, created_by, updated_by)
select '30000000-0000-4000-8000-000000000003', 'Sample client — replace', '+63 900 000 2003', 'Pasay City', 'Lipa City',
       (((timezone('Asia/Manila', now())::date + 2) + time '09:00') at time zone 'Asia/Manila'),
       (((timezone('Asia/Manila', now())::date + 2) + time '13:00') at time zone 'Asia/Manila'),
       6, '20000000-0000-4000-8000-000000000001', 'scheduled', '', 'Wheelchair access requested', boss.id, boss.id from boss
on conflict (id) do nothing;

insert into public.trip_drivers(trip_id, driver_id)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002')
on conflict do nothing;

insert into public.trip_history(trip_id, actor_id, action, before_data, after_data)
select t.id, t.created_by, 'created', null,
       jsonb_build_object(
         'trip', to_jsonb(t),
         'drivers', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.full_name) order by d.full_name)
           from public.trip_drivers td join public.drivers d on d.id = td.driver_id where td.trip_id = t.id), '[]'::jsonb),
         'vehicle', (select jsonb_build_object('id', v.id, 'name', v.label, 'plate', v.plate_number) from public.vehicles v where v.id = t.vehicle_id)
       )
from public.trips t
where t.id in (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003'
)
and not exists (select 1 from public.trip_history h where h.trip_id = t.id);
