-- Save workspace payment instructions and snapshot them onto each new invoice.
alter table public.app_settings
  add column if not exists payment_details text not null default '';

alter table public.invoices
  add column if not exists payment_details text not null default '';
