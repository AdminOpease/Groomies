-- "From" pricing flag.
-- Many grooms are priced by dog size / coat, so a flat "£45" is misleading.
-- When price_from is true, the public site renders the price as "From £45".
-- Display-only — does not affect booking, deposits, or scheduling.
alter table public.services
  add column if not exists price_from boolean not null default false;

comment on column public.services.price_from is
  'When true, public pages show the price as a starting "From £X". Display-only.';
