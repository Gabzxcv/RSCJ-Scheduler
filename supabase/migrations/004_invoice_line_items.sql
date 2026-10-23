-- Store invoice item quantities and rates while retaining the total amount column.
alter table public.invoices
  add column if not exists line_items jsonb not null default '[]'::jsonb
  check (jsonb_typeof(line_items) = 'array');
