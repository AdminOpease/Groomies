-- Groomies · Migration 009
-- locations.slug — SEO-friendly URLs (/locations/[slug]).
--
-- Auto-populated from `name` on insert if not provided. Editable by staff.
-- Collision-suffixed (nw-london, nw-london-2, ...).

-- ---------------------------------------------------------------------------
-- slugify helper (lowercase, non-alphanumeric → hyphens, trim)
-- ---------------------------------------------------------------------------

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    regexp_replace(
      lower(coalesce(input, '')),
      '[^a-z0-9]+', '-', 'g'
    ),
    '(^-+)|(-+$)', '', 'g'
  )
$$;

-- ---------------------------------------------------------------------------
-- Column + trigger
-- ---------------------------------------------------------------------------

alter table public.locations add column slug text;

create or replace function public.locations_default_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  suffix integer := 0;
begin
  if new.slug is null or length(trim(new.slug)) = 0 then
    base_slug := public.slugify(new.name);
    if base_slug = '' then
      base_slug := 'location';
    end if;
    candidate := base_slug;
    while exists (
      select 1 from public.locations
       where slug = candidate
         and id is distinct from new.id
    ) loop
      suffix := suffix + 1;
      candidate := base_slug || '-' || suffix;
    end loop;
    new.slug := candidate;
  end if;
  return new;
end $$;

create trigger locations_default_slug_trigger
before insert on public.locations
for each row execute function public.locations_default_slug();

-- ---------------------------------------------------------------------------
-- Backfill existing rows
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
  base_slug text;
  candidate text;
  suffix integer;
begin
  for r in select id, name from public.locations where slug is null loop
    base_slug := public.slugify(r.name);
    if base_slug = '' then base_slug := 'location'; end if;
    candidate := base_slug;
    suffix := 0;
    while exists (select 1 from public.locations where slug = candidate) loop
      suffix := suffix + 1;
      candidate := base_slug || '-' || suffix;
    end loop;
    update public.locations set slug = candidate where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Constraint + index
-- ---------------------------------------------------------------------------

alter table public.locations alter column slug set not null;
alter table public.locations add constraint locations_slug_unique unique (slug);
create index locations_slug_idx on public.locations (slug);
