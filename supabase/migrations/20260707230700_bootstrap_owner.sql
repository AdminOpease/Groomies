-- Groomies · Migration 008
-- Owner bootstrap RPC.
--
-- Called ONCE, from the Supabase SQL editor, after you've created your
-- auth user via Studio → Auth → Users → Add user. Turns your auth user
-- into the first `owner` profile.
--
-- Safeguard: only works while no owner profile exists yet. Subsequent
-- owner/staff changes go through the admin UI (Phase 3).

create or replace function public.bootstrap_owner(
  p_email     text,
  p_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- Safeguard: bootstrap only runs when there is no owner yet.
  if exists (select 1 from public.profiles where role = 'owner' and is_active = true) then
    raise exception 'An active owner already exists; use the admin UI to manage staff'
      using errcode = 'P0201';
  end if;

  select id into v_user_id
    from auth.users
   where lower(email) = lower(p_email)
   limit 1;

  if v_user_id is null then
    raise exception 'No auth user found for %. Create the user in Studio → Auth → Users first.', p_email
      using errcode = 'P0202';
  end if;

  insert into public.profiles (id, full_name, role, is_active)
  values (v_user_id, p_full_name, 'owner', true)
  on conflict (id) do update
    set full_name = excluded.full_name,
        role      = 'owner',
        is_active = true;

  return v_user_id;
end $$;

comment on function public.bootstrap_owner(text, text) is
  'One-time helper to promote your first auth user to owner. Refuses to run if any active owner already exists. Only callable from server-side (revoked from anon).';

-- Bootstrap is deliberately NOT anon-callable. Call it from the Supabase
-- SQL editor (which runs as the service_role) or from a linked CLI.
revoke execute on function public.bootstrap_owner(text, text) from public;
