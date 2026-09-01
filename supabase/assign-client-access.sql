-- Blue Collar People Client Portal: assign one existing Auth user to one client.
--
-- 1. Create the user in Authentication > Users with their email and password.
-- 2. Set target_email and target_client_name below, then run this script in the
--    project SQL Editor. If this login is genuinely for one site, optionally
--    set target_portal_site_name; otherwise leave it null. It finds the active
--    client in public.clients itself; no UUID lookup or copying is required.
-- 3. Have the user sign out and
--    sign back in so Supabase issues a session containing the new claim.
--
-- This stores access in server-controlled app metadata. Never use user metadata
-- for client access, and do not grant table permissions to the browser.

do $$
declare
  target_user_id uuid;
  target_client_id uuid;
  target_email text := 'sebastian7manuel@gmail.com';
  target_client_name text := 'ZZZ';
  target_portal_site_name text := null;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(target_email);

  if target_user_id is null then
    raise exception
      'No Auth user exists for %. Create the user in Authentication > Users first.',
      target_email;
  end if;

  select id
  into target_client_id
  from public.clients
  where lower(name) = lower(target_client_name)
    and is_active = true;

  if target_client_id is null then
    raise exception
      'No active client named "%" was found in public.clients.',
      target_client_name;
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'client_id', target_client_id::text,
      'client_name', target_client_name,
      'portal_site_name', nullif(btrim(target_portal_site_name), '')
    )
  where id = target_user_id;
end;
$$;

-- Confirm the protected metadata that determines this user's portal scope.
select
  id,
  email,
  raw_app_meta_data ->> 'client_id' as client_id,
  raw_app_meta_data ->> 'client_name' as client_name,
  raw_app_meta_data ->> 'portal_site_name' as portal_site_name
from auth.users
where lower(email) = 'sebastian7manuel@gmail.com';
