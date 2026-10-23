-- Invoice records linked to scheduled trips.
create sequence if not exists public.invoice_number_seq;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default (
    'RSCJ-' || to_char(current_date, 'YYYYMM') || '-' || lpad(nextval('public.invoice_number_seq')::text, 5, '0')
  ),
  trip_id uuid references public.trips(id) on delete set null,
  client_name text not null,
  client_email text not null default '',
  client_phone text not null default '',
  billing_address text not null default '',
  description text not null,
  issued_on date not null default current_date,
  due_on date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  notes text not null default '',
  paid_at timestamptz,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_due_on_idx on public.invoices(due_on);
create index if not exists invoices_trip_id_idx on public.invoices(trip_id);
alter table public.invoices enable row level security;

drop policy if exists "workspace manages invoices" on public.invoices;
create policy "workspace manages invoices" on public.invoices for all to authenticated
  using (public.current_user_role() in ('boss', 'secretary'))
  with check (public.current_user_role() in ('boss', 'secretary'));

grant select, insert, update on public.invoices to authenticated;
grant usage, select on sequence public.invoice_number_seq to authenticated;
